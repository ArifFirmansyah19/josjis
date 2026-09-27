# ============================================================
# FILE
# D:\APLIKASI\josjis\excel-engine\engine_2a_easycall.py
# ============================================================

import os
import tempfile
import time

import pythoncom
import win32com.client


# ============================================================
# BASIC HELPERS
# ============================================================

def normalize(value):
    if value is None:
        return ""

    return (
        str(value)
        .replace("\u00a0", " ")
        .replace("\r", " ")
        .replace("\n", " ")
        .replace("\t", " ")
        .strip()
        .lower()
    )


def normalize_spaces(value):
    return " ".join(normalize(value).split())


def excel_column_name(column_number):
    """
    1  -> A
    2  -> B
    26 -> Z
    27 -> AA
    """
    result = ""

    while column_number > 0:
        column_number, remainder = divmod(
            column_number - 1,
            26,
        )

        result = chr(65 + remainder) + result

    return result


def column_number(column_name):
    result = 0

    for char in column_name.upper():
        result = result * 26 + (
            ord(char) - ord("A") + 1
        )

    return result


def get_sheet_names(workbook):
    return [
        str(workbook.Worksheets(index).Name)
        for index in range(
            1,
            workbook.Worksheets.Count + 1,
        )
    ]


def read_sheet(sheet):
    used_range = sheet.UsedRange

    if used_range is None:
        return {
            "rows": [],
            "start_row": 1,
            "start_column": 1,
            "row_count": 0,
            "column_count": 0,
            "address": "",
        }

    values = used_range.Value

    if values is None:
        return {
            "rows": [],
            "start_row": used_range.Row,
            "start_column": used_range.Column,
            "row_count": used_range.Rows.Count,
            "column_count": used_range.Columns.Count,
            "address": used_range.Address,
        }

    if not isinstance(values, tuple):
        rows = [[values]]

    elif values and not isinstance(values[0], tuple):
        rows = [list(values)]

    else:
        rows = [list(row) for row in values]

    return {
        "rows": rows,
        "start_row": used_range.Row,
        "start_column": used_range.Column,
        "row_count": used_range.Rows.Count,
        "column_count": used_range.Columns.Count,
        "address": used_range.Address,
    }


# ============================================================
# 2A / TAGIHAN
# ============================================================

def find_port_unit_sheet(workbook):
    for index in range(
        1,
        workbook.Worksheets.Count + 1,
    ):
        sheet = workbook.Worksheets(index)

        if normalize(sheet.Name) == "portunit":
            return sheet

    return None


def find_unit_row(sheet, unit_name):
    used_range = sheet.UsedRange

    if used_range is None:
        return None

    first_row = used_range.Row

    last_row = (
        used_range.Row
        + used_range.Rows.Count
        - 1
    )

    for row in range(
        first_row,
        last_row + 1,
    ):
        value = sheet.Cells(row, 2).Value

        if normalize(value) == normalize(unit_name):
            return row

    return None


def get_target_cell(sheet, row):
    cell = sheet.Cells(row, 4)
    value = cell.Value

    return cell, value


# ============================================================
# EXCEL DOUBLE CLICK / SHOW DETAILS
# ============================================================

def wait_for_new_sheet(
    workbook,
    previous_sheets,
    timeout=30,
):
    start_time = time.time()

    while time.time() - start_time < timeout:
        current_sheets = get_sheet_names(workbook)

        new_sheets = [
            name
            for name in current_sheets
            if name not in previous_sheets
        ]

        if new_sheets:
            return new_sheets[-1]

        time.sleep(0.25)

    return None


