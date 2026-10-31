"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Home,
  BriefcaseBusiness,
  LockKeyhole,
  Database,
  KeyRound,
  Landmark,
  Building2,
  Archive,
  PackageCheck,
  FolderKanban,
  ClipboardCheck,
  Package,
  ArrowLeftRight,
  FileClock,
  FileCheck,
  Wallet,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Files,
  Clock3,
  Users,
  Calculator,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";

// ======================================================
// KONFIGURASI MENU SIDEBAR
// URL dipertahankan agar sesuai dengan halaman yang ada.
// ======================================================

const mainMenus = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: Home,
  },
  {
    label: "My Work",
    href: "/admin/my-work",
    icon: BriefcaseBusiness,
  },
  {
    label: "Request Buka Blokir",
    href: "/admin/blokiran",
    icon: LockKeyhole,
  },
  {
    label: "Account",
    href: "/admin/account",
    icon: KeyRound,
  },
  {
    label: "Assesoir PK",
    href: "/admin/assesoir-pk",
    icon: Files,
  },
];

const menuSections = [
  {
    id: "database-pk",
    label: "Database PK",
    icon: Database,
    items: [
      {
        label: "Database PK",
        href: "/admin/pk",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    id: "agunan",
    label: "Agunan",
    icon: Landmark,
    items: [
      {
        label: "Agunan Aktif",
        href: "/admin/agunan",
        icon: Building2,
      },
      {
        label: "Agunan Lunas",
        href: "/admin/agunan-lunas",
        icon: Archive,
      },
      {
        label: "Serah Terima Agunan Lunas",
        href: "/admin/penyerahan-agunan-lunas",
        icon: PackageCheck,
      },
    ],
  },
  {
    id: "proses-data",
    label: "Proses dan Data",
    icon: FolderKanban,
    items: [
      {
        label: "Checklist Doc PK",
        href: "/admin/pemeriksaan",
        icon: ClipboardCheck,
      },
      {
        label: "Order Agunan",
        href: "/admin/order-agunan",
        icon: Package,
      },
      {
        label: "Migrasi Agunan",
        href: "/admin/migrasi",
        icon: ArrowLeftRight,
      },
      {
        label: "Pending Notaris",
        href: "/admin/pending-notaris",
        icon: FileClock,
      },
      {
        label: "BAST",
        href: "/admin/bast",
        icon: FileCheck,
      },
      {
        label: "Pelunasan Pinjaman",
        href: "/admin/pelunasan-pinjaman",
        icon: Wallet,
      },
    ],
  },
  {
    id: "laporan",
    label: "Laporan",
    icon: BarChart3,
    items: [
      {
        label: "RaportMU",
        href: "/admin/raportmu",
        icon: FileSpreadsheet,
      },
      {
        label: "Laporan Booking dan Aktivasi",
        href: "/admin/booking-harian",
        icon: FileText,
      },
    ],
  },
  {
    id: "operasional",
    label: "Operasional",
    icon: BriefcaseBusiness,
    items: [
      {
        label: "Surat Keluar",
        href: "/admin/surat-keluar",
        icon: FileText,
      },
      {
        label: "Loker Agunan",
        href: "/admin/loker",
        icon: Archive,
      },
      {
        label: "Kelola PDF",
        href: "/admin/kelola-pdf",
        icon: Files,
      },
      {
        label: "Cetak Advis",
        href: "/admin/cetak-advis",
        icon: FileSpreadsheet,
      },
      {
        label: "Pengajuan Lembur",
        href: "/admin/pengajuan-lembur-mka",
        icon: Clock3,
      },
    ],
  },
  {
    id: "master-data",
    label: "Master Data",
    icon: Database,
    items: [
      {
        label: "Unit",
        href: "/admin/master-unit",
        icon: Building2,
      },
      {
        label: "Pegawai Unit",
        href: "/admin/pegawai-unit",
        icon: Users,
      },
      {
        label: "Notaris",
        href: "/admin/notaris",
        icon: Landmark,
      },
    ],
  },
  {
    id: "kalkulator",
    label: "Kalkulator",
    icon: Calculator,
    items: [
      {
        label: "Kalkulator AFMS / AJK",
        href: "/admin/rumus/afms-ajk",
        icon: Calculator,
      },
      {
        label: "Kalkulator Pra Pencairan",
        href: "/admin/rumus/pra-pencairan",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    id: "pengaturan-sistem",
    label: "Pengaturan Sistem",
    icon: Settings,
    items: [
      {
        label: "Pengguna",
        href: "/admin/pengguna",
        icon: Users,
      },
      {
        label: "Audit Log",
        href: "/admin/audit-log",
        icon: FileClock,
      },
      {
        label: "Backup & Export",
        href: "/admin/backup",
        icon: Archive,
      },
      {
        label: "Template & Import",
        href: "/admin/import-data",
        icon: Files,
      },
      {
        label: "Pindah Cabang",
        href: "/admin/pindah-cabang",
        icon: ArrowLeftRight,
      },
      {
        label: "Pengaturan",
        href: "/admin/pengaturan",
        icon: Settings,
      },
    ],
  },
];

// ======================================================
// PEMERIKSAAN HALAMAN AKTIF
// ======================================================

function isPathActive(pathname, href) {
  if (!pathname || !href) return false;

  return pathname === href || pathname.startsWith(`${href}/`);
}

function sectionHasActiveItem(pathname, section) {
  return section.items.some((item) => isPathActive(pathname, item.href));
}

// ======================================================
// SIDEBAR UTAMA
// ======================================================

export default function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();
  const router = useRouter();

  const [expandedSections, setExpandedSections] = useState(() => {
    const initial = {};

    menuSections.forEach((section) => {
      initial[section.id] = false;
    });

    return initial;
  });

  // Otomatis buka grup menu aktif dan tutup grup lainnya.
  useEffect(() => {
    const activeSection = menuSections.find(
      (section) =>
        section.id !== "database-pk" && sectionHasActiveItem(pathname, section),
    );

    setExpandedSections(() => {
      const next = {};

      menuSections.forEach((section) => {
        next[section.id] = section.id === activeSection?.id;
      });

      return next;
    });
  }, [pathname]);

  // Kunci scroll halaman saat sidebar mobile dibuka.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const toggleSection = (sectionId) => {
    setExpandedSections((previous) => {
      const isCurrentlyOpen = previous[sectionId];

      const next = {};

      menuSections.forEach((section) => {
        next[section.id] = !isCurrentlyOpen && section.id === sectionId;
      });

      return next;
    });
  };

  const handleNavigate = () => {
    onClose?.();
  };

  const handleLogout = async () => {
    onClose?.();

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.error || "Logout gagal. Silakan coba lagi.");
        return;
      }

      window.location.replace("/");
    } catch (error) {
      console.error("Gagal menghubungi API logout:", error);
      alert("Tidak dapat terhubung ke server. Silakan coba lagi.");
    }
  };

  return (
    <>
      {/* Overlay khusus layar kecil */}
      <button
        type="button"
        aria-label="Tutup menu"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          open
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar */}
      <aside
        aria-label="Navigasi utama"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-[260px] lg:max-w-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <Link
            href="/admin/dashboard"
            onClick={handleNavigate}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#174C40] text-white shadow-sm">
              <Landmark size={21} strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <div className="text-[17px] font-bold tracking-[0.08em] text-slate-800">
                JOSJIS
              </div>
              <div className="mt-0.5 text-[10px] font-medium tracking-[0.16em] text-slate-400">
                AGUNAN MANAGEMENT
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigasi */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {/* Menu utama */}
          <div className="space-y-1">
            {mainMenus.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isPathActive(pathname, item.href)}
                onNavigate={handleNavigate}
              />
            ))}
          </div>

          {/* Grup menu */}
          <div className="mt-5 space-y-1">
            {menuSections.map((section) => {
              const SectionIcon = section.icon;
              const expanded = Boolean(expandedSections[section.id]);
              const hasActiveItem = sectionHasActiveItem(pathname, section);

              // Database PK hanya berisi satu halaman.
              // Tetap ditampilkan sebagai menu utama yang sejajar.
              const isSingleItem = section.id === "database-pk";

              if (isSingleItem) {
                const item = section.items[0];

                return (
                  <SidebarLink
                    key={section.id}
                    item={{
                      ...item,
                      label: section.label,
                      icon: section.icon,
                    }}
                    active={isPathActive(pathname, item.href)}
                    onNavigate={handleNavigate}
                  />
                );
              }

              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={expanded}
                    className={`group flex min-h-[43px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
                      hasActiveItem
                        ? "bg-[#174C40]/[0.07] text-[#174C40]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <SectionIcon
                      size={18}
                      strokeWidth={1.9}
                      className={`shrink-0 ${
                        hasActiveItem
                          ? "text-[#174C40]"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />

                    <span className="min-w-0 flex-1 text-[12px] font-bold uppercase tracking-[0.075em]">
                      {section.label}
                    </span>

                    {expanded ? (
                      <ChevronDown
                        size={16}
                        className="shrink-0 text-slate-400"
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                        className="shrink-0 text-slate-400"
                      />
                    )}
                  </button>

                  {expanded && (
                    <div className="ml-[21px] mt-1 space-y-1 border-l border-slate-200 py-1 pl-3">
                      {section.items.map((item) => (
                        <SidebarLink
                          key={item.href}
                          item={item}
                          active={isPathActive(pathname, item.href)}
                          nested
                          onNavigate={handleNavigate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#174C40]/10 text-[#174C40]">
              <Landmark size={16} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700">
                JOSJIS
              </p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                Sistem Informasi Agunan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} strokeWidth={1.9} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ======================================================
// ITEM MENU
// ======================================================

function SidebarLink({ item, active, nested = false, onNavigate }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-[40px] items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-150 ${
        nested ? "text-[12px]" : "text-[13px]"
      } ${
        active
          ? "bg-[#174C40] font-semibold text-white shadow-sm shadow-[#174C40]/10"
          : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {active && (
        <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-white/80" />
      )}

      {Icon && (
        <Icon
          size={nested ? 16 : 18}
          strokeWidth={active ? 2.1 : 1.8}
          className={`shrink-0 ${
            active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
          }`}
        />
      )}

      <span className="min-w-0 flex-1 leading-5">{item.label}</span>
    </Link>
  );
}
