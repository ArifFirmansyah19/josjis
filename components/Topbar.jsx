"use client";

import { Bell, ChevronDown, Menu, Search, UserRound, X } from "lucide-react";

import { useState } from "react";
import { useUnit } from "./UnitContext";

export default function Topbar({ onMenuClick }) {
  const { selectedUnit, setSelectedUnit, activeUnit, units } = useUnit();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const unitSelector = (
    <div className="relative min-w-0">
      <select
        value={selectedUnit}
        onChange={(event) => setSelectedUnit(event.target.value)}
        aria-label="Pilih unit kerja"
        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-zinc-50 pl-3 pr-9 text-sm font-medium text-zinc-800 outline-none transition hover:bg-white focus:border-[#174C40] focus:ring-2 focus:ring-[#174C40]/10"
      >
        {units.map((unit) => (
          <option key={unit.value} value={unit.value}>
            {unit.value === "JKK1" ? "JKK 1" : "JKK 2"} · {unit.code}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
    </div>
  );

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-zinc-200 bg-white/95 backdrop-blur">
      {/* Baris utama */}
      <div className="flex min-h-[68px] items-center gap-2 px-3 sm:h-20 sm:gap-3 sm:px-6 lg:px-8">
        {/* Hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Pencarian desktop dan tablet */}
        <div className="relative hidden max-w-xl flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari PK / CIF / NIK / Nama / SHM..."
            aria-label="Cari data JOSJIS"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#174C40] focus:bg-white focus:ring-2 focus:ring-[#174C40]/10"
          />
        </div>

        {/* Aksi kanan */}
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Tombol pencarian mobile */}
          <button
            type="button"
            onClick={() => setSearchOpen((previous) => !previous)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
            aria-label={searchOpen ? "Tutup pencarian" : "Buka pencarian"}
            aria-expanded={searchOpen}
          >
            {searchOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>

          {/* Pemilih unit desktop */}
          <div className="hidden w-[205px] sm:block">{unitSelector}</div>

          {/* Notifikasi selalu terlihat */}
          <button
            type="button"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Notifikasi"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* Profil desktop */}
          <button
            type="button"
            className="hidden h-11 items-center gap-2 rounded-xl px-2 transition hover:bg-zinc-100 sm:flex"
            aria-label="Profil pengguna"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#174C40] text-white">
              <UserRound className="h-4 w-4" />
            </div>

            <div className="hidden text-left lg:block">
              <p className="text-xs font-semibold text-zinc-900">Superadmin</p>
              <p className="text-[11px] text-zinc-500">
                {activeUnit?.code ?? ""}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Pencarian mobile yang bisa dibuka */}
      {searchOpen && (
        <div className="border-t border-zinc-100 px-3 py-3 md:hidden">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              // Input pencarian siap dihubungkan ke fitur pencarian global.
            }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

            <input
              autoFocus
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari PK, CIF, NIK, nama, SHM..."
              aria-label="Cari data JOSJIS"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#174C40] focus:bg-white focus:ring-2 focus:ring-[#174C40]/10"
            />
          </form>
        </div>
      )}

      {/* Pemilih unit mobile */}
      <div className="border-t border-zinc-100 px-3 py-2.5 sm:hidden">
        {unitSelector}
      </div>
    </header>
  );
}
