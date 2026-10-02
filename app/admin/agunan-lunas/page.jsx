"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import {
  Archive,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  History,
  Image as ImageIcon,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";

/* =========================================================
   DUMMY DATA
   NANTI DIGANTI SUPABASE
========================================================= */

const dummyData = [
  {
    id: "AL-001",
    unit: "JKK1",
    debitur: "Budi Santoso",
    rekening: "1234567890",
    tglLunas: "25/09/2026",

    agunan: [
      {
        id: "AG-001",
        jenis: "SHM",
        noShm: "12345",
        atasNama: "Budi Santoso",
        pengikatan: "SKMHT",

        status: "BISA_DISERAHKAN",
        posisi: "CABANG",

        bundel: "BDL-JKK1-0012",
        loker: "1-A",

        keterangan:
          "Fisik sertifikat sudah berada di cabang dan siap diserahkan.",
      },
    ],
  },

  {
    id: "AL-002",
    unit: "JKK1",
    debitur: "Siti Aminah",
    rekening: "2345678901",
    tglLunas: "27/09/2026",

    agunan: [
      {
        id: "AG-002",
        jenis: "SHM",
        noShm: "67890",
        atasNama: "Siti Aminah",
        pengikatan: "APHT",

        status: "PERLU_ORDER",
        posisi: "CO",

        bundel: null,
        loker: null,

        keterangan:
          "Fisik sertifikat masih berada di CO dan perlu dilakukan order.",
      },
    ],
  },

  {
    id: "AL-003",
    unit: "JKK1",
    debitur: "Andi Saputra",
    rekening: "3456789012",
    tglLunas: "28/09/2026",

    agunan: [
      {
        id: "AG-003",
        jenis: "SHM",
        noShm: "54321",
        atasNama: "Andi Saputra",
        pengikatan: "APHT",

        status: "PROSES_ORDER",
        posisi: "ORDER",

        bundel: "BDL-JKK1-0015",
        loker: null,

        keterangan: "Agunan sudah dilakukan order dan masih dalam proses.",
      },
    ],
  },

  {
    id: "AL-004",
    unit: "JKK2",
    debitur: "Dedi Irawan",
    rekening: "4567890123",
    tglLunas: "26/09/2026",

    agunan: [
      {
        id: "AG-004",
        jenis: "SHM",
        noShm: "11223",
        atasNama: "Dedi Irawan",
        pengikatan: "SKMHT",

        status: "DI_NOTARIS",
        posisi: "NOTARIS",

        bundel: "BDL-JKK2-0007",
        loker: null,

        keterangan: "Agunan masih berada di notaris.",
      },
    ],
  },

  {
    id: "AL-005",
    unit: "JKK2",
    debitur: "Rina Marlina",
    rekening: "5678901234",
    tglLunas: "29/09/2026",

    agunan: [
      {
        id: "AG-005",
        jenis: "SHM",
        noShm: "33445",
        atasNama: "Rina Marlina",
        pengikatan: "APHT",

        status: "BISA_DISERAHKAN",
        posisi: "CABANG",

        bundel: "BDL-JKK2-0008",
        loker: "2-C",

        keterangan:
          "Fisik sertifikat berada di cabang dan Surat Roya tersedia.",
      },
    ],
  },

  {
    id: "AL-006",
    unit: "JKK1",
    debitur: "Fajar Ramadhan",
    rekening: "6789012345",
    tglLunas: "30/09/2026",

    agunan: [
      {
        id: "AG-006-A",
        jenis: "SHM",
        noShm: "55667",
        atasNama: "Fajar Ramadhan",
        pengikatan: "APHT",

        status: "DIGUNAKAN_PINJAMAN_LAIN",
        posisi: "DIGUNAKAN",

        bundel: null,
        loker: null,

        rekeningBaru: "7890123456",
        fasilitasBaru: "Pinjaman Baru",

        keterangan: "SHM sudah digunakan untuk fasilitas pinjaman lain.",
      },

      {
        id: "AG-006-B",
        jenis: "SHM",
        noShm: "55668",
        atasNama: "Fajar Ramadhan",
        pengikatan: "APHT",

        status: "BISA_DISERAHKAN",
        posisi: "CABANG",

        bundel: "BDL-JKK1-0018",
        loker: "2-B",

        keterangan:
          "SHM masih berada di cabang dan dapat diproses untuk penyerahan.",
      },
    ],
  },

  {
    id: "AL-007",
    unit: "JKK2",
    debitur: "Yuni Lestari",
    rekening: "7890123456",
    tglLunas: "30/09/2026",

    agunan: [
      {
        id: "AG-007",
        jenis: "SHM",
        noShm: "77889",
        atasNama: "Yuni Lestari",
        pengikatan: "APHT",

        status: "DIGUNAKAN_TOPUP",
        posisi: "DIGUNAKAN",

        bundel: null,
        loker: null,

        rekeningBaru: "8901234567",
        fasilitasBaru: "TOP UP",

        keterangan: "SHM digunakan kembali untuk fasilitas Top Up.",
      },
    ],
  },
];

