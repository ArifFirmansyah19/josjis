"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Building2,
  Wallet,
  ShieldCheck,
  RefreshCw,
  ClipboardList,
  FileCheck2,
  Check,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useUnit } from "@/components/UnitContext";

const STATUS_OPTIONS = [
  ["BELUM_LENGKAP", "Belum lengkap"],
  ["PENDING_NOTARIS", "Pending notaris"],
  ["PENGORDERAN_MIGRASI_ULANG", "Pengorderan migrasi ulang"],
  ["SELESAI", "Selesai"],
];

const EMPTY = {
  nama_debitur: "",
  rekening_pinjaman: "",
  jenis_pinjaman: "KUR",
  limit_kredit: "",
  tenor_bulan: "",
  tanggal_migrasi: "",
  jenis_migrasi: "DMS",
  nomor_folder: "",

  jenis_agunan: "SHM",
  jenis_agunan_lainnya: "",
  nomor_sertifikat: "",
  nama_pemilik: "",
  desa: "",
  luas_m2: "",
  tanggal_terbit: "",

  status_legal: "APHT",
  alasan_belum_migrasi: "",
  notaris_id: "",

  nama_debitur_order: "",
  tanggal_order: "",

  order_jenis_agunan: "SHM",
  order_jenis_agunan_lainnya: "",
  order_nomor_sertifikat: "",
  order_nama_pemilik: "",
  order_desa: "",
  order_luas_m2: "",
  order_tanggal_terbit: "",

  status_migrasi: "BELUM_LENGKAP",
  catatan: "",
  mks_penanggung_jawab_id: "",
};

const inputClass =
  "h-11 w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 sm:text-sm";

const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700";

function cleanDigits(v) {
  return String(v ?? "").replace(/\D/g, "");
}

function fmtNum(v) {
  const d = cleanDigits(v);
  return d ? Number(d).toLocaleString("id-ID") : "";
}

function toNumber(v) {
  const d = cleanDigits(v);
  return d ? Number(d) : null;
}

function fmtArea(v) {
  return v === null || v === undefined || v === ""
    ? "-"
    : `${Number(v).toLocaleString("id-ID", {
        maximumFractionDigits: 2,
      })} m²`;
}

function fmtRupiah(v) {
  return v == null || v === ""
    ? "-"
    : `Rp ${Number(v).toLocaleString("id-ID", {
        maximumFractionDigits: 0,
      })}`;
}

