"use client";

import { ChevronDown } from "lucide-react";

export default function PkSelect({
  label = "",
  value,
  onChange,
  options = [],
  children,
  disabled = false,
}) {
  return (
    <div className="min-w-0">
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          className={[
            "h-10 w-full appearance-none rounded-xl border px-3 pr-9 text-sm outline-none transition",
            disabled
              ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
              : "border-zinc-200 bg-white text-zinc-900 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100",
          ].join(" ")}
        >
          {options.length > 0
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </div>
    </div>
  );
}
