import base64
import json
import os
import re
import shutil
import tempfile
import traceback
from datetime import datetime

import pythoncom
import win32com.client

XL_TYPE_PDF = 0
XL_QUALITY_STANDARD = 0

TRANSACTIONS = {
    "4056": {"code": "4056-angsuran", "description": "Pembayaran Angsuran", "kotran": "Kotran 4056", "account": "loan", "debit_account": "savings", "debit_name": "customer"},
    "4052": {"code": "4052-Angsuran dari GNC", "description": "Pembayaran Angsuran", "kotran": "Kotran 4052", "account": "loan", "debit_account": "gnc", "debit_name": "gnc"},
    "4204": {"code": "4204-Pelunasan", "description": "Pelunasan Kredit", "kotran": "Kotran 4204", "account": "loan", "debit_account": "savings", "debit_name": "customer"},
    "1314": {"code": "1314-GNC ke Tabungan", "description": "Pindah Buku", "kotran": "Kotran 1314", "account": "savings", "debit_account": "gnc", "debit_name": "gnc"},
    "4234": {"code": "4234-Penarikan Kelebihan Bayar", "description": "Penarikan Kelebihan Bayar", "kotran": "Kotran 4234", "account": "savings", "debit_account": "loan", "debit_name": "customer"},
    "4104": {"code": "4104 - Pelunasan Pokok Sebagian", "description": "Pelunasan Pokok Sebagian", "kotran": "Kotran 4104", "account": "loan", "debit_account": "savings", "debit_name": "customer"},
}


def _as_text(value):
    if value is None:
        return ""
    return str(value).replace("\u00a0", " ").replace("\r", " ").replace("\n", " ").strip()


def _number(value):
    """Konversi nominal Rupiah ke integer, termasuk format 17.000 / 17,000."""
    if value is None or value == "":
        return 0
    if isinstance(value, (int, float)):
        return int(round(value))
    text = _as_text(value)
    text = re.sub(r"(?i)rp\.?", "", text).replace(" ", "")
    if not text:
        return 0
    if "." in text and "," in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "," in text:
        parts = text.split(",")
        if len(parts) > 2 or (len(parts) == 2 and len(parts[1]) == 3 and parts[0].lstrip("-").isdigit()):
            text = text.replace(",", "")
        else:
            text = text.replace(",", ".")
    elif "." in text:
        parts = text.split(".")
        if len(parts) > 2 or (len(parts) == 2 and len(parts[1]) == 3 and parts[0].lstrip("-").isdigit()):
            text = text.replace(".", "")
    try:
        return int(round(float(text)))
    except (TypeError, ValueError):
        raise ValueError(f"Nominal tidak valid: {value!r}")


def _terbilang(nominal):
    """Terbilang Rupiah Bahasa Indonesia tanpa formula Excel."""
    angka = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"]

    def konversi(n):
        if n < 0:
            return "Minus " + konversi(abs(n))
        if n < 12:
            return angka[n]
        if n < 20:
            return konversi(n - 10) + " Belas"
        if n < 100:
            puluhan, satuan = divmod(n, 10)
            return angka[puluhan] + " Puluh" + (" " + konversi(satuan) if satuan else "")
        if n < 200:
            return "Seratus" + (" " + konversi(n - 100) if n > 100 else "")
        if n < 1000:
            ratusan, sisa = divmod(n, 100)
            return konversi(ratusan) + " Ratus" + (" " + konversi(sisa) if sisa else "")
        if n < 2000:
            return "Seribu" + (" " + konversi(n - 1000) if n > 1000 else "")
        for nilai, nama in ((1_000_000_000_000, "Triliun"), (1_000_000_000, "Miliar"), (1_000_000, "Juta"), (1000, "Ribu")):
            if n >= nilai:
                depan, sisa = divmod(n, nilai)
                return konversi(depan) + " " + nama + (" " + konversi(sisa) if sisa else "")
        return str(n)

    nilai = int(nominal or 0)
    return ("Nol" if nilai == 0 else konversi(nilai)).strip() + " Rupiah"


