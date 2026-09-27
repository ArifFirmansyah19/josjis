/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CheckCircle2,
  Download,
  Loader2,
  Play,
  RefreshCw,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

const ENGINE_URL = "http://127.0.0.1:8765";

const BRANCHES = ["Jambi Kuamang Kuning 1", "Jambi Kuamang Kuning 2"];

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value ?? "");
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(number);
}

function formatBookingCell(value, column) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  /*
   * acctno
   *
   * Contoh:
   * 1100020317035
   *
   * Tidak menggunakan format ribuan.
   */
  if (column === "F") {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return String(Math.trunc(number));
    }

    return String(value);
  }

  /*
   * AGF1
   *
   * Contoh:
   * 1100020317035
   *
   * Tidak menggunakan format ribuan.
   */
  if (column === "Z") {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return String(Math.trunc(number));
    }

    return String(value);
  }

  /*
   * angsuran
   *
   * Contoh:
   * 4500000
   *
   * menjadi:
   * 4.500.000
   */
  if (column === "T") {
    return formatNumber(value);
  }

  /*
   * Kolom lain dibiarkan sebagaimana nilai
   * yang diterima dari Excel.
   */
  return String(value);
}

function getNameOptions(options, branch) {
  if (!options?.branches) {
    return [];
  }

  const selectedBranch = Object.keys(options.branches).find(
    (item) => normalize(item) === normalize(branch),
  );

  if (!selectedBranch) {
    return [];
  }

  return options.branches[selectedBranch] || [];
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();

  let binary = "";

  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(
      index,
      Math.min(index + chunkSize, bytes.length),
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export default function BookingModal({ open, onClose, file }) {
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [options, setOptions] = useState(null);

  const [branch, setBranch] = useState("");
  const [name, setName] = useState("");

  const [productFilter, setProductFilter] = useState("ALL");

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const names = useMemo(
    () => getNameOptions(options, branch),
    [options, branch],
  );

  /*
   * Data yang ditampilkan di tabel.
   *
   * result.data tetap berisi data hasil dari Excel Engine.
   * Filter produk hanya bekerja pada tampilan.
   */
  const filteredRows = useMemo(() => {
    if (!result?.data) {
      return [];
    }

    if (productFilter === "ALL") {
      return result.data;
    }

    const productColumnIndex = result.columnLetters?.indexOf("O");

    if (productColumnIndex === undefined || productColumnIndex === -1) {
      return result.data;
    }

    return result.data.filter((row) => {
      const product = normalize(row[productColumnIndex]);

      return product === normalize(productFilter);
    });
  }, [result, productFilter]);

  /*
   * Produk yang benar-benar tersedia
   * pada hasil Excel.
   */
  const availableProducts = useMemo(() => {
    if (!result?.data) {
      return [];
    }

    const productColumnIndex = result.columnLetters?.indexOf("O");

    if (productColumnIndex === undefined || productColumnIndex === -1) {
      return [];
    }

    const products = new Set();

    result.data.forEach((row) => {
      const value = String(row[productColumnIndex] ?? "").trim();

      if (value) {
        products.add(value);
      }
    });

    return Array.from(products).sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [result]);

  useEffect(() => {
    if (!open || !file) {
      return;
    }

    setBranch("");
    setName("");
    setProductFilter("ALL");
    setResult(null);
    setError("");

    loadOptions();
  }, [open, file]);

  useEffect(() => {
    setName("");
  }, [branch]);

  useEffect(() => {
    /*
     * Setelah hasil baru selesai diproses,
     * selalu tampilkan Semua Produk terlebih dahulu.
     */
    setProductFilter("ALL");
  }, [result]);

  async function loadOptions() {
    if (!file) {
      return;
    }

    setLoadingOptions(true);
    setError("");
    setOptions(null);

    try {
      const encodedFile = await fileToBase64(file);

      const response = await fetch(`${ENGINE_URL}/raportmu/booking/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          file: encodedFile,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error || "Pilihan Booking gagal dimuat.");
      }

      setOptions(data);
    } catch (err) {
      console.error("Gagal mengambil pilihan Booking:", err);

      setError(
        err?.message || "Gagal mengambil data Booking dari Excel Engine.",
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  async function handleProcess() {
    if (!file) {
      setError("File Excel RaportMU belum tersedia.");
      return;
    }

    if (!branch) {
      setError("Silakan pilih unit JKK terlebih dahulu.");
      return;
    }

    if (!name) {
      setError("Silakan pilih Nama SGP terlebih dahulu.");
      return;
    }

    setProcessing(true);
    setError("");
    setResult(null);
    setProductFilter("ALL");

    try {
      const encodedFile = await fileToBase64(file);

      const response = await fetch(`${ENGINE_URL}/raportmu/booking/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          file: encodedFile,
          branch,
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error || "Proses Booking gagal.");
      }

      setResult(data);
    } catch (err) {
      console.error("Gagal memproses Booking:", err);

      setError(err?.message || "Proses Booking gagal dijalankan.");
    } finally {
      setProcessing(false);
    }
  }

  /*
   * EXPORT EXCEL
   *
   * HANYA kolom yang tampil di tabel.
   *
   * Urutan:
   * No.
   * acctno
   * nama
   * limit
   * produk
   * tglcair
   * tgl_jt_angs
   * angsuran
   * AGF1
   * nama_mks
   * CIF
   * Tenor
   * App No
   * alamat
   *
   * Jika filter KUM/KUR dipilih,
   * hanya data yang sedang tampil yang diexport.
   */
  function handleDownload() {
    if (!result?.data?.length) {
      return;
    }

    if (!result?.displayColumns?.length) {
      return;
    }

    /*
     * Cari index setiap kolom berdasarkan
     * huruf kolom Excel.
     */
    const displayColumnIndexes = result.displayColumns.map((column) =>
      result.columnLetters.indexOf(column.column),
    );

    /*
     * Header Excel hanya mengikuti tabel.
     */
    const headers = [
      "No.",
      ...result.displayColumns.map((column) => column.header),
    ];

    /*
     * Data Excel hanya mengikuti filteredRows,
     * bukan seluruh 60 kolom dan bukan result.data.
     */
    const rows = filteredRows.map((row, rowIndex) => {
      const values = displayColumnIndexes.map((columnIndex, displayIndex) => {
        const column = result.displayColumns[displayIndex];

        return formatBookingCell(row[columnIndex], column.column);
      });

      return [rowIndex + 1, ...values];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    /*
     * Supaya kolom No. dan data tidak terlalu sempit.
     */
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 28 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 16 },
      { wch: 15 },
      { wch: 16 },
      { wch: 28 },
      { wch: 18 },
      { wch: 12 },
      { wch: 10 },
      { wch: 18 },
      { wch: 35 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Booking");

    const safeName = String(result.name || name || "SGP")
      .replace(/[\\/:*?"<>|]/g, "")
      .trim();

    const safeBranch = String(result.branch || branch || "JKK")
      .replace(/[\\/:*?"<>|]/g, "")
      .trim();

    const safeProduct =
      productFilter === "ALL"
        ? "Semua_Produk"
        : String(productFilter)
            .replace(/[\\/:*?"<>|]/g, "")
            .trim();

    XLSX.writeFile(
      workbook,
      `Booking_${safeBranch}_${safeName}_${safeProduct}.xlsx`,
    );
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Booking</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Pilih unit dan Nama SGP untuk memproses data Booking.
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

        {/* CONTENT */}
        <div className="overflow-y-auto p-5">
          {/* PILIHAN BOOKING */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Unit
              </label>

              <select
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                disabled={loadingOptions || processing}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:bg-zinc-50"
              >
                <option value="">Pilih Unit</option>

                {BRANCHES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Nama SGP
              </label>

              <select
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={!branch || loadingOptions || processing}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:bg-zinc-50"
              >
                <option value="">
                  {branch ? "Pilih Nama SGP" : "Pilih Unit terlebih dahulu"}
                </option>

                {names.map((item) => (
                  <option key={`${item.row}-${item.name}`} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* LOADING */}
          {loadingOptions && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Membaca pilihan Booking dari Excel...
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* EMPTY NAME */}
          {!loadingOptions && options && branch && names.length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Tidak ada Nama SGP untuk unit yang dipilih.
            </div>
          )}

          {/* ACTION */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleProcess}
              disabled={processing || loadingOptions || !branch || !name}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Proses Booking
                </>
              )}
            </button>

            <button
              type="button"
              onClick={loadOptions}
              disabled={loadingOptions || processing || !file}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingOptions ? "animate-spin" : ""}`}
              />
              Muat Ulang
            </button>
          </div>

          {/* HASIL */}
          {result && (
            <div className="mt-6 space-y-4">
              {/* SUCCESS */}
              <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                  <div>
                    <p className="font-semibold text-emerald-900">
                      Booking berhasil diproses
                    </p>

                    <p className="mt-1 text-sm text-emerald-700">
                      {result.branch} — {result.name}
                    </p>

                    <p className="mt-1 text-xs text-emerald-600">
                      Sheet hasil: {result.createdSheet}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!filteredRows.length}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Unduh Excel
                </button>
              </div>

              {/* TOTAL */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Total KUM
                  </p>

                  <p className="mt-2 text-2xl font-bold text-zinc-900">
                    Rp {formatNumber(result.totals?.kum)}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Total KUR
                  </p>

                  <p className="mt-2 text-2xl font-bold text-zinc-900">
                    Rp {formatNumber(result.totals?.kur)}
                  </p>
                </div>
              </div>

              {/* FILTER PRODUK */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Produk
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Filter data berdasarkan kolom produk pada hasil Booking.
                    </p>
                  </div>

                  <select
                    value={productFilter}
                    onChange={(event) => setProductFilter(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 sm:w-56"
                  >
                    <option value="ALL">Semua Produk</option>

                    {availableProducts.map((product) => (
                      <option key={product} value={product}>
                        {product}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Hasil Booking
                    </h3>

                    <p className="mt-1 text-xs text-zinc-500">
                      Menampilkan {filteredRows.length} dari{" "}
                      {result.data?.length || 0} data
                    </p>
                  </div>
                </div>

                <div className="max-h-[420px] overflow-auto">
                  <table className="min-w-max text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-zinc-100">
                      <tr>
                        {/* NO. */}
                        <th className="whitespace-nowrap border-b border-zinc-200 px-4 py-3 font-semibold text-zinc-700">
                          No.
                        </th>

                        {result.displayColumns?.map((column) => (
                          <th
                            key={column.column}
                            className="whitespace-nowrap border-b border-zinc-200 px-4 py-3 font-semibold text-zinc-700"
                          >
                            {column.header}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((row, rowIndex) => {
                        const rowByColumn = {};

                        result.columnLetters?.forEach(
                          (columnLetter, columnIndex) => {
                            rowByColumn[columnLetter] = row[columnIndex];
                          },
                        );

                        return (
                          <tr
                            key={rowIndex}
                            className="border-b border-zinc-100 last:border-0"
                          >
                            {/* NO. */}
                            <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-700">
                              {rowIndex + 1}
                            </td>

                            {result.displayColumns?.map((column) => {
                              const value = rowByColumn[column.column];

                              return (
                                <td
                                  key={`${rowIndex}-${column.column}`}
                                  className="whitespace-nowrap px-4 py-3 text-zinc-700"
                                >
                                  {formatBookingCell(value, column.column)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
