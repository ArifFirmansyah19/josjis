"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  FileArchive,
  FileCheck2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";

/* =========================================================
   CHECKLIST
========================================================= */

const CHECKLIST_ITEMS = [
  {
    id: "pk",
    title: "Data PK",
    description: "Data Perjanjian Kredit cabang lama sudah disalin.",
  },
  {
    id: "agunan",
    title: "Data Agunan",
    description: "Data agunan dan dokumen jaminan sudah disalin.",
  },
  {
    id: "agunan_lunas",
    title: "Data Agunan Lunas",
    description: "Data agunan pinjaman lunas sudah disalin.",
  },
  {
    id: "migrasi",
    title: "Data Migrasi",
    description: "Riwayat migrasi DMS dan NON-DMS sudah disalin.",
  },
  {
    id: "order_agunan",
    title: "Order Agunan",
    description: "Data order dan proses pengambilan agunan sudah disalin.",
  },
  {
    id: "pending_notaris",
    title: "Pending Notaris",
    description: "Data pending pengikatan notaris sudah disalin.",
  },
  {
    id: "surat_keluar",
    title: "Surat Keluar",
    description: "Data buku surat keluar cabang sudah disalin.",
  },
  {
    id: "bast",
    title: "BAST",
    description: "Data dokumen BAST dan riwayatnya sudah disalin.",
  },
  {
    id: "raportmu",
    title: "RaportMU",
    description: "Data operasional RaportMU sudah disalin.",
  },
  {
    id: "advis",
    title: "Advis",
    description: "Data advis yang diperlukan sudah disalin.",
  },
  {
    id: "audit_log",
    title: "Audit Log",
    description: "Audit log cabang lama sudah diarsipkan.",
  },
  {
    id: "backup",
    title: "Backup Lengkap",
    description: "Backup lengkap JOSJIS sudah dibuat dan dapat diakses.",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getUnitName(activeUnit) {
  return activeUnit?.nama_unit || activeUnit?.nama || "Unit aktif";
}

function getUnitCode(activeUnit) {
  return (
    activeUnit?.kode_unit || activeUnit?.kode || activeUnit?.kode_legacy || "-"
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function PindahCabangPage() {
  const { activeUnit } = useUnit();

  const [checkedItems, setCheckedItems] = useState({});
  const [verified, setVerified] = useState(false);

  const [showChecklist, setShowChecklist] = useState(true);
  const [showDanger, setShowDanger] = useState(true);

  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const [showFinalModal, setShowFinalModal] = useState(false);

  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [finalConfirmed, setFinalConfirmed] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const unitName = getUnitName(activeUnit);
  const unitCode = getUnitCode(activeUnit);

  /* =======================================================
     CHECKLIST STATE
  ======================================================= */

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  const allChecked = checkedCount === CHECKLIST_ITEMS.length;

  const progress = Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100);

  const resetReady = allChecked && verified;

  function toggleChecklist(id) {
    if (verified) return;

    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function checkAll() {
    if (verified) return;

    const next = {};

    CHECKLIST_ITEMS.forEach((item) => {
      next[item.id] = true;
    });

    setCheckedItems(next);
  }

  function uncheckAll() {
    if (verified) return;

    setCheckedItems({});
  }

  /* =======================================================
     VERIFICATION
  ======================================================= */

  function openVerification() {
    if (!allChecked) {
      alert("Semua checklist harus dicentang terlebih dahulu.");
      return;
    }

    setShowVerificationModal(true);
  }

  function handleVerification() {
    if (!adminUsername.trim()) {
      alert("Username admin wajib diisi.");
      return;
    }

    if (!adminPassword) {
      alert("Password admin wajib diisi.");
      return;
    }

    /*
      PROTOTYPE:
      Belum melakukan autentikasi ke Supabase Auth.
      Nantinya verifikasi menggunakan akun admin yang
      sedang login / Supabase Auth.
    */

    setVerified(true);
    setShowVerificationModal(false);

    setAdminPassword("");
  }

  /* =======================================================
     FINAL RESET
  ======================================================= */

  function openFinalModal() {
    if (!resetReady) {
      alert("JOSJIS belum memenuhi seluruh persyaratan reset.");
      return;
    }

    setConfirmationText("");
    setFinalConfirmed(false);
    setShowFinalModal(true);
  }

  function handleFinalReset() {
    if (confirmationText !== "KOSONGKAN JOSJIS") {
      alert('Ketik persis "KOSONGKAN JOSJIS" untuk melanjutkan.');
      return;
    }

    if (!finalConfirmed) {
      alert("Centang konfirmasi bahwa seluruh data sudah disalin.");
      return;
    }

    /*
      PROTOTYPE ONLY

      Belum melakukan penghapusan database.

      Pada implementasi sebenarnya:
      - server-side transaction
      - verifikasi Supabase Auth
      - verifikasi role SUPERADMIN/ADMIN
      - audit log sebelum reset
      - backup verification
      - delete/truncate hanya tabel operasional
      - struktur database tetap
      - master/configuration tertentu tetap
    */

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setShowFinalModal(false);

      alert("Prototype: proses reset belum dijalankan ke database.");
    }, 1000);
  }

  /* =======================================================
     STATUS
  ======================================================= */

  const statusText = useMemo(() => {
    if (resetReady) {
      return "SIAP UNTUK RESET";
    }

    if (verified) {
      return "VERIFIKASI ADMIN BERHASIL";
    }

    if (allChecked) {
      return "MENUNGGU VERIFIKASI ADMIN";
    }

    return "BELUM SIAP";
  }, [resetReady, verified, allChecked]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* =================================================
              HEADER
          ================================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-900 p-3 text-white">
                  <Archive className="h-5 w-5" />
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Pindah Cabang
                  </h1>

                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                    Persiapan untuk mengosongkan data operasional JOSJIS sebelum
                    digunakan di cabang baru.
                  </p>
                </div>
              </div>

              <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Database className="h-4 w-4 text-slate-500" />

                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Unit Aktif
                  </div>

                  <div className="text-xs font-bold text-slate-800">
                    {unitCode}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              CABANG LAMA
          ================================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between p-4 sm:p-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Cabang / Unit Saat Ini
                </div>

                <div className="mt-1 text-lg font-bold text-slate-900">
                  {unitName}
                </div>

                <div className="mt-0.5 text-xs text-slate-500">
                  Kode unit: {unitCode}
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <FileArchive className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* =================================================
              CHECKLIST
          ================================================== */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowChecklist((prev) => !prev)}
              className="flex w-full items-center justify-between p-4 text-left sm:p-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-blue-600" />

                  <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                    Checklist Penyalinan Data
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Pastikan seluruh data cabang lama sudah disalin sebelum JOSJIS
                  dikosongkan.
                </p>
              </div>

              {showChecklist ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>

            {showChecklist && (
              <div className="border-t border-slate-100">
                {/* PROGRESS */}
                <div className="border-b border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">
                      Progress
                    </span>

                    <span className="font-bold text-slate-900">
                      {checkedCount}/{CHECKLIST_ITEMS.length}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-2 text-[10px] text-slate-400">
                    {progress}% checklist selesai
                  </div>
                </div>

                {/* CHECKLIST */}
                <div className="divide-y divide-slate-100">
                  {CHECKLIST_ITEMS.map((item, index) => {
                    const checked = Boolean(checkedItems[item.id]);

                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => toggleChecklist(item.id)}
                        disabled={verified}
                        className={`flex w-full items-start gap-3 p-4 text-left transition ${
                          verified ? "cursor-default" : "hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                            checked
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <span className="text-xs font-bold text-slate-800">
                              {item.title}
                            </span>
                          </div>

                          <p className="mt-1 text-[10px] leading-4 text-slate-500">
                            {item.description}
                          </p>
                        </div>

                        {checked && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* CHECKLIST ACTION */}
                {!verified && (
                  <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={checkAll}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Centang Semua
                    </button>

                    <button
                      type="button"
                      onClick={uncheckAll}
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-white"
                    >
                      <X className="h-4 w-4" />
                      Hapus Semua Centang
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =================================================
              VERIFICATION STATUS
          ================================================== */}

          <div
            className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
              verified
                ? "border-emerald-200 bg-emerald-50"
                : allChecked
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-xl p-3 ${
                    verified
                      ? "bg-emerald-100 text-emerald-600"
                      : allChecked
                        ? "bg-blue-100 text-blue-600"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {verified ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : (
                    <UserCheck className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Verifikasi
                  </div>

                  <h2 className="mt-1 text-sm font-bold text-slate-900">
                    {statusText}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {verified
                      ? `Admin ${adminUsername} telah melakukan verifikasi.`
                      : allChecked
                        ? "Seluruh checklist sudah selesai. Verifikasi admin diperlukan."
                        : "Selesaikan seluruh checklist terlebih dahulu."}
                  </p>
                </div>
              </div>

              {!verified && (
                <button
                  type="button"
                  onClick={openVerification}
                  disabled={!allChecked}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                    allChecked
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "cursor-not-allowed bg-slate-200 text-slate-400"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Verifikasi Admin
                </button>
              )}
            </div>
          </div>

          {/* =================================================
              DANGER ZONE
          ================================================== */}

          <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowDanger((prev) => !prev)}
              className="flex w-full items-center justify-between bg-red-50 p-4 text-left sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-red-100 p-3 text-red-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-red-900 sm:text-base">
                    Zona Reset JOSJIS
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    Area ini digunakan untuk mengosongkan data operasional
                    cabang lama.
                  </p>
                </div>
              </div>

              {showDanger ? (
                <ChevronUp className="h-5 w-5 text-red-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-red-400" />
              )}
            </button>

            {showDanger && (
              <div className="p-4 sm:p-5">
                {/* WARNING */}
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                    <div>
                      <h3 className="text-xs font-bold text-red-900">
                        Perhatian
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-red-700">
                        Proses reset akan mengosongkan data operasional JOSJIS
                        yang ditentukan untuk proses pindah cabang.
                      </p>
                    </div>
                  </div>
                </div>

                {/* WHAT REMAINS */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                      <span className="text-xs font-bold text-emerald-800">
                        Tetap dipertahankan
                      </span>
                    </div>

                    <ul className="mt-3 space-y-2 text-[10px] leading-4 text-emerald-700">
                      <li>• Struktur tabel database</li>
                      <li>• Relasi dan foreign key</li>
                      <li>• Konfigurasi sistem</li>
                      <li>• Struktur aplikasi</li>
                      <li>• RLS / policy database</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-600" />

                      <span className="text-xs font-bold text-red-800">
                        Akan dikosongkan
                      </span>
                    </div>

                    <ul className="mt-3 space-y-2 text-[10px] leading-4 text-red-700">
                      <li>• Data operasional cabang lama</li>
                      <li>• Transaksi dan proses lama</li>
                      <li>• Data PK sesuai cakupan reset</li>
                      <li>• Data agunan sesuai cakupan reset</li>
                      <li>• Data proses operasional lainnya</li>
                    </ul>
                  </div>
                </div>

                {/* FINAL STATUS */}
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-xl p-2.5 ${
                        resetReady
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {resetReady ? (
                        <ShieldCheck className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Status Reset
                      </div>

                      <div className="mt-1 text-sm font-bold text-slate-800">
                        {resetReady
                          ? "Reset dapat diverifikasi"
                          : "Reset masih terkunci"}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        {resetReady
                          ? "Checklist dan verifikasi admin telah selesai."
                          : "Checklist lengkap dan verifikasi admin diperlukan."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RESET BUTTON */}
                <button
                  type="button"
                  onClick={openFinalModal}
                  disabled={!resetReady}
                  className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition ${
                    resetReady
                      ? "bg-red-600 text-white shadow-sm hover:bg-red-700"
                      : "cursor-not-allowed bg-slate-200 text-slate-400"
                  }`}
                >
                  {resetReady ? (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Kosongkan JOSJIS
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Kosongkan JOSJIS — Terkunci
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* =================================================
              INFO
          ================================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex gap-3">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

              <div>
                <div className="text-xs font-bold text-slate-700">
                  Kondisi setelah reset
                </div>

                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                  JOSJIS akan tetap memiliki struktur database dan aplikasi.
                  Setelah digunakan di cabang baru, data dapat disusun kembali
                  dari awal sesuai kebutuhan cabang tersebut.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          ADMIN VERIFICATION MODAL
      ====================================================== */}

      {showVerificationModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Verifikasi Admin
                  </h3>

                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    Masukkan kredensial admin untuk melanjutkan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVerificationModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Username Admin
                </label>

                <input
                  type="text"
                  value={adminUsername}
                  onChange={(event) => setAdminUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="Username admin"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Password Admin
                </label>

                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Password admin"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                  <p className="text-[10px] leading-5 text-amber-700">
                    Pada implementasi final, kredensial akan diverifikasi
                    melalui sistem autentikasi JOSJIS, bukan pemeriksaan di
                    browser.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-200 bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => setShowVerificationModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleVerification}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Verifikasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          FINAL RESET MODAL
      ====================================================== */}

      {showFinalModal && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-red-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="border-b border-red-100 bg-red-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-red-100 p-3 text-red-600">
                  <ShieldAlert className="h-6 w-6" />
                </div>

                <div className="flex-1">
                  <h3 className="text-base font-bold text-red-900">
                    Konfirmasi Final
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    Anda akan memulai proses pengosongan JOSJIS untuk persiapan
                    cabang baru.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFinalModal(false)}
                  className="rounded-lg p-2 text-red-400 hover:bg-red-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="text-xs font-bold text-red-900">
                  Tindakan ini bersifat destruktif.
                </div>

                <ul className="mt-2 space-y-1.5 text-[10px] leading-4 text-red-700">
                  <li>
                    • Data operasional yang masuk cakupan reset akan
                    dikosongkan.
                  </li>

                  <li>• Struktur database tidak dihapus.</li>

                  <li>• Tabel dan relasi database tetap ada.</li>

                  <li>
                    • Data yang sudah diarsipkan menjadi tanggung jawab admin.
                  </li>
                </ul>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Ketik:
                </label>

                <div className="mb-2 rounded-lg bg-slate-100 px-3 py-2 text-center font-mono text-xs font-bold tracking-wide text-slate-700">
                  KOSONGKAN JOSJIS
                </div>

                <input
                  type="text"
                  value={confirmationText}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  placeholder="Ketik KOSONGKAN JOSJIS"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-medium outline-none focus:border-red-400 focus:bg-white"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  checked={finalConfirmed}
                  onChange={(event) => setFinalConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />

                <span className="text-[10px] leading-5 text-slate-600">
                  Saya telah memastikan seluruh data cabang lama yang diperlukan
                  sudah disalin/diarsipkan dan memahami bahwa proses reset akan
                  mengosongkan data operasional JOSJIS sesuai cakupan reset.
                </span>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowFinalModal(false)}
                disabled={isProcessing}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleFinalReset}
                disabled={
                  isProcessing ||
                  confirmationText !== "KOSONGKAN JOSJIS" ||
                  !finalConfirmed
                }
                className={`flex-1 rounded-xl px-4 py-3 text-xs font-bold text-white transition ${
                  isProcessing ||
                  confirmationText !== "KOSONGKAN JOSJIS" ||
                  !finalConfirmed
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshIcon />
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Kosongkan JOSJIS
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* =========================================================
   SMALL LOADING ICON
========================================================= */

function RefreshIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="42 20"
      />
    </svg>
  );
}
