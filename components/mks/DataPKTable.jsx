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

function formatDate(value, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
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
      : { day: "2-digit", month: "short", year: "numeric" },
  ).format(date);
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

function statusClass(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "DRAFT")
    return "bg-amber-50 text-amber-800 ring-amber-200";
  if (["AKTIF", "APPROVED", "DISETUJUI", "SELESAI"].includes(normalized))
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
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
    const values = new Set(
      rows
        .map((row) => {
          if (!row.created_at) return "";
          const date = new Date(row.created_at);
          return Number.isNaN(date.getTime()) ? "" : String(date.getFullYear());
        })
        .filter(Boolean),
    );
    const currentYear = String(new Date().getFullYear());
    values.add(currentYear);
    return [...values].sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("id-ID");
    return rows.filter((row) => {
      const type = String(row.jenis_pengajuan_kredit || "").toUpperCase();
      if (jenis !== "SEMUA" && type !== jenis) return false;

      // Month/year filter is based on created_at (actual record creation timestamp).
      const date = row.created_at ? new Date(row.created_at) : null;
      if (
        bulan !== "SEMUA" &&
        (!date ||
          Number.isNaN(date.getTime()) ||
          String(date.getMonth() + 1).padStart(2, "0") !== bulan)
      )
        return false;
      if (
        tahun !== "SEMUA" &&
        (!date ||
          Number.isNaN(date.getTime()) ||
          String(date.getFullYear()) !== tahun)
      )
        return false;

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
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID");
      return searchable.includes(keyword);
    });
  }, [rows, search, jenis, bulan, tahun]);

  const draftCount = filteredRows.filter(
    (row) => String(row.status_pk || "").toUpperCase() === "DRAFT",
  ).length;
  const resetFilters = () => {
    setSearch("");
    setJenis("SEMUA");
    setBulan("SEMUA");
    setTahun("SEMUA");
  };
  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Database size={14} /> DATABASE PK MKS
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Data PK Saya
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Daftar PK yang diinput oleh akun MKS yang sedang aktif.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              {namaMks} <span className="text-slate-400">•</span> {namaUnit}{" "}
              {kodeUnit ? `(${kodeUnit})` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{" "}
            Muat ulang data
          </button>
        </header>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Data PK gagal dimuat</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">PK sesuai filter</p>
              <Database className="text-blue-600" size={19} />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {filteredRows.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Dari {rows.length} PK milik akun ini
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Draft sesuai filter</p>
              <FileClock className="text-amber-600" size={19} />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {draftCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Tersimpan dengan status DRAFT
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Status pemuatan</p>
              <CheckCircle2
                className={error ? "text-red-600" : "text-emerald-600"}
                size={19}
              />
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {error ? "Perlu diperiksa" : "Data berhasil dibaca"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sumber: tabel Supabase `pk`
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="font-semibold text-slate-900">Filter data</h2>
            <p className="text-xs text-slate-500">
              Bulan dan tahun berdasarkan waktu data dibuat di database.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Jenis kredit
              </span>
              <select
                value={jenis}
                onChange={(event) => setJenis(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="SEMUA">KUR + KUM (semua)</option>
                <option value="KUR">KUR</option>
                <option value="KUM">KUM</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Bulan input
              </span>
              <select
                value={bulan}
                onChange={(event) => setBulan(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="SEMUA">Semua bulan</option>
                {MONTHS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Tahun input
              </span>
              <select
                value={tahun}
                onChange={(event) => setTahun(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="SEMUA">Semua tahun</option>
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Cari data
              </span>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nama, CIF, nomor PK..."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              <FilterX size={14} /> Reset filter
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">Daftar PK</h2>
              <p className="mt-1 text-xs text-slate-500">
                Hanya PK dengan MKS dan unit yang cocok dengan akun aktif.
              </p>
            </div>
            <span className="text-sm font-medium text-slate-600">
              {filteredRows.length} data
            </span>
          </div>
          {!error && filteredRows.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Database size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 font-semibold text-slate-800">
                Belum ada data yang cocok
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Coba ubah filter, atau simpan PK baru melalui menu Input PK.
              </p>
            </div>
          ) : null}
          {filteredRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1150px] w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      No.
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Waktu input
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Nama debitur
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Nomor PK
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Nomor aplikasi
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      CIF
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Rekening kredit
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Jenis kredit
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      Limit kredit
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                      Tenor
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-blue-50/40">
                      <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(row.created_at, true)}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 font-semibold text-slate-900">
                        {row.nama_debitur || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {row.nomor_pk || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {row.nomor_aplikasi || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {row.cif || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {row.rekening_kredit || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                          {row.jenis_pengajuan_kredit || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                        {formatMoney(row.limit_kredit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-slate-700">
                        {row.jangka_waktu ? `${row.jangka_waktu} bln` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(row.status_pk)}`}
                        >
                          {row.status_pk || "Belum ada status"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                        >
                          Lihat detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {selected ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Detail PK"
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelected(null);
            }}
          >
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Detail data tersimpan
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    {selected.nama_debitur || "Tanpa nama debitur"}
                  </h3>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    ID database: {selected.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Tutup
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Status", selected.status_pk],
                  ["Jenis kredit", selected.jenis_pengajuan_kredit],
                  ["Nomor PK", selected.nomor_pk],
                  ["Nomor aplikasi", selected.nomor_aplikasi],
                  ["CIF", selected.cif],
                  ["NIK", selected.nomor_ktp],
                  ["Rekening kredit", selected.rekening_kredit],
                  ["Limit kredit", formatMoney(selected.limit_kredit)],
                  [
                    "Jangka waktu",
                    selected.jangka_waktu
                      ? `${selected.jangka_waktu} bulan`
                      : "—",
                  ],
                  [
                    "Bunga per tahun",
                    selected.bunga_per_tahun == null
                      ? "—"
                      : `${selected.bunga_per_tahun}%`,
                  ],
                  [
                    "Bunga per bulan",
                    selected.bunga_per_bulan == null
                      ? "—"
                      : `${selected.bunga_per_bulan}%`,
                  ],
                  ["Tanggal aplikasi", formatDate(selected.tanggal_aplikasi)],
                  ["Tanggal PK", formatDate(selected.tanggal_pk)],
                  ["Waktu tersimpan", formatDate(selected.created_at, true)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                      {value || "—"}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                Halaman ini hanya untuk melihat data PK milik akun MKS aktif.
                Pengeditan data dilakukan melalui alur yang telah ditentukan di
                JOSJIS.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
