# ============================================================
# FILE
# D:\APLIKASI\josjis\excel-engine\engine_booking.py
# ============================================================

import os
import tempfile
import time
from datetime import date, datetime

import pythoncom
import win32com.client


# ============================================================
# GENERAL
# ============================================================

def normalize(value):
    if value is None:
        return ""

    text = str(value).strip().lower()

    replacements = {
        "\n": " ",
        "\r": " ",
        "\t": " ",
        "_": " ",
        "-": " ",
        ".": " ",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    while "  " in text:
        text = text.replace("  ", " ")

    return text.strip()


def clean_text(value):
    if value is None:
        return ""

    return str(value).strip()


def json_safe(value):
    if value is None:
        return None

    if isinstance(value, (datetime, date)):
        return value.strftime("%d/%m/%Y")

    if isinstance(value, float):
        if value != value:
            return None

        if value.is_integer():
            return int(value)

    if isinstance(value, tuple):
        return [
            json_safe(item)
            for item in value
        ]

    if isinstance(value, list):
        return [
            json_safe(item)
            for item in value
        ]

    return value


def get_sheet_names(workbook):
    return [
        str(workbook.Worksheets(index).Name)
        for index in range(
            1,
            workbook.Worksheets.Count + 1,
        )
    ]


def find_sheet(workbook, sheet_name):
    target = normalize(sheet_name)

    for index in range(
        1,
        workbook.Worksheets.Count + 1,
    ):
        sheet = workbook.Worksheets(index)

        if normalize(sheet.Name) == target:
            return sheet

    return None


def wait_for_new_sheet(
    workbook,
    previous_sheets,
    timeout=30,
):
    start_time = time.time()

    while time.time() - start_time < timeout:
        current_sheets = get_sheet_names(
            workbook
        )

        new_sheets = [
            name
            for name in current_sheets
            if name not in previous_sheets
        ]

        if new_sheets:
            return new_sheets[-1]

        time.sleep(0.25)

    return None


def value_to_number(value):
    if value is None:
        return 0

    if isinstance(value, bool):
        return 0

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()

    if not text:
        return 0

    text = (
        text.replace(".", "")
        .replace(",", ".")
    )

    try:
        return float(text)
    except Exception:
        return 0


def column_number(column_letter):
    number = 0

    for character in column_letter:
        number = (
            number * 26
            + ord(character.upper())
            - ord("A")
            + 1
        )

    return number


def column_letter(number):
    result = ""

    while number:
        number, remainder = divmod(
            number - 1,
            26,
        )

        result = (
            chr(65 + remainder)
            + result
        )

    return result


# ============================================================
# BOOKING CONSTANTS
# ============================================================

BOOKING_RESULT_COLUMNS = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "AA",
    "AB",
    "AC",
    "AD",
    "AE",
    "AF",
    "AG",
    "AH",
    "AI",
    "AJ",
    "AK",
    "AL",
    "AM",
    "AN",
    "AO",
    "AP",
    "AQ",
    "AR",
    "AS",
    "AT",
    "AU",
    "AV",
    "AW",
    "AX",
    "AY",
    "AZ",
    "BA",
    "BB",
    "BC",
    "BD",
    "BE",
    "BF",
    "BG",
    "BH",
]


BOOKING_DISPLAY_COLUMNS = [
    {
        "column": "F",
        "header": "acctno",
    },
    {
        "column": "G",
        "header": "nama",
    },
    {
        "column": "H",
        "header": "limit",
    },
    {
        "column": "O",
        "header": "produk",
    },
    {
        "column": "P",
        "header": "tglcair",
    },
    {
        "column": "Q",
        "header": "tgl_jt_angs",
    },
    {
        "column": "T",
        "header": "angsuran",
    },
    {
        "column": "Z",
        "header": "AGF1",
    },
    {
        "column": "AE",
        "header": "nama_mks",
    },
    {
        "column": "AK",
        "header": "CIF",
    },
    {
        "column": "AL",
        "header": "Tenor",
    },
    {
        "column": "AR",
        "header": "App No",
    },
    {
        "column": "BA",
        "header": "alamat",
    },
]


