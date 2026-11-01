/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { EXCEL_ENGINE_URL } from "@/lib/excel-engine";
import { supabase } from "@/lib/supabase";

import {
  Download,
  Loader2,
  MessageCircle,
  X,
  Save,
  CheckCircle2,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";

const BRANCH_1 = "Jambi Kuamang Kuning 1";
const BRANCH_2 = "Jambi Kuamang Kuning 2";

const DISPLAY_COLUMNS = [
  { excel: "F", index: 5, header: "acctno" },
  { excel: "Z", index: 25, header: "AGF1" },
  { excel: "G", index: 6, header: "nama" },
  { excel: "Y", index: 24, header: "total_tgg" },
  { excel: "D", index: 3, header: "mbu" },
  { excel: "AE", index: 30, header: "nama_mks" },
];

function normalize(value) {
  if (value === null || value === undefined) return "";

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

  if (typeof value === "number") return value;

  let text = String(value).trim();

  if (!text) return null;

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

  if (number === null) return "";

  const rounded = Math.ceil(number / 1000) * 1000;

  return rounded.toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  });
}

function getYNumber(value) {
  const number = parseNumber(value);

  if (number === null) return "";

  return Math.ceil(number / 1000) * 1000;
}

function formatCell(value, excelColumn) {
  if (value === null || value === undefined) return "";

  if (excelColumn === "F") return String(value);

  if (excelColumn === "Y") return formatY(value);

  return String(value);
}

function getBranch(row) {
  if (!Array.isArray(row)) return "";

  const mbu = normalize(row[3]);

  if (mbu === normalize(BRANCH_1)) return BRANCH_1;

  if (mbu === normalize(BRANCH_2)) return BRANCH_2;

  return "";
}

function isBranch1(row) {
  return getBranch(row) === BRANCH_1;
}

function isBranch2(row) {
  return getBranch(row) === BRANCH_2;
}

function findHeaderRowIndex(rows) {
  if (!Array.isArray(rows)) return -1;

  const requiredHeaders = ["acctno", "nama", "total_tgg", "agf1"];

  let bestIndex = -1;
  let bestScore = 0;

  rows.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) return;

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

function getJakartaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * EXPORT EXCEL
 */
