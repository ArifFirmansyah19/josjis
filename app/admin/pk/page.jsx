"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  Eye,
  Pencil,
  RefreshCw,
  Plus,
  X,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import PkDetailModal from "@/components/pk/PkDetailModal";
import { supabase } from "@/lib/supabase";

/* =========================================================================
   UNIT DATABASE
========================================================================= */

const UNIT_UUID = {
  JKK1: "e2b50285-3bd4-4f78-bbde-c299f92ae1e8",
  JKK2: "0baec32b-1845-45f3-bcc0-d2202b0b5976",
};

/* =========================================================================
   KONSTANTA
========================================================================= */

const PK_ROLES = ["SUPERADMIN", "ADMIN", "MKA", "MKS", "SGP"];

const PRODUCT_OPTIONS = [
  {
    value: "SEMUA",
    label: "Semua Produk",
  },
  {
    value: "KUM",
    label: "KUM",
  },
  {
    value: "KUR",
    label: "KUR",
  },
  {
    value: "KPP",
    label: "KPP",
  },
  {
    value: "KSM",
    label: "KSM",
  },
];

const LIMIT_OPTIONS = [
  {
    value: "SEMUA",
    label: "Semua Limit",
  },
  {
    value: "0-25",
    label: "≤ Rp25 Juta",
  },
  {
    value: "25-100",
    label: "> Rp25–100 Juta",
  },
  {
    value: "100-200",
    label: "> Rp100–200 Juta",
  },
  {
    value: "200-500",
    label: "> Rp200–500 Juta",
  },
  {
    value: "500+",
    label: "> Rp500 Juta",
  },
];

const MONTH_OPTIONS = [
  {
    value: "SEMUA",
    label: "Semua Bulan",
  },
  {
    value: "01",
    label: "Januari",
  },
  {
    value: "02",
    label: "Februari",
  },
  {
    value: "03",
    label: "Maret",
  },
  {
    value: "04",
    label: "April",
  },
  {
    value: "05",
    label: "Mei",
  },
  {
    value: "06",
    label: "Juni",
  },
  {
    value: "07",
    label: "Juli",
  },
  {
    value: "08",
    label: "Agustus",
  },
  {
    value: "09",
    label: "September",
  },
  {
    value: "10",
    label: "Oktober",
  },
  {
    value: "11",
    label: "November",
  },
  {
    value: "12",
    label: "Desember",
  },
];

/* =========================================================================
   HELPER
========================================================================= */

function getUnitUuid(activeUnit) {
  if (!activeUnit?.value) {
    return null;
  }

  return UNIT_UUID[activeUnit.value] || null;
}