def execute_double_click(
    excel,
    workbook,
    sheet,
    cell,
):
    workbook.Activate()
    sheet.Activate()
    cell.Select()

    print(
        "Worksheet aktif:",
        sheet.Name,
    )

    print(
        "Cell target:",
        cell.Address,
    )

    print(
        "Nilai target:",
        cell.Value,
    )

    # --------------------------------------------------------
    # CARA 1
    # --------------------------------------------------------

    try:
        print(
            "Menjalankan ShowDetail..."
        )

        cell.ShowDetail = True

        print(
            "ShowDetail berhasil."
        )

        return "ShowDetail"

    except Exception as error:
        print(
            "ShowDetail gagal:"
        )
        print(error)

    # --------------------------------------------------------
    # CARA 2
    # --------------------------------------------------------

    try:
        print(
            "Mencoba PivotTableShowDetails..."
        )

        excel.CommandBars.ExecuteMso(
            "PivotTableShowDetails"
        )

        print(
            "PivotTableShowDetails berhasil."
        )

        return "PivotTableShowDetails"

    except Exception as error:
        print(
            "PivotTableShowDetails gagal:"
        )
        print(error)

    raise Exception(
        "Excel tidak berhasil melakukan "
        "double-click / Show Details pada "
        f"{cell.Address}."
    )


# ============================================================
# PROCESS 2A
# ============================================================

def process_excel(
    file_bytes,
    file_name,
    unit_name,
):
    pythoncom.CoInitialize()

    excel = None
    workbook = None
    temporary_file = None

    try:
        extension = (
            os.path.splitext(file_name)[1]
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
            temporary_file,
            ReadOnly=False,
        )

        # ----------------------------------------------------
        # CARI SHEET PORT UNIT
        # ----------------------------------------------------

        port_unit = find_port_unit_sheet(
            workbook
        )

        if port_unit is None:
            raise Exception(
                'Sheet "PortUnit" tidak ditemukan.'
            )

        # ----------------------------------------------------
        # CARI BARIS UNIT
        # ----------------------------------------------------

        unit_row = find_unit_row(
            port_unit,
            unit_name,
        )

        if unit_row is None:
            raise Exception(
                f'Unit "{unit_name}" tidak ditemukan '
                "di kolom B sheet PortUnit."
            )

        # ----------------------------------------------------
        # TARGET KOLOM D
        # ----------------------------------------------------

        target_cell, target_value = get_target_cell(
            port_unit,
            unit_row,
        )

        target_address = target_cell.Address

        print("")
        print("========================================")
        print("2A / TAGIHAN")
        print("========================================")

        print(
            "Sheet:",
            port_unit.Name,
        )

        print(
            "Unit:",
            unit_name,
        )

        print(
            "Baris unit:",
            unit_row,
        )

        print(
            "Target cell:",
            target_address,
        )

        print(
            "Nilai target:",
            target_value,
        )

        # ----------------------------------------------------
        # SIMPAN DAFTAR SHEET SEBELUM DOUBLE CLICK
        # ----------------------------------------------------

        previous_sheets = get_sheet_names(
            workbook
        )

        # ----------------------------------------------------
        # DOUBLE CLICK / SHOW DETAILS
        # ----------------------------------------------------

        method = execute_double_click(
            excel=excel,
            workbook=workbook,
            sheet=port_unit,
            cell=target_cell,
        )

        # ----------------------------------------------------
        # TUNGGU SHEET BARU
        # ----------------------------------------------------

        print(
            "Menunggu sheet hasil 2A..."
        )

        new_sheet_name = wait_for_new_sheet(
            workbook,
            previous_sheets,
            timeout=30,
        )

        if not new_sheet_name:
            raise Exception(
                "Excel tidak membuat sheet baru "
                "setelah double-click."
            )

        print(
            "Sheet hasil 2A:",
            new_sheet_name,
        )

        # ----------------------------------------------------
        # BACA SHEET HASIL
        # ----------------------------------------------------

        detail_sheet = workbook.Worksheets(
            new_sheet_name
        )

        read_result = read_sheet(
            detail_sheet
        )

        rows = read_result["rows"]

        print(
            "Total row hasil Excel:",
            len(rows),
        )

        return {
            "success": True,
            "sourceSheet": port_unit.Name,
            "unit": unit_name,
            "unitRow": unit_row,
            "targetCell": target_address,
            "targetValue": target_value,
            "createdSheet": new_sheet_name,
            "method": method,
            "rowCount": len(rows),
            "data": rows,
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
# EASY CALL HELPERS
# ============================================================

def find_easy_coll_sheet(workbook):
    for index in range(
        1,
        workbook.Worksheets.Count + 1,
    ):
        sheet = workbook.Worksheets(index)

        if normalize(sheet.Name) == "easycoll":
            return sheet

    return None


def execute_show_details(
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
    print("TARGET SHOW DETAILS")
    print("========================================")

    print(
        "Worksheet :",
        sheet.Name,
    )

    print(
        "Cell      :",
        cell.Address,
    )

    print(
        "Value     :",
        cell.Value,
    )

    print("")

    # --------------------------------------------------------
    # CARA 1
    # --------------------------------------------------------

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
            "ShowDetail gagal:"
        )
        print(error)

    # --------------------------------------------------------
    # CARA 2
    # --------------------------------------------------------

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
            "PivotTableShowDetails gagal:"
        )
        print(error)

    raise Exception(
        "Excel tidak berhasil membuat "
        "tabel detail dari H9."
    )


