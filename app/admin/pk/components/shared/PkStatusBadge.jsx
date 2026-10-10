export default function PkStatusBadge({ children, tone = "default" }) {
  const tones = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
    default: "bg-zinc-100 text-zinc-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
        tones[tone] || tones.default
      }`}
    >
      {children}
    </span>
  );
}
