"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import {
  Archive,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  History,
  Info,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  X,
  CheckCircle2,
  Clock3,
  HardDrive,
  Users,
  ClipboardList,
  FileArchive,
} from "lucide-react";

/* =========================================================
   DUMMY DATA
   NANTI DIGANTI DENGAN DATA BACKUP SEBENARNYA
========================================================= */

const DUMMY_BACKUPS = [
  {
    id: 1,
    nama: "Backup JOSJIS JKK1",
    unit: "JKK1",
    tanggal: "2026-09-30 17:42",
    ukuran: "8,4 MB",
    jenis: "FULL BACKUP",
    dibuatOleh: "Superadmin",
    status: "Berhasil",
    file: "josjis-backup-jkk1-2026-09-30.zip",
  },
  {
    id: 2,
    nama: "Export Data PK JKK1",
    unit: "JKK1",
    tanggal: "2026-09-30 15:21",
    ukuran: "1,8 MB",
    jenis: "EXPORT",
    dibuatOleh: "Superadmin",
    status: "Berhasil",
    file: "pk-jkk1-2026-09-30.xlsx",
  },
  {
    id: 3,
    nama: "Backup JOSJIS JKK2",
    unit: "JKK2",
    tanggal: "2026-09-29 17:15",
    ukuran: "7,9 MB",
    jenis: "FULL BACKUP",
    dibuatOleh: "Superadmin",
    status: "Berhasil",
    file: "josjis-backup-jkk2-2026-09-29.zip",
  },
];

/* =========================================================
   EXPORT MENU
========================================================= */

const EXPORT_ITEMS = [
  {
    id: "pk",
    title: "Data PK",
    description: "Data Perjanjian Kredit dan informasi debitur.",
    icon: ClipboardList,
  },
  {
    id: "agunan",
    title: "Data Agunan",
    description: "Data SHM, legal, pengikatan, loker dan status agunan.",
    icon: HardDrive,
  },
  {
    id: "migrasi",
    title: "Data Migrasi",
    description: "Riwayat dan status migrasi DMS / NON-DMS.",
    icon: RefreshCw,
  },
  {
    id: "order",
    title: "Order Agunan",
    description: "Data order agunan dan proses pengembaliannya.",
    icon: Archive,
  },
  {
    id: "notaris",
    title: "Pending Notaris",
    description: "Data pengikatan dan proses yang masih di notaris.",
    icon: FileText,
  },
  {
    id: "pegawai",
    title: "Master Pegawai",
    description: "Data pegawai berdasarkan unit aktif.",
    icon: Users,
  },
  {
    id: "audit",
    title: "Audit Log",
    description: "Riwayat aktivitas pengguna dalam sistem.",
    icon: History,
  },
];

/* =========================================================
   PAGE
========================================================= */