function buildExcelFile(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("Data Easy Call tidak valid.");
  }

  const excelRows = rows.map((row, index) => [
    index + 1,
    String(row?.[5] ?? ""),
    String(row?.[25] ?? ""),
    String(row?.[6] ?? ""),
    getYNumber(row?.[24]),
    String(row?.[3] ?? ""),
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

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelRows]);

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

  const arrayBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export default function EasyCallModal({ open, onClose, file }) {
  const router = useRouter();

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

  // STATE PENYIMPANAN SUPABASE
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

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
    if (!open) return;

    setRows([]);
    setLoading(false);
    setError("");
    setCreatedSheet("");
    setTargetCell("");
    setRange("");
    setProcessed(false);
    setExporting(false);
    setSharing(false);
    setSaving(false);
    setSaveMessage("");
  }, [open]);

  const headerRowIndex = useMemo(() => {
    return findHeaderRowIndex(rows);
  }, [rows]);

  const dataRows = useMemo(() => {
    if (headerRowIndex < 0) return [];

    return rows.slice(headerRowIndex + 1);
  }, [rows, headerRowIndex]);

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
   * PROSES EASY CALL
   */
  async function handleProcess() {
    if (!file) {
      setError("File Excel belum tersedia.");
      return;
    }

    setLoading(true);
    setError("");
    setSaveMessage("");
    setProcessed(false);
    setRows([]);

    try {
      const formData = new FormData();

      formData.append("file", file, file.name);

      const baseUrl = EXCEL_ENGINE_URL.replace(/\/+$/, "");

      const response = await fetch(`${baseUrl}/run-josjis`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.detail ||
            payload?.message ||
            payload?.error ||
            `Engine gagal memproses file (HTTP ${response.status}).`,
        );
      }

      const result = payload?.result ?? payload;

      if (payload?.status === "error" || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            payload?.message ||
            "Proses Easy Call gagal.",
        );
      }

      const resultRows = Array.isArray(result?.data) ? result.data : [];

      if (resultRows.length === 0) {
        throw new Error(
          "Engine berhasil merespons, tetapi data Easy Call kosong.",
        );
      }

      console.log("========== EASY CALL RESULT ==========");
      console.log("Total rows dari engine:", resultRows.length);
      console.log("Header index:", result.headerRowIndex);
      console.log("Header Excel row:", result.headerExcelRow);
      console.log("Data row count engine:", result.dataRowCount);
      console.log("JKK 1 dari engine:", result.jkk1Count);
      console.log("JKK 2 dari engine:", result.jkk2Count);
      console.log("======================================");

      setRows(resultRows);
      setCreatedSheet(result.createdSheet || "");
      setTargetCell(result.targetCell || "");
      setRange(result.range || "");
      setProcessed(true);
    } catch (processError) {
      console.error("Easy Call error:", processError);

      setError(
        processError?.message ||
          "Proses Easy Call gagal. Periksa koneksi ke Josjis Engine.",
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * SIMPAN EASY CALL KE SUPABASE
   *
   * Tabel: raportmu_hasil
   * jenis_data: EASYCALL
   * Pengelompokan: unit + MKS
   */
  async function handleSaveEasyCall() {
    if (!processed || !filteredRows.length) {
      setError("Tidak ada data Easy Call untuk disimpan.");
      return;
    }

    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      // Ambil unit JKK 1 dan JKK 2.
      const { data: units, error: unitError } = await supabase
        .from("unit")
        .select("id, nama_unit")
        .in("nama_unit", [BRANCH_1, BRANCH_2]);

      if (unitError) throw unitError;

      const unitMap = new Map(
        (units || []).map((unit) => [normalize(unit.nama_unit), unit]),
      );

      const unit1 = unitMap.get(normalize(BRANCH_1));
      const unit2 = unitMap.get(normalize(BRANCH_2));

      if (!unit1 || !unit2) {
        throw new Error("Data unit JKK 1 atau JKK 2 tidak ditemukan.");
      }

      // Ambil pegawai aktif dari kedua unit.
      const { data: pegawai, error: pegawaiError } = await supabase
        .from("pegawai")
        .select("id, nama, unit_id")
        .eq("aktif", true)
        .in("unit_id", [unit1.id, unit2.id]);

      if (pegawaiError) throw pegawaiError;

      const pegawaiIds = (pegawai || []).map((item) => item.id);

      if (!pegawaiIds.length) {
        throw new Error("Data pegawai aktif tidak ditemukan.");
      }

      // Ambil relasi MKS.
      const { data: mksData, error: mksError } = await supabase
        .from("mks")
        .select("id, pegawai_id")
        .in("pegawai_id", pegawaiIds);

      if (mksError) throw mksError;

      const pegawaiMap = new Map(
        (pegawai || []).map((item) => [item.id, item]),
      );

      const mksMap = new Map();

      (mksData || []).forEach((item) => {
        const person = pegawaiMap.get(item.pegawai_id);

        if (!person) return;

        const key = `${person.unit_id}|${normalize(person.nama)}`;

        mksMap.set(key, {
          id: item.id,
          unit_id: person.unit_id,
          nama: person.nama,
        });
      });

      // Kelompokkan data berdasarkan unit dan nama MKS.
      const grouped = new Map();

      filteredRows.forEach((row) => {
        const branch = getBranch(row);

        const unit =
          branch === BRANCH_1 ? unit1 : branch === BRANCH_2 ? unit2 : null;

        const namaMks = String(row?.[30] ?? "").trim();

        if (!unit) {
          throw new Error("Ada baris data dengan unit yang tidak dikenali.");
        }

        if (!namaMks) {
          throw new Error(
            "Ada data Easy Call yang tidak memiliki nama MKS pada kolom AE.",
          );
        }

        const key = `${unit.id}|${normalize(namaMks)}`;
        const mks = mksMap.get(key);

        if (!mks) {
          throw new Error(
            `MKS "${namaMks}" tidak ditemukan pada unit ${branch}. Periksa kolom AE.`,
          );
        }

        if (!grouped.has(mks.id)) {
          grouped.set(mks.id, {
            unit_id: unit.id,
            mks_id: mks.id,
            data: [],
          });
        }

        grouped.get(mks.id).data.push(row);
      });

      if (!grouped.size) {
        throw new Error("Tidak ada kelompok data Easy Call yang valid.");
      }

      const tanggalData = getJakartaDate();

      const payload = Array.from(grouped.values()).map((item) => ({
        unit_id: item.unit_id,
        mks_id: item.mks_id,
        jenis_data: "EASYCALL",
        tanggal_data: tanggalData,
        data: item.data,
        total_rows: item.data.length,
        saved_by: user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error: saveError } = await supabase
        .from("raportmu_hasil")
        .upsert(payload, {
          onConflict: "mks_id,jenis_data",
        });

      if (saveError) throw saveError;

      // Beri tahu halaman RaportMU untuk memuat ulang data.
      window.dispatchEvent(new Event("raportmu-data-updated"));

      setSaveMessage(
        `Berhasil menyimpan ${filteredRows.length} data Easy Call dari ${grouped.size} MKS.`,
      );
    } catch (saveError) {
      console.error("Simpan Easy Call gagal:", saveError);

      setError(saveError?.message || "Data Easy Call gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * PROSES ADVIS
   */
  function handleProcessAdvis() {
    setError("");

    if (!processed) {
      setError("Proses Easy Call terlebih dahulu.");
      return;
    }

    if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
      setError("Tidak ada data Easy Call untuk dibuatkan Advis.");
      return;
    }

    try {
      const advisData = filteredRows
        .map((row, index) => ({
          id: `${String(row?.[5] ?? "").trim()}-${index}`,
          acctno: String(row?.[5] ?? "").trim(),
          norekPinjaman: String(row?.[5] ?? "").trim(),
          norekTabungan: String(row?.[25] ?? "").trim(),
          agf1: String(row?.[25] ?? "").trim(),
          nama: String(row?.[6] ?? "").trim(),
          total_tgg: getYNumber(row?.[24]),
          mbu: getBranch(row),
          nama_mks: String(row?.[30] ?? "").trim(),
        }))
        .filter(
          (item) =>
            item.nama &&
            item.norekPinjaman &&
            (item.mbu === BRANCH_1 || item.mbu === BRANCH_2),
        );

      if (!advisData.length) {
        setError("Tidak ada data Advis yang valid.");
        return;
      }

      sessionStorage.setItem(
        "raportmu_advis_easycoll_source",
        JSON.stringify(advisData),
      );

      router.push("/admin/advis/easycoll");
    } catch (processError) {
      console.error("Gagal menyiapkan data Advis:", processError);

      setError(
        "Data Advis gagal disiapkan. Periksa penyimpanan browser dan coba kembali.",
      );
    }
  }

  /**
   * DOWNLOAD EXCEL
   */
  function handleDownloadExcel() {
    if (!filteredRows.length) {
      setError("Tidak ada data Easy Call yang dapat diexport.");
      return;
    }

    setExporting(true);
    setError("");

    try {
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
   * SHARE WHATSAPP
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
      if (shareError?.name === "AbortError") return;

      console.error("Share WhatsApp error:", shareError);

      setError(shareError?.message || "File Excel gagal dibagikan.");
    } finally {
      setSharing(false);
    }
  }

  if (!open) return null;

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
            disabled={loading || saving}
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
                onClick={handleSaveEasyCall}
                disabled={
                  saving || exporting || sharing || !filteredRows.length
                }
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Data Easy Call
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={
                  exporting || sharing || saving || !filteredRows.length
                }
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Unduh Excel
              </button>

              <button
                type="button"
                onClick={handleProcessAdvis}
                disabled={
                  !filteredRows.length || exporting || sharing || saving
                }
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proses Advis
              </button>

              {isMobile && (
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  disabled={
                    exporting || sharing || saving || !filteredRows.length
                  }
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

        {/* PESAN SIMPAN BERHASIL */}
        {saveMessage && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {saveMessage}
          </div>
        )}

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
            <strong className="text-zinc-800">{totalCount}</strong>
            {" | "}JKK 1:{" "}
            <strong className="text-zinc-800">{branch1Count}</strong>
            {" | "}JKK 2:{" "}
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
