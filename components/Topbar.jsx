"use client";

import { Bell, ChevronDown, Menu, Search, UserRound } from "lucide-react";

import { useUnit } from "./UnitContext";
export default function Topbar({ onMenuClick }) {
  const { selectedUnit, setSelectedUnit, activeUnit, units } = useUnit();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="flex h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="relative hidden max-w-xl flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

          <input
            type="text"
            placeholder="Cari PK / CIF / NIK / Nama / SHM / SIATOMIC / BAST / Order / Migrasi..."
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white"
          />
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2">
          {/* Unit Desktop */}
          <div className="relative hidden sm:block">
            <select
              value={selectedUnit}
              onChange={(event) => setSelectedUnit(event.target.value)}
              className="h-11 min-w-[205px] cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white pl-3 pr-10 text-sm font-medium text-zinc-800 outline-none transition hover:bg-zinc-50 focus:border-zinc-400"
            >
              {units.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.value === "JKK1" ? "JKK 1" : "JKK 2"} · {unit.code}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>

          {/* Notification */}
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Notifikasi"
          >
            <Bell className="h-5 w-5" />

            <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* Profile */}
          <button
            type="button"
            className="hidden h-11 items-center gap-2 rounded-xl px-2 transition hover:bg-zinc-100 sm:flex"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <UserRound className="h-4 w-4" />
            </div>

            <div className="hidden text-left lg:block">
              <p className="text-xs font-semibold text-zinc-900">Superadmin</p>
              <p className="text-[11px] text-zinc-500">{activeUnit.code}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Unit */}
      <div className="border-t border-zinc-100 px-4 py-3 sm:hidden">
        <div className="relative">
          <select
            value={selectedUnit}
            onChange={(event) => setSelectedUnit(event.target.value)}
            className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 pr-10 text-sm font-medium text-zinc-800 outline-none focus:border-zinc-400"
          >
            {units.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.value === "JKK1" ? "JKK 1" : "JKK 2"} · {unit.code}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>
    </header>
  );
}
