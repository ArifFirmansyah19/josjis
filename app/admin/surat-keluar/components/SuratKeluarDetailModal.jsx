"use client";

import { X } from "lucide-react";

function formatNomor(nomor) {
  return String(nomor ?? 0).padStart(3, "0");
}

function formatTanggal(tanggal) {
  if (!tanggal) return "-";

  const date = new Date(`${tanggal}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function SuratKeluarDetailModal({ record, onClose }) {
  if (!record) return null;

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        bg-black/40
        p-4
        backdrop-blur-[2px]
      "
      onClick={onClose}
    >
      <div
        className="
          w-full
          max-w-lg
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
        onClick={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 sm:text-xs">
              Detail Surat Keluar
            </p>

            <h2 className="mt-1 text-lg font-bold text-zinc-900 sm:text-xl">
              Nomor {formatNomor(record.nomor_urut)}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-xl
              p-2
              text-zinc-500
              transition
              hover:bg-zinc-100
              hover:text-zinc-900
            "
            aria-label="Tutup"
          >
            <X size={19} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="max-h-[75vh] overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="space-y-4">
            {/* NOMOR */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Nomor
              </p>

              <p className="mt-1 text-sm font-semibold text-zinc-900 sm:text-base">
                {formatNomor(record.nomor_urut)}
              </p>
            </div>

            {/* TANGGAL */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Tanggal
              </p>

              <p className="mt-1 text-sm text-zinc-800 sm:text-base">
                {formatTanggal(record.tanggal)}
              </p>
            </div>

            {/* HARI */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Hari
              </p>

              <p className="mt-1 text-sm text-zinc-800 sm:text-base">
                {record.hari || "-"}
              </p>
            </div>

            {/* KETERANGAN */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Keterangan
              </p>

              <div className="mt-1 rounded-xl bg-zinc-50 p-3">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800 sm:text-base">
                  {record.keterangan || "-"}
                </p>
              </div>
            </div>

            {/* TUJUAN */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Tujuan
              </p>

              <div className="mt-1 rounded-xl bg-zinc-50 p-3">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800 sm:text-base">
                  {record.tujuan || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="
              w-full
              rounded-xl
              bg-zinc-900
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-zinc-800
            "
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
