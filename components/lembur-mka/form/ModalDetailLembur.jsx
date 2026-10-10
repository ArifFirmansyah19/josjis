"use client";

import { Pencil, Trash2, X } from "lucide-react";
import { formatDateLong } from "../utils/lemburHelpers";

export default function ModalDetailLembur({
  modal,
  setModal,
  selectedRecords,
  master,
  handleEdit,
  handleDelete,
  saving,
}) {
  return (
    <>
      {modal?.type === "detail" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Detail Lembur
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
            <div className="divide-y divide-zinc-100">
              {selectedRecords.map((record, index) => {
                const mka = record.mka_nama
                  ? {
                      name: record.mka_nama,
                      nip: record.mka_nip,
                      position: record.mka_jabatan,
                    }
                  : master.mka.find((item) => item.id === record.mka_id);
                return (
                  <div key={record.id} className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-zinc-900">
                            {mka?.name || "-"}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {mka?.position || "MKA"} · Data snapshot saat lembur
                            dibuat
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(record)}
                          className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          disabled={saving}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Hapus"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-zinc-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Waktu
                        </div>
                        <div className="mt-1 font-semibold text-zinc-800">
                          {record.jam_mulai} - {record.jam_selesai}
                        </div>
                      </div>
                      <div className="rounded-xl bg-zinc-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Pekerjaan
                        </div>
                        <div className="mt-1 font-semibold text-zinc-800">
                          {record.pekerjaan || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
