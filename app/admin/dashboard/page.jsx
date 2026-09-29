"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileCheck,
  FileText,
  Lightbulb,
  Package,
  Pencil,
  Truck,
  X,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";

/* =========================================================
   DATA STATIS DASHBOARD
========================================================= */

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

const debtors = [
  {
    pk: "PK-001",
    cif: "CIF00123",
    nik: "1571********1234",
    name: "Budi Santoso",
    product: "KUM",
    limit: "Rp150.000.000",
    date: "03 Sep 2026",
    status: "Lengkap",
  },
  {
    pk: "PK-002",
    cif: "CIF00124",
    nik: "1571********5678",
    name: "Dwi Maryati",
    product: "KUR",
    limit: "Rp250.000.000",
    date: "08 Sep 2026",
    status: "Perlu dilengkapi",
  },
  {
    pk: "PK-003",
    cif: "CIF00125",
    nik: "1571********9012",
    name: "Yuni Lestari",
    product: "KSM",
    limit: "Rp85.000.000",
    date: "12 Sep 2026",
    status: "Lengkap",
  },
  {
    pk: "PK-004",
    cif: "CIF00126",
    nik: "1571********3456",
    name: "Gunawan",
    product: "KPP",
    limit: "Rp185.000.000",
    date: "18 Sep 2026",
    status: "Perlu dilengkapi",
  },
];

/* =========================================================
   MODAL GENERIC
========================================================= */

