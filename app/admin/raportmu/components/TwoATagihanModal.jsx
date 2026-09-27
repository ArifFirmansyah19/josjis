/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Check, ChevronDown, Loader2, MessageCircle, X } from "lucide-react";
import { EXCEL_ENGINE_URL } from "@/lib/excel-engine";
import html2canvas from "html2canvas";

const DISPLAY_COLUMNS = [
  { excel: "F", index: 5, label: "acctno" },
  { excel: "G", index: 6, label: "nama" },
  { excel: "H", index: 7, label: "limit" },
  { excel: "I", index: 8, label: "bade" },
  { excel: "O", index: 14, label: "produk" },
  { excel: "T", index: 19, label: "angsuran" },
  { excel: "Y", index: 24, label: "total_tgg" },
  { excel: "Z", index: 25, label: "AGF1" },
  { excel: "AA", index: 26, label: "Saldo_AGF1" },
  { excel: "AB", index: 27, label: "Kecukupan_Saldo" },
  { excel: "AC", index: 28, label: "Easy_Coll" },
  { excel: "AE", index: 30, label: "nama_mks" },
];

const SGP_COLUMN_INDEX = 30;
const EASY_COLUMN_INDEX = 28;

/**
 * Data mulai dari baris ke-4 Excel = index 3.
 */
const DATA_START_ROW_INDEX = 3;

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(number);
}

/**
 * Khusus I:
 *
 * 125.53065167
 * menjadi
 * 125.53
 */
function formatDecimalI(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return number.toFixed(2);
}

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(number);
}

/**
 * Aturan khusus kolom Y belum diubah.
 * Untuk sementara hanya menampilkan nominal
 * dalam format Indonesia.
 */
function formatY(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(number);
}

function formatCell(column, value) {
  if (value === null || value === undefined) {
    return "";
  }

  /**
   * F dan Z adalah nomor rekening.
   *
   * Jangan diformat menggunakan Intl.NumberFormat
   * karena bisa mengubah tampilan nomor rekening.
   */
  if (column.excel === "F" || column.excel === "Z") {
    return String(value);
  }

  if (column.excel === "I") {
    return formatDecimalI(value);
  }

  if (column.excel === "T" || column.excel === "AA") {
    return formatRupiah(value);
  }

  if (column.excel === "Y") {
    return formatY(value);
  }

  return String(value);
}

function isEasyRow(row) {
  const value = normalize(row?.[EASY_COLUMN_INDEX]);

  return value.includes("easy 50k") || value.includes("easy 200k");
}

function getUniqueSgp(rows) {
  const values = [];

  for (const row of rows) {
    const value = String(row?.[SGP_COLUMN_INDEX] ?? "").trim();

    if (!value) {
      continue;
    }

    if (!values.some((item) => normalize(item) === normalize(value))) {
      values.push(value);
    }
  }

  return values;
}

function getRowKey(row, index) {
  const values = DISPLAY_COLUMNS.map((column) => row?.[column.index]);

  return `${index}-${JSON.stringify(values)}`;
}