EXPECTED_HEADERS = {
    "posisi",
    "distrik",
    "cluster",
    "mbu",
    "kocab",
    "acctno",
    "nama",
    "limit",
    "bade",
    "bikole_was",
    "bikole",
    "kol_is",
    "carcd_prev",
    "kol_was",
    "produk",
    "tglcair",
    "tgl_jt_angs",
    "angsuran",
    "tggpokok",
    "tggbunga",
    "tggdenda",
    "tgglain",
    "total_tgg",
    "agf1",
    "saldo_agf1",
    "kecukupan_saldo",
    "easy_coll",
    "nama_mks",
    "cif",
    "tenor",
    "app_no",
    "alamat",
}


# ============================================================
# BOOKING SOURCE
# ============================================================

def get_booking_rows(sheet):
    used_range = sheet.UsedRange

    first_row = used_range.Row

    last_row = (
        first_row
        + used_range.Rows.Count
        - 1
    )

    rows = []

    for excel_row in range(
        max(4, first_row),
        last_row + 1,
    ):
        branch = clean_text(
            sheet.Cells(
                excel_row,
                2,
            ).Value
        )

        name = clean_text(
            sheet.Cells(
                excel_row,
                3,
            ).Value
        )

        if not branch and not name:
            continue

        if not branch or not name:
            continue

        allowed_branches = [
            normalize(
                "Jambi Kuamang Kuning 1"
            ),
            normalize(
                "Jambi Kuamang Kuning 2"
            ),
        ]

        if normalize(branch) not in allowed_branches:
            continue

        rows.append(
            {
                "row": excel_row,
                "branch": branch,
                "name": name,
                "targetCell": f"G{excel_row}",
            }
        )

    return rows


def read_booking_options(workbook):
    booking_sheet = find_sheet(
        workbook,
        "Booking",
    )

    if booking_sheet is None:
        raise Exception(
            'Sheet "Booking" tidak ditemukan.'
        )

    rows = get_booking_rows(
        booking_sheet
    )

    branches = {}

    for item in rows:
        branch = item["branch"]

        if branch not in branches:
            branches[branch] = []

        branches[branch].append(
            {
                "name": item["name"],
                "row": item["row"],
                "targetCell": item["targetCell"],
            }
        )

    return {
        "success": True,
        "sheet": booking_sheet.Name,
        "branches": branches,
        "rows": rows,
    }


def find_booking_target(
    sheet,
    branch,
    name,
):
    target_branch = normalize(branch)
    target_name = normalize(name)

    rows = get_booking_rows(sheet)

    matches = [
        item
        for item in rows
        if normalize(
            item["branch"]
        ) == target_branch
        and normalize(
            item["name"]
        ) == target_name
    ]

    if not matches:
        raise Exception(
            "Nama SGP tidak ditemukan "
            "untuk cabang yang dipilih."
        )

    if len(matches) > 1:
        raise Exception(
            "Nama SGP ditemukan lebih dari "
            "satu baris. Data Booking perlu "
            "dibedakan terlebih dahulu."
        )

    return matches[0]


# ============================================================
# BOOKING EXCEL ACTION
# ============================================================

