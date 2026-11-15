"use client";

import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Files,
  FileImage,
  ShieldCheck,
  Building2,
  ChevronRight,
} from "lucide-react";

import SkmAgunan from "./menus/SkmAgunan";
import SuratAsnPolri from "./menus/SuratAsnPolri";
import SuratPernyataanDebitur from "./menus/SuratPernyataanDebitur";
import Gcg from "./menus/Gcg";
import DelegasiOts from "./menus/DelegasiOts";
import KolaseFotoOts from "./menus/KolaseFotoOts";
import KolaseFotoPk from "./menus/KolaseFotoPk";
import OrderMagi from "./menus/OrderMagi";
import OrderAsuransiKebakaran from "./menus/OrderAsuransiKebakaran";

const MENU_COMPONENTS = {
  "surat-asn-polri": SuratAsnPolri,
  "surat-pernyataan-debitur": SuratPernyataanDebitur,
  gcg: Gcg,
  "delegasi-ots": DelegasiOts,
  "kolase-foto-ots": KolaseFotoOts,
  "kolase-foto-pk": KolaseFotoPk,
  "order-magi": OrderMagi,
  "order-asuransi-kebakaran": OrderAsuransiKebakaran,
};

const MENUS = [
  {
    id: "surat-asn-polri",
    name: "Surat Pernyataan ASN/POLRI",
    category: "Surat Pernyataan",
    icon: FileText,
  },
  {
    id: "surat-pernyataan-debitur",
    name: "Surat Pernyataan Debitur",
    category: "Surat Pernyataan",
    icon: FileText,
  },
  {
    id: "skm-agunan",
    name: "SKM Agunan",
    category: "Surat Kuasa",
    icon: ShieldCheck,
  },
  {
    id: "gcg",
    name: "GCG",
    category: "Dokumen PK",
    icon: Files,
  },
  {
    id: "delegasi-ots",
    name: "Template Delegasi OTS",
    category: "Dokumen OTS",
    icon: FileText,
  },
  {
    id: "kolase-foto-ots",
    name: "Kolase Foto OTS",
    category: "Dokumentasi",
    icon: FileImage,
  },
  {
    id: "kolase-foto-pk",
    name: "Kolase Foto PK",
    category: "Dokumentasi",
    icon: FileImage,
  },
  {
    id: "order-magi",
    name: "Order Magi",
    category: "Order",
    icon: Building2,
  },
  {
    id: "order-asuransi-kebakaran",
    name: "Order Asuransi Kebakaran",
    category: "Order",
    icon: Building2,
  },
];

export default function AssesoirPkClient() {
  const [selected, setSelected] = useState(null);

  if (selected === "skm-agunan") {
    return <SkmAgunan onBack={() => setSelected(null)} />;
  }

  const item = MENUS.find((menu) => menu.id === selected);
  const SelectedMenu = MENU_COMPONENTS[selected];

  if (item && SelectedMenu) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-3 pb-5 sm:space-y-5 sm:px-5">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg py-2 pr-3 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <ArrowLeft size={17} />
          Kembali ke Assesoir PK
        </button>

        <div className="min-w-0">
          <SelectedMenu />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-3 pb-6 sm:space-y-6 sm:px-5 lg:px-6">
      <div className="min-w-0">
        <div className="text-xs text-zinc-500 sm:text-sm">
          Administrasi / Assesoir PK
        </div>

        <h1 className="mt-1.5 text-xl font-bold tracking-tight text-zinc-900 sm:mt-2 sm:text-2xl">
          Assesoir PK
        </h1>

        <p className="mt-1 text-xs leading-relaxed text-zinc-500 sm:text-sm">
          Pusat pembuatan dokumen dan dokumentasi PK.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
        {MENUS.map((menu) => {
          const Icon = menu.icon;

          return (
            <button
              key={menu.id}
              type="button"
              onClick={() => setSelected(menu.id)}
              className="group flex min-h-[88px] min-w-0 items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition active:bg-zinc-50 hover:border-zinc-300 hover:shadow-sm sm:min-h-[112px] sm:gap-4 sm:rounded-2xl sm:p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition group-hover:bg-zinc-200 sm:size-11">
                <Icon size={20} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium uppercase tracking-wide text-zinc-400 sm:text-xs">
                  {menu.category}
                </span>

                <span className="mt-1 block break-words text-sm font-semibold leading-snug text-zinc-900 sm:text-base">
                  {menu.name}
                </span>
              </span>

              <ChevronRight
                size={18}
                className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-700"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
