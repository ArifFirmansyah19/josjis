"""
JOSJIS - RaportMU
Booking Online Engine

Versi online:
JOSJIS -> Microsoft 365 -> Excel Online

File Excel tetap dapat berupa workbook binary yang digunakan
di Excel Online.

Engine ini mempertahankan format hasil dari engine_booking.py.
"""

from typing import Any, Dict, Optional


BOOKING_DISPLAY_COLUMNS = [
    {"column": "F", "key": "acctno", "label": "ACCTNO"},
    {"column": "G", "key": "nama", "label": "NAMA"},
    {"column": "H", "key": "limit", "label": "LIMIT"},
    {"column": "O", "key": "produk", "label": "PRODUK"},
    {"column": "P", "key": "tglcair", "label": "TGLCAIR"},
    {"column": "Q", "key": "tgl_jt_angs", "label": "TGL JT ANGS"},
    {"column": "T", "key": "angsuran", "label": "ANGSURAN"},
    {"column": "Z", "key": "agf1", "label": "AGF1"},
    {"column": "AE", "key": "nama_mks", "label": "NAMA MKS"},
    {"column": "AK", "key": "cif", "label": "CIF"},
    {"column": "AL", "key": "tenor", "label": "TENOR"},
    {"column": "AR", "key": "app_no", "label": "APP NO"},
    {"column": "BA", "key": "alamat", "label": "ALAMAT"},
]


def normalize(value: Any) -> str:
    if value is None:
        return ""

    text = str(value)

    replacements = {
        "\xa0": " ",
        "\n": " ",
        "\r": " ",
        "\t": " ",
        "_": " ",
        "-": " ",
        ".": " ",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    return " ".join(text.split()).strip().lower()


def clean_text(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip()


def value_to_number(value: Any) -> Optional[float]:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()

    if not text:
        return None

    try:
        # Format Indonesia:
        # 1.234.567,89
        if "," in text and "." in text:
            text = text.replace(".", "").replace(",", ".")
        elif "," in text:
            text = text.replace(",", ".")
        elif "." in text:
            # Jangan langsung menghapus titik jika desimal.
            # Akan diperbaiki sesuai kebutuhan workbook.
            pass

        return float(text)
    except Exception:
        return None


def calculate_booking_totals(data):
    """
    Hitung total berdasarkan:
      H = LIMIT
      O = PRODUK

    Sama seperti engine_booking.py lama.
    """

    kum = 0.0
    kur = 0.0

    for row in data:
        if not isinstance(row, dict):
            continue

        produk = normalize(row.get("produk"))
        limit = value_to_number(row.get("limit"))

        if limit is None:
            continue

        if produk == "kum":
            kum += limit

        elif produk == "kur":
            kur += limit

    return {
        "kum": kum,
        "kur": kur,
    }


def build_booking_result(
    branch: str,
    name: str,
    created_sheet: str,
    headers,
    data,
    target_row=None,
    target_cell=None,
    method="online",
):
    """
    Menyamakan struktur response dengan engine_booking.py lama.
    """

    totals = calculate_booking_totals(data)

    return {
        "success": True,

        "sourceSheet": "Booking",
        "createdSheet": created_sheet,

        "branch": branch,
        "name": name,

        "targetRow": target_row,
        "targetCell": target_cell,

        "method": method,

        "headers": headers,
        "data": data,

        "columnLetters": [
            chr(ord("A") + i)
            for i in range(26)
        ],

        "displayColumns": BOOKING_DISPLAY_COLUMNS,

        "headerRow": None,

        "totals": totals,
    }


async def process_booking_online(
    branch: str,
    name: str,
    microsoft_token: str,
) -> Dict[str, Any]:
    """
    Entry point Booking Online.

    Untuk sementara fungsi ini sengaja belum menjalankan
    request Microsoft Graph.

    Kita akan memasukkan koneksi Microsoft setelah
    autentikasi workbook ditentukan.
    """

    if not branch:
        return {
            "success": False,
            "error": "Branch/JKK belum dipilih.",
        }

    if not name:
        return {
            "success": False,
            "error": "Nama SGP belum dipilih.",
        }

    if not microsoft_token:
        return {
            "success": False,
            "error": "Microsoft authentication belum tersedia.",
        }

    return {
        "success": False,
        "error": (
            "Koneksi Excel Online belum dikonfigurasi. "
            "Engine lama tetap dapat digunakan."
        ),
    }