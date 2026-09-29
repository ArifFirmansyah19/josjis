"use client";

import { Plus, Search } from "lucide-react";

export default function NotarisToolbar({ search, onSearchChange, onAdd }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">Data Notaris</h2>

          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            Master data notaris yang digunakan dalam proses agunan.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cari notaris..."
              className="
                h-10
                w-full
                rounded-xl
                border
                border-zinc-200
                bg-white
                pl-9
                pr-3
                text-sm
                outline-none
                transition
                focus:border-zinc-400
                sm:w-64
              "
            />
          </div>

          <button
            type="button"
            onClick={onAdd}
            className="
              inline-flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-zinc-900
              px-4
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-zinc-800
            "
          >
            <Plus size={16} />
            Tambah Notaris
          </button>
        </div>
      </div>
    </div>
  );
}
