"use client";

import Link from "next/link";

import {
  Archive,
  CalendarDays,
  Calculator,
  ClipboardCheck,
  Clock3,
  FileCheck,
  FileSpreadsheet,
  FileStack,
  FileText,
  FolderKanban,
  Home,
  Landmark,
  LogOut,
  Package,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const menuSections = [
  {
    title: null,
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: Home,
      },
      {
        label: "My Work",
        href: "/admin/my-work",
        icon: ClipboardCheck,
      },
    ],
  },

  {
    title: "DATA",
    items: [
      {
        label: "PK",
        href: "/admin/pk",
        icon: FileText,
      },
      {
        label: "Agunan",
        href: "/admin/agunan",
        icon: Landmark,
      },
      {
        label: "Agunan Siap Notaris",
        href: "/admin/agunan-siap-notaris",
        icon: FileCheck,
      },
      {
        label: "Agunan Lunas",
        href: "/admin/agunan-lunas",
        icon: Archive,
      },
    ],
  },

  {
    title: "OPERASIONAL",
    items: [
      {
        label: "Laporan Booking Harian",
        href: "/admin/booking-harian",
        icon: CalendarDays,
      },
      {
        label: "Pengajuan Lembur MKA",
        href: "/admin/pengajuan-lembur-mka",
        icon: Clock3,
      },
      {
        label: "RaportMU",
        href: "/admin/raportmu",
        icon: FileSpreadsheet,
      },
      {
        label: "Kelola PDF",
        href: "/admin/kelola-pdf",
        icon: FileStack,
      },
      {
        label: "Cetak Advis",
        href: "/admin/cetak-advis",
        icon: Printer,
      },
    ],
  },

  {
    title: "PROSES",
    items: [
      {
        label: "Pemeriksaan",
        href: "/admin/pemeriksaan",
        icon: ClipboardCheck,
      },
      {
        label: "Order Agunan",
        href: "/admin/order-agunan",
        icon: Package,
      },
      {
        label: "Migrasi",
        href: "/admin/migrasi",
        icon: Truck,
      },
      {
        label: "Monitoring Status PK Final",
        href: "/admin/monitoring-status-pk-final",
        icon: FileCheck,
      },
      {
        label: "Pending Notaris",
        href: "/admin/pending-notaris",
        icon: FileCheck,
      },
      {
        label: "Pengikatan",
        href: "/admin/pengikatan",
        icon: ShieldCheck,
      },
      {
        label: "BAST",
        href: "/admin/bast",
        icon: FileText,
      },
    ],
  },

  {
    title: "DOKUMEN",
    items: [
      {
        label: "Dokumen",
        href: "/admin/dokumen",
        icon: FolderKanban,
      },
      {
        label: "Surat Keluar",
        href: "/admin/surat-keluar",
        icon: FileText,
      },
    ],
  },

  {
    title: "MASTER",
    items: [
      {
        label: "Pegawai Unit",
        href: "/admin/pegawai-unit",
        icon: Users,
      },
      {
        label: "Notaris",
        href: "/admin/notaris",
        icon: Users,
      },
      {
        label: "Ketentuan Biaya",
        href: "/admin/ketentuan-biaya",
        icon: WalletCards,
      },
      {
        label: "Loker",
        href: "/admin/loker",
        icon: Archive,
      },
    ],
  },

  {
    title: "RUMUS",
    items: [
      {
        label: "Kalkulator AFMS / AJK",
        href: "/admin/rumus/afms-ajk",
        icon: Calculator,
      },
      {
        label: "Kalkulator Pra Pencairan",
        href: "/admin/rumus/pra-pencairan",
        icon: Calculator,
      },
    ],
  },

  {
    title: "SISTEM",
    items: [
      {
        label: "Pengguna",
        href: "/admin/pengguna",
        icon: Users,
      },
      {
        label: "Perangkat",
        href: "/admin/perangkat",
        icon: ShieldCheck,
      },
      {
        label: "Audit Log",
        href: "/admin/audit-log",
        icon: Search,
      },
      {
        label: "Pengaturan",
        href: "/admin/pengaturan",
        icon: Settings,
      },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity lg:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-zinc-200 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
              J
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight text-zinc-900">
                JOSJIS
              </div>

              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Kuamang Kuning
              </div>
            </div>
          </div>

          {/* Close mobile */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          {menuSections.map((section, sectionIndex) => (
            <div
              key={section.title || sectionIndex}
              className={sectionIndex === 0 ? "" : "mt-7"}
            >
              {section.title && (
                <div className="mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-zinc-400">
                  {section.title}
                </div>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />

                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="shrink-0 border-t border-zinc-200 p-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
