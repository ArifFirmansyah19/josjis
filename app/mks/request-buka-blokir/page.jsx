"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FilePlus2,
  FileText,
  LockKeyhole,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function getJakartaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getCurrentMonth() {
  return getJakartaDate().slice(0, 7);
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return String(value);
  return `${Number(day)} ${MONTHS[Number(month) - 1] || ""} ${year}`;
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function emptyForm() {
  return {
    tanggal: getJakartaDate(),
    nama_debitur: "",
    nomor_rekening_pinjaman: "",
    nomor_rekening_tabungan: "",
    blokiran_awal: "",
    blokiran_dibuka: "",
    dikembalikan: "",
    tujuan_bb: "",
  };
}

function isLocked(row) {
  return Boolean(
    row?.dikunci_admin || row?.is_locked || row?.terkunci || row?.locked_at,
  );
}

function StatusBadge({ value }) {
  const done = value === "DONE";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-bold ${
        done
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
      }`}
    >
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <Clock3 className="h-3.5 w-3.5" />
      )}
      {done ? "Selesai" : "Belum"}
    </span>
  );
}

function SummaryCard({ label, value, description, icon: Icon, theme }) {
  const themes = {
    blue: {
      icon: "bg-blue-100 text-blue-700",
      accent: "bg-blue-500",
      glow: "bg-blue-100/70",
    },
    amber: {
      icon: "bg-amber-100 text-amber-700",
      accent: "bg-amber-400",
      glow: "bg-amber-100/70",
    },
    emerald: {
      icon: "bg-emerald-100 text-emerald-700",
      accent: "bg-emerald-500",
      glow: "bg-emerald-100/70",
    },
    indigo: {
      icon: "bg-indigo-100 text-indigo-700",
      accent: "bg-indigo-500",
      glow: "bg-indigo-100/70",
    },
  };

  const color = themes[theme] || themes.blue;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${color.accent}`} />
      <div
        className={`pointer-events-none absolute -right-5 -top-6 h-24 w-24 rounded-full blur-2xl ${color.glow}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 break-words text-2xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ${color.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  min,
  step,
  hint,
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70"
      />
      {hint && (
        <span className="mt-1.5 block text-xs leading-5 text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function InfoItem({ label, children, wide = false }) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1.5 break-words text-sm font-semibold leading-6 text-slate-800">
        {children || "-"}
      </div>
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/70 bg-white shadow-2xl sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default function RequestBukaBlokirPage() {
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(getCurrentMonth);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("SEMUA");

  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ bulan: month });
      const response = await fetch(
        `/api/request-buka-blokir?${params.toString()}`,
        { method: "GET", cache: "no-store" },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal memuat riwayat request.");
      }

      setRows(Array.isArray(result.rows) ? result.rows : []);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat mengambil data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !keyword ||
        [
          row.nama_debitur,
          row.nomor_rekening_pinjaman,
          row.nomor_rekening_tabungan,
          row.tujuan_bb,
          row.nama_mks,
          row.pemohon_nama,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
        );

      const matchesStatus =
        statusFilter === "SEMUA" ||
        (statusFilter === "BELUM_DIBUKA" && row.status_dibuka !== "DONE") ||
        (statusFilter === "BELUM_KEMBALI" &&
          row.status_pengembalian !== "DONE") ||
        (statusFilter === "SELESAI" &&
          row.status_dibuka === "DONE" &&
          row.status_pengembalian === "DONE");

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      belumDibuka: rows.filter((r) => r.status_dibuka !== "DONE").length,
      belumKembali: rows.filter((r) => r.status_pengembalian !== "DONE").length,
      totalBlokiran: rows.reduce(
        (total, r) => total + Number(r.blokiran_awal || 0),
        0,
      ),
    }),
    [rows],
  );

  const monthLabel = month
    ? `${MONTHS[Number(month.slice(5, 7)) - 1] || ""} ${month.slice(0, 4)}`
    : "-";

  function openCreateForm() {
    setError("");
    setSuccess("");
    setEditingRow(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEditForm(row) {
    if (isLocked(row)) {
      setError("Data ini telah dikunci Admin sehingga tidak dapat diedit.");
      return;
    }

    setError("");
    setSuccess("");
    setEditingRow(row);
    setForm({
      tanggal: String(row.tanggal || "").slice(0, 10),
      nama_debitur: row.nama_debitur || "",
      nomor_rekening_pinjaman: row.nomor_rekening_pinjaman || "",
      nomor_rekening_tabungan: row.nomor_rekening_tabungan || "",
      blokiran_awal: String(row.blokiran_awal ?? ""),
      blokiran_dibuka: String(row.blokiran_dibuka ?? ""),
      dikembalikan: String(row.dikembalikan ?? ""),
      tujuan_bb: row.tujuan_bb || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingRow && isLocked(editingRow)) {
        throw new Error("Data telah dikunci Admin dan tidak dapat diedit.");
      }

      const payload = {
        ...form,
        blokiran_awal: Number(form.blokiran_awal || 0),
        blokiran_dibuka: Number(form.blokiran_dibuka || 0),
        dikembalikan: Number(form.dikembalikan || 0),
      };

      const response = await fetch("/api/request-buka-blokir", {
        method: editingRow ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingRow ? { id: editingRow.id, ...payload } : payload,
        ),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            (editingRow
              ? "Perubahan gagal disimpan."
              : "Request gagal disimpan."),
        );
      }

      const savedMonth = String(
        result.row?.tanggal || form.tanggal || "",
      ).slice(0, 7);

      setShowForm(false);
      setEditingRow(null);
      setForm(emptyForm());
      setSuccess(
        editingRow
          ? "Perubahan request berhasil disimpan."
          : "Request Buka Blokir berhasil dibuat.",
      );

      if (savedMonth && savedMonth !== month) {
        setMonth(savedMonth);
      } else {
        await loadRows();
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="relative isolate mx-auto w-full max-w-[1540px] space-y-6 overflow-hidden px-3 pb-10 pt-3 sm:px-5 sm:pt-5 lg:px-7">
      {/* Background grid dan aksen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute inset-x-0 top-0 h-[440px] opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(100,116,139,.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,.09) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 95%)",
          }}
        />
        <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -left-24 top-72 h-64 w-64 rounded-full bg-indigo-200/20 blur-3xl" />
      </div>

      {/* Header utama */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#102C50] via-[#173D6B] to-[#21558C] p-5 text-white shadow-xl shadow-blue-950/10 sm:p-7 lg:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.28) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -right-4 -top-12 h-44 w-44 rounded-full border border-white/10" />
        <div className="absolute -bottom-24 right-1/4 h-48 w-48 rounded-full bg-blue-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-sm sm:h-14 sm:w-14">
              <Wallet className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-200/20 bg-blue-300/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100">
                  Operasional
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white">
                  MKS
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Request Buka Blokir
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/90 sm:text-[15px]">
                Kelola pengajuan dan pantau proses buka blokir debitur dalam
                satu halaman yang mudah digunakan.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-blue-100/80">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Periode {monthLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Status proses dikelola Admin
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#173D6B] shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/30"
          >
            <FilePlus2 className="h-4 w-4" />
            Buat Request Baru
          </button>
        </div>
      </section>

      {/* Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1 leading-6">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Tutup pesan error"
            className="rounded-lg p-1 hover:bg-rose-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1 leading-6">{success}</p>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Tutup pesan sukses"
            className="rounded-lg p-1 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Ringkasan */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Pengajuan"
          value={summary.total}
          description="Pada bulan yang dipilih"
          icon={FileText}
          theme="blue"
        />
        <SummaryCard
          label="Belum Dibuka"
          value={summary.belumDibuka}
          description="Menunggu proses pembukaan"
          icon={Clock3}
          theme="amber"
        />
        <SummaryCard
          label="Belum Dikembalikan"
          value={summary.belumKembali}
          description="Proses pengembalian belum selesai"
          icon={RefreshCw}
          theme="indigo"
        />
        <SummaryCard
          label="Total Blokiran Awal"
          value={formatRupiah(summary.totalBlokiran)}
          description="Akumulasi nominal pengajuan"
          icon={Wallet}
          theme="emerald"
        />
      </section>

      {/* Daftar */}
      <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm shadow-slate-300/30">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-white to-blue-50/60 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-1 rounded-full bg-blue-600" />
                <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
                  Daftar Pengajuan
                </h2>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-500">
                Cari data debitur, lihat detail, dan pantau status pengajuan.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Periode
                </span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 sm:w-44"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Filter status
                </span>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 sm:w-48"
                  >
                    <option value="SEMUA">Semua status</option>
                    <option value="BELUM_DIBUKA">Belum dibuka</option>
                    <option value="BELUM_KEMBALI">Belum dikembalikan</option>
                    <option value="SELESAI">Semua selesai</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </label>

              <label className="block sm:col-span-2 xl:col-span-1">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Cari pengajuan
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nama atau nomor rekening..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 xl:w-64"
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={loadRows}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Muat ulang
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
          <p className="text-xs text-slate-500">
            Menampilkan{" "}
            <span className="font-extrabold text-slate-800">
              {filteredRows.length}
            </span>{" "}
            dari{" "}
            <span className="font-extrabold text-slate-800">{rows.length}</span>{" "}
            pengajuan
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            {monthLabel}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-600">
              Memuat pengajuan...
            </p>
            <p className="text-xs text-slate-400">
              Data sedang diambil dari server.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-500">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-base font-bold text-slate-800">
              {search || statusFilter !== "SEMUA"
                ? "Pengajuan tidak ditemukan"
                : "Belum ada pengajuan"}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {search || statusFilter !== "SEMUA"
                ? "Coba ubah kata kunci pencarian atau pilih filter status yang lain."
                : "Belum ada request pada periode ini. Buat pengajuan baru untuk memulai."}
            </p>
            {!search && statusFilter === "SEMUA" && (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#173D6B] px-4 text-sm font-bold text-white transition hover:bg-[#102C50]"
              >
                <FilePlus2 className="h-4 w-4" />
                Buat Request Baru
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Tabel desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="px-5 py-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Debitur
                    </th>
                    <th className="px-4 py-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Rekening Tabungan
                    </th>
                    <th className="px-4 py-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Blokiran Awal
                    </th>
                    <th className="px-4 py-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Progres
                    </th>
                    <th className="px-5 py-4 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => {
                    const locked = isLocked(row);
                    const initial = String(row.nama_debitur || "?")
                      .trim()
                      .charAt(0)
                      .toUpperCase();

                    return (
                      <tr
                        key={row.id}
                        className="group transition hover:bg-blue-50/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex min-w-48 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-100 text-sm font-extrabold text-blue-800">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p className="break-words text-sm font-bold text-slate-900">
                                {row.nama_debitur || "-"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {formatDate(row.tanggal)}
                              </p>
                              {locked && (
                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                                  <LockKeyhole className="h-3 w-3" />
                                  Dikunci Admin
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="break-all font-mono text-xs font-medium text-slate-600">
                            {row.nomor_rekening_tabungan || "-"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <p className="text-sm font-extrabold text-slate-900">
                            {formatRupiah(row.blokiran_awal)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Nominal awal
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex min-w-36 flex-col items-start gap-2">
                            <StatusBadge value={row.status_dibuka} />
                            <span className="text-[10px] text-slate-400">
                              Pengembalian
                            </span>
                            <StatusBadge value={row.status_pengembalian} />
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailRow(row)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(row)}
                              disabled={locked}
                              title={
                                locked ? "Data dikunci Admin" : "Edit pengajuan"
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#173D6B] px-3 text-xs font-bold text-white transition hover:bg-[#102C50] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {locked ? (
                                <LockKeyhole className="h-3.5 w-3.5" />
                              ) : (
                                <Pencil className="h-3.5 w-3.5" />
                              )}
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Kartu mobile */}
            <div className="grid gap-3 p-3 sm:p-4 md:hidden">
              {filteredRows.map((row) => {
                const locked = isLocked(row);
                const initial = String(row.nama_debitur || "?")
                  .trim()
                  .charAt(0)
                  .toUpperCase();

                return (
                  <article
                    key={row.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-100 font-extrabold text-blue-800">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-sm font-extrabold text-slate-900">
                            {row.nama_debitur || "-"}
                          </h3>
                          {locked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                              <LockKeyhole className="h-3 w-3" />
                              Terkunci
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400">
                          {formatDate(row.tanggal)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Rekening tabungan
                      </p>
                      <p className="mt-1.5 break-all font-mono text-sm font-semibold text-slate-800">
                        {row.nomor_rekening_tabungan || "-"}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Blokiran awal</p>
                        <p className="mt-1 break-words text-base font-extrabold text-slate-900">
                          {formatRupiah(row.blokiran_awal)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge value={row.status_dibuka} />
                        <StatusBadge value={row.status_pengembalian} />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => setDetailRow(row)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" />
                        Detail
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        disabled={locked}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#173D6B] text-sm font-bold text-white transition hover:bg-[#102C50] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {locked ? (
                          <LockKeyhole className="h-4 w-4" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                        Edit
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Modal buat request / edit */}
      {showForm && (
        <ModalShell
          title={editingRow ? "Edit Request Buka Blokir" : "Buat Request Baru"}
          subtitle={
            editingRow
              ? "Periksa data sebelum menyimpan perubahan."
              : "Lengkapi informasi debitur dan kebutuhan buka blokir."
          }
          onClose={() => {
            if (!saving) {
              setShowForm(false);
              setEditingRow(null);
            }
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="min-h-0 space-y-6 overflow-y-auto p-5 sm:p-6"
          >
            <section>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Informasi pengajuan
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Masukkan identitas debitur dan nomor rekening dengan benar.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Tanggal pengajuan"
                  type="date"
                  value={form.tanggal}
                  onChange={(v) => updateField("tanggal", v)}
                  required
                />
                <FormField
                  label="Nama debitur"
                  value={form.nama_debitur}
                  onChange={(v) => updateField("nama_debitur", v)}
                  placeholder="Masukkan nama debitur"
                  required
                />
                <FormField
                  label="Nomor rekening pinjaman"
                  value={form.nomor_rekening_pinjaman}
                  onChange={(v) => updateField("nomor_rekening_pinjaman", v)}
                  placeholder="Nomor rekening pinjaman"
                  required
                />
                <FormField
                  label="Nomor rekening tabungan"
                  value={form.nomor_rekening_tabungan}
                  onChange={(v) => updateField("nomor_rekening_tabungan", v)}
                  placeholder="Nomor rekening tabungan"
                  required
                />
              </div>
            </section>

            <div className="h-px bg-slate-100" />

            <section>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Informasi nominal
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Masukkan nominal dalam angka tanpa simbol Rp.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  label="Blokiran awal (Rp)"
                  type="number"
                  min="0"
                  step="1"
                  value={form.blokiran_awal}
                  onChange={(v) => updateField("blokiran_awal", v)}
                  placeholder="0"
                />
                <FormField
                  label="Blokiran dibuka (Rp)"
                  type="number"
                  min="0"
                  step="1"
                  value={form.blokiran_dibuka}
                  onChange={(v) => updateField("blokiran_dibuka", v)}
                  placeholder="0"
                />
                <FormField
                  label="Dikembalikan (Rp)"
                  type="number"
                  min="0"
                  step="1"
                  value={form.dikembalikan}
                  onChange={(v) => updateField("dikembalikan", v)}
                  placeholder="0"
                />
              </div>
            </section>

            <div className="h-px bg-slate-100" />

            <section>
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Tujuan buka blokir
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Jelaskan kebutuhan pembukaan blokir secara singkat dan
                    jelas.
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Tujuan BB
                  <span className="ml-1 text-rose-500">*</span>
                </span>
                <textarea
                  value={form.tujuan_bb}
                  onChange={(e) => updateField("tujuan_bb", e.target.value)}
                  placeholder="Tuliskan alasan dan tujuan pembukaan blokir..."
                  rows={4}
                  maxLength={2000}
                  required
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70"
                />
                <div className="mt-1.5 flex justify-between gap-3 text-xs text-slate-400">
                  <span>Pastikan keterangan mudah dipahami.</span>
                  <span className="shrink-0">{form.tujuan_bb.length}/2000</span>
                </div>
              </label>
            </section>

            <div className="flex gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50/70 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <p className="text-sm font-bold text-blue-950">
                  Informasi status pengajuan
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-800">
                  Status pembukaan dan pengembalian dikelola Admin. Request baru
                  akan mengikuti status awal yang ditetapkan oleh backend.
                </p>
              </div>
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingRow(null);
                }}
                disabled={saving}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || Boolean(editingRow && isLocked(editingRow))}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173D6B] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#102C50] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : editingRow ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {saving
                  ? "Menyimpan..."
                  : editingRow
                    ? "Simpan Perubahan"
                    : "Kirim Request"}
              </button>
            </footer>
          </form>
        </ModalShell>
      )}

      {/* Modal detail */}
      {detailRow && (
        <ModalShell
          title="Detail Request Buka Blokir"
          subtitle="Informasi lengkap pengajuan debitur."
          onClose={() => setDetailRow(null)}
        >
          <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#102C50] to-[#21558C] p-5 text-white">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-100">
                    Detail pengajuan
                  </span>
                  {isLocked(detailRow) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
                      <LockKeyhole className="h-3 w-3" />
                      Dikunci Admin
                    </span>
                  )}
                </div>
                <h3 className="mt-3 break-words text-xl font-extrabold">
                  {detailRow.nama_debitur || "-"}
                </h3>
                <p className="mt-1.5 text-sm text-blue-100">
                  Tanggal pengajuan: {formatDate(detailRow.tanggal)}
                </p>
              </div>
            </div>

            <section>
              <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                Informasi debitur
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoItem label="Nama debitur">
                  {detailRow.nama_debitur}
                </InfoItem>
                <InfoItem label="Tanggal pengajuan">
                  {formatDate(detailRow.tanggal)}
                </InfoItem>
                <InfoItem label="Nomor rekening pinjaman">
                  <span className="font-mono">
                    {detailRow.nomor_rekening_pinjaman || "-"}
                  </span>
                </InfoItem>
                <InfoItem label="Nomor rekening tabungan">
                  <span className="font-mono">
                    {detailRow.nomor_rekening_tabungan || "-"}
                  </span>
                </InfoItem>
                <InfoItem label="Pemohon" wide>
                  {detailRow.pemohon_nama || detailRow.nama_mks || "-"}
                </InfoItem>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                Rincian nominal
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-xs font-semibold text-blue-700">
                    Blokiran awal
                  </p>
                  <p className="mt-2 break-words text-base font-extrabold text-slate-900">
                    {formatRupiah(detailRow.blokiran_awal)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-xs font-semibold text-emerald-700">
                    Blokiran dibuka
                  </p>
                  <p className="mt-2 break-words text-base font-extrabold text-slate-900">
                    {formatRupiah(detailRow.blokiran_dibuka)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                  <p className="text-xs font-semibold text-amber-700">
                    Dikembalikan
                  </p>
                  <p className="mt-2 break-words text-base font-extrabold text-slate-900">
                    {formatRupiah(detailRow.dikembalikan)}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                Tujuan buka blokir
              </h3>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {detailRow.tujuan_bb || "-"}
                </p>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                Status proses
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Status dibuka
                    </p>
                  </div>
                  <StatusBadge value={detailRow.status_dibuka} />
                  {detailRow.status_dibuka_at && (
                    <p className="mt-3 text-xs leading-5 text-slate-400">
                      Diperbarui: {formatDate(detailRow.status_dibuka_at)}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Status pengembalian
                    </p>
                  </div>
                  <StatusBadge value={detailRow.status_pengembalian} />
                  {detailRow.status_pengembalian_at && (
                    <p className="mt-3 text-xs leading-5 text-slate-400">
                      Diperbarui: {formatDate(detailRow.status_pengembalian_at)}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={isLocked(detailRow)}
                onClick={() => {
                  const row = detailRow;
                  setDetailRow(null);
                  openEditForm(row);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173D6B] px-5 text-sm font-bold text-white transition hover:bg-[#102C50] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {isLocked(detailRow) ? (
                  <LockKeyhole className="h-4 w-4" />
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
                {isLocked(detailRow) ? "Dikunci Admin" : "Edit Pengajuan"}
              </button>
            </footer>
          </div>
        </ModalShell>
      )}
    </main>
  );
}
