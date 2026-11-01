"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileCheck2,
  FileText,
  Flame,
  HeartPulse,
  Landmark,
  Phone,
} from "lucide-react";

const advisMenus = [
  {
    title: "Advis Pelunasan",
    description: "Membuat dan mencetak Advis Pelunasan Pinjaman.",
    href: "/admin/advis/pelunasan",
    icon: FileCheck2,
  },
  {
    title: "Advis Easy Call",
    description: "Pengelolaan Advis dari proses Easy Call.",
    href: "/admin/advis/easycoll",
    icon: Phone,
  },
  {
    title: "Advis Angsuran",
    description: "Membuat dan mencetak Advis Angsuran.",
    href: "/admin/advis/angsuran",
    icon: CalendarDays,
  },
  {
    title: "Advis Notaris",
    description: "Pengelolaan Advis yang berkaitan dengan Notaris.",
    href: "/admin/advis/notaris",
    icon: Landmark,
  },
  {
    title: "Advis Asuransi Kebakaran",
    description: "Membuat dan mengelola Advis Asuransi Kebakaran.",
    href: "/admin/advis/asuransi-kebakaran",
    icon: Flame,
  },
  {
    title: "Advis Asuransi Jiwa",
    description: "Membuat dan mengelola Advis Asuransi Jiwa.",
    href: "/admin/advis/asuransi-jiwa",
    icon: HeartPulse,
  },
];

export default function AdvisPage() {
  return (
    <main className="min-h-full bg-slate-50/70 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <FileText size={16} />
              <span>JOSJIS</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-700">Advis</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Advis
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
              Pilih jenis Advis untuk membuka halaman pengisian, pengelolaan
              template, preview, dan pencetakan dokumen.
            </p>
          </div>
          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#174C40] shadow-sm sm:flex">
            <FileText size={23} />
          </div>
        </div>

        <section aria-label="Pilihan jenis Advis">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Pilih Jenis Advis
            </h2>
            <span className="text-xs text-slate-400">
              {advisMenus.length} jenis
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {advisMenus.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-[142px] items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#174C40]/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#174C40]/30 sm:p-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#174C40]/[0.08] text-[#174C40] transition group-hover:bg-[#174C40] group-hover:text-white">
                    <Icon size={21} strokeWidth={1.9} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold leading-5 text-slate-800 group-hover:text-[#174C40]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      {item.description}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#174C40]">
                      Buka Advis
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-3">
          <p className="text-xs leading-5 text-slate-500">
            Jenis Advis lainnya dapat ditambahkan kemudian tanpa mengubah
            struktur menu utama.
          </p>
        </div>
      </div>
    </main>
  );
}