/* =========================================================
   HELPER
========================================================= */

function getStatusInfo(status) {
  const map = {
    BISA_DISERAHKAN: {
      label: "Bisa diserahkan",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    },

    PERLU_ORDER: {
      label: "Perlu order",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: Package,
    },

    PROSES_ORDER: {
      label: "Proses order",
      className: "border-blue-200 bg-blue-50 text-blue-700",
      icon: Clock3,
    },

    DI_NOTARIS: {
      label: "Di notaris",
      className: "border-violet-200 bg-violet-50 text-violet-700",
      icon: Building2,
    },

    DIGUNAKAN_PINJAMAN_LAIN: {
      label: "Digunakan pinjaman lain",
      className: "border-cyan-200 bg-cyan-50 text-cyan-700",
      icon: ArrowRight,
    },

    DIGUNAKAN_TOPUP: {
      label: "Digunakan Top Up",
      className: "border-sky-200 bg-sky-50 text-sky-700",
      icon: ArrowRight,
    },

    SUDAH_DISERAHKAN: {
      label: "Sudah diserahkan",
      className: "border-slate-200 bg-slate-100 text-slate-600",
      icon: ShieldCheck,
    },
  };

  return (
    map[status] || {
      label: "Belum ditentukan",
      className: "border-slate-200 bg-slate-50 text-slate-600",
      icon: AlertCircle,
    }
  );
}

function getPositionLabel(position) {
  const map = {
    CABANG: "Di Cabang",
    CO: "Di CO",
    ORDER: "Proses Order",
    NOTARIS: "Di Notaris",
    DIGUNAKAN: "Digunakan",
    DEBITUR: "Di Debitur",
  };

  return map[position] || "-";
}

