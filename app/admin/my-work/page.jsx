"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileWarning,
  FolderCheck,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";

const workItems = [
  // =========================================================
  // JKK 1
  // =========================================================
  {
    id: "WORK-001",
    unit: "JKK1",
    category: "pk",
    categoryLabel: "PK Belum Lengkap",
    code: "PK-002",
    name: "Dwi Maryati",
    description: "Data pihak terkait belum lengkap",
    detail: "Data pasangan dan pemilik agunan belum dilengkapi.",
    status: "Perlu Tindakan",
    action: "Lengkapi PK",
    priority: "normal",
    date: "23 Sep 2026",
  },
  {
    id: "WORK-002",
    unit: "JKK1",
    category: "document",
    categoryLabel: "Dokumen PK Belum Lengkap",
    code: "PK-002",
    name: "Dwi Maryati",
    description: "3 dokumen belum lengkap",
    detail: "KTP Pasangan, Advis Asuransi, Dokumen Pengikatan",
    status: "Perlu Tindakan",
    action: "Lengkapi Dokumen",
    priority: "high",
    date: "23 Sep 2026",
  },
  {
    id: "WORK-003",
    unit: "JKK1",
    category: "order",
    categoryLabel: "Monitoring Order Agunan",
    code: "ORD-004",
    name: "Gunawan",
    description: "Order menunggu pengiriman",
    detail: "8 agunan siap dikirim ke Cluster.",
    status: "Perlu Tindakan",
    action: "Proses Order",
    priority: "normal",
    date: "22 Sep 2026",
  },
  {
    id: "WORK-004",
    unit: "JKK1",
    category: "migration",
    categoryLabel: "Monitoring Migrasi",
    code: "MIG-003",
    name: "Siti Rahma",
    description: "Menunggu penerimaan migrasi",
    detail: "Dokumen sudah dikirim dan belum dikonfirmasi penerimaannya.",
    status: "Menunggu",
    action: "Konfirmasi Penerimaan",
    priority: "high",
    date: "21 Sep 2026",
  },
  {
    id: "WORK-005",
    unit: "JKK1",
    category: "legal",
    categoryLabel: "Legal & Sertifikat Belum Lengkap",
    code: "SHM-01345",
    name: "Yudi Pratama",
    description: "Legal belum lengkap",
    detail: "File legal belum lengkap dan sertifikat sudah berada di cabang.",
    status: "Perlu Tindakan",
    action: "Lengkapi Legal",
    priority: "normal",
    date: "20 Sep 2026",
  },
  {
    id: "WORK-006",
    unit: "JKK1",
    category: "notary-ready",
    categoryLabel: "Siap Diserahkan ke Notaris",
    code: "SHM-01160",
    name: "Dwi Maryati",
    description: "Agunan siap diserahkan",
    detail: "Dokumen lengkap. Menunggu penyerahan fisik ke Notaris A.",
    status: "Perlu Tindakan",
    action: "Serahkan ke Notaris",
    priority: "high",
    date: "23 Sep 2026",
  },
  {
    id: "WORK-007",
    unit: "JKK1",
    category: "notary",
    categoryLabel: "Masih di Notaris",
    code: "SHM-01172",
    name: "Budi Santoso",
    description: "Agunan masih berada di Notaris",
    detail: "Diserahkan ke Notaris A pada 18 Sep 2026.",
    status: "Menunggu",
    action: "Follow Up Notaris",
    priority: "high",
    date: "18 Sep 2026",
  },
  {
    id: "WORK-008",
    unit: "JKK1",
    category: "branch",
    categoryLabel: "Sudah di Cabang",
    code: "SHM-01201",
    name: "Yuni Lestari",
    description: "Agunan sudah diberikan Notaris",
    detail: "Diterima di JKK1 dan menunggu konfirmasi lokasi penyimpanan.",
    status: "Perlu Tindakan",
    action: "Konfirmasi Lokasi",
    priority: "normal",
    date: "22 Sep 2026",
  },

  // =========================================================
  // JKK 2
  // =========================================================
  {
    id: "WORK-009",
    unit: "JKK2",
    category: "pk",
    categoryLabel: "PK Belum Lengkap",
    code: "PK-101",
    name: "Andi Saputra",
    description: "Data agunan belum lengkap",
    detail: "Data pemilik agunan dan hubungan dengan debitur belum diisi.",
    status: "Perlu Tindakan",
    action: "Lengkapi PK",
    priority: "normal",
    date: "23 Sep 2026",
  },
  {
    id: "WORK-010",
    unit: "JKK2",
    category: "document",
    categoryLabel: "Dokumen PK Belum Lengkap",
    code: "PK-104",
    name: "Rina Marlina",
    description: "2 dokumen belum lengkap",
    detail: "KTP Pasangan dan Dokumen Legal Agunan",
    status: "Perlu Tindakan",
    action: "Lengkapi Dokumen",
    priority: "high",
    date: "23 Sep 2026",
  },
  {
    id: "WORK-011",
    unit: "JKK2",
    category: "order",
    categoryLabel: "Monitoring Order Agunan",
    code: "ORD-021",
    name: "Hendra Wijaya",
    description: "Menunggu penerimaan agunan",
    detail: "Order sudah dikirim ke Cluster.",
    status: "Menunggu",
    action: "Konfirmasi Penerimaan",
    priority: "normal",
    date: "20 Sep 2026",
  },
  {
    id: "WORK-012",
    unit: "JKK2",
    category: "migration",
    categoryLabel: "Monitoring Migrasi",
    code: "MIG-011",
    name: "Fajar Hidayat",
    description: "Dokumen migrasi belum lengkap",
    detail: "2 dokumen pendukung belum diterima.",
    status: "Perlu Tindakan",
    action: "Lengkapi Migrasi",
    priority: "normal",
    date: "22 Sep 2026",
  },
  {
    id: "WORK-013",
    unit: "JKK2",
    category: "legal",
    categoryLabel: "Legal & Sertifikat Belum Lengkap",
    code: "SHM-02218",
    name: "Dedi Kurniawan",
    description: "Sertifikat belum diterima",
    detail: "File legal sudah tersedia tetapi sertifikat fisik belum diterima.",
    status: "Perlu Tindakan",
    action: "Tindak Lanjuti Sertifikat",
    priority: "high",
    date: "21 Sep 2026",
  },
  {
    id: "WORK-014",
    unit: "JKK2",
    category: "notary-ready",
    categoryLabel: "Siap Diserahkan ke Notaris",
    code: "SHM-02231",
    name: "Sari Wulandari",
    description: "Agunan siap diserahkan",
    detail:
      "Dokumen pengikatan sudah lengkap. Menunggu penyerahan ke Notaris B.",
    status: "Perlu Tindakan",
    action: "Serahkan ke Notaris",
    priority: "normal",
    date: "23 Sep 2026",
  },
  {
    id: "WORK-015",
    unit: "JKK2",
    category: "notary",
    categoryLabel: "Masih di Notaris",
    code: "SHM-02244",
    name: "Rina Marlina",
    description: "Agunan masih berada di Notaris",
    detail: "Diserahkan ke Notaris B pada 19 Sep 2026.",
    status: "Menunggu",
    action: "Follow Up Notaris",
    priority: "high",
    date: "19 Sep 2026",
  },
  {
    id: "WORK-016",
    unit: "JKK2",
    category: "branch",
    categoryLabel: "Sudah di Cabang",
    code: "SHM-02252",
    name: "Hendra Wijaya",
    description: "Agunan sudah di cabang",
    detail: "Diterima dari Notaris B dan menunggu konfirmasi Loker.",
    status: "Perlu Tindakan",
    action: "Konfirmasi Lokasi",
    priority: "normal",
    date: "22 Sep 2026",
  },
];