def execute_booking_double_click(
    excel,
    workbook,
    sheet,
    cell,
):
    workbook.Activate()
    sheet.Activate()
    cell.Select()

    print("")
    print("========================================")
    print("BOOKING DOUBLE CLICK")
    print("========================================")

    print(
        "Worksheet :",
        sheet.Name,
    )

    print(
        "Target    :",
        cell.Address,
    )

    print(
        "Value     :",
        cell.Value,
    )

    print("")

    try:
        print(
            "Mencoba cell.ShowDetail = True..."
        )

        cell.ShowDetail = True

        print(
            "ShowDetail BERHASIL."
        )

        return "ShowDetail"

    except Exception as error:
        print(
            "ShowDetail tidak berhasil:"
        )
        print(error)

    try:
        print(
            "Mencoba PivotTableShowDetails..."
        )

        excel.CommandBars.ExecuteMso(
            "PivotTableShowDetails"
        )

        print(
            "PivotTableShowDetails BERHASIL."
        )

        return "PivotTableShowDetails"

    except Exception as error:
        print(
            "PivotTableShowDetails tidak berhasil:"
        )
        print(error)

    raise Exception(
        "Excel belum berhasil menjalankan "
        f"double-click pada {cell.Address}."
    )


# ============================================================
# BOOKING HEADER DETECTION
# ============================================================

def read_row_values(
    sheet,
    row_number,
    column_count=60,
):
    values = []

    for column in range(
        1,
        column_count + 1,
    ):
        values.append(
            sheet.Cells(
                row_number,
                column,
            ).Value
        )

    return values


def is_booking_header_row(values):
    normalized_headers = {
        normalize(value)
        for value in values
        if normalize(value)
    }

    required = [
        "acctno",
        "nama",
        "limit",
        "produk",
        "tglcair",
        "tgl jt angs",
        "angsuran",
        "agf1",
        "nama mks",
    ]

    matched = 0

    for item in required:
        if item in normalized_headers:
            matched += 1

    return matched >= 6


def find_booking_header_row(
    result_sheet,
):
    used_range = result_sheet.UsedRange

    first_row = used_range.Row

    last_row = (
        used_range.Row
        + used_range.Rows.Count
        - 1
    )

    scan_last_row = min(
        last_row,
        first_row + 100,
    )

    print("")
    print(
        "[BOOKING] Mencari header..."
    )

    for row_number in range(
        first_row,
        scan_last_row + 1,
    ):
        values = read_row_values(
            result_sheet,
            row_number,
            60,
        )

        if is_booking_header_row(values):
            print(
                "[BOOKING] HEADER DITEMUKAN "
                f"DI BARIS EXCEL: {row_number}"
            )

            print(
                "[BOOKING] HEADER:"
            )

            for index, value in enumerate(
                values,
                start=1,
            ):
                if value not in (
                    None,
                    "",
                ):
                    print(
                        f"  {column_letter(index)} = "
                        f"{value}"
                    )

            return row_number

    return None


# ============================================================
# BOOKING RESULT
# ============================================================

def read_booking_result(
    result_sheet,
):
    used_range = result_sheet.UsedRange

    first_row = used_range.Row

    last_row = (
        used_range.Row
        + used_range.Rows.Count
        - 1
    )

    print("")
    print(
        "[BOOKING] UsedRange:"
        f" row {first_row} - {last_row}"
    )

    header_row = find_booking_header_row(
        result_sheet
    )

    if header_row is None:
        raise Exception(
            "Header hasil Booking tidak ditemukan."
        )

    headers = []

    for column_letter_value in BOOKING_RESULT_COLUMNS:
        value = result_sheet.Range(
            f"{column_letter_value}{header_row}"
        ).Value

        headers.append(
            clean_text(value)
        )

    first_data_row = header_row + 1

    data = []

    print("")
    print(
        "[BOOKING] Membaca data dari row "
        f"{first_data_row} sampai {last_row}"
    )

    for excel_row in range(
        first_data_row,
        last_row + 1,
    ):
        row = []
        has_value = False

        for column_letter_value in BOOKING_RESULT_COLUMNS:
            value = result_sheet.Range(
                f"{column_letter_value}{excel_row}"
            ).Value

            safe_value = json_safe(value)

            if safe_value not in (
                None,
                "",
            ):
                has_value = True

            row.append(
                safe_value
            )

        if not has_value:
            continue

        data.append(row)

    print("")
    print(
        "[BOOKING] TOTAL ROW HASIL EXCEL:",
        len(data),
    )

    product_index = (
        column_number("O") - 1
    )

    product_counts = {}

    for row in data:
        if product_index >= len(row):
            continue

        product = clean_text(
            row[product_index]
        )

        if not product:
            product = "(kosong)"

        product_counts[product] = (
            product_counts.get(
                product,
                0,
            )
            + 1
        )

    print(
        "[BOOKING] PRODUK YANG DITEMUKAN:",
        product_counts,
    )

    return {
        "headers": headers,
        "data": data,
        "headerRow": header_row,
        "columnLetters": BOOKING_RESULT_COLUMNS,
        "displayColumns": BOOKING_DISPLAY_COLUMNS,
    }


