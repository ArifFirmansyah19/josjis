"use client";

import { Plus, Settings, FileDown } from "lucide-react";

export default function SuratKeluarToolbar({
  unit,
  tahun,
  onUnitChange,
  onTahunChange,
  onAdd,
  onSettings,
  onExport,
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Buku Register
          </p>

          <h2 className="mt-1 text-lg font-semibold text-zinc-900">
            Surat Keluar
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Register surat keluar resmi berdasarkan unit dan tahun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 outline-none focus:border-zinc-900"
          >
            <option value="JKK 1">JKK 1</option>
            <option value="JKK 2">JKK 2</option>
          </select>

          <select
            value={tahun}
            onChange={(e) => onTahunChange(Number(e.target.value))}
            className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 outline-none focus:border-zinc-900"
          >
            {Array.from({ length: 7 }, (_, index) => {
              const year = new Date().getFullYear() - 3 + index;

              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={onSettings}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <Settings size={16} />
            Pengaturan Nomor
          </button>

          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <FileDown size={16} />
            Export PDF
          </button>

          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Plus size={17} />
            Tambah Surat
          </button>
        </div>
      </div>
    </div>
  );
}
