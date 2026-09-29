"use client";

import { Plus, Search } from "lucide-react";

import { PK_ROLES } from "@/lib/permissions/pkPermissions";

export default function PkToolbar({
  role,
  search,
  onSearchChange,
  loanTypeFilter,
  onLoanTypeChange,
  completenessFilter,
  onCompletenessChange,
  onAdd,
}) {
  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Data
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
            Data PK
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Pendataan PK, debitur, pasangan, agunan, dokumen, dan proses
            terkait.
          </p>
        </div>

        {(role === PK_ROLES.ADMIN || role === PK_ROLES.SGP) && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Plus size={17} />
            Tambah PK
          </button>
        )}
      </div>

      {/* FILTER */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_200px]">
          {/* SEARCH */}
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari PK / CIF / NIK / Nama / SHM..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100"
            />
          </div>

          {/* LOAN TYPE */}
          <select
            value={loanTypeFilter}
            onChange={(e) => onLoanTypeChange(e.target.value)}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
          >
            <option value="SEMUA">Semua Jenis</option>

            <option value="KUM">KUM</option>

            <option value="KUR">KUR</option>

            <option value="KPP">KPP</option>

            <option value="KSM">KSM</option>
          </select>

          {/* COMPLETENESS */}
          <select
            value={completenessFilter}
            onChange={(e) => onCompletenessChange(e.target.value)}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
          >
            <option value="SEMUA">Semua Kelengkapan</option>

            <option value="LENGKAP">Lengkap</option>

            <option value="BELUM_LENGKAP">Belum Lengkap</option>
          </select>
        </div>
      </div>
    </div>
  );
}
