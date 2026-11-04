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
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 text-sm text-zinc-600"
        >
          <ArrowLeft size={16} />
          Kembali ke Assesoir PK
        </button>

        <SelectedMenu />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <div className="text-sm text-zinc-500">Administrasi / Assesoir PK</div>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
          Assesoir PK
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Pusat pembuatan dokumen dan dokumentasi PK.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MENUS.map((menu) => {
          const Icon = menu.icon;

          return (
            <button
              key={menu.id}
              onClick={() => setSelected(menu.id)}
              className="flex min-h-32 items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-400 hover:shadow-sm"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                <Icon size={21} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-xs text-zinc-400">
                  {menu.category}
                </span>
                <span className="mt-1 block font-semibold text-zinc-900">
                  {menu.name}
                </span>
              </span>

              <ChevronRight size={18} className="text-zinc-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