# ============================================================
# BOOKING TOTALS
# ============================================================

def calculate_booking_totals(
    result_sheet,
    header_row,
):
    used_range = result_sheet.UsedRange

    last_data_row = (
        used_range.Row
        + used_range.Rows.Count
        - 1
    )

    total_kum = 0
    total_kur = 0

    for excel_row in range(
        header_row + 1,
        last_data_row + 1,
    ):
        product = normalize(
            result_sheet.Range(
                f"O{excel_row}"
            ).Value
        )

        limit_value = value_to_number(
            result_sheet.Range(
                f"H{excel_row}"
            ).Value
        )

        if product == "kum":
            total_kum += limit_value

        elif product == "kur":
            total_kur += limit_value

    return {
        "kum": total_kum,
        "kur": total_kur,
    }


# ============================================================
# BOOKING PROCESS
# ============================================================

def process_booking(
    file_bytes,
    file_name,
    branch,
    name,
):
    pythoncom.CoInitialize()

    excel = None
    workbook = None
    temporary_file = None

    try:
        print("")
        print("========================================")
        print("BOOKING")
        print("========================================")

        print(
            "Membuka file:",
            file_name,
        )

        print(
            "Cabang:",
            branch,
        )

        print(
            "Nama SGP:",
            name,
        )

        extension = (
            os.path.splitext(
                file_name
            )[1]
            or ".xlsb"
        )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as temp:
            temp.write(file_bytes)
            temporary_file = temp.name

        excel = win32com.client.DispatchEx(
            "Excel.Application"
        )

        excel.Visible = True
        excel.DisplayAlerts = False
        excel.EnableEvents = True
        excel.ScreenUpdating = True

        workbook = excel.Workbooks.Open(
            os.path.abspath(
                temporary_file
            ),
            UpdateLinks=0,
            ReadOnly=False,
        )

        print(
            "Workbook berhasil dibuka."
        )

        booking_sheet = find_sheet(
            workbook,
            "Booking",
        )

        if booking_sheet is None:
            raise Exception(
                'Sheet "Booking" tidak ditemukan.'
            )

        print(
            "Sheet Booking:",
            booking_sheet.Name,
        )

        target = find_booking_target(
            booking_sheet,
            branch,
            name,
        )

        target_row = target["row"]

        target_address = target[
            "targetCell"
        ]

        print("")
        print(
            "TARGET BOOKING"
        )

        print(
            "Cabang:",
            target["branch"],
        )

        print(
            "Nama:",
            target["name"],
        )

        print(
            "Baris:",
            target_row,
        )

        print(
            "Target:",
            target_address,
        )

        previous_sheets = get_sheet_names(
            workbook
        )

        target_cell = booking_sheet.Range(
            target_address
        )

        method = execute_booking_double_click(
            excel=excel,
            workbook=workbook,
            sheet=booking_sheet,
            cell=target_cell,
        )

        print("")
        print(
            "Menunggu sheet hasil Booking..."
        )

        new_sheet_name = wait_for_new_sheet(
            workbook,
            previous_sheets,
            timeout=30,
        )

        if not new_sheet_name:
            raise Exception(
                "Excel tidak membuat sheet baru "
                "setelah proses Booking."
            )

        print("")
        print(
            "========================================"
        )
        print(
            "HASIL BOOKING DITEMUKAN"
        )
        print(
            "========================================"
        )

        print(
            "Sheet hasil:",
            new_sheet_name,
        )

        result_sheet = workbook.Worksheets(
            new_sheet_name
        )

        result = read_booking_result(
            result_sheet
        )

        totals = calculate_booking_totals(
            result_sheet,
            result["headerRow"],
        )

        print("")
        print(
            "Header hasil:"
        )

        for index, header in enumerate(
            result["headers"],
            start=1,
        ):
            print(
                f" {column_letter(index)} = "
                f"{header}"
            )

        print("")

        print(
            "Header row:",
            result["headerRow"],
        )

        print(
            "Jumlah data:",
            len(result["data"]),
        )

        print(
            "Total KUM:",
            totals["kum"],
        )

        print(
            "Total KUR:",
            totals["kur"],
        )

        print("")

        print(
            "========================================"
        )
        print(
            "BOOKING SELESAI"
        )
        print(
            "========================================"
        )

        return {
            "success": True,
            "sourceSheet": booking_sheet.Name,
            "createdSheet": new_sheet_name,
            "branch": target["branch"],
            "name": target["name"],
            "targetRow": target_row,
            "targetCell": target_address,
            "method": method,
            "headers": result["headers"],
            "data": result["data"],
            "columnLetters": result[
                "columnLetters"
            ],
            "displayColumns": result[
                "displayColumns"
            ],
            "headerRow": result[
                "headerRow"
            ],
            "totals": totals,
        }

    finally:
        if workbook is not None:
            try:
                workbook.Close(
                    SaveChanges=False
                )
            except Exception:
                pass

        if excel is not None:
            try:
                excel.Quit()
            except Exception:
                pass

        if (
            temporary_file
            and os.path.exists(
                temporary_file
            )
        ):
            try:
                os.remove(
                    temporary_file
                )
            except Exception:
                pass

        pythoncom.CoUninitialize()


