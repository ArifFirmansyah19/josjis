"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  History,
  Image as ImageIcon,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

/* =========================================================
   DUMMY HISTORY
========================================================= */

const dummyHistory = [
  {
    id: "H-001",
    unit: "JKK1",
    debitur: "Hendra Gunawan",
    rekening: "8901234567",
    tglLunas: "22/09/2026",

    selesaiKarena: "PENYERAHAN",
    selesaiLabel: "Agunan sudah diserahkan",

    tanggalPenyerahan: "24/09/2026",
    waktuPenyerahan: "14:32",

    diserahkanOleh: "MKA",
    diterimaOleh: "Hendra Gunawan",

    fotoPenyerahan:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",

    agunan: [
      {
        jenis: "SHM",
        noShm: "99001",
        atasNama: "Hendra Gunawan",
        pengikatan: "SKMHT",
        bundel: "BDL-JKK1-0005",
        loker: "1-C",
      },
    ],
  },

  {
    id: "H-002",
    unit: "JKK1",
    debitur: "Agus Wijaya",
    rekening: "6789012345",
    tglLunas: "30/09/2026",

    selesaiKarena: "DIGUNAKAN_SEMUA",
    selesaiLabel: "Seluruh agunan digunakan untuk pinjaman lain",

    tanggalPenyerahan: null,
    waktuPenyerahan: null,

    diserahkanOleh: null,
    diterimaOleh: null,

    fotoPenyerahan: null,

    agunan: [
      {
        jenis: "SHM",
        noShm: "55667",
        atasNama: "Agus Wijaya",
        pengikatan: "APHT",
        bundel: null,
        loker: null,
        penggunaan: "Pinjaman Baru",
        rekeningBaru: "7890123456",
      },

      {
        jenis: "SHM",
        noShm: "55668",
        atasNama: "Agus Wijaya",
        pengikatan: "APHT",
        bundel: null,
        loker: null,
        penggunaan: "Pinjaman Baru",
        rekeningBaru: "7890123456",
      },
    ],
  },

  {
    id: "H-003",
    unit: "JKK2",
    debitur: "Yuni Lestari",
    rekening: "7890123456",
    tglLunas: "30/09/2026",

    selesaiKarena: "DIGUNAKAN_SEMUA",
    selesaiLabel: "Seluruh agunan digunakan untuk TOP UP",

    tanggalPenyerahan: null,
    waktuPenyerahan: null,

    diserahkanOleh: null,
    diterimaOleh: null,

    fotoPenyerahan: null,

    agunan: [
      {
        jenis: "SHM",
        noShm: "77889",
        atasNama: "Yuni Lestari",
        pengikatan: "APHT",
        bundel: null,
        loker: null,
        penggunaan: "TOP UP",
        rekeningBaru: "8901234567",
      },
    ],
  },
];

/* =========================================================
   BADGE
========================================================= */

function HistoryBadge({ type }) {
  if (type === "PENYERAHAN") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <ShieldCheck size={13} />
        Sudah diserahkan
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
      <ArrowRight size={13} />
      Agunan digunakan kembali
    </span>
  );
}

/* =========================================================
   DETAIL MODAL
========================================================= */

function HistoryDetailModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{item.debitur}</h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Detail history agunan
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto p-5 sm:p-6">
          {/* Summary */}
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Info label="Debitur" value={item.debitur} />

              <Info label="No. Rekening" value={item.rekening} />

              <Info label="Tanggal Lunas" value={item.tglLunas} />

              <Info label="Unit" value={item.unit} />
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-[11px] font-semibold text-slate-400">
                Penyelesaian
              </p>

              <div className="mt-2">
                <HistoryBadge type={item.selesaiKarena} />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-600">
                {item.selesaiLabel}
              </p>
            </div>
          </div>

          {/* SHM */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900">Agunan</h3>

            <div className="mt-3 space-y-3">
              {item.agunan.map((x, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">
                        {x.jenis} {x.noShm}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Atas nama {x.atasNama}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Info label="Pengikatan" value={x.pengikatan} />

                        <Info label="Bundel" value={x.bundel} />

                        <Info label="Loker" value={x.loker} />

                        <Info label="Penggunaan" value={x.penggunaan} />
                      </div>

                      {x.rekeningBaru && (
                        <div className="mt-4 rounded-xl bg-cyan-50 p-3">
                          <p className="text-[11px] font-semibold text-cyan-700">
                            Digunakan untuk fasilitas baru
                          </p>

                          <p className="mt-1 font-mono text-sm font-bold text-cyan-900">
                            {x.rekeningBaru}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PENYERAHAN */}
          {item.selesaiKarena === "PENYERAHAN" && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-900">
                Detail Penyerahan
              </h3>

              <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_260px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Info label="Tanggal" value={item.tanggalPenyerahan} />

                    <Info label="Waktu" value={item.waktuPenyerahan} />

                    <Info label="Diserahkan Oleh" value={item.diserahkanOleh} />

                    <Info label="Diterima Oleh" value={item.diterimaOleh} />
                  </div>
                </div>

                {item.fotoPenyerahan ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <img
                      src={item.fotoPenyerahan}
                      alt="Foto penyerahan agunan"
                      className="h-full min-h-[220px] w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                    <div className="text-center">
                      <ImageIcon size={28} className="mx-auto text-slate-300" />

                      <p className="mt-2 text-xs text-slate-400">
                        Tidak ada foto
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INFO
========================================================= */

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-400">{label}</p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function AgunanLunasHistoryPage() {
  const { activeUnit } = useUnit();

  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const unitCode =
    activeUnit?.kode_unit ||
    activeUnit?.kode ||
    (activeUnit?.nama_unit?.includes("2") ? "JKK2" : "JKK1");

  const unitLabel =
    activeUnit?.nama_unit ||
    (unitCode === "JKK2" ? "Jambi Kuamang Kuning 2" : "Jambi Kuamang Kuning 1");

  const data = useMemo(() => {
    return dummyHistory
      .filter((x) => x.unit === unitCode)
      .filter((x) => {
        const keyword = search.toLowerCase().trim();

        if (!keyword) return true;

        return (
          x.debitur.toLowerCase().includes(keyword) ||
          x.rekening.toLowerCase().includes(keyword) ||
          x.agunan.some((a) => a.noShm.toLowerCase().includes(keyword))
        );
      });
  }, [unitCode, search]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50">
        {/* HEADER */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <History size={19} />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  History Agunan
                </h1>

                <p className="mt-0.5 text-xs text-slate-500">{unitLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
          {/* BACK */}
          <a
            href="/admin/agunan-lunas"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowRight size={15} className="rotate-180" />
            Kembali ke Agunan Lunas
          </a>

          {/* SEARCH */}
          <div className="mt-5">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari debitur, rekening, atau SHM..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none shadow-sm focus:border-slate-400"
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-4">
              <h2 className="text-sm font-bold text-slate-900">
                Riwayat Penyelesaian
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Agunan yang sudah diserahkan atau seluruhnya digunakan kembali.
              </p>
            </div>

            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500">
                      Debitur
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500">
                      No. Rekening
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500">
                      Tgl Lunas
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500">
                      Penyelesaian
                    </th>

                    <th className="w-10 px-5 py-3" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {data.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-900">
                          {item.debitur}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {item.rekening}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.tglLunas}
                      </td>

                      <td className="px-5 py-4">
                        <HistoryBadge type={item.selesaiKarena} />
                      </td>

                      <td className="px-5 py-4">
                        <ChevronRight size={17} className="text-slate-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}
            <div className="divide-y divide-slate-100 md:hidden">
              {data.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {item.debitur}
                      </p>

                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {item.rekening}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        Lunas {item.tglLunas}
                      </p>
                    </div>

                    <ChevronRight size={17} className="text-slate-400" />
                  </div>

                  <div className="mt-3">
                    <HistoryBadge type={item.selesaiKarena} />
                  </div>
                </button>
              ))}
            </div>

            {data.length === 0 && (
              <div className="px-5 py-16 text-center">
                <History size={28} className="mx-auto text-slate-300" />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Belum ada history
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MODAL */}
        <HistoryDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      </div>
    </DashboardLayout>
  );
}
