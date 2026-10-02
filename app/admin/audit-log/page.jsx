"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Globe,
  RefreshCw,
  Search,
  Smartphone,
  UserRound,
  X,
} from "lucide-react";

const PAGE_SIZE = 15;

const STATUS_OPTIONS = [
  {
    value: "",
    label: "Semua Status",
  },
  {
    value: "BERHASIL",
    label: "Berhasil",
  },
  {
    value: "GAGAL",
    label: "Gagal",
  },
];

export default function AuditLogPage() {
  const { activeUnit } = useUnit();

  const [logs, setLogs] = useState([]);
  const [unitData, setUnitData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [modulFilter, setModulFilter] = useState("");
  const [aksiFilter, setAksiFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [viewingLog, setViewingLog] = useState(null);

  async function loadData(showRefresh = false) {
    if (!activeUnit?.value) {
      setLogs([]);
      setUnitData(null);
      setLoading(false);
      return;
    }

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      /*
       * =====================================================
       * 1. CARI UNIT AKTIF
       *
       * Database kamu:
       * JKK1
       * JKK2
       *
       * Kita juga cek kode_legacy sebagai fallback.
       * =====================================================
       */

      const activeValue = String(activeUnit.value).trim();

      let currentUnit = null;

      const unitByCode = await supabase
        .from("unit")
        .select(
          "id, nama_unit, kode_unit, kode_legacy, kode_kawasan, cabang_id",
        )
        .eq("kode_unit", activeValue)
        .maybeSingle();

      if (unitByCode.error) {
        throw unitByCode.error;
      }

      currentUnit = unitByCode.data;

      /*
       * Jika tidak ditemukan berdasarkan kode_unit,
       * coba kode_legacy.
       */

      if (!currentUnit) {
        const unitByLegacy = await supabase
          .from("unit")
          .select(
            "id, nama_unit, kode_unit, kode_legacy, kode_kawasan, cabang_id",
          )
          .eq("kode_legacy", activeValue)
          .maybeSingle();

        if (unitByLegacy.error) {
          throw unitByLegacy.error;
        }

        currentUnit = unitByLegacy.data;
      }

      if (!currentUnit) {
        setUnitData(null);
        setLogs([]);

        setError(`Unit aktif "${activeValue}" tidak ditemukan di database.`);

        return;
      }

      setUnitData(currentUnit);

      /*
       * =====================================================
       * 2. AMBIL AUDIT LOG
       *
       * Hanya berdasarkan unit_id.
       * =====================================================
       */

      const { data: auditData, error: auditError } = await supabase
        .from("audit_log")
        .select(
          `
          id,
          pengguna_id,
          perangkat_id,
          unit_id,
          aksi,
          modul,
          objek_tipe,
          objek_id,
          deskripsi,
          data_sebelum,
          data_sesudah,
          ip_address,
          user_agent,
          status,
          created_at
        `,
        )
        .eq("unit_id", currentUnit.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(500);

      if (auditError) {
        throw auditError;
      }

      const rawLogs = auditData || [];

      /*
       * =====================================================
       * 3. AMBIL PENGGUNA
       * =====================================================
       */

      const penggunaIds = [
        ...new Set(rawLogs.map((log) => log.pengguna_id).filter(Boolean)),
      ];

      let penggunaData = [];

      if (penggunaIds.length > 0) {
        const { data, error: penggunaError } = await supabase
          .from("pengguna")
          .select(
            `
            id,
            username,
            role,
            aktif,
            pegawai_id
          `,
          )
          .in("id", penggunaIds);

        if (penggunaError) {
          console.warn(
            "Data pengguna Audit Log tidak dapat diambil:",
            penggunaError,
          );
        } else {
          penggunaData = data || [];
        }
      }

      /*
       * =====================================================
       * 4. AMBIL DATA PEGAWAI
       * =====================================================
       */

      const pegawaiIds = [
        ...new Set(penggunaData.map((user) => user.pegawai_id).filter(Boolean)),
      ];

      let pegawaiData = [];

      if (pegawaiIds.length > 0) {
        const { data, error: pegawaiError } = await supabase
          .from("pegawai")
          .select(
            `
            id,
            nama,
            nip,
            jabatan,
            jenis_pegawai
          `,
          )
          .in("id", pegawaiIds);

        if (pegawaiError) {
          console.warn(
            "Data pegawai Audit Log tidak dapat diambil:",
            pegawaiError,
          );
        } else {
          pegawaiData = data || [];
        }
      }

      /*
       * =====================================================
       * 5. AMBIL PERANGKAT
       * =====================================================
       */

      const perangkatIds = [
        ...new Set(rawLogs.map((log) => log.perangkat_id).filter(Boolean)),
      ];

      let perangkatData = [];

      if (perangkatIds.length > 0) {
        const { data, error: perangkatError } = await supabase
          .from("perangkat")
          .select(
            `
            id,
            pengguna_id,
            nama_perangkat,
            jenis_perangkat,
            platform,
            browser,
            aktif,
            last_ip
          `,
          )
          .in("id", perangkatIds);

        if (perangkatError) {
          console.warn(
            "Data perangkat Audit Log tidak dapat diambil:",
            perangkatError,
          );
        } else {
          perangkatData = data || [];
        }
      }

      /*
       * =====================================================
       * 6. GABUNGKAN DATA
       * =====================================================
       */

      const mergedLogs = rawLogs.map((log) => {
        const pengguna =
          penggunaData.find((user) => user.id === log.pengguna_id) || null;

        const pegawai = pengguna?.pegawai_id
          ? pegawaiData.find((item) => item.id === pengguna.pegawai_id) || null
          : null;

        const perangkat =
          perangkatData.find((item) => item.id === log.perangkat_id) || null;

        return {
          ...log,

          pengguna: pengguna
            ? {
                ...pengguna,
                pegawai,
              }
            : null,

          perangkat,
        };
      });

      console.log("AUDIT LOG UNIT AKTIF:", currentUnit);

      console.log("AUDIT LOG DATA:", mergedLogs);

      setLogs(mergedLogs);
      setPage(1);
    } catch (err) {
      console.error("Gagal mengambil audit log:", err);

      setError(err?.message || "Gagal mengambil data Audit Log dari database.");

      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /*
   * =======================================================
   * LOAD SAAT UNIT BERUBAH
   * =======================================================
   */

  useEffect(() => {
    loadData();
  }, [activeUnit?.value]);

  /*
   * =======================================================
   * PILIHAN MODUL
   * =======================================================
   */

  const moduleOptions = useMemo(() => {
    const values = [...new Set(logs.map((log) => log.modul).filter(Boolean))];

    return values.sort((a, b) => String(a).localeCompare(String(b)));
  }, [logs]);

  /*
   * =======================================================
   * PILIHAN AKSI
   * =======================================================
   */

  const actionOptions = useMemo(() => {
    const values = [...new Set(logs.map((log) => log.aksi).filter(Boolean))];

    return values.sort((a, b) => String(a).localeCompare(String(b)));
  }, [logs]);

  /*
   * =======================================================
   * FILTER DATA
   * =======================================================
   */

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !keyword ||
        [
          log.aksi,
          log.modul,
          log.deskripsi,
          log.objek_tipe,
          log.status,
          log.ip_address,
          log.pengguna?.username,
          log.pengguna?.role,
          log.pengguna?.pegawai?.nama,
          log.pengguna?.pegawai?.nip,
          log.pengguna?.pegawai?.jabatan,
          log.perangkat?.nama_perangkat,
          log.perangkat?.platform,
          log.perangkat?.browser,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      const matchesModul = !modulFilter || log.modul === modulFilter;

      const matchesAksi = !aksiFilter || log.aksi === aksiFilter;

      const matchesStatus = !statusFilter || log.status === statusFilter;

      const createdAt = log.created_at ? new Date(log.created_at) : null;

      const matchesFrom =
        !dateFrom ||
        (createdAt && createdAt >= new Date(`${dateFrom}T00:00:00`));

      const matchesTo =
        !dateTo ||
        (createdAt && createdAt <= new Date(`${dateTo}T23:59:59.999`));

      return (
        matchesSearch &&
        matchesModul &&
        matchesAksi &&
        matchesStatus &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [logs, search, modulFilter, aksiFilter, statusFilter, dateFrom, dateTo]);

  /*
   * =======================================================
   * PAGINATION
   * =======================================================
   */

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, modulFilter, aksiFilter, statusFilter, dateFrom, dateTo]);

  /*
   * =======================================================
   * SUMMARY
   * =======================================================
   */

  const successfulCount = logs.filter(
    (log) => log.status === "BERHASIL",
  ).length;

  const failedCount = logs.filter((log) => log.status === "GAGAL").length;

  const uniqueUsers = new Set(
    logs.map((log) => log.pengguna_id).filter(Boolean),
  ).size;

  /*
   * =======================================================
   * RESET FILTER
   * =======================================================
   */

  function resetFilters() {
    setSearch("");
    setModulFilter("");
    setAksiFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  /*
   * =======================================================
   * RENDER
   * =======================================================
   */

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Audit Log
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Riwayat aktivitas pengguna dalam sistem JOSJIS.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs">
            <span className="text-zinc-400">Unit aktif</span>

            <div className="mt-0.5 font-semibold text-zinc-800">
              {unitData?.nama_unit ||
                activeUnit?.label ||
                activeUnit?.value ||
                "-"}
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari pengguna, aktivitas, modul, IP..."
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* FILTER */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
              <Filter size={16} />
              Filter
            </div>

            {(search ||
              modulFilter ||
              aksiFilter ||
              statusFilter ||
              dateFrom ||
              dateTo) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* MODUL */}
            <select
              value={modulFilter}
              onChange={(event) => setModulFilter(event.target.value)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400"
            >
              <option value="">Semua Modul</option>

              {moduleOptions.map((modul) => (
                <option key={modul} value={modul}>
                  {modul}
                </option>
              ))}
            </select>

            {/* AKSI */}
            <select
              value={aksiFilter}
              onChange={(event) => setAksiFilter(event.target.value)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400"
            >
              <option value="">Semua Aktivitas</option>

              {actionOptions.map((aksi) => (
                <option key={aksi} value={aksi}>
                  {aksi}
                </option>
              ))}
            </select>

            {/* STATUS */}
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* DARI */}
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400"
              title="Dari tanggal"
            />

            {/* SAMPAI */}
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400"
              title="Sampai tanggal"
            />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SUMMARY */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            icon={<Activity size={17} />}
            label="Aktivitas"
            value={logs.length}
          />

          <SummaryCard
            icon={<UserRound size={17} />}
            label="Pengguna"
            value={uniqueUsers}
          />

          <SummaryCard
            icon={<Clock3 size={17} />}
            label="Berhasil"
            value={successfulCount}
          />

          <SummaryCard
            icon={<Activity size={17} />}
            label="Gagal"
            value={failedCount}
          />
        </div>

        {/* CONTENT */}
        {loading ? (
          <LoadingLogs />
        ) : paginatedLogs.length === 0 ? (
          <EmptyState
            hasFilter={
              Boolean(search) ||
              Boolean(modulFilter) ||
              Boolean(aksiFilter) ||
              Boolean(statusFilter) ||
              Boolean(dateFrom) ||
              Boolean(dateTo)
            }
          />
        ) : (
          <>
            <div className="space-y-3">
              {paginatedLogs.map((log) => (
                <AuditLogCard
                  key={log.id}
                  log={log}
                  onView={() => setViewingLog(log)}
                />
              ))}
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-zinc-500">
                Menampilkan{" "}
                <span className="font-medium text-zinc-700">
                  {filteredLogs.length === 0
                    ? 0
                    : (currentPage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                -{" "}
                <span className="font-medium text-zinc-700">
                  {Math.min(currentPage * PAGE_SIZE, filteredLogs.length)}
                </span>{" "}
                dari{" "}
                <span className="font-medium text-zinc-700">
                  {filteredLogs.length}
                </span>{" "}
                aktivitas
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                </button>

                <span className="min-w-20 text-center text-xs font-medium text-zinc-600">
                  Halaman {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* DETAIL MODAL */}
        {viewingLog && (
          <AuditLogDetail
            log={viewingLog}
            onClose={() => setViewingLog(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

/* =========================================================
   AUDIT LOG CARD
========================================================= */

function AuditLogCard({ log, onView }) {
  const name =
    log.pengguna?.pegawai?.nama ||
    log.pengguna?.username ||
    "Pengguna tidak diketahui";

  const role = log.pengguna?.role || "-";

  return (
    <button
      type="button"
      onClick={onView}
      className="group w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:shadow-sm"
    >
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <Activity size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-zinc-900">{name}</span>

                <RoleBadge role={role} />

                <StatusBadge status={log.status} />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                <span>{formatDateTime(log.created_at)}</span>

                <span>•</span>

                <span>{log.modul || "-"}</span>
              </div>
            </div>

            <span className="shrink-0 text-xs font-medium text-zinc-400 transition group-hover:text-zinc-700">
              Detail
            </span>
          </div>

          <div className="mt-3">
            <div className="text-sm font-semibold text-zinc-800">
              {log.aksi || "Aktivitas"}
            </div>

            {log.deskripsi && (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500">
                {log.deskripsi}
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {log.objek_tipe && <MetaBadge>{log.objek_tipe}</MetaBadge>}

            {log.perangkat?.nama_perangkat && (
              <MetaBadge icon={<Smartphone size={12} />}>
                {log.perangkat.nama_perangkat}
              </MetaBadge>
            )}

            {log.ip_address && (
              <MetaBadge icon={<Globe size={12} />}>
                {String(log.ip_address)}
              </MetaBadge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   DETAIL MODAL
========================================================= */

function AuditLogDetail({ log, onClose }) {
  const name =
    log.pengguna?.pegawai?.nama ||
    log.pengguna?.username ||
    "Pengguna tidak diketahui";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px]">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-zinc-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                <Activity size={17} />
              </div>

              <div>
                <h2 className="font-semibold text-zinc-900">
                  Detail Aktivitas
                </h2>

                <p className="text-xs text-zinc-400">
                  {formatDateTime(log.created_at)}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="max-h-[calc(92vh-73px)] overflow-y-auto p-4 sm:p-5">
          <div className="space-y-5">
            {/* AKSI */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-900">
                  {log.aksi || "Aktivitas"}
                </h3>

                <StatusBadge status={log.status} />
              </div>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {log.deskripsi || "Tidak ada deskripsi aktivitas."}
              </p>
            </div>

            {/* PENGGUNA */}
            <section>
              <SectionTitle>Pengguna</SectionTitle>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Nama" value={name} />

                <DetailItem
                  label="Username"
                  value={log.pengguna?.username || "-"}
                />

                <DetailItem label="Role" value={log.pengguna?.role || "-"} />

                <DetailItem
                  label="NIP"
                  value={log.pengguna?.pegawai?.nip || "-"}
                />

                <DetailItem
                  label="Jabatan"
                  value={log.pengguna?.pegawai?.jabatan || "-"}
                />
              </div>
            </section>

            {/* AKTIVITAS */}
            <section>
              <SectionTitle>Aktivitas</SectionTitle>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Modul" value={log.modul || "-"} />

                <DetailItem label="Aksi" value={log.aksi || "-"} />

                <DetailItem label="Objek" value={log.objek_tipe || "-"} />

                <DetailItem label="ID Objek" value={log.objek_id || "-"} />
              </div>
            </section>

            {/* PERANGKAT */}
            <section>
              <SectionTitle>Perangkat & Koneksi</SectionTitle>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Perangkat"
                  value={log.perangkat?.nama_perangkat || "-"}
                />

                <DetailItem
                  label="Jenis"
                  value={log.perangkat?.jenis_perangkat || "-"}
                />

                <DetailItem
                  label="Platform"
                  value={log.perangkat?.platform || "-"}
                />

                <DetailItem
                  label="Browser"
                  value={log.perangkat?.browser || "-"}
                />

                <DetailItem
                  label="IP Address"
                  value={log.ip_address ? String(log.ip_address) : "-"}
                />

                <DetailItem
                  label="Waktu"
                  value={formatDateTime(log.created_at)}
                />
              </div>
            </section>

            {/* PERUBAHAN DATA */}
            {(log.data_sebelum || log.data_sesudah) && (
              <section>
                <SectionTitle>Perubahan Data</SectionTitle>

                <div className="space-y-3">
                  {log.data_sebelum && (
                    <JsonBox label="Data Sebelum" data={log.data_sebelum} />
                  )}

                  {log.data_sesudah && (
                    <JsonBox label="Data Sesudah" data={log.data_sesudah} />
                  )}
                </div>
              </section>
            )}

            {/* USER AGENT */}
            {log.user_agent && (
              <section>
                <SectionTitle>User Agent</SectionTitle>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 break-all text-zinc-500">
                  {log.user_agent}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-zinc-400">
        {icon}

        <span className="text-xs">{label}</span>
      </div>

      <div className="mt-2 text-xl font-bold text-zinc-900">{value}</div>
    </div>
  );
}

/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-medium text-zinc-800">
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({ children }) {
  return (
    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </div>
  );
}

/* =========================================================
   META BADGE
========================================================= */

function MetaBadge({ children, icon }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500">
      {icon}

      <span className="truncate">{children}</span>
    </span>
  );
}

/* =========================================================
   ROLE BADGE
========================================================= */

function RoleBadge({ role }) {
  return (
    <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-600">
      {role || "-"}
    </span>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  const success = status === "BERHASIL";

  return (
    <span
      className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
        success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {success ? "Berhasil" : status || "Gagal"}
    </span>
  );
}

/* =========================================================
   JSON BOX
========================================================= */

function JsonBox({ label, data }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-zinc-500">{label}</div>

      <pre className="max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-zinc-950 p-3 text-xs leading-5 text-zinc-200">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingLogs() {
  return (
    <div className="space-y-3">
      {Array.from({
        length: 5,
      }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100"
        />
      ))}
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({ hasFilter }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-12 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
        <Activity size={20} />
      </div>

      <h3 className="mt-3 text-sm font-semibold text-zinc-800">
        {hasFilter ? "Data tidak ditemukan" : "Belum ada aktivitas"}
      </h3>

      <p className="mt-1 text-xs text-zinc-500">
        {hasFilter
          ? "Coba ubah kata pencarian atau filter."
          : "Audit Log untuk unit ini belum memiliki data."}
      </p>
    </div>
  );
}

/* =========================================================
   DATE FORMAT
========================================================= */

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}
