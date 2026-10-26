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
            return ("Se" if ratusan == 1 else angka[ratusan]) + " Ratus" + (" " + konversi(sisa) if sisa else "")
        if n < 2000:
            return "Seribu" + (" " + konversi(n - 1000) if n > 1000 else "")
        if n < 1_000_000:
            ribuan, sisa = divmod(n, 1000)
            return konversi(ribuan) + " Ribu" + (" " + konversi(sisa) if sisa else "")
        for nilai, nama in ((1_000_000_000_000, "Triliun"), (1_000_000_000, "Miliar"), (1_000_000, "Juta")):
            if n >= nilai:
                depan, sisa = divmod(n, nilai)
                return konversi(depan) + " " + nama + (" " + konversi(sisa) if sisa else "")
        return str(n)

    nilai = int(nominal or 0)
    if nilai == 0:
        return "Nol Rupiah"
    
    hasil = konversi(nilai).strip()
    return f"{hasil} Rupiah"

def _get_template_path():
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(here, "templates", "Advis.xls"),
        os.path.join(here, "Advis.xls"),
        os.path.join(here, "templates", "Advis_Template_Baru.xlsx"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return os.path.abspath(path)
    raise FileNotFoundError("Template Advis.xls / Advis_Template_Baru.xlsx tidak ditemukan.")

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
    if isinstance(items, tuple):
        items = items[0] if len(items) == 1 else list(items)
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except json.JSONDecodeError as exc:
            raise ValueError("Payload Advis bukan JSON valid.") from exc
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
        raise ValueError("Pilih minimal satu data untuk dibuatkan Advis.")

    cleaned = []
    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        nama = _as_text(item.get("nama") or item.get("nama_debitur") or item.get("name") or item.get("customer_name"))
        acctno = _as_text(item.get("acctno") or item.get("nomor_rekening_pinjaman") or item.get("loan_account") or item.get("no_rekening"))
        agf1 = _as_text(item.get("agf1") or item.get("nomor_rekening_tabungan") or item.get("savings_account"))
        if not nama and not acctno:
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
    return cleaned

def _top_left_cell(sheet, address):
    cell = sheet.Range(address)
    try:
        merged = cell.MergeCells
        if merged is not None and bool(merged):
            cell = cell.MergeArea.Cells.Item(1, 1)
    except Exception:
        pass
    return cell

def _write_cell(sheet, address, value, text=False):
    cell = _top_left_cell(sheet, address)
    try:
        if text and value is not None:
            cell.NumberFormat = "@"
            cell.Value = str(value)
        else:
            cell.Value = value
    except Exception as exc:
        raise RuntimeError(f"Gagal mengisi sel {address}: {exc}") from exc

def _clear_cell(sheet, address):
    cell = _top_left_cell(sheet, address)
    try:
        cell.Value = None
    except Exception:
        pass

def _ensure_sheet_unprotected(sheet):
    if bool(sheet.ProtectContents):
        try:
            sheet.Unprotect()
        except Exception:
            pass

def _configure_page(sheet):
    page = sheet.PageSetup
    page.PaperSize = 9  # A4
    page.Orientation = 1  # Portrait
    page.Zoom = False
    page.FitToPagesWide = 1
    page.FitToPagesTall = 1
    page.PrintArea = "$B$14:$F$31"
    page.LeftMargin = 0
    page.RightMargin = 0
    page.TopMargin = 0
    page.BottomMargin = 0

def _place_advis_on_a4(source_page, Transformation, PageObject):
    a4_width = 21.0 / 2.54 * 72.0
    a4_height = 29.7 / 2.54 * 72.0
    canvas = PageObject.create_blank_page(width=a4_width, height=a4_height)
    canvas.merge_page(source_page)
    return canvas

def _fill_advis_sheet(sheet, index, item):
    _ensure_sheet_unprotected(sheet)
    transaction = item["transaction"]
    code = item["transaction_code"]
    name = item["nama"]
    loan_account = item["acctno"]
    savings_account = item["agf1"]
    nominal = item["total_tgg"]

    _write_cell(sheet, "A1", index)
    
    # Tanggal di C14
    _clear_cell(sheet, "C15")
    _write_cell(sheet, "C14", datetime.now().strftime("%d-%m-%Y"))
    
    # Data Referensi Atas
    _write_cell(sheet, "E5", name, text=True)
    _write_cell(sheet, "E6", item["alamat"], text=True)
    _write_cell(sheet, "E7", savings_account, text=True)
    _write_cell(sheet, "E8", loan_account, text=True)
    _write_cell(sheet, "E9", nominal)
    _write_cell(sheet, "E10", transaction["description"], text=True)
    _write_cell(sheet, "E11", transaction["code"], text=True)
    
    # Bagian Yth & Rekening Pinjaman Sesuai Template Asli (Baris 16 & 17)
    _write_cell(sheet, "E16", "Yth. " + name, text=True)
    _write_cell(sheet, "E17", loan_account, text=True)
    
    # Transaksi Kotran & Nominal Atas (Baris 19 & 20)
    _write_cell(sheet, "C19", transaction["kotran"], text=True)
    _write_cell(sheet, "D19", nominal)
    _write_cell(sheet, "C20", transaction["description"], text=True)
    
    if code in ("4052", "1314"):
        _write_cell(sheet, "B23", "Reff", text=True)
    else:
        _clear_cell(sheet, "B23")
        
    # Nominal Bawah (Baris 25)
    _write_cell(sheet, "D25", nominal)
    
    # Terbilang (Baris 26)
    _write_cell(sheet, "C26", _terbilang(nominal), text=True)
    
    # Debit Info D/ (Baris 30 & 31)
    _write_cell(sheet, "C30", "D/", text=True)
    if transaction["debit_account"] == "savings":
        debit_account = savings_account
    elif transaction["debit_account"] == "loan":
        debit_account = loan_account
    else:
        debit_account = _as_text(sheet.Range("K5").Value)
        
    debit_name = name if transaction["debit_name"] == "customer" else _as_text(sheet.Range("K6").Value)
    
    _write_cell(sheet, "D30", loan_account, text=True)
    _write_cell(sheet, "D31", debit_name, text=True)
    
    _configure_page(sheet)

def process_advis(*items):
    """Fungsi utama yang dipanggil oleh server.py untuk memproses data Advis dan menghasilkan PDF Base64."""
    excel = None
    workbook = None
    sheet = None
    working_copy = None
    output_pdf = None
    temp_dir = None
    initialized = False
    stage = "inisialisasi"

    try:
        from pypdf import PdfReader, PdfWriter, Transformation, PageObject
        pythoncom.CoInitialize()
        initialized = True

        stage = "validasi data"
        data = _clean_advis_data(items)
        total_data = len(data)

        stage = "mencari template"
        template_path = _get_template_path()
        suffix = os.path.splitext(template_path)[1] or ".xls"

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

        stage = "menggabungkan PDF"
        writer = PdfWriter()
        for index, page_path in enumerate(page_paths, start=1):
            with open(page_path, "rb") as page_file:
                reader = PdfReader(page_file)
                writer.add_page(_place_advis_on_a4(reader.pages[0], Transformation, PageObject))

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
        sheet = None
        if workbook is not None:
            try:
                workbook.Close(SaveChanges=False)
            except Exception:
                pass
            workbook = None
        if excel is not None:
            try:
                excel.Quit()
            except Exception:
                pass
            excel = None
        if temp_dir is not None:
            try:
                temp_dir.cleanup()
            except Exception:
                pass
        for path in (output_pdf, working_copy):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
        if initialized:
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass