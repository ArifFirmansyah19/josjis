import { mapInsuranceRows, mapPkRow } from "./loanMapping";

import { fetchCollaterals } from "../collateral/collateralQuery";
import { syncCollaterals } from "../collateral/collateralService";
import { syncRelatedParties } from "../debtor/debtorService";
import { syncInsurance } from "../insurance/insuranceService";
import { groupRelatedPartiesByPk } from "../debtor/debtorMapping";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/**
 * Mengubah nilai filter menjadi angka halaman yang valid.
 */
function toPositiveInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/**
 * Menyiapkan nilai pencarian agar aman digunakan
 * dalam ekspresi filter PostgREST.
 */
function normalizeSearch(value) {
  return String(value ?? "")
    .trim()
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Mengambil PK dengan filter database dan pagination.
 *
 * filters:
 * - search
 * - productFilter
 * - limitFilter
 * - monthFilter
 * - yearFilter
 *
 * MKS dan data dari tabel relasi perlu difilter berdasarkan
 * struktur kolom database yang sebenarnya.
 */
export async function fetchPkData({
  supabase,
  activeUnitUuid,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  filters = {},
}) {
  if (!activeUnitUuid) {
    throw new Error("UUID unit tidak ditemukan.");
  }

  const safePage = toPositiveInteger(page, 1);
  const safePageSize = Math.min(
    MAX_PAGE_SIZE,
    toPositiveInteger(pageSize, DEFAULT_PAGE_SIZE),
  );

  const search = normalizeSearch(filters.search);

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  // Filter diterapkan sebelum pagination.
  let query = supabase
    .from("pk")
    .select("*", { count: "exact" })
    .eq("unit_id", activeUnitUuid);

  // Pencarian pada kolom-kolom tabel PK.
  // Pastikan nama kolom berikut sesuai dengan skema Supabase.
  if (search) {
    const pattern = `%${search}%`;

    query = query.or(
      [
        `nama_debitur.ilike.${pattern}`,
        `nomor_pk.ilike.${pattern}`,
        `nomor_aplikasi.ilike.${pattern}`,
        `cif.ilike.${pattern}`,
        `nomor_ktp.ilike.${pattern}`,
        `nik.ilike.${pattern}`,
        `rekening_tabungan.ilike.${pattern}`,
        `rekening_kredit.ilike.${pattern}`,
      ].join(","),
    );
  }

  // Filter produk.
  if (filters.productFilter && filters.productFilter !== "SEMUA") {
    query = query.eq("jenis_pengajuan_kredit", filters.productFilter);
  }

  // Filter limit.
  // Sesuaikan nama kolom dengan kolom nominal limit di database.
  if (filters.limitFilter && filters.limitFilter !== "SEMUA") {
    const limitRanges = {
      "100-200": { min: 100_000_000, max: 200_000_000 },
      "200-500": { min: 200_000_000, max: 500_000_000 },
      "DI ATAS 500": { min: 500_000_000, max: Infinity },
    };

    const range = limitRanges[filters.limitFilter];

    if (range) {
      query = query.gte("limit_kredit", range.min);

      if (Number.isFinite(range.max)) {
        query = query.lte("limit_kredit", range.max);
      }
    }
  }

  // Filter bulan dan tahun berdasarkan tanggal PK.
  // Pastikan kolom tanggal_pk tersedia pada tabel pk.
  if (filters.yearFilter && filters.yearFilter !== "SEMUA") {
    const year = Number(filters.yearFilter);

    if (Number.isInteger(year)) {
      query = query
        .gte("tanggal_pk", `${year}-01-01`)
        .lt("tanggal_pk", `${year + 1}-01-01`);
    }
  }

  if (filters.monthFilter && filters.monthFilter !== "SEMUA") {
    const month = Number(filters.monthFilter);
    const year = Number(filters.yearFilter);

    if (Number.isInteger(month) && month >= 1 && month <= 12) {
      if (Number.isInteger(year) && filters.yearFilter !== "SEMUA") {
        const start = `${year}-${String(month).padStart(2, "0")}-01`;

        const nextYear = month === 12 ? year + 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

        query = query.gte("tanggal_pk", start).lt("tanggal_pk", end);
      }
    }
  }

  // PK terbaru selalu di depan.
  const pkResult = await query
    .order("created_at", {
      ascending: false,
      nullsFirst: false,
    })
    .order("id", { ascending: false })
    .range(from, to);

  if (pkResult.error) {
    throw pkResult.error;
  }

  const rows = pkResult.data || [];
  const total = pkResult.count || 0;
  const totalPages = Math.ceil(total / safePageSize);

  const pagination = {
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
    from: total === 0 ? 0 : from + 1,
    to: Math.min(from + rows.length, total),
  };

  if (!rows.length) {
    return { rows: [], pagination };
  }

  const pkIds = rows.map((row) => row.id).filter(Boolean);

  const [
    relatedPartyResult,
    completenessResult,
    mksResult,
    pegawaiResult,
    collateralMap,
    insuranceResult,
  ] = await Promise.all([
    supabase
      .from("pk_related_party")
      .select(
        `
        id,
        pk_id,
        nama,
        nik,
        hubungan,
        alamat_jalan,
        alamat_rt,
        alamat_rw,
        alamat_desa_kelurahan,
        alamat_kecamatan,
        alamat_kabupaten,
        phone,
        has_account,
        cif,
        savings_account_number,
        street,
        rt,
        rw,
        village,
        district,
        regency,
        alamat_sama_debitur,
        created_at,
        updated_at
      `,
      )
      .in("pk_id", pkIds)
      .order("created_at", { ascending: true }),

    supabase
      .from("v_pk_completeness_final")
      .select(
        "pk_id, unit_id, mks_id, status_kelengkapan, dokumen_pk_lengkap, seluruh_agunan_lengkap, lengkap_di_co",
      )
      .in("pk_id", pkIds),

    supabase.from("mks").select("id, pegawai_id, kode_agen"),

    supabase.from("pegawai").select("*"),

    fetchCollaterals({ supabase, pkIds }),

    supabase.from("pk_asuransi").select("*").in("pk_id", pkIds),
  ]);

  if (insuranceResult.error) {
    throw insuranceResult.error;
  }

  const relatedPartyRows = relatedPartyResult.error
    ? []
    : relatedPartyResult.data || [];

  const completenessRows = completenessResult.error
    ? []
    : completenessResult.data || [];

  const mksRows = mksResult.error ? [] : mksResult.data || [];
  const pegawaiRows = pegawaiResult.error ? [] : pegawaiResult.data || [];

  const relatedPartyMap = groupRelatedPartiesByPk(relatedPartyRows);

  relatedPartyRows.forEach((party) => {
    if (!party?.pk_id) return;

    const key = String(party.pk_id);

    if (!relatedPartyMap.has(key)) {
      relatedPartyMap.set(key, []);
    }

    relatedPartyMap.get(key).push({
      id: party.id,
      nama: party.nama || "",
      nik: party.nik || "",
      hubungan: party.hubungan || "",
      phone: party.phone || "",
      has_account: Boolean(party.has_account),
      cif: party.cif || "",
      savings_account_number: party.savings_account_number || "",
      alamat_jalan: party.alamat_jalan ?? party.street ?? "",
      alamat_rt: party.alamat_rt ?? party.rt ?? "",
      alamat_rw: party.alamat_rw ?? party.rw ?? "",
      alamat_desa_kelurahan: party.alamat_desa_kelurahan ?? party.village ?? "",
      alamat_kecamatan: party.alamat_kecamatan ?? party.district ?? "",
      alamat_kabupaten: party.alamat_kabupaten ?? party.regency ?? "",
      alamat_sama_debitur: Boolean(party.alamat_sama_debitur),
    });
  });

  const completenessMap = new Map(
    completenessRows.map((item) => [String(item.pk_id), item]),
  );

  const pegawaiMap = new Map(pegawaiRows.map((row) => [String(row.id), row]));

  const mksMap = new Map();

  mksRows.forEach((mks) => {
    if (!mks?.id) return;

    const pegawai = mks.pegawai_id
      ? pegawaiMap.get(String(mks.pegawai_id))
      : null;

    mksMap.set(String(mks.id), {
      id: mks.id,
      name: pegawai?.nama_pegawai || pegawai?.nama || pegawai?.name || "-",
      code: mks.kode_agen || "",
    });
  });

  const insuranceRows = insuranceResult.data || [];

  const mappedRows = rows.map((row) => {
    const rowId = String(row.id);
    const completeness = completenessMap.get(rowId) || null;

    const mksId = row.mks_id || completeness?.mks_id || null;
    const mks = mksId ? mksMap.get(String(mksId)) : null;

    return mapPkRow({
      row,
      completeness,
      mks,
      collaterals: collateralMap.get(rowId) || [],
      relatedParties: relatedPartyMap.get(rowId) || [],
      insurance: mapInsuranceRows(insuranceRows, row.id),
    });
  });

  return {
    rows: mappedRows,
    pagination,
  };
}

export async function updatePkData({ supabase, pkId, payload }) {
  if (!pkId) {
    throw new Error("ID PK tidak ditemukan.");
  }

  if (!payload) {
    throw new Error("Payload PK tidak ditemukan.");
  }

  const {
    relatedParties = [],
    collaterals = [],
    insurance,
    ...pkPayload
  } = payload;

  const result = await supabase
    .from("pk")
    .update(pkPayload)
    .eq("id", pkId)
    .select("*")
    .single();

  if (result.error) {
    throw result.error;
  }

  if (!result.data) {
    throw new Error("Supabase tidak mengembalikan data PK setelah disimpan.");
  }

  await syncRelatedParties({
    supabase,
    pkId,
    relatedParties,
  });

  await syncCollaterals({
    supabase,
    pkId,
    collaterals,
  });

  await syncInsurance({
    supabase,
    pkId,
    insurance,
  });

  return result.data;
}
