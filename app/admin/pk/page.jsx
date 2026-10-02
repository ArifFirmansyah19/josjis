"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import PkDetailModal from "@/components/pk/PkDetailModal";
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

function canViewPk() {
  const role = getRole();
  if (!role) {
    return true;
  }
  return PK_ROLES.includes(role);
}

function mergeSavedPk(previous, savedRow, relatedParties = []) {
  return {
    ...previous,
    ...savedRow,
    id: savedRow?.id || previous?.id,
    unitId: savedRow?.unit_id || previous?.unitId || null,
    mksId: previous?.mksId || savedRow?.mks_id || null,
    mksName: previous?.mksName || "-",
    mksAgentCode: previous?.mksAgentCode || "",
    loanType: savedRow?.jenis_pengajuan_kredit || "",
    applicationNumber: savedRow?.nomor_aplikasi || "",
    applicationDate: savedRow?.tanggal_aplikasi || "",
    pkDate: savedRow?.tanggal_pk || "",
    pkNumber: savedRow?.nomor_pk || "",
    limit: savedRow?.limit_kredit ?? "",
    tenor: savedRow?.jangka_waktu ?? "",
    cif: savedRow?.cif || "",
    savingsAccount: savedRow?.rekening_tabungan || "",
    loanAccount: savedRow?.rekening_kredit || "",
    loanStatus: savedRow?.status_pk || "AKTIF",
    tanggalPk: savedRow?.tanggal_pk || null,
    tanggalPeminjaman: savedRow?.tanggal_aplikasi || null,
    jenisPengajuanKredit: savedRow?.jenis_pengajuan_kredit || "",
    limitKredit: Number(savedRow?.limit_kredit || 0),
    namaDebitur: savedRow?.nama_debitur || "",
    nik: savedRow?.nomor_ktp || "",
    nomorHp: savedRow?.nomor_handphone || "",
    jenisKelamin: savedRow?.jenis_kelamin || "",
    penyebutanDebitur: savedRow?.penyebutan_debitur || "",
    nomor_handphone: savedRow?.nomor_handphone || "",
    jenis_kelamin: savedRow?.jenis_kelamin || "",
    penyebutan_debitur: savedRow?.penyebutan_debitur || "",
    status_debitur: savedRow?.status_debitur || "",
    rt: savedRow?.rt || "",
    rw: savedRow?.rw || "",
    alamatJalan: savedRow?.alamat_jalan || "",
    alamatDesaKelurahan: savedRow?.alamat_desa_kelurahan || "",
    alamatKecamatan: savedRow?.alamat_kecamatan || "",
    alamatKabupaten: savedRow?.alamat_kabupaten || "",
    alamat_jalan: savedRow?.alamat_jalan || "",
    alamat_desa_kelurahan: savedRow?.alamat_desa_kelurahan || "",
    alamat_kecamatan: savedRow?.alamat_kecamatan || "",
    alamat_kabupaten: savedRow?.alamat_kabupaten || "",
    nama_pasangan: savedRow?.nama_pasangan || "",
    nik_pasangan: savedRow?.nik_pasangan || "",
    nomor_handphone_pasangan: savedRow?.nomor_handphone_pasangan || "",
    alamat_pasangan_sama_debitur:
      savedRow?.alamat_pasangan_sama_debitur ?? false,
    alamat_pasangan_jalan: savedRow?.alamat_pasangan_jalan || "",
    alamat_pasangan_rt: savedRow?.alamat_pasangan_rt || "",
    alamat_pasangan_rw: savedRow?.alamat_pasangan_rw || "",
    alamat_pasangan_desa_kelurahan:
      savedRow?.alamat_pasangan_desa_kelurahan || "",
    alamat_pasangan_kecamatan: savedRow?.alamat_pasangan_kecamatan || "",
    alamat_pasangan_kabupaten: savedRow?.alamat_pasangan_kabupaten || "",
    relatedParties: Array.isArray(relatedParties) ? relatedParties : [],
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
  const [selectedPk, setSelectedPk] = useState(null);
  const [modalMode, setModalMode] = useState("view");

  async function loadPkData() {
    if (!activeUnitUuid) {
      setPkRows([]);
      setErrorMessage(
        `Unit ${activeUnit?.value || "-"} belum memiliki UUID database.`,
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      if (!canViewPk()) {
        setPkRows([]);
        return;
      }

      console.log("JOSJIS PK - Unit:", activeUnit?.value, activeUnitUuid);

      const [mappedRows, notaryRows] = await Promise.all([
        fetchPkData({
          supabase,
          activeUnitUuid,
        }),
        fetchNotaries({
          supabase,
        }),
      ]);

      setPkRows(Array.isArray(mappedRows) ? mappedRows : []);

      setNotaries(Array.isArray(notaryRows) ? notaryRows : []);

      console.log(
        "JOSJIS PK - Notaris:",
        Array.isArray(notaryRows) ? notaryRows : [],
      );
    } catch (error) {
      console.error("Load PK error:", error);
      setErrorMessage(error?.message || "Data PK gagal dimuat.");
      setPkRows([]);
      setNotaries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPkData();
  }, [activeUnitUuid]);

  const yearOptions = useMemo(() => {
    const years = new Set();

    pkRows.forEach((pk) => {
      const year = getDateYear(pk?.tanggalPk);

      if (year) {
        years.add(year);
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => Number(b) - Number(a));

    return [
      {
        value: "SEMUA",
        label: "Semua Tahun",
      },
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

      if (!map.has(id)) {
        map.set(id, {
          value: id,
          label: formatMksName(pk?.mksName),
        });
      }
    });

    return [
      {
        value: "SEMUA",
        label: "Semua MKS",
      },
      ...Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label, "id"),
      ),
    ];
  }, [pkRows]);

  const visiblePk = useMemo(() => {
    const query = normalizeText(search);

    return pkRows.filter((pk) => {
      if (activeUnitUuid && pk?.unitId && pk.unitId !== activeUnitUuid) {
        return false;
      }

      if (query) {
        const searchableText = [
          pk?.id,
          pk?.nomor_pk,
          pk?.nomor_aplikasi,
          pk?.cif,
          pk?.nama_debitur,
          pk?.nomor_ktp,
          pk?.nik,
          pk?.rekening_tabungan,
          pk?.rekening_kredit,
          pk?.mksName,
          pk?.mksAgentCode,
          pk?.jenisPengajuanKredit,
          pk?.jenis_pengajuan_kredit,
        ]
          .filter(Boolean)
          .join(" ");

        if (!normalizeText(searchableText).includes(query)) {
          return false;
        }
      }

      if (
        productFilter !== "SEMUA" &&
        normalizeText(pk?.jenisPengajuanKredit) !== normalizeText(productFilter)
      ) {
        return false;
      }

      if (mksFilter !== "SEMUA") {
        const pkMksId = pk?.mksId || "TANPA_MKS";

        if (pkMksId !== mksFilter) {
          return false;
        }
      }

      if (
        limitFilter !== "SEMUA" &&
        getLimitBucket(pk?.limitKredit) !== limitFilter
      ) {
        return false;
      }

      if (
        monthFilter !== "SEMUA" &&
        getDateMonth(pk?.tanggalPk) !== monthFilter
      ) {
        return false;
      }

      if (yearFilter !== "SEMUA" && getDateYear(pk?.tanggalPk) !== yearFilter) {
        return false;
      }

      return true;
    });
  }, [
    pkRows,
    activeUnitUuid,
    search,
    productFilter,
    mksFilter,
    limitFilter,
    monthFilter,
    yearFilter,
  ]);

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
    if (saving) {
      return;
    }

    setSelectedPk(null);
    setModalMode("view");
  }

  function handleAdd() {
    setSelectedPk(null);
  }

  async function handleSave(updatedPk) {
    if (!updatedPk?.id) {
      throw new Error("ID PK tidak ditemukan.");
    }

    if (saving) {
      return;
    }

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
      };

      console.log("JOSJIS PK UPDATE:", updatedPk.id, payload);

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

      setPkRows((current) =>
        current.map((item) => {
          if (item.id !== savedRow.id) {
            return item;
          }

          return mergeSavedPk(item, savedRow, updatedPk.relatedParties);
        }),
      );

      setSelectedPk((current) => {
        if (!current || current.id !== savedRow.id) {
          return current;
        }

        return mergeSavedPk(current, savedRow, updatedPk.relatedParties);
      });

      setSuccessMessage("Data PK berhasil disimpan.");

      await loadPkData();
    } catch (error) {
      console.error("Save PK error:", error);

      const message = error?.message || "Data PK gagal disimpan.";

      setErrorMessage(message);
      throw error;
    } finally {
      setSaving(false);
    }
  }

  function handleLockSection(payload) {
    console.log("Lock section:", payload);
  }

  function handleCorrection(payload) {
    console.log("Correction:", payload);
  }

  function resetFilters() {
    setSearch("");
    setProductFilter("SEMUA");
    setMksFilter("SEMUA");
    setLimitFilter("SEMUA");
    setMonthFilter("SEMUA");
    setYearFilter("SEMUA");
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
              onClick={loadPkData}
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

          <div className="shrink-0 text-[10px] font-medium text-zinc-400">
            {visiblePk.length} data
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
          totalCount={pkRows.length}
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
          />
        </div>
      </div>

      {selectedPk && (
        <PkDetailModal
          pk={selectedPk}
          mode={modalMode}
          onClose={closeModal}
          onSave={handleSave}
          onLockSection={handleLockSection}
          onCorrection={handleCorrection}
          notaries={notaries}
        />
      )}
    </DashboardLayout>
  );
}
