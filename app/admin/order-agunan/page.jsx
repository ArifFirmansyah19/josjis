"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  MessageSquareText,
  PackageCheck,
  Clock3,
  FileImage,
  CalendarDays,
  Filter,
  LoaderCircle,
  AlertCircle,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";
import { useUnit } from "@/components/UnitContext";

const STATUS = {
  MENUNGGU_PEMERIKSAAN: {
    label: "Menunggu pemeriksaan",
    color: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  DITERIMA: {
    label: "Diterima",
    color: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
  PERLU_REVISI: {
    label: "Perlu revisi",
    color: "bg-orange-100 text-orange-800 ring-orange-200",
  },
  DITOLAK: {
    label: "Ditolak",
    color: "bg-rose-100 text-rose-800 ring-rose-200",
  },
  DIPROSES: {
    label: "Sedang diproses",
    color: "bg-blue-100 text-blue-800 ring-blue-200",
  },
  SELESAI: {
    label: "Selesai",
    color: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

const BUNDLE_STATUS = {
  TERBUKA: "Terbuka",
  DITUTUP: "Ditutup",
  DIPROSES: "Diproses",
  SELESAI: "Selesai",
};

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function StatusBadge({ status }) {
  const item = STATUS[status] || {
    label: status || "Belum diketahui",
    color: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        item.color,
      )}
    >
      {item.label}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={cn("rounded-xl p-3", color)}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="break-words text-sm font-medium text-slate-800">
        {children || "-"}
      </div>
    </div>
  );
}

export default function AdminRequestOrderAgunanPage() {
  const { activeUnit } = useUnit();

  const [items, setItems] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("SEMUA");
  const [bundleFilter, setBundleFilter] = useState("SEMUA");
  const [expanded, setExpanded] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [decision, setDecision] = useState("DITERIMA");
  const [adminNote, setAdminNote] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const unitCode = activeUnit?.value || "";
  const unitName = activeUnit?.name || "Unit belum dipilih";

  const loadData = useCallback(async () => {
    if (!unitCode) {
      setItems([]);
      setBundles([]);
      setLoading(false);
      setError("Pilih unit kerja pada topbar terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/request-order-agunan?unit=${encodeURIComponent(unitCode)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memuat Request Order Agunan.");
      }

      setItems(Array.isArray(result.items) ? result.items : []);
      setBundles(Array.isArray(result.bundles) ? result.bundles : []);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  }, [unitCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !keyword ||
        [
          item.nama_debitur,
          item.nomor_rekening_pinjaman,
          item.pemohon_nama,
          item.nomor_notasi,
          item.agunan,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
        );

      const matchesStatus =
        statusFilter === "SEMUA" || item.status === statusFilter;

      const matchesBundle =
        bundleFilter === "SEMUA" || item.bundel_id === bundleFilter;

      return matchesSearch && matchesStatus && matchesBundle;
    });
  }, [items, search, statusFilter, bundleFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      waiting: items.filter((item) => item.status === "MENUNGGU_PEMERIKSAAN")
        .length,
      revision: items.filter((item) => item.status === "PERLU_REVISI").length,
      processing: items.filter((item) => item.status === "DIPROSES").length,
      done: items.filter((item) => item.status === "SELESAI").length,
    };
  }, [items]);

  const groupedItems = useMemo(() => {
    const groups = new Map();

    for (const item of filteredItems) {
      const key = item.bundel_id || "tanpa-bundel";

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(item);
    }

    return [...groups.entries()].map(([id, rows]) => ({
      id,
      rows,
      bundle: bundles.find((bundle) => bundle.id === id) || null,
    }));
  }, [filteredItems, bundles]);

  async function performAction(payload, successMessage) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/request-order-agunan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          unit: unitCode,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Tindakan gagal dilakukan.");
      }

      setNotice(result.message || successMessage);
      setSelectedItem(null);
      setAdminNote("");
      await loadData();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDecision(event) {
    event.preventDefault();

    if (!selectedItem) return;

    if (["PERLU_REVISI", "DITOLAK"].includes(decision) && !adminNote.trim()) {
      setError("Isi pesan untuk permintaan revisi atau penolakan.");
      return;
    }

    await performAction(
      {
        action: "review",
        id: selectedItem.id,
        keputusan: decision,
        pesan: adminNote.trim(),
      },
      "Keputusan berhasil disimpan.",
    );
  }

  function toggleExpanded(bundleId) {
    setExpanded((previous) => ({
      ...previous,
      [bundleId]: !(previous[bundleId] ?? true),
    }));
  }

  async function processBundle(bundleId) {
    const confirmed = window.confirm(
      "Proses semua pengajuan berstatus Diterima dalam bundel ini?",
    );

    if (!confirmed) return;

    await performAction(
      {
        action: "process_bundle",
        bundel_id: bundleId,
        id: items.find((item) => item.bundel_id === bundleId)?.id,
      },
      "Bundel mulai diproses.",
    );
  }

  async function finishBundle(bundleId) {
    const confirmed = window.confirm(
      "Selesaikan semua pengajuan yang sedang diproses dalam bundel ini?",
    );

    if (!confirmed) return;

    await performAction(
      {
        action: "finish",
        bundel_id: bundleId,
        id: items.find((item) => item.bundel_id === bundleId)?.id,
      },
      "Bundel berhasil diselesaikan.",
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-700 to-sky-600 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <ClipboardList size={15} />
                MODUL OPERASIONAL
              </div>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Request Order Agunan
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                Pemeriksaan pengajuan MKS, verifikasi bukti BDS, pengelolaan
                bundel, dan pemantauan proses agunan.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-lg bg-white/15 px-3 py-2">
                  Unit aktif: <strong>{unitName}</strong>
                </span>
                <span className="rounded-lg bg-white/15 px-3 py-2">
                  <CalendarDays className="mr-1 inline" size={15} />
                  Jadwal Selasa / Jumat
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading || busy}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-blue-50 disabled:opacity-60"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Muat ulang
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 shrink-0" size={19} />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError("")}
              className="font-bold"
              aria-label="Tutup pesan"
            >
              ×
            </button>
          </div>
        )}

        {notice && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
            <div className="flex-1">{notice}</div>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="font-bold"
              aria-label="Tutup pesan"
            >
              ×
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total pengajuan"
            value={stats.total}
            icon={ClipboardList}
            color="bg-indigo-50 text-indigo-700"
          />
          <StatCard
            title="Menunggu pemeriksaan"
            value={stats.waiting}
            icon={Clock3}
            color="bg-amber-50 text-amber-700"
          />
          <StatCard
            title="Perlu revisi"
            value={stats.revision}
            icon={MessageSquareText}
            color="bg-orange-50 text-orange-700"
          />
          <StatCard
            title="Sedang diproses"
            value={stats.processing}
            icon={PackageCheck}
            color="bg-blue-50 text-blue-700"
          />
          <StatCard
            title="Selesai"
            value={stats.done}
            icon={CheckCircle2}
            color="bg-emerald-50 text-emerald-700"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-indigo-600" />
            <h2 className="font-bold text-slate-900">
              Cari dan filter pengajuan
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nama, rekening, MKS, agunan..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400"
            >
              <option value="SEMUA">Semua status</option>
              {Object.entries(STATUS).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>

            <select
              value={bundleFilter}
              onChange={(event) => setBundleFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400"
            >
              <option value="SEMUA">Semua bundel</option>
              {bundles.map((bundle) => (
                <option key={bundle.id} value={bundle.id}>
                  {formatDate(bundle.tanggal_proses)} —{" "}
                  {BUNDLE_STATUS[bundle.status] || bundle.status}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Menampilkan {filteredItems.length} dari {items.length} pengajuan
            pada unit aktif.
          </p>
        </section>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
            <LoaderCircle size={32} className="animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">
              Memuat data Request Order Agunan...
            </p>
          </div>
        ) : groupedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ClipboardList size={27} />
            </div>
            <h2 className="font-bold text-slate-900">Belum ada pengajuan</h2>
            <p className="mt-2 text-sm text-slate-500">
              Tidak ada pengajuan yang cocok dengan pencarian atau filter.
            </p>
          </div>
        ) : (
          <section className="space-y-5">
            {groupedItems.map(({ id, rows, bundle }) => {
              const isExpanded = expanded[id] ?? true;
              const waitingCount = rows.filter(
                (row) => row.status === "MENUNGGU_PEMERIKSAAN",
              ).length;
              const acceptedCount = rows.filter(
                (row) => row.status === "DITERIMA",
              ).length;
              const processingCount = rows.filter(
                (row) => row.status === "DIPROSES",
              ).length;

              return (
                <div
                  key={id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/50 p-4 sm:p-5">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(id)}
                        className="flex min-w-0 items-start gap-3 text-left"
                      >
                        <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                          <CalendarDays size={21} />
                        </div>

                        <div className="min-w-0">
                          <h2 className="font-bold text-slate-900">
                            Bundel{" "}
                            {bundle
                              ? formatDate(bundle.tanggal_proses)
                              : "belum teridentifikasi"}
                          </h2>
                          <p className="mt-1 text-xs text-slate-500">
                            {rows.length} pengajuan pada hasil filter
                            {bundle
                              ? ` • Status bundel: ${BUNDLE_STATUS[bundle.status] || bundle.status}`
                              : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
                              {waitingCount} menunggu
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
                              {acceptedCount} diterima
                            </span>
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-800">
                              {processingCount} diproses
                            </span>
                          </div>
                        </div>

                        <span className="ml-auto text-slate-400 lg:hidden">
                          {isExpanded ? (
                            <ChevronUp size={20} />
                          ) : (
                            <ChevronDown size={20} />
                          )}
                        </span>
                      </button>

                      {bundle && (
                        <div className="flex flex-wrap gap-2">
                          {["TERBUKA", "DITUTUP"].includes(bundle.status) && (
                            <button
                              type="button"
                              onClick={() => processBundle(bundle.id)}
                              disabled={busy || acceptedCount === 0}
                              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PackageCheck size={16} />
                              Proses pengajuan diterima
                            </button>
                          )}

                          {bundle.status === "DIPROSES" && (
                            <button
                              type="button"
                              onClick={() => finishBundle(bundle.id)}
                              disabled={busy || processingCount === 0}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <CheckCircle2 size={16} />
                              Selesaikan bundel
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleExpanded(id)}
                            className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 lg:inline-flex"
                          >
                            {isExpanded ? (
                              <>
                                Sembunyikan <ChevronUp size={15} />
                              </>
                            ) : (
                              <>
                                Lihat pengajuan <ChevronDown size={15} />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-slate-100">
                      {rows.map((item) => (
                        <article key={item.id} className="p-4 sm:p-5">
                          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900">
                                  {item.nama_debitur}
                                </h3>
                                <StatusBadge status={item.status} />
                                <span
                                  className={cn(
                                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                                    item.alasan === "LUNAS"
                                      ? "bg-violet-100 text-violet-800"
                                      : "bg-cyan-100 text-cyan-800",
                                  )}
                                >
                                  {item.alasan === "LUNAS"
                                    ? "Pelunasan"
                                    : "Top Up"}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-slate-500">
                                Rekening:{" "}
                                <span className="font-semibold text-slate-700">
                                  {item.nomor_rekening_pinjaman}
                                </span>
                              </p>

                              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                <Field label="Pemohon MKS">
                                  {item.pemohon_nama}
                                </Field>

                                <Field label="Nomor notasi">
                                  {item.nomor_notasi || "Tidak diisi"}
                                </Field>

                                <Field label="Waktu pengajuan">
                                  {formatDateTime(item.created_at)}
                                </Field>

                                <div className="sm:col-span-2 xl:col-span-3">
                                  <Field label="Data agunan">
                                    {item.agunan ? (
                                      <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-sm leading-6 text-slate-700">
                                        {item.agunan}
                                      </pre>
                                    ) : (
                                      <span className="font-normal text-slate-400">
                                        Belum ada keterangan agunan
                                      </span>
                                    )}
                                  </Field>
                                </div>

                                {item.catatan_admin_terakhir && (
                                  <div className="sm:col-span-2 xl:col-span-3">
                                    <Field label="Catatan Admin terakhir">
                                      <div className="mt-1 rounded-xl border border-orange-200 bg-orange-50 p-3 font-normal leading-6 text-orange-900">
                                        {item.catatan_admin_terakhir}
                                      </div>
                                    </Field>
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {item.bukti_bds_url ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewUrl(item.bukti_bds_url)
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                  >
                                    <FileImage size={16} />
                                    Lihat bukti BDS
                                    <Eye size={14} />
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
                                    <FileImage size={16} />
                                    Bukti BDS tidak tersedia
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setDecision("DITERIMA");
                                    setAdminNote("");
                                    setError("");
                                  }}
                                  disabled={
                                    busy ||
                                    item.status !== "MENUNGGU_PEMERIKSAAN"
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Eye size={15} />
                                  Periksa pengajuan
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setDecision("PERLU_REVISI");
                                    setAdminNote("");
                                    setError("");
                                  }}
                                  disabled={
                                    busy ||
                                    item.status !== "MENUNGGU_PEMERIKSAAN"
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <MessageSquareText size={15} />
                                  Minta revisi
                                </button>
                              </div>

                              {item.pesan?.length > 0 && (
                                <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
                                  <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-slate-700">
                                    Riwayat pesan ({item.pesan.length})
                                  </summary>
                                  <div className="space-y-3 border-t border-slate-200 p-3">
                                    {item.pesan.map((message) => (
                                      <div
                                        key={message.id}
                                        className="rounded-lg bg-white p-3"
                                      >
                                        <div className="flex flex-wrap justify-between gap-2">
                                          <p className="text-xs font-bold text-slate-800">
                                            {message.pengirim_nama}{" "}
                                            <span className="font-normal text-slate-500">
                                              ({message.pengirim_role})
                                            </span>
                                          </p>
                                          <p className="text-xs text-slate-400">
                                            {formatDateTime(message.created_at)}
                                          </p>
                                        </div>
                                        <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-700">
                                          {message.pesan}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Pemeriksaan Admin
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedItem.nama_debitur}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Rekening {selectedItem.nomor_rekening_pinjaman}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Tutup"
              >
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={submitDecision} className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                <Field label="Pemohon">{selectedItem.pemohon_nama}</Field>
                <Field label="Jenis pengajuan">
                  {selectedItem.alasan === "LUNAS" ? "Pelunasan" : "Top Up"}
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Agunan">
                    {selectedItem.agunan || "Tidak ada keterangan agunan"}
                  </Field>
                </div>
              </div>

              {selectedItem.bukti_bds_url && (
                <button
                  type="button"
                  onClick={() => setPreviewUrl(selectedItem.bukti_bds_url)}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <FileImage size={18} />
                  Buka bukti BDS
                </button>
              )}

              <div>
                <label
                  htmlFor="keputusan-admin"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Keputusan
                </label>
                <select
                  id="keputusan-admin"
                  value={decision}
                  onChange={(event) => setDecision(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="DITERIMA">Terima pengajuan</option>
                  <option value="PERLU_REVISI">Minta revisi ke MKS</option>
                  <option value="DITOLAK">Tolak pengajuan</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="catatan-admin"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Pesan / catatan Admin
                  {["PERLU_REVISI", "DITOLAK"].includes(decision) && (
                    <span className="ml-1 text-rose-600">*</span>
                  )}
                </label>
                <textarea
                  id="catatan-admin"
                  rows={4}
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  maxLength={1000}
                  placeholder={
                    decision === "PERLU_REVISI"
                      ? "Jelaskan bagian yang harus diperbaiki MKS..."
                      : decision === "DITOLAK"
                        ? "Jelaskan alasan penolakan..."
                        : "Catatan tambahan (opsional)..."
                  }
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {adminNote.length}/1000 karakter
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  disabled={busy}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60",
                    decision === "DITERIMA"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : decision === "DITOLAK"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-orange-600 hover:bg-orange-700",
                  )}
                >
                  {busy ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : decision === "DITERIMA" ? (
                    <CheckCircle2 size={17} />
                  ) : decision === "DITOLAK" ? (
                    <XCircle size={17} />
                  ) : (
                    <Send size={17} />
                  )}
                  Simpan keputusan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setPreviewUrl("")}
          role="presentation"
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau bukti BDS"
          >
            <div className="flex items-center justify-between gap-3 px-2 pb-3">
              <p className="font-semibold text-slate-800">
                Pratinjau bukti BDS
              </p>
              <button
                type="button"
                onClick={() => setPreviewUrl("")}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl bg-slate-100">
              <img
                src={previewUrl}
                alt="Bukti capture BDS"
                className="max-h-[75vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
