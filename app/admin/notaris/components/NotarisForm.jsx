"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const EMPTY_FORM = {
  namaNotaris: "",
  provinsi: "",
  kabupaten: "",
  nomorRekening: "",
  jenisRekanan: false,
};

export default function NotarisForm({ open, editingRecord, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (editingRecord) {
      setForm({
        namaNotaris: editingRecord.nama_notaris || "",
        provinsi: editingRecord.provinsi || "",
        kabupaten: editingRecord.kabupaten || "",
        nomorRekening: editingRecord.nomor_rekening || "",
        jenisRekanan: Boolean(editingRecord.jenis_rekanan),
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setError("");
  }, [open, editingRecord]);

  if (!open) return null;

  function handleChange(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.namaNotaris.trim()) {
      setError("Nama Notaris wajib diisi.");
      return;
    }

    if (!form.provinsi.trim()) {
      setError("Provinsi wajib diisi.");
      return;
    }

    if (!form.kabupaten.trim()) {
      setError("Kabupaten wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await onSave(form);
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal menyimpan data notaris.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Master Data
            </p>

            <h2 className="mt-1 text-lg font-bold text-zinc-900">
              {editingRecord ? "Edit Notaris" : "Tambah Notaris"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto">
          <div className="space-y-4 px-4 py-5 sm:px-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Nama Notaris
              </label>

              <input
                type="text"
                value={form.namaNotaris}
                onChange={(event) =>
                  handleChange("namaNotaris", event.target.value)
                }
                placeholder="Nama lengkap notaris"
                className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Provinsi
                </label>

                <input
                  type="text"
                  value={form.provinsi}
                  onChange={(event) =>
                    handleChange("provinsi", event.target.value)
                  }
                  placeholder="Provinsi"
                  className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Kabupaten
                </label>

                <input
                  type="text"
                  value={form.kabupaten}
                  onChange={(event) =>
                    handleChange("kabupaten", event.target.value)
                  }
                  placeholder="Kabupaten"
                  className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Nomor Rekening
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={form.nomorRekening}
                onChange={(event) =>
                  handleChange("nomorRekening", event.target.value)
                }
                placeholder="Nomor rekening"
                className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 px-3 font-mono text-sm outline-none focus:border-zinc-400"
              />

              <p className="mt-1 text-[10px] text-zinc-400">
                Nomor rekening bebas sesuai data rekening.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Jenis Rekanan
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange("jenisRekanan", true)}
                  className={
                    form.jenisRekanan
                      ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700"
                      : "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50"
                  }
                >
                  Iya
                </button>

                <button
                  type="button"
                  onClick={() => handleChange("jenisRekanan", false)}
                  className={
                    !form.jenisRekanan
                      ? "rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2.5 text-sm font-semibold text-zinc-800"
                      : "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50"
                  }
                >
                  Tidak
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving
                ? "Menyimpan..."
                : editingRecord
                  ? "Simpan Perubahan"
                  : "Simpan Notaris"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