const categoryConfig = {
  pk: {
    label: "PK Belum Lengkap",
    icon: ClipboardCheck,
  },
  document: {
    label: "Dokumen PK Belum Lengkap",
    icon: FileWarning,
  },
  order: {
    label: "Order Agunan",
    icon: Truck,
  },
  migration: {
    label: "Migrasi",
    icon: PackageCheck,
  },
  legal: {
    label: "Legal & Sertifikat",
    icon: FolderCheck,
  },
  "notary-ready": {
    label: "Siap ke Notaris",
    icon: ShieldCheck,
  },
  notary: {
    label: "Masih di Notaris",
    icon: Building2,
  },
  branch: {
    label: "Sudah di Cabang",
    icon: CheckCircle2,
  },
};

const filters = [
  { value: "all", label: "Semua" },
  { value: "action", label: "Perlu Tindakan" },
  { value: "waiting", label: "Menunggu" },
  { value: "pk", label: "PK" },
  { value: "document", label: "Dokumen" },
  { value: "order", label: "Order Agunan" },
  { value: "migration", label: "Migrasi" },
  { value: "legal", label: "Legal & Sertifikat" },
  { value: "notary-ready", label: "Siap ke Notaris" },
  { value: "notary", label: "Masih di Notaris" },
  { value: "branch", label: "Sudah di Cabang" },
];

function SummaryCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const isAction = status === "Perlu Tindakan";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        isAction ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  if (priority !== "high") return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
      <CalendarClock className="h-3 w-3" />
      Prioritas
    </span>
  );
}

export default function MyWorkPage() {
  const { activeUnit } = useUnit();

  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const unitItems = useMemo(() => {
    return workItems.filter((item) => item.unit === activeUnit.value);
  }, [activeUnit.value]);

  const summary = useMemo(() => {
    const action = unitItems.filter(
      (item) => item.status === "Perlu Tindakan",
    ).length;

    const waiting = unitItems.filter(
      (item) => item.status === "Menunggu",
    ).length;

    const priority = unitItems.filter(
      (item) => item.priority === "high",
    ).length;

    return {
      action,
      waiting,
      priority,
    };
  }, [unitItems]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return unitItems.filter((item) => {
      const matchFilter =
        activeFilter === "all" ||
        (activeFilter === "action" && item.status === "Perlu Tindakan") ||
        (activeFilter === "waiting" && item.status === "Menunggu") ||
        item.category === activeFilter;

      const matchSearch =
        !keyword ||
        [
          item.code,
          item.name,
          item.description,
          item.detail,
          item.categoryLabel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      return matchFilter && matchSearch;
    });
  }, [unitItems, activeFilter, search]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  My Work
                </h1>

                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                  {activeUnit.code}
                </span>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                Daftar pekerjaan yang membutuhkan tindakan atau follow-up Anda.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
              <p className="text-xs text-zinc-500">Unit aktif</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                {activeUnit.code} ·{" "}
                {activeUnit.value === "JKK1"
                  ? "Jambi Kuamang Kuning 1"
                  : "Jambi Kuamang Kuning 2"}
              </p>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={ClipboardCheck}
            label="Perlu Tindakan"
            value={summary.action}
            description="Pekerjaan yang dapat langsung dikerjakan."
          />

          <SummaryCard
            icon={Clock3}
            label="Menunggu"
            value={summary.waiting}
            description="Pekerjaan yang menunggu pihak atau proses lain."
          />

          <SummaryCard
            icon={CalendarClock}
            label="Prioritas"
            value={summary.priority}
            description="Pekerjaan yang perlu segera ditindaklanjuti."
          />
        </div>

        {/* SEARCH */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="text"
              placeholder="Cari PK / SHM / nama / order / migrasi / kategori..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => {
              const active = activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* WORK LIST */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">
                Pekerjaan Aktif
              </h2>

              <p className="mt-0.5 text-xs text-zinc-500">
                {filteredItems.length} pekerjaan ditemukan
              </p>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                <CheckCircle2 className="h-5 w-5 text-zinc-500" />
              </div>

              <p className="mt-4 text-sm font-semibold text-zinc-900">
                Tidak ada pekerjaan
              </p>

              <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">
                Tidak ada pekerjaan yang sesuai dengan filter atau pencarian
                saat ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filteredItems.map((item) => {
                const config = categoryConfig[item.category];
                const Icon = config.icon;

                return (
                  <div
                    key={item.id}
                    className="group p-5 transition hover:bg-zinc-50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      {/* ICON */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* CONTENT */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-500">
                            {item.categoryLabel}
                          </span>

                          <StatusBadge status={item.status} />

                          <PriorityBadge priority={item.priority} />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="text-sm font-semibold text-zinc-950">
                            {item.code}
                          </h3>

                          <span className="text-zinc-300">•</span>

                          <span className="text-sm text-zinc-700">
                            {item.name}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-zinc-700">
                          {item.description}
                        </p>

                        <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">
                          {item.detail}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                          <span>{item.id}</span>
                          <span>•</span>
                          <span>{item.date}</span>
                        </div>
                      </div>

                      {/* ACTION */}
                      <div className="shrink-0 lg:w-52">
                        <button
                          type="button"
                          className="flex h-10 w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-100"
                        >
                          <span>{item.action}</span>
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600">
              <ArrowRight className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-900">
                My Work mengikuti kondisi workflow
              </p>

              <p className="mt-1 max-w-4xl text-xs leading-5 text-zinc-500">
                Daftar ini bukan database pekerjaan terpisah. Nantinya setiap
                item akan muncul otomatis berdasarkan kondisi PK, dokumen,
                agunan, order, migrasi, legal, sertifikat, Notaris, dan lokasi
                penyimpanan. Setelah pekerjaan selesai, item otomatis hilang
                dari My Work.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
