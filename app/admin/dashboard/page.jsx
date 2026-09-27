import DashboardLayout from "@/components/DashboardLayout";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  FileCheck,
  Package,
  Truck,
} from "lucide-react";

const stats = [
  {
    label: "Total PK",
    value: "1.248",
    description: "Seluruh data PK JKK 1",
  },
  {
    label: "PK Bulan Ini",
    value: "86",
    description: "September 2026",
  },
  {
    label: "Pending Order",
    value: "12",
    description: "Perlu diproses",
  },
  {
    label: "Pending Migrasi",
    value: "8",
    description: "Dalam proses",
  },
];

const debtors = [
  {
    pk: "PK-001",
    cif: "CIF00123",
    nik: "1507••••••••••01",
    name: "Budi Santoso",
    type: "KUM",
    plafond: "Rp150.000.000",
    date: "03 Sep 2026",
    status: "Aktif",
    completeness: "Lengkap",
  },
  {
    pk: "PK-002",
    cif: "CIF00124",
    nik: "1507••••••••••02",
    name: "Dwi Maryati",
    type: "KUR",
    plafond: "Rp250.000.000",
    date: "08 Sep 2026",
    status: "Aktif",
    completeness: "Perlu dilengkapi",
  },
  {
    pk: "PK-003",
    cif: "CIF00125",
    nik: "1507••••••••••03",
    name: "Yuni Lestari",
    type: "KSM",
    plafond: "Rp85.000.000",
    date: "12 Sep 2026",
    status: "Aktif",
    completeness: "Lengkap",
  },
  {
    pk: "PK-004",
    cif: "CIF00126",
    nik: "1507••••••••••04",
    name: "Gunawan",
    type: "KPP",
    plafond: "Rp185.000.000",
    date: "18 Sep 2026",
    status: "Aktif",
    completeness: "Perlu dilengkapi",
  },
];

const works = [
  {
    label: "Pending Order",
    value: "12",
    description: "Order agunan menunggu proses",
    icon: Package,
    href: "/admin/order-agunan",
  },
  {
    label: "Pending Migrasi",
    value: "8",
    description: "Agunan/dokumen dalam proses migrasi",
    icon: Truck,
    href: "/admin/migrasi",
  },
  {
    label: "Pending Notaris",
    value: "5",
    description: "Menunggu proses notaris",
    icon: FileCheck,
    href: "/admin/pending-notaris",
  },
  {
    label: "Pemeriksaan",
    value: "9",
    description: "PK perlu pemeriksaan",
    icon: ClipboardCheck,
    href: "/admin/pemeriksaan",
  },
];

export default function DashboardPage() {
  return (
    <DashboardLayout>
      {/* Header */}
      <section className="mb-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-zinc-400">
              Rabu, 23 September 2026
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Ringkasan kondisi pekerjaan dan informasi penting JKK 1.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Unit Kerja
            </div>

            <div className="mt-1 text-sm font-semibold text-zinc-900">
              11081A · Jambi Kuamang Kuning 1
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <p className="text-sm font-medium text-zinc-500">{stat.label}</p>

            <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
              {stat.value}
            </p>

            <p className="mt-2 text-xs text-zinc-400">{stat.description}</p>
          </div>
        ))}
      </section>

      {/* Monthly PK + Work */}
      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Monthly */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 xl:col-span-2">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="font-semibold text-zinc-900">PK Per Bulan</h2>

              <p className="mt-1 text-sm text-zinc-400">
                Data PK berdasarkan tanggal PK.
              </p>
            </div>

            <select
              defaultValue="September 2026"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-400"
            >
              <option>September 2026</option>
              <option>Agustus 2026</option>
              <option>Juli 2026</option>
              <option>Juni 2026</option>
              <option>Mei 2026</option>
            </select>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-zinc-50 p-5">
              <p className="text-sm text-zinc-500">Jumlah PK</p>

              <p className="mt-2 text-2xl font-semibold text-zinc-900">86 PK</p>
            </div>

            <div className="rounded-xl bg-zinc-50 p-5">
              <p className="text-sm text-zinc-500">Total Plafond</p>

              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                Rp8,42 M
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-5">
            <div className="text-sm text-zinc-500">
              KUM 32 · KUR 28 · KPP 14 · KSM 12
            </div>

            <button className="flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900">
              Lihat semua
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Work */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div>
            <h2 className="font-semibold text-zinc-900">Pekerjaan</h2>

            <p className="mt-1 text-sm text-zinc-400">
              Hal yang membutuhkan perhatian.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {works.map((work) => {
              const Icon = work.icon;

              return (
                <a
                  key={work.label}
                  href={work.href}
                  className="group flex items-center gap-3 rounded-xl border border-zinc-100 p-3 transition hover:border-zinc-200 hover:bg-zinc-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800">
                      {work.label}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-zinc-400">
                      {work.description}
                    </p>
                  </div>

                  <span className="text-sm font-semibold text-zinc-900">
                    {work.value}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Debtor Table */}
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-semibold text-zinc-900">
              Debitur September 2026
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              PK yang tercatat pada bulan yang dipilih.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
              Filter
            </button>

            <button className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              Data PK
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <th className="px-6 py-4">PK</th>
                <th className="px-6 py-4">CIF</th>
                <th className="px-6 py-4">NIK</th>
                <th className="px-6 py-4">Nama Debitur</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4">Plafond</th>
                <th className="px-6 py-4">Tgl PK</th>
                <th className="px-6 py-4">Kelengkapan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {debtors.map((debtor) => (
                <tr key={debtor.pk} className="transition hover:bg-zinc-50">
                  <td className="px-6 py-4 font-semibold text-zinc-900">
                    {debtor.pk}
                  </td>

                  <td className="px-6 py-4 text-zinc-500">{debtor.cif}</td>

                  <td className="px-6 py-4 text-zinc-500">{debtor.nik}</td>

                  <td className="px-6 py-4 font-medium text-zinc-700">
                    {debtor.name}
                  </td>

                  <td className="px-6 py-4 text-zinc-500">{debtor.type}</td>

                  <td className="px-6 py-4 font-medium text-zinc-700">
                    {debtor.plafond}
                  </td>

                  <td className="px-6 py-4 text-zinc-500">{debtor.date}</td>

                  <td className="px-6 py-4">
                    {debtor.completeness === "Lengkap" ? (
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                        Lengkap
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                        <AlertTriangle className="h-3 w-3" />
                        Perlu dilengkapi
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
          <p className="text-xs text-zinc-400">Menampilkan 4 dari 86 PK</p>

          <button className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
            Lihat seluruh PK →
          </button>
        </div>
      </section>
    </DashboardLayout>
  );
}
