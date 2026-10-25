"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  Calculator,
  ChartColumn,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileSpreadsheet,
  Files,
  FolderOpen,
  Gauge,
  History,
  LockKeyholeOpen,
  LogOut,
  PackageCheck,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

const mksMenus = [
  {
    label: "My Work",
    href: "/mks/my-work",
    icon: BriefcaseBusiness,
    color: "blue",
  },
  {
    label: "Database PK",
    href: "/mks/data-pk",
    icon: Database,
    color: "blue",
  },
  {
    label: "Input PK",
    href: "/mks/input-pk",
    icon: FileSpreadsheet,
    color: "indigo",
  },
  {
    label: "Debitur Lunas",
    href: "/mks/debitur-lunas",
    icon: History,
    color: "amber",
  },
  {
    label: "Request Order Agunan",
    href: "/mks/request-order-agunan",
    icon: PackageCheck,
    color: "emerald",
  },
  {
    label: "Assesoir PK",
    href: "/mks/assesoir-pk",
    icon: ShieldCheck,
    color: "sky",
  },
  {
    label: "Request Buka Blokir",
    href: "/mks/request-buka-blokir",
    icon: LockKeyholeOpen,
    color: "pink",
  },
  {
    label: "Dokumentasi Serah Agunan Lunas",
    href: "/mks/dokumentasi-serah-agunan-lunas",
    icon: Files,
    color: "violet",
  },
  {
    label: "Kalkulator AJK / AMFS",
    href: "/mks/kalkulator-ajk-amfs",
    icon: Calculator,
    color: "violet",
  },
  {
    label: "Checklist Doc PK",
    href: "/mks/checklist-doc-pk",
    icon: ClipboardCheck,
    color: "slate",
  },
  {
    label: "BAST",
    href: "/mks/bast",
    icon: FileCheck2,
    color: "slate",
  },
  {
    label: "Kelola PDF",
    href: "/mks/kelola-pdf",
    icon: FolderOpen,
    color: "slate",
  },
  {
    label: "Pengaturan Akun",
    href: "/pengaturan-akun",
    icon: Settings,
    color: "slate",
  },
];

const pengawasMenus = [
  {
    label: "Pemantauan MKS",
    href: "/pengawas/pemantauan-mks",
    icon: Users,
    color: "blue",
  },
  {
    label: "Aktivitas Unit",
    href: "/pengawas/aktivitas-unit",
    icon: Activity,
    color: "violet",
  },
  {
    label: "Database PK",
    href: "/pengawas/data-pk",
    icon: Database,
    color: "blue",
  },
  {
    label: "Pengaturan Akun",
    href: "/pengaturan-akun",
    icon: Settings,
    color: "slate",
  },
];

const colorClasses = {
  blue: "bg-blue-50 text-blue-700 group-hover:bg-blue-100",
  indigo: "bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100",
  amber: "bg-amber-50 text-amber-700 group-hover:bg-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100",
  sky: "bg-sky-50 text-sky-700 group-hover:bg-sky-100",
  pink: "bg-pink-50 text-pink-700 group-hover:bg-pink-100",
  violet: "bg-violet-50 text-violet-700 group-hover:bg-violet-100",
  slate: "bg-slate-100 text-slate-700 group-hover:bg-slate-200",
};

const numberFormat = new Intl.NumberFormat("id-ID");

