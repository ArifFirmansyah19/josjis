/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

const EMPTY_FORM = {
  tanggal: "",
  keterangan: "",
  tujuan: "",
};

export default function SuratKeluarForm({
  open,
  editingRecord,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;

    if (editingRecord) {
      setForm({
        tanggal: editingRecord.tanggal || "",
        keterangan: editingRecord.keterangan || "",
        tujuan: editingRecord.tujuan || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editingRecord]);

  if (!open) return null;

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.tanggal || !form.keterangan || !form.tujuan) {
      return;
    }

    onSave(form);
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">
              {editingRecord ? "Edit Pencatatan" : "Tambah Pencatatan"}
            </h3>

            <p className="mt-0.5 text-xs text-zinc-500">
              Isi data surat keluar
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Tanggal
              </label>

              <input
                type="date"
                value={form.tanggal}
                onChange={(event) => updateField("tanggal", event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Keterangan
              </label>

              <textarea
                value={form.keterangan}
                onChange={(event) =>
                  updateField("keterangan", event.target.value)
                }
                rows={3}
                placeholder="Contoh: BAST Pengembalian"
                className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Tujuan
              </label>

              <input
                type="text"
                value={form.tujuan}
                onChange={(event) => updateField("tujuan", event.target.value)}
                placeholder="Contoh: Kantor Cabang"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              Batal
            </button>

            <button
              type="submit"
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              {editingRecord ? "Simpan Perubahan" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
