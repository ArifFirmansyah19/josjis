"use client";

import { ArrowRight, ClipboardList, FileText, PhoneCall } from "lucide-react";

const menus = [
  {
    title: "Booking",
    description: "Kelola dan proses data booking.",
    icon: ClipboardList,
    type: "booking",
  },
  {
    title: "2A / Tagihan",
    description: "Proses data 2A berdasarkan unit dan Nama SGP.",
    icon: FileText,
    type: "two-a",
  },
  {
    title: "Easy Call",
    description: "Proses data, cetak Advis, dan export Excel.",
    icon: PhoneCall,
    type: "easy-call",
  },
];

export default function RaportMuProcessMenu({
  disabled = false,
  onBookingClick,
  onTwoAClick,
  onEasyCallClick,
}) {
  function handleClick(type) {
    if (type === "booking") {
      onBookingClick?.();
      return;
    }

    if (type === "two-a") {
      onTwoAClick?.();
      return;
    }

    if (type === "easy-call") {
      onEasyCallClick?.();
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Proses RaportMU</h2>

        <p className="mt-1 text-sm text-zinc-500">
          Pilih proses yang ingin dilakukan. Unit JKK 1 atau JKK 2 dipilih di
          dalam proses.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {menus.map((menu) => {
          const Icon = menu.icon;

          if (disabled) {
            return (
              <div
                key={menu.title}
                className="rounded-2xl border border-zinc-200 bg-white p-5 opacity-50"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100">
                  <Icon className="h-5 w-5 text-zinc-500" />
                </div>

                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  {menu.title}
                </h3>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {menu.description}
                </p>

                <p className="mt-4 text-xs font-medium text-zinc-400">
                  Import Excel terlebih dahulu
                </p>
              </div>
            );
          }

          return (
            <button
              key={menu.title}
              type="button"
              onClick={() => handleClick(menu.type)}
              className="group rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100">
                  <Icon className="h-5 w-5 text-zinc-700" />
                </div>

                <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-zinc-700" />
              </div>

              <h3 className="mt-4 text-base font-semibold text-zinc-900">
                {menu.title}
              </h3>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {menu.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
