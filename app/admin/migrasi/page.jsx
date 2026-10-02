"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  History,
  Info,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Upload,
  X,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";

const DUMMY_USERS = {
  JKK1: {
    maker: {
      nip: "2501838353",
      password: "MakerJKK1@2026",
    },
    checker: {
      nip: "2501838354",
      password: "CheckerJKK1@2026",
    },
  },
  JKK2: {
    maker: {
      nip: "2501838355",
      password: "MakerJKK2@2026",
    },
    checker: {
      nip: "2501838356",
      password: "CheckerJKK2@2026",
    },
  },
};

const INITIAL_PK = [
  {
    id: "PK001",
    nama: "AHMAD FAUZI",
    cif: "9001234567",
    nik: "1501010101010001",
    noPk: "PK/001/2026",
    tglPk: "2026-09-10",
    mks: "MKS JKK1 - ARIF",
    limit: 180000000,
    kondisi: ["PK Baru"],
    migrasi: [],
    penyatuan: false,
  },
  {
    id: "PK002",
    nama: "BUDI SANTOSO",
    cif: "9001234568",
    nik: "1501010101010002",
    noPk: "PK/002/2026",
    tglPk: "2026-09-05",
    mks: "MKS JKK1 - RIZKY",
    limit: 250000000,
    kondisi: ["Legal di CO", "SHM di Notaris", "Perlu Penyatuan"],
    migrasi: [
      {
        jenis: "DMS",
        tanggal: "2026-08-20",
        status: "Selesai",
        keterangan: "Migrasi DMS sebelumnya",
      },
    ],
    penyatuan: true,
  },
  {
    id: "PK003",
    nama: "CITRA LESTARI",
    cif: "9001234569",
    nik: "1501010101010003",
    noPk: "PK/003/2026",
    tglPk: "2026-08-18",
    mks: "MKS JKK1 - ANDI",
    limit: 150000000,
    kondisi: ["Dokumen belum lengkap"],
    migrasi: [],
    penyatuan: false,
  },
  {
    id: "PK004",
    nama: "DARMAN",
    cif: "9001234570",
    nik: "1501010101010004",
    noPk: "PK/004/2026",
    tglPk: "2026-07-10",
    mks: "MKS JKK1 - RAHMAT",
    limit: 320000000,
    kondisi: ["Legal di CO", "SHM di Notaris", "Perlu Penyatuan"],
    migrasi: [
      {
        jenis: "NON-DMS",
        tanggal: "2026-07-25",
        status: "Selesai",
        keterangan: "Migrasi awal NON-DMS",
      },
    ],
    penyatuan: true,
  },
  {
    id: "PK005",
    nama: "ERWIN",
    cif: "9001234571",
    nik: "1501010101010005",
    noPk: "PK/005/2026",
    tglPk: "2026-09-22",
    mks: "MKS JKK1 - ARIF",
    limit: 200000000,
    kondisi: ["PK Baru"],
    migrasi: [
      {
        jenis: "DMS",
        tanggal: "2026-09-25",
        status: "Selesai",
        keterangan: "Migrasi DMS selesai",
      },
    ],
    penyatuan: false,
  },
  {
    id: "PK006",
    nama: "FAHMI",
    cif: "9001234572",
    nik: "1501010101010006",
    noPk: "PK/006/2026",
    tglPk: "2026-08-30",
    mks: "MKS JKK1 - RIZKY",
    limit: 275000000,
    kondisi: ["Legal di CO", "SHM di Notaris"],
    migrasi: [],
    penyatuan: true,
  },
];

const FORMAT_RUPIAH = new Intl.NumberFormat("id-ID");

function formatRupiah(value) {
  return `Rp ${FORMAT_RUPIAH.format(value)}`;
}

