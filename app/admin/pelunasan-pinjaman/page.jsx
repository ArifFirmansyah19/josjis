"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck,
  FileText,
  Landmark,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";

/* =========================================================
   MOCK DATA
========================================================= */

const mockData = [
  {
    id: 1,
    unit: "JKK1",
    nama: "Budi Santoso",
    mks: "Aris",
    norek: "1234567890",
    cif: "CIF001245",
    noPk: "PK/2026/00125",
    tanggalPk: "12 Januari 2026",
    produk: "KUR",
    limit: 150000000,
    tenor: "36 Bulan",
    status: "AKTIF",
    agunan: "SHM 12345",
    jenisAgunan: "SHM",
    pengikatan: "SKMHT",
    perluRoya: false,
  },
  {
    id: 2,
    unit: "JKK1",
    nama: "Siti Rahma",
    mks: "Fadilah Jismi",
    norek: "1234567891",
    cif: "CIF001246",
    noPk: "PK/2026/00126",
    tanggalPk: "18 Februari 2026",
    produk: "KUM",
    limit: 250000000,
    tenor: "48 Bulan",
    status: "AKTIF",
    agunan: "SHM 12346",
    jenisAgunan: "SHM",
    pengikatan: "APHT",
    perluRoya: true,
  },
  {
    id: 3,
    unit: "JKK1",
    nama: "Andi Saputra",
    mks: "Aris",
    norek: "1234567892",
    cif: "CIF001247",
    noPk: "PK/2026/00127",
    tanggalPk: "03 Maret 2026",
    produk: "KSM",
    limit: 100000000,
    tenor: "24 Bulan",
    status: "AKTIF",
    agunan: "SHM 12347",
    jenisAgunan: "SHM",
    pengikatan: "SKMHT",
    perluRoya: false,
  },
  {
    id: 4,
    unit: "JKK2",
    nama: "Rudi Hartono",
    mks: "Aris",
    norek: "2234567890",
    cif: "CIF002245",
    noPk: "PK/2026/00225",
    tanggalPk: "10 Januari 2026",
    produk: "KUR",
    limit: 200000000,
    tenor: "36 Bulan",
    status: "AKTIF",
    agunan: "SHM 22345",
    jenisAgunan: "SHM",
    pengikatan: "SKMHT",
    perluRoya: false,
  },
];