export default function BackupExportPage() {
  const { activeUnit } = useUnit();

  const [activeTab, setActiveTab] = useState("backup");

  const [backups, setBackups] = useState(DUMMY_BACKUPS);

  const [search, setSearch] = useState("");

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const [backupType, setBackupType] = useState("FULL");

  const [selectedExport, setSelectedExport] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [message, setMessage] = useState("");

  const unitCode =
    activeUnit?.kode_unit ||
    activeUnit?.kode ||
    activeUnit?.nama_unit ||
    "JKK1";

  /* =======================================================
     FILTER BACKUP
  ======================================================= */

  const filteredBackups = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return backups.filter((item) => {
      const unitMatch =
        unitCode === "JKK1" || unitCode === "JKK2"
          ? item.unit === unitCode
          : true;

      const searchMatch =
        !keyword ||
        item.nama.toLowerCase().includes(keyword) ||
        item.file.toLowerCase().includes(keyword) ||
        item.jenis.toLowerCase().includes(keyword);

      return unitMatch && searchMatch;
    });
  }, [backups, search, unitCode]);

  /* =======================================================
     CREATE BACKUP
  ======================================================= */

  function handleCreateBackup() {
    setBackingUp(true);
    setMessage("");

    setTimeout(() => {
      const now = new Date();

      const dateText = now
        .toLocaleString("id-ID", {
          dateStyle: "short",
          timeStyle: "short",
        })
        .replace(",", "");

      const newBackup = {
        id: Date.now(),
        nama:
          backupType === "FULL"
            ? `Backup JOSJIS ${unitCode}`
            : `Backup Data ${unitCode}`,
        unit: unitCode,
        tanggal: dateText,
        ukuran: "Sedang diproses",
        jenis: backupType === "FULL" ? "FULL BACKUP" : "DATA BACKUP",
        dibuatOleh: "Superadmin",
        status: "Berhasil",
        file: `josjis-${unitCode.toLowerCase()}-${Date.now()}.zip`,
      };

      setBackups((prev) => [newBackup, ...prev]);

      setBackingUp(false);
      setShowBackupModal(false);

      setMessage(
        "Backup berhasil dibuat. Pada tahap berikutnya file akan disimpan ke penyimpanan backup JOSJIS.",
      );
    }, 800);
  }

  /* =======================================================
     EXPORT
  ======================================================= */

  function handleExport(item) {
    setSelectedExport(item);
    setExporting(true);
    setMessage("");

    setTimeout(() => {
      setExporting(false);

      setMessage(
        `Export ${item.title} ${unitCode} selesai. File siap diunduh setelah koneksi database/export engine diaktifkan.`,
      );
    }, 800);
  }

  /* =======================================================
     RESTORE
  ======================================================= */

  function handleRestore() {
    setRestoring(true);
    setMessage("");

    setTimeout(() => {
      setRestoring(false);
      setShowRestoreModal(false);

      setMessage(
        "Fitur restore sudah disiapkan. Proses restore database akan diaktifkan setelah mekanisme backup Supabase ditentukan.",
      );
    }, 800);
  }

  /* =======================================================
     DOWNLOAD PLACEHOLDER
  ======================================================= */

  function handleDownload(item) {
    setMessage(`Menyiapkan file ${item.file}...`);

    setTimeout(() => {
      setMessage(
        "Download file akan terhubung ke penyimpanan backup setelah backend diaktifkan.",
      );
    }, 400);
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <DashboardLayout>
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-6">
          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <Database className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Backup & Export
                </h1>

                <p className="text-xs text-slate-500 sm:text-sm">
                  Cadangkan dan keluarkan data JOSJIS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                {unitCode}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setMessage("");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* =================================================
              MESSAGE
          ================================================= */}

          {message && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

              <div className="flex-1 text-xs leading-5 text-emerald-800 sm:text-sm">
                {message}
              </div>

              <button
                type="button"
                onClick={() => setMessage("")}
                className="text-emerald-500 hover:text-emerald-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* =================================================
              TABS
          ================================================= */}

          <div className="mb-5 flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("backup")}
              className={`flex min-w-[130px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "backup"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Archive className="h-4 w-4" />
              Backup
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("export")}
              className={`flex min-w-[130px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "export"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Download className="h-4 w-4" />
              Export Data
            </button>
          </div>

          {/* =================================================
              BACKUP TAB
          ================================================= */}

          {activeTab === "backup" && (
            <>
              {/* BACKUP ACTION */}

              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                        Backup Data JOSJIS
                      </h2>

                      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                        Buat salinan data sistem untuk menjaga keamanan dan
                        memudahkan pemulihan apabila diperlukan.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBackupModal(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                  >
                    <Archive className="h-4 w-4" />
                    Buat Backup
                  </button>
                </div>
              </section>

              {/* INFO CARDS */}

              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryCard
                  icon={Archive}
                  label="Backup Tersimpan"
                  value={filteredBackups.length}
                />

                <SummaryCard icon={Database} label="Unit" value={unitCode} />

                <SummaryCard
                  icon={HardDrive}
                  label="Backup Terakhir"
                  value={
                    filteredBackups.length > 0
                      ? filteredBackups[0].tanggal
                      : "-"
                  }
                  small
                />

                <SummaryCard icon={ShieldCheck} label="Status" value="Aman" />
              </div>

              {/* HISTORY */}

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                      Riwayat Backup
                    </h2>

                    <p className="text-xs text-slate-500">
                      Backup yang pernah dibuat untuk unit aktif.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari backup..."
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* DESKTOP */}

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[850px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                        <th className="px-5 py-3 font-bold">Backup</th>
                        <th className="px-5 py-3 font-bold">Tanggal</th>
                        <th className="px-5 py-3 font-bold">Jenis</th>
                        <th className="px-5 py-3 font-bold">Ukuran</th>
                        <th className="px-5 py-3 font-bold">Dibuat Oleh</th>
                        <th className="px-5 py-3 font-bold">Status</th>
                        <th className="px-5 py-3 text-right font-bold">Aksi</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredBackups.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <FolderArchive className="h-4 w-4" />
                              </div>

                              <div>
                                <div className="text-xs font-bold text-slate-800">
                                  {item.nama}
                                </div>

                                <div className="mt-0.5 text-[10px] text-slate-400">
                                  {item.file}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-600">
                            {item.tanggal}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                              {item.jenis}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-600">
                            {item.ukuran}
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-600">
                            {item.dibuatOleh}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={item.status} />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDownload(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE */}

                <div className="space-y-2 p-3 md:hidden">
                  {filteredBackups.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <FolderArchive className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800">
                            {item.nama}
                          </div>

                          <div className="mt-1 break-all text-[10px] text-slate-400">
                            {item.file}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <MobileMeta label="Tanggal" value={item.tanggal} />

                            <MobileMeta label="Ukuran" value={item.ukuran} />

                            <MobileMeta label="Jenis" value={item.jenis} />

                            <MobileMeta
                              label="Dibuat"
                              value={item.dibuatOleh}
                            />
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <StatusBadge status={item.status} />

                            <button
                              type="button"
                              onClick={() => handleDownload(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredBackups.length === 0 && (
                    <EmptyState text="Belum ada backup." />
                  )}
                </div>
              </section>

              {/* RESTORE */}

              <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Upload className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="text-sm font-bold text-amber-900">
                        Restore Data
                      </div>

                      <p className="mt-1 text-xs leading-5 text-amber-800">
                        Restore dapat mengganti data yang sedang digunakan.
                        Fitur ini sebaiknya hanya tersedia untuk Superadmin.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowRestoreModal(true)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 text-xs font-bold text-amber-800 hover:bg-amber-100"
                  >
                    <Upload className="h-4 w-4" />
                    Restore
                  </button>
                </div>
              </section>
            </>
          )}

          {/* =================================================
              EXPORT TAB
          ================================================= */}

          {activeTab === "export" && (
            <>
              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                      Export Data
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                      Pilih jenis data yang ingin dikeluarkan. Data mengikuti
                      unit aktif di Topbar.
                    </p>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {EXPORT_ITEMS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleExport(item)}
                      disabled={exporting}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/20 disabled:cursor-wait disabled:opacity-60 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-100 group-hover:text-blue-600">
                          <Icon className="h-5 w-5" />
                        </div>

                        <Download className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500" />
                      </div>

                      <div className="mt-4 text-sm font-bold text-slate-900">
                        {item.title}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {unitCode}
                        </span>

                        <span className="text-[11px] font-bold text-blue-600">
                          Export
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* EXPORT ALL */}

              <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                      <FileArchive className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="text-sm font-bold text-blue-900">
                        Export Semua Data
                      </div>

                      <p className="mt-1 text-xs leading-5 text-blue-800">
                        Membuat satu paket ZIP berisi seluruh data yang tersedia
                        untuk unit aktif.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleExport({
                        id: "all",
                        title: "Semua Data",
                      })
                    }
                    disabled={exporting}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    <FileArchive className="h-4 w-4" />
                    Export Semua
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          BACKUP MODAL
      ===================================================== */}

      {showBackupModal && (
        <Modal
          title="Buat Backup"
          description={`Backup data untuk unit ${unitCode}.`}
          onClose={() => setShowBackupModal(false)}
        >
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setBackupType("FULL")}
              className={`w-full rounded-xl border p-4 text-left ${
                backupType === "FULL"
                  ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <Archive className="mt-0.5 h-5 w-5 text-blue-600" />

                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Full Backup
                  </div>

                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    Seluruh data JOSJIS yang terkait dengan unit aktif.
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBackupType("DATA")}
              className={`w-full rounded-xl border p-4 text-left ${
                backupType === "DATA"
                  ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 h-5 w-5 text-emerald-600" />

                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Data Backup
                  </div>

                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    Backup data operasional tanpa konfigurasi sistem.
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

              <p className="text-xs leading-5 text-slate-500">
                Backup produksi nantinya akan menggunakan backend/storage, bukan
                hanya menyimpan data di browser.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowBackupModal(false)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={backingUp}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {backingUp ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Membuat Backup...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Buat Backup
                </>
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* =====================================================
          RESTORE MODAL
      ===================================================== */}

      {showRestoreModal && (
        <Modal
          title="Restore Data"
          description="Pilih file backup yang akan digunakan."
          onClose={() => setShowRestoreModal(false)}
        >
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-slate-400" />

            <div className="mt-3 text-sm font-bold text-slate-700">
              Upload file backup
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              File ZIP backup JOSJIS akan digunakan untuk proses restore.
            </p>

            <input
              type="file"
              accept=".zip,.json,.xlsx,.csv"
              className="mt-4 block w-full text-xs text-slate-500"
            />
          </div>

          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

              <p className="text-xs leading-5 text-red-700">
                Restore dapat mengganti data yang sudah ada. Pada versi
                produksi, tindakan ini harus dikonfirmasi oleh Superadmin.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowRestoreModal(false)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleRestore}
              disabled={restoring}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {restoring ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Restore
                </>
              )}
            </button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SummaryCard({ icon: Icon, label, value, small = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div
        className={`mt-1 font-bold text-slate-900 ${
          small ? "text-xs" : "text-base sm:text-lg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const success = status === "Berhasil";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
        success
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {success ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Clock3 className="h-3 w-3" />
      )}

      {status}
    </span>
  );
}

function MobileMeta({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-0.5 truncate text-[10px] font-semibold text-slate-600">
        {value || "-"}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
      <Database className="h-8 w-8 text-slate-300" />

      <div className="mt-3 text-sm font-semibold text-slate-600">{text}</div>
    </div>
  );
}

function Modal({ title, description, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>

            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