function formatTanggal(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getLatestMigration(pk) {
  if (!pk.migrasi?.length) return null;

  return pk.migrasi[pk.migrasi.length - 1];
}

function canSelectForMigration(pk, mode) {
  const latest = getLatestMigration(pk);

  // Belum pernah migrasi → boleh.
  if (!latest) return true;

  // Kalau masih dalam kondisi penyatuan dokumen,
  // boleh migrasi ulang walaupun pernah migrasi.
  if (pk.penyatuan) return true;

  // Sudah migrasi → tidak boleh dipilih lagi.
  return false;
}

function getMigrationState(pk) {
  const latest = getLatestMigration(pk);

  if (!latest) {
    return {
      label: "Belum Migrasi",
      type: "warning",
    };
  }

  if (pk.penyatuan) {
    return {
      label: "Perlu Migrasi Ulang",
      type: "info",
    };
  }

  return {
    label: `Sudah ${latest.jenis}`,
    type: "success",
  };
}

function PasswordField({ label, value }) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <input
          type={show ? "text" : "password"}
          value={value}
          readOnly
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none"
        />

        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-800"
          title={show ? "Sembunyikan password" : "Lihat password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function UserCredentialCard({ type, data }) {
  const isMaker = type === "Maker";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isMaker
                ? "bg-blue-50 text-blue-600"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {isMaker ? (
              <Truck className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">User {type}</h3>
            <p className="text-xs text-slate-500">Credential migrasi unit</p>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            isMaker
              ? "bg-blue-50 text-blue-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {type.toUpperCase()}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">
            NIP
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">
            {data.nip}
          </div>
        </div>

        <PasswordField label="Password" value={data.password} />
      </div>
    </div>
  );
}

function StatusBadge({ state }) {
  if (state.type === "warning") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
        <Clock3 className="h-3.5 w-3.5" />
        {state.label}
      </span>
    );
  }

  if (state.type === "info") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
        <RefreshCw className="h-3.5 w-3.5" />
        {state.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
      <Check className="h-3.5 w-3.5" />
      {state.label}
    </span>
  );
}

