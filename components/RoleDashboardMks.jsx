"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowDownUp,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gauge,
  History,
  House,
  LogOut,
  Menu,
  PackageCheck,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

const mksSections = [
  {
    title: "UTAMA",
    items: [
      { label: "Dashboard", href: "/mks/dashboard", icon: Gauge },
      {
        label: "My Work",
        href: "/mks/my-work",
        icon: BriefcaseBusiness,
      },
    ],
  },
  {
    title: "KREDIT",
    items: [
      { label: "Data PK", href: "/mks/data-pk", icon: FileText },
      {
        label: "Input PK",
        href: "/mks/input-pk",
        icon: FileSpreadsheet,
      },
      {
        label: "Debitur Lunas",
        href: "/mks/debitur-lunas",
        icon: History,
      },
    ],
  },
  {
    title: "AGUNAN & DOKUMEN",
    items: [
      {
        label: "Request Order Agunan",
        href: "/mks/request-order-agunan",
        icon: PackageCheck,
      },
      {
        label: "Checklist Doc PK",
        href: "/mks/checklist-doc-pk",
        icon: ClipboardCheck,
      },
      { label: "BAST", href: "/mks/bast", icon: FileCheck2 },
    ],
  },
  {
    title: "LAPORAN & BOOKING",
    items: [
      {
        label: "Dashboard Booking",
        href: "/mks/dashboard-booking",
        icon: CalendarDays,
      },
      {
        label: "Rencana Booking Harian",
        href: "/mks/rencana-booking-harian",
        icon: ArrowDownUp,
      },
      {
        label: "RaportMU",
        href: "/mks/raportmu",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    title: "OPERASIONAL",
    items: [
      {
        label: "Kalkulator AJK / AMFS",
        href: "/mks/kalkulator-ajk-amfs",
        icon: Calculator,
      },
      {
        label: "Request AII MAGI",
        href: "/mks/request-aii-magi",
        icon: ShieldCheck,
      },
      {
        label: "Kelola PDF",
        href: "/mks/kelola-pdf",
        icon: FolderOpen,
      },
    ],
  },
  {
    title: "PENGATURAN",
    items: [
      {
        label: "Pengaturan Akun",
        href: "/pengaturan-akun",
        icon: Settings,
      },
    ],
  },
];

const pengawasSections = [
  {
    title: "UTAMA",
    items: [
      {
        label: "Dashboard",
        href: "/pengawas/dashboard",
        icon: Gauge,
      },
      {
        label: "Pemantauan MKS",
        href: "/pengawas/pemantauan-mks",
        icon: Users,
      },
      {
        label: "Aktivitas Unit",
        href: "/pengawas/aktivitas-unit",
        icon: Activity,
      },
    ],
  },
  {
    title: "PEMANTAUAN",
    items: [
      {
        label: "Data PK",
        href: "/pengawas/data-pk",
        icon: FileText,
      },
    ],
  },
  {
    title: "PENGATURAN",
    items: [
      {
        label: "Pengaturan Akun",
        href: "/pengaturan-akun",
        icon: Settings,
      },
    ],
  },
];

const iconStyles = {
  emerald: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  indigo: "bg-indigo-50 text-indigo-700",
  amber: "bg-amber-50 text-amber-700",
  violet: "bg-violet-50 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
};

const menuColors = {
  Dashboard: "emerald",
  "My Work": "blue",
  "Data PK": "blue",
  "Input PK": "indigo",
  "Debitur Lunas": "amber",
  "Request Order Agunan": "emerald",
  "Checklist Doc PK": "blue",
  BAST: "violet",
  "Dashboard Booking": "emerald",
  "Rencana Booking Harian": "blue",
  RaportMU: "indigo",
  "Kalkulator AJK / AMFS": "violet",
  "Request AII MAGI": "emerald",
  "Kelola PDF": "amber",
  "Pengaturan Akun": "slate",
  "Pemantauan MKS": "blue",
  "Aktivitas Unit": "violet",
};

// =====================================================
// SIDEBAR MANDIRI
// =====================================================

function Sidebar({
  role,
  nama,
  unit,
  collapsed,
  mobileOpen,
  onClose,
  onLogout,
  loggingOut,
}) {
  const pathname = usePathname();
  const isMKS = role === "MKS";
  const sections = isMKS ? mksSections : pengawasSections;

  const [openSections, setOpenSections] = useState(
    Object.fromEntries(sections.map((section) => [section.title, true])),
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-200",
          collapsed ? "lg:w-[76px]" : "lg:w-[270px]",
          "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <Link
            href={isMKS ? "/mks/dashboard" : "/pengawas/dashboard"}
            className="flex min-w-0 items-center gap-3"
            onClick={onClose}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white">
              <House size={22} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="text-lg font-extrabold tracking-wide text-slate-900">
                  JOSJIS
                </p>
                <p className="text-[10px] font-semibold tracking-widest text-emerald-700">
                  OPERASIONAL MIKRO
                </p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup sidebar"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-100 p-4">
          <div
            className={[
              "flex items-center gap-3 rounded-xl bg-emerald-50 p-3",
              collapsed ? "lg:justify-center lg:px-1" : "",
            ].join(" ")}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-sm font-bold text-white">
              {(nama || role).trim().charAt(0).toUpperCase()}
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">
                  {nama || role}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isMKS ? "MKS" : "Pengawas"}
                </p>
                <p className="mt-1 truncate text-[11px] text-emerald-800">
                  {unit || "Unit belum tersedia"}
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() =>
                    setOpenSections((current) => ({
                      ...current,
                      [section.title]: !current[section.title],
                    }))
                  }
                  className="mb-2 flex w-full items-center justify-between px-3 text-[10px] font-bold tracking-[0.12em] text-slate-400"
                >
                  {section.title}

                  <ChevronDown
                    size={14}
                    className={[
                      "transition-transform",
                      openSections[section.title] ? "" : "-rotate-90",
                    ].join(" ")}
                  />
                </button>
              )}

              {(collapsed || openSections[section.title]) && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;

                    const active =
                      pathname === item.href ||
                      (item.href !== "/mks/dashboard" &&
                        item.href !== "/pengawas/dashboard" &&
                        pathname.startsWith(`${item.href}/`));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        onClick={onClose}
                        className={[
                          "group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                          collapsed ? "lg:justify-center lg:px-2" : "",
                          active
                            ? "bg-emerald-800 font-semibold text-white shadow-sm"
                            : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800",
                        ].join(" ")}
                      >
                        <Icon size={18} className="shrink-0" />

                        {!collapsed && (
                          <span className="min-w-0 flex-1 leading-5">
                            {item.label}
                          </span>
                        )}

                        {active && !collapsed && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            title={collapsed ? "Keluar" : undefined}
            className={[
              "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50",
              "disabled:cursor-not-allowed disabled:opacity-60",
              collapsed ? "lg:justify-center lg:px-2" : "",
            ].join(" ")}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && (
              <span>{loggingOut ? "Memproses..." : "Keluar"}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

// =====================================================
// KARTU MENU
// =====================================================

function MenuCard({ item }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group flex min-h-[112px] items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          iconStyles[item.color] || iconStyles.emerald
        }`}
      >
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-5 text-slate-800">
          {item.label}
        </h3>

        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          {item.description}
        </p>
      </div>

      <ArrowRight
        size={16}
        className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
      />
    </Link>
  );
}

// =====================================================
// TOPBAR MANDIRI
// =====================================================

function Topbar({
  role,
  nama,
  collapsed,
  onToggleSidebar,
  onOpenMobile,
  onLogout,
  loggingOut,
}) {
  const pathname = usePathname();
  const [showAccount, setShowAccount] = useState(false);

  const sections = role === "MKS" ? mksSections : pengawasSections;

  const currentItem = sections
    .flatMap((section) => section.items)
    .find((item) => item.href === pathname);

  const pageTitle =
    currentItem?.label ||
    (role === "MKS" ? "Dashboard MKS" : "Dashboard Pengawas");

  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobile}
            aria-label="Buka menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu size={21} />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Perkecil atau lebarkan sidebar"
            className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:inline-flex"
          >
            {collapsed ? <Menu size={19} /> : <ChevronLeft size={19} />}
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
              {pageTitle}
            </h1>
            <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
              {today}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden rounded-lg bg-slate-50 px-3 py-2 text-right md:block">
            <p className="text-xs font-semibold text-slate-700">
              {role === "MKS" ? "Area Kerja MKS" : "Area Kerja Pengawas"}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">JOSJIS</p>
          </div>

          <button
            type="button"
            aria-label="Notifikasi"
            title="Notifikasi"
            className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
          >
            <Bell size={19} />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-expanded={showAccount}
              onClick={() => setShowAccount((value) => !value)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 p-1.5 pr-2.5 hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-sm font-bold text-white">
                {(nama || role).trim().charAt(0).toUpperCase()}
              </div>

              <span className="hidden max-w-28 truncate text-xs font-semibold text-slate-700 sm:block">
                {nama || role}
              </span>

              <ChevronDown size={15} className="text-slate-400" />
            </button>

            {showAccount && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <Link
                  href="/pengaturan-akun"
                  onClick={() => setShowAccount(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Settings size={16} />
                  Pengaturan Akun
                </Link>

                <button
                  type="button"
                  onClick={onLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <LogOut size={16} />
                  {loggingOut ? "Memproses..." : "Keluar"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// =====================================================
// DASHBOARD MKS DAN PENGAWAS
// =====================================================

export default function RoleDashboardMks({ role, nama, unit }) {
  const isMKS = role === "MKS";
  const isPengawas = role === "PENGAWAS";

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // ===================================================
  // LOGOUT BERSAMA:
  // ADMIN, MKS, DAN PENGAWAS MENGGUNAKAN API YANG SAMA.
  // ===================================================
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

      // Ganti halaman penuh agar state dashboard tidak tertinggal.
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
      <div className="min-h-screen bg-slate-50 p-6">
        Role pengguna tidak dikenali.
      </div>
    );
  }

  const sections = isMKS ? mksSections : pengawasSections;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Sidebar
        role={role}
        nama={nama}
        unit={unit}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <div
        className={[
          "min-h-screen transition-[margin] duration-200",
          collapsed ? "lg:ml-[76px]" : "lg:ml-[270px]",
        ].join(" ")}
      >
        <Topbar
          role={role}
          nama={nama}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
          onOpenMobile={() => setMobileOpen(true)}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />

        <main className="mx-auto w-full max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-8">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 p-6 text-white shadow-sm sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] border-white/5" />

            <div className="pointer-events-none absolute -bottom-20 right-40 h-48 w-48 rounded-full bg-white/5" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                <ShieldCheck size={15} />
                {isMKS ? "DASHBOARD MKS" : "DASHBOARD PENGAWAS"}
              </div>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                Selamat datang, {nama || (isMKS ? "MKS" : "Pengawas")}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
                {isMKS
                  ? "Pusat pekerjaan, pengelolaan kredit, agunan, dan laporan operasional unit Anda."
                  : "Pusat pemantauan pekerjaan dan aktivitas operasional unit penugasan Anda."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm">
                  <House size={17} />
                  <span className="text-emerald-100">Unit:</span>
                  <strong>{unit || "Belum tersedia"}</strong>
                </div>

                <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm">
                  <UserRound size={17} />
                  <strong>{isMKS ? "MKS" : "Pengawas"}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* RINGKASAN MKS */}
          {isMKS && (
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Ringkasan Pekerjaan
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Akses cepat ke booking dan data perjanjian kredit.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Link
                  href="/mks/dashboard-booking"
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">
                    <CalendarDays size={26} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-500">Dashboard Booking</p>
                    <p className="mt-1 text-2xl font-bold text-slate-800">—</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ringkasan booking akan diisi dari database.
                    </p>
                  </div>

                  <ArrowRight
                    size={18}
                    className="text-slate-300 group-hover:text-emerald-700"
                  />
                </Link>

                <Link
                  href="/mks/data-pk"
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="rounded-xl bg-blue-50 p-4 text-blue-700">
                    <Wallet size={26} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-500">Data PK</p>
                    <p className="mt-1 text-2xl font-bold text-slate-800">—</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ringkasan PK akan diisi dari database.
                    </p>
                  </div>

                  <ArrowRight
                    size={18}
                    className="text-slate-300 group-hover:text-blue-700"
                  />
                </Link>
              </div>
            </section>
          )}

          {/* SEMUA MENU */}
          <section className="space-y-7">
            {sections.map((section) => (
              <div key={section.title}>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold tracking-wide text-slate-800">
                      {section.title}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {isMKS
                        ? "Akses menu sesuai kebutuhan pekerjaan."
                        : "Akses fitur pemantauan sesuai hak pengguna."}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
                    {section.items.length} menu
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((item) => (
                    <MenuCard
                      key={item.href}
                      item={{
                        ...item,
                        color: menuColors[item.label] || "emerald",
                        description:
                          item.label === "Dashboard"
                            ? "Ringkasan informasi dan aktivitas."
                            : item.label === "My Work"
                              ? "Pekerjaan dan tugas operasional."
                              : item.label === "Data PK"
                                ? "Lihat dan kelola data perjanjian kredit."
                                : item.label === "Pengaturan Akun"
                                  ? "Pengaturan profil dan akun pengguna."
                                  : `Akses fitur ${item.label}.`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
            JOSJIS · Sistem Informasi Operasional
          </footer>
        </main>
      </div>
    </div>
  );
}
