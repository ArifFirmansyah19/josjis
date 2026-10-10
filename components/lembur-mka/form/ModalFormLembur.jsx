"use client";

import { X } from "lucide-react";
import { formatDateLong } from "../utils/lemburHelpers";

export default function ModalFormLembur({
  modal,
  setModal,
  form,
  setForm,
  currentUnitInfo,
  master,
  handleSubmit,
  saving,
}) {
  return (
    <>
      {modal?.type === "form" || modal?.type === "edit" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  {modal.type === "edit" ? "Edit Lembur" : "Pengajuan Lembur"}
                </div>
                <h2 className="mt-1 text-xl font-bold text-zinc-900">
                  {formatDateLong(modal.date)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={19} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
                <div>
                  <span className="font-semibold">Unit:</span>{" "}
                  {currentUnitInfo.name}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">MKA:</span>{" "}
                  {master.mka?.map((item) => item.name).join(", ") || "-"}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Pengawas:</span>{" "}
                  {master.supervisor?.name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-zinc-700">
                    Jam Mulai
                  </span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startTime: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-zinc-700">
                    Jam Selesai
                  </span>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endTime: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
                    required
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-zinc-700">
                  Catatan / Pekerjaan
                </span>
                <textarea
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Tuliskan pekerjaan yang harus diselesaikan..."
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : modal.type === "edit"
                      ? "Simpan Perubahan"
                      : "Ajukan Lembur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