/* =========================================================
   HELPER
========================================================= */

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  if (status === "AKTIF") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Aktif
      </span>
    );
  }

  if (status === "LUNAS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Lunas
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
      {status}
    </span>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function PelunasanPinjamanPage() {
  const [activeUnit] = useState("JKK1");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("AKTIF");

  const [selected, setSelected] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);

  /* -------------------------------------------------------
     FILTER DATA
  ------------------------------------------------------- */

  const filteredData = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return mockData.filter((item) => {
      const matchUnit = item.unit === activeUnit;

      const matchStatus =
        statusFilter === "SEMUA" || item.status === statusFilter;

      const matchSearch =
        !keyword ||
        item.nama.toLowerCase().includes(keyword) ||
        item.norek.toLowerCase().includes(keyword) ||
        item.cif.toLowerCase().includes(keyword) ||
        item.noPk.toLowerCase().includes(keyword);

      return matchUnit && matchStatus && matchSearch;
    });
  }, [activeUnit, search, statusFilter]);

  /* -------------------------------------------------------
     SUMMARY
  ------------------------------------------------------- */

  const totalAktif = mockData.filter(
    (item) => item.unit === activeUnit && item.status === "AKTIF",
  ).length;

  const totalLunas = mockData.filter(
    (item) => item.unit === activeUnit && item.status === "LUNAS",
  ).length;

  const totalRoya = mockData.filter(
    (item) =>
      item.unit === activeUnit && item.status === "AKTIF" && item.perluRoya,
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-zinc-400">
                <Landmark className="h-4 w-4" />
                PROSES
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Pelunasan Pinjaman
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-zinc-500">
                Proses perubahan status pinjaman dari aktif menjadi lunas dan
                kelola proses setelah pelunasan.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Unit Aktif
              </div>

              <div className="mt-0.5 text-sm font-semibold text-zinc-900">
                Jambi Kuamang Kuning 1
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-zinc-500">
                  Pinjaman Aktif
                </div>

                <div className="mt-1 text-2xl font-bold text-zinc-900">
                  {totalAktif}
                </div>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <WalletCards className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-zinc-500">
                  Sudah Lunas
                </div>

                <div className="mt-1 text-2xl font-bold text-zinc-900">
                  {totalLunas}
                </div>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-zinc-500">
                  Perlu Roya
                </div>

                <div className="mt-1 text-2xl font-bold text-zinc-900">
                  {totalRoya}
                </div>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <FileCheck className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            SEARCH & FILTER
        ================================================= */}

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, norek pinjaman, CIF, atau nomor PK..."
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition focus:border-zinc-400 focus:bg-white"
              />
            </div>

            <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              {["AKTIF", "LUNAS", "SEMUA"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    statusFilter === status
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {status === "AKTIF"
                    ? "Aktif"
                    : status === "LUNAS"
                      ? "Lunas"
                      : "Semua"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <div className="text-sm font-semibold text-zinc-900">
              Daftar Pinjaman
            </div>

            <div className="mt-0.5 text-xs text-zinc-500">
              Pilih pinjaman untuk melihat detail dan memproses pelunasan.
            </div>
          </div>

          {/* DESKTOP */}

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Debitur
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Norek Pinjaman
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    CIF
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Produk
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Limit
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredData.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="cursor-pointer border-b border-zinc-100 transition hover:bg-zinc-50"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-zinc-900">
                        {item.nama}
                      </div>

                      <div className="mt-0.5 text-xs text-zinc-400">
                        MKS: {item.mks}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-700">
                      {item.norek}
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-700">
                      {item.cif}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                        {item.produk}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-zinc-800">
                      {formatRupiah(item.limit)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(item);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        Detail
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}

          <div className="divide-y divide-zinc-100 md:hidden">
            {filteredData.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="flex w-full items-center justify-between px-4 py-4 text-left transition hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-zinc-900">
                    {item.nama}
                  </div>

                  <div className="mt-1 text-xs text-zinc-500">{item.norek}</div>

                  <div className="mt-2">
                    <StatusBadge status={item.status} />
                  </div>
                </div>

                <ChevronRight className="ml-3 h-5 w-5 shrink-0 text-zinc-400" />
              </button>
            ))}
          </div>

          {filteredData.length === 0 && (
            <div className="px-5 py-14 text-center">
              <Search className="mx-auto h-8 w-8 text-zinc-300" />

              <div className="mt-3 text-sm font-semibold text-zinc-700">
                Data tidak ditemukan
              </div>

              <div className="mt-1 text-xs text-zinc-400">
                Coba gunakan kata pencarian atau filter yang berbeda.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-100 bg-white px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
                    <Landmark className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">
                      {selected.nama}
                    </h2>

                    <div className="mt-0.5 text-xs text-zinc-500">
                      {selected.noPk}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* INFORMASI PINJAMAN */}

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-zinc-500" />

                  <h3 className="text-sm font-bold text-zinc-900">
                    Informasi Pinjaman
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <InfoItem label="Nama Debitur" value={selected.nama} />
                  <InfoItem label="MKS" value={selected.mks} />
                  <InfoItem label="Norek Pinjaman" value={selected.norek} />
                  <InfoItem label="CIF" value={selected.cif} />
                  <InfoItem label="No. PK" value={selected.noPk} />
                  <InfoItem label="Tanggal PK" value={selected.tanggalPk} />
                  <InfoItem label="Produk" value={selected.produk} />
                  <InfoItem
                    label="Limit"
                    value={formatRupiah(selected.limit)}
                  />
                  <InfoItem label="Tenor" value={selected.tenor} />
                  <InfoItem label="Status" value={selected.status} />
                </div>
              </section>

              {/* AGUNAN */}

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Archive className="h-4 w-4 text-zinc-500" />

                  <h3 className="text-sm font-bold text-zinc-900">Agunan</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <InfoItem label="Jenis Agunan" value={selected.jenisAgunan} />
                  <InfoItem label="No. Sertifikat" value={selected.agunan} />
                  <InfoItem label="Pengikatan" value={selected.pengikatan} />

                  <InfoItem
                    label="Roya"
                    value={selected.perluRoya ? "Perlu Roya" : "Tidak Perlu"}
                  />
                </div>
              </section>

              {/* STATUS */}

              <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-medium text-zinc-500">
                      Status Pinjaman
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>

                  {selected.status === "AKTIF" && (
                    <button
                      type="button"
                      onClick={() => setShowProcessModal(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Proses Pelunasan
                    </button>
                  )}
                </div>
              </section>

              {/* PROSES SETELAH LUNAS */}

              {selected.status === "LUNAS" && (
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-zinc-500" />

                    <h3 className="text-sm font-bold text-zinc-900">
                      Proses Setelah Pelunasan
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <ProcessRow
                      icon={CheckCircle2}
                      label="Status Pinjaman"
                      status="LUNAS"
                      done
                    />

                    <ProcessRow
                      icon={FileText}
                      label="BAST Lunas"
                      status="Belum dibuat"
                    />

                    <ProcessRow
                      icon={FileCheck}
                      label="Roya"
                      status={
                        selected.perluRoya
                          ? "Perlu diproses"
                          : "Tidak diperlukan"
                      }
                      done={!selected.perluRoya}
                    />

                    <ProcessRow
                      icon={Package}
                      label="Order Agunan"
                      status="Belum diproses"
                    />

                    <ProcessRow
                      icon={Truck}
                      label="Pengembalian Agunan"
                      status="Belum diproses"
                    />
                  </div>
                </section>
              )}

              {/* FOOTER */}

              <div className="flex items-center justify-between border-t border-zinc-100 pt-5">
                <div className="text-xs text-zinc-400">
                  Semua proses pelunasan tercatat pada data pinjaman.
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL KONFIRMASI PELUNASAN
      ===================================================== */}

      {showProcessModal && selected && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <CircleAlert className="h-6 w-6" />
            </div>

            <h3 className="mt-5 text-lg font-bold text-zinc-900">
              Proses Pelunasan Pinjaman?
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Anda akan mengubah status pinjaman{" "}
              <span className="font-semibold text-zinc-700">
                {selected.nama}
              </span>{" "}
              dari <b>AKTIF</b> menjadi <b>LUNAS</b>.
            </p>

            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                <div className="text-xs leading-5 text-amber-800">
                  Setelah status menjadi lunas, sistem akan membuka proses
                  lanjutan seperti BAST Lunas, Roya jika diperlukan, Order
                  Agunan, dan Pengembalian Agunan.
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowProcessModal(false)}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProcessModal(false);
                  setSelected(null);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Ya, Lunaskan
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-zinc-800">
        {value || "-"}
      </div>
    </div>
  );
}

/* =========================================================
   PROCESS ROW
========================================================= */

function ProcessRow({ icon: Icon, label, status, done = false }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            done
              ? "bg-emerald-50 text-emerald-600"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <div className="text-sm font-semibold text-zinc-800">{label}</div>

          <div className="text-xs text-zinc-400">{status}</div>
        </div>
      </div>

      {done ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      ) : (
        <Clock3 className="h-5 w-5 text-zinc-300" />
      )}
    </div>
  );
}
