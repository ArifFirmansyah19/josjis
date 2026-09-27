/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { EXCEL_ENGINE_URL } from "@/lib/excel-engine";

import { Download, Loader2, MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const BRANCH_1 = "Jambi Kuamang Kuning 1";
const BRANCH_2 = "Jambi Kuamang Kuning 2";

const DISPLAY_COLUMNS = [
  {
    excel: "F",
    index: 5,
    header: "acctno",
  },
  {
    excel: "Z",
    index: 25,
    header: "AGF1",
  },
  {
    excel: "G",
    index: 6,
    header: "nama",
  },
  {
    excel: "Y",
    index: 24,
    header: "total_tgg",
  },
  {
    excel: "D",
    index: 3,
    header: "mbu",
  },
  {
    excel: "AE",
    index: 30,
    header: "nama_mks",
  },
];

function normalize(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  let text = String(value).trim();

  if (!text) {
    return null;
  }

  text = text.replace(/\s/g, "");

  if (text.includes(".") && text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

function formatY(value) {
  const number = parseNumber(value);

  if (number === null) {
    return "";
  }

  const rounded = Math.ceil(number / 1000) * 1000;

  return rounded.toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  });
}

function getYNumber(value) {
  const number = parseNumber(value);

  if (number === null) {
    return "";
  }

  return Math.ceil(number / 1000) * 1000;
}

function formatCell(value, excelColumn) {
  if (value === null || value === undefined) {
    return "";
  }

  if (excelColumn === "F") {
    return String(value);
  }

  if (excelColumn === "Y") {
    return formatY(value);
  }

  return String(value);
}

/**
 * MBU selalu berasal dari kolom D.
 */
function getBranch(row) {
  if (!Array.isArray(row)) {
    return "";
  }

  const mbu = normalize(row[3]);

  if (mbu === normalize(BRANCH_1)) {
    return BRANCH_1;
  }

  if (mbu === normalize(BRANCH_2)) {
    return BRANCH_2;
  }

  return "";
}

function isBranch1(row) {
  return getBranch(row) === BRANCH_1;
}

function isBranch2(row) {
  return getBranch(row) === BRANCH_2;
}

function findHeaderRowIndex(rows) {
  if (!Array.isArray(rows)) {
    return -1;
  }

  const requiredHeaders = ["acctno", "nama", "total_tgg", "agf1"];

  let bestIndex = -1;
  let bestScore = 0;

  rows.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      return;
    }

    let score = 0;

    for (const cell of row) {
      const value = normalize(cell);

      if (requiredHeaders.includes(value)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  });

  return bestIndex;
}

function getFileName() {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());

  return `EasyColl_JKK_${day}${month}${year}.xlsx`;
}

/**
 * ============================================================
 * EXPORT EXCEL
 * ============================================================
 *
 * PENTING:
 *
 * Export TIDAK melakukan filter JKK 1 / JKK 2 lagi.
 *
 * Data yang diexport adalah filteredRows yang SAMA
 * dengan data yang ditampilkan di tabel web.
 *
 * Jadi:
 *
 * Web 8 data
 *      ↓
 * filteredRows = 8
 *      ↓
 * Excel = 8
 *
 * Tidak ada pemisahan ulang yang bisa membuang JKK 2.
 */