function Modal({ title, children, onClose, width = "max-w-lg" }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className={`w-full ${width} overflow-hidden rounded-2xl bg-white shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function AdminDashboardPage() {
  /* =======================================================
     MEMO
  ======================================================= */

  const [memo, setMemo] = useState("");
  const [memoLoading, setMemoLoading] = useState(true);
  const [memoSaving, setMemoSaving] = useState(false);

  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [memoEditMode, setMemoEditMode] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");

  /* =======================================================
     ELECTRICITY
  ======================================================= */

  const [electricityCustomers, setElectricityCustomers] = useState([]);
  const [electricityLoading, setElectricityLoading] = useState(true);
  const [electricitySavingId, setElectricitySavingId] = useState(null);

  const [electricityModalOpen, setElectricityModalOpen] = useState(false);
  const [selectedElectricity, setSelectedElectricity] = useState(null);

  const [electricityDraftName, setElectricityDraftName] = useState("");
  const [electricityDraftId, setElectricityDraftId] = useState("");

  /* =======================================================
     LOAD MEMO
  ======================================================= */

  useEffect(() => {
    async function loadMemo() {
      setMemoLoading(true);

      const { data, error } = await supabase
        .from("dashboard_settings")
        .select("id, memo, electricity_reminder_day")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error("Gagal mengambil memo dashboard:", error);
      }

      if (data) {
        setMemo(data.memo || "");
      }

      setMemoLoading(false);
    }

    loadMemo();
  }, []);

  /* =======================================================
     LOAD ELECTRICITY
  ======================================================= */

  useEffect(() => {
    async function loadElectricity() {
      setElectricityLoading(true);

      const { data, error } = await supabase
        .from("dashboard_electricity_customers")
        .select("id, customer_name, customer_id, sort_order")
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Gagal mengambil data pelanggan listrik:", error);
        setElectricityCustomers([]);
      } else {
        setElectricityCustomers(data || []);
      }

      setElectricityLoading(false);
    }

    loadElectricity();
  }, []);

  /* =======================================================
     MEMO MODAL
  ======================================================= */

  function openMemoModal() {
    setMemoDraft(memo);
    setMemoEditMode(false);
    setMemoModalOpen(true);
  }

  function startEditMemo() {
    setMemoDraft(memo);
    setMemoEditMode(true);
  }

  function cancelEditMemo() {
    setMemoDraft(memo);
    setMemoEditMode(false);
  }

  async function saveMemo() {
    setMemoSaving(true);

    const { error } = await supabase
      .from("dashboard_settings")
      .update({
        memo: memoDraft,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error("Gagal menyimpan memo:", error);
      alert("Memo gagal disimpan.");
      setMemoSaving(false);
      return;
    }

    setMemo(memoDraft);
    setMemoEditMode(false);
    setMemoSaving(false);
  }

  /* =======================================================
     ELECTRICITY MODAL
  ======================================================= */

  function openElectricityModal(customer) {
    setSelectedElectricity(customer);
    setElectricityDraftName(customer.customer_name || "");
    setElectricityDraftId(customer.customer_id || "");
    setElectricityModalOpen(true);
  }

  function closeElectricityModal() {
    if (electricitySavingId) return;

    setElectricityModalOpen(false);
    setSelectedElectricity(null);
    setElectricityDraftName("");
    setElectricityDraftId("");
  }

  /* =======================================================
     SAVE ELECTRICITY
  ======================================================= */

  async function saveElectricity() {
    if (!selectedElectricity) return;

    setElectricitySavingId(selectedElectricity.id);

    const { error } = await supabase
      .from("dashboard_electricity_customers")
      .update({
        customer_name: electricityDraftName.trim(),
        customer_id: electricityDraftId.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedElectricity.id);

    if (error) {
      console.error("Gagal menyimpan data listrik:", error);
      alert("Data listrik gagal disimpan.");
      setElectricitySavingId(null);
      return;
    }

    setElectricityCustomers((prev) =>
      prev.map((item) =>
        item.id === selectedElectricity.id
          ? {
              ...item,
              customer_name: electricityDraftName.trim(),
              customer_id: electricityDraftId.trim(),
            }
          : item,
      ),
    );

    setSelectedElectricity((prev) =>
      prev
        ? {
            ...prev,
            customer_name: electricityDraftName.trim(),
            customer_id: electricityDraftId.trim(),
          }
        : prev,
    );

    setElectricitySavingId(null);
  }

  /* =======================================================
     COPY IDPEL
  ======================================================= */

  async function copyElectricityId(customerId) {
    try {
      await navigator.clipboard.writeText(customerId);
    } catch (error) {
      console.error("Gagal menyalin IDPEL:", error);
    }
  }

  /* =======================================================
     FORMAT MEMO
  ======================================================= */

  function getMemoPreview() {
    if (!memo) return "Belum ada memo.";

    if (memo.length <= 120) {
      return memo;
    }

    return `${memo.slice(0, 120)}...`;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays size={16} />
              <span>Rabu, 23 September 2026</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Ringkasan aktivitas JOSJIS Mikro Kuamang Kuning.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Unit Kerja
            </div>

            <div className="mt-1 text-sm font-semibold text-slate-800">
              11081A · Jambi Kuamang Kuning 1
            </div>
          </div>
        </div>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="text-sm font-medium text-slate-500">
                {item.label}
              </div>

              <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {item.value}
              </div>

              <div className="mt-1 text-xs text-slate-400">
                {item.description}
              </div>
            </div>
          ))}
        </div>

        {/* =================================================
            MEMO + LISTRIK
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* MEMO */}

          <button
            type="button"
            onClick={openMemoModal}
            className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Lightbulb size={18} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Memo</h2>

                  <p className="text-xs text-slate-400">
                    Catatan penting bersama
                  </p>
                </div>
              </div>

              <ArrowUpRight
                size={17}
                className="text-slate-300 transition group-hover:text-slate-600"
              />
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
              {memoLoading ? (
                <div className="text-xs text-slate-400">Memuat memo...</div>
              ) : (
                <p className="line-clamp-2 text-xs leading-5 text-slate-600">
                  {getMemoPreview()}
                </p>
              )}
            </div>
          </button>

          {/* ELECTRICITY */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Activity size={18} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Pembayaran Listrik
                  </h2>

                  <p className="text-xs text-slate-400">
                    Pengingat setiap tanggal 5
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600">
                3 IDPEL
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
              {electricityLoading ? (
                <div className="px-3 py-3 text-xs text-slate-400">
                  Memuat data pelanggan...
                </div>
              ) : electricityCustomers.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-400">
                  Belum ada data pelanggan listrik.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {electricityCustomers.slice(0, 3).map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => openElectricityModal(customer)}
                      className="group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-800">
                          {customer.customer_name || "-"}
                        </div>

                        <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                          {customer.customer_id || "-"}
                        </div>
                      </div>

                      <ArrowUpRight
                        size={15}
                        className="shrink-0 text-slate-300 transition group-hover:text-slate-600"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            PK BULAN INI
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                PK Bulan Ini
              </h2>

              <p className="mt-1 text-xs text-slate-400">September 2026</p>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-2 text-right">
              <div className="text-[11px] text-slate-400">Total PK</div>

              <div className="text-lg font-bold text-slate-900">86</div>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-800"
              style={{ width: "68%" }}
            />
          </div>

          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>Target bulanan</span>
            <span>68%</span>
          </div>
        </div>

        {/* =================================================
            MY WORK
        ================================================= */}

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                My Work
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Pekerjaan yang membutuhkan perhatian.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {works.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <Icon size={19} />
                    </div>

                    <ArrowUpRight
                      size={17}
                      className="text-slate-300 transition group-hover:text-slate-600"
                    />
                  </div>

                  <div className="mt-4 text-sm font-medium text-slate-500">
                    {item.label}
                  </div>

                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {item.value}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {item.description}
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* =================================================
            TABEL DEBITUR
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Data PK Terbaru
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Ringkasan data PK yang terakhir diproses.
              </p>
            </div>

            <a
              href="/admin/pk"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Lihat semua
              <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    PK
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    CIF
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Debitur
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Produk
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Limit
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Tanggal
                  </th>

                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {debtors.map((item) => (
                  <tr key={item.pk} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-800">
                      {item.pk}
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {item.cif}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="text-xs font-semibold text-slate-800">
                        {item.name}
                      </div>

                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {item.nik}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-xs font-medium text-slate-600">
                      {item.product}
                    </td>

                    <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                      {item.limit}
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {item.date}
                    </td>

                    <td className="px-5 py-3.5">
                      {item.status === "Lengkap" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 size={12} />
                          Lengkap
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                          <FileText size={12} />
                          Perlu dilengkapi
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =================================================
            MEMO MODAL
        ================================================= */}

        {memoModalOpen && (
          <Modal
            title="Memo"
            onClose={() => setMemoModalOpen(false)}
            width="max-w-xl"
          >
            {!memoEditMode ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {memo ? (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {memo}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">Belum ada memo.</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={startEditMemo}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Pencil size={14} />
                    Edit Memo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={memoDraft}
                  onChange={(e) => setMemoDraft(e.target.value)}
                  rows={6}
                  autoFocus
                  placeholder="Tulis memo..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelEditMemo}
                    disabled={memoSaving}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={saveMemo}
                    disabled={memoSaving}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {memoSaving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            )}
          </Modal>
        )}

        {/* =================================================
            ELECTRICITY MODAL
        ================================================= */}

        {electricityModalOpen && selectedElectricity && (
          <Modal
            title="Pembayaran Listrik"
            onClose={closeElectricityModal}
            width="max-w-md"
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Nama Pelanggan
                </label>

                <input
                  type="text"
                  value={electricityDraftName}
                  onChange={(e) => setElectricityDraftName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  No. IDPEL
                </label>

                <input
                  type="text"
                  value={electricityDraftId}
                  onChange={(e) => setElectricityDraftId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
                Pengingat pembayaran setiap tanggal 5.
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => copyElectricityId(electricityDraftId)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Copy size={14} />
                  Salin IDPEL
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeElectricityModal}
                    disabled={Boolean(electricitySavingId)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Tutup
                  </button>

                  <button
                    type="button"
                    onClick={saveElectricity}
                    disabled={Boolean(electricitySavingId)}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {electricitySavingId ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
