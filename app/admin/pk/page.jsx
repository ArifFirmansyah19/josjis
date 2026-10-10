"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import PkDetailModal from "./components/PkDetailModal";
import { supabase } from "@/lib/supabase";

import { PK_ROLES } from "./constants/pkConstants";

import {
  getUnitUuid,
  formatMksName,
  getDateYear,
  getDateMonth,
  getLimitBucket,
  getRole,
  normalizeText,
} from "./helpers/pkFormatters";

import { buildPkUpdatePayload } from "./helpers/pkNormalizer";

import {
  fetchNotaries,
  fetchPkData,
  updatePkData,
} from "./services/pkSupabase";

import PkFilter from "./components/PkFilter";
import PkDesktopTable from "./components/PkDesktopTable";
import PkMobileTable from "./components/PkMobileTable";

const DEFAULT_PAGE_SIZE = 25;

const EMPTY_PAGINATION = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 0,
  from: 0,
  to: 0,
};

function canViewPk() {
  const role = getRole();
  return !role || PK_ROLES.includes(role);
}

function normalizeInsurance(insurance) {
  const source = insurance || {};

  return {
    ...source,

    sijitu: {
      ...(source.sijitu || {}),
      orderStatus: source.sijitu?.orderStatus || "BELUM_DIORDER",
      postingStatus: source.sijitu?.postingStatus || "BELUM_POSTING",
    },

    magi: {
      ...(source.magi || {}),
      advisStatus: source.magi?.advisStatus || "BELUM_ADVIS",
      postingStatus: source.magi?.postingStatus || "BELUM_POSTING",
      premium: source.magi?.premium ?? "",
    },

    life: {
      ...(source.life || {}),
      type: source.life?.type || "",
      orderStatus: source.life?.orderStatus || "BELUM_DIORDER",
      postingStatus: source.life?.postingStatus || "BELUM_POSTING",
      premium: source.life?.premium ?? "",
    },

    guarantee: {
      ...(source.guarantee || {}),
    },

    axa: {
      ...(source.axa || {}),
      enabled: Boolean(source.axa?.enabled),
    },

    rows: Array.isArray(source.rows) ? source.rows : [],
  };
}

export default function PkPage() {
  const { activeUnit } = useUnit();
  const activeUnitUuid = getUnitUuid(activeUnit);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [pkRows, setPkRows] = useState([]);
  const [notaries, setNotaries] = useState([]);

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("SEMUA");
  const [mksFilter, setMksFilter] = useState("SEMUA");
  const [limitFilter, setLimitFilter] = useState("SEMUA");
  const [monthFilter, setMonthFilter] = useState("SEMUA");
  const [yearFilter, setYearFilter] = useState("SEMUA");

  const [pagination, setPagination] = useState(EMPTY_PAGINATION);

  const [selectedPk, setSelectedPk] = useState(null);
  const [modalMode, setModalMode] = useState("view");

  // Parameter filter yang dikirim ke database.
  const filters = useMemo(
    () => ({
      search: search.trim(),
      productFilter,
      mksFilter,
      limitFilter,
      monthFilter,
      yearFilter,
    }),
    [search, productFilter, mksFilter, limitFilter, monthFilter, yearFilter],
  );

  const loadPkData = useCallback(
    async (requestedPage = 1, overrides = {}) => {
      if (!activeUnitUuid) {
        setPkRows([]);
        setPagination(EMPTY_PAGINATION);
        setErrorMessage(
          `Unit ${activeUnit?.value || "-"} belum memiliki UUID database.`,
        );
        return [];
      }

      if (!canViewPk()) {
        setPkRows([]);
        setPagination(EMPTY_PAGINATION);
        return [];
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const currentFilters = {
          ...filters,
          ...overrides,
        };

        const [pkResult, notaryRows] = await Promise.all([
          fetchPkData({
            supabase,
            activeUnitUuid,
            page: requestedPage,
            pageSize: pagination.pageSize,
            filters: currentFilters,
          }),
          fetchNotaries({ supabase }),
        ]);

        // Format hasil service: { rows, pagination }.
        const nextRows = Array.isArray(pkResult?.rows) ? pkResult.rows : [];

        setPkRows(nextRows);

        if (pkResult?.pagination) {
          setPagination(pkResult.pagination);
        }

        setNotaries(Array.isArray(notaryRows) ? notaryRows : []);

        return nextRows;
      } catch (error) {
        console.error("Load PK error:", error);

        setErrorMessage(error?.message || "Data PK gagal dimuat.");
        setPkRows([]);
        setPagination(EMPTY_PAGINATION);

        return [];
      } finally {
        setLoading(false);
      }
    },
    [activeUnitUuid, activeUnit?.value, filters, pagination.pageSize],
  );

  // Ganti unit: mulai lagi dari halaman pertama.
  useEffect(() => {
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }, [activeUnitUuid]);

  // Filter berubah: mulai lagi dari halaman pertama.
  useEffect(() => {
    setPagination((current) => {
      if (current.page === 1) return current;
      return { ...current, page: 1 };
    });
  }, [filters]);

  // Muat ulang ketika unit, filter, atau halaman berubah.
  useEffect(() => {
    loadPkData(pagination.page);
  }, [loadPkData, pagination.page]);

  const yearOptions = useMemo(() => {
    const years = new Set();

    pkRows.forEach((pk) => {
      const year = getDateYear(pk?.tanggalPk);
      if (year) years.add(String(year));
    });

    const sortedYears = Array.from(years).sort((a, b) => Number(b) - Number(a));

    return [
      { value: "SEMUA", label: "Semua Tahun" },
      ...sortedYears.map((year) => ({
        value: year,
        label: year,
      })),
    ];
  }, [pkRows]);

  const mksOptions = useMemo(() => {
    const map = new Map();

    pkRows.forEach((pk) => {
      const id = pk?.mksId || "TANPA_MKS";

      if (!map.has(String(id))) {
        map.set(String(id), {
          value: String(id),
          label: formatMksName(pk?.mksName),
        });
      }
    });

    return [
      { value: "SEMUA", label: "Semua MKS" },
      ...Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label, "id"),
      ),
    ];
  }, [pkRows]);

  /*
   * Data sudah difilter oleh service/database.
   * Jangan memfilter ulang dengan pkRows.filter() di sini,
   * karena pkRows hanya berisi halaman aktif.
   */
  const visiblePk = useMemo(() => {
    if (mksFilter === "SEMUA") return pkRows;

    // Fallback sementara untuk filter MKS.
    // Agar filter MKS mencakup seluruh database, tambahkan
    // penerapan mksFilter pada query pk di loanService.js.
    return pkRows.filter((pk) => {
      const id = String(pk?.mksId || "TANPA_MKS");
      return id === String(mksFilter);
    });
  }, [pkRows, mksFilter]);

  function openDetail(pk) {
    setSuccessMessage("");
    setErrorMessage("");
    setModalMode("view");
    setSelectedPk(pk);
  }

  function openEdit(pk) {
    setSuccessMessage("");
    setErrorMessage("");
    setModalMode("edit");
    setSelectedPk(pk);
  }

  function closeModal() {
    if (saving) return;

    setSelectedPk(null);
    setModalMode("view");
  }

  function handleAdd() {
    setErrorMessage("");
    setSuccessMessage("");
    setSelectedPk(null);

    // Modal tambah baru belum dibuka oleh implementasi ini.
    setErrorMessage("Fitur tambah PK belum dihubungkan ke formulir data baru.");
  }

  async function handleSave(updatedPk) {
    if (!updatedPk?.id) {
      throw new Error("ID PK tidak ditemukan.");
    }

    if (saving) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const basePayload = buildPkUpdatePayload(updatedPk);

      if (!basePayload) {
        throw new Error("Data PK tidak dapat diproses.");
      }

      const payload = {
        ...basePayload,

        relatedParties: Array.isArray(updatedPk.relatedParties)
          ? updatedPk.relatedParties
          : [],

        collaterals: Array.isArray(updatedPk.collaterals)
          ? updatedPk.collaterals
          : [],

        insurance: normalizeInsurance(updatedPk.insurance),
      };

      const savedRow = await updatePkData({
        supabase,
        pkId: updatedPk.id,
        payload,
      });

      if (!savedRow?.id) {
        throw new Error(
          "Data PK tidak berhasil dikembalikan setelah disimpan.",
        );
      }

      /*
       * Refresh halaman aktif. Jika data yang diedit tidak lagi
       * masuk filter atau halaman aktif, jangan menyatakan
       * penyimpanan gagal karena database sudah berhasil menyimpan.
       */
      const refreshedRows = await loadPkData(pagination.page);

      const refreshedPk = refreshedRows.find(
        (item) => String(item?.id) === String(savedRow.id),
      );

      if (refreshedPk) {
        setSelectedPk(refreshedPk);
        setPkRows((current) =>
          current.map((item) =>
            String(item?.id) === String(refreshedPk.id) ? refreshedPk : item,
          ),
        );
      } else {
        // Data mungkin tidak masuk halaman/filter aktif setelah disimpan.
        setSelectedPk((current) =>
          current
            ? {
                ...current,
                ...updatedPk,
                id: savedRow.id,
              }
            : current,
        );
      }

      setSuccessMessage("Data PK berhasil disimpan.");
      return refreshedPk || savedRow;
    } catch (error) {
      console.error("Save PK error:", error);

      setErrorMessage(error?.message || "Data PK gagal disimpan.");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setProductFilter("SEMUA");
    setMksFilter("SEMUA");
    setLimitFilter("SEMUA");
    setMonthFilter("SEMUA");
    setYearFilter("SEMUA");
  }

  function changePage(nextPage) {
    const maxPage = Math.max(1, pagination.totalPages);
    const safePage = Math.min(maxPage, Math.max(1, nextPage));

    if (safePage !== pagination.page) {
      setPagination((current) => ({
        ...current,
        page: safePage,
      }));
    }
  }

  function changePageSize(event) {
    const pageSize = Number(event.target.value);

    setPagination((current) => ({
      ...current,
      page: 1,
      pageSize,
    }));
  }

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
              Data PK
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              Data Perjanjian Kredit berdasarkan unit aktif.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadPkData(pagination.page)}
              disabled={loading || saving}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={14} />
              Tambah PK
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[9px] font-bold text-zinc-600">
              UNIT
            </div>

            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-zinc-800">
                {activeUnit?.name || "-"}
              </div>
              <div className="text-[10px] text-zinc-400">
                {activeUnit?.code || activeUnit?.value || "-"}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right text-[10px] text-zinc-500">
            <div className="font-semibold text-zinc-700">
              {pagination.total.toLocaleString("id-ID")} hasil
            </div>
            <div>
              {pagination.from}–{pagination.to} ditampilkan
            </div>
          </div>
        </div>

        <PkFilter
          search={search}
          setSearch={setSearch}
          productFilter={productFilter}
          setProductFilter={setProductFilter}
          mksFilter={mksFilter}
          setMksFilter={setMksFilter}
          limitFilter={limitFilter}
          setLimitFilter={setLimitFilter}
          monthFilter={monthFilter}
          setMonthFilter={setMonthFilter}
          yearFilter={yearFilter}
          setYearFilter={setYearFilter}
          mksOptions={mksOptions}
          yearOptions={yearOptions}
          visibleCount={visiblePk.length}
          totalCount={pagination.total}
          resetFilters={resetFilters}
        />

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <PkDesktopTable
            loading={loading}
            visiblePk={visiblePk}
            saving={saving}
            openDetail={openDetail}
            openEdit={openEdit}
          />

          <PkMobileTable
            loading={loading}
            visiblePk={visiblePk}
            openDetail={openDetail}
            openEdit={openEdit}
          />

          <div className="flex flex-col gap-3 border-t border-zinc-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>Baris per halaman</span>

              <select
                value={pagination.pageSize}
                onChange={changePageSize}
                disabled={loading}
                className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-700 outline-none focus:border-zinc-400"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <span>
                Menampilkan {pagination.from}–{pagination.to} dari{" "}
                {pagination.total.toLocaleString("id-ID")} PK
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changePage(pagination.page - 1)}
                disabled={loading || pagination.page <= 1}
                className="h-8 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sebelumnya
              </button>

              <span className="min-w-20 text-center text-xs text-zinc-600">
                Halaman {pagination.page} / {Math.max(1, pagination.totalPages)}
              </span>

              <button
                type="button"
                onClick={() => changePage(pagination.page + 1)}
                disabled={
                  loading ||
                  pagination.page >= pagination.totalPages ||
                  pagination.totalPages === 0
                }
                className="h-8 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedPk && (
        <PkDetailModal
          pk={selectedPk}
          mode={modalMode}
          onClose={closeModal}
          onSave={handleSave}
          onLockSection={(payload) => console.log("Lock section:", payload)}
          onCorrection={(payload) => console.log("Correction:", payload)}
          notaries={notaries}
          saving={saving}
        />
      )}
    </DashboardLayout>
  );
}
