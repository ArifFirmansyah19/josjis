"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FileText,
  Info,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Wallet,
  X,
  XCircle,
  UnlockKeyhole,
  Check,
} from "lucide-react";
import { useUnit } from "@/components/UnitContext";

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

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] || ""} ${year}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
  return row?.is_locked === true;
}

function StatusBadge({ value }) {
  const done = value === "DONE";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${
        done
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-amber-50 text-amber-800 ring-amber-200"
      }`}
    >
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <Clock3 className="h-3.5 w-3.5" />
      )}
      {done ? "DONE" : "BELUM"}
    </span>
  );
}

function LockBadge({ locked }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${
        locked
          ? "bg-amber-50 text-amber-800 ring-amber-200"
          : "bg-sky-50 text-sky-700 ring-sky-200"
      }`}
    >
      {locked ? (
        <LockKeyhole className="h-3.5 w-3.5" />
      ) : (
        <Pencil className="h-3.5 w-3.5" />
      )}
      {locked ? "Dikunci Admin" : "Bisa diedit"}
    </span>
  );
}

function SummaryCard({ label, value, description, icon: Icon, tone }) {
  const tones = {
    blue: "from-blue-500 to-indigo-600",
    rose: "from-rose-500 to-pink-600",
    amber: "from-amber-400 to-orange-500",
    emerald: "from-emerald-500 to-teal-600",
  };

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tones[tone] || tones.blue}`}
      />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            {description}
          </p>
        </div>
        <div
          className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-sm ${tones[tone] || tones.blue}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  min,
  step,
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      />
    </label>
  );
}

function DetailItem({ label, value, mono = false }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-white p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1.5 break-words text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}
      >
        {value === null || value === undefined || value === "" ? "-" : value}
      </p>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function Feedback({ type = "error", message, onClose }) {
  if (!message) return null;
  const success = type === "success";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <p className="flex-1 leading-6">{message}</p>
      <button type="button" onClick={onClose} aria-label="Tutup pesan">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ModalShell({ children, onClose, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/60 bg-slate-50 shadow-2xl sm:rounded-3xl ${wide ? "max-w-4xl" : "max-w-2xl"}`}
      >
        {children}
      </section>
    </div>
  );
}

