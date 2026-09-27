import { getCertificateOrderStatus } from "@/lib/pk/pkRules";

export default function CollateralOrderStatus({ collateral }) {
  const status = getCertificateOrderStatus(collateral);

  const config = {
    PERLU_ORDER: {
      label: "Perlu Order dari CO",
      className: "bg-amber-50 text-amber-700",
    },

    DI_CABANG: {
      label: "Di Cabang",
      className: "bg-emerald-50 text-emerald-700",
    },

    DI_NOTARIS: {
      label: "Di Notaris",
      className: "bg-blue-50 text-blue-700",
    },

    DIBAWA_DEBITUR: {
      label: "Dibawa Debitur saat PK",
      className: "bg-zinc-100 text-zinc-600",
    },

    NONE: {
      label: "-",
      className: "bg-zinc-100 text-zinc-500",
    },
  };

  const item = config[status];

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${item.className}`}
    >
      {item.label}
    </span>
  );
}