# ============================================================
# EASY CALL
# BACA DATA DETAIL BERDASARKAN KOLOM EXCEL ABSOLUT
# ============================================================

def convert_used_range_to_absolute_rows(
    sheet,
    read_result,
):
    rows = read_result["rows"]
    start_column = read_result["start_column"]

    if not rows:
        return []

    absolute_rows = []

    for local_row in rows:
        absolute_row = [
            None
            for _ in range(
                start_column - 1
            )
        ]

        absolute_row.extend(
            local_row
        )

        absolute_rows.append(
            absolute_row
        )

    return absolute_rows


def find_header_row(rows):
    required_headers = {
        "acctno": 5,
        "agf1": 25,
        "nama": 6,
        "total_tgg": 24,
    }

    best_index = None
    best_score = 0

    for row_index, row in enumerate(rows):
        score = 0

        for header, column_index in required_headers.items():
            if column_index >= len(row):
                continue

            value = normalize_spaces(
                row[column_index]
            )

            if value == header:
                score += 1

        if score > best_score:
            best_score = score
            best_index = row_index

    return best_index


def find_branch_rows(data_rows):
    result = []

    branch1 = normalize_spaces(
        "Jambi Kuamang Kuning 1"
    )

    branch2 = normalize_spaces(
        "Jambi Kuamang Kuning 2"
    )

    for row in data_rows:
        if len(row) <= 3:
            continue

        branch = normalize_spaces(
            row[3]
        )

        if branch == branch1:
            result.append(
                {
                    "branch": "Jambi Kuamang Kuning 1",
                    "row": row,
                }
            )

        elif branch == branch2:
            result.append(
                {
                    "branch": "Jambi Kuamang Kuning 2",
                    "row": row,
                }
            )

    return result


# ============================================================
# PROCESS EASY CALL
# ============================================================

