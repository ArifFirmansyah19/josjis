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
   NORMALIZER SUPABASE
========================================================================= */

function nullableText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text === "" ? null : text;
}

function nullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

function nullableDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return value;
}

function nullableBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  return Boolean(value);
}

/* =========================================================================
   SUPABASE PAYLOAD
   Hanya field yang memang ada pada public.pk.
========================================================================= */

function buildPkUpdatePayload(pk) {
  if (!pk?.id) {
    return null;
  }

  const payload = {};

  /* -----------------------------------------------------------------------
     IDENTITAS / PINJAMAN
  ----------------------------------------------------------------------- */

  if (pk.jenis_pengajuan_kredit !== undefined || pk.loanType !== undefined) {
    payload.jenis_pengajuan_kredit = nullableText(
      pk.jenis_pengajuan_kredit !== undefined
        ? pk.jenis_pengajuan_kredit
        : pk.loanType,
    );
  }

  if (pk.nomor_aplikasi !== undefined || pk.applicationNumber !== undefined) {
    payload.nomor_aplikasi = nullableText(
      pk.nomor_aplikasi !== undefined
        ? pk.nomor_aplikasi
        : pk.applicationNumber,
    );
  }

  if (pk.tanggal_aplikasi !== undefined || pk.applicationDate !== undefined) {
    payload.tanggal_aplikasi = nullableDate(
      pk.tanggal_aplikasi !== undefined
        ? pk.tanggal_aplikasi
        : pk.applicationDate,
    );
  }

  if (pk.tanggal_pk !== undefined || pk.pkDate !== undefined) {
    payload.tanggal_pk = nullableDate(
      pk.tanggal_pk !== undefined ? pk.tanggal_pk : pk.pkDate,
    );
  }

  if (pk.nomor_pk !== undefined || pk.pkNumber !== undefined) {
    payload.nomor_pk = nullableText(
      pk.nomor_pk !== undefined ? pk.nomor_pk : pk.pkNumber,
    );
  }

  if (pk.cif !== undefined) {
    payload.cif = nullableText(pk.cif);
  }

  if (pk.limit_kredit !== undefined || pk.limit !== undefined) {
    payload.limit_kredit = nullableNumber(
      pk.limit_kredit !== undefined ? pk.limit_kredit : pk.limit,
    );
  }

  if (pk.jangka_waktu !== undefined || pk.tenor !== undefined) {
    payload.jangka_waktu = nullableNumber(
      pk.jangka_waktu !== undefined ? pk.jangka_waktu : pk.tenor,
    );
  }

  if (pk.rekening_tabungan !== undefined || pk.savingsAccount !== undefined) {
    payload.rekening_tabungan = nullableText(
      pk.rekening_tabungan !== undefined
        ? pk.rekening_tabungan
        : pk.savingsAccount,
    );
  }

  if (pk.rekening_kredit !== undefined || pk.loanAccount !== undefined) {
    payload.rekening_kredit = nullableText(
      pk.rekening_kredit !== undefined ? pk.rekening_kredit : pk.loanAccount,
    );
  }

  /* -----------------------------------------------------------------------
     DEBITUR
  ----------------------------------------------------------------------- */

  if (pk.nama_debitur !== undefined || pk.namaDebitur !== undefined) {
    payload.nama_debitur = nullableText(
      pk.nama_debitur !== undefined ? pk.nama_debitur : pk.namaDebitur,
    );
  }

  if (pk.status_debitur !== undefined) {
    payload.status_debitur = nullableText(pk.status_debitur);
  }

  if (
    pk.penyebutan_debitur !== undefined ||
    pk.penyebutanDebitur !== undefined
  ) {
    payload.penyebutan_debitur = nullableText(
      pk.penyebutan_debitur !== undefined
        ? pk.penyebutan_debitur
        : pk.penyebutanDebitur,
    );
  }

  if (pk.jenis_kelamin !== undefined) {
    payload.jenis_kelamin = nullableText(pk.jenis_kelamin);
  }

  if (pk.nomor_ktp !== undefined || pk.nik !== undefined) {
    payload.nomor_ktp = nullableText(
      pk.nomor_ktp !== undefined ? pk.nomor_ktp : pk.nik,
    );
  }

  if (pk.tanggal_expired_ktp !== undefined) {
    payload.tanggal_expired_ktp = nullableDate(pk.tanggal_expired_ktp);
  }

  if (pk.tempat_lahir !== undefined) {
    payload.tempat_lahir = nullableText(pk.tempat_lahir);
  }

  if (pk.tanggal_lahir !== undefined) {
    payload.tanggal_lahir = nullableDate(pk.tanggal_lahir);
  }

  if (pk.profesi !== undefined) {
    payload.profesi = nullableText(pk.profesi);
  }

  if (pk.nomor_handphone !== undefined || pk.nomorHp !== undefined) {
    payload.nomor_handphone = nullableText(
      pk.nomor_handphone !== undefined ? pk.nomor_handphone : pk.nomorHp,
    );
  }

  /* -----------------------------------------------------------------------
     ALAMAT DEBITUR
  ----------------------------------------------------------------------- */

  if (pk.alamat_jalan !== undefined) {
    payload.alamat_jalan = nullableText(pk.alamat_jalan);
  }

  if (pk.rt !== undefined) {
    payload.rt = nullableText(pk.rt);
  }

  if (pk.rw !== undefined) {
    payload.rw = nullableText(pk.rw);
  }

  if (pk.alamat_desa_kelurahan !== undefined) {
    payload.alamat_desa_kelurahan = nullableText(pk.alamat_desa_kelurahan);
  }

  if (pk.alamat_kecamatan !== undefined) {
    payload.alamat_kecamatan = nullableText(pk.alamat_kecamatan);
  }

  if (pk.alamat_kabupaten !== undefined) {
    payload.alamat_kabupaten = nullableText(pk.alamat_kabupaten);
  }

  /* -----------------------------------------------------------------------
     DATA PASANGAN
     
     Data pasangan sengaja tetap disimpan walaupun status debitur
     berubah dari MENIKAH ke status lain.
     
     Section pasangan hanya akan ditampilkan / disembunyikan oleh modal.
  ----------------------------------------------------------------------- */

  if (pk.nama_pasangan !== undefined) {
    payload.nama_pasangan = nullableText(pk.nama_pasangan);
  }

  if (pk.nomor_handphone_pasangan !== undefined) {
    payload.nomor_handphone_pasangan = nullableText(
      pk.nomor_handphone_pasangan,
    );
  }

  if (pk.alamat_pasangan_sama_debitur !== undefined) {
    payload.alamat_pasangan_sama_debitur = nullableBoolean(
      pk.alamat_pasangan_sama_debitur,
    );
  }

  if (pk.alamat_pasangan_jalan !== undefined) {
    payload.alamat_pasangan_jalan = nullableText(pk.alamat_pasangan_jalan);
  }

  if (pk.alamat_pasangan_rt !== undefined) {
    payload.alamat_pasangan_rt = nullableText(pk.alamat_pasangan_rt);
  }

  if (pk.alamat_pasangan_rw !== undefined) {
    payload.alamat_pasangan_rw = nullableText(pk.alamat_pasangan_rw);
  }

  if (pk.alamat_pasangan_desa_kelurahan !== undefined) {
    payload.alamat_pasangan_desa_kelurahan = nullableText(
      pk.alamat_pasangan_desa_kelurahan,
    );
  }

  if (pk.alamat_pasangan_kecamatan !== undefined) {
    payload.alamat_pasangan_kecamatan = nullableText(
      pk.alamat_pasangan_kecamatan,
    );
  }

  if (pk.alamat_pasangan_kabupaten !== undefined) {
    payload.alamat_pasangan_kabupaten = nullableText(
      pk.alamat_pasangan_kabupaten,
    );
  }

  /* -----------------------------------------------------------------------
     LOAN DETAIL
  ----------------------------------------------------------------------- */

  if (pk.tujuan_kredit !== undefined) {
    payload.tujuan_kredit = nullableText(pk.tujuan_kredit);
  }

  if (pk.bunga_per_bulan !== undefined) {
    payload.bunga_per_bulan = nullableNumber(pk.bunga_per_bulan);
  }

  if (pk.bunga_per_tahun !== undefined) {
    payload.bunga_per_tahun = nullableNumber(pk.bunga_per_tahun);
  }

  if (pk.angsuran_kredit !== undefined) {
    payload.angsuran_kredit = nullableNumber(pk.angsuran_kredit);
  }

  if (pk.tanggal_acuan_angsuran !== undefined) {
    payload.tanggal_acuan_angsuran = nullableDate(pk.tanggal_acuan_angsuran);
  }

  /* -----------------------------------------------------------------------
     BIAYA
  ----------------------------------------------------------------------- */

  const numericFields = [
    "biaya_provisi",
    "biaya_admin",
    "biaya_provisi_rupiah",
    "materai",
    "premi_asuransi_jiwa",
    "nilai_agunan_bangunan",
    "biaya_premi_kebakaran",
    "biaya_notaris",
    "nilai_pengikatan",
    "total_biaya",
    "limit_kredit_sebelumnya",
    "nominal_pelunasan_pinjaman_exist",
    "biaya_blokir_bpkb",
  ];

  numericFields.forEach((field) => {
    if (pk[field] !== undefined) {
      payload[field] = nullableNumber(pk[field]);
    }
  });

  /* -----------------------------------------------------------------------
     ASURANSI / NOTARIS / DATA TAMBAHAN
  ----------------------------------------------------------------------- */

  const textFields = [
    "pt_asuransi_jiwa",
    "rekening_asuransi_jiwa",
    "rekening_notaris",
    "pt_asuransi_kendaraan",
    "nomor_rekening_blokiran",
    "klasifikasi_debitur",
    "addendum_ke",
    "nomor_bast",
  ];

  textFields.forEach((field) => {
    if (pk[field] !== undefined) {
      payload[field] = nullableText(pk[field]);
    }
  });

  /* -----------------------------------------------------------------------
     ADDENDUM
  ----------------------------------------------------------------------- */

  if (pk.tanggal_pk_add_pk_sebelumnya !== undefined) {
    payload.tanggal_pk_add_pk_sebelumnya = nullableDate(
      pk.tanggal_pk_add_pk_sebelumnya,
    );
  }

  if (pk.limit_kredit_sebelumnya !== undefined) {
    payload.limit_kredit_sebelumnya = nullableNumber(
      pk.limit_kredit_sebelumnya,
    );
  }

  if (pk.nominal_pelunasan_pinjaman_exist !== undefined) {
    payload.nominal_pelunasan_pinjaman_exist = nullableNumber(
      pk.nominal_pelunasan_pinjaman_exist,
    );
  }

  /* -----------------------------------------------------------------------
     STATUS
  ----------------------------------------------------------------------- */

  if (pk.status_pk !== undefined || pk.loanStatus !== undefined) {
    payload.status_pk =
      nullableText(pk.status_pk !== undefined ? pk.status_pk : pk.loanStatus) ||
      "AKTIF";
  }

  /* -----------------------------------------------------------------------
     NOTARIS
  ----------------------------------------------------------------------- */

  if (pk.notaris_id !== undefined) {
    payload.notaris_id = pk.notaris_id || null;
  }

  /* -----------------------------------------------------------------------
     UPDATED AT
  ----------------------------------------------------------------------- */

  payload.updated_at = new Date().toISOString();

  return payload;
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
  const activeUnitUuid = getUnitUuid(activeUnit);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

      /* ================================================================
         1. PK
      ================================================================ */

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

      if (!rows.length) {
        setPkRows([]);
        return;
      }

      /* ================================================================
         2. COMPLETENESS
      ================================================================ */

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

      /* ================================================================
         3. MASTER MKS
      ================================================================ */

      const mksResult = await supabase
        .from("mks")
        .select("id, pegawai_id, kode_agen");

      if (mksResult.error) {
        console.warn("Master MKS gagal:", mksResult.error);
      }

      const mksRows = mksResult.data || [];

      /* ================================================================
         4. MASTER PEGAWAI
      ================================================================ */

      const pegawaiResult = await supabase.from("pegawai").select("*");

      if (pegawaiResult.error) {
        console.warn("Master pegawai gagal:", pegawaiResult.error);
      }

      const pegawaiRows = pegawaiResult.data || [];

      /* ================================================================
         5. MAP PEGAWAI
      ================================================================ */

      const pegawaiMap = new Map();

      pegawaiRows.forEach((pegawai) => {
        if (!pegawai?.id) {
          return;
        }

        pegawaiMap.set(pegawai.id, pegawai);
      });

      /* ================================================================
         6. MAP MKS
      ================================================================ */

      const mksMap = new Map();

      mksRows.forEach((mks) => {
        if (!mks?.id) {
          return;
        }

        const pegawai = mks.pegawai_id ? pegawaiMap.get(mks.pegawai_id) : null;

        const name =
          pegawai?.nama_pegawai || pegawai?.nama || pegawai?.name || "-";

        const code = mks.kode_agen || "";

        mksMap.set(mks.id, {
          id: mks.id,
          name,
          code,
        });
      });

      /* ================================================================
         7. MAP PK
      ================================================================ */

      const mappedRows = rows.map((row) => {
        const completeness = completenessMap.get(row.id) || null;

        const mksId = row.mks_id || completeness?.mks_id || null;

        const mks = mksId ? mksMap.get(mksId) : null;

        const loanType = row.jenis_pengajuan_kredit || "";

        const tanggalPk = row.tanggal_pk || null;

        const tanggalPeminjaman = row.tanggal_aplikasi || null;

        const tenor = row.jangka_waktu ?? null;

        const limit = row.limit_kredit ?? 0;

        const jumlahAgunan =
          row.jumlah_agunan ??
          row.total_agunan ??
          row.agunan_count ??
          row.jumlahAgunan ??
          0;

        return {
          ...row,

          /* --------------------------------------------------------------
             IDENTITAS UTAMA
          -------------------------------------------------------------- */

          id: row.id,
          unitId: row.unit_id,

          mksId,
          mksName: mks?.name || "-",
          mksAgentCode: mks?.code || "",

          /* --------------------------------------------------------------
             ALIAS UI LAMA
          -------------------------------------------------------------- */

          tanggalPk,
          tanggalPeminjaman,

          jenisPengajuanKredit: loanType,

          tenor,

          limitKredit: Number(limit || 0),

          jumlahAgunan,

          /* --------------------------------------------------------------
             ALIAS MODAL
          -------------------------------------------------------------- */

          loanType: row.jenis_pengajuan_kredit || "",

          applicationNumber: row.nomor_aplikasi || "",

          applicationDate: row.tanggal_aplikasi || "",

          pkDate: row.tanggal_pk || "",

          pkNumber: row.nomor_pk || "",

          limit: row.limit_kredit ?? "",

          cif: row.cif || "",

          savingsAccount: row.rekening_tabungan || "",

          loanAccount: row.rekening_kredit || "",

          loanStatus: row.status_pk || "AKTIF",

          /* --------------------------------------------------------------
             DEBITUR
          -------------------------------------------------------------- */

          namaDebitur: row.nama_debitur || "",

          nik: row.nomor_ktp || "",

          nomorHp: row.nomor_handphone || "",

          jenisKelamin: row.jenis_kelamin || "",

          penyebutanDebitur: row.penyebutan_debitur || "",

          /* --------------------------------------------------------------
             DATA DEBITUR - DATABASE LANGSUNG
          -------------------------------------------------------------- */

          nomor_handphone: row.nomor_handphone || "",

          jenis_kelamin: row.jenis_kelamin || "",

          penyebutan_debitur: row.penyebutan_debitur || "",

          /* --------------------------------------------------------------
             ALAMAT DEBITUR
          -------------------------------------------------------------- */

          rt: row.rt || "",

          rw: row.rw || "",

          alamatJalan: row.alamat_jalan || "",

          alamatDesaKelurahan: row.alamat_desa_kelurahan || "",

          alamatKecamatan: row.alamat_kecamatan || "",

          alamatKabupaten: row.alamat_kabupaten || "",

          /* --------------------------------------------------------------
             ALAMAT DEBITUR - DATABASE LANGSUNG
          -------------------------------------------------------------- */

          alamat_jalan: row.alamat_jalan || "",

          alamat_desa_kelurahan: row.alamat_desa_kelurahan || "",

          alamat_kecamatan: row.alamat_kecamatan || "",

          alamat_kabupaten: row.alamat_kabupaten || "",

          /* --------------------------------------------------------------
             DATA PASANGAN
             
             Data ini tetap dimuat walaupun status bukan MENIKAH.
             Modal yang menentukan kapan section-nya ditampilkan.
          -------------------------------------------------------------- */

          nama_pasangan: row.nama_pasangan || "",

          nomor_handphone_pasangan: row.nomor_handphone_pasangan || "",

          alamat_pasangan_sama_debitur:
            row.alamat_pasangan_sama_debitur ?? false,

          alamat_pasangan_jalan: row.alamat_pasangan_jalan || "",

          alamat_pasangan_rt: row.alamat_pasangan_rt || "",

          alamat_pasangan_rw: row.alamat_pasangan_rw || "",

          alamat_pasangan_desa_kelurahan:
            row.alamat_pasangan_desa_kelurahan || "",

          alamat_pasangan_kecamatan: row.alamat_pasangan_kecamatan || "",

          alamat_pasangan_kabupaten: row.alamat_pasangan_kabupaten || "",

          /* --------------------------------------------------------------
             COMPLETENESS
          -------------------------------------------------------------- */

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

  /* =========================================================================
     RELOAD KETIKA UNIT BERUBAH
  ========================================================================= */

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
      const id = pk.mksId || "TANPA_MKS";

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
      if (activeUnitUuid && pk.unitId && pk.unitId !== activeUnitUuid) {
        return false;
      }

      /* --------------------------------------------------------------
         GLOBAL SEARCH
      -------------------------------------------------------------- */

      if (query) {
        const searchableText = [
          pk.id,
          pk.nomor_pk,
          pk.nomor_aplikasi,
          pk.cif,
          pk.nama_debitur,
          pk.nomor_ktp,
          pk.nik,
          pk.rekening_tabungan,
          pk.rekening_kredit,
          pk.mksName,
          pk.mksAgentCode,
          pk.jenisPengajuanKredit,
          pk.jenis_pengajuan_kredit,
        ]
          .filter(Boolean)
          .join(" ");

        if (!normalizeText(searchableText).includes(query)) {
          return false;
        }
      }

      /* --------------------------------------------------------------
         PRODUK
      -------------------------------------------------------------- */

      if (
        productFilter !== "SEMUA" &&
        normalizeText(pk.jenisPengajuanKredit) !== normalizeText(productFilter)
      ) {
        return false;
      }

      /* --------------------------------------------------------------
         MKS
      -------------------------------------------------------------- */

      if (mksFilter !== "SEMUA") {
        const pkMksId = pk.mksId || "TANPA_MKS";

        if (pkMksId !== mksFilter) {
          return false;
        }
      }

      /* --------------------------------------------------------------
         LIMIT
      -------------------------------------------------------------- */

      if (
        limitFilter !== "SEMUA" &&
        getLimitBucket(pk.limitKredit) !== limitFilter
      ) {
        return false;
      }

      /* --------------------------------------------------------------
         BULAN
      -------------------------------------------------------------- */

      if (
        monthFilter !== "SEMUA" &&
        getDateMonth(pk.tanggalPk) !== monthFilter
      ) {
        return false;
      }

      /* --------------------------------------------------------------
         TAHUN
      -------------------------------------------------------------- */

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

    /*
      Untuk sementara tetap mengikuti behavior lama.
      Form tambah PK belum dibuat di PkDetailModal.
    */
  }

  /* =========================================================================
     SAVE KE SUPABASE
  ========================================================================= */

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
      const payload = buildPkUpdatePayload(updatedPk);

      if (!payload) {
        throw new Error("Data PK tidak dapat diproses.");
      }

      console.log("JOSJIS PK UPDATE:", updatedPk.id, payload);

      /* ================================================================
         UPDATE DATABASE
      ================================================================ */

      const updateResult = await supabase
        .from("pk")
        .update(payload)
        .eq("id", updatedPk.id)
        .select("*")
        .single();

      if (updateResult.error) {
        throw updateResult.error;
      }

      const savedRow = updateResult.data;

      if (!savedRow) {
        throw new Error(
          "Supabase tidak mengembalikan data PK setelah disimpan.",
        );
      }

      /* ================================================================
         UPDATE UI SEMENTARA
      ================================================================ */

      setPkRows((current) =>
        current.map((item) => {
          if (item.id !== savedRow.id) {
            return item;
          }

          return {
            ...item,
            ...savedRow,

            /* ----------------------------------------------------------
               MKS tidak disentuh
            ---------------------------------------------------------- */

            mksId: item.mksId || savedRow.mks_id || null,

            mksName: item.mksName || "-",

            mksAgentCode: item.mksAgentCode || "",

            /* ----------------------------------------------------------
               ALIAS PINJAMAN
            ---------------------------------------------------------- */

            loanType: savedRow.jenis_pengajuan_kredit || "",

            applicationNumber: savedRow.nomor_aplikasi || "",

            applicationDate: savedRow.tanggal_aplikasi || "",

            pkDate: savedRow.tanggal_pk || "",

            pkNumber: savedRow.nomor_pk || "",

            limit: savedRow.limit_kredit ?? "",

            tenor: savedRow.jangka_waktu ?? "",

            cif: savedRow.cif || "",

            savingsAccount: savedRow.rekening_tabungan || "",

            loanAccount: savedRow.rekening_kredit || "",

            loanStatus: savedRow.status_pk || "AKTIF",

            tanggalPk: savedRow.tanggal_pk || null,

            tanggalPeminjaman: savedRow.tanggal_aplikasi || null,

            jenisPengajuanKredit: savedRow.jenis_pengajuan_kredit || "",

            limitKredit: Number(savedRow.limit_kredit || 0),

            /* ----------------------------------------------------------
               DEBITUR
            ---------------------------------------------------------- */

            namaDebitur: savedRow.nama_debitur || "",

            nik: savedRow.nomor_ktp || "",

            nomorHp: savedRow.nomor_handphone || "",

            jenisKelamin: savedRow.jenis_kelamin || "",

            penyebutanDebitur: savedRow.penyebutan_debitur || "",

            nomor_handphone: savedRow.nomor_handphone || "",

            jenis_kelamin: savedRow.jenis_kelamin || "",

            penyebutan_debitur: savedRow.penyebutan_debitur || "",

            /* ----------------------------------------------------------
               ALAMAT DEBITUR
            ---------------------------------------------------------- */

            rt: savedRow.rt || "",

            rw: savedRow.rw || "",

            alamatJalan: savedRow.alamat_jalan || "",

            alamatDesaKelurahan: savedRow.alamat_desa_kelurahan || "",

            alamatKecamatan: savedRow.alamat_kecamatan || "",

            alamatKabupaten: savedRow.alamat_kabupaten || "",

            alamat_jalan: savedRow.alamat_jalan || "",

            alamat_desa_kelurahan: savedRow.alamat_desa_kelurahan || "",

            alamat_kecamatan: savedRow.alamat_kecamatan || "",

            alamat_kabupaten: savedRow.alamat_kabupaten || "",

            /* ----------------------------------------------------------
               DATA PASANGAN
            ---------------------------------------------------------- */

            nama_pasangan: savedRow.nama_pasangan || "",

            nomor_handphone_pasangan: savedRow.nomor_handphone_pasangan || "",

            alamat_pasangan_sama_debitur:
              savedRow.alamat_pasangan_sama_debitur ?? false,

            alamat_pasangan_jalan: savedRow.alamat_pasangan_jalan || "",

            alamat_pasangan_rt: savedRow.alamat_pasangan_rt || "",

            alamat_pasangan_rw: savedRow.alamat_pasangan_rw || "",

            alamat_pasangan_desa_kelurahan:
              savedRow.alamat_pasangan_desa_kelurahan || "",

            alamat_pasangan_kecamatan: savedRow.alamat_pasangan_kecamatan || "",

            alamat_pasangan_kabupaten: savedRow.alamat_pasangan_kabupaten || "",
          };
        }),
      );

      /* ================================================================
         UPDATE MODAL
      ================================================================ */

      setSelectedPk((current) => {
        if (!current || current.id !== savedRow.id) {
          return current;
        }

        return {
          ...current,
          ...savedRow,

          /* ------------------------------------------------------------
             MKS
          ------------------------------------------------------------ */

          mksId: current.mksId || savedRow.mks_id || null,

          mksName: current.mksName || "-",

          mksAgentCode: current.mksAgentCode || "",

          /* ------------------------------------------------------------
             PINJAMAN
          ------------------------------------------------------------ */

          loanType: savedRow.jenis_pengajuan_kredit || "",

          applicationNumber: savedRow.nomor_aplikasi || "",

          applicationDate: savedRow.tanggal_aplikasi || "",

          pkDate: savedRow.tanggal_pk || "",

          pkNumber: savedRow.nomor_pk || "",

          limit: savedRow.limit_kredit ?? "",

          tenor: savedRow.jangka_waktu ?? "",

          cif: savedRow.cif || "",

          savingsAccount: savedRow.rekening_tabungan || "",

          loanAccount: savedRow.rekening_kredit || "",

          loanStatus: savedRow.status_pk || "AKTIF",

          /* ------------------------------------------------------------
             DEBITUR
          ------------------------------------------------------------ */

          namaDebitur: savedRow.nama_debitur || "",

          nik: savedRow.nomor_ktp || "",

          nomorHp: savedRow.nomor_handphone || "",

          jenisKelamin: savedRow.jenis_kelamin || "",

          penyebutanDebitur: savedRow.penyebutan_debitur || "",

          nomor_handphone: savedRow.nomor_handphone || "",

          jenis_kelamin: savedRow.jenis_kelamin || "",

          penyebutan_debitur: savedRow.penyebutan_debitur || "",

          status_debitur: savedRow.status_debitur || "",

          /* ------------------------------------------------------------
             ALAMAT DEBITUR
          ------------------------------------------------------------ */

          rt: savedRow.rt || "",

          rw: savedRow.rw || "",

          alamat_jalan: savedRow.alamat_jalan || "",

          alamat_desa_kelurahan: savedRow.alamat_desa_kelurahan || "",

          alamat_kecamatan: savedRow.alamat_kecamatan || "",

          alamat_kabupaten: savedRow.alamat_kabupaten || "",

          alamatJalan: savedRow.alamat_jalan || "",

          alamatDesaKelurahan: savedRow.alamat_desa_kelurahan || "",

          alamatKecamatan: savedRow.alamat_kecamatan || "",

          alamatKabupaten: savedRow.alamat_kabupaten || "",

          /* ------------------------------------------------------------
             DATA PASANGAN
          ------------------------------------------------------------ */

          nama_pasangan: savedRow.nama_pasangan || "",

          nomor_handphone_pasangan: savedRow.nomor_handphone_pasangan || "",

          alamat_pasangan_sama_debitur:
            savedRow.alamat_pasangan_sama_debitur ?? false,

          alamat_pasangan_jalan: savedRow.alamat_pasangan_jalan || "",

          alamat_pasangan_rt: savedRow.alamat_pasangan_rt || "",

          alamat_pasangan_rw: savedRow.alamat_pasangan_rw || "",

          alamat_pasangan_desa_kelurahan:
            savedRow.alamat_pasangan_desa_kelurahan || "",

          alamat_pasangan_kecamatan: savedRow.alamat_pasangan_kecamatan || "",

          alamat_pasangan_kabupaten: savedRow.alamat_pasangan_kabupaten || "",
        };
      });

      setSuccessMessage("Data PK berhasil disimpan.");

      /* ================================================================
         LOAD ULANG DARI DATABASE
         
         Ini memastikan tampilan akhir benar-benar mengikuti Supabase.
      ================================================================ */

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

  /* =========================================================================
     SECTION ACTION
  ========================================================================= */

  function handleLockSection(payload) {
    console.log("Lock section:", payload);
  }

  function handleCorrection(payload) {
    console.log("Correction:", payload);
  }

  /* =========================================================================
     RESET FILTER
  ========================================================================= */

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

        {/* ================================================================
            SAVE SUCCESS
        ================================================================ */}

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
            {successMessage}
          </div>
        )}

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
                      <td className="px-3 py-3 align-middle">
                        <div className="whitespace-nowrap text-xs font-semibold text-zinc-800">
                          {formatDate(pk.tanggalPk)}
                        </div>
                      </td>

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

                      <td className="px-3 py-3 align-middle">
                        <div className="max-w-[230px] truncate text-xs font-semibold text-zinc-800">
                          {pk.nama_debitur || pk.namaDebitur || "-"}
                        </div>

                        {(pk.cif || pk.nomor_ktp || pk.nik) && (
                          <div className="mt-0.5 truncate text-[9px] text-zinc-400">
                            {pk.cif
                              ? `CIF ${pk.cif}`
                              : `NIK ${pk.nomor_ktp || pk.nik}`}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 align-middle">
                        <div className="whitespace-nowrap text-xs text-zinc-700">
                          {formatDate(pk.tanggalPeminjaman)}
                        </div>
                      </td>

                      <td className="px-3 py-3 align-middle">
                        <ProductBadge value={pk.jenisPengajuanKredit} />
                      </td>

                      <td className="px-3 py-3 text-center align-middle">
                        <span className="text-xs font-medium text-zinc-700">
                          {pk.tenor ? `${pk.tenor} bln` : "-"}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center align-middle">
                        <AgunanBadge value={pk.jumlahAgunan} />
                      </td>

                      <td className="px-3 py-3 text-right align-middle">
                        <div className="whitespace-nowrap text-xs font-bold text-zinc-800">
                          {formatCurrency(pk.limitKredit)}
                        </div>
                      </td>

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
                            disabled={saving}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 text-[10px] font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                        <td className="max-w-[110px] px-2.5 py-2.5 align-middle">
                          <div className="truncate text-[10px] font-bold text-zinc-800">
                            {formatMksName(pk.mksName)}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-2.5 py-2.5 align-middle">
                          <div className="text-[10px] font-medium text-zinc-600">
                            {formatDateShort(pk.tanggalPk)}
                          </div>
                        </td>

                        <td className="max-w-[180px] px-2.5 py-2.5 align-middle">
                          <div className="truncate text-[10px] font-semibold text-zinc-800">
                            {pk.nama_debitur || pk.namaDebitur || "-"}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-2.5 py-2.5 text-right align-middle">
                          <div className="text-[10px] font-bold text-zinc-800">
                            {formatCurrency(pk.limitKredit)}
                          </div>
                        </td>

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
