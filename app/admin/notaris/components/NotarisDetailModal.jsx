"use client";

import {
  X,
  Building2,
  UserRound,
  MapPin,
  Wallet,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

export default function NotarisDetailModal({ record, onClose }) {
  if (!record) return null;

  const DetailItem = ({ icon: Icon, label, children }) => (
    <div className="min-w-0 rounded-xl bg-zinc-50 p-3 sm:p-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon size={15} />
        <span className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-zinc-800">
        {children || "Belum diisi"}
      </p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center overflow-y-auto bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
              <Building2 size={20} />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Detail Data Master
              </p>

              <h2 className="mt-1 break-words text-base font-semibold text-zinc-900">
                {record.nama_notaris || "Notaris/PPAT"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X size={19} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-4 sm:max-h-[80vh] sm:p-6">
          {/* JABATAN */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700">
              <ShieldCheck size={15} />
              Notaris/PPAT
            </span>
          </div>

          {/* IDENTITAS */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Identitas
            </p>

            <div className="grid grid-cols-1 gap-3">
              <DetailItem icon={UserRound} label="Nama Notaris/PPAT">
                {record.nama_notaris}
              </DetailItem>

              <DetailItem icon={CreditCard} label="NIK">
                {record.nik}
              </DetailItem>
            </div>
          </div>

          {/* WILAYAH KERJA */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Wilayah Kerja
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem icon={MapPin} label="Provinsi">
                {record.provinsi}
              </DetailItem>

              <DetailItem icon={MapPin} label="Kabupaten">
                {record.kabupaten}
              </DetailItem>
            </div>
          </div>

          {/* REKENING */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Informasi Rekening
            </p>

            <DetailItem icon={Wallet} label="Nomor Rekening">
              {record.nomor_rekening}
            </DetailItem>
          </div>

          {/* STATUS REKANAN */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Status Rekanan
            </p>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <CreditCard size={16} />
                <span className="text-sm font-medium">
                  Rekanan Bank Mandiri
                </span>
              </div>

              <span
                className={
                  record.jenis_rekanan
                    ? "rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                    : "rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-500"
                }
              >
                {record.jenis_rekanan ? "Iya" : "Tidak"}
              </span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-zinc-100 bg-white p-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
