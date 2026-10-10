export default function PkField({
  label,
  children,
  required = false,
  description = "",
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-600">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {children}

      {description && (
        <span className="mt-1 block text-[11px] text-zinc-400">
          {description}
        </span>
      )}
    </label>
  );
}