function MigrationHistory({ pk }) {
  const [open, setOpen] = useState(false);

  if (!pk.migrasi?.length) {
    return <span className="text-xs text-slate-400">Belum ada riwayat</span>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
      >
        <History className="h-3.5 w-3.5" />
        {pk.migrasi.length} riwayat
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {pk.migrasi.map((item, index) => (
            <div
              key={`${pk.id}-${index}`}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
                  {item.jenis}
                </span>

                <span className="text-[10px] text-slate-500">
                  {formatTanggal(item.tanggal)}
                </span>
              </div>

              <p className="mt-2 text-xs font-medium text-slate-700">
                {item.keterangan}
              </p>

              <div className="mt-1 text-[10px] text-slate-500">
                Status: {item.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailModal({ pk, onClose }) {
  if (!pk) return null;

  const latest = getLatestMigration(pk);
  const state = getMigrationState(pk);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Detail PK</h2>
            <p className="text-xs text-slate-500">{pk.noPk}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900">{pk.nama}</p>
                <p className="text-xs text-slate-500">
                  CIF {pk.cif} · NIK {pk.nik}
                </p>
              </div>

              <StatusBadge state={state} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBox label="No. PK" value={pk.noPk} />
            <InfoBox label="Tanggal PK" value={formatTanggal(pk.tglPk)} />
            <InfoBox label="MKS" value={pk.mks} />
            <InfoBox label="Limit" value={formatRupiah(pk.limit)} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-900">
              Kondisi yang terdeteksi
            </h3>

            <div className="flex flex-wrap gap-2">
              {pk.kondisi.map((item) => (
                <span
                  key={item}
                  className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {latest && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-900">
                Migrasi terakhir
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBox label="Jenis" value={latest.jenis} />
                <InfoBox
                  label="Tanggal"
                  value={formatTanggal(latest.tanggal)}
                />
                <InfoBox label="Status" value={latest.status} />
                <InfoBox label="Keterangan" value={latest.keterangan} />
              </div>
            </div>
          )}

          {pk.penyatuan && (
            <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

              <div>
                <p className="text-sm font-bold text-blue-900">
                  Dapat dimigrasikan ulang
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  PK ini masih memiliki proses penyatuan dokumen/agunan. Karena
                  itu, meskipun sudah pernah dimigrasikan, sistem tetap
                  memperbolehkan PK dipilih kembali.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default function MigrasiPage() {
  const { selectedUnit } = useUnit();

  const unitCode =
    selectedUnit?.kode_unit ||
    selectedUnit?.kodeUnit ||
    selectedUnit?.kode ||
    "JKK1";

  const unit = unitCode === "JKK2" ? "JKK2" : "JKK1";

  const [mode, setMode] = useState("DMS");
  const [search, setSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState("SEMUA");
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailPk, setDetailPk] = useState(null);
  const [templateModal, setTemplateModal] = useState(false);

  const users = DUMMY_USERS[unit];

  const filteredData = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return INITIAL_PK.filter((pk) => {
      const latest = getLatestMigration(pk);

      /*
       * Yang sudah selesai dan tidak ada kebutuhan penyatuan
       * tidak ditampilkan di halaman utama.
       */
      if (latest && !pk.penyatuan) {
        return false;
      }

      const searchable = [pk.nama, pk.cif, pk.nik, pk.noPk, pk.mks]
        .join(" ")
        .toLowerCase();

      if (keyword && !searchable.includes(keyword)) {
        return false;
      }

      if (
        conditionFilter !== "SEMUA" &&
        !pk.kondisi.includes(conditionFilter)
      ) {
        return false;
      }

      return true;
    });
  }, [search, conditionFilter]);

  const selectableData = filteredData.filter((pk) =>
    canSelectForMigration(pk, mode),
  );

  const allSelectableSelected =
    selectableData.length > 0 &&
    selectableData.every((pk) => selectedIds.includes(pk.id));

  const selectedData = filteredData.filter((pk) => selectedIds.includes(pk.id));

  function toggleSelect(pk) {
    if (!canSelectForMigration(pk, mode)) return;

    setSelectedIds((prev) =>
      prev.includes(pk.id)
        ? prev.filter((id) => id !== pk.id)
        : [...prev, pk.id],
    );
  }

  function toggleSelectAll() {
    if (allSelectableSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !selectableData.some((pk) => pk.id === id)),
      );
      return;
    }

    setSelectedIds((prev) => [
      ...new Set([...prev, ...selectableData.map((pk) => pk.id)]),
    ]);
  }

  function changeMode(nextMode) {
    setMode(nextMode);

    /*
     * Pilihan PK dipertahankan kalau PK memang masih valid
     * untuk mode yang baru.
     */
    setSelectedIds((prev) =>
      prev.filter((id) => {
        const pk = INITIAL_PK.find((item) => item.id === id);
        return pk && canSelectForMigration(pk, nextMode);
      }),
    );
  }

  function handleDmsExport() {
    if (!selectedData.length) return;

    const headers = [
      "NO",
      "NAMA DEBITUR",
      "CIF",
      "NIK",
      "NO PK",
      "TGL PK",
      "MKS",
      "LIMIT",
      "KONDISI",
      "STATUS MIGRASI",
    ];

    const rows = selectedData.map((pk, index) => [
      index + 1,
      pk.nama,
      pk.cif,
      pk.nik,
      pk.noPk,
      pk.tglPk,
      pk.mks,
      pk.limit,
      pk.kondisi.join("; "),
      getMigrationState(pk).label,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `Migrasi_DMS_${unit}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
          {/* HEADER */}
          <div className="mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <Truck className="h-5 w-5" />
                  </div>

                  <div>
                    <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                      Migrasi
                    </h1>
                    <p className="text-xs text-slate-500">
                      Pengelolaan data migrasi {unit}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm">
                <span className="text-slate-500">Unit aktif</span>{" "}
                <span className="font-bold text-slate-900">{unit}</span>
              </div>
            </div>
          </div>

          {/* MAKER CHECKER */}
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <UserCredentialCard type="Maker" data={users.maker} />
            <UserCredentialCard type="Checker" data={users.checker} />
          </div>

          {/* MODE */}
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => changeMode("DMS")}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  mode === "DMS"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Migrasi DMS
              </button>

              <button
                type="button"
                onClick={() => changeMode("NON-DMS")}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  mode === "NON-DMS"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Upload className="h-4 w-4" />
                Migrasi NON-DMS
              </button>
            </div>
          </div>

          {/* INFO */}
          <div className="mb-5 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div className="text-xs leading-5 text-blue-800">
              <p className="font-bold">
                {mode === "DMS" ? "Migrasi DMS" : "Migrasi NON-DMS"}
              </p>

              <p>
                Pilih PK yang akan dimigrasikan. PK yang sudah pernah migrasi
                tidak dapat dipilih kembali, kecuali masih memiliki kebutuhan
                penyatuan dokumen/agunan.
              </p>
            </div>
          </div>

          {/* FILTER */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_240px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, CIF, NIK, No PK, atau MKS..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="SEMUA">Semua kondisi</option>
                <option value="PK Baru">PK Baru</option>
                <option value="Dokumen belum lengkap">
                  Dokumen belum lengkap
                </option>
                <option value="Legal di CO">Legal di CO</option>
                <option value="SHM di Notaris">SHM di Notaris</option>
                <option value="Perlu Penyatuan">Perlu Penyatuan</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setConditionFilter("SEMUA");
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="PK ditampilkan" value={filteredData.length} />

            <SummaryCard label="Bisa dipilih" value={selectableData.length} />

            <SummaryCard label="Dipilih" value={selectedIds.length} active />

            <SummaryCard label="Mode" value={mode} textValue />
          </div>

          {/* ACTION */}
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={!selectableData.length}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {allSelectableSelected ? "Batalkan Semua" : "Pilih Semua"}
            </button>

            <div className="flex flex-col gap-2 sm:flex-row">
              {mode === "DMS" ? (
                <button
                  type="button"
                  onClick={handleDmsExport}
                  disabled={!selectedIds.length}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setTemplateModal(true)}
                  disabled={!selectedIds.length}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Isi Template
                </button>
              )}
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1250px] w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="w-12 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        onChange={toggleSelectAll}
                        disabled={!selectableData.length}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </th>

                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Debitur
                    </th>

                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      CIF / NIK
                    </th>

                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      PK
                    </th>

                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      MKS
                    </th>

                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Limit
                    </th>

                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Kondisi
                    </th>

                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Riwayat
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                      Detail
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((pk) => {
                    const selectable = canSelectForMigration(pk, mode);
                    const checked = selectedIds.includes(pk.id);
                    const state = getMigrationState(pk);

                    return (
                      <tr
                        key={pk.id}
                        className={`transition ${
                          checked ? "bg-blue-50/60" : "hover:bg-slate-50/70"
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!selectable}
                            onChange={() => toggleSelect(pk)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-slate-900">
                            {pk.nama}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {pk.tglPk ? formatTanggal(pk.tglPk) : "-"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-xs font-semibold text-slate-700">
                            {pk.cif}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {pk.nik}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-xs font-semibold text-slate-700">
                            {pk.noPk}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatTanggal(pk.tglPk)}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-xs font-medium text-slate-700">
                          {pk.mks}
                        </td>

                        <td className="px-4 py-4 text-xs font-bold text-slate-800">
                          {formatRupiah(pk.limit)}
                        </td>

                        <td className="max-w-[230px] px-4 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {pk.kondisi.map((item) => (
                              <span
                                key={item}
                                className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <StatusBadge state={state} />

                            {pk.penyatuan && (
                              <p className="text-[10px] font-medium text-blue-600">
                                Dapat migrasi ulang
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <MigrationHistory pk={pk} />
                        </td>

                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => setDetailPk(pk)}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            title="Lihat detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {!filteredData.length && (
                    <tr>
                      <td colSpan={10} className="px-6 py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Search className="h-5 w-5" />
                          </div>

                          <p className="text-sm font-bold text-slate-700">
                            Tidak ada PK
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Tidak ada data yang memenuhi filter migrasi saat
                            ini.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE SELECTED BAR */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-4 left-4 right-4 z-40 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedIds.length} PK dipilih
                  </p>

                  <p className="text-[10px] text-slate-500">Mode {mode}</p>
                </div>

                {mode === "DMS" ? (
                  <button
                    type="button"
                    onClick={handleDmsExport}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white"
                  >
                    Export Excel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTemplateModal(true)}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white"
                  >
                    Isi Template
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      <DetailModal pk={detailPk} onClose={() => setDetailPk(null)} />

      {/* TEMPLATE MODAL */}
      {templateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Template NON-DMS
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedIds.length} PK akan dimasukkan ke template.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTemplateModal(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-blue-600" />

              <p className="mt-3 text-sm font-bold text-slate-800">
                Template Excel belum terhubung
              </p>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Nanti template Excel NON-DMS yang Anda berikan akan digunakan
                sistem untuk mengisi data PK yang dicentang secara otomatis.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setTemplateModal(false)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function SummaryCard({ label, value, active, textValue }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        active ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-bold ${
          active ? "text-blue-700" : "text-slate-900"
        }`}
      >
        {textValue ? value : value}
      </p>
    </div>
  );
}