function buildExcelFile(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("Data Easy Call tidak valid.");
  }

  console.log("========== EXPORT EASY CALL ==========");
  console.log("Jumlah data yang akan diexport:", rows.length);

  /**
   * Cek jumlah masing-masing unit,
   * tetapi TIDAK menghapus data apa pun.
   */
  const jkk1Rows = rows.filter(isBranch1);
  const jkk2Rows = rows.filter(isBranch2);

  console.log("JKK 1:", jkk1Rows.length);
  console.log("JKK 2:", jkk2Rows.length);
  console.log("TOTAL:", rows.length);

  /**
   * Convert SEMUA row yang tampil di web.
   */
  const excelRows = rows.map((row, index) => [
    // No.
    index + 1,

    // F = acctno
    String(row?.[5] ?? ""),

    // Z = AGF1
    String(row?.[25] ?? ""),

    // G = nama
    String(row?.[6] ?? ""),

    // Y = total_tgg
    getYNumber(row?.[24]),

    // D = mbu
    String(row?.[3] ?? ""),

    // AE = nama_mks
    String(row?.[30] ?? ""),
  ]);

  const workbook = XLSX.utils.book_new();

  const headers = [
    "No.",
    "acctno",
    "AGF1",
    "nama",
    "total_tgg",
    "mbu",
    "nama_mks",
  ];

  /**
   * SATU SHEET berisi seluruh data.
   */
  const sheetData = [headers, ...excelRows];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 16 },
    { wch: 32 },
    { wch: 16 },
    { wch: 30 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Easy Call");

  console.log("Jumlah row Excel:", excelRows.length);
  console.log("======================================");

  const arrayBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export default function EasyCallModal({ open, onClose, file }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdSheet, setCreatedSheet] = useState("");
  const [targetCell, setTargetCell] = useState("");
  const [range, setRange] = useState("");
  const [processed, setProcessed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.matchMedia("(max-width: 767px)").matches);
    }

    checkMobile();

    const mediaQuery = window.matchMedia("(max-width: 767px)");

    mediaQuery.addEventListener("change", checkMobile);

    return () => {
      mediaQuery.removeEventListener("change", checkMobile);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setRows([]);
    setLoading(false);
    setError("");
    setCreatedSheet("");
    setTargetCell("");
    setRange("");
    setProcessed(false);
    setExporting(false);
    setSharing(false);
  }, [open]);

  const headerRowIndex = useMemo(() => {
    return findHeaderRowIndex(rows);
  }, [rows]);

  const dataRows = useMemo(() => {
    if (headerRowIndex < 0) {
      return [];
    }

    return rows.slice(headerRowIndex + 1);
  }, [rows, headerRowIndex]);

  /**
   * Data yang tampil di web.
   *
   * Hanya mengambil JKK 1 dan JKK 2
   * berdasarkan kolom D / MBU.
   */
  const filteredRows = useMemo(() => {
    return dataRows.filter((row) => {
      const branch = getBranch(row);

      return branch === BRANCH_1 || branch === BRANCH_2;
    });
  }, [dataRows]);

  const branch1Rows = useMemo(() => {
    return filteredRows.filter(isBranch1);
  }, [filteredRows]);

  const branch2Rows = useMemo(() => {
    return filteredRows.filter(isBranch2);
  }, [filteredRows]);

  const branch1Count = branch1Rows.length;
  const branch2Count = branch2Rows.length;
  const totalCount = filteredRows.length;

  /**
   * ============================================================
   * PROSES EASY CALL
   * ============================================================
   */
  async function handleProcess() {
    if (!file) {
      setError("File Excel belum tersedia.");
      return;
    }

    setLoading(true);
    setError("");
    setProcessed(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      let binary = "";

      const chunkSize = 0x8000;

      for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(
          index,
          Math.min(index + chunkSize, bytes.length),
        );

        binary += String.fromCharCode(...chunk);
      }

      const base64 = btoa(binary);

      const response = await fetch(`${EXCEL_ENGINE_URL}/raportmu/easy-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          file: base64,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Proses Easy Call gagal.");
      }

      const resultRows = Array.isArray(result.data) ? result.data : [];

      console.log("========== EASY CALL RESULT ==========");
      console.log("Total rows dari engine:", resultRows.length);
      console.log("Header index:", result.headerRowIndex);
      console.log("Header Excel row:", result.headerExcelRow);
      console.log("Data row count engine:", result.dataRowCount);
      console.log("======================================");

      /**
       * DEBUG kolom D / MBU.
       */
      console.log("========== MBU KOLOM D ==========");

      resultRows.forEach((row, index) => {
        if (Array.isArray(row)) {
          console.log(`Row ${index} - D:`, row[3]);
        }
      });

      console.log("=================================");

      setRows(resultRows);
      setCreatedSheet(result.createdSheet || "");
      setTargetCell(result.targetCell || "");
      setRange(result.range || "");
      setProcessed(true);
    } catch (processError) {
      console.error("Easy Call error:", processError);

      setError(processError?.message || "Proses Easy Call gagal.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * ============================================================
   * DOWNLOAD EXCEL
   * ============================================================
   *
   * PENTING:
   *
   * filteredRows = data yang tampil di tabel.
   *
   * Tidak menggunakan branch1Rows.
   * Tidak menggunakan branch2Rows.
   *
   * Jadi seluruh data langsung masuk Excel.
   */
  function handleDownloadExcel() {
    if (!filteredRows.length) {
      setError("Tidak ada data Easy Call yang dapat diexport.");
      return;
    }

    setExporting(true);
    setError("");

    try {
      console.log("DOWNLOAD DATA:", filteredRows.length);
      console.log("DOWNLOAD JKK 1:", filteredRows.filter(isBranch1).length);
      console.log("DOWNLOAD JKK 2:", filteredRows.filter(isBranch2).length);

      const blob = buildExcelFile(filteredRows);

      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = getFileName();

      document.body.appendChild(anchor);

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error("Export Easy Call error:", exportError);

      setError(exportError?.message || "File Excel gagal dibuat.");
    } finally {
      setExporting(false);
    }
  }

  /**
   * ============================================================
   * SHARE WHATSAPP
   * ============================================================
   */
  async function handleShareWhatsApp() {
    if (!filteredRows.length) {
      setError("Tidak ada data Easy Call yang dapat dikirim.");
      return;
    }

    setSharing(true);
    setError("");

    try {
      const blob = buildExcelFile(filteredRows);

      const fileName = getFileName();

      const shareFile = new File([blob], fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      if (!navigator.share) {
        throw new Error(
          "Perangkat atau browser ini belum mendukung berbagi file langsung.",
        );
      }

      if (
        navigator.canShare &&
        !navigator.canShare({
          files: [shareFile],
        })
      ) {
        throw new Error(
          "Perangkat atau browser ini belum mendukung berbagi file Excel langsung.",
        );
      }

      await navigator.share({
        files: [shareFile],
        title: fileName,
        text: `EasyColl JKK - ${fileName}`,
      });
    } catch (shareError) {
      if (shareError?.name === "AbortError") {
        return;
      }

      console.error("Share WhatsApp error:", shareError);

      setError(shareError?.message || "File Excel gagal dibagikan.");
    } finally {
      setSharing(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Easy Call</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Data EasyColl H9 untuk Jambi Kuamang Kuning 1 dan 2.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-3">
          <button
            type="button"
            onClick={handleProcess}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              "Proses Easy Call"
            )}
          </button>

          {processed && (
            <>
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={exporting || sharing || !filteredRows.length}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Unduh Excel
              </button>

              {isMobile && (
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  disabled={exporting || sharing || !filteredRows.length}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sharing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  Kirim ke WhatsApp
                </button>
              )}
            </>
          )}

          {processed && (
            <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span>
                JKK 1:
                <strong className="ml-1 text-zinc-900">{branch1Count}</strong>
              </span>

              <span>
                JKK 2:
                <strong className="ml-1 text-zinc-900">{branch2Count}</strong>
              </span>

              <span>
                Total:
                <strong className="ml-1 text-zinc-900">{totalCount}</strong>
              </span>
            </div>
          )}
        </div>

        {/* INFO */}
        {processed && (
          <div className="border-b border-zinc-200 px-5 py-3">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500">
              <span>
                Sumber:
                <strong className="ml-1 text-zinc-800">EasyColl</strong>
              </span>

              <span>
                Target:
                <strong className="ml-1 text-zinc-800">{targetCell}</strong>
              </span>

              <span>
                Sheet hasil:
                <strong className="ml-1 text-zinc-800">{createdSheet}</strong>
              </span>

              <span>
                Range:
                <strong className="ml-1 text-zinc-800">{range}</strong>
              </span>

              <span>
                Header:
                <strong className="ml-1 text-zinc-800">
                  {headerRowIndex >= 0
                    ? `baris ${headerRowIndex + 1}`
                    : "tidak ditemukan"}
                </strong>
              </span>

              <span>
                Data:
                <strong className="ml-1 text-zinc-800">
                  {dataRows.length}
                </strong>
              </span>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CONTENT */}
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {!processed && !loading && (
            <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
              <div className="text-center">
                <div className="text-sm font-medium text-zinc-700">
                  Easy Call belum diproses
                </div>

                <p className="mt-1 text-xs text-zinc-500">
                  Klik Proses Easy Call untuk mengambil data.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Excel sedang diproses...
              </div>
            </div>
          )}

          {processed && (
            <>
              {/* SUMMARY */}
              <div className="mb-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="text-xs text-zinc-500">Header</div>

                  <div className="mt-1 text-xl font-semibold text-zinc-900">
                    1
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="text-xs text-zinc-500">JKK 1</div>

                  <div className="mt-1 text-xl font-semibold text-zinc-900">
                    {branch1Count}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="text-xs text-zinc-500">JKK 2</div>

                  <div className="mt-1 text-xl font-semibold text-zinc-900">
                    {branch2Count}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="text-xs text-zinc-500">Total Data</div>

                  <div className="mt-1 text-xl font-semibold text-zinc-900">
                    {totalCount}
                  </div>
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50">
                      <th className="whitespace-nowrap border-b border-zinc-200 px-3 py-3 text-center font-semibold text-zinc-700">
                        No.
                      </th>

                      {DISPLAY_COLUMNS.map((column) => (
                        <th
                          key={column.excel}
                          className="whitespace-nowrap border-b border-zinc-200 px-3 py-3 text-left font-semibold text-zinc-700"
                        >
                          {column.header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row, rowIndex) => (
                      <tr
                        key={`${getBranch(row)}-${rowIndex}`}
                        className="bg-white"
                      >
                        <td className="whitespace-nowrap border-b border-zinc-100 px-3 py-2 text-center font-medium text-zinc-700">
                          {rowIndex + 1}
                        </td>

                        {DISPLAY_COLUMNS.map((column) => (
                          <td
                            key={column.excel}
                            className="whitespace-nowrap border-b border-zinc-100 px-3 py-2 text-zinc-700"
                          >
                            {formatCell(row?.[column.index], column.excel)}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {!filteredRows.length && (
                      <tr>
                        <td
                          colSpan={DISPLAY_COLUMNS.length + 1}
                          className="px-4 py-12 text-center text-sm text-zinc-500"
                        >
                          Tidak ditemukan data untuk Jambi Kuamang Kuning 1 atau
                          2.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3">
          <div className="text-xs text-zinc-500">
            Header: 1 | Data ditemukan:{" "}
            <strong className="text-zinc-800">{totalCount}</strong> | JKK 1:{" "}
            <strong className="text-zinc-800">{branch1Count}</strong> | JKK 2:{" "}
            <strong className="text-zinc-800">{branch2Count}</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