# ============================================================
# BOOKING OPTIONS PROCESS
# ============================================================

def process_booking_options(
    file_bytes,
    file_name,
):
    pythoncom.CoInitialize()

    excel = None
    workbook = None
    temporary_file = None

    try:
        print("")
        print(
            "========================================"
        )
        print(
            "BOOKING OPTIONS"
        )
        print(
            "========================================"
        )

        extension = (
            os.path.splitext(
                file_name
            )[1]
            or ".xlsb"
        )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as temp:
            temp.write(file_bytes)
            temporary_file = temp.name

        excel = win32com.client.DispatchEx(
            "Excel.Application"
        )

        excel.Visible = True
        excel.DisplayAlerts = False
        excel.EnableEvents = True
        excel.ScreenUpdating = True

        workbook = excel.Workbooks.Open(
            os.path.abspath(
                temporary_file
            ),
            UpdateLinks=0,
            ReadOnly=False,
        )

        booking_sheet = find_sheet(
            workbook,
            "Booking",
        )

        if booking_sheet is None:
            raise Exception(
                'Sheet "Booking" tidak ditemukan.'
            )

        result = read_booking_options(
            workbook
        )

        print(
            "Jumlah pilihan:",
            len(
                result["rows"]
            ),
        )

        return result

    finally:
        if workbook is not None:
            try:
                workbook.Close(
                    SaveChanges=False
                )
            except Exception:
                pass

        if excel is not None:
            try:
                excel.Quit()
            except Exception:
                pass

        if (
            temporary_file
            and os.path.exists(
                temporary_file
            )
        ):
            try:
                os.remove(
                    temporary_file
                )
            except Exception:
                pass

        pythoncom.CoUninitialize()