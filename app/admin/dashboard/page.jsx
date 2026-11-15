"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  Copy,
  FileCheck,
  FileText,
  Lightbulb,
  Package,
  Pencil,
  Truck,
  Wallet,
  X,
  RefreshCw,
  Building2,
  Clock3,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Handshake,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* =========================================================
   MENU
========================================================= */

const works = [
  {
    label: "Pending Order",
    description: "Order agunan menunggu proses",
    icon: Package,
    href: "/admin/order-agunan",
  },
  {
    label: "Pending Migrasi",
    description: "Agunan atau dokumen dalam proses migrasi",
    icon: Truck,
    href: "/admin/migrasi",
  },
  {
    label: "Pending Notaris",
    description: "Menunggu proses notaris",
    icon: FileCheck,
    href: "/admin/pending-notaris",
  },
  {
    label: "Pemeriksaan",
    description: "PK yang memerlukan pemeriksaan",
    icon: ClipboardCheck,
    href: "/admin/pemeriksaan",
  },
];

/* =========================================================
   HELPER
========================================================= */

function formatTanggal(date = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatWaktu(date = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatAngka(value) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("id-ID").format(value);
}

function formatRupiah(value) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/* =========================================================
   MODAL
========================================================= */

function Modal({ title, children, onClose, width = "max-w-lg" }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className={`w-full ${width} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* =========================================================
   KARTU STATISTIK
========================================================= */

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  color,
  loading,
  href,
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    red: "bg-red-50 text-red-700",
    cyan: "bg-cyan-50 text-cyan-700",
    slate: "bg-slate-100 text-slate-700",
  };

  const content = (
    <div className="flex h-full items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
          {loading ? (
            <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-100" />
          ) : (
            value
          )}
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
      </div>

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          colors[color] || colors.emerald
        }`}
      >
        <Icon size={21} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {content}
    </div>
  );
}

/* =========================================================
   DASHBOARD ADMIN
========================================================= */

export default function AdminDashboardPage() {
  /* -------------------- JAM -------------------- */

  const [now, setNow] = useState(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());

    updateClock();

    const timer = setInterval(updateClock, 1000);

    return () => clearInterval(timer);
  }, []);

  /* -------------------- IDENTITAS -------------------- */

  const [identity, setIdentity] = useState({
    nama: "",
    namaCabang: "",
    namaUnit: "",
    kodeUnit: "",
    unitId: null,
  });

  const [identityLoading, setIdentityLoading] = useState(true);
  const [identityError, setIdentityError] = useState("");

  /* -------------------- STATISTIK -------------------- */

  const [stats, setStats] = useState({
    totalPK: null,
    pkBulanIni: null,
    pkAktif: null,
    pkLunas: null,
    agunanLunas: null,
    agunanDiserahkan: null,
    bastFinal: null,
    pendingOrder: null,
    pendingMigrasi: null,
    pendingNotaris: null,
  });

  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  /* -------------------- PK TERBARU -------------------- */

  const [latestPK, setLatestPK] = useState([]);
  const [latestPKLoading, setLatestPKLoading] = useState(true);

  /* -------------------- MEMO -------------------- */

  const [memo, setMemo] = useState("");
  const [memoLoading, setMemoLoading] = useState(true);
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [memoEditMode, setMemoEditMode] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");

  /* -------------------- LISTRIK -------------------- */

  const [electricityCustomers, setElectricityCustomers] = useState([]);
  const [electricityLoading, setElectricityLoading] = useState(true);
  const [electricitySaving, setElectricitySaving] = useState(false);
  const [electricityModalOpen, setElectricityModalOpen] = useState(false);
  const [selectedElectricity, setSelectedElectricity] = useState(null);
  const [electricityDraftName, setElectricityDraftName] = useState("");
  const [electricityDraftId, setElectricityDraftId] = useState("");

  /* =====================================================
     LOAD IDENTITAS
  ===================================================== */

  const loadIdentity = useCallback(async () => {
    setIdentityLoading(true);
    setIdentityError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Sesi login tidak ditemukan.");
      }

      const { data: pengguna, error: penggunaError } = await supabase
        .from("pengguna")
        .select("id, pegawai_id, unit_id, role, aktif")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (penggunaError) throw penggunaError;

      if (!pengguna) {
        throw new Error("Data pengguna tidak ditemukan.");
      }

      let pegawaiId = pengguna.pegawai_id || null;
      let unitId = pengguna.unit_id || null;
      let nama = "";

      if (pegawaiId) {
        const { data: pegawai, error: pegawaiError } = await supabase
          .from("pegawai")
          .select("id, nama, unit_id")
          .eq("id", pegawaiId)
          .maybeSingle();

        if (pegawaiError) throw pegawaiError;

        if (pegawai) {
          nama = pegawai.nama || "";
          unitId = unitId || pegawai.unit_id || null;
        }
      }

      let namaUnit = "";
      let kodeUnit = "";
      let namaCabang = "";

      if (unitId) {
        const { data: unit, error: unitError } = await supabase
          .from("unit")
          .select("id, nama_unit, kode_unit, cabang_id")
          .eq("id", unitId)
          .maybeSingle();

        if (unitError) throw unitError;

        if (unit) {
          namaUnit = unit.nama_unit || "";
          kodeUnit = unit.kode_unit || "";

          if (unit.cabang_id) {
            const { data: cabang, error: cabangError } = await supabase
              .from("cabang")
              .select("id, nama_cabang")
              .eq("id", unit.cabang_id)
              .maybeSingle();

            if (cabangError) throw cabangError;

            namaCabang = cabang?.nama_cabang || "";
          }
        }
      }

      setIdentity({
        nama,
        namaCabang,
        namaUnit,
        kodeUnit,
        unitId,
      });
    } catch (error) {
      console.error("Gagal memuat identitas:", error);

      setIdentityError(error?.message || "Identitas gagal dimuat.");
    } finally {
      setIdentityLoading(false);
    }
  }, []);

  /* =====================================================
     LOAD STATISTIK OPERASIONAL

     Semua statistik difilter berdasarkan unit_id.

     PK:
     - pk
     - tanggal_pk
     - status_pk

     AGUNAN:
     - agunan_lunas_data
     - serah_terima_agunan_lunas
     - bast_agunan_lunas

     ORDER/MIGRASI:
     - pk_agunan.status_order
     - pk_agunan.status_migrasi

     NOTARIS:
     - agunan_pengikatan
  ===================================================== */

  const loadDashboardData = useCallback(async (unitId) => {
    if (!unitId) {
      setStatsLoading(false);
      setLatestPKLoading(false);

      setStatsError(
        "Unit kerja belum ditentukan. Statistik tidak ditampilkan agar data antarunit tidak tercampur.",
      );

      return;
    }

    setStatsLoading(true);
    setLatestPKLoading(true);
    setStatsError("");

    try {
      const jakartaNow = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "Asia/Jakarta",
        }),
      );

      const year = jakartaNow.getFullYear();
      const month = jakartaNow.getMonth();

      const startMonth = `${year}-${String(month + 1).padStart(2, "0")}-01`;

      const nextMonthDate = new Date(year, month + 1, 1);

      const nextMonth = `${nextMonthDate.getFullYear()}-${String(
        nextMonthDate.getMonth() + 1,
      ).padStart(2, "0")}-01`;

      // Helper hitung jumlah data
      async function countRows(query) {
        const { count, error } = await query;

        if (error) throw error;

        return count ?? 0;
      }

      /* ---------------- PK ---------------- */

      const totalPKPromise = countRows(
        supabase
          .from("pk")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", unitId),
      );

      const pkBulanIniPromise = countRows(
        supabase
          .from("pk")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", unitId)
          .gte("tanggal_pk", startMonth)
          .lt("tanggal_pk", nextMonth),
      );

      const pkAktifPromise = countRows(
        supabase
          .from("pk")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", unitId)
          .eq("status_pk", "AKTIF"),
      );

      const pkLunasPromise = countRows(
        supabase
          .from("pk")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", unitId)
          .eq("status_pk", "LUNAS"),
      );

      /* ---------------- AGUNAN LUNAS ---------------- */

      const agunanLunasPromise = countRows(
        supabase
          .from("agunan_lunas_data")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", unitId),
      );

      const agunanDiserahkanPromise = countRows(
        supabase
          .from("serah_terima_agunan_lunas")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", unitId),
      );

      const bastFinalPromise = countRows(
        supabase
          .from("bast_agunan_lunas")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", unitId)
          .eq("status", "FINAL"),
      );

      /* ---------------- PENDING ORDER ---------------- */

      const pendingOrderPromise = countRows(
        supabase
          .from("pk_agunan")
          .select("id, pk!inner(unit_id)", {
            count: "exact",
            head: true,
          })
          .eq("pk.unit_id", unitId)
          .in("status_order", ["PERLU_ORDER", "DALAM_PROSES"]),
      );

      /* ---------------- PENDING MIGRASI ---------------- */

      const pendingMigrasiPromise = countRows(
        supabase
          .from("pk_agunan")
          .select("id, pk!inner(unit_id)", {
            count: "exact",
            head: true,
          })
          .eq("pk.unit_id", unitId)
          .in("status_migrasi", ["PERLU_MIGRASI", "DALAM_PROSES"]),
      );

      /* ---------------- PENDING NOTARIS ---------------- */

      const pendingNotarisPromise = countRows(
        supabase
          .from("agunan_pengikatan")
          .select("id, pk_agunan!inner(pk!inner(unit_id))", {
            count: "exact",
            head: true,
          })
          .eq("pk_agunan.pk.unit_id", unitId)
          .in("status", ["BELUM_DIPROSES", "DALAM_PROSES"]),
      );

      /* ---------------- PK TERBARU ---------------- */

      const latestPKPromise = supabase
        .from("pk")
        .select(
          `
          id,
          nama_debitur,
          nomor_pk,
          tanggal_pk,
          limit_kredit,
          jenis_pengajuan_kredit,
          status_pk
        `,
        )
        .eq("unit_id", unitId)
        .order("tanggal_pk", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(5);

      /* ---------------- JALANKAN SEMUA ---------------- */

      const [
        totalPK,
        pkBulanIni,
        pkAktif,
        pkLunas,
        agunanLunas,
        agunanDiserahkan,
        bastFinal,
        pendingOrder,
        pendingMigrasi,
        pendingNotaris,
        latestPKResult,
      ] = await Promise.all([
        totalPKPromise,
        pkBulanIniPromise,
        pkAktifPromise,
        pkLunasPromise,
        agunanLunasPromise,
        agunanDiserahkanPromise,
        bastFinalPromise,
        pendingOrderPromise,
        pendingMigrasiPromise,
        pendingNotarisPromise,
        latestPKPromise,
      ]);

      if (latestPKResult.error) {
        throw latestPKResult.error;
      }

      setStats({
        totalPK,
        pkBulanIni,
        pkAktif,
        pkLunas,
        agunanLunas,
        agunanDiserahkan,
        bastFinal,
        pendingOrder,
        pendingMigrasi,
        pendingNotaris,
      });

      setLatestPK(latestPKResult.data || []);
    } catch (error) {
      console.error("Gagal memuat statistik dashboard:", error);

      setStatsError(
        error?.message ||
          "Statistik dashboard gagal dimuat. Periksa izin akses Supabase.",
      );
    } finally {
      setStatsLoading(false);
      setLatestPKLoading(false);
    }
  }, []);

  /* =====================================================
     LOAD MEMO
  ===================================================== */

  const loadMemo = useCallback(async () => {
    setMemoLoading(true);

    try {
      const { data, error } = await supabase
        .from("dashboard_settings")
        .select("id, memo")
        .eq("id", 1)
        .maybeSingle();

      if (error) throw error;

      setMemo(data?.memo || "");
    } catch (error) {
      console.error("Gagal mengambil memo:", error);
    } finally {
      setMemoLoading(false);
    }
  }, []);

  /* =====================================================
     LOAD LISTRIK
  ===================================================== */

  const loadElectricity = useCallback(async () => {
    setElectricityLoading(true);

    try {
      const { data, error } = await supabase
        .from("dashboard_electricity_customers")
        .select("id, customer_name, customer_id, sort_order")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      setElectricityCustomers(data || []);
    } catch (error) {
      console.error("Gagal mengambil data listrik:", error);
      setElectricityCustomers([]);
    } finally {
      setElectricityLoading(false);
    }
  }, []);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadIdentity();
    loadMemo();
    loadElectricity();
  }, [loadIdentity, loadMemo, loadElectricity]);

  /* =====================================================
     LOAD STATISTIK SETELAH IDENTITAS TERSEDIA
  ===================================================== */

  useEffect(() => {
    if (identityLoading) return;

    loadDashboardData(identity.unitId);
  }, [identity.unitId, identityLoading, loadDashboardData]);

  /* =====================================================
     REFRESH DASHBOARD
  ===================================================== */

  const refreshDashboard = useCallback(() => {
    if (identity.unitId) {
      loadDashboardData(identity.unitId);
    } else {
      loadIdentity();
    }
  }, [identity.unitId, loadDashboardData, loadIdentity]);

  /* =====================================================
     MEMO
  ===================================================== */

  function openMemoModal() {
    setMemoDraft(memo);
    setMemoEditMode(false);
    setMemoModalOpen(true);
  }

  async function saveMemo() {
    setMemoSaving(true);

    try {
      const { data, error } = await supabase
        .from("dashboard_settings")
        .update({
          memo: memoDraft,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Memo tidak diperbarui. Periksa data id = 1 dan izin database.",
        );
      }

      setMemo(memoDraft);
      setMemoEditMode(false);
    } catch (error) {
      console.error("Gagal menyimpan memo:", error);
      alert(error?.message || "Memo gagal disimpan.");
    } finally {
      setMemoSaving(false);
    }
  }

  /* =====================================================
     LISTRIK
  ===================================================== */

  function openElectricityModal(customer) {
    setSelectedElectricity(customer);
    setElectricityDraftName(customer.customer_name || "");
    setElectricityDraftId(customer.customer_id || "");
    setElectricityModalOpen(true);
  }

  function closeElectricityModal() {
    if (electricitySaving) return;

    setElectricityModalOpen(false);
    setSelectedElectricity(null);
  }

  async function saveElectricity() {
    if (!selectedElectricity) return;

    const customerName = electricityDraftName.trim();
    const customerId = electricityDraftId.trim();

    if (!customerName || !customerId) {
      alert("Nama pelanggan dan IDPEL wajib diisi.");
      return;
    }

    setElectricitySaving(true);

    try {
      const { data, error } = await supabase
        .from("dashboard_electricity_customers")
        .update({
          customer_name: customerName,
          customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedElectricity.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Data listrik tidak diperbarui. Periksa izin database.",
        );
      }

      setElectricityCustomers((current) =>
        current.map((item) =>
          item.id === selectedElectricity.id
            ? {
                ...item,
                customer_name: customerName,
                customer_id: customerId,
              }
            : item,
        ),
      );

      setElectricityModalOpen(false);
      setSelectedElectricity(null);
    } catch (error) {
      console.error("Gagal menyimpan data listrik:", error);
      alert(error?.message || "Data listrik gagal disimpan.");
    } finally {
      setElectricitySaving(false);
    }
  }

  async function copyElectricityId(customerId) {
    if (!customerId) {
      alert("IDPEL belum tersedia.");
      return;
    }

    try {
      await navigator.clipboard.writeText(customerId);
      alert("IDPEL berhasil disalin.");
    } catch (error) {
      console.error("Gagal menyalin IDPEL:", error);
      alert("IDPEL gagal disalin.");
    }
  }

  function getMemoPreview() {
    if (!memo.trim()) return "Belum ada memo.";

    return memo.length > 140 ? `${memo.slice(0, 140)}...` : memo;
  }

  /* =====================================================
     TAMPILAN
  ===================================================== */

  return (
    <div className="min-h-full space-y-6 bg-slate-50/60 pb-8">
      {/* HEADER */}

      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium">
              <Activity size={14} />
              JOSJIS · ADMINISTRATOR
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Dashboard Admin
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
              Pantau aktivitas operasional, statistik PK, pengelolaan agunan,
              memo, dan pengingat pembayaran dari satu halaman.
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-white/15 bg-white/10 p-4 xl:min-w-[300px]">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/10 p-2.5">
                <Building2 size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-emerald-100">Cabang</p>

                <p className="mt-1 break-words text-sm font-bold">
                  {identityLoading
                    ? "Memuat cabang..."
                    : identity.namaCabang || "Cabang belum tersedia"}
                </p>

                <p className="mt-2 text-xs text-emerald-100">Unit kerja</p>

                <p className="mt-0.5 break-words text-sm font-semibold">
                  {identityLoading
                    ? "Memuat unit..."
                    : [identity.kodeUnit, identity.namaUnit]
                        .filter(Boolean)
                        .join(" · ") || "Unit belum ditentukan"}
                </p>
              </div>

              <button
                type="button"
                onClick={loadIdentity}
                disabled={identityLoading}
                title="Muat ulang identitas"
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={identityLoading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {identityError && (
              <div className="mt-3 flex gap-2 rounded-lg bg-red-950/20 p-2.5 text-xs leading-5 text-red-100">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{identityError}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-50">
            <CalendarDays size={17} />
            <span>{now ? formatTanggal(now) : "Memuat tanggal..."}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-100">
            <Clock3 size={15} />
            <span>{now ? `${formatWaktu(now)} WIB` : "Memuat waktu..."}</span>
            <span className="rounded-full bg-white/10 px-2 py-1">
              Waktu Jakarta
            </span>
          </div>
        </div>
      </section>

      {/* STATISTIK PK */}

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Statistik Operasional
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Data aktual berdasarkan unit kerja yang sedang ditampilkan.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshDashboard}
            disabled={statsLoading || identityLoading}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={statsLoading ? "animate-spin" : ""}
            />
            Perbarui Statistik
          </button>
        </div>

        {statsError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{statsError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total PK"
            value={formatAngka(stats.totalPK)}
            description="Seluruh PK pada unit kerja"
            icon={Wallet}
            color="emerald"
            loading={statsLoading}
            href="/admin/pk"
          />

          <StatCard
            label="PK Bulan Ini"
            value={formatAngka(stats.pkBulanIni)}
            description="Berdasarkan tanggal PK bulan berjalan"
            icon={CalendarDays}
            color="blue"
            loading={statsLoading}
            href="/admin/pk"
          />

          <StatCard
            label="PK Aktif"
            value={formatAngka(stats.pkAktif)}
            description="Pinjaman dengan status aktif"
            icon={Activity}
            color="cyan"
            loading={statsLoading}
            href="/admin/pk"
          />

          <StatCard
            label="PK Lunas"
            value={formatAngka(stats.pkLunas)}
            description="Pinjaman yang telah lunas"
            icon={CheckCircle2}
            color="emerald"
            loading={statsLoading}
            href="/admin/pk"
          />

          <StatCard
            label="Data Agunan Lunas"
            value={formatAngka(stats.agunanLunas)}
            description="Data debitur/pinjaman pada daftar agunan lunas"
            icon={ShieldCheck}
            color="amber"
            loading={statsLoading}
            href="/admin/agunan-lunas"
          />

          <StatCard
            label="Agunan Diserahkan"
            value={formatAngka(stats.agunanDiserahkan)}
            description="Catatan penyerahan agunan lunas"
            icon={Handshake}
            color="blue"
            loading={statsLoading}
          />

          <StatCard
            label="BAST Final"
            value={formatAngka(stats.bastFinal)}
            description="BAST agunan lunas yang telah final"
            icon={FileCheck}
            color="violet"
            loading={statsLoading}
            href="/admin/agunan-lunas"
          />

          <StatCard
            label="Pending Order"
            value={formatAngka(stats.pendingOrder)}
            description="Agunan yang perlu order atau sedang diproses"
            icon={Package}
            color="amber"
            loading={statsLoading}
            href="/admin/order-agunan"
          />

          <StatCard
            label="Pending Migrasi"
            value={formatAngka(stats.pendingMigrasi)}
            description="Agunan yang perlu atau sedang migrasi"
            icon={Truck}
            color="violet"
            loading={statsLoading}
            href="/admin/migrasi"
          />

          <StatCard
            label="Pending Notaris"
            value={formatAngka(stats.pendingNotaris)}
            description="Pengikatan yang belum selesai diproses"
            icon={FileText}
            color="red"
            loading={statsLoading}
            href="/admin/pending-notaris"
          />
        </div>
      </section>

      {/* MEMO DAN LISTRIK */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* MEMO */}

        <button
          type="button"
          onClick={openMemoModal}
          className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Lightbulb size={21} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">Memo</h2>

                <p className="mt-1 text-xs text-slate-500">
                  Catatan penting bersama
                </p>
              </div>
            </div>

            <ArrowUpRight
              size={18}
              className="text-slate-300 transition group-hover:text-amber-700"
            />
          </div>

          <div className="mt-4 min-h-[76px] rounded-xl bg-slate-50 p-3">
            {memoLoading ? (
              <p className="text-xs text-slate-400">Memuat memo...</p>
            ) : (
              <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">
                {getMemoPreview()}
              </p>
            )}
          </div>

          <p className="mt-3 text-xs font-semibold text-amber-700">
            Buka dan kelola memo
          </p>
        </button>

        {/* LISTRIK */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Activity size={21} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Pembayaran Listrik
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Pengingat pembayaran setiap tanggal 5
                </p>
              </div>
            </div>

            <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">
              {electricityLoading
                ? "Memuat..."
                : `${electricityCustomers.length} IDPEL`}
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
            {electricityLoading ? (
              <div className="p-4 text-xs text-slate-400">
                Memuat data pelanggan...
              </div>
            ) : electricityCustomers.length === 0 ? (
              <div className="p-4 text-xs leading-5 text-slate-500">
                Belum ada data pelanggan listrik, atau data tidak dapat diakses.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {electricityCustomers.slice(0, 4).map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => openElectricityModal(customer)}
                    className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {customer.customer_name || "-"}
                      </p>

                      <p className="mt-1 truncate font-mono text-[11px] text-slate-400">
                        {customer.customer_id || "-"}
                      </p>
                    </div>

                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-slate-300 group-hover:text-blue-700"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            Pilih pelanggan untuk mengubah nama atau IDPEL.
          </p>
        </div>
      </section>

      {/* MY WORK */}

      <section>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">My Work</h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Akses cepat ke pekerjaan operasional yang memerlukan perhatian.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {works.map((item) => {
            const Icon = item.icon;

            const pendingValue =
              item.label === "Pending Order"
                ? stats.pendingOrder
                : item.label === "Pending Migrasi"
                  ? stats.pendingMigrasi
                  : item.label === "Pending Notaris"
                    ? stats.pendingNotaris
                    : null;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
                    <Icon size={21} />
                  </div>

                  {pendingValue !== null && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                      {statsLoading ? "..." : formatAngka(pendingValue)}
                    </span>
                  )}

                  {pendingValue === null && (
                    <ArrowUpRight
                      size={18}
                      className="text-slate-300 transition group-hover:text-emerald-700"
                    />
                  )}
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-800">
                  {item.label}
                </h3>

                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>

                <p className="mt-4 text-xs font-semibold text-emerald-700">
                  Buka halaman
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* DATA PK TERBARU */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Data PK Terbaru
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Lima data PK terakhir berdasarkan tanggal PK.
            </p>
          </div>

          <Link
            href="/admin/pk"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Lihat semua PK
            <ArrowUpRight size={15} />
          </Link>
        </div>

        {latestPKLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : latestPK.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FileText size={23} />
            </div>

            <h3 className="mt-4 text-sm font-bold text-slate-800">
              Belum ada data PK
            </h3>

            <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
              Belum terdapat data PK pada unit kerja ini.
            </p>

            <Link
              href="/admin/pk"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-900"
            >
              Buka Data PK
              <ArrowUpRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Debitur</th>
                  <th className="px-5 py-3">Nomor PK</th>
                  <th className="px-5 py-3">Tanggal PK</th>
                  <th className="px-5 py-3">Jenis Kredit</th>
                  <th className="px-5 py-3">Limit Kredit</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {latestPK.map((pk) => (
                  <tr key={pk.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-slate-800">
                        {pk.nama_debitur || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {pk.nomor_pk || "-"}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      {pk.tanggal_pk
                        ? new Intl.DateTimeFormat("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Jakarta",
                          }).format(new Date(`${pk.tanggal_pk}T12:00:00+07:00`))
                        : "-"}
                    </td>

                    <td className="px-5 py-4 text-xs font-medium text-slate-600">
                      {pk.jenis_pengajuan_kredit || "-"}
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold text-slate-700">
                      {formatRupiah(pk.limit_kredit)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          pk.status_pk === "LUNAS"
                            ? "bg-emerald-50 text-emerald-700"
                            : pk.status_pk === "AKTIF"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {pk.status_pk || "BELUM DITENTUKAN"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FOOTER */}

      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <span>JOSJIS · Sistem Informasi Operasional Mikro</span>

        <span>
          {now ? `Diperbarui ${formatWaktu(now)} WIB` : "Memuat waktu..."}
        </span>
      </footer>

      {/* MODAL MEMO */}

      {memoModalOpen && (
        <Modal
          title="Memo Dashboard"
          onClose={() => {
            if (!memoSaving) setMemoModalOpen(false);
          }}
          width="max-w-xl"
        >
          {!memoEditMode ? (
            <div className="space-y-5">
              <div className="min-h-28 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {memo ? (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {memo}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">Belum ada memo.</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMemoDraft(memo);
                    setMemoEditMode(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  <Pencil size={14} />
                  Edit Memo
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={memoDraft}
                onChange={(event) => setMemoDraft(event.target.value)}
                rows={7}
                autoFocus
                placeholder="Tulis memo atau informasi penting..."
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={memoSaving}
                  onClick={() => {
                    setMemoDraft(memo);
                    setMemoEditMode(false);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={memoSaving}
                  onClick={saveMemo}
                  className="rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  {memoSaving ? "Menyimpan..." : "Simpan Memo"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* MODAL LISTRIK */}

      {electricityModalOpen && selectedElectricity && (
        <Modal
          title="Edit Pelanggan Listrik"
          onClose={closeElectricityModal}
          width="max-w-md"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Nama Pelanggan
              </label>

              <input
                type="text"
                value={electricityDraftName}
                onChange={(event) =>
                  setElectricityDraftName(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Nomor IDPEL
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={electricityDraftId}
                onChange={(event) => setElectricityDraftId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
              Pengingat pembayaran listrik setiap tanggal 5.
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => copyElectricityId(electricityDraftId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Copy size={14} />
                Salin IDPEL
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={electricitySaving}
                  onClick={closeElectricityModal}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={electricitySaving}
                  onClick={saveElectricity}
                  className="flex-1 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 sm:flex-none"
                >
                  {electricitySaving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