def process_easy_call(
    file_bytes,
    file_name,
):
    pythoncom.CoInitialize()

    excel = None
    workbook = None
    temporary_file = None

    try:
        print("")
        print("========================================")
        print("EASY CALL")
        print("========================================")

        print(
            "Membuka file:",
            file_name,
        )

        # ----------------------------------------------------
        # SIMPAN FILE SEMENTARA
        # ----------------------------------------------------

        extension = (
            os.path.splitext(file_name)[1]
            or ".xlsb"
        )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as temp:
            temp.write(file_bytes)
            temporary_file = temp.name

        # ----------------------------------------------------
        # BUKA EXCEL
        # ----------------------------------------------------

        excel = win32com.client.DispatchEx(
            "Excel.Application"
        )

        excel.Visible = True
        excel.DisplayAlerts = False
        excel.EnableEvents = True
        excel.ScreenUpdating = True

        workbook = excel.Workbooks.Open(
            temporary_file,
            ReadOnly=False,
        )

        print(
            "Workbook berhasil dibuka."
        )

        # ----------------------------------------------------
        # CARI EASYCOLL
        # ----------------------------------------------------

        easy_coll = find_easy_coll_sheet(
            workbook
        )

        if easy_coll is None:
            raise Exception(
                'Sheet "EasyColl" tidak ditemukan.'
            )

        print(
            "Sheet sumber:",
            easy_coll.Name,
        )

        # ----------------------------------------------------
        # TARGET H9
        # ----------------------------------------------------

        target_cell = easy_coll.Range(
            "H9"
        )

        print(
            "Target:",
            easy_coll.Name,
            target_cell.Address,
        )

        print(
            "Nilai H9:",
            target_cell.Value,
        )

        # ----------------------------------------------------
        # CATAT SHEET SEBELUM PROSES
        # ----------------------------------------------------

        previous_sheets = get_sheet_names(
            workbook
        )

        print("")
        print(
            "Sheet sebelum Show Details:"
        )

        for name in previous_sheets:
            print(
                " -",
                name,
            )

        # ----------------------------------------------------
        # SHOW DETAILS H9
        # ----------------------------------------------------

        method = execute_show_details(
            excel=excel,
            workbook=workbook,
            sheet=easy_coll,
            cell=target_cell,
        )

        # ----------------------------------------------------
        # CARI SHEET BARU
        # ----------------------------------------------------

        print("")
        print(
            "Menunggu sheet hasil..."
        )

        new_sheet_name = wait_for_new_sheet(
            workbook,
            previous_sheets,
            timeout=30,
        )

        if not new_sheet_name:
            raise Exception(
                "Excel tidak membuat sheet baru "
                "setelah H9."
            )

        print("")
        print(
            "========================================"
        )
        print(
            "SHEET HASIL DITEMUKAN"
        )
        print(
            "========================================"
        )

        print(
            "Nama sheet:",
            new_sheet_name,
        )

        # ----------------------------------------------------
        # BACA SHEET HASIL
        # ----------------------------------------------------

        detail_sheet = workbook.Worksheets(
            new_sheet_name
        )

        read_result = read_sheet(
            detail_sheet
        )

        used_range = detail_sheet.UsedRange

        print(
            "UsedRange:",
            used_range.Address,
        )

        print(
            "Start Row:",
            read_result["start_row"],
        )

        print(
            "Start Column:",
            read_result["start_column"],
            "("
            + excel_column_name(
                read_result["start_column"]
            )
            + ")",
        )

        print(
            "Baris:",
            read_result["row_count"],
        )

        print(
            "Kolom:",
            read_result["column_count"],
        )

        raw_rows = read_result["rows"]

        print(
            "Jumlah row raw:",
            len(raw_rows),
        )

        # ----------------------------------------------------
        # NORMALISASI KE POSISI KOLOM EXCEL ABSOLUT
        # ----------------------------------------------------

        rows = convert_used_range_to_absolute_rows(
            detail_sheet,
            read_result,
        )

        print(
            "Jumlah row absolute:",
            len(rows),
        )

        # ----------------------------------------------------
        # CARI HEADER
        # ----------------------------------------------------

        header_row_index = find_header_row(
            rows
        )

        print("")
        print(
            "Header row index:",
            header_row_index,
        )

        if header_row_index is None:
            raise Exception(
                "Header tabel Easy Call tidak ditemukan."
            )

        excel_header_row = (
            read_result["start_row"]
            + header_row_index
        )

        print(
            "Header Excel row:",
            excel_header_row,
        )

        # ----------------------------------------------------
        # PISAHKAN HEADER DAN DATA
        # ----------------------------------------------------

        header_row = rows[
            header_row_index
        ]

        data_rows = rows[
            header_row_index + 1:
        ]

        print("")
        print(
            "========================================"
        )
        print(
            "HEADER"
        )
        print(
            "========================================"
        )

        print(
            "acctno:",
            header_row[5]
            if len(header_row) > 5
            else None,
        )

        print(
            "nama:",
            header_row[6]
            if len(header_row) > 6
            else None,
        )

        print(
            "total_tgg:",
            header_row[24]
            if len(header_row) > 24
            else None,
        )

        print(
            "AGF1:",
            header_row[25]
            if len(header_row) > 25
            else None,
        )

        # ----------------------------------------------------
        # FILTER JKK 1 / JKK 2
        # ----------------------------------------------------

        branch_rows = find_branch_rows(
            data_rows
        )

        branch1_rows = [
            item["row"]
            for item in branch_rows
            if item["branch"]
            == "Jambi Kuamang Kuning 1"
        ]

        branch2_rows = [
            item["row"]
            for item in branch_rows
            if item["branch"]
            == "Jambi Kuamang Kuning 2"
        ]

        print("")
        print(
            "========================================"
        )
        print(
            "HASIL FILTER"
        )
        print(
            "========================================"
        )

        print(
            "Total data setelah header:",
            len(data_rows),
        )

        print(
            "Jambi Kuamang Kuning 1:",
            len(branch1_rows),
        )

        print(
            "Jambi Kuamang Kuning 2:",
            len(branch2_rows),
        )

        print(
            "Total JKK:",
            len(branch1_rows)
            + len(branch2_rows),
        )

        # ----------------------------------------------------
        # DEBUG DATA
        # ----------------------------------------------------

        print("")
        print(
            "DATA JKK 1:"
        )

        for index, row in enumerate(
            branch1_rows
        ):
            print(
                index + 1,
                "D=",
                row[3]
                if len(row) > 3
                else None,
                "F=",
                row[5]
                if len(row) > 5
                else None,
                "G=",
                row[6]
                if len(row) > 6
                else None,
                "Y=",
                row[24]
                if len(row) > 24
                else None,
                "Z=",
                row[25]
                if len(row) > 25
                else None,
            )

        print("")
        print(
            "DATA JKK 2:"
        )

        for index, row in enumerate(
            branch2_rows
        ):
            print(
                index + 1,
                "D=",
                row[3]
                if len(row) > 3
                else None,
                "F=",
                row[5]
                if len(row) > 5
                else None,
                "G=",
                row[6]
                if len(row) > 6
                else None,
                "Y=",
                row[24]
                if len(row) > 24
                else None,
                "Z=",
                row[25]
                if len(row) > 25
                else None,
            )

        print("")
        print(
            "========================================"
        )
        print(
            "EASY CALL SELESAI"
        )
        print(
            "========================================"
        )

        # ----------------------------------------------------
        # RETURN
        # ----------------------------------------------------

        return {
            "success": True,
            "sourceSheet": easy_coll.Name,
            "targetCell": target_cell.Address,
            "targetValue": target_cell.Value,
            "createdSheet": new_sheet_name,
            "method": method,
            "range": used_range.Address,
            "usedRangeRow": read_result[
                "start_row"
            ],
            "usedRangeColumn": read_result[
                "start_column"
            ],
            "usedRangeColumnName": excel_column_name(
                read_result[
                    "start_column"
                ]
            ),
            "rowCount": len(rows),
            "columnCount": read_result[
                "column_count"
            ],
            "headerRowIndex": header_row_index,
            "headerExcelRow": excel_header_row,
            "dataRowCount": len(data_rows),
            "jkk1Count": len(branch1_rows),
            "jkk2Count": len(branch2_rows),
            "jkkTotalCount": (
                len(branch1_rows)
                + len(branch2_rows)
            ),
            "data": rows,
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