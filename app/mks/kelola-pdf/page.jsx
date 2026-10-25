"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Grid2X2, Home } from "lucide-react";
import KelolaPdfPage from "../../admin/kelola-pdf/page";

export default function MksKelolaPdfPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-100 text-slate-800">
      {/* Background grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.13) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.13) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "linear-gradient(to bottom, black, rgba(0,0,0,0.25) 70%, transparent)",
        }}
      />

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex min-h-[64px] max-w-[1600px] items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/mks/dashboard"
              aria-label="Kembali ke dashboard MKS"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-sm">
              <FileText size={20} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
                Kelola PDF
              </h1>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                Utilitas dokumen digital JOSJIS
              </p>
            </div>
          </div>

          <Link
            href="/mks/dashboard"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 sm:px-4"
          >
            <Home size={15} />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Beranda</span>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:mb-5"
        >
          <Link
            href="/mks/dashboard"
            className="inline-flex items-center gap-1.5 transition hover:text-emerald-800"
          >
            <Home size={13} />
            Dashboard MKS
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-emerald-800">Kelola PDF</span>
        </nav>

        {/* Main card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:rounded-3xl">
          {/* Accent line */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-800 via-emerald-500 to-teal-300" />

          <div className="min-w-0 p-3 sm:p-5 lg:p-7">
            {/* Section heading */}
            <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4 sm:mb-6 sm:pb-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 sm:h-12 sm:w-12">
                <Grid2X2 size={21} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Ruang Kerja PDF
                </h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                  Kelola dokumen dengan lebih praktis. Pilih fungsi PDF, unggah
                  dokumen, lalu proses sesuai kebutuhan.
                </p>
              </div>
            </div>

            {/* Existing PDF workspace */}
            <div className="min-w-0">
              <KelolaPdfPage />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-1 py-5 text-center text-[10px] leading-5 text-slate-500 sm:py-6 sm:text-xs">
          JOSJIS · Operasional Mikro
          <span className="mx-2 text-slate-300">•</span>
          Kelola PDF
        </footer>
      </div>
    </main>
  );
}
