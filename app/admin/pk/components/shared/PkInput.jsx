"use client";

export default function PkInput({
  label = "",
  value,
  onChange,
  type = "text",
  placeholder = "",
  disabled = false,
  suffix = "",
}) {
  return (
    <div className="min-w-0">
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          type={type}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={[
            "h-10 w-full rounded-xl border px-3 text-sm outline-none transition",
            suffix ? "pr-16" : "",
            disabled
              ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
              : "border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100",
          ].join(" ")}
        />

        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
