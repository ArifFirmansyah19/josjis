"use client";

import { Download, Plus } from "lucide-react";

export default function SuratKeluarToolbar({
  unit,
  onUnitChange,
  onAdd,
  onExport,
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Unit */}
      <div className="inline-flex w-fit rounded-xl bg-zinc-100 p-1">
        {["JKK 1", "JKK 2"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onUnitChange(item)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
              unit === item
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          <Download className="h-4 w-4" />
          Export PDF
        </button>

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Tambah Pencatatan
        </button>
      </div>
    </div>
  );
}
