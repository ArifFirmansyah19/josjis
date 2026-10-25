"use client";

import Link from "next/link";
import { ArrowLeft, Calculator, ShieldCheck } from "lucide-react";
import PraPencairanPage from "@/app/admin/rumus/pra-pencairan/page";
export default function MksPraPencairanPage() {
  return (
    <main className="min-h-screen min-w-0 bg-slate-50 text-slate-800">
      <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {/* Navigasi kembali */}
        <div className="mb-4">
          <Link
            href="/mks/dashboard"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>

        {/* Header halaman MKS */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="h-1.5 bg-emerald-700" />

          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:p-7">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 sm:h-14 sm:w-14">
                <Calculator size={25} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 sm:text-xs">
                  JOSJIS · Area Kerja MKS
                </p>

                <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                  Kalkulator Pra Pencairan
                </h1>

                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                  Simulasi biaya layanan, provisi, dan komponen biaya pencairan
                  berdasarkan jenis pinjaman serta limit kredit.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 sm:self-center">
              <ShieldCheck size={15} className="text-emerald-700" />
              <span className="text-[11px] font-semibold text-emerald-800 sm:text-xs">
                Simulasi Mandiri
              </span>
            </div>
          </div>
        </section>

        {/* Kalkulator yang sudah ada */}
        <section className="min-w-0">
          <PraPencairanPage />
        </section>

        {/* Catatan bawah */}
        <footer className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
          <p className="text-[11px] leading-5 text-slate-500 sm:text-xs">
            <span className="font-semibold text-slate-700">Catatan:</span> Hasil
            merupakan simulasi berdasarkan ketentuan yang tertanam pada
            kalkulator. Pastikan biaya dan ketentuan aktual telah sesuai sebelum
            digunakan untuk proses pencairan.
          </p>
        </footer>
      </div>
    </main>
  );
}
