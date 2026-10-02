"use client";

import { Search, Filter, ChevronDown, X } from "lucide-react";

import {
  PRODUCT_OPTIONS,
  LIMIT_OPTIONS,
  MONTH_OPTIONS,
} from "../constants/pkConstants";

function FilterSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-xs font-medium text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />
      </div>
    </div>
  );
}

export default function PkFilter({
  search,
  setSearch,

  productFilter,
  setProductFilter,

  mksFilter,
  setMksFilter,

  limitFilter,
  setLimitFilter,

  monthFilter,
  setMonthFilter,

  yearFilter,
  setYearFilter,

  mksOptions,
  yearOptions,

  visibleCount,
  totalCount,

  resetFilters,
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100">
          <Filter size={14} className="text-zinc-600" />
        </div>

        <div>
          <div className="text-xs font-bold text-zinc-800">Filter Data PK</div>

          <div className="text-[10px] text-zinc-400">
            Cari dan saring data PK
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {/* SEARCH */}

        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Pencarian Global
          </label>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="PK / CIF / NIK / Debitur / MKS..."
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-9 text-xs text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <FilterSelect
          label="Produk"
          value={productFilter}
          onChange={setProductFilter}
          options={PRODUCT_OPTIONS}
        />

        <FilterSelect
          label="MKS"
          value={mksFilter}
          onChange={setMksFilter}
          options={mksOptions}
        />

        <FilterSelect
          label="Limit"
          value={limitFilter}
          onChange={setLimitFilter}
          options={LIMIT_OPTIONS}
        />

        <FilterSelect
          label="Bulan PK"
          value={monthFilter}
          onChange={setMonthFilter}
          options={MONTH_OPTIONS}
        />

        <FilterSelect
          label="Tahun PK"
          value={yearFilter}
          onChange={setYearFilter}
          options={yearOptions}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
        <div className="text-[10px] text-zinc-400">
          Menampilkan{" "}
          <span className="font-bold text-zinc-700">{visibleCount}</span> dari{" "}
          <span className="font-bold text-zinc-700">{totalCount}</span> PK
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
}