function StatusBadge({ status }) {
  const info = getStatusInfo(status);
  const Icon = info.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${info.className}`}
    >
      <Icon size={13} />
      {info.label}
    </span>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({ label, value }) {
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
   DETAIL MODAL
========================================================= */

function DetailModal({ item, onClose, onSubmit }) {
  const [showSubmit, setShowSubmit] = useState(false);

  if (!item) return null;

  const agunanAktif = item.agunan.filter(
    (x) =>
      ![
        "DIGUNAKAN_PINJAMAN_LAIN",
        "DIGUNAKAN_TOPUP",
        "SUDAH_DISERAHKAN",
      ].includes(x.status),
  );

  const semuaDigunakan = item.agunan.every((x) =>
    ["DIGUNAKAN_PINJAMAN_LAIN", "DIGUNAKAN_TOPUP"].includes(x.status),
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <Archive size={19} className="text-slate-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {item.debitur}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Detail agunan pinjaman lunas
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 sm:p-6">
          {/* Ringkasan */}
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoItem label="No. Rekening" value={item.rekening} />

              <InfoItem label="Tanggal Lunas" value={item.tglLunas} />

              <InfoItem label="Unit" value={item.unit} />

              <InfoItem
                label="Jumlah SHM"
                value={`${item.agunan.length} SHM`}
              />
            </div>
          </div>

          {/* Semua digunakan */}
          {semuaDigunakan && (
            <div className="mt-4 flex gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0 text-cyan-700"
              />

              <div>
                <p className="text-sm font-bold text-cyan-900">
                  Semua agunan sudah digunakan kembali
                </p>

                <p className="mt-1 text-xs leading-5 text-cyan-800">
                  Pinjaman sudah lunas dan seluruh SHM telah digunakan untuk
                  pinjaman lain atau Top Up. Tidak ada agunan fisik yang perlu
                  diserahkan.
                </p>
              </div>
            </div>
          )}

          {/* SHM */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Agunan / SHM
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  Status dan posisi setiap sertifikat.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {item.agunan.map((agunan, index) => (
                <div
                  key={agunan.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {agunan.jenis} {agunan.noShm}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Atas nama {agunan.atasNama}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={agunan.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <InfoItem label="No. SHM" value={agunan.noShm} />

                    <InfoItem label="Pengikatan" value={agunan.pengikatan} />

                    <InfoItem
                      label="Posisi"
                      value={getPositionLabel(agunan.posisi)}
                    />

                    <InfoItem label="Bundel" value={agunan.bundel} />

                    <InfoItem label="Loker" value={agunan.loker} />

                    <InfoItem label="Atas Nama" value={agunan.atasNama} />
                  </div>

                  {agunan.rekeningBaru && (
                    <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                      <p className="text-xs font-bold text-cyan-900">
                        Digunakan kembali
                      </p>

                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <InfoItem
                          label="Rekening Baru"
                          value={agunan.rekeningBaru}
                        />

                        <InfoItem
                          label="Fasilitas"
                          value={agunan.fasilitasBaru}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold text-slate-400">
                      Keterangan
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-700">
                      {agunan.keterangan || "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          {agunanAktif.some((x) => x.status === "BISA_DISERAHKAN") && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    Ada agunan yang siap diserahkan
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    Setelah penyerahan selesai, upload foto dokumentasi sebagai
                    bukti.
                  </p>
                </div>

                <button
                  onClick={() => setShowSubmit(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <ShieldCheck size={16} />
                  Serahkan Agunan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal penyerahan */}
      {showSubmit && (
        <PenyerahanModal
          item={item}
          onClose={() => setShowSubmit(false)}
          onSubmit={(data) => {
            setShowSubmit(false);
            onSubmit?.(data);
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   MODAL PENYERAHAN
========================================================= */

function PenyerahanModal({ item, onClose, onSubmit }) {
  const [tanggal, setTanggal] = useState(
    new Date().toLocaleDateString("id-ID"),
  );

  const [waktu, setWaktu] = useState(
    new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  const [diterimaOleh, setDiterimaOleh] = useState(item.debitur);

  const [foto, setFoto] = useState(null);

  const agunanSiap = item.agunan.filter((x) => x.status === "BISA_DISERAHKAN");

  function handleSubmit(event) {
    event.preventDefault();

    if (!foto) {
      alert("Foto penyerahan wajib diupload.");
      return;
    }

    onSubmit?.({
      item,
      tanggal,
      waktu,
      diterimaOleh,
      foto,
    });
  }

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/40 p-3">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Penyerahan Agunan
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">{item.debitur}</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {/* SHM */}
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-400">
              SHM yang diserahkan
            </p>

            <div className="mt-2 space-y-2">
              {agunanSiap.map((x) => (
                <div
                  key={x.id}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {x.jenis} {x.noShm}
                    </p>

                    <p className="text-xs text-slate-400">
                      {x.bundel || "-"} {x.loker ? `• ${x.loker}` : ""}
                    </p>
                  </div>

                  <CheckCircle2 size={17} className="text-emerald-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Tanggal / waktu */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Tanggal
              </label>

              <input
                type="text"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Waktu
              </label>

              <input
                type="text"
                value={waktu}
                onChange={(e) => setWaktu(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* Diterima */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Diterima Oleh
            </label>

            <input
              type="text"
              value={diterimaOleh}
              onChange={(e) => setDiterimaOleh(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            />
          </div>

          {/* Foto */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Foto Penyerahan
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:bg-slate-100">
              <ImageIcon size={28} className="text-slate-400" />

              <p className="mt-2 text-sm font-semibold text-slate-700">
                {foto ? foto.name : "Upload foto dokumentasi"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Satu foto dokumentasi penyerahan
              </p>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFoto(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>

            <button
              type="submit"
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Simpan Penyerahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function AgunanLunasPage() {
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

  const filteredData = useMemo(() => {
    return dummyData
      .filter((item) => item.unit === unitCode)
      .filter((item) => {
        const keyword = search.toLowerCase().trim();

        if (!keyword) return true;

        return (
          item.debitur.toLowerCase().includes(keyword) ||
          item.rekening.toLowerCase().includes(keyword) ||
          item.agunan.some(
            (x) =>
              x.noShm.toLowerCase().includes(keyword) ||
              x.atasNama.toLowerCase().includes(keyword),
          )
        );
      })
      .filter((item) => {
        /*
         * Jika seluruh agunan sudah:
         * - diserahkan
         * - digunakan pinjaman lain
         * - digunakan Top Up
         *
         * maka tidak lagi tampil di tabel utama.
         */
        const selesai = item.agunan.every((x) =>
          [
            "SUDAH_DISERAHKAN",
            "DIGUNAKAN_PINJAMAN_LAIN",
            "DIGUNAKAN_TOPUP",
          ].includes(x.status),
        );

        return !selesai;
      });
  }, [unitCode, search]);

  const summary = useMemo(() => {
    const unitData = dummyData.filter((x) => x.unit === unitCode);

    const agunan = unitData.flatMap((x) => x.agunan);

    return {
      debitur: unitData.filter((item) =>
        item.agunan.some(
          (x) =>
            ![
              "SUDAH_DISERAHKAN",
              "DIGUNAKAN_PINJAMAN_LAIN",
              "DIGUNAKAN_TOPUP",
            ].includes(x.status),
        ),
      ).length,

      bisa: agunan.filter((x) => x.status === "BISA_DISERAHKAN").length,

      proses: agunan.filter((x) =>
        ["PERLU_ORDER", "PROSES_ORDER", "DI_NOTARIS"].includes(x.status),
      ).length,
    };
  }, [unitCode]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50">
        {/* HEADER */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Archive size={19} />
                  </div>

                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      Agunan Lunas
                    </h1>

                    <p className="mt-0.5 text-xs text-slate-500">{unitLabel}</p>
                  </div>
                </div>
              </div>

              <a
                href="/admin/agunan-lunas/history"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <History size={17} />
                History Penyerahan
              </a>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
          {/* SUMMARY */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Debitur</p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {summary.debitur}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">Bisa Diserahkan</p>

              <p className="mt-2 text-2xl font-bold text-emerald-800">
                {summary.bisa}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs text-amber-700">Masih Proses</p>

              <p className="mt-2 text-2xl font-bold text-amber-800">
                {summary.proses}
              </p>
            </div>
          </div>

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
                placeholder="Cari nama debitur, rekening, atau SHM..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none shadow-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          {/* SIMPLE TABLE */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Agunan Lunas
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Klik nama debitur untuk melihat detail.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {filteredData.length}
                </span>
              </div>
            </div>

            {/* DESKTOP */}
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
                      Status
                    </th>

                    <th className="w-10 px-5 py-3" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <Archive size={28} className="mx-auto text-slate-300" />

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          Tidak ada data
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Tidak ada agunan lunas yang masih perlu ditangani.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => {
                      const aktif = item.agunan.filter(
                        (x) =>
                          ![
                            "SUDAH_DISERAHKAN",
                            "DIGUNAKAN_PINJAMAN_LAIN",
                            "DIGUNAKAN_TOPUP",
                          ].includes(x.status),
                      );

                      const bisa = aktif.some(
                        (x) => x.status === "BISA_DISERAHKAN",
                      );

                      return (
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
                            {bisa ? (
                              <StatusBadge status="BISA_DISERAHKAN" />
                            ) : (
                              <StatusBadge status={aktif[0]?.status} />
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <ChevronRight
                              size={17}
                              className="text-slate-400"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredData.map((item) => {
                const aktif = item.agunan.filter(
                  (x) =>
                    ![
                      "SUDAH_DISERAHKAN",
                      "DIGUNAKAN_PINJAMAN_LAIN",
                      "DIGUNAKAN_TOPUP",
                    ].includes(x.status),
                );

                return (
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
                      <StatusBadge status={aktif[0]?.status} />
                    </div>
                  </button>
                );
              })}

              {filteredData.length === 0 && (
                <div className="px-5 py-16 text-center">
                  <Archive size={28} className="mx-auto text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Tidak ada data
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DETAIL MODAL */}
        <DetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSubmit={(data) => {
            console.log("DATA PENYERAHAN:", data);
            alert(
              "Data penyerahan berhasil disiapkan. Nanti akan disimpan ke Supabase.",
            );
          }}
        />
      </div>
    </DashboardLayout>
  );
}
