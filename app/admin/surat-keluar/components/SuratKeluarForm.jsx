"use client";

import { useEffect, useState } from "react";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function SuratKeluarForm({
  open,
  editingRecord,
  selectedYear,
  onClose,
  onSave,
}) {
  const [tanggal, setTanggal] = useState(getToday());
  const [keterangan, setKeterangan] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setTanggal(editingRecord?.tanggal || getToday());
    setKeterangan(editingRecord?.keterangan || "");
    setTujuan(editingRecord?.tujuan || "");
    setError("");
  }, [open, editingRecord]);

  if (!open) return null;

  const isEdit = Boolean(editingRecord);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!tanggal || !keterangan.trim() || !tujuan.trim()) {
      setError("Tanggal, keterangan, dan tujuan wajib diisi.");
      return;
    }

    const year = Number(tanggal.slice(0, 4));

    if (year !== selectedYear) {
      setError(`Tanggal surat harus berada pada tahun ${selectedYear}.`);
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave({
        tanggal,
        keterangan: keterangan.trim(),
        tujuan: tujuan.trim(),
      });
    } catch (err) {
      setError(err?.message || "Gagal menyimpan surat.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-zinc-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            {isEdit ? "Edit Surat Keluar" : "Tambah Surat Keluar"}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {isEdit
              ? `Nomor ${String(editingRecord.nomor_urut).padStart(
                  3,
                  "0",
                )} tidak akan berubah.`
              : `Surat akan mendapatkan nomor otomatis untuk tahun ${selectedYear}.`}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-6">
            {isEdit && (
              <div className="rounded-xl bg-zinc-50 px-4 py-3">
                <p className="text-xs text-zinc-400">Nomor Surat</p>

                <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">
                  {String(editingRecord.nomor_urut).padStart(3, "0")}
                </p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Tanggal
              </label>

              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Keterangan
              </label>

              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={4}
                disabled={saving}
                placeholder="Masukkan keterangan surat..."
                className="w-full resize-none rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Tujuan
              </label>

              <input
                type="text"
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                disabled={saving}
                placeholder="Contoh: Notaris / KCP / Debitur"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
