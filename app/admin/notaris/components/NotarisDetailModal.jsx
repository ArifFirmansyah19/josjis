"use client";

import { X } from "lucide-react";

export default function NotarisDetailModal({ record, onClose }) {
  if (!record) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Detail Notaris
            </p>

            <h2 className="mt-1 text-lg font-bold text-zinc-900">
              {record.nama_notaris}
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

        <div className="space-y-4 px-4 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Nama Notaris
            </p>

            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {record.nama_notaris}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Provinsi
              </p>

              <p className="mt-1 text-sm text-zinc-800">
                {record.provinsi || "-"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Kabupaten
              </p>

              <p className="mt-1 text-sm text-zinc-800">
                {record.kabupaten || "-"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Nomor Rekening
            </p>

            <div className="mt-1 rounded-xl bg-zinc-50 p-3">
              <p className="break-all font-mono text-sm text-zinc-800">
                {record.nomor_rekening || "-"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Jenis Rekanan
            </p>

            <p
              className={
                record.jenis_rekanan
                  ? "mt-1 text-sm font-semibold text-emerald-700"
                  : "mt-1 text-sm font-semibold text-zinc-500"
              }
            >
              {record.jenis_rekanan ? "Iya" : "Tidak"}
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