function fmtDate(v) {
  if (!v) return "-";

  const d = new Date(`${String(v).slice(0, 10)}T00:00:00`);

  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function statusLabel(v) {
  return STATUS_OPTIONS.find(([k]) => k === v)?.[1] || v || "-";
}

function collateralLabel(v, other) {
  return v === "SHM_NIB"
    ? "SHM NIB"
    : v === "LAINNYA"
      ? other || "Lainnya"
      : v || "-";
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  className = "",
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={labelClass}>
        {label}
        {required ? " *" : ""}
      </span>

      <input
        className={inputClass}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  className = "",
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={labelClass}>
        {label}
        {required ? " *" : ""}
      </span>

      <select
        className={inputClass}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">Pilih {label.toLowerCase()}</option>

        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, subtitle, icon: Icon = FileCheck2, children }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3 border-b border-zinc-100 pb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <Icon size={18} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>

          {subtitle && (
            <p className="mt-0.5 text-xs leading-5 text-zinc-500">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FormModal({
  item,
  unit,
  notaris,
  mksList,
  onClose,
  onSave,
  saving,
  error,
}) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...(item || {}),

    limit_kredit: fmtNum(item?.limit_kredit),

    luas_m2: item?.luas_m2 == null ? "" : fmtNum(item.luas_m2),

    order_luas_m2:
      item?.order_luas_m2 == null ? "" : fmtNum(item.order_luas_m2),

    tenor_bulan: item?.tenor_bulan == null ? "" : String(item.tenor_bulan),

    mks_penanggung_jawab_id: item?.mks_penanggung_jawab_id || "",
  }));

  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selectedAgunan, setSelectedAgunan] = useState([]);
  const [candidateLoadedFor, setCandidateLoadedFor] = useState("");

  const orderMode = form.alasan_belum_migrasi === "PENGORDERAN";

  const editing = Boolean(item);

  const change = (key, value) => {
    let v = value;

    if (
      [
        "nama_debitur",
        "nama_pemilik",
        "nama_debitur_order",
        "order_nama_pemilik",
      ].includes(key)
    ) {
      v = String(value || "").toLocaleUpperCase("id-ID");
    }

    if (["desa", "order_desa"].includes(key)) {
      v = String(value || "")
        .toLocaleLowerCase("id-ID")
        .replace(
          /(^|[\s-])([\p{L}])/gu,
          (_, a, b) => a + b.toLocaleUpperCase("id-ID"),
        );
    }

    setForm((old) => ({
      ...old,
      [key]: v,
    }));
  };

  const fetchCandidates = async () => {
    const rekening = form.rekening_pinjaman.trim();

    if (!rekening) {
      setCandidateError("Isi nomor rekening pinjaman terlebih dahulu.");
      return;
    }

    setCandidateLoading(true);
    setCandidateError("");

    try {
      const res = await fetch(
        `/api/admin/daftar-migrasi-legal?unit=${unit}&rekening=${encodeURIComponent(
          rekening,
        )}&agunan=1`,
        {
          cache: "no-store",
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengambil data agunan.");
      }

      const list = json.agunanBelumMigrasi || [];

      setCandidates(list);
      setSelectedAgunan(list.map((a) => a.id));
      setCandidateLoadedFor(rekening);

      if (!list.length) {
        setCandidateError(
          "Tidak ada SHM yang belum tercatat untuk rekening ini.",
        );
      }
    } catch (e) {
      setCandidateError(e.message || "Gagal mengambil data agunan.");
    } finally {
      setCandidateLoading(false);
    }
  };

  const toggleAgunan = (id) => {
    setSelectedAgunan((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  };

  const submit = (e) => {
    e.preventDefault();

    if (!form.nama_debitur.trim() || !form.rekening_pinjaman.trim()) {
      return alert("Nama dan rekening pinjaman wajib diisi.");
    }

    if (!form.jenis_migrasi || !form.jenis_pinjaman) {
      return alert("Jenis pinjaman dan migrasi wajib dipilih.");
    }

    if (!form.mks_penanggung_jawab_id) {
      return alert("MKS penanggung jawab wajib dipilih.");
    }

    if (form.alasan_belum_migrasi === "NOTARIS" && !form.notaris_id) {
      return alert("Pilih notaris terlebih dahulu.");
    }

    if (orderMode) {
      if (!form.nama_debitur_order.trim() || !form.tanggal_order) {
        return alert(
          "Nama debitur yang diorder dan tanggal order wajib diisi.",
        );
      }

      // Untuk data baru, SHM harus dipilih dari master agunan.
      // Saat mengedit, data agunan yang sudah tersimpan tetap digunakan.
      if (!editing) {
        if (candidateLoadedFor !== form.rekening_pinjaman.trim()) {
          return alert("Muat data SHM dari rekening pinjaman terlebih dahulu.");
        }

        if (!selectedAgunan.length) {
          return alert("Pilih minimal satu SHM yang akan dimigrasikan.");
        }
      }
    }

    if (form.jenis_agunan === "LAINNYA" && !form.jenis_agunan_lainnya.trim()) {
      return alert("Jenis agunan lainnya wajib diisi.");
    }

    onSave({
      ...form,

      limit_kredit: toNumber(form.limit_kredit),
      tenor_bulan: toNumber(form.tenor_bulan),
      luas_m2: toNumber(form.luas_m2),
      order_luas_m2: toNumber(form.order_luas_m2),

      selected_agunan_ids: selectedAgunan,
      agunan_candidates: candidates,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-zinc-50 shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              {item ? "Edit Migrasi Legal" : "Tambah Migrasi Legal"}
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Unit aktif: {unit} · Satu data untuk satu agunan
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100"
            aria-label="Tutup"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-3 sm:p-5">
            {error && (
              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={17} className="shrink-0" />
                {error}
              </div>
            )}

            <Section
              title="Data Debitur dan Pinjaman"
              subtitle="Informasi utama debitur dan fasilitas kredit."
              icon={Wallet}
            >
              <Field
                label="Nama Debitur"
                value={form.nama_debitur}
                onChange={(v) => change("nama_debitur", v)}
                required
              />

              <Field
                label="Nomor Rekening Pinjaman"
                value={form.rekening_pinjaman}
                onChange={(v) => change("rekening_pinjaman", v)}
                required
              />

              <SelectField
                label="Jenis Pinjaman"
                value={form.jenis_pinjaman}
                onChange={(v) => change("jenis_pinjaman", v)}
                options={[
                  ["KUR", "KUR"],
                  ["KUM", "KUM"],
                ]}
                required
              />

              <Field
                label="Limit Kredit (Rp)"
                value={form.limit_kredit}
                onChange={(v) => change("limit_kredit", fmtNum(v))}
                placeholder="Contoh: 250.000.000"
              />

              <Field
                label="Tenor (bulan)"
                value={form.tenor_bulan}
                onChange={(v) => change("tenor_bulan", cleanDigits(v))}
              />

              <Field
                label="Tanggal Migrasi"
                type="date"
                value={form.tanggal_migrasi}
                onChange={(v) => change("tanggal_migrasi", v)}
              />

              <SelectField
                label="Jenis Migrasi"
                value={form.jenis_migrasi}
                onChange={(v) => change("jenis_migrasi", v)}
                options={[
                  ["DMS", "DMS"],
                  ["NON_DMS", "Non-DMS"],
                ]}
                required
              />

              <Field
                label="Nomor Folder (opsional)"
                value={form.nomor_folder}
                onChange={(v) => change("nomor_folder", v)}
              />
            </Section>

            <Section
              title="Data Agunan"
              subtitle="Detail agunan tetap dicatat dan ditampilkan untuk setiap data migrasi."
              icon={Building2}
            >
              {/* 
                Data agunan selalu tersedia saat edit.
                Pada pengorderan baru, detail masing-masing SHM
                diambil dari master agunan yang dipilih.
              */}
              {(!orderMode || editing) && (
                <>
                  <SelectField
                    label="Jenis Agunan"
                    value={form.jenis_agunan}
                    onChange={(v) => change("jenis_agunan", v)}
                    options={[
                      ["SHM", "SHM"],
                      ["SHM_NIB", "SHM NIB"],
                      ["LAINNYA", "Lainnya"],
                    ]}
                    required
                  />

                  {form.jenis_agunan === "LAINNYA" ? (
                    <Field
                      label="Jenis Agunan Lainnya"
                      value={form.jenis_agunan_lainnya}
                      onChange={(v) => change("jenis_agunan_lainnya", v)}
                      required
                    />
                  ) : (
                    <>
                      <Field
                        label="Nomor Sertifikat"
                        value={form.nomor_sertifikat}
                        onChange={(v) => change("nomor_sertifikat", v)}
                      />

                      <Field
                        label="Nama Pemilik"
                        value={form.nama_pemilik}
                        onChange={(v) => change("nama_pemilik", v)}
                      />

                      <Field
                        label="Desa / Kelurahan"
                        value={form.desa}
                        onChange={(v) => change("desa", v)}
                      />

                      <Field
                        label="Luas (m²)"
                        value={form.luas_m2}
                        onChange={(v) => change("luas_m2", fmtNum(v))}
                        placeholder="Contoh: 19.101"
                      />

                      <Field
                        label="Tanggal Terbit"
                        type="date"
                        value={form.tanggal_terbit}
                        onChange={(v) => change("tanggal_terbit", v)}
                      />
                    </>
                  )}
                </>
              )}

              <SelectField
                label="Status Legal Agunan"
                value={form.status_legal}
                onChange={(v) => change("status_legal", v)}
                options={[
                  ["APHT", "APHT"],
                  ["SKMHT", "SKMHT"],
                  ["MORAL", "MORAL"],
                ]}
              />

              <SelectField
                label="MKS Penanggung Jawab"
                value={form.mks_penanggung_jawab_id}
                onChange={(v) => change("mks_penanggung_jawab_id", v)}
                options={mksList.map((m) => [m.id, m.nama])}
                required
              />

              {/* Pemilihan SHM hanya untuk membuat data pengorderan baru */}
              {orderMode && !editing && (
                <div className="sm:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-800">
                        Pilih SHM yang akan dimigrasikan
                      </p>

                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Sistem mengambil SHM dari rekening ini yang belum
                        tercatat. Setiap SHM terpilih akan disimpan sebagai
                        baris terpisah beserta detail agunannya.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={fetchCandidates}
                      disabled={candidateLoading}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {candidateLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      Ambil Data SHM
                    </button>
                  </div>

                  {candidateError && (
                    <p className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                      {candidateError}
                    </p>
                  )}

                  {candidates.length > 0 && (
                    <>
                      <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                        <span>{candidates.length} SHM tersedia</span>
                        <span>{selectedAgunan.length} dipilih</span>
                      </div>

                      <div className="space-y-2">
                        {candidates.map((a) => (
                          <label
                            key={a.id}
                            className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                              selectedAgunan.includes(a.id)
                                ? "border-zinc-500 bg-white"
                                : "border-zinc-200 bg-white hover:border-zinc-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedAgunan.includes(a.id)}
                              onChange={() => toggleAgunan(a.id)}
                              className="mt-1 h-4 w-4 shrink-0 accent-zinc-900"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-800">
                                SHM {a.nomor_sertifikat || "Tanpa nomor"}
                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                                  {a.urutan ? `Agunan ${a.urutan}` : "Agunan"}
                                </span>
                              </span>

                              <span className="mt-1 block text-xs text-zinc-600">
                                Pemilik: {a.nama_pemilik || "-"} ·{" "}
                                {a.desa_kelurahan || "Desa belum diisi"}
                              </span>

                              <span className="mt-1 block text-xs text-zinc-500">
                                Luas {fmtArea(a.luas_tanah)} · Terbit{" "}
                                {fmtDate(a.tanggal_terbit_sertifikat)}
                              </span>
                            </span>

                            {selectedAgunan.includes(a.id) && (
                              <Check
                                size={17}
                                className="mt-0.5 shrink-0 text-zinc-800"
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </Section>

            <Section
              title="Status Proses Agunan"
              subtitle="Tentukan penyebab belum migrasi dan detail prosesnya."
              icon={ShieldCheck}
            >
              <SelectField
                label="Alasan Belum Migrasi"
                value={form.alasan_belum_migrasi}
                onChange={(v) => change("alasan_belum_migrasi", v)}
                options={[
                  ["NOTARIS", "Pengikatan oleh notaris"],
                  ["PENGORDERAN", "Dalam pengorderan"],
                ]}
              />

              {form.alasan_belum_migrasi === "NOTARIS" && (
                <SelectField
                  label="Notaris"
                  value={form.notaris_id}
                  onChange={(v) => change("notaris_id", v)}
                  options={notaris.map((n) => [
                    n.id,
                    `${n.nama_notaris}${
                      n.kabupaten ? ` — ${n.kabupaten}` : ""
                    }`,
                  ])}
                  required
                />
              )}

              {orderMode && (
                <>
                  <Field
                    label="Nama Debitur yang Diorder"
                    value={form.nama_debitur_order}
                    onChange={(v) => change("nama_debitur_order", v)}
                    required
                  />

                  <Field
                    label="Tanggal Order"
                    type="date"
                    value={form.tanggal_order}
                    onChange={(v) => change("tanggal_order", v)}
                    required
                  />

                  <div className="sm:col-span-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                    Nama debitur yang diorder dan tanggal pengorderan akan
                    diterapkan ke setiap agunan yang dipilih.
                  </div>
                </>
              )}
            </Section>

            <Section
              title="Status Migrasi dan Catatan"
              subtitle="Pantau progres legal untuk masing-masing agunan."
              icon={ClipboardList}
            >
              <SelectField
                label="Status Migrasi"
                value={form.status_migrasi}
                onChange={(v) => change("status_migrasi", v)}
                options={STATUS_OPTIONS}
                required
              />

              <label className="block sm:col-span-2">
                <span className={labelClass}>Catatan tambahan</span>

                <textarea
                  className={`${inputClass} h-auto min-h-24 py-3`}
                  rows={3}
                  value={form.catatan || ""}
                  onChange={(e) => change("catatan", e.target.value)}
                  placeholder="Catatan proses migrasi (opsional)"
                />
              </label>

              {form.status_migrasi === "SELESAI" && (
                <p className="rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-700 sm:col-span-2">
                  Data berstatus Selesai akan terhapus otomatis setelah 7 hari.
                  Jika status diubah sebelum itu, hitungan 7 hari akan direset.
                </p>
              )}
            </Section>
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-zinc-200 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-medium text-zinc-600 disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}

              {saving
                ? "Menyimpan..."
                : item
                  ? "Simpan Perubahan"
                  : orderMode
                    ? `Simpan ${selectedAgunan.length} Agunan`
                    : "Simpan Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailModal({ item, notaris, mksList, onClose, onEdit, onDelete }) {
  if (!item) return null;

  const isOrder = item.alasan_belum_migrasi === "PENGORDERAN";

  // Data agunan tetap lengkap, termasuk untuk data pengorderan.
  const rows = [
    ["Unit", item.kode_unit],
    ["Nama Debitur", item.nama_debitur],
    ["Rekening Pinjaman", item.rekening_pinjaman],
    ["Jenis Pinjaman", item.jenis_pinjaman],
    ["Limit Kredit", fmtRupiah(item.limit_kredit)],
    ["Tenor", item.tenor_bulan ? `${item.tenor_bulan} bulan` : "-"],
    ["Tanggal Migrasi", fmtDate(item.tanggal_migrasi)],
    [
      "Jenis Migrasi",
      item.jenis_migrasi === "NON_DMS" ? "Non-DMS" : item.jenis_migrasi,
    ],
    ["Nomor Folder", item.nomor_folder],

    [
      "Jenis Agunan",
      collateralLabel(item.jenis_agunan, item.jenis_agunan_lainnya),
    ],
    ["Nomor Sertifikat", item.nomor_sertifikat],
    ["Nama Pemilik", item.nama_pemilik],
    ["Desa / Kelurahan", item.desa],
    ["Luas Agunan", fmtArea(item.luas_m2)],
    ["Tanggal Terbit", fmtDate(item.tanggal_terbit)],

    ["Status Legal", item.status_legal],

    [
      "Alasan Belum Migrasi",
      isOrder
        ? "Dalam pengorderan"
        : item.alasan_belum_migrasi === "NOTARIS"
          ? "Pengikatan oleh notaris"
          : "-",
    ],

    [
      "Notaris",
      notaris.find((n) => n.id === item.notaris_id)?.nama_notaris || "-",
    ],

    [
      "MKS Penanggung Jawab",
      mksList.find((m) => m.id === item.mks_penanggung_jawab_id)?.nama || "-",
    ],

    ["Status Migrasi", statusLabel(item.status_migrasi)],
  ];

  // Pengorderan hanya menampilkan tiga informasi ini.
  // Tidak ada lagi detail SHM tambahan pada bagian ini.
  const orderRows = isOrder
    ? [
        ["Nama Debitur yang Diorder", item.nama_debitur_order],
        ["Nomor Rekening Pinjaman", item.rekening_pinjaman],
        ["Tanggal Order", fmtDate(item.tanggal_order)],
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-zinc-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Detail Migrasi Legal · {item.kode_unit}
            </p>

            <h2 className="mt-1 break-words text-lg font-semibold text-zinc-900">
              {isOrder && item.nama_debitur_order
                ? item.nama_debitur_order
                : item.nama_debitur}
            </h2>

            <p className="mt-1 font-mono text-xs text-zinc-500">
              {item.rekening_pinjaman}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-zinc-800">
              Data Debitur, Pinjaman, dan Agunan
            </h3>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k} className="rounded-xl bg-zinc-50 p-3">
                  <p className="text-[10px] font-medium text-zinc-400">{k}</p>

                  <p className="mt-1 break-words text-sm font-semibold text-zinc-800">
                    {v || "-"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {orderRows.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                Detail Pengorderan
              </h3>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {orderRows.map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-xl border border-zinc-200 p-3"
                  >
                    <p className="text-[10px] text-zinc-400">{k}</p>

                    <p className="mt-1 break-words text-sm font-semibold text-zinc-800">
                      {v || "-"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {item.catatan && (
            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] font-semibold uppercase text-zinc-400">
                Catatan
              </p>

              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                {item.catatan}
              </p>
            </div>
          )}

          {item.status_migrasi === "SELESAI" && item.status_selesai_at && (
            <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
              Selesai sejak{" "}
              {new Date(item.status_selesai_at).toLocaleString("id-ID")}. Data
              dihapus otomatis 7 hari setelah waktu tersebut.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 p-3 sm:p-4">
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-medium text-red-600"
          >
            <Trash2 size={14} />
            Hapus
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-xs font-medium text-white"
          >
            <Pencil size={14} />
            Edit
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-zinc-200 px-4 text-xs font-medium text-zinc-600"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DaftarMigrasiLegalPage() {
  const { selectedUnit, activeUnit } = useUnit();

  const unit = selectedUnit === "JKK2" ? "JKK2" : "JKK1";

  const [records, setRecords] = useState([]);
  const [notaris, setNotaris] = useState([]);
  const [mksList, setMksList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("SEMUA");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/daftar-migrasi-legal?unit=${unit}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Data migrasi legal gagal dimuat.");
      }

      setRecords(json.data || []);
      setNotaris(json.notaris || []);
      setMksList(json.mks || []);
    } catch (e) {
      setError(e.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  }, [unit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return records.filter((r) => {
      const mksName =
        mksList.find((m) => m.id === r.mks_penanggung_jawab_id)?.nama || "";

      const matches =
        !q ||
        [
          r.nama_debitur,
          r.nama_debitur_order,
          r.rekening_pinjaman,
          r.nomor_sertifikat,
          r.nama_pemilik,
          r.desa,
          r.nomor_folder,
          mksName,
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q),
        );

      return (
        matches &&
        (statusFilter === "SEMUA" || r.status_migrasi === statusFilter)
      );
    });
  }, [records, search, statusFilter, mksList]);

  function openAdd() {
    setEditing(null);
    setDetail(null);
    setError("");
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setDetail(null);
    setError("");
    setFormOpen(true);
  }

  async function saveData(payload) {
    setSaving(true);
    setError("");

    try {
      const { selected_agunan_ids, agunan_candidates, ...base } = payload;

      // Pengorderan baru: satu SHM menjadi satu baris.
      // Edit: hanya memperbarui baris yang sedang diedit.
      const orderMode = base.alasan_belum_migrasi === "PENGORDERAN" && !editing;

      const targets = orderMode
        ? agunan_candidates.filter((a) => selected_agunan_ids.includes(a.id))
        : [null];

      if (orderMode && !targets.length) {
        throw new Error("Pilih minimal satu SHM yang akan dimigrasikan.");
      }

      for (const agunan of targets) {
        const body = { ...base };

        if (agunan) {
          body.jenis_agunan =
            agunan.jenis_agunan === "SHM_NIB" ? "SHM_NIB" : "SHM";

          body.jenis_agunan_lainnya = "";

          // Data agunan utama tetap disimpan lengkap.
          body.nomor_sertifikat = agunan.nomor_sertifikat || "";

          body.nama_pemilik = agunan.nama_pemilik || "";

          body.desa = agunan.desa_kelurahan || "";

          body.luas_m2 =
            agunan.luas_tanah == null ? null : Number(agunan.luas_tanah);

          body.tanggal_terbit = agunan.tanggal_terbit_sertifikat || "";

          // Field order lama tetap diisi agar tidak
          // merusak kompatibilitas data yang sudah ada.
          body.order_jenis_agunan = body.jenis_agunan;

          body.order_jenis_agunan_lainnya = "";

          body.order_nomor_sertifikat = body.nomor_sertifikat;

          body.order_nama_pemilik = body.nama_pemilik;

          body.order_desa = body.desa;

          body.order_luas_m2 = body.luas_m2;

          body.order_tanggal_terbit = body.tanggal_terbit;
        }

        const res = await fetch("/api/admin/daftar-migrasi-legal", {
          method: editing ? "PATCH" : "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(
            editing
              ? {
                  ...body,
                  id: editing.id,
                }
              : {
                  ...body,
                  kode_unit: unit,
                },
          ),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Data gagal disimpan.");
        }
      }

      setFormOpen(false);
      setEditing(null);

      await loadData();
    } catch (e) {
      setError(e.message || "Data gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteData(item) {
    if (
      !window.confirm(
        `Hapus data migrasi legal untuk ${item.nama_debitur} — sertifikat ${
          item.nomor_sertifikat || "-"
        }?`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/daftar-migrasi-legal?id=${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Data gagal dihapus.");
      }

      setDetail(null);

      await loadData();
    } catch (e) {
      setError(e.message || "Data gagal dihapus.");
    }
  }

  const countDone = records.filter(
    (r) => r.status_migrasi === "SELESAI",
  ).length;

  return (
    <main className="w-full min-w-0 space-y-5 pb-8 sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-zinc-400">
            <Building2 size={16} />

            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Agunan · Legal
            </span>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Daftar Migrasi Legal
          </h1>

          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            Monitoring kelengkapan dan proses migrasi dokumen legal setiap
            agunan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium text-zinc-600">
            Unit: {activeUnit?.name || unit}
          </span>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 sm:flex-none"
          >
            <Plus size={17} />
            Tambah Data
          </button>
        </div>
      </header>

      {error && !formOpen && (
        <div className="break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, rekening, sertifikat, MKS..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputClass} min-w-0 flex-1 sm:w-56`}
            >
              <option value="SEMUA">Semua status</option>

              {STATUS_OPTIONS.map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />

              <span className="hidden sm:inline">Muat ulang</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-zinc-100 p-3 sm:grid-cols-3 sm:p-5">
          <div className="rounded-xl bg-zinc-50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Total Agunan
            </p>

            <p className="mt-1 text-xl font-semibold text-zinc-900">
              {records.length}
            </p>
          </div>

          <div className="rounded-xl bg-zinc-50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Selesai
            </p>

            <p className="mt-1 text-xl font-semibold text-zinc-900">
              {countDone}
            </p>
          </div>

          <div className="col-span-2 rounded-xl bg-zinc-50 p-3 sm:col-span-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Dalam Proses
            </p>

            <p className="mt-1 text-xl font-semibold text-zinc-900">
              {records.length - countDone}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-16 text-center">
            <Loader2 size={24} className="mx-auto animate-spin text-zinc-400" />

            <p className="mt-3 text-sm text-zinc-500">
              Memuat data migrasi legal...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
              <ClipboardList size={22} className="text-zinc-400" />
            </div>

            <p className="mt-4 text-sm font-semibold text-zinc-800">
              {search || statusFilter !== "SEMUA"
                ? "Data tidak ditemukan"
                : "Belum ada data migrasi legal"}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              Tambahkan data migrasi untuk mulai memantau proses setiap agunan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-5 xl:grid-cols-2">
            {filtered.map((r) => {
              const isOrder = r.alasan_belum_migrasi === "PENGORDERAN";

              const mksName =
                mksList.find((m) => m.id === r.mks_penanggung_jawab_id)?.nama ||
                "-";

              return (
                <article
                  key={r.id}
                  onClick={() => setDetail(r)}
                  onKeyDown={(e) => e.key === "Enter" && setDetail(r)}
                  tabIndex={0}
                  role="button"
                  className="flex min-w-0 cursor-pointer flex-col rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 sm:p-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                      <Building2 size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-sm font-semibold leading-5 text-zinc-900 sm:text-base">
                        {isOrder && r.nama_debitur_order
                          ? r.nama_debitur_order
                          : r.nama_debitur}
                      </h2>

                      <p className="mt-1 break-all font-mono text-xs text-zinc-500">
                        {r.rekening_pinjaman}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600">
                          {r.jenis_pinjaman}
                        </span>

                        <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600">
                          {collateralLabel(
                            r.jenis_agunan,
                            r.jenis_agunan_lainnya,
                          )}
                        </span>

                        <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600">
                          {r.status_legal || "Legal belum ditentukan"}
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      size={17}
                      className="mt-1 shrink-0 text-zinc-300"
                    />
                  </div>

                  {/* Detail agunan tetap ditampilkan, termasuk
                      pada data yang sedang dalam pengorderan. */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-3">
                    <div>
                      <p className="text-[10px] text-zinc-400">
                        Nomor Sertifikat
                      </p>

                      <p className="mt-1 break-words text-xs font-semibold text-zinc-800">
                        {r.nomor_sertifikat || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-zinc-400">Luas Agunan</p>

                      <p className="mt-1 text-xs font-semibold text-zinc-800">
                        {fmtArea(r.luas_m2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-zinc-400">
                        Status Migrasi
                      </p>

                      <p className="mt-1 text-xs font-semibold text-zinc-800">
                        {statusLabel(r.status_migrasi)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-zinc-400">
                        MKS Penanggung Jawab
                      </p>

                      <p className="mt-1 break-words text-xs font-semibold text-zinc-800">
                        {mksName}
                      </p>
                    </div>
                  </div>

                  {/* Pengorderan hanya menampilkan nama debitur,
                      rekening pinjaman, dan tanggal order. */}
                  {isOrder && (
                    <div className="mt-3 rounded-xl border border-zinc-200 p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        Informasi Pengorderan
                      </p>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] text-zinc-400">
                            Nama Debitur yang Diorder
                          </p>

                          <p className="mt-1 break-words text-xs font-semibold text-zinc-800">
                            {r.nama_debitur_order || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-zinc-400">
                            Tanggal Order
                          </p>

                          <p className="mt-1 text-xs font-semibold text-zinc-800">
                            {fmtDate(r.tanggal_order)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                    <span className="text-[11px] text-zinc-400">
                      {fmtDate(r.tanggal_migrasi)}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(r);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteData(r);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                        Hapus
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="border-t border-zinc-100 px-4 py-3 sm:px-5">
            <p className="text-xs text-zinc-400">
              Menampilkan {filtered.length} dari {records.length} data agunan ·
              Satu debitur dapat memiliki beberapa data agunan.
            </p>
          </div>
        )}
      </section>

      {formOpen && (
        <FormModal
          key={editing?.id || "new"}
          item={editing}
          unit={unit}
          notaris={notaris}
          mksList={mksList}
          onClose={() => {
            if (!saving) {
              setFormOpen(false);
              setEditing(null);
              setError("");
            }
          }}
          onSave={saveData}
          saving={saving}
          error={error}
        />
      )}

      {detail && (
        <DetailModal
          item={detail}
          notaris={notaris}
          mksList={mksList}
          onClose={() => setDetail(null)}
          onEdit={() => openEdit(detail)}
          onDelete={deleteData}
        />
      )}
    </main>
  );
}