def _get_template_path():
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(here, "templates", "Advis_Template_Baru.xlsx"),
        os.path.join(here, "Advis_Template_Baru.xlsx"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return os.path.abspath(path)
    raise FileNotFoundError("Template Advis_Template_Baru.xlsx tidak ditemukan. Letakkan di excel-engine/templates/ atau langsung di folder excel-engine.")


def _transaction_code(item):
    value = item.get("transactionCode") or item.get("transaction_code") or item.get("transaction") or item.get("kotran") or item.get("kode_transaksi")
    if isinstance(value, dict):
        value = value.get("code") or value.get("value") or value.get("label") or value.get("name") or ""
    text = _as_text(value)
    match = re.search(r"(?<!\d)(4056|4052|4204|1314|4234|4104)(?!\d)", text)
    if match:
        return match.group(1)
    for key in ("kode", "code", "transaction_id"):
        code = _as_text(item.get(key))
        if code in TRANSACTIONS:
            return code
    if not text:
        return "4056"
    raise ValueError(f"Jenis transaksi tidak dikenal: {text}")


def _clean_advis_data(items):
    """Normalisasi payload frontend menjadi list record Advis."""
    if isinstance(items, tuple):
        items = items[0] if len(items) == 1 else list(items)
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except json.JSONDecodeError as exc:
            raise ValueError("Payload Advis berupa teks tetapi bukan JSON yang valid.") from exc
    if isinstance(items, dict):
        for key in ("items", "data", "records", "selectedItems", "selected_items", "rows", "debitur"):
            if key in items:
                items = items[key]
                break
        else:
            items = [items]
    if isinstance(items, tuple):
        items = list(items)
    if not isinstance(items, list):
        raise ValueError(f"Format data Advis tidak valid: {type(items).__name__}.")
    if not items:
        raise ValueError("Pilih minimal satu data Easy Call untuk dibuatkan Advis.")

    cleaned = []
    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        nama = _as_text(item.get("nama") or item.get("nama_debitur") or item.get("name") or item.get("customer_name"))
        acctno = _as_text(item.get("acctno") or item.get("nomor_rekening_pinjaman") or item.get("loan_account") or item.get("no_rekening"))
        agf1 = _as_text(item.get("agf1") or item.get("nomor_rekening_tabungan") or item.get("savings_account"))
        if not nama and not acctno:
            print(f"[ADVIS INPUT SKIP] Record {index}: nama dan rekening kosong.", flush=True)
            continue
        nominal_raw = item.get("total_tgg")
        if nominal_raw is None:
            nominal_raw = item.get("nominal", item.get("jumlah_tagihan", 0))
        nominal = _number(nominal_raw)
        code = _transaction_code(item)
        cleaned.append({
            **item,
            "nama": nama,
            "acctno": acctno,
            "agf1": agf1,
            "total_tgg": nominal,
            "mbu": _as_text(item.get("mbu")),
            "nama_mks": _as_text(item.get("nama_mks")),
            "alamat": _as_text(item.get("alamat") or item.get("address") or item.get("alamat_debitur")),
            "transaction_code": code,
            "transaction": TRANSACTIONS[code],
        })
    if not cleaned:
        raise ValueError("Tidak ada data Easy Call valid. Pastikan setiap record memiliki nama atau nomor rekening.")
    if len(cleaned) > 500:
        raise ValueError("Maksimal 500 data Advis dalam satu proses.")
    return cleaned


def _write_cell(sheet, address, value, text=False):
    cell = sheet.Range(address)
    if bool(cell.MergeCells):
        cell = cell.MergeArea.Cells(1, 1)
    if text:
        cell.NumberFormat = "@"
    cell.Value = value


def _clear_cell(sheet, address):
    cell = sheet.Range(address)
    if bool(cell.MergeCells):
        cell = cell.MergeArea.Cells(1, 1)
    cell.ClearContents()


def _ensure_sheet_unprotected(sheet):
    protected = bool(sheet.ProtectContents) or bool(sheet.ProtectDrawingObjects) or bool(sheet.ProtectScenarios)
    if protected:
        try:
            sheet.Unprotect()
        except Exception as exc:
            raise RuntimeError(f"Worksheet '{sheet.Name}' masih diproteksi.") from exc
        if bool(sheet.ProtectContents) or bool(sheet.ProtectDrawingObjects) or bool(sheet.ProtectScenarios):
            raise RuntimeError(f"Proteksi worksheet '{sheet.Name}' masih aktif.")


def _configure_page(sheet):
    page = sheet.PageSetup
    page.Zoom = False
    page.FitToPagesWide = 1
    page.FitToPagesTall = 1
    page.PrintArea = "$B$14:$F$31"


def _configure_advis_print_positions(sheet):
    """Koreksi posisi cetak pada workbook sementara, tanpa mengubah template asli."""
    try:
        # 0,4 cm ≈ 11,34 pt. Baris 15 kosong, sehingga aman diperkecil.
        sheet.Rows(15).RowHeight = max(1, float(sheet.Rows(15).RowHeight) - 11.34)

        # Nominal di bagian bawah dipindahkan dari D25 ke D24. Baris 24
        # diperbesar untuk menjaga tinggi tulisan; baris 25 dikosongkan agar
        # terbilang di C26:F28 naik total sekitar 0,8 cm.
        source = sheet.Range("D25")
        if bool(source.MergeCells):
            sheet.Range("D25:E25").UnMerge()
        source.Copy(Destination=sheet.Range("D24"))
        sheet.Range("D24:E24").Merge()
        sheet.Range("D24").VerticalAlignment = -4160  # xlTop
        sheet.Rows(24).RowHeight = 14.4
        sheet.Range("D25").ClearContents()
        sheet.Rows(25).RowHeight = 0

        # Tanggal: naik sedikit di dalam sel.
        sheet.Range("C14").VerticalAlignment = -4160  # xlTop

        # Kotran dan nominal transaksi: posisi baris sudah naik 0,4 cm;
        # rata atas memberi tambahan koreksi hingga mendekati 1 cm.
        sheet.Range("C19").VerticalAlignment = -4160  # xlTop
        sheet.Range("D19").VerticalAlignment = -4160  # xlTop

        # Terbilang tetap rata atas pada area gabungan C26:F28.
        sheet.Range("C26").VerticalAlignment = -4160  # xlTop

        # Rekening debet dan nama: naik mengikuti area bawah, rata atas,
        # serta bergeser ke kanan sekitar 1,5 cm.
        for address in ("D30", "D31"):
            cell = sheet.Range(address)
            cell.VerticalAlignment = -4160  # xlTop
            cell.HorizontalAlignment = -4131  # xlLeft
            cell.IndentLevel = 3
    except Exception as exc:
        raise RuntimeError("Tidak dapat menyesuaikan posisi cetak pada template Advis.") from exc


def _fill_advis_sheet(sheet, index, item):
    _ensure_sheet_unprotected(sheet)
    transaction = item["transaction"]
    code = item["transaction_code"]
    name = item["nama"]
    loan_account = item["acctno"]
    savings_account = item["agf1"]
    nominal = item["total_tgg"]

    _write_cell(sheet, "A1", index)
    _write_cell(sheet, "C14", datetime.now())
    _write_cell(sheet, "E5", name, text=True)
    _write_cell(sheet, "E6", item["alamat"], text=True)
    _write_cell(sheet, "E7", savings_account, text=True)
    _write_cell(sheet, "E8", loan_account, text=True)
    _write_cell(sheet, "E9", nominal)
    _write_cell(sheet, "E10", transaction["description"], text=True)
    _write_cell(sheet, "E11", transaction["code"], text=True)
    _write_cell(sheet, "E16", "Yth. " + name, text=True)
    account = savings_account if transaction["account"] == "savings" else loan_account
    _write_cell(sheet, "E17", account, text=True)
    _write_cell(sheet, "E18", item["alamat"], text=True)
    _write_cell(sheet, "C19", transaction["kotran"], text=True)
    _write_cell(sheet, "D19", nominal)
    _write_cell(sheet, "C20", transaction["description"], text=True)
    if code in ("4052", "1314"):
        _write_cell(sheet, "B23", "Reff", text=True)
    else:
        _clear_cell(sheet, "B23")
    _write_cell(sheet, "D24", nominal)
    _clear_cell(sheet, "D25")
    _write_cell(sheet, "C26", _terbilang(nominal), text=True)
    _write_cell(sheet, "C30", "D/", text=True)
    if transaction["debit_account"] == "savings":
        debit_account = savings_account
    elif transaction["debit_account"] == "loan":
        debit_account = loan_account
    else:
        debit_account = _as_text(sheet.Range("K5").Value)
    debit_name = name if transaction["debit_name"] == "customer" else _as_text(sheet.Range("K6").Value)
    _write_cell(sheet, "D30", debit_account, text=True)
    _write_cell(sheet, "D31", debit_name, text=True)
    _clear_cell(sheet, "F23")
    _configure_page(sheet)


def process_advis(*items):
    """Buat satu PDF gabungan, satu halaman per record; template asli tidak disimpan."""
    excel = None
    workbook = None
    working_copy = None
    output_pdf = None
    temp_dir = None
    initialized = False
    stage = "inisialisasi"

    try:
        from pypdf import PdfReader, PdfWriter
        pythoncom.CoInitialize()
        initialized = True

        stage = "validasi data"
        print("[ADVIS DEBUG] Jumlah argumen:", len(items), flush=True)
        print("[ADVIS DEBUG] Tipe argumen:", [type(value).__name__ for value in items], flush=True)
        data = _clean_advis_data(items)
        total_data = len(data)
        print(f"[ADVIS INPUT] Total data valid: {total_data}", flush=True)
        for index, item in enumerate(data, start=1):
            print(f"[ADVIS INPUT] {index}/{total_data} | Nama={item['nama']} | Rekening={item['acctno']} | Nominal={item['total_tgg']} | Transaksi={item['transaction_code']}", flush=True)

        stage = "mencari template"
        template_path = _get_template_path()
        suffix = os.path.splitext(template_path)[1] or ".xlsx"

        stage = "menyalin template"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            working_copy = tmp.name
        shutil.copy2(template_path, working_copy)
        temp_dir = tempfile.TemporaryDirectory(prefix="advis_pages_")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            output_pdf = tmp.name

        stage = "menjalankan Excel"
        excel = win32com.client.DispatchEx("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        excel.EnableEvents = False
        excel.ScreenUpdating = False

        stage = "membuka template sementara"
        workbook = excel.Workbooks.Open(os.path.abspath(working_copy), UpdateLinks=0, ReadOnly=False, IgnoreReadOnlyRecommended=True, AddToMru=False)
        stage = "mencari worksheet Advis"
        try:
            sheet = workbook.Worksheets("Advis")
        except Exception as exc:
            raise RuntimeError("Worksheet 'Advis' tidak ditemukan dalam template.") from exc
        print(f"[ADVIS TEMPLATE] Worksheet: {sheet.Name}", flush=True)
        stage = "menyesuaikan posisi cetak Advis"
        _configure_advis_print_positions(sheet)

        page_paths = []
        for index, item in enumerate(data, start=1):
            stage = f"mengisi data halaman {index}/{total_data}"
            _fill_advis_sheet(sheet, index, item)
            actual_name = _as_text(sheet.Range("E5").Value)
            actual_nominal = _number(sheet.Range("E9").Value)
            if actual_name != item["nama"]:
                raise RuntimeError(f"Nama halaman {index} tidak cocok. Seharusnya {item['nama']!r}, terbaca {actual_name!r}.")
            if actual_nominal != item["total_tgg"]:
                raise RuntimeError(f"Nominal halaman {index} tidak cocok. Seharusnya {item['total_tgg']}, terbaca {actual_nominal}.")
            stage = f"memperbarui worksheet {index}/{total_data}"
            sheet.Calculate()
            stage = f"mengekspor halaman {index}/{total_data}"
            page_path = os.path.join(temp_dir.name, f"advis_{index:04d}.pdf")
            sheet.ExportAsFixedFormat(Type=XL_TYPE_PDF, Filename=os.path.abspath(page_path), Quality=XL_QUALITY_STANDARD, IncludeDocProperties=False, IgnorePrintAreas=False, OpenAfterPublish=False)
            if not os.path.isfile(page_path) or os.path.getsize(page_path) == 0:
                raise RuntimeError(f"PDF halaman {index} tidak terbentuk atau kosong.")
            with open(page_path, "rb") as page_file:
                page_count = len(PdfReader(page_file).pages)
            if page_count != 1:
                raise RuntimeError(f"Data {item['nama']!r} menghasilkan {page_count} halaman, bukan 1. Periksa area cetak template.")
            page_paths.append(page_path)
            print(f"[ADVIS PAGE OK] {index}/{total_data} | {item['nama']} | {item['acctno']} | {item['total_tgg']}", flush=True)

        stage = "menggabungkan PDF"
        writer = PdfWriter()
        for index, page_path in enumerate(page_paths, start=1):
            with open(page_path, "rb") as page_file:
                reader = PdfReader(page_file)
                if len(reader.pages) != 1:
                    raise RuntimeError(f"PDF halaman {index} tidak valid.")
                writer.add_page(reader.pages[0])
        with open(output_pdf, "wb") as merged_file:
            writer.write(merged_file)

        stage = "memvalidasi PDF final"
        if not os.path.isfile(output_pdf) or os.path.getsize(output_pdf) == 0:
            raise RuntimeError("PDF final tidak terbentuk atau kosong.")
        file_size = os.path.getsize(output_pdf)
        with open(output_pdf, "rb") as merged_file:
            final_page_count = len(PdfReader(merged_file).pages)
        if final_page_count != total_data:
            raise RuntimeError(f"Jumlah halaman PDF final {final_page_count}; seharusnya {total_data}.")
        with open(output_pdf, "rb") as pdf_file:
            pdf_base64 = base64.b64encode(pdf_file.read()).decode("ascii")
        print(f"[ADVIS SUCCESS] Data={total_data}, halaman={final_page_count}, ukuran={file_size} byte", flush=True)
        return {
            "success": True,
            "count": total_data,
            "pdfBase64": pdf_base64,
            "fileName": "Advis_EasyCall.pdf",
            "fileSize": file_size,
            "items": [{"acctno": item["acctno"], "nama": item["nama"], "mbu": item["mbu"], "total_tgg": item["total_tgg"], "agf1": item["agf1"], "transaction": item["transaction_code"]} for item in data],
        }
    except Exception as exc:
        print(f"[ADVIS ERROR] Tahap: {stage}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise RuntimeError(f"Gagal memproses Advis pada tahap '{stage}': {exc}") from exc
    finally:
        if workbook is not None:
            try:
                workbook.Close(SaveChanges=False)
            except Exception as exc:
                print(f"[ADVIS CLEANUP] Workbook: {exc}", flush=True)
        if excel is not None:
            try:
                excel.Quit()
            except Exception as exc:
                print(f"[ADVIS CLEANUP] Excel: {exc}", flush=True)
        if temp_dir is not None:
            try:
                temp_dir.cleanup()
            except Exception as exc:
                print(f"[ADVIS CLEANUP] Folder sementara: {exc}", flush=True)
        for path in (output_pdf, working_copy):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError as exc:
                    print(f"[ADVIS CLEANUP] File sementara {path}: {exc}", flush=True)
        if initialized:
            try:
                pythoncom.CoUninitialize()
            except Exception as exc:
                print(f"[ADVIS CLEANUP] COM: {exc}", flush=True)
