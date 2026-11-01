import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import {
  Wallet,
  FileText,
  HeartPulse,
  House,
  HandCoins,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

export const dynamic = "force-dynamic";

const MENU_ADVIS = [
  {
    nomor: "01",
    judul: "Angsuran",
    deskripsi: "Membuat advis pembayaran angsuran debitur.",
    href: "/mks/advis/angsuran",
    icon: Wallet,
    warna: "emerald",
  },
  {
    nomor: "02",
    judul: "Notaris",
    deskripsi: "Membuat advis untuk kebutuhan notaris.",
    href: "/mks/advis/notaris",
    icon: FileText,
    warna: "blue",
  },
  {
    nomor: "03",
    judul: "Asuransi Jiwa",
    deskripsi: "Membuat advis pengajuan asuransi jiwa.",
    href: "/mks/advis/asuransi-jiwa",
    icon: HeartPulse,
    warna: "rose",
  },
  {
    nomor: "04",
    judul: "Asuransi Kebakaran",
    deskripsi: "Membuat advis asuransi kebakaran agunan.",
    href: "/mks/advis/asuransi-kebakaran",
    icon: House,
    warna: "amber",
  },
  {
    nomor: "05",
    judul: "Pelunasan",
    deskripsi: "Membuat advis pembayaran pelunasan pinjaman.",
    href: "/mks/advis/pelunasan",
    icon: HandCoins,
    warna: "violet",
  },
];

const WARNA = {
  emerald: {
    icon: "bg-emerald-50 text-emerald-700",
    hover: "group-hover:border-emerald-300",
    arrow: "group-hover:text-emerald-600",
  },
  blue: {
    icon: "bg-blue-50 text-blue-700",
    hover: "group-hover:border-blue-300",
    arrow: "group-hover:text-blue-600",
  },
  rose: {
    icon: "bg-rose-50 text-rose-700",
    hover: "group-hover:border-rose-300",
    arrow: "group-hover:text-rose-600",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    hover: "group-hover:border-amber-300",
    arrow: "group-hover:text-amber-600",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700",
    hover: "group-hover:border-violet-300",
    arrow: "group-hover:text-violet-600",
  },
};

async function validasiMKS() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Konfigurasi Supabase belum lengkap.");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (!sessionToken || !(await hasValidAppSession(user.id, sessionToken))) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, nip, role, status, wajib_ganti_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.user_id !== user.id ||
    profile.status !== "AKTIF"
  ) {
    redirect("/login");
  }

  if (profile.wajib_ganti_password) {
    redirect("/ganti-password");
  }

  if (profile.role !== "MKS") {
    if (profile.role === "ADMIN") {
      redirect("/admin/dashboard");
    }

    if (profile.role === "PENGAWAS") {
      redirect("/pengawas/dashboard");
    }

    redirect("/login");
  }

  const { data: pengguna, error: penggunaError } = await supabaseAdmin
    .from("pengguna")
    .select("id, pegawai_id, role, unit_id, aktif")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    penggunaError ||
    !pengguna ||
    pengguna.aktif !== true ||
    pengguna.role !== "MKS" ||
    !pengguna.unit_id ||
    !pengguna.pegawai_id
  ) {
    redirect("/login");
  }

  const { data: penugasan, error: penugasanError } = await supabaseAdmin
    .from("pengguna_unit")
    .select("unit_id")
    .eq("pengguna_id", pengguna.id);

  if (
    penugasanError ||
    !penugasan ||
    penugasan.length !== 1 ||
    penugasan[0].unit_id !== pengguna.unit_id
  ) {
    redirect("/login");
  }

  const { data: unit, error: unitError } = await supabaseAdmin
    .from("unit")
    .select("id, nama_unit, kode_unit")
    .eq("id", pengguna.unit_id)
    .eq("status", "AKTIF")
    .maybeSingle();

  if (unitError || !unit) {
    redirect("/login");
  }

  const { data: pegawai, error: pegawaiError } = await supabaseAdmin
    .from("pegawai")
    .select("id, nama, nip, unit_id, aktif")
    .eq("id", pengguna.pegawai_id)
    .maybeSingle();

  if (
    pegawaiError ||
    !pegawai ||
    pegawai.aktif !== true ||
    pegawai.unit_id !== pengguna.unit_id
  ) {
    redirect("/login");
  }

  return {
    nama: pegawai.nama || "Pengguna MKS",
    nip: profile.nip || pegawai.nip || "-",
    unit: unit.nama_unit,
    kodeUnit: unit.kode_unit,
  };
}

export default async function AdvisMKSPage() {
  const pengguna = await validasiMKS();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <ClipboardList size={17} />
              JOSJIS / MENU MKS
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Advis
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Pilih jenis advis yang ingin dibuat.
            </p>
          </div>

          <Link
            href="/mks/dashboard"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowRight size={16} className="rotate-180" />
            Kembali ke Dashboard
          </Link>
        </div>

        {/* Identitas MKS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pengguna aktif
              </p>

              <h2 className="mt-1 font-bold text-slate-900">{pengguna.nama}</h2>

              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>NIP: {pengguna.nip}</span>
                <span>
                  Unit: {pengguna.kodeUnit} — {pengguna.unit}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Daftar menu */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Pilihan Advis
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih salah satu layanan berikut.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MENU_ADVIS.map((menu) => {
              const Icon = menu.icon;
              const warna = WARNA[menu.warna];

              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`group flex min-h-[150px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${warna.hover}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${warna.icon}`}
                    >
                      <Icon size={23} strokeWidth={1.9} />
                    </div>

                    <span className="text-xs font-bold tracking-widest text-slate-300">
                      {menu.nomor}
                    </span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{menu.judul}</h3>

                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {menu.deskripsi}
                      </p>
                    </div>

                    <ArrowRight
                      size={19}
                      className={`mb-1 shrink-0 text-slate-300 transition ${warna.arrow}`}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <p className="text-center text-xs text-slate-400">JOSJIS · Advis MKS</p>
      </div>
    </main>
  );
}
