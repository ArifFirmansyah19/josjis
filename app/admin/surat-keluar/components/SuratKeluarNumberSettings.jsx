"use client";

import { useEffect, useState } from "react";

import {
  getSuratKeluarCounter,
  setSuratKeluarNextNumber,
} from "../services/suratKeluarSupabase";

function formatNumber(value) {
  return String(value ?? 0).padStart(3, "0");
}

export default function SuratKeluarNumberSettings({
  open,
  unit,
  tahun,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [counter, setCounter] = useState(null);
  const [nomorBerikutnya, setNomorBerikutnya] = useState("001");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadCounter() {
      setLoading(true);
      setError("");

      try {
        const kodeUnit = unit === "JKK 1" ? "JKK1" : "JKK2";

        const result = await getSuratKeluarCounter(kodeUnit, tahun);

        if (cancelled) return;

        setCounter(result);

        const nextNumber = Number(result.nomor_terakhir || 0) + 1;

        setNomorBerikutnya(String(nextNumber));
      } catch (err) {
        if (cancelled) return;

        setError(err?.message || "Gagal mengambil pengaturan nomor surat.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCounter();

    return () => {
      cancelled = true;
    };
  }, [open, unit, tahun]);

  if (!open) return null;

  async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const kodeUnit = unit === "JKK 1" ? "JKK1" : "JKK2";

      const result = await setSuratKeluarNextNumber(
        kodeUnit,
        tahun,
        nomorBerikutnya,
      );

      setCounter(result);

      if (onSaved) {
        await onSaved(result);
      }

      onClose();
    } catch (err) {
      setError(err?.message || "Gagal menyimpan pengaturan nomor.");
    } finally {
      setSaving(false);
    }
  }

  const nomorTerakhir = Number(counter?.nomor_terakhir || 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-zinc-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Pengaturan Nomor Surat
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Atur nomor surat berikutnya untuk register tahun ini.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-xl leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Tutup"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-5 px-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Unit
                </label>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800">
                  {unit}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Tahun
                </label>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800">
                  {tahun}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600">
                  Nomor terakhir digunakan
                </span>

                <span className="text-lg font-semibold tabular-nums text-zinc-900">
                  {loading ? "..." : formatNumber(nomorTerakhir)}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="nomor-berikutnya"
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                Nomor berikutnya
              </label>

              <input
                id="nomor-berikutnya"
                type="number"
                min="1"
                step="1"
                value={nomorBerikutnya}
                onChange={(event) => setNomorBerikutnya(event.target.value)}
                disabled={loading || saving}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-lg font-semibold tabular-nums outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100"
              />

              <p className="mt-1.5 text-xs text-zinc-500">
                Contoh: isi 128 jika surat berikutnya harus bernomor 128.
              </p>
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
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading || saving}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
