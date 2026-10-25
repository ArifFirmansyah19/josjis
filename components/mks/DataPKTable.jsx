"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Search,
  Database,
  FileClock,
  CheckCircle2,
  AlertCircle,
  FilterX,
  FileText,
  ChevronRight,
  X,
  Pencil,
  Eye,
  CalendarDays,
  Wallet,
  Hash,
  SlidersHorizontal,
} from "lucide-react";

const MONTHS = [
  ["01", "Januari"],
  ["02", "Februari"],
  ["03", "Maret"],
  ["04", "April"],
  ["05", "Mei"],
  ["06", "Juni"],
  ["07", "Juli"],
  ["08", "Agustus"],
  ["09", "September"],
  ["10", "Oktober"],
  ["11", "November"],
  ["12", "Desember"],
];

/**
 * Parsing tanggal agar tanggal database dengan format YYYY-MM-DD
 * tidak bergeser ke hari sebelumnya akibat konversi UTC.
 */
function parseDate(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
      );

      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPkDate(row) {
  return parseDate(row?.tanggal_pk) || parseDate(row?.created_at);
}

function formatDate(value, withTime = false) {
  const date = parseDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat(
    "id-ID",
    withTime
      ? {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
  ).format(date);
}

function formatShortDate(value) {
  const date = parseDate(value);
  if (!date) return "—";

  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "—";

  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function statusClass(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "DRAFT") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (["AKTIF", "APPROVED", "DISETUJUI", "SELESAI"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getYear(row) {
  const date = getPkDate(row);
  return date ? String(date.getFullYear()) : "";
}

function getMonth(row) {
  const date = getPkDate(row);
  return date ? String(date.getMonth() + 1).padStart(2, "0") : "";
}

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 break-words text-sm font-semibold leading-5 text-slate-900">
        {displayValue(value)}
      </p>
    </div>
  );
}

export default function DataPKTable({
  rows = [],
  error = "",
  namaMks = "MKS",
  namaUnit = "",
  kodeUnit = "",
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [jenis, setJenis] = useState("SEMUA");
  const [bulan, setBulan] = useState("SEMUA");
  const [tahun, setTahun] = useState("SEMUA");
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const years = useMemo(() => {
    const values = new Set(rows.map(getYear).filter(Boolean));

    const currentYear = String(new Date().getFullYear());
    values.add(currentYear);

    return [...values].sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  // Urutkan data terbaru ke terlama berdasarkan tanggal PK.
  // created_at menjadi fallback bila tanggal PK belum diisi.
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const dateA = getPkDate(a);
      const dateB = getPkDate(b);

      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;

      if (timeA !== timeB) return timeB - timeA;

      const createdA = parseDate(a.created_at)?.getTime() || 0;
      const createdB = parseDate(b.created_at)?.getTime() || 0;

      return createdB - createdA;
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("id-ID");

    return sortedRows.filter((row) => {
      const type = String(row.jenis_pengajuan_kredit || "").toUpperCase();

      if (jenis !== "SEMUA" && type !== jenis) return false;

      if (bulan !== "SEMUA" && getMonth(row) !== bulan) {
        return false;
      }

      if (tahun !== "SEMUA" && getYear(row) !== tahun) {
        return false;
      }

      if (!keyword) return true;

      const searchable = [
        row.id,
        row.nama_debitur,
        row.nomor_pk,
        row.nomor_aplikasi,
        row.cif,
        row.nomor_ktp,
        row.rekening_kredit,
        row.status_pk,
        row.jenis_pengajuan_kredit,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLocaleLowerCase("id-ID");

      return searchable.includes(keyword);
    });
  }, [sortedRows, search, jenis, bulan, tahun]);

  const draftCount = filteredRows.filter(
    (row) => String(row.status_pk || "").toUpperCase() === "DRAFT",
  ).length;

  const hasFilters =
    Boolean(search.trim()) ||
    jenis !== "SEMUA" ||
    bulan !== "SEMUA" ||
    tahun !== "SEMUA";

  function resetFilters() {
    setSearch("");
    setJenis("SEMUA");
    setBulan("SEMUA");
    setTahun("SEMUA");
  }

  function refresh() {
    if (refreshing) return;

    setRefreshing(true);
    router.refresh();

    // Hanya untuk animasi tombol; bukan indikator bahwa server sudah selesai.
    window.setTimeout(() => setRefreshing(false), 800);
  }

  function openEdit(row) {
    if (!row?.id) return;

    // Sesuaikan parameter ini jika halaman Input PK menggunakan pola URL lain.
    router.push(`/mks/input-pk?pkId=${encodeURIComponent(row.id)}`);
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Background grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.10) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "linear-gradient(to bottom, black, rgba(0,0,0,0.3) 72%, transparent)",
        }}
      />

      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-7 lg:px-8">
        {/* Header */}
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1 bg-gradient-to-r from-emerald-800 via-emerald-500 to-teal-300" />

          <div className="flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 sm:h-12 sm:w-12">
                <FileText size={22} />
              </div>

              <div className="min-w-0">
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-800 sm:text-xs">
                  <Database size={13} />
                  DATABASE PK MKS
                </div>

                <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
                  Data PK Saya
                </h1>

                <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
                  Pantau, cari, dan lihat detail data pinjaman.
                </p>

                <p className="mt-2 break-words text-xs font-semibold text-slate-700 sm:text-sm">
                  {namaMks}
                  <span className="mx-2 text-slate-300">•</span>
                  {namaUnit}
                  {kodeUnit ? ` (${kodeUnit})` : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Muat ulang data
            </button>
          </div>
        </header>

        {/* Error */}
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold">Data PK gagal dimuat</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          </div>
        ) : null}

        {/* Summary */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600 sm:text-sm">
                PK sesuai filter
              </p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Database size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-extrabold tabular-nums text-slate-950 sm:text-3xl">
              {filteredRows.length}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
              Dari {rows.length} PK milik akun ini
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600 sm:text-sm">
                Draft sesuai filter
              </p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <FileClock size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-extrabold tabular-nums text-slate-950 sm:text-3xl">
              {draftCount}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
              PK dengan status DRAFT
            </p>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600 sm:text-sm">
                Status pemuatan
              </p>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  error
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="mt-3 text-base font-extrabold text-slate-950 sm:text-lg">
              {error ? "Perlu diperiksa" : "Data terbaca"}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
              Sumber data: tabel PK
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <SlidersHorizontal size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-950">Filter data</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Periode dihitung dari tanggal PK. Jika tanggal PK kosong, sistem
                menggunakan waktu data dibuat.
              </p>
            </div>

            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <FilterX size={15} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-slate-800">
                Jenis kredit
              </span>
              <select
                value={jenis}
                onChange={(event) => setJenis(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-black outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="SEMUA">Semua jenis kredit</option>
                <option value="KUR">KUR</option>
                <option value="KUM">KUM</option>
              </select>
            </label>

            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-slate-800">
                Bulan PK
              </span>
              <select
                value={bulan}
                onChange={(event) => setBulan(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-black outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="SEMUA">Semua bulan</option>
                {MONTHS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-slate-800">
                Tahun PK
              </span>
              <select
                value={tahun}
                onChange={(event) => setTahun(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-black outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="SEMUA">Semua tahun</option>
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-slate-800">
                Cari data PK
              </span>
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nama, CIF, nomor PK..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-black outline-none placeholder:font-normal placeholder:text-slate-500 transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </label>
          </div>

          {hasFilters ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
              <p className="text-xs text-slate-600">
                Hasil pencarian:{" "}
                <span className="font-extrabold text-slate-950">
                  {filteredRows.length}
                </span>{" "}
                data
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100"
              >
                <FilterX size={14} />
                Hapus semua filter
              </button>
            </div>
          ) : null}
        </section>

        {/* PK list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <FileText size={19} />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-950">Daftar PK</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Urutan dari tanggal PK terbaru ke terlama.
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800">
              {filteredRows.length} data
            </span>
          </div>

          {!error && filteredRows.length === 0 ? (
            <div className="px-5 py-14 text-center sm:py-16">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                <Database size={26} />
              </div>
              <h3 className="mt-4 font-bold text-slate-900">
                {hasFilters ? "Tidak ada data yang cocok" : "Belum ada data PK"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-600">
                {hasFilters
                  ? "Coba ubah kata kunci atau reset filter untuk melihat data lainnya."
                  : "Data PK milik akun MKS ini akan ditampilkan di sini setelah tersedia."}
              </p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  <FilterX size={16} />
                  Reset filter
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Mobile: compact cards */}
          {filteredRows.length > 0 ? (
            <div className="space-y-3 bg-slate-50/60 p-3 md:hidden">
              {filteredRows.map((row) => (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800">
                        <FileText size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-extrabold leading-5 text-slate-950">
                          {row.nama_debitur || "Nama debitur belum diisi"}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800">
                            {row.jenis_pengajuan_kredit || "Jenis —"}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${statusClass(
                              row.status_pk,
                            )}`}
                          >
                            {row.status_pk || "Belum ada status"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Wallet size={13} />
                          <span className="text-[11px] font-medium">
                            Limit pinjaman
                          </span>
                        </div>
                        <p className="mt-1 break-words text-sm font-extrabold leading-5 text-slate-950">
                          {formatMoney(row.limit_kredit)}
                        </p>
                      </div>

                      <div className="min-w-0 border-l border-slate-200 pl-3">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <CalendarDays size={13} />
                          <span className="text-[11px] font-medium">
                            Tanggal PK
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-extrabold tabular-nums text-slate-950">
                          {formatShortDate(row.tanggal_pk)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-slate-500">
                          Nomor PK
                        </p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
                          {row.nomor_pk || "Belum ada nomor PK"}
                        </p>
                      </div>

                      <span className="shrink-0 text-[10px] text-slate-500">
                        {formatShortDate(row.created_at)}
                        <span className="ml-1">input</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSelected(row)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 border-r border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
                    >
                      <Eye size={15} />
                      Detail
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {/* Desktop/tablet: full table */}
          {filteredRows.length > 0 ? (
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600">
                  <tr>
                    {[
                      "No.",
                      "Tanggal PK",
                      "Waktu input",
                      "Nama debitur",
                      "Nomor PK",
                      "Nomor aplikasi",
                      "CIF",
                      "Rekening kredit",
                      "Jenis kredit",
                      "Limit kredit",
                      "Tenor",
                      "Status",
                      "Aksi",
                    ].map((label) => (
                      <th
                        key={label}
                        className="whitespace-nowrap px-4 py-3.5 font-extrabold"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className="transition hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-500">
                        {index + 1}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="font-bold tabular-nums text-slate-900">
                          {formatDate(row.tanggal_pk)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                        {formatDate(row.created_at, true)}
                      </td>

                      <td className="max-w-[240px] px-4 py-3.5">
                        <p className="break-words font-bold leading-5 text-slate-950">
                          {row.nama_debitur || "—"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                        {row.nomor_pk || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                        {row.nomor_aplikasi || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                        {row.cif || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                        {row.rekening_kredit || "—"}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">
                          {row.jenis_pengajuan_kredit || "—"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold tabular-nums text-slate-900">
                        {formatMoney(row.limit_kredit)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-center text-slate-700">
                        {row.jangka_waktu ? `${row.jangka_waktu} bln` : "—"}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass(
                            row.status_pk,
                          )}`}
                        >
                          {row.status_pk || "Belum ada status"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(row)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <Eye size={14} />
                            Detail
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {filteredRows.length > 0 ? (
            <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
              <p className="text-[11px] leading-5 text-slate-500">
                Data ditampilkan berdasarkan akses MKS yang sedang login. Detail
                dan pengeditan tetap harus mengikuti izin di sisi server.
              </p>
            </div>
          ) : null}
        </section>

        {/* Detail modal */}
        {selected ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Detail PK"
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelected(null);
              }
            }}
          >
            <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-slate-50 shadow-2xl sm:rounded-2xl">
              <div className="h-1 shrink-0 bg-gradient-to-r from-emerald-800 via-emerald-500 to-teal-300" />

              <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4 sm:p-6">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
                    <FileText size={21} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 sm:text-xs">
                      Detail data PK
                    </p>
                    <h3 className="mt-1 break-words text-lg font-extrabold leading-6 text-slate-950 sm:text-xl">
                      {selected.nama_debitur || "Nama debitur belum diisi"}
                    </h3>
                    <p className="mt-1 break-all text-[10px] text-slate-500 sm:text-xs">
                      ID database: {selected.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Tutup detail"
                  onClick={() => setSelected(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto p-3 sm:p-5">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <Wallet size={15} />
                      <span className="text-xs font-semibold">
                        Limit kredit
                      </span>
                    </div>
                    <p className="mt-2 break-words text-base font-extrabold text-slate-950 sm:text-xl">
                      {formatMoney(selected.limit_kredit)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <CalendarDays size={15} />
                      <span className="text-xs font-semibold">Tanggal PK</span>
                    </div>
                    <p className="mt-2 text-base font-extrabold text-slate-950 sm:text-xl">
                      {formatDate(selected.tanggal_pk)}
                    </p>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <Hash size={15} className="text-slate-500" />
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Informasi pinjaman
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <DetailField label="Status PK" value={selected.status_pk} />
                  <DetailField
                    label="Jenis kredit"
                    value={selected.jenis_pengajuan_kredit}
                  />
                  <DetailField label="Nomor PK" value={selected.nomor_pk} />
                  <DetailField
                    label="Nomor aplikasi"
                    value={selected.nomor_aplikasi}
                  />
                  <DetailField label="CIF" value={selected.cif} />
                  <DetailField label="NIK" value={selected.nomor_ktp} />
                  <DetailField
                    label="Rekening kredit"
                    value={selected.rekening_kredit}
                  />
                  <DetailField
                    label="Jangka waktu"
                    value={
                      selected.jangka_waktu
                        ? `${selected.jangka_waktu} bulan`
                        : "—"
                    }
                  />
                  <DetailField
                    label="Bunga per tahun"
                    value={
                      selected.bunga_per_tahun == null
                        ? "—"
                        : `${selected.bunga_per_tahun}%`
                    }
                  />
                  <DetailField
                    label="Bunga per bulan"
                    value={
                      selected.bunga_per_bulan == null
                        ? "—"
                        : `${selected.bunga_per_bulan}%`
                    }
                  />
                  <DetailField
                    label="Tanggal aplikasi"
                    value={formatDate(selected.tanggal_aplikasi)}
                  />
                  <DetailField
                    label="Tanggal PK"
                    value={formatDate(selected.tanggal_pk)}
                  />
                  <DetailField
                    label="Waktu input"
                    value={formatDate(selected.created_at, true)}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                  Informasi ini berasal dari data PK.
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white p-3 sm:flex-row sm:justify-end sm:p-4">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={() => openEdit(selected)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                >
                  <Pencil size={16} />
                  Edit data PK
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <footer className="pb-2 text-center text-[10px] text-slate-500 sm:text-xs">
          JOSJIS · Data PK MKS
        </footer>
      </div>
    </main>
  );
}