export default function TwoATagihanModal({ open, onClose, file }) {
  const captureRef = useRef(null);

  const [unit, setUnit] = useState("JKK 1");
  const [rows, setRows] = useState([]);
  const [sourceSheet, setSourceSheet] = useState("");
  const [createdSheet, setCreatedSheet] = useState("");
  const [targetCell, setTargetCell] = useState("");
  const [selectedSgp, setSelectedSgp] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setRows([]);
    setSourceSheet("");
    setCreatedSheet("");
    setTargetCell("");
    setSelectedSgp("ALL");
    setError("");
  }, [open]);

  /**
   * Data sebenarnya dimulai dari baris ke-4.
   */
  const dataRows = useMemo(() => {
    if (!rows || rows.length <= DATA_START_ROW_INDEX) {
      return [];
    }

    return rows.slice(DATA_START_ROW_INDEX);
  }, [rows]);

  const sgpOptions = useMemo(() => {
    return getUniqueSgp(dataRows);
  }, [dataRows]);

  const filteredRows = useMemo(() => {
    if (selectedSgp === "ALL") {
      return dataRows;
    }

    return dataRows.filter((row) => {
      return normalize(row?.[SGP_COLUMN_INDEX]) === normalize(selectedSgp);
    });
  }, [dataRows, selectedSgp]);

  async function handleProcess() {
    if (!file) {
      setError(
        "File Excel belum tersedia. Upload Excel terlebih dahulu di halaman RaportMU.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setRows([]);

    try {
      const buffer = await file.arrayBuffer();

      let binary = "";

      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;

      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const chunk = bytes.subarray(
          offset,
          Math.min(offset + chunkSize, bytes.length),
        );

        binary += String.fromCharCode(...chunk);
      }

      const base64 = btoa(binary);

      const response = await fetch(`${EXCEL_ENGINE_URL}/raportmu/port-unit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          unit:
            unit === "JKK 1"
              ? "Jambi Kuamang Kuning 1"
              : "Jambi Kuamang Kuning 2",
          file: base64,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.error || "Excel Engine gagal memproses data.");
      }

      const resultRows = result.data || [];

      setRows(resultRows);
      setSourceSheet(result.sourceSheet || "");
      setCreatedSheet(result.createdSheet || "");
      setTargetCell(result.targetCell || "");

      const detectedSgp = getUniqueSgp(resultRows.slice(DATA_START_ROW_INDEX));

      if (detectedSgp.length > 0) {
        setSelectedSgp(detectedSgp[0]);
      } else {
        setSelectedSgp("ALL");
      }
    } catch (processingError) {
      console.error("Gagal memproses 2A:", processingError);

      setError(processingError?.message || "Data 2A gagal diproses.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWhatsApp() {
    if (!captureRef.current) {
      setError("Area laporan belum tersedia.");
      return;
    }

    if (filteredRows.length === 0) {
      setError("Tidak ada data untuk SGP yang dipilih.");
      return;
    }

    setCapturing(true);
    setError("");

    try {
      /**
       * Capture hanya area laporan.
       *
       * Screenshot dibuat sederhana:
       * - background putih
       * - teks hitam
       * - border abu-abu
       * - tanpa warna kuning
       * - tanpa shadow
       * - tanpa filter
       *
       * Tampilan asli popup tidak berubah.
       */
      const originalConsoleWarn = console.warn;

      console.warn = (...args) => {
        const message = args.map((item) => String(item)).join(" ");

        if (
          message.includes(
            'Attempting to parse an unsupported color function "lab"',
          ) ||
          message.includes(
            "Attempting to parse an unsupported color function 'lab'",
          )
        ) {
          return;
        }

        originalConsoleWarn(...args);
      };

      let canvas;

      try {
        canvas = await html2canvas(captureRef.current, {
          backgroundColor: "#ffffff",
          scale: Math.min(window.devicePixelRatio || 2, 2),
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 15000,

          onclone: (clonedDocument) => {
            /**
             * Paksa seluruh hasil capture menjadi
             * warna sederhana agar html2canvas
             * tidak perlu menangani warna modern
             * seperti lab().
             */
            const style = clonedDocument.createElement("style");

            style.textContent = `
              * {
                color: #000000 !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
                border-color: #cccccc !important;
                box-shadow: none !important;
                text-shadow: none !important;
                filter: none !important;
                outline: none !important;
              }

              html,
              body {
                background: #ffffff !important;
                color: #000000 !important;
              }

              table {
                background: #ffffff !important;
                border-collapse: collapse !important;
              }

              thead,
              tbody,
              tr,
              th,
              td {
                background: #ffffff !important;
                color: #000000 !important;
                border-color: #cccccc !important;
              }

              svg {
                color: #000000 !important;
                background: transparent !important;
              }
            `;

            clonedDocument.head.appendChild(style);
          },
        });
      } finally {
        console.warn = originalConsoleWarn;
      }

      /**
       * Convert canvas menjadi PNG Blob.
       */
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result && result.size > 0) {
              resolve(result);
            } else {
              reject(new Error("Screenshot laporan gagal dibuat."));
            }
          },
          "image/png",
          1,
        );
      });

      /**
       * Nama file aman untuk Android/iPhone.
       */
      const safeSgp =
        selectedSgp === "ALL"
          ? "Semua-SGP"
          : String(selectedSgp)
              .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
              .replace(/\s+/g, "-")
              .slice(0, 80);

      const fileName = `2A-Tagihan-${safeSgp}.png`;

      /**
       * Buat File asli.
       *
       * Ini penting agar Web Share API mengenali
       * screenshot sebagai attachment/file.
       */
      const imageFile = new File([blob], fileName, {
        type: "image/png",
        lastModified: Date.now(),
      });

      /**
       * ======================================================
       * PRIORITAS 1
       * Native Web Share + File
       * ======================================================
       *
       * Android/iPhone yang mendukung:
       *
       * JOSJIS
       *   ↓
       * Native Share
       *   ↓
       * WhatsApp
       *   ↓
       * Pilih kontak/grup
       *   ↓
       * Screenshot ikut sebagai attachment
       */
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        let canShareFile = true;

        if (typeof navigator.canShare === "function") {
          try {
            canShareFile = navigator.canShare({
              files: [imageFile],
            });
          } catch (canShareError) {
            console.warn("navigator.canShare gagal:", canShareError);

            /**
             * Jangan langsung fallback.
             *
             * Beberapa browser memiliki navigator.share()
             * tetapi implementasi canShare() tidak sempurna.
             *
             * Tetap coba share.
             */
            canShareFile = true;
          }
        }

        if (canShareFile) {
          try {
            await navigator.share({
              title: `2A Tagihan - ${
                selectedSgp === "ALL" ? "Semua SGP" : selectedSgp
              }`,
              text: `${unit} • ${
                selectedSgp === "ALL" ? "Semua SGP" : selectedSgp
              }`,
              files: [imageFile],
            });

            /**
             * Berhasil masuk ke Share Sheet.
             * Tidak perlu membuka wa.me.
             */
            return;
          } catch (shareError) {
            /**
             * User menutup Share Sheet.
             * Ini bukan error.
             */
            if (shareError?.name === "AbortError") {
              return;
            }

            console.warn("Native file share gagal:", shareError);
          }
        }
      }

      /**
       * ======================================================
       * PRIORITAS 2
       * Fallback seperti Laporan Booking lama.
       * ======================================================
       *
       * Ini memungkinkan HP/laptop yang tidak mendukung
       * file sharing tetap membuka WhatsApp melalui wa.me.
       *
       * Catatan:
       * Screenshot tidak dapat dilampirkan melalui wa.me.
       *
       * Jadi fallback ini hanya mengirim pesan teks.
       */
      const message = [
        "*2A / TAGIHAN*",
        "",
        `*Unit:* ${unit}`,
        `*SGP:* ${selectedSgp === "ALL" ? "Semua SGP" : selectedSgp}`,
        `*Jumlah Data:* ${filteredRows.length} baris`,
      ].join("\n");

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");

      setError(
        "Browser tidak mendukung pengiriman screenshot langsung. WhatsApp dibuka tanpa gambar.",
      );
    } catch (shareError) {
      console.error("Gagal membuat atau mengirim capture:", shareError);

      if (shareError?.name === "AbortError") {
        return;
      }

      setError(
        shareError?.message ||
          "Screenshot gagal dibuat atau dikirim ke WhatsApp.",
      );
    } finally {
      setCapturing(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div className="flex max-h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header Popup */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              2A / Tagihan
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Proses data 2A berdasarkan unit dan Nama SGP.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Control */}
        <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              {/* Unit */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                  Unit
                </label>

                <div className="flex rounded-xl border border-zinc-200 bg-white p-1">
                  {[
                    {
                      value: "JKK 1",
                      label: "JKK 1",
                    },
                    {
                      value: "JKK 2",
                      label: "JKK 2",
                    },
                  ].map((item) => {
                    const active = unit === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setUnit(item.value)}
                        className={[
                          "rounded-lg px-4 py-2 text-sm font-medium transition",
                          active
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-600 hover:bg-zinc-100",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Process */}
              <button
                type="button"
                onClick={handleProcess}
                disabled={loading || !file}
                className="flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses Excel...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Proses 2A
                  </>
                )}
              </button>
            </div>

            {/* SGP + WhatsApp */}
            {dataRows.length > 0 && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px]">
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                    Nama SGP
                  </label>

                  <div className="relative">
                    <select
                      value={selectedSgp}
                      onChange={(event) => setSelectedSgp(event.target.value)}
                      className="h-10 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 pr-9 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                    >
                      <option value="ALL">Semua SGP</option>

                      {sgpOptions.map((sgp) => (
                        <option key={sgp} value={sgp}>
                          {sgp}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleWhatsApp}
                  disabled={capturing || filteredRows.length === 0}
                  className="flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {capturing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Membuat Screenshot...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4" />
                      Kirim WhatsApp
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {dataRows.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
              <span>
                Sumber:{" "}
                <strong className="text-zinc-700">{sourceSheet || "-"}</strong>
              </span>

              <span>
                Detail:{" "}
                <strong className="text-zinc-700">{createdSheet || "-"}</strong>
              </span>

              <span>
                Target:{" "}
                <strong className="text-zinc-700">{targetCell || "-"}</strong>
              </span>

              <span>
                Menampilkan:{" "}
                <strong className="text-zinc-700">{filteredRows.length}</strong>{" "}
                dari{" "}
                <strong className="text-zinc-700">{dataRows.length}</strong>{" "}
                baris
              </span>
            </div>
          )}
        </div>

        {/* Laporan yang dicapture */}
        <div className="min-h-0 flex-1 overflow-auto bg-white p-4 sm:p-5">
          {!loading && dataRows.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
                  <Check className="h-5 w-5 text-zinc-400" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-zinc-900">
                  Belum ada data 2A
                </h3>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Pilih JKK 1 atau JKK 2, kemudian klik Proses 2A.
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Excel sedang diproses...
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center text-sm text-zinc-500">
              Tidak ada data untuk Nama SGP yang dipilih.
            </div>
          ) : (
            /**
             * Area screenshot.
             *
             * Tidak ada kontrol popup,
             * filter, tombol WhatsApp, dsb.
             *
             * Jadi hasil screenshot hanya
             * laporan tabel.
             */
            <div
              ref={captureRef}
              className="inline-block min-w-full bg-white p-3"
            >
              <div className="mb-3 flex items-center justify-between border-b border-zinc-200 pb-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">
                    2A / Tagihan
                  </div>

                  <div className="mt-0.5 text-xs text-zinc-500">
                    {unit} • {selectedSgp === "ALL" ? "Semua SGP" : selectedSgp}
                  </div>
                </div>

                <div className="text-xs text-zinc-500">
                  {filteredRows.length} baris
                </div>
              </div>

              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-100">
                    {DISPLAY_COLUMNS.map((column) => (
                      <th
                        key={column.excel}
                        className="whitespace-nowrap border border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-700"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row, rowIndex) => {
                    const easy = isEasyRow(row);

                    return (
                      <tr key={getRowKey(row, rowIndex)} className="bg-white">
                        {DISPLAY_COLUMNS.map((column) => (
                          <td
                            key={column.excel}
                            className="whitespace-nowrap border border-zinc-200 px-3 py-2 text-zinc-700"
                          >
                            {formatCell(column, row?.[column.index])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer popup */}
        <div className="flex shrink-0 items-center justify-between border-t border-zinc-200 bg-white px-5 py-3">
          <p className="text-xs text-zinc-400">
            Nama SGP diambil dari kolom AE.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