function formatMksName(name) {
  if (!name) {
    return "-";
  }

  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] || "-";
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];

  return `${lastName}/${firstName}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateShort(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatCurrency(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getDateYear(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return String(date.getFullYear());
}

function getDateMonth(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return String(date.getMonth() + 1).padStart(2, "0");
}

function getLimitBucket(value) {
  const limit = Number(value || 0);

  if (limit <= 25000000) {
    return "0-25";
  }

  if (limit <= 100000000) {
    return "25-100";
  }

  if (limit <= 200000000) {
    return "100-200";
  }

  if (limit <= 500000000) {
    return "200-500";
  }

  return "500+";
}

function getRole() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("role") ||
    localStorage.getItem("user_role") ||
    localStorage.getItem("userRole") ||
    ""
  ).toUpperCase();
}

function canViewPk() {
  const role = getRole();

  if (!role) {
    return true;
  }

  return PK_ROLES.includes(role);
}

/* =========================================================================
   FILTER SELECT
========================================================================= */

function FilterSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-xs font-medium text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />
      </div>
    </div>
  );
}

/* =========================================================================
   BADGE
========================================================================= */

function ProductBadge({ value }) {
  const product = String(value || "-").toUpperCase();

  return (
    <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-bold text-zinc-700">
      {product}
    </span>
  );
}

function AgunanBadge({ value }) {
  const count = Number(value || 0);

  return (
    <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-600">
      {count} agunan
    </span>
  );
}

/* =========================================================================
   PAGE
========================================================================= */

export default function PkPage() {
  const { activeUnit } = useUnit();

  /*
   * activeUnit dari UnitContext:
   *
   * {
   *   value: "JKK1",
   *   code: "11081A",
   *   name: "Jambi Kuamang Kuning 1"
   * }
   */
  const activeUnitUuid = getUnitUuid(activeUnit);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [pkRows, setPkRows] = useState([]);

  const [search, setSearch] = useState("");

  const [productFilter, setProductFilter] = useState("SEMUA");

  const [mksFilter, setMksFilter] = useState("SEMUA");

  const [limitFilter, setLimitFilter] = useState("SEMUA");

  const [monthFilter, setMonthFilter] = useState("SEMUA");

  const [yearFilter, setYearFilter] = useState("SEMUA");

  const [selectedPk, setSelectedPk] = useState(null);

  const [modalMode, setModalMode] = useState("view");

  /* =========================================================================
     LOAD DATA
  ========================================================================= */

  async function loadPkData() {
    /*
     * Jangan query kalau unit belum punya UUID.
     */
    if (!activeUnitUuid) {
      setPkRows([]);
      setErrorMessage(
        `Unit ${activeUnit?.value || "-"} belum memiliki UUID database.`,
      );
      return;
    }

    /*
     * Pastikan yang masuk ke query benar-benar UUID.
     */
    console.log("JOSJIS PK - Unit:", activeUnit?.value, activeUnitUuid);

    setLoading(true);
    setErrorMessage("");

    try {
      if (!canViewPk()) {
        setPkRows([]);
        return;
      }

      /*
       * ================================================================
       * 1. PK
       * ================================================================
       */

      const pkResult = await supabase
        .from("pk")
        .select("*")
        .eq("unit_id", activeUnitUuid)
        .order("created_at", {
          ascending: false,
        });

      if (pkResult.error) {
        throw pkResult.error;
      }

      const rows = pkResult.data || [];

      /*
       * Tidak ada PK.
       */
      if (!rows.length) {
        setPkRows([]);
        return;
      }

      /*
       * ================================================================
       * 2. COMPLETENESS
       * ================================================================
       */

      const pkIds = rows.map((row) => row.id).filter(Boolean);

      let completenessRows = [];

      if (pkIds.length) {
        const completenessResult = await supabase
          .from("v_pk_completeness_final")
          .select(
            `
              pk_id,
              unit_id,
              mks_id,
              status_kelengkapan,
              dokumen_pk_lengkap,
              seluruh_agunan_lengkap,
              lengkap_di_co
            `,
          )
          .in("pk_id", pkIds);

        if (completenessResult.error) {
          console.warn("Completeness gagal:", completenessResult.error);
        } else {
          completenessRows = completenessResult.data || [];
        }
      }

      const completenessMap = new Map(
        completenessRows.map((item) => [item.pk_id, item]),
      );

      /*
       * ================================================================
       * 3. MASTER MKS
       * ================================================================
       */

      let mksRows = [];

      const mksResult = await supabase.from("mks").select("*");

      if (mksResult.error) {
        console.warn("Master MKS gagal:", mksResult.error);
      } else {
        mksRows = mksResult.data || [];
      }

      /*
       * ================================================================
       * 4. MASTER PEGAWAI
       * ================================================================
       */

      let pegawaiRows = [];

      const pegawaiResult = await supabase.from("pegawai").select("*");

      if (pegawaiResult.error) {
        console.warn("Master pegawai gagal:", pegawaiResult.error);
      } else {
        pegawaiRows = pegawaiResult.data || [];
      }

      /*
       * ================================================================
       * 5. MAP PEGAWAI
       * ================================================================
       */

      const pegawaiMap = new Map();

      pegawaiRows.forEach((pegawai) => {
        if (pegawai.id) {
          pegawaiMap.set(pegawai.id, pegawai);
        }
      });

      /*
       * ================================================================
       * 6. MAP MKS
       * ================================================================
       */

      const mksMap = new Map();

      mksRows.forEach((mks) => {
        const pegawai = mks.pegawai_id ? pegawaiMap.get(mks.pegawai_id) : null;

        const name =
          mks.nama_mks ||
          mks.nama ||
          mks.nama_pegawai ||
          mks.name ||
          pegawai?.nama_pegawai ||
          pegawai?.nama ||
          pegawai?.name ||
          "-";

        const code =
          mks.kode_mks ||
          mks.kode ||
          mks.kode_pegawai ||
          pegawai?.kode_pegawai ||
          pegawai?.kode ||
          "";

        /*
         * Simpan berdasarkan id MKS.
         */
        if (mks.id) {
          mksMap.set(mks.id, {
            id: mks.id,
            name,
            code,
          });
        }

        /*
         * Kalau PK memakai pegawai_id sebagai mks_id.
         */
        if (mks.pegawai_id) {
          mksMap.set(mks.pegawai_id, {
            id: mks.pegawai_id,
            name,
            code,
          });
        }
      });

      /*
       * ================================================================
       * 7. MAP PK
       * ================================================================
       */

      const mappedRows = rows.map((row) => {
        const completeness = completenessMap.get(row.id) || null;

        const mksId = row.mks_id || completeness?.mks_id || null;

        const mks = mksMap.get(mksId) || {
          id: mksId,
          name: row.nama_mks || row.mks_name || row.mksName || "-",
          code: row.kode_mks || row.mks_code || "",
        };

        /*
         * Produk
         */
        const loanType =
          row.jenis_pengajuan_kredit ||
          row.jenis_kredit ||
          row.jenis_pinjaman ||
          row.produk ||
          row.product ||
          "";

        /*
         * Tanggal PK
         */
        const tanggalPk = row.tanggal_pk || row.tgl_pk || row.tanggalPk || null;

        /*
         * Tanggal peminjaman
         */
        const tanggalPeminjaman =
          row.tanggal_peminjaman ||
          row.tgl_peminjaman ||
          row.tanggal_pencairan ||
          row.tgl_pencairan ||
          row.tanggal_realisasi ||
          null;

        /*
         * Tenor
         */
        const tenor = row.tenor || row.tenor_bulan || row.jangka_waktu || null;

        /*
         * Limit
         */
        const limit = row.limit_kredit ?? row.limit_pinjaman ?? row.limit ?? 0;

        /*
         * Jumlah agunan.
         *
         * Jika field count sudah ada di PK,
         * gunakan field tersebut.
         *
         * Kalau belum ada, sementara 0.
         */
        const jumlahAgunan =
          row.jumlah_agunan ??
          row.total_agunan ??
          row.agunan_count ??
          row.jumlahAgunan ??
          0;

        return {
          ...row,

          id: row.id,

          unitId: row.unit_id,

          mksId,

          mksName: mks.name || "-",

          mksAgentCode: mks.code || "",

          tanggalPk,

          tanggalPeminjaman,

          jenisPengajuanKredit: loanType,

          tenor,

          limitKredit: Number(limit || 0),

          jumlahAgunan,

          statusKelengkapan: completeness?.status_kelengkapan || null,

          dokumenPkLengkap: completeness?.dokumen_pk_lengkap ?? false,

          seluruhAgunanLengkap: completeness?.seluruh_agunan_lengkap ?? false,

          lengkapDiCo: completeness?.lengkap_di_co ?? false,
        };
      });

      setPkRows(mappedRows);
    } catch (error) {
      console.error("Load PK error:", error);

      setErrorMessage(error?.message || "Data PK gagal dimuat.");

      setPkRows([]);
    } finally {
      setLoading(false);
    }
  }

  /*
   * Reload ketika unit Topbar berubah.
   */
  useEffect(() => {
    loadPkData();
  }, [activeUnitUuid]);

  /* =========================================================================
     YEAR OPTION
  ========================================================================= */

  const yearOptions = useMemo(() => {
    const years = new Set();

    pkRows.forEach((pk) => {
      const year = getDateYear(pk.tanggalPk);

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

  /* =========================================================================
     MKS OPTION
  ========================================================================= */

  const mksOptions = useMemo(() => {
    const map = new Map();

    pkRows.forEach((pk) => {
      const id = pk.mksId || pk.mksName || "TANPA_MKS";

      if (!map.has(id)) {
        map.set(id, {
          value: id,
          label: formatMksName(pk.mksName),
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

  /* =========================================================================
     FILTER
  ========================================================================= */

  const visiblePk = useMemo(() => {
    const query = normalizeText(search);

    return pkRows.filter((pk) => {
      /*
       * Proteksi unit di frontend.
       */
      if (activeUnitUuid && pk.unitId && pk.unitId !== activeUnitUuid) {
        return false;
      }

      /*
       * SEARCH GLOBAL
       */
      if (query) {
        const searchableText = [
          pk.id,
          pk.nomor_pk,
          pk.nomor_aplikasi,
          pk.cif,
          pk.nama_debitur,
          pk.nik,
          pk.nomor_rekening,
          pk.loan_account,
          pk.mksName,
          pk.mksAgentCode,
          pk.jenisPengajuanKredit,
          pk.jenis_kredit,
          pk.jenis_pinjaman,
          pk.produk,
        ]
          .filter(Boolean)
          .join(" ");

        if (!normalizeText(searchableText).includes(query)) {
          return false;
        }
      }

      /*
       * PRODUK
       */
      if (
        productFilter !== "SEMUA" &&
        normalizeText(pk.jenisPengajuanKredit) !== normalizeText(productFilter)
      ) {
        return false;
      }

      /*
       * MKS
       */
      if (mksFilter !== "SEMUA") {
        const pkMksId = pk.mksId || pk.mksName || "TANPA_MKS";

        if (pkMksId !== mksFilter) {
          return false;
        }
      }

      /*
       * LIMIT
       */
      if (
        limitFilter !== "SEMUA" &&
        getLimitBucket(pk.limitKredit) !== limitFilter
      ) {
        return false;
      }

      /*
       * BULAN
       */
      if (
        monthFilter !== "SEMUA" &&
        getDateMonth(pk.tanggalPk) !== monthFilter
      ) {
        return false;
      }

      /*
       * TAHUN
       */
      if (yearFilter !== "SEMUA" && getDateYear(pk.tanggalPk) !== yearFilter) {
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

  /* =========================================================================
     ACTION
  ========================================================================= */

  function openDetail(pk) {
    setModalMode("view");
    setSelectedPk(pk);
  }

  function openEdit(pk) {
    setModalMode("edit");
    setSelectedPk(pk);
  }

  function closeModal() {
    setSelectedPk(null);
    setModalMode("view");
  }

  function handleAdd() {
    setSelectedPk(null);

    /*
     * Alur tambah PK lama tetap bisa
     * dihubungkan ke sini.
     */
  }

  function handleSave(updatedPk) {
    if (!updatedPk?.id) {
      return;
    }

    setPkRows((current) =>
      current.map((item) =>
        item.id === updatedPk.id
          ? {
              ...item,
              ...updatedPk,
            }
          : item,
      ),
    );

    setSelectedPk((current) =>
      current?.id === updatedPk.id
        ? {
            ...current,
            ...updatedPk,
          }
        : current,
    );
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

  /* =========================================================================
     RENDER
  ========================================================================= */

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        {/* ================================================================
            HEADER
        ================================================================ */}

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
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
            >
              <Plus size={14} />
              Tambah PK
            </button>
          </div>
        </div>

        {/* ================================================================
            UNIT AKTIF
        ================================================================ */}

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

        {/* ================================================================
            FILTER
        ================================================================ */}

        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100">
              <Filter size={14} className="text-zinc-600" />
            </div>

            <div>
              <div className="text-xs font-bold text-zinc-800">
                Filter Data PK
              </div>

              <div className="text-[10px] text-zinc-400">
                Cari dan saring data PK
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            {/* SEARCH */}

            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Pencarian Global
              </label>

              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="PK / CIF / NIK / Debitur / MKS..."
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-9 text-xs text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <FilterSelect
              label="Produk"
              value={productFilter}
              onChange={setProductFilter}
              options={PRODUCT_OPTIONS}
            />

            <FilterSelect
              label="MKS"
              value={mksFilter}
              onChange={setMksFilter}
              options={mksOptions}
            />

            <FilterSelect
              label="Limit"
              value={limitFilter}
              onChange={setLimitFilter}
              options={LIMIT_OPTIONS}
            />

            <FilterSelect
              label="Bulan PK"
              value={monthFilter}
              onChange={setMonthFilter}
              options={MONTH_OPTIONS}
            />

            <FilterSelect
              label="Tahun PK"
              value={yearFilter}
              onChange={setYearFilter}
              options={yearOptions}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
            <div className="text-[10px] text-zinc-400">
              Menampilkan{" "}
              <span className="font-bold text-zinc-700">
                {visiblePk.length}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-zinc-700">{pkRows.length}</span>{" "}
              PK
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* ================================================================
            ERROR
        ================================================================ */}

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* ================================================================
            DESKTOP TABLE
        ================================================================ */}

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Tgl PK
                  </th>

                  <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    MKS
                  </th>

                  <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Nama Debitur
                  </th>

                  <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Tgl Peminjaman
                  </th>

                  <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Produk
                  </th>

                  <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Tenor
                  </th>

                  <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Agunan
                  </th>

                  <th className="whitespace-nowrap px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Limit
                  </th>

                  <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Detail / Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-xs text-zinc-400"
                    >
                      Memuat data PK...
                    </td>
                  </tr>
                ) : visiblePk.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-xs text-zinc-400"
                    >
                      Tidak ada data PK yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  visiblePk.map((pk) => (
                    <tr
                      key={pk.id}
                      onClick={() => openDetail(pk)}
                      className="group cursor-pointer border-b border-zinc-100 transition hover:bg-zinc-50 last:border-b-0"
                    >
                      {/* TGL PK */}

                      <td className="px-3 py-3 align-middle">
                        <div className="whitespace-nowrap text-xs font-semibold text-zinc-800">
                          {formatDate(pk.tanggalPk)}
                        </div>
                      </td>

                      {/* MKS */}

                      <td className="px-3 py-3 align-middle">
                        <div className="max-w-[130px] truncate text-xs font-bold text-zinc-800">
                          {formatMksName(pk.mksName)}
                        </div>

                        {pk.mksAgentCode && (
                          <div className="mt-0.5 text-[9px] text-zinc-400">
                            {pk.mksAgentCode}
                          </div>
                        )}
                      </td>

                      {/* DEBITUR */}

                      <td className="px-3 py-3 align-middle">
                        <div className="max-w-[230px] truncate text-xs font-semibold text-zinc-800">
                          {pk.nama_debitur || pk.namaDebitur || "-"}
                        </div>

                        {(pk.cif || pk.nik) && (
                          <div className="mt-0.5 truncate text-[9px] text-zinc-400">
                            {pk.cif ? `CIF ${pk.cif}` : `NIK ${pk.nik}`}
                          </div>
                        )}
                      </td>

                      {/* TGL PEMINJAMAN */}

                      <td className="px-3 py-3 align-middle">
                        <div className="whitespace-nowrap text-xs text-zinc-700">
                          {formatDate(pk.tanggalPeminjaman)}
                        </div>
                      </td>

                      {/* PRODUK */}

                      <td className="px-3 py-3 align-middle">
                        <ProductBadge value={pk.jenisPengajuanKredit} />
                      </td>

                      {/* TENOR */}

                      <td className="px-3 py-3 text-center align-middle">
                        <span className="text-xs font-medium text-zinc-700">
                          {pk.tenor ? `${pk.tenor} bln` : "-"}
                        </span>
                      </td>

                      {/* AGUNAN */}

                      <td className="px-3 py-3 text-center align-middle">
                        <AgunanBadge value={pk.jumlahAgunan} />
                      </td>

                      {/* LIMIT */}

                      <td className="px-3 py-3 text-right align-middle">
                        <div className="whitespace-nowrap text-xs font-bold text-zinc-800">
                          {formatCurrency(pk.limitKredit)}
                        </div>
                      </td>

                      {/* ACTION */}

                      <td
                        className="px-3 py-3 align-middle"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetail(pk)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[10px] font-bold text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                          >
                            <Eye size={13} />
                            Detail
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(pk)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 text-[10px] font-bold text-white transition hover:bg-zinc-800"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ================================================================
              MOBILE TABLE
          ================================================================ */}

          <div className="lg:hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-2.5 py-2.5 text-left text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                      MKS
                    </th>

                    <th className="px-2.5 py-2.5 text-left text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                      Tgl
                    </th>

                    <th className="px-2.5 py-2.5 text-left text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                      Nama Debitur
                    </th>

                    <th className="px-2.5 py-2.5 text-right text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                      Limit
                    </th>

                    <th className="px-2.5 py-2.5 text-center text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                      Detail
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-10 text-center text-xs text-zinc-400"
                      >
                        Memuat...
                      </td>
                    </tr>
                  ) : visiblePk.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-10 text-center text-xs text-zinc-400"
                      >
                        Tidak ada data.
                      </td>
                    </tr>
                  ) : (
                    visiblePk.map((pk) => (
                      <tr
                        key={pk.id}
                        onClick={() => openDetail(pk)}
                        className="cursor-pointer border-b border-zinc-100 transition active:bg-zinc-100 last:border-b-0"
                      >
                        {/* MKS */}

                        <td className="max-w-[110px] px-2.5 py-2.5 align-middle">
                          <div className="truncate text-[10px] font-bold text-zinc-800">
                            {formatMksName(pk.mksName)}
                          </div>
                        </td>

                        {/* TGL */}

                        <td className="whitespace-nowrap px-2.5 py-2.5 align-middle">
                          <div className="text-[10px] font-medium text-zinc-600">
                            {formatDateShort(pk.tanggalPk)}
                          </div>
                        </td>

                        {/* DEBITUR */}

                        <td className="max-w-[180px] px-2.5 py-2.5 align-middle">
                          <div className="truncate text-[10px] font-semibold text-zinc-800">
                            {pk.nama_debitur || pk.namaDebitur || "-"}
                          </div>
                        </td>

                        {/* LIMIT */}

                        <td className="whitespace-nowrap px-2.5 py-2.5 text-right align-middle">
                          <div className="text-[10px] font-bold text-zinc-800">
                            {formatCurrency(pk.limitKredit)}
                          </div>
                        </td>

                        {/* DETAIL */}

                        <td
                          className="px-2.5 py-2.5 text-center align-middle"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => openDetail(pk)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
                            title="Detail PK"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2">
              <p className="text-[9px] text-zinc-400">
                Ketuk baris untuk membuka detail PK.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          MODAL DETAIL
      ================================================================ */}

      {selectedPk && (
        <PkDetailModal
          pk={selectedPk}
          mode={modalMode}
          onClose={closeModal}
          onSave={handleSave}
          onLockSection={handleLockSection}
          onCorrection={handleCorrection}
        />
      )}
    </DashboardLayout>
  );
}
