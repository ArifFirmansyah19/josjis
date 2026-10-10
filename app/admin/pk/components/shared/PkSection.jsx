import { LockKeyhole } from "lucide-react";

export default function PkSection({
  title,
  description,
  children,
  locked = false,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>

          {description && (
            <p className="mt-1 text-xs text-zinc-500">{description}</p>
          )}
        </div>

        {locked && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
            <LockKeyhole size={12} />
            Dikunci Admin
          </span>
        )}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}
