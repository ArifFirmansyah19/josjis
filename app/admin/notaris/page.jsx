"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  Wallet,
  CreditCard,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import NotarisForm from "../notaris/components/NotarisForm";
import NotarisDetailModal from "../notaris/components/NotarisDetailModal";

import {
  getNotarisData,
  createNotaris,
  updateNotaris,
  deleteNotaris,
} from "../notaris/services/notarisSupabase";

export default function DataNotarisPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const result = await getNotarisData();
      setRecords(result || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal mengambil data notaris.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const sorted = [...records].sort((a, b) =>
      (a.nama_notaris || "").localeCompare(b.nama_notaris || "", "id", {
        sensitivity: "base",
      }),
    );

    if (!keyword) return sorted;

    return sorted.filter((record) =>
      [
        record.nama_notaris,
        record.nik,
        record.jabatan,
        record.provinsi,
        record.kabupaten,
        record.nomor_rekening,
        record.jenis_rekanan ? "iya" : "tidak",
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [records, search]);

  function openAddForm() {
    setEditingRecord(null);
    setError("");
    setFormOpen(true);
  }

  function openEditForm(record) {
    setViewingRecord(null);
    setEditingRecord(record);
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingRecord(null);
  }

  async function handleSave(formData) {
    try {
      setError("");

      const payload = {
        ...formData,
        jabatan: "Notaris/PPAT",
      };

      if (editingRecord) {
        await updateNotaris({
          id: editingRecord.id,
          ...payload,
        });
      } else {
        await createNotaris(payload);
      }

      closeForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan data notaris.");
      throw err;
    }
  }

  async function handleDelete(record) {
    const confirmed = window.confirm(
      `Hapus data Notaris/PPAT "${record.nama_notaris}"?`,
    );

    if (!confirmed) return;

    setDeletingId(record.id);
    setError("");

    try {
      await deleteNotaris(record.id);

      if (viewingRecord?.id === record.id) {
        setViewingRecord(null);
      }

      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menghapus data notaris.");
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
          Master Notaris/PPAT
        </h1>

        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          Kelola data Notaris/PPAT, identitas, wilayah kerja, dan rekening.
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NIK, kabupaten, atau rekening..."
              className="h-11 w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-3 text-base text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100 sm:text-sm"
            />
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-700 lg:w-auto"
          >
            <Plus size={17} />
            Tambah Notaris
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="px-4 py-16 text-center">
            <Loader2 size={24} className="mx-auto animate-spin text-zinc-400" />
            <p className="mt-3 text-sm text-zinc-500">
              Memuat data Notaris/PPAT...
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
              {search ? "Data tidak ditemukan" : "Belum ada data Notaris/PPAT"}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              {search
                ? "Coba gunakan kata kunci yang berbeda."
                : "Tambahkan data Notaris/PPAT untuk memulai."}
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
                      {record.nama_notaris || "Tanpa nama"}
                    </h2>

                    <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-600">
                      <ShieldCheck size={15} />
                      <span>Notaris/PPAT</span>
                    </div>
                  </div>
                </div>

                {/* IDENTITAS */}
                <div className="mt-5 space-y-3 rounded-xl bg-zinc-50 p-3 sm:p-4">
                  <div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <UserRound size={14} />
                      <span className="text-[11px] font-medium uppercase tracking-wide">
                        NIK
                      </span>
                    </div>

                    <p className="mt-1.5 break-all font-mono text-sm font-medium text-zinc-800">
                      {record.nik || "Belum diisi"}
                    </p>
                  </div>

                  <div className="border-t border-zinc-200" />

                  <div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <MapPin size={14} />
                      <span className="text-[11px] font-medium uppercase tracking-wide">
                        Wilayah Kerja
                      </span>
                    </div>

                    <p className="mt-1.5 break-words text-sm font-medium text-zinc-800">
                      {[record.kabupaten, record.provinsi]
                        .filter(Boolean)
                        .join(", ") || "Belum diisi"}
                    </p>
                  </div>
                </div>

                {/* REKENING */}
                <div className="mt-3 rounded-xl bg-zinc-50 p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Wallet size={15} />
                    <span className="text-[11px] font-medium uppercase tracking-wide">
                      Nomor Rekening
                    </span>
                  </div>

                  <p className="mt-2 break-all font-mono text-sm font-medium leading-6 text-zinc-800">
                    {record.nomor_rekening || "Belum diisi"}
                  </p>
                </div>

                {/* STATUS REKANAN */}
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-3">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <CreditCard size={15} />
                    <span className="text-xs font-medium">
                      Rekanan Bank Mandiri
                    </span>
                  </div>

                  <span
                    className={
                      record.jenis_rekanan
                        ? "rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                        : "rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500"
                    }
                  >
                    {record.jenis_rekanan ? "Iya" : "Tidak"}
                  </span>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setViewingRecord(record)}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    Detail
                  </button>

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
              Notaris/PPAT
            </p>
          </div>
        )}
      </section>

      {/* FORM MODAL */}
      <NotarisForm
        open={formOpen}
        editingRecord={editingRecord}
        onClose={closeForm}
        onSave={handleSave}
      />

      {/* DETAIL MODAL */}
      <NotarisDetailModal
        record={viewingRecord}
        onClose={() => setViewingRecord(null)}
      />
    </main>
  );
}