function DetailModal({ row, isAdmin, busy, onClose, onStatus, onLock }) {
  if (!row) return null;

  const locked = isLocked(row);

  return (
    <ModalShell onClose={onClose} wide>
      <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-5 py-5 text-white sm:px-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-indigo-200">
                Detail pengajuan buka blokir
              </p>
              <h2 className="mt-1 break-words text-xl font-extrabold sm:text-2xl">
                {row.nama_debitur || "-"}
              </h2>
              <p className="mt-1 text-xs text-slate-300">
                {formatDate(row.tanggal)} ·{" "}
                {row.nama_mks || row.pemohon_nama || "MKS"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 p-2 transition hover:bg-white/20"
            aria-label="Tutup detail"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <LockBadge locked={locked} />
          <StatusBadge value={row.status_dibuka} />
          <StatusBadge value={row.status_pengembalian} />
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        {locked && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                Pengajuan dikunci Admin
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                MKS tidak dapat mengubah data selama pengajuan terkunci.
              </p>
              {row.locked_at && (
                <p className="mt-1 text-xs text-amber-800">
                  Dikunci: {formatDateTime(row.locked_at)}
                </p>
              )}
            </div>
          </div>
        )}

        <section>
          <SectionHeading
            icon={FileText}
            title="Informasi debitur"
            subtitle="Data dasar pengajuan dan rekening."
          />
          <div className="grid gap-2.5 sm:grid-cols-2">
            <DetailItem label="Nama debitur" value={row.nama_debitur} />
            <DetailItem
              label="Tanggal pengajuan"
              value={formatDate(row.tanggal)}
            />
            <DetailItem
              label="Rekening pinjaman"
              value={row.nomor_rekening_pinjaman}
              mono
            />
            <DetailItem
              label="Rekening tabungan"
              value={row.nomor_rekening_tabungan}
              mono
            />
            <DetailItem
              label="Pemohon"
              value={row.pemohon_nama || row.nama_mks}
            />
            <DetailItem label="Unit" value={row.nama_unit || "-"} />
          </div>
        </section>

        <section>
          <SectionHeading
            icon={Wallet}
            title="Rincian nominal"
            subtitle="Nilai dalam rupiah."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Wallet className="h-4 w-4" />
                Blokiran awal
              </p>
              <p className="mt-3 break-words text-lg font-extrabold text-slate-900">
                {formatRupiah(row.blokiran_awal)}
              </p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                <ArrowUpRight className="h-4 w-4" />
                Blokiran dibuka
              </p>
              <p className="mt-3 break-words text-lg font-extrabold text-blue-900">
                {formatRupiah(row.blokiran_dibuka)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <ArrowDownLeft className="h-4 w-4" />
                Dikembalikan
              </p>
              <p className="mt-3 break-words text-lg font-extrabold text-emerald-900">
                {formatRupiah(row.dikembalikan)}
              </p>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading icon={Landmark} title="Tujuan buka blokir" />
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
              {row.tujuan_bb || "-"}
            </p>
          </div>
        </section>

        <section>
          <SectionHeading
            icon={ShieldCheck}
            title="Status proses"
            subtitle="Status hanya dapat diubah oleh Admin."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Pembukaan blokir
              </p>
              <div className="mt-3">
                <StatusBadge value={row.status_dibuka} />
              </div>
              {row.status_dibuka_at && (
                <p className="mt-2 text-xs text-slate-500">
                  Diperbarui: {formatDateTime(row.status_dibuka_at)}
                </p>
              )}
              {isAdmin && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || row.status_dibuka === "DONE"}
                    onClick={() => onStatus(row, "status_dibuka", "DONE")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Tandai DONE
                  </button>
                  <button
                    type="button"
                    disabled={busy || row.status_dibuka !== "DONE"}
                    onClick={() => onStatus(row, "status_dibuka", "BELUM")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Kembalikan BELUM
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Pengembalian
              </p>
              <div className="mt-3">
                <StatusBadge value={row.status_pengembalian} />
              </div>
              {row.status_pengembalian_at && (
                <p className="mt-2 text-xs text-slate-500">
                  Diperbarui: {formatDateTime(row.status_pengembalian_at)}
                </p>
              )}
              {isAdmin && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      busy ||
                      row.status_dibuka !== "DONE" ||
                      row.status_pengembalian === "DONE"
                    }
                    onClick={() => onStatus(row, "status_pengembalian", "DONE")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Tandai DONE
                  </button>
                  <button
                    type="button"
                    disabled={busy || row.status_pengembalian !== "DONE"}
                    onClick={() =>
                      onStatus(row, "status_pengembalian", "BELUM")
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Kembalikan BELUM
                  </button>
                </div>
              )}
              {isAdmin && row.status_dibuka !== "DONE" && (
                <p className="mt-2 text-xs leading-5 text-amber-700">
                  Selesaikan pembukaan blokir terlebih dahulu.
                </p>
              )}
            </div>
          </div>
        </section>

        {isAdmin && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-indigo-950">
                  Penguncian pengajuan
                </p>
                <p className="mt-1 text-xs leading-5 text-indigo-800">
                  Penguncian mencegah MKS mengedit data pengajuan ini.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onLock(row, locked ? "unlock" : "lock")}
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:opacity-50 ${
                  locked
                    ? "border border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-100"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {locked ? (
                  <UnlockKeyhole className="h-4 w-4" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                {locked ? "Buka kunci" : "Kunci pengajuan"}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-xs leading-5 text-slate-500">
            Status pengembalian hanya dapat menjadi DONE setelah status
            pembukaan blokir DONE. Jika status pembukaan dikembalikan ke BELUM,
            status pengembalian otomatis ikut BELUM.
          </p>
        </div>
      </div>

      <footer className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-4 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800"
        >
          <Check className="h-4 w-4" />
          Selesai
        </button>
      </footer>
    </ModalShell>
  );
}

function RequestFormModal({
  form,
  setForm,
  editRow,
  saving,
  onClose,
  onSubmit,
}) {
  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <ModalShell onClose={() => !saving && onClose()} wide>
      <header className="flex shrink-0 items-start justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
            <FilePlus2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {editRow ? "Edit pengajuan" : "Buat pengajuan baru"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Lengkapi data debitur, rekening, nominal, dan tujuan.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
          aria-label="Tutup form"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <form
        onSubmit={onSubmit}
        className="min-h-0 space-y-6 overflow-y-auto p-5 sm:p-6"
      >
        <section>
          <SectionHeading
            icon={FileText}
            title="Informasi debitur"
            subtitle="Periksa tanggal dan nomor rekening sebelum menyimpan."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tanggal pengajuan"
              type="date"
              value={form.tanggal}
              onChange={(v) => update("tanggal", v)}
              required
            />
            <Field
              label="Nama debitur"
              value={form.nama_debitur}
              onChange={(v) => update("nama_debitur", v)}
              placeholder="Nama lengkap debitur"
              required
            />
            <Field
              label="Nomor rekening pinjaman"
              value={form.nomor_rekening_pinjaman}
              onChange={(v) => update("nomor_rekening_pinjaman", v)}
              placeholder="Nomor rekening pinjaman"
              required
            />
            <Field
              label="Nomor rekening tabungan"
              value={form.nomor_rekening_tabungan}
              onChange={(v) => update("nomor_rekening_tabungan", v)}
              placeholder="Nomor rekening tabungan"
              required
            />
          </div>
        </section>

        <section>
          <SectionHeading
            icon={Wallet}
            title="Informasi nominal"
            subtitle="Nominal dalam rupiah. Kosong akan disimpan sebagai nol."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Blokiran awal (Rp)"
              type="number"
              min="0"
              step="0.01"
              value={form.blokiran_awal}
              onChange={(v) => update("blokiran_awal", v)}
              placeholder="0"
            />
            <Field
              label="Blokiran dibuka (Rp)"
              type="number"
              min="0"
              step="0.01"
              value={form.blokiran_dibuka}
              onChange={(v) => update("blokiran_dibuka", v)}
              placeholder="0"
            />
            <Field
              label="Dikembalikan (Rp)"
              type="number"
              min="0"
              step="0.01"
              value={form.dikembalikan}
              onChange={(v) => update("dikembalikan", v)}
              placeholder="0"
            />
          </div>
        </section>

        <section>
          <SectionHeading
            icon={Landmark}
            title="Tujuan buka blokir"
            subtitle="Tuliskan alasan atau kebutuhan pembukaan blokir."
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Tujuan BB <span className="text-rose-500">*</span>
            </span>
            <textarea
              value={form.tujuan_bb}
              onChange={(event) => update("tujuan_bb", event.target.value)}
              rows={4}
              maxLength={2000}
              required
              placeholder="Jelaskan tujuan pengajuan buka blokir..."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
            <span className="mt-1 block text-right text-xs text-slate-400">
              {form.tujuan_bb.length}/2000 karakter
            </span>
          </label>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <p className="text-sm font-bold text-blue-950">
              Status dan penguncian
            </p>
            <p className="mt-1 text-xs leading-5 text-blue-800">
              Status proses dikelola Admin. Pengajuan yang sudah dikunci Admin
              atau selesai diproses tidak dapat diedit oleh MKS.
            </p>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {saving
              ? "Menyimpan..."
              : editRow
                ? "Simpan perubahan"
                : "Simpan pengajuan"}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

export default function RequestBukaBlokirPage() {
  const { activeUnit } = useUnit();
  const unitKode = activeUnit?.code || "";

  const [rows, setRows] = useState([]);
  const [role, setRole] = useState("");
  const [serverUnit, setServerUnit] = useState(null);
  const [month, setMonth] = useState(getJakartaDate().slice(0, 7));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const isAdmin = role === "ADMIN";

  const loadRows = useCallback(async () => {
    if (!unitKode) {
      setLoading(false);
      setError(
        "Unit aktif Topbar belum tersedia. Pastikan UnitProvider sudah aktif.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        bulan: month,
        unit_kode: unitKode,
      });

      const response = await fetch(`/api/request-buka-blokir?${params}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal memuat pengajuan.");

      setRows(Array.isArray(result.rows) ? result.rows : []);
      setRole(result.role || "");
      setServerUnit(result.unit || null);

      setDetailRow((current) => {
        if (!current) return null;
        return (
          (result.rows || []).find((item) => item.id === current.id) || null
        );
      });
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [month, unitKode]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter((row) =>
      [
        row.nama_debitur,
        row.nomor_rekening_pinjaman,
        row.nomor_rekening_tabungan,
        row.tujuan_bb,
        row.pemohon_nama,
        row.nama_mks,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      ),
    );
  }, [rows, search]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      belumDibuka: rows.filter((row) => row.status_dibuka !== "DONE").length,
      belumKembali: rows.filter((row) => row.status_pengembalian !== "DONE")
        .length,
      terkunci: rows.filter(isLocked).length,
    }),
    [rows],
  );

  function openCreate() {
    setError("");
    setSuccess("");
    setEditRow(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(row) {
    if (isLocked(row)) {
      setError("Pengajuan ini sudah dikunci Admin.");
      return;
    }

    if (row.status_dibuka === "DONE" || row.status_pengembalian === "DONE") {
      setError("Pengajuan yang sudah diproses tidak dapat diedit.");
      return;
    }

    setError("");
    setSuccess("");
    setEditRow(row);
    setForm({
      tanggal: String(row.tanggal || "").slice(0, 10) || getJakartaDate(),
      nama_debitur: row.nama_debitur || "",
      nomor_rekening_pinjaman: row.nomor_rekening_pinjaman || "",
      nomor_rekening_tabungan: row.nomor_rekening_tabungan || "",
      blokiran_awal: String(row.blokiran_awal ?? 0),
      blokiran_dibuka: String(row.blokiran_dibuka ?? 0),
      dikembalikan: String(row.dikembalikan ?? 0),
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
      const payload = {
        ...form,
        blokiran_awal: form.blokiran_awal || 0,
        blokiran_dibuka: form.blokiran_dibuka || 0,
        dikembalikan: form.dikembalikan || 0,
      };

      if (editRow) payload.id = editRow.id;

      const response = await fetch("/api/request-buka-blokir", {
        method: editRow ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Pengajuan gagal disimpan.");

      setShowForm(false);
      setEditRow(null);
      setSuccess(
        editRow
          ? "Perubahan pengajuan berhasil disimpan."
          : "Pengajuan berhasil dibuat.",
      );
      await loadRows();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function adminAction(payload, successMessage) {
    if (!unitKode) {
      setError("Unit aktif Topbar belum tersedia.");
      return;
    }

    setBusyAction(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/request-buka-blokir", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          unit_kode: unitKode,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Aksi Admin gagal diproses.");

      setSuccess(successMessage);
      await loadRows();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memproses pengajuan.");
    } finally {
      setBusyAction(false);
    }
  }

  async function changeStatus(row, field, value) {
    await adminAction(
      { id: row.id, field, value },
      field === "status_dibuka"
        ? `Status pembukaan blokir berhasil diubah menjadi ${value}.`
        : `Status pengembalian berhasil diubah menjadi ${value}.`,
    );
  }

  async function changeLock(row, action) {
    await adminAction(
      { id: row.id, action },
      action === "lock"
        ? "Pengajuan berhasil dikunci."
        : "Kunci pengajuan berhasil dibuka.",
    );
  }

  const monthLabel = (() => {
    const [year, monthNumber] = month.split("-");
    return `${MONTHS[Number(monthNumber) - 1] || ""} ${year || ""}`;
  })();

  return (
    <main className="relative isolate min-h-full overflow-hidden bg-[#f5f7fc] px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,.13) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.13) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-[28rem] -z-10 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl" />

      <div className="mx-auto w-full max-w-[1500px] space-y-5 sm:space-y-6">
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-xl shadow-indigo-950/10 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute right-10 top-12 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                    Request Buka Blokir
                  </h1>
                  <span className="rounded-full border border-indigo-300/25 bg-indigo-300/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-100">
                    {isAdmin ? "Admin" : role || "Memuat akses"}
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  {isAdmin
                    ? "Tinjau pengajuan dari MKS, kelola status proses, dan kunci data sesuai kebutuhan."
                    : "Buat dan pantau pengajuan buka blokir debitur serta tindak lanjutnya."}
                </p>
                <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                  <Landmark className="h-4 w-4 text-sky-300" />
                  <span>Unit aktif:</span>
                  <strong className="text-white">
                    {serverUnit?.nama_unit ||
                      activeUnit?.label ||
                      activeUnit?.name ||
                      activeUnit?.value ||
                      "Memuat unit..."}
                  </strong>
                  {unitKode && (
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                      {unitKode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isAdmin && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-blue-800 shadow-lg transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/20"
              >
                <FilePlus2 className="h-4 w-4" />
                Buat pengajuan
              </button>
            )}
          </div>
        </header>

        <Feedback message={error} onClose={() => setError("")} />
        <Feedback
          type="success"
          message={success}
          onClose={() => setSuccess("")}
        />

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard
            label="Total pengajuan"
            value={summary.total}
            icon={FileText}
            tone="blue"
            description="Dalam periode terpilih"
          />
          <SummaryCard
            label="Menunggu dibuka"
            value={summary.belumDibuka}
            icon={Clock3}
            tone="rose"
            description="Status pembukaan BELUM"
          />
          <SummaryCard
            label="Menunggu pengembalian"
            value={summary.belumKembali}
            icon={RefreshCw}
            tone="amber"
            description="Status pengembalian BELUM"
          />
          <SummaryCard
            label="Dikunci Admin"
            value={summary.terkunci}
            icon={LockKeyhole}
            tone="emerald"
            description="Tidak dapat diedit MKS"
          />
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Daftar pengajuan
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {isAdmin
                  ? "Pengajuan MKS pada unit aktif di Topbar."
                  : "Pengajuan yang dibuat dari akun MKS ini."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[190px_minmax(240px,1fr)_auto]">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Periode
                </span>
                <span className="relative block">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="month"
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Cari pengajuan
                </span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nama, rekening, pemohon..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </span>
              </label>
              <button
                type="button"
                onClick={loadRows}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Muat ulang
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                {isAdmin ? "Pengajuan dari MKS" : "Pengajuan saya"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {monthLabel} <span className="mx-1.5 text-slate-300">/</span>{" "}
                {filteredRows.length} data
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              {isAdmin
                ? "Admin dapat memproses status"
                : "Status dikelola Admin"}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
              Memuat pengajuan...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-extrabold text-slate-800">
                Belum ada pengajuan
              </h3>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Tidak ada data untuk periode atau pencarian ini. Coba ubah
                filter.
              </p>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <FilePlus2 className="h-4 w-4" />
                  Buat pengajuan
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Debitur
                      </th>
                      {isAdmin && (
                        <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          Pemohon MKS
                        </th>
                      )}
                      <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Rekening tabungan
                      </th>
                      <th className="px-4 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Blokiran awal
                      </th>
                      <th className="px-4 py-3.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row) => {
                      const locked = isLocked(row);
                      const canEdit =
                        !isAdmin &&
                        !locked &&
                        row.status_dibuka !== "DONE" &&
                        row.status_pengembalian !== "DONE";

                      return (
                        <tr
                          key={row.id}
                          className="transition hover:bg-blue-50/40"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${locked ? "bg-amber-50 text-amber-700" : "bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700"}`}
                              >
                                {locked ? (
                                  <LockKeyhole className="h-4 w-4" />
                                ) : (
                                  (row.nama_debitur || "?")
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-[240px] truncate text-sm font-extrabold text-slate-900">
                                  {row.nama_debitur || "-"}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {formatDate(row.tanggal)}
                                </p>
                              </div>
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-4">
                              <p className="text-sm font-semibold text-slate-700">
                                {row.pemohon_nama || row.nama_mks || "MKS"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {row.nama_mks || ""}
                              </p>
                            </td>
                          )}
                          <td className="px-4 py-4">
                            <span className="font-mono text-xs font-medium text-slate-600">
                              {row.nomor_rekening_tabungan || "-"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-right">
                            <span className="text-sm font-extrabold tabular-nums text-slate-900">
                              {formatRupiah(row.blokiran_awal)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-center gap-1.5">
                              <StatusBadge value={row.status_dibuka} />
                              <StatusBadge value={row.status_pengembalian} />
                              <LockBadge locked={locked} />
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setDetailRow(row)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Detail
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(row)}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                              )}
                              {!isAdmin && locked && (
                                <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-50 px-3 text-xs font-bold text-amber-800">
                                  <LockKeyhole className="h-3.5 w-3.5" />
                                  Terkunci
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 md:hidden">
                {filteredRows.map((row) => {
                  const locked = isLocked(row);
                  const canEdit =
                    !isAdmin &&
                    !locked &&
                    row.status_dibuka !== "DONE" &&
                    row.status_pengembalian !== "DONE";

                  return (
                    <article
                      key={row.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${locked ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}
                        >
                          {locked ? (
                            <LockKeyhole className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-sm font-extrabold text-slate-900">
                            {row.nama_debitur || "-"}
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(row.tanggal)}
                          </p>
                          <p className="mt-2 break-all font-mono text-xs text-slate-600">
                            {row.nomor_rekening_tabungan || "-"}
                          </p>
                          {isAdmin && (
                            <p className="mt-1 text-xs text-indigo-600">
                              Pemohon:{" "}
                              {row.pemohon_nama || row.nama_mks || "MKS"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Blokiran awal
                        </span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {formatRupiah(row.blokiran_awal)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <StatusBadge value={row.status_dibuka} />
                        <StatusBadge value={row.status_pengembalian} />
                        <LockBadge locked={locked} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailRow(row)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          <FileText className="h-4 w-4" />
                          Detail
                        </button>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                        ) : (
                          <div className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-bold text-slate-500">
                            {isAdmin
                              ? "Proses via detail"
                              : locked
                                ? "Terkunci Admin"
                                : "Tidak dapat diedit"}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
            <p className="text-[11px] leading-5 text-slate-400">
              {isAdmin
                ? "Admin memproses status melalui Detail. Penguncian mencegah MKS mengedit data pengajuan."
                : "Data yang dikunci Admin atau telah selesai diproses tidak dapat diedit oleh MKS."}
            </p>
          </div>
        </section>
      </div>

      {detailRow && (
        <DetailModal
          row={detailRow}
          isAdmin={isAdmin}
          busy={busyAction}
          onClose={() => setDetailRow(null)}
          onStatus={changeStatus}
          onLock={changeLock}
        />
      )}

      {showForm && !isAdmin && (
        <RequestFormModal
          form={form}
          setForm={setForm}
          editRow={editRow}
          saving={saving}
          onClose={() => {
            if (!saving) {
              setShowForm(false);
              setEditRow(null);
            }
          }}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}
