"use client";

import { useEffect, useMemo, useState } from "react";
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
  Flame,
  HeartPulse,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const JENIS_ASURANSI = [
  { value: "ASURANSI_KEBAKARAN", label: "Asuransi Kebakaran" },
  { value: "ASURANSI_JIWA", label: "Asuransi Jiwa" },
];

function getJenisLabel(value) {
  return (
    JENIS_ASURANSI.find((item) => item.value === value)?.label ||
    "Belum ditentukan"
  );
}

function JenisIcon({ jenis }) {
  if (jenis === "ASURANSI_JIWA") {
    return <HeartPulse size={16} />;
  }

  if (jenis === "ASURANSI_KEBAKARAN") {
    return <Flame size={16} />;
  }

  return <ShieldCheck size={16} />;
}

export default function AsuradurPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [form, setForm] = useState({
    nama_asuradur: "",
    jenis_asuransi: "",
    nomor_rekening_giro: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("asuradur")
        .select("*")
        .order("nama_asuradur", { ascending: true });

      if (error) throw error;

      setRecords(data || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal mengambil data asuradur.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return records;

    return records.filter((item) =>
      [
        item.nama_asuradur,
        item.jenis_asuransi,
        getJenisLabel(item.jenis_asuransi),
        item.nomor_rekening_giro,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [records, search]);

  function openAddForm() {
    setEditingRecord(null);
    setForm({
      nama_asuradur: "",
      jenis_asuransi: "",
      nomor_rekening_giro: "",
    });
    setError("");
    setFormOpen(true);
  }

  function openEditForm(record) {
    setEditingRecord(record);
    setForm({
      nama_asuradur: record.nama_asuradur || "",
      jenis_asuransi: record.jenis_asuransi || "",
      nomor_rekening_giro: record.nomor_rekening_giro || "",
    });
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingRecord(null);
    setError("");
  }

  async function handleSave(event) {
    event.preventDefault();

    const nama = form.nama_asuradur.trim();
    const rekening = form.nomor_rekening_giro.trim();

    if (!nama) {
      setError("Nama asuradur wajib diisi.");
      return;
    }

    if (!form.jenis_asuransi) {
      setError("Silakan pilih jenis asuransi.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        nama_asuradur: nama,
        jenis_asuransi: form.jenis_asuransi,
        nomor_rekening_giro: rekening || null,
        updated_at: new Date().toISOString(),
      };

      const result = editingRecord
        ? await supabase
            .from("asuradur")
            .update(payload)
            .eq("id", editingRecord.id)
        : await supabase.from("asuradur").insert(payload);

      if (result.error) throw result.error;

      setFormOpen(false);
      setEditingRecord(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err?.code === "23505"
          ? "Nama asuradur tersebut sudah terdaftar."
          : err?.message || "Gagal menyimpan data asuradur.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    const confirmed = window.confirm(
      `Hapus asuradur "${record.nama_asuradur}"?`,
    );

    if (!confirmed) return;

    setDeletingId(record.id);
    setError("");

    try {
      const { error } = await supabase
        .from("asuradur")
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menghapus data asuradur.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="w-full min-w-0 space-y-5 pb-8 sm:space-y-6">
      {/* HEADER */}
      <header>
        <div className="mb-2 flex items-center gap-2 text-zinc-400">
          <Building2 size={16} />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Data Master
          </span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Master Asuradur
        </h1>

        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          Kelola perusahaan asuransi, jenis asuransi, dan rekening giro.
        </p>
      </header>

      {/* ERROR GLOBAL */}
      {error && !formOpen && (
        <div className="break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* MAIN PANEL */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {/* TOOLBAR */}
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-3 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, jenis, atau rekening..."
              className="h-11 w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-3 text-base text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100 sm:text-sm"
            />
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-700 lg:w-auto"
          >
            <Plus size={17} />
            Tambah Asuradur
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="px-4 py-16 text-center">
            <Loader2 size={24} className="mx-auto animate-spin text-zinc-400" />
            <p className="mt-3 text-sm text-zinc-500">
              Memuat data asuradur...
            </p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && filteredRecords.length === 0 && (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
              <Building2 size={22} className="text-zinc-400" />
            </div>
            <p className="mt-4 text-sm font-semibold text-zinc-800">
              {search ? "Data tidak ditemukan" : "Belum ada data asuradur"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {search
                ? "Coba gunakan kata kunci yang berbeda."
                : "Tambahkan data asuradur untuk memulai."}
            </p>
          </div>
        )}

        {/* RECORD CARDS */}
        {!loading && filteredRecords.length > 0 && (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-5 xl:grid-cols-2">
            {filteredRecords.map((record) => (
              <article
                key={record.id}
                className="flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm sm:p-5"
              >
                {/* CARD HEADER */}
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                    <Building2 size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-sm font-semibold leading-5 text-zinc-900 sm:text-base">
                      {record.nama_asuradur}
                    </h2>

                    <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-600">
                      <JenisIcon jenis={record.jenis_asuransi} />
                      <span className="break-words">
                        {getJenisLabel(record.jenis_asuransi)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* REKENING */}
                <div className="mt-5 rounded-xl bg-zinc-50 p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Wallet size={15} />
                    <span className="text-[11px] font-medium uppercase tracking-wide">
                      Nomor Rekening Giro
                    </span>
                  </div>

                  <p className="mt-2 break-all font-mono text-sm font-medium leading-6 text-zinc-800">
                    {record.nomor_rekening_giro || "Belum diisi"}
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={() => openEditForm(record)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(record)}
                    disabled={deletingId === record.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === record.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Hapus
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* FOOTER */}
        {!loading && (
          <div className="border-t border-zinc-100 px-4 py-3 sm:px-5">
            <p className="text-xs text-zinc-400">
              Menampilkan {filteredRecords.length} dari {records.length}{" "}
              asuradur
            </p>
          </div>
        )}
      </section>

      {/* FORM MODAL */}
      {formOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  {editingRecord ? "Edit Asuradur" : "Tambah Asuradur"}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Lengkapi informasi perusahaan asuransi.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Tutup form"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={19} />
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSave} className="space-y-4 p-4 sm:p-6">
              {error && (
                <div className="break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Nama Asuradur
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={form.nama_asuradur}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      nama_asuradur: e.target.value,
                    }))
                  }
                  placeholder="Masukkan nama asuradur"
                  className="h-11 w-full min-w-0 rounded-xl border border-zinc-200 px-3 text-base text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 sm:text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Jenis Asuransi
                </label>
                <select
                  required
                  value={form.jenis_asuransi}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      jenis_asuransi: e.target.value,
                    }))
                  }
                  className="h-11 w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 sm:text-sm"
                >
                  <option value="" disabled>
                    Pilih jenis asuransi
                  </option>
                  {JENIS_ASURANSI.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Nomor Rekening Giro
                </label>
                <input
                  type="text"
                  value={form.nomor_rekening_giro}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      nomor_rekening_giro: e.target.value,
                    }))
                  }
                  placeholder="Contoh: 110-00-2031704-5"
                  className="h-11 w-full min-w-0 rounded-xl border border-zinc-200 px-3 font-mono text-base text-zinc-800 outline-none transition placeholder:font-sans placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 sm:text-sm"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="h-11 w-full rounded-xl border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 sm:w-auto"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
