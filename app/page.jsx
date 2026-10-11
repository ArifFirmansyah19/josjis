"use client";

import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Database,
  Files,
  ChartNoAxesCombined,
  LockKeyhole,
  ChevronRight,
  Landmark,
  FileCheck2,
  Boxes,
} from "lucide-react";
import { useNamaCabang } from "@/lib/use-nama-cabang";

export default function Home() {
  const { namaCabang, loadingCabang } = useNamaCabang();

  const labelCabang =
    namaCabang || (loadingCabang ? "Memuat nama cabang..." : "Sistem Internal");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f8ff] text-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-48 -left-40 h-[500px] w-[500px] rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(37,99,235,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 sm:px-8 lg:px-14">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-blue-100/80 py-5">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 text-xl font-black text-white shadow-lg shadow-blue-900/20 transition group-hover:scale-105">
              J
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-[0.12em] text-[#102c55]">
                JOSJIS
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Mikro {labelCabang}
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Portal Sistem Internal
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#123b76] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/15 transition hover:bg-blue-700 sm:px-5"
          >
            Masuk
            <ArrowRight size={16} />
          </Link>
        </header>

        {/* Hero */}
        <section className="grid flex-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-16">
          {/* Left content */}
          <div className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-xs font-bold tracking-wide text-blue-800 shadow-sm">
              <ShieldCheck size={16} />
              SISTEM INFORMASI TERINTEGRASI
            </div>

            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight text-[#102c55] sm:text-5xl lg:text-[60px]">
              Satu Sistem,
              <span className="mt-1 block bg-gradient-to-r from-blue-600 via-blue-700 to-sky-500 bg-clip-text pb-2 text-transparent">
                Pengelolaan Lebih Mudah.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
              <span className="font-bold text-slate-800">JOSJIS</span> — Sistem
              Integrasi Pendataan Mikro {labelCabang}. Platform internal untuk
              membantu pengelolaan data pinjaman, agunan, dokumen, migrasi,
              notaris, dan administrasi dalam satu alur kerja yang
              terorganisasi.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 px-7 text-sm font-bold text-white shadow-xl shadow-blue-700/25 transition hover:-translate-y-0.5 hover:from-blue-800 hover:to-blue-700"
              >
                Masuk ke Sistem
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <div className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white/75 px-5 text-sm font-medium text-slate-600 shadow-sm">
                <LockKeyhole size={17} className="text-blue-700" />
                Akses Pengguna Terdaftar
              </div>
            </div>

            {/* Highlights */}
            <div className="mt-12 grid max-w-xl grid-cols-3 gap-3 border-t border-blue-100 pt-7">
              <div>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Database size={18} />
                </div>
                <p className="text-xs font-bold text-slate-800 sm:text-sm">
                  Data Terpusat
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
                  Lebih terorganisasi
                </p>
              </div>

              <div>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <FileCheck2 size={18} />
                </div>
                <p className="text-xs font-bold text-slate-800 sm:text-sm">
                  Dokumen
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
                  Alur lebih tertata
                </p>
              </div>

              <div>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <ShieldCheck size={18} />
                </div>
                <p className="text-xs font-bold text-slate-800 sm:text-sm">
                  Akses Terjaga
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
                  Berbasis pengguna
                </p>
              </div>
            </div>
          </div>

          {/* Right visual panel */}
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            {/* Decorative circles */}
            <div className="absolute -right-4 -top-7 h-32 w-32 rounded-full border border-blue-200/70" />
            <div className="absolute -bottom-5 -left-5 h-24 w-24 rounded-full border border-sky-300/70" />

            <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0b2450] via-[#123f83] to-[#1677d2] p-5 shadow-2xl shadow-blue-950/20 sm:p-7">
              {/* Abstract background */}
              <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/[0.06]" />
              <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full border-[50px] border-sky-300/[0.08]" />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                      WORKSPACE
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                      Pusat Pengelolaan
                    </h2>
                    <p className="mt-1 text-xs text-blue-100/75 sm:text-sm">
                      Mikro {labelCabang}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur">
                    <Landmark size={23} />
                  </div>
                </div>

                {/* Main illustration */}
                <div className="relative my-8 flex min-h-[190px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-6 backdrop-blur-sm sm:min-h-[220px]">
                  <div className="absolute h-36 w-36 rounded-full bg-sky-300/20 blur-2xl sm:h-48 sm:w-48" />

                  <div className="relative flex w-full max-w-sm items-center justify-center">
                    <div className="absolute left-1 top-4 h-32 w-24 rotate-[-12deg] rounded-2xl border border-white/20 bg-blue-300/10 sm:left-5 sm:h-36 sm:w-28" />

                    <div className="relative w-52 rounded-2xl border border-white/20 bg-white/[0.13] p-4 shadow-2xl backdrop-blur-md sm:w-60 sm:p-5">
                      <div className="flex items-center gap-3 border-b border-white/15 pb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-800">
                          <Files size={21} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            Data & Dokumen
                          </p>
                          <p className="mt-1 text-[10px] text-blue-100">
                            Workspace terintegrasi
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-white/20">
                            <div className="h-2 w-[82%] rounded-full bg-sky-300" />
                          </div>
                          <span className="text-[10px] text-blue-100">
                            Data
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-white/20">
                            <div className="h-2 w-[65%] rounded-full bg-blue-200" />
                          </div>
                          <span className="text-[10px] text-blue-100">
                            Arsip
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-white/20">
                            <div className="h-2 w-[73%] rounded-full bg-cyan-200" />
                          </div>
                          <span className="text-[10px] text-blue-100">
                            Proses
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute -right-1 bottom-0 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-emerald-400 text-white shadow-lg sm:-right-2 sm:h-14 sm:w-14">
                      <ShieldCheck size={27} />
                    </div>
                  </div>
                </div>

                {/* Feature rows */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.09] p-4 backdrop-blur">
                    <div className="flex items-center gap-2 text-blue-100">
                      <Boxes size={17} />
                      <span className="text-xs font-semibold">Data Agunan</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-blue-100/70">
                      Pendataan dan riwayat lebih terstruktur.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.09] p-4 backdrop-blur">
                    <div className="flex items-center gap-2 text-blue-100">
                      <ChartNoAxesCombined size={17} />
                      <span className="text-xs font-semibold">
                        Proses Administrasi
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-blue-100/70">
                      Mendukung alur kerja harian.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-300" />
                    <p className="text-[10px] font-medium text-blue-100/80 sm:text-xs">
                      JOSJIS · Internal Workspace
                    </p>
                  </div>
                  <Link
                    href="/login"
                    aria-label="Masuk ke sistem JOSJIS"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-800 transition hover:bg-blue-100"
                  >
                    <ChevronRight size={19} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom information */}
        <footer className="relative flex flex-col gap-3 border-t border-blue-100 py-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} JOSJIS · Mikro {labelCabang}
          </p>

          <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <LockKeyhole size={13} />
            Sistem internal untuk pengguna terdaftar
          </p>
        </footer>
      </div>
    </main>
  );
}