const rupiahFormat = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function MenuTile({ item, active }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-[78px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center transition hover:-translate-y-0.5 hover:shadow-sm sm:min-h-[88px] sm:p-2.5 ${
        active
          ? "border-emerald-300 bg-emerald-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-emerald-200"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition sm:h-9 sm:w-9 ${
          colorClasses[item.color] || colorClasses.slate
        }`}
      >
        <Icon size={18} strokeWidth={1.9} />
      </span>

      <span className="max-w-full text-[10px] font-semibold leading-3.5 text-slate-700 sm:text-[11px] sm:leading-4">
        {item.label}
      </span>
    </Link>
  );
}

function Panel({ title, subtitle, icon: Icon, children, className = "" }) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      {(title || Icon) && (
        <div className="mb-3 flex items-start gap-2.5">
          {Icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Icon size={18} strokeWidth={1.9} />
            </span>
          )}

          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                {title}
              </h2>
            )}

            {subtitle && (
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {children}
    </section>
  );
}

function MiniMetric({ label, value, note }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>

      <p className="mt-1 break-words text-xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      {note && (
        <p className="mt-1 text-[10px] leading-4 text-slate-500">{note}</p>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, compact = false }) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 text-center ${
        compact ? "py-4" : "py-6"
      }`}
    >
      <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
        <Icon size={18} />
      </span>

      <p className="text-xs font-semibold text-slate-700">{title}</p>

      <p className="mt-1 max-w-lg text-[11px] leading-4 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function RoleDashboardMks({
  role,
  nama,
  unit,
  nip = "-",
  unitCode = "-",
  selectedMonth,
  monthOptions = [],
  stats = {},
}) {
  const pathname = usePathname();

  const isMKS = role === "MKS";
  const isPengawas = role === "PENGAWAS";

  const [loggingOut, setLoggingOut] = useState(false);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(new Date()),
    [],
  );

  const menus = isMKS ? mksMenus : pengawasMenus;

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        console.error("API logout gagal:", {
          status: response.status,
          result,
        });

        alert(
          result?.error ||
            `Logout gagal (HTTP ${response.status}). Silakan coba lagi.`,
        );

        setLoggingOut(false);
        return;
      }

      window.location.replace("/");
    } catch (error) {
      console.error("Gagal menghubungi API logout:", error);

      alert(
        "Tidak dapat menghubungi server untuk logout. Periksa koneksi dan coba lagi.",
      );

      setLoggingOut(false);
    }
  };

  if (!isMKS && !isPengawas) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-white p-6">
          <h1 className="font-bold text-slate-900">Dashboard tidak tersedia</h1>

          <p className="mt-1 text-sm text-slate-600">
            Role pengguna tidak dikenali.
          </p>
        </div>
      </main>
    );
  }

  const pkBulan = Number(stats.jumlahPKBulan) || 0;
  const pkTotal = Number(stats.jumlahPKTotal) || 0;
  const debiturTotal = Number(stats.jumlahDebitur) || 0;
  const kurCount = Number(stats.jumlahKUR) || 0;
  const kumCount = Number(stats.jumlahKUM) || 0;
  const kurTotal = Number(stats.totalKUR) || 0;
  const kumTotal = Number(stats.totalKUM) || 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header aplikasi */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 xl:px-8">
          <Link
            href={isMKS ? "/mks/dashboard" : "/pengawas/dashboard"}
            className="flex min-w-0 items-center gap-2.5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white">
              <Gauge size={21} />
            </span>

            <span className="min-w-0">
              <span className="block text-base font-extrabold tracking-wide text-slate-900">
                JOSJIS
              </span>

              <span className="block truncate text-[10px] font-semibold tracking-[0.13em] text-emerald-700">
                OPERASIONAL MIKRO
              </span>
            </span>
          </Link>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[220px] truncate text-xs font-semibold text-slate-800">
                {nama || (isMKS ? "MKS" : "Pengawas")}
              </p>

              <p className="max-w-[220px] truncate text-[11px] text-slate-500">
                {unit || "Unit kerja"}
              </p>
            </div>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
              <UserRound size={18} />
            </span>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
            >
              <LogOut size={15} />
              <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 xl:px-8">
        {/* Sapaan */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              {isMKS ? "Area Kerja MKS" : "Area Kerja Pengawas"}
            </p>

            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Selamat datang, {nama || (isMKS ? "MKS" : "Pengawas")}!
            </h1>
          </div>

          <p className="text-xs text-slate-500">{today}</p>
        </div>

        {/* Panel dashboard disusun dalam grid */}
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-12">
          {/* Identitas MKS */}
          <Panel
            title="Data MKS"
            subtitle="Identitas pengguna dan unit kerja"
            icon={UserRound}
            className="md:col-span-1 xl:col-span-4"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[10px] text-slate-500">Nama MKS</p>
                <p className="mt-1 break-words text-xs font-semibold text-slate-800">
                  {nama || "-"}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[10px] text-slate-500">NIP</p>
                <p className="mt-1 break-all text-xs font-semibold text-slate-800">
                  {nip || "-"}
                </p>
              </div>

              <div className="rounded-lg bg-emerald-50 p-2.5">
                <p className="text-[10px] text-emerald-700">Unit kerja</p>
                <p className="mt-1 break-words text-xs font-semibold text-emerald-900">
                  {unit || "-"}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[10px] text-slate-500">Kode unit</p>
                <p className="mt-1 text-xs font-semibold text-slate-800">
                  {unitCode || "-"}
                </p>
              </div>
            </div>
          </Panel>

          {/* Data 2A */}
          {isMKS && (
            <Panel
              title="Data 2A Hari Ini"
              subtitle="Data mengikuti MKS dan unit yang sedang login"
              icon={FileSpreadsheet}
              className="md:col-span-1 xl:col-span-8"
            >
              <EmptyState
                icon={FileSpreadsheet}
                title="Data 2A belum tersedia"
                description="Data akan muncul setelah Admin memproses file Excel 2A dan menyimpan hasil yang sesuai dengan MKS ini."
                compact
              />
            </Panel>
          )}

          {/* Statistik KUR dan KUM */}
          {isMKS && (
            <Panel
              title="Statistik dan Perolehan KUR / KUM"
              subtitle="Ringkasan data PK yang ditugaskan kepada Anda"
              icon={ChartColumn}
              className="md:col-span-2 xl:col-span-7"
            >
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <p className="text-[11px] text-slate-500">
                  Statistik PK bulan terpilih dan perolehan sepanjang waktu.
                </p>

                <form method="GET" className="flex items-center gap-2">
                  <label htmlFor="bulan" className="sr-only">
                    Filter bulan PK
                  </label>

                  <select
                    id="bulan"
                    name="bulan"
                    defaultValue={selectedMonth}
                    className="max-w-[150px] rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  >
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                  >
                    Terapkan
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <MiniMetric
                  label="PK bulan terpilih"
                  value={numberFormat.format(pkBulan)}
                />

                <MiniMetric
                  label="Total debitur unik"
                  value={numberFormat.format(debiturTotal)}
                />

                <MiniMetric
                  label="Total PK"
                  value={numberFormat.format(pkTotal)}
                />

                <MiniMetric
                  label="Jumlah PK KUR"
                  value={numberFormat.format(kurCount)}
                  note={rupiahFormat.format(kurTotal)}
                />

                <MiniMetric
                  label="Jumlah PK KUM"
                  value={numberFormat.format(kumCount)}
                  note={rupiahFormat.format(kumTotal)}
                />

                <MiniMetric
                  label="Total limit KUR + KUM"
                  value={rupiahFormat.format(kurTotal + kumTotal)}
                />
              </div>

              <p className="mt-3 text-[10px] leading-4 text-slate-500">
                Perolehan dihitung dari kolom limit_kredit pada semua PK yang
                tersimpan, termasuk status DRAFT; bukan otomatis nilai
                pencairan.
              </p>
            </Panel>
          )}

          {/* Ringkasan database PK */}
          {isMKS && (
            <Panel
              title="Data PK"
              subtitle="Ringkasan database PK Anda"
              icon={Database}
              className="md:col-span-2 xl:col-span-5"
            >
              <div className="grid grid-cols-2 gap-2">
                <MiniMetric
                  label="Total data PK"
                  value={numberFormat.format(pkTotal)}
                />

                <MiniMetric
                  label="Debitur unik"
                  value={numberFormat.format(debiturTotal)}
                />

                <MiniMetric
                  label="PK KUR"
                  value={numberFormat.format(kurCount)}
                />

                <MiniMetric
                  label="PK KUM"
                  value={numberFormat.format(kumCount)}
                />
              </div>

              <Link
                href="/mks/data-pk"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
              >
                Buka Database PK <ArrowUpRight size={14} />
              </Link>
            </Panel>
          )}

          {/* Menu operasional */}
          <Panel
            title="Menu Cepat"
            subtitle="Pilih fitur operasional JOSJIS"
            icon={Gauge}
            className={`${isMKS ? "xl:col-span-8" : "xl:col-span-12"} md:col-span-2`}
          >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-7">
              {menus.map((item) => (
                <MenuTile
                  key={item.href}
                  item={item}
                  active={
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                  }
                />
              ))}
            </div>
          </Panel>

          {/* Log aktivitas */}
          {isMKS && (
            <Panel
              title="Log Activities"
              subtitle="Riwayat aktivitas akun MKS"
              icon={Activity}
              className="md:col-span-2 xl:col-span-4"
            >
              <EmptyState
                icon={History}
                title="Log aktivitas belum terhubung"
                description="Aktivitas akan ditampilkan setelah sumber log JOSJIS dihubungkan dan difilter berdasarkan pengguna serta unit yang berhak melihatnya."
                compact
              />
            </Panel>
          )}
        </div>
      </div>
    </main>
  );
}
