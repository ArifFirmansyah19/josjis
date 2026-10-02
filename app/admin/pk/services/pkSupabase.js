/* ========================================================================
 * PK SUPABASE SERVICE
 * File:
 * app/admin/pk/services/pkSupabase.js
 * ====================================================================== */

/* ========================================================================
 * HELPER
 * ====================================================================== */

function textOrEmpty(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function nullableText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function nullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableDate(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function isUuid(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value),
  );
}

function generateFallbackOwnerId() {
  return `OWNER-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ========================================================================
 * MAPPING SERTIFIKAT
 * ====================================================================== */

function mapCertificateTypeToUi(value) {
  if (!value) return "Fisik";
  const normalized = String(value).trim().toLowerCase();
  if (
    normalized === "fisik" ||
    normalized === "physical" ||
    normalized === "fisik_sertifikat"
  ) {
    return "Fisik";
  }
  if (
    normalized === "elektronik" ||
    normalized === "electronic" ||
    normalized === "elektronik_sertifikat"
  ) {
    return "Elektronik";
  }
  return String(value);
}

/* ========================================================================
 * MAPPING LOKASI SERTIFIKAT
 * ====================================================================== */

function mapCertificateLocationToUi(pkAgunan, agunan) {
  const lokasi = String(pkAgunan?.lokasi_fisik || "")
    .trim()
    .toUpperCase();

  if (lokasi === "DEBITUR") return "DIBAWA_DEBITUR";
  if (lokasi === "CO") return "PERLU_ORDER_CO";
  if (lokasi === "CABANG") return "DI_CABANG";
  if (lokasi === "NOTARIS") return "DI_NOTARIS";

  const source = String(agunan?.sumber_fisik_sertifikat || "")
    .trim()
    .toLowerCase();

  if (source.includes("dibawa debitur")) return "DIBAWA_DEBITUR";
  if (source.includes("order")) return "PERLU_ORDER_CO";
  if (source.includes("notaris")) return "DI_NOTARIS";
  if (source.includes("cabang")) return "DI_CABANG";

  return "DI_CABANG";
}

/* ========================================================================
 * MAPPING AGUNAN → UI
 * ====================================================================== */

function mapCollateralToUi({ pkAgunan, agunan, owners, binding, notary }) {
  const type = pkAgunan?.jenis_agunan || agunan?.jenis_agunan || "SHM";

  const isBpkb = String(type).toUpperCase() === "BPKB";

  const ownerRows = Array.isArray(owners)
    ? owners
        .map((owner) => ({
          id: owner.id || generateFallbackOwnerId(),
          nama: textOrEmpty(owner.nama),
          nik: textOrEmpty(owner.nik),
          hubungan: textOrEmpty(owner.hubungan),
        }))
        .filter((owner) => owner.nama)
    : [];

  const firstOwner = ownerRows[0] || null;

  const number = isBpkb
    ? textOrEmpty(agunan?.nomor_bpkb ?? pkAgunan?.nomor_bpkb ?? "")
    : textOrEmpty(agunan?.nomor_sertifikat ?? pkAgunan?.nomor_sertifikat ?? "");

  const isReusedAgunan = Boolean(pkAgunan?.pernah_agunan_pinjaman_lama);

  return {
    id: pkAgunan?.id || null,
    pkAgunanId: pkAgunan?.id || null,
    agunanId: pkAgunan?.agunan_id || null,
    type,
    number,
    certificateType: mapCertificateTypeToUi(agunan?.certificate_type),
    certificateLocation: mapCertificateLocationToUi(pkAgunan, agunan),
    area: pkAgunan?.luas_tanah ?? agunan?.luas ?? "",
    bookDate:
      pkAgunan?.tanggal_terbit_sertifikat ?? agunan?.tanggal_terbit ?? "",
    owner: firstOwner?.nama ?? textOrEmpty(pkAgunan?.nama_pemilik),
    owners: ownerRows,
    relationship:
      firstOwner?.hubungan ?? textOrEmpty(pkAgunan?.hubungan_dengan_debitur),
    value: pkAgunan?.nilai_agunan ?? agunan?.nilai_agunan ?? "",
    address: {
      village: pkAgunan?.desa_kelurahan ?? agunan?.alamat_desa_kelurahan ?? "",
      district: pkAgunan?.kecamatan ?? agunan?.alamat_kecamatan ?? "",
      regency: pkAgunan?.kabupaten ?? agunan?.alamat_kabupaten ?? "",
    },
    note: textOrEmpty(agunan?.catatan),
    binding: {
      type:
        binding?.actual_type ??
        binding?.required_type ??
        pkAgunan?.status_pengikatan ??
        "TIDAK_ADA",
      notaryId: binding?.notaris_id || null,
      notaryName: notary?.nama_notaris || "",
      notaryCode: "",
      fee: binding?.biaya ?? pkAgunan?.nilai_pengikatan ?? "",
      outgoingLetterNumber: "",
      note: textOrEmpty(binding?.catatan),
      status: textOrEmpty(binding?.status) || "BELUM_DIPROSES",
    },
    statusOrder: pkAgunan?.status_order ?? null,
    statusMigrasi: pkAgunan?.status_migrasi ?? null,
    statusDokumen: pkAgunan?.status_dokumen ?? null,
    statusAgunan: pkAgunan?.status_agunan ?? null,
    lokasiFisik: pkAgunan?.lokasi_fisik ?? null,
    lokasiKeterangan: pkAgunan?.lokasi_keterangan ?? null,
    peranAgunan: pkAgunan?.peran_agunan ?? null,
    pernahAgunanPinjamanLama: isReusedAgunan,
    isReusedAgunan,
  };
}

/* ========================================================================
 * FETCH COLLATERALS
 * ====================================================================== */

async function fetchCollaterals({ supabase, pkIds }) {
  if (!Array.isArray(pkIds) || !pkIds.length) {
    return new Map();
  }

  const pkAgunanResult = await supabase
    .from("pk_agunan")
    .select("*")
    .in("pk_id", pkIds)
    .order("urutan", {
      ascending: true,
    });

  if (pkAgunanResult.error) {
    console.warn("Data pk_agunan gagal dimuat:", pkAgunanResult.error);
    return new Map();
  }

  const pkAgunanRows = pkAgunanResult.data || [];

  if (!pkAgunanRows.length) {
    return new Map();
  }

  const agunanIds = [
    ...new Set(pkAgunanRows.map((row) => row.agunan_id).filter(Boolean)),
  ];

  let agunanRows = [];

  if (agunanIds.length) {
    const agunanResult = await supabase
      .from("agunan")
      .select("*")
      .in("id", agunanIds);

    if (agunanResult.error) {
      console.warn("Master agunan gagal dimuat:", agunanResult.error);
    } else {
      agunanRows = agunanResult.data || [];
    }
  }

  const agunanMap = new Map(agunanRows.map((row) => [String(row.id), row]));

  let ownerRows = [];

  if (agunanIds.length) {
    const ownerResult = await supabase
      .from("agunan_pemilik")
      .select("*")
      .in("agunan_id", agunanIds)
      .order("is_primary", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      });

    if (ownerResult.error) {
      console.warn("Pemilik agunan gagal dimuat:", ownerResult.error);
    } else {
      ownerRows = ownerResult.data || [];
    }
  }

  const ownerMap = new Map();

  ownerRows.forEach((owner) => {
    if (!owner?.agunan_id) return;

    const key = String(owner.agunan_id);

    if (!ownerMap.has(key)) {
      ownerMap.set(key, []);
    }

    ownerMap.get(key).push(owner);
  });

  const pkAgunanIds = pkAgunanRows.map((row) => row.id).filter(Boolean);

  let bindingRows = [];

  if (pkAgunanIds.length) {
    const bindingResult = await supabase
      .from("agunan_pengikatan")
      .select("*")
      .in("pk_agunan_id", pkAgunanIds)
      .order("created_at", {
        ascending: true,
      });

    if (bindingResult.error) {
      console.warn("Pengikatan agunan gagal dimuat:", bindingResult.error);
    } else {
      bindingRows = bindingResult.data || [];
    }
  }

  const bindingMap = new Map();

  bindingRows.forEach((binding) => {
    if (!binding?.pk_agunan_id) return;

    const key = String(binding.pk_agunan_id);

    if (!bindingMap.has(key)) {
      bindingMap.set(key, binding);
    }
  });

  const notaryIds = [
    ...new Set(bindingRows.map((binding) => binding.notaris_id).filter(isUuid)),
  ];

  let notaryRows = [];

  if (notaryIds.length) {
    const notaryResult = await supabase
      .from("notaris")
      .select("id, nama_notaris")
      .in("id", notaryIds);

    if (notaryResult.error) {
      console.warn("Master notaris gagal dimuat:", notaryResult.error);
    } else {
      notaryRows = notaryResult.data || [];
    }
  }

  const notaryMap = new Map(notaryRows.map((row) => [String(row.id), row]));

  const collateralMap = new Map();

  pkAgunanRows.forEach((pkAgunan) => {
    if (!pkAgunan?.pk_id) return;

    const pkId = String(pkAgunan.pk_id);

    if (!collateralMap.has(pkId)) {
      collateralMap.set(pkId, []);
    }

    const agunan = pkAgunan.agunan_id
      ? agunanMap.get(String(pkAgunan.agunan_id))
      : null;

    const owners = pkAgunan.agunan_id
      ? ownerMap.get(String(pkAgunan.agunan_id)) || []
      : [];

    const binding = pkAgunan.id
      ? bindingMap.get(String(pkAgunan.id)) || null
      : null;

    const notary = binding?.notaris_id
      ? notaryMap.get(String(binding.notaris_id)) || null
      : null;

    collateralMap.get(pkId).push(
      mapCollateralToUi({
        pkAgunan,
        agunan,
        owners,
        binding,
        notary,
      }),
    );
  });

  return collateralMap;
}

/* ========================================================================
 * FETCH MASTER NOTARIS
 * ====================================================================== */

export async function fetchNotaries({ supabase }) {
  const result = await supabase
    .from("notaris")
    .select(
      "id, nama_notaris, provinsi, kabupaten, nomor_rekening, jenis_rekanan",
    )
    .order("nama_notaris", {
      ascending: true,
    });

  if (result.error) {
    throw result.error;
  }

  return result.data || [];
}

/* ========================================================================
 * FETCH PK DATA
 * ====================================================================== */

export async function fetchPkData({ supabase, activeUnitUuid }) {
  if (!activeUnitUuid) {
    throw new Error("UUID unit tidak ditemukan.");
  }

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
    return [];
  }

  const pkIds = rows.map((row) => row.id).filter(Boolean);

  let relatedPartyRows = [];

  if (pkIds.length) {
    const relatedPartyResult = await supabase
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
      .order("created_at", {
        ascending: true,
      });

    if (relatedPartyResult.error) {
      console.warn("Pihak Terkait gagal dimuat:", relatedPartyResult.error);
    } else {
      relatedPartyRows = relatedPartyResult.data || [];
    }
  }

  const relatedPartyMap = new Map();

  relatedPartyRows.forEach((party) => {
    if (!party?.pk_id) return;

    if (!relatedPartyMap.has(party.pk_id)) {
      relatedPartyMap.set(party.pk_id, []);
    }

    relatedPartyMap.get(party.pk_id).push({
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

  const mksResult = await supabase
    .from("mks")
    .select("id, pegawai_id, kode_agen");

  if (mksResult.error) {
    console.warn("Master MKS gagal:", mksResult.error);
  }

  const mksRows = mksResult.data || [];

  const pegawaiResult = await supabase.from("pegawai").select("*");

  if (pegawaiResult.error) {
    console.warn("Master pegawai gagal:", pegawaiResult.error);
  }

  const pegawaiRows = pegawaiResult.data || [];

  const pegawaiMap = new Map();

  pegawaiRows.forEach((pegawai) => {
    if (!pegawai?.id) return;

    pegawaiMap.set(pegawai.id, pegawai);
  });

  const mksMap = new Map();

  mksRows.forEach((mks) => {
    if (!mks?.id) return;

    const pegawai = mks.pegawai_id ? pegawaiMap.get(mks.pegawai_id) : null;

    const name = pegawai?.nama_pegawai || pegawai?.nama || pegawai?.name || "-";

    const code = mks.kode_agen || "";

    mksMap.set(mks.id, {
      id: mks.id,
      name,
      code,
    });
  });

  let collateralMap = new Map();

  if (pkIds.length) {
    collateralMap = await fetchCollaterals({
      supabase,
      pkIds,
    });
  }

  return rows.map((row) => {
    const completeness = completenessMap.get(row.id) || null;

    const mksId = row.mks_id || completeness?.mks_id || null;

    const mks = mksId ? mksMap.get(mksId) : null;

    const loanType = row.jenis_pengajuan_kredit || "";

    const tanggalPk = row.tanggal_pk || null;

    const tanggalPeminjaman = row.tanggal_aplikasi || null;

    const tenor = row.jangka_waktu ?? null;

    const limit = row.limit_kredit ?? 0;

    const collaterals = collateralMap.get(String(row.id)) || [];

    const jumlahAgunan =
      row.jumlah_agunan ??
      row.total_agunan ??
      row.agunan_count ??
      row.jumlahAgunan ??
      collaterals.length;

    const relatedParties = relatedPartyMap.get(row.id) || [];

    return {
      ...row,
      id: row.id,
      unitId: row.unit_id,
      mksId,
      mksName: mks?.name || "-",
      mksAgentCode: mks?.code || "",
      tanggalPk,
      tanggalPeminjaman,
      jenisPengajuanKredit: loanType,
      tenor,
      limitKredit: Number(limit || 0),
      jumlahAgunan,
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
      namaDebitur: row.nama_debitur || "",
      nik: row.nomor_ktp || "",
      nomorHp: row.nomor_handphone || "",
      jenisKelamin: row.jenis_kelamin || "",
      penyebutanDebitur: row.penyebutan_debitur || "",
      nomor_handphone: row.nomor_handphone || "",
      jenis_kelamin: row.jenis_kelamin || "",
      penyebutan_debitur: row.penyebutan_debitur || "",
      rt: row.rt || "",
      rw: row.rw || "",
      alamatJalan: row.alamat_jalan || "",
      alamatDesaKelurahan: row.alamat_desa_kelurahan || "",
      alamatKecamatan: row.alamat_kecamatan || "",
      alamatKabupaten: row.alamat_kabupaten || "",
      alamat_jalan: row.alamat_jalan || "",
      alamat_desa_kelurahan: row.alamat_desa_kelurahan || "",
      alamat_kecamatan: row.alamat_kecamatan || "",
      alamat_kabupaten: row.alamat_kabupaten || "",
      nama_pasangan: row.nama_pasangan || "",
      nik_pasangan: row.nik_pasangan || "",
      nomor_handphone_pasangan: row.nomor_handphone_pasangan || "",
      alamat_pasangan_sama_debitur: row.alamat_pasangan_sama_debitur ?? false,
      alamat_pasangan_jalan: row.alamat_pasangan_jalan || "",
      alamat_pasangan_rt: row.alamat_pasangan_rt || "",
      alamat_pasangan_rw: row.alamat_pasangan_rw || "",
      alamat_pasangan_desa_kelurahan: row.alamat_pasangan_desa_kelurahan || "",
      alamat_pasangan_kecamatan: row.alamat_pasangan_kecamatan || "",
      alamat_pasangan_kabupaten: row.alamat_pasangan_kabupaten || "",
      relatedParties,
      collaterals,
      statusKelengkapan: completeness?.status_kelengkapan || null,
      dokumenPkLengkap: completeness?.dokumen_pk_lengkap ?? false,
      seluruhAgunanLengkap: completeness?.seluruh_agunan_lengkap ?? false,
      lengkapDiCo: completeness?.lengkap_di_co ?? false,
    };
  });
}

/* ========================================================================
 * UPDATE PK
 * ====================================================================== */

export async function updatePkData({ supabase, pkId, payload }) {
  if (!pkId) {
    throw new Error("ID PK tidak ditemukan.");
  }

  if (!payload) {
    throw new Error("Payload PK tidak ditemukan.");
  }

  const relatedParties = Array.isArray(payload.relatedParties)
    ? payload.relatedParties
    : [];

  const collaterals = Array.isArray(payload.collaterals)
    ? payload.collaterals
    : [];

  const {
    relatedParties: _ignoredRelatedParties,
    collaterals: _ignoredCollaterals,
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

  return result.data;
}

/* ========================================================================
 * SYNC PIHAK TERKAIT
 * ====================================================================== */

async function syncRelatedParties({ supabase, pkId, relatedParties }) {
  if (!pkId) {
    throw new Error("ID PK diperlukan untuk menyimpan Pihak Terkait.");
  }

  const desiredParties = Array.isArray(relatedParties) ? relatedParties : [];

  const existingResult = await supabase
    .from("pk_related_party")
    .select("id, pk_id")
    .eq("pk_id", pkId);

  if (existingResult.error) {
    throw existingResult.error;
  }

  const existingRows = existingResult.data || [];

  const existingMap = new Map(existingRows.map((row) => [String(row.id), row]));

  for (const party of desiredParties) {
    if (!party?.nama?.trim()) {
      throw new Error("Nama Pihak Terkait wajib diisi.");
    }
  }

  const desiredExistingIds = new Set(
    desiredParties
      .map((party) => party?.id)
      .filter((id) => id && existingMap.has(String(id)))
      .map((id) => String(id)),
  );

  const idsToDelete = existingRows
    .filter((row) => !desiredExistingIds.has(String(row.id)))
    .map((row) => row.id);

  if (idsToDelete.length) {
    const deleteResult = await supabase
      .from("pk_related_party")
      .delete()
      .eq("pk_id", pkId)
      .in("id", idsToDelete);

    if (deleteResult.error) {
      throw deleteResult.error;
    }
  }

  for (const party of desiredParties) {
    const partyId = party?.id ? String(party.id) : "";

    const partyPayload = {
      pk_id: pkId,
      nama: party.nama?.trim() || "",
      nik: party.nik?.trim() || null,
      hubungan: party.hubungan?.trim() || null,
      phone: party.phone?.trim() || null,
      has_account: Boolean(party.has_account),
      cif: party.has_account ? party.cif?.trim() || null : null,
      savings_account_number: party.has_account
        ? party.savings_account_number?.trim() || null
        : null,
      alamat_jalan: party.alamat_jalan?.trim() || null,
      alamat_rt: party.alamat_rt?.trim() || null,
      alamat_rw: party.alamat_rw?.trim() || null,
      alamat_desa_kelurahan: party.alamat_desa_kelurahan?.trim() || null,
      alamat_kecamatan: party.alamat_kecamatan?.trim() || null,
      alamat_kabupaten: party.alamat_kabupaten?.trim() || null,
      alamat_sama_debitur: Boolean(party.alamat_sama_debitur),
      street: null,
      rt: null,
      rw: null,
      village: null,
      district: null,
      regency: null,
      updated_at: new Date().toISOString(),
    };

    if (partyId && existingMap.has(partyId)) {
      const updateResult = await supabase
        .from("pk_related_party")
        .update(partyPayload)
        .eq("id", partyId)
        .eq("pk_id", pkId);

      if (updateResult.error) {
        throw updateResult.error;
      }

      continue;
    }

    const insertResult = await supabase
      .from("pk_related_party")
      .insert(partyPayload)
      .select("*")
      .single();

    if (insertResult.error) {
      throw insertResult.error;
    }

    if (!insertResult.data) {
      throw new Error("Pihak Terkait baru gagal disimpan.");
    }
  }
}

/* ========================================================================
 * NORMALIZE COLLATERAL UNTUK SAVE
 * ====================================================================== */

function normalizeCollateralForSave(collateral) {
  const rawOwners = Array.isArray(collateral?.owners) ? collateral.owners : [];

  let owners = rawOwners
    .map((owner) => ({
      id: owner?.id || null,
      nama: nullableText(owner?.nama),
      nik: nullableText(owner?.nik),
      hubungan: nullableText(owner?.hubungan),
    }))
    .filter((owner) => owner.nama);

  if (owners.length === 0 && nullableText(collateral?.owner)) {
    owners = [
      {
        id: null,
        nama: nullableText(collateral.owner),
        nik: nullableText(collateral?.ownerNik),
        hubungan: nullableText(collateral?.relationship),
      },
    ];
  }

  return {
    id: collateral?.id || null,
    pkAgunanId: collateral?.pkAgunanId || null,
    agunanId: collateral?.agunanId || null,
    type: nullableText(collateral?.type),
    number: nullableText(collateral?.number),
    certificateType: nullableText(collateral?.certificateType),
    certificateLocation: nullableText(collateral?.certificateLocation),
    area: nullableNumber(collateral?.area),
    bookDate: nullableDate(collateral?.bookDate),
    owners,
    owner: nullableText(collateral?.owner),
    relationship: nullableText(collateral?.relationship),
    value: nullableNumber(collateral?.value),
    address: {
      village: nullableText(collateral?.address?.village),
      district: nullableText(collateral?.address?.district),
      regency: nullableText(collateral?.address?.regency),
    },
    note: nullableText(collateral?.note),
    binding: {
      type: nullableText(collateral?.binding?.type) || "TIDAK_ADA",
      notaryId: isUuid(collateral?.binding?.notaryId)
        ? collateral.binding.notaryId
        : null,
      notaryName: nullableText(collateral?.binding?.notaryName),
      notaryCode: nullableText(collateral?.binding?.notaryCode),
      fee: nullableNumber(collateral?.binding?.fee),
      outgoingLetterNumber: nullableText(
        collateral?.binding?.outgoingLetterNumber,
      ),
      note: nullableText(collateral?.binding?.note),
      status: nullableText(collateral?.binding?.status) || "BELUM_DIPROSES",
    },
    statusOrder: nullableText(collateral?.statusOrder),
    statusMigrasi: nullableText(collateral?.statusMigrasi),
    statusDokumen: nullableText(collateral?.statusDokumen),
    statusAgunan: nullableText(collateral?.statusAgunan),
    lokasiFisik: nullableText(collateral?.lokasiFisik),
    lokasiKeterangan: nullableText(collateral?.lokasiKeterangan),
    peranAgunan: nullableText(collateral?.peranAgunan),
    pernahAgunanPinjamanLama: Boolean(
      collateral?.pernahAgunanPinjamanLama ||
      collateral?.isReusedAgunan ||
      collateral?.isReused ||
      collateral?.reuseFromLoanId,
    ),
    isReusedAgunan: Boolean(
      collateral?.isReusedAgunan ||
      collateral?.isReused ||
      collateral?.reuseFromLoanId,
    ),
    reuseFromLoanId: collateral?.reuseFromLoanId || null,
  };
}

/* ========================================================================
 * VALIDASI AGUNAN
 * ====================================================================== */

function validateCollateral(collateral, index) {
  if (!collateral) {
    throw new Error(`Data Agunan ke-${index + 1} tidak valid.`);
  }

  const type = String(collateral.type || "")
    .trim()
    .toUpperCase();

  if (type !== "SHM" && type !== "BPKB") {
    throw new Error(`Jenis Agunan ke-${index + 1} harus SHM atau BPKB.`);
  }

  if (!collateral.number) {
    throw new Error(`Nomor ${type} Agunan ke-${index + 1} wajib diisi.`);
  }

  if (!Array.isArray(collateral.owners) || collateral.owners.length === 0) {
    throw new Error(`Pemilik Agunan ke-${index + 1} wajib diisi.`);
  }

  if (!collateral.owners.some((owner) => owner?.nama?.trim())) {
    throw new Error(`Nama Pemilik Agunan ke-${index + 1} wajib diisi.`);
  }

  if (collateral.isReusedAgunan && !collateral.agunanId) {
    throw new Error(
      `Agunan pinjaman lama ke-${index + 1} tidak memiliki ID master agunan.`,
    );
  }
}

/* ========================================================================
 * MAPPING LOKASI KE DATABASE
 * ====================================================================== */

function mapLocationToDb(certificateLocation) {
  switch (certificateLocation) {
    case "DIBAWA_DEBITUR":
      return {
        lokasiFisik: "DEBITUR",
        sumber: "Dibawa Debitur saat PK",
      };

    case "PERLU_ORDER_CO":
      return {
        lokasiFisik: "CO",
        sumber: "Perlu di-order dari CO",
      };

    case "DI_NOTARIS":
      return {
        lokasiFisik: "NOTARIS",
        sumber: "Di Notaris",
      };

    case "DI_CABANG":
    default:
      return {
        lokasiFisik: "CABANG",
        sumber: "Di Cabang",
      };
  }
}

/* ========================================================================
 * MAPPING CERTIFICATE TYPE
 * ====================================================================== */

function mapCertificateTypeToDb(value) {
  if (!value) return null;

  const normalized = String(value).trim().toUpperCase();

  if (normalized === "FISIK") {
    return "FISIK";
  }

  if (normalized === "ELEKTRONIK") {
    return "ELEKTRONIK";
  }

  return normalized;
}

/* ========================================================================
 * BUILD CATATAN PENGIKATAN
 * ====================================================================== */

function buildBindingNote(binding) {
  const parts = [];

  if (binding?.notaryName) {
    parts.push(`Notaris: ${binding.notaryName}`);
  }

  if (binding?.notaryCode) {
    parts.push(`Kode Notaris: ${binding.notaryCode}`);
  }

  if (binding?.outgoingLetterNumber) {
    parts.push(
      `No Surat Keluar Order Notaris: ${binding.outgoingLetterNumber}`,
    );
  }

  if (binding?.note) {
    parts.push(`Catatan: ${binding.note}`);
  }

  return parts.join(" | ") || null;
}

/* ========================================================================
 * SYNC PEMILIK AGUNAN
 * ====================================================================== */

async function syncAgunanOwners({ supabase, agunanId, owners }) {
  if (!agunanId) {
    throw new Error("ID Agunan diperlukan untuk menyimpan pemilik.");
  }

  const desiredOwners = Array.isArray(owners)
    ? owners.filter((owner) => owner?.nama?.trim())
    : [];

  if (!desiredOwners.length) {
    throw new Error("Minimal satu Pemilik Agunan harus diisi.");
  }

  const existingResult = await supabase
    .from("agunan_pemilik")
    .select("id")
    .eq("agunan_id", agunanId);

  if (existingResult.error) {
    throw existingResult.error;
  }

  const existingRows = existingResult.data || [];

  if (existingRows.length) {
    const deleteResult = await supabase
      .from("agunan_pemilik")
      .delete()
      .eq("agunan_id", agunanId);

    if (deleteResult.error) {
      throw deleteResult.error;
    }
  }

  const now = new Date().toISOString();

  const ownerPayload = desiredOwners.map((owner, index) => ({
    agunan_id: agunanId,
    nama: owner.nama.trim(),
    nik: owner.nik?.trim() || null,
    hubungan: owner.hubungan?.trim() || null,
    is_primary: index === 0,
    created_at: now,
    updated_at: now,
  }));

  const insertResult = await supabase
    .from("agunan_pemilik")
    .insert(ownerPayload);

  if (insertResult.error) {
    throw insertResult.error;
  }
}

/* ========================================================================
 * LOAD MASTER AGUNAN + PEMILIK
 *
 * Dipakai khusus ketika reuse.
 * Tujuannya supaya snapshot PK baru memakai data master lama,
 * bukan data form yang mungkin belum lengkap.
 * ====================================================================== */

async function fetchMasterAgunanForReuse({ supabase, agunanId }) {
  if (!agunanId || !isUuid(agunanId)) {
    throw new Error("ID master agunan untuk reuse tidak valid.");
  }

  const agunanResult = await supabase
    .from("agunan")
    .select("*")
    .eq("id", agunanId)
    .single();

  if (agunanResult.error) {
    throw agunanResult.error;
  }

  if (!agunanResult.data) {
    throw new Error("Master agunan lama tidak ditemukan.");
  }

  const ownerResult = await supabase
    .from("agunan_pemilik")
    .select(
      "id, agunan_id, nama, nik, hubungan, is_primary, created_at, updated_at",
    )
    .eq("agunan_id", agunanId)
    .order("is_primary", {
      ascending: false,
    })
    .order("created_at", {
      ascending: true,
    });

  if (ownerResult.error) {
    throw ownerResult.error;
  }

  return {
    agunan: agunanResult.data,
    owners: ownerResult.data || [],
  };
}

/* ========================================================================
 * SYNC PENGIKATAN
 * ====================================================================== */

async function syncAgunanBinding({ supabase, pkAgunanId, binding }) {
  if (!pkAgunanId) {
    throw new Error("ID PK Agunan diperlukan untuk menyimpan pengikatan.");
  }

  const bindingData = binding || {};

  const bindingType = nullableText(bindingData.type) || "TIDAK_ADA";

  const allowedTypes = ["TIDAK_ADA", "MORAL_OBLIGATION", "SKMHT", "APHT"];

  if (!allowedTypes.includes(bindingType)) {
    throw new Error(`Jenis pengikatan "${bindingType}" tidak dikenali.`);
  }

  const existingResult = await supabase
    .from("agunan_pengikatan")
    .select("*")
    .eq("pk_agunan_id", pkAgunanId)
    .order("created_at", {
      ascending: true,
    });

  if (existingResult.error) {
    throw existingResult.error;
  }

  const existingRows = existingResult.data || [];

  const existing = existingRows[0] || null;

  const notaryId = isUuid(bindingData.notaryId)
    ? bindingData.notaryId
    : existing?.notaris_id || null;

  const payload = {
    pk_agunan_id: pkAgunanId,

    required_type: bindingType,

    actual_type: bindingType === "TIDAK_ADA" ? null : bindingType,

    status: nullableText(bindingData.status) || "BELUM_DIPROSES",

    notaris_id: bindingType === "TIDAK_ADA" ? null : notaryId,

    nomor_surat_keluar_id: existing?.nomor_surat_keluar_id || null,

    nomor_pengikatan: existing?.nomor_pengikatan || null,

    tanggal_pengikatan: existing?.tanggal_pengikatan || null,

    biaya: nullableNumber(bindingData.fee),

    tanggal_selesai: existing?.tanggal_selesai || null,

    catatan: buildBindingNote(bindingData),

    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const updateResult = await supabase
      .from("agunan_pengikatan")
      .update(payload)
      .eq("id", existing.id)
      .eq("pk_agunan_id", pkAgunanId);

    if (updateResult.error) {
      throw updateResult.error;
    }

    return;
  }

  const insertResult = await supabase.from("agunan_pengikatan").insert(payload);

  if (insertResult.error) {
    throw insertResult.error;
  }
}

/* ========================================================================
 * SYNC COLLATERALS
 * ====================================================================== */

async function syncCollaterals({ supabase, pkId, collaterals }) {
  if (!pkId) {
    throw new Error("ID PK diperlukan untuk menyimpan Agunan.");
  }

  const desiredCollaterals = Array.isArray(collaterals)
    ? collaterals.filter(Boolean).map(normalizeCollateralForSave)
    : [];

  desiredCollaterals.forEach((collateral, index) => {
    validateCollateral(collateral, index);
  });

  const existingResult = await supabase
    .from("pk_agunan")
    .select("*")
    .eq("pk_id", pkId)
    .order("urutan", {
      ascending: true,
    });

  if (existingResult.error) {
    throw existingResult.error;
  }

  const existingRows = existingResult.data || [];

  const existingMap = new Map();

  existingRows.forEach((row) => {
    if (row?.id) {
      existingMap.set(String(row.id), row);
    }
  });

  const usedPkAgunanIds = new Set();

  for (let index = 0; index < desiredCollaterals.length; index += 1) {
    const collateral = desiredCollaterals[index];

    const type = String(collateral.type || "")
      .trim()
      .toUpperCase();

    /*
     * ================================================================
     * CARI RELASI PK SAAT INI
     *
     * HANYA menggunakan pkAgunanId / id.
     *
     * TIDAK menggunakan agunanId.
     * ================================================================
     */

    let existingPkAgunan = null;

    if (collateral.pkAgunanId && isUuid(collateral.pkAgunanId)) {
      existingPkAgunan = existingMap.get(String(collateral.pkAgunanId)) || null;
    }

    if (!existingPkAgunan && collateral.id && isUuid(collateral.id)) {
      existingPkAgunan = existingMap.get(String(collateral.id)) || null;
    }

    const hasExistingCurrentRelation = Boolean(existingPkAgunan?.id);

    /*
     * ================================================================
     * TENTUKAN REUSE
     * ================================================================
     */

    const hasExistingMaster = Boolean(
      collateral.agunanId && isUuid(collateral.agunanId),
    );

    const isExplicitReuse = Boolean(
      collateral.isReusedAgunan ||
      collateral.pernahAgunanPinjamanLama ||
      collateral.isReused ||
      collateral.reuseFromLoanId,
    );

    /*
     * Reuse hanya terjadi jika:
     * - master agunan sudah ada
     * - bukan relasi PK saat ini
     * - user/UI menandai sebagai reuse
     */
    const isReusedAgunan = Boolean(
      hasExistingMaster && !hasExistingCurrentRelation && isExplicitReuse,
    );

    /*
     * ================================================================
     * TENTUKAN MASTER AGUNAN
     * ================================================================
     */

    let agunanId = existingPkAgunan?.agunan_id || null;

    if (!agunanId && hasExistingMaster) {
      agunanId = collateral.agunanId;
    }

    /*
     * Untuk reuse, ambil master lama.
     */
    let reuseMaster = null;

    if (isReusedAgunan) {
      reuseMaster = await fetchMasterAgunanForReuse({
        supabase,
        agunanId,
      });
    }

    const location = mapLocationToDb(collateral.certificateLocation);

    const certificateType = mapCertificateTypeToDb(collateral.certificateType);

    const isBpkb = type === "BPKB";

    /*
     * ================================================================
     * MASTER DATA YANG AKAN DIGUNAKAN
     * ================================================================
     *
     * Jika reuse:
     *   gunakan data master lama.
     *
     * Jika bukan reuse:
     *   gunakan data dari form.
     */

    const sourceAgunan = isReusedAgunan ? reuseMaster?.agunan || null : null;

    const effectiveNumber = isReusedAgunan
      ? (isBpkb ? sourceAgunan?.nomor_bpkb : sourceAgunan?.nomor_sertifikat) ||
        collateral.number
      : collateral.number;

    const effectiveCertificateType = isReusedAgunan
      ? (sourceAgunan?.certificate_type ?? certificateType)
      : certificateType;

    const effectiveBookDate = isReusedAgunan
      ? (sourceAgunan?.tanggal_terbit ?? collateral.bookDate)
      : collateral.bookDate;

    const effectiveArea = isReusedAgunan
      ? (sourceAgunan?.luas ?? collateral.area)
      : collateral.area;

    const effectiveValue = isReusedAgunan
      ? (sourceAgunan?.nilai_agunan ?? collateral.value)
      : collateral.value;

    const effectiveVillage = isReusedAgunan
      ? (sourceAgunan?.alamat_desa_kelurahan ?? collateral.address?.village)
      : collateral.address?.village;

    const effectiveDistrict = isReusedAgunan
      ? (sourceAgunan?.alamat_kecamatan ?? collateral.address?.district)
      : collateral.address?.district;

    const effectiveRegency = isReusedAgunan
      ? (sourceAgunan?.alamat_kabupaten ?? collateral.address?.regency)
      : collateral.address?.regency;

    /*
     * ================================================================
     * MASTER AGUNAN PAYLOAD
     * ================================================================
     */

    const agunanPayload = {
      jenis_agunan: type,

      nomor_identitas: effectiveNumber,

      nomor_sertifikat: isBpkb ? null : effectiveNumber,

      nomor_bpkb: isBpkb ? effectiveNumber : null,

      nomor_polisi: isReusedAgunan ? sourceAgunan?.nomor_polisi || null : null,

      nomor_rangka: isReusedAgunan ? sourceAgunan?.nomor_rangka || null : null,

      nomor_mesin: isReusedAgunan ? sourceAgunan?.nomor_mesin || null : null,

      merek: isReusedAgunan ? sourceAgunan?.merek || null : null,

      tipe: isReusedAgunan ? sourceAgunan?.tipe || null : null,

      tahun: isReusedAgunan ? sourceAgunan?.tahun || null : null,

      certificate_type: effectiveCertificateType,

      tanggal_terbit: effectiveBookDate,

      objek: isReusedAgunan ? sourceAgunan?.objek || null : null,

      luas: effectiveArea,

      alamat_jalan: isReusedAgunan ? sourceAgunan?.alamat_jalan || null : null,

      alamat_rt: isReusedAgunan ? sourceAgunan?.alamat_rt || null : null,

      alamat_rw: isReusedAgunan ? sourceAgunan?.alamat_rw || null : null,

      alamat_desa_kelurahan: effectiveVillage,

      alamat_kecamatan: effectiveDistrict,

      alamat_kabupaten: effectiveRegency,

      nilai_agunan: effectiveValue,

      lokasi_fisik: isReusedAgunan
        ? sourceAgunan?.lokasi_fisik || location.lokasiFisik
        : location.lokasiFisik,

      lokasi_detail: isReusedAgunan
        ? sourceAgunan?.lokasi_detail || collateral.lokasiKeterangan || null
        : collateral.lokasiKeterangan || null,

      sumber_fisik_sertifikat: isReusedAgunan
        ? sourceAgunan?.sumber_fisik_sertifikat || location.sumber
        : location.sumber,

      catatan: isReusedAgunan ? sourceAgunan?.catatan || null : collateral.note,

      updated_at: new Date().toISOString(),
    };

    /*
     * ================================================================
     * SIMPAN / UPDATE MASTER AGUNAN
     * ================================================================
     *
     * REUSE:
     *   Jangan update master.
     *
     * CURRENT:
     *   Update master.
     *
     * BARU:
     *   Insert master.
     */

    if (agunanId && isUuid(agunanId)) {
      if (!isReusedAgunan) {
        const updateResult = await supabase
          .from("agunan")
          .update(agunanPayload)
          .eq("id", agunanId);

        if (updateResult.error) {
          throw updateResult.error;
        }
      }
    } else {
      const insertResult = await supabase
        .from("agunan")
        .insert(agunanPayload)
        .select("*")
        .single();

      if (insertResult.error) {
        throw insertResult.error;
      }

      if (!insertResult.data) {
        throw new Error(`Master Agunan ke-${index + 1} gagal dibuat.`);
      }

      agunanId = insertResult.data.id;
    }

    /*
     * ================================================================
     * PEMILIK
     * ================================================================
     */

    let snapshotOwners = [];

    if (isReusedAgunan) {
      /*
       * Reuse:
       * gunakan owner master lama.
       * Jangan syncAgunanOwners().
       */
      snapshotOwners = reuseMaster?.owners || [];
    } else {
      /*
       * Agunan baru / current:
       * owner berasal dari form.
       */
      const owners = collateral.owners
        .map((owner) => ({
          ...owner,
          hubungan: collateral.relationship || owner.hubungan || null,
        }))
        .filter((owner) => owner.nama);

      await syncAgunanOwners({
        supabase,
        agunanId,
        owners,
      });

      snapshotOwners = owners;
    }

    /*
     * ================================================================
     * SNAPSHOT PEMILIK KE PK_AGUNAN
     * ================================================================
     */

    const ownerNames = snapshotOwners
      .map((owner) => owner?.nama)
      .filter(Boolean);

    const ownerNiks = snapshotOwners.map((owner) => owner?.nik).filter(Boolean);

    const snapshotRelationship =
      collateral.relationship || snapshotOwners[0]?.hubungan || null;

    /*
     * ================================================================
     * BINDING
     * ================================================================
     */

    const bindingType = collateral.binding?.type || "TIDAK_ADA";

    /*
     * ================================================================
     * PK AGUNAN PAYLOAD
     * ================================================================
     */

    const pkAgunanPayload = {
      pk_id: pkId,

      urutan: index + 1,

      jenis_agunan: type,

      nama_pemilik: ownerNames.join(", ") || null,

      nomor_ktp_pemilik: ownerNiks.join(", ") || null,

      tanggal_expired_ktp_pemilik: null,

      alamat_pemilik: null,

      hubungan_dengan_debitur: snapshotRelationship,

      nilai_agunan: effectiveValue,

      nomor_sertifikat: isBpkb ? null : effectiveNumber,

      tanggal_terbit_sertifikat: effectiveBookDate,

      luas_tanah: effectiveArea,

      alamat_agunan: null,

      desa_kelurahan: effectiveVillage,

      kecamatan: effectiveDistrict,

      kabupaten: effectiveRegency,

      objek_agunan: isReusedAgunan ? sourceAgunan?.objek || null : null,

      /*
       * Moral Obligation bukan pengikatan.
       */
      status_pengikatan:
        bindingType === "SKMHT"
          ? "SKMHT"
          : bindingType === "APHT"
            ? "APHT"
            : "TIDAK_DIIKAT",

      jenis_pengikatan:
        bindingType === "SKMHT" || bindingType === "APHT" ? bindingType : null,

      nomor_pengikatan: existingPkAgunan?.nomor_pengikatan || null,

      tanggal_pengikatan: existingPkAgunan?.tanggal_pengikatan || null,

      nilai_pengikatan:
        collateral.binding?.fee ?? existingPkAgunan?.nilai_pengikatan ?? null,

      nomor_bpkb: isBpkb ? effectiveNumber : null,

      nomor_polisi: isReusedAgunan
        ? sourceAgunan?.nomor_polisi || existingPkAgunan?.nomor_polisi || null
        : existingPkAgunan?.nomor_polisi || null,

      nomor_rangka: isReusedAgunan
        ? sourceAgunan?.nomor_rangka || existingPkAgunan?.nomor_rangka || null
        : existingPkAgunan?.nomor_rangka || null,

      nomor_mesin: isReusedAgunan
        ? sourceAgunan?.nomor_mesin || existingPkAgunan?.nomor_mesin || null
        : existingPkAgunan?.nomor_mesin || null,

      merk_kendaraan: isReusedAgunan
        ? sourceAgunan?.merek || existingPkAgunan?.merk_kendaraan || null
        : existingPkAgunan?.merk_kendaraan || null,

      tipe_kendaraan: isReusedAgunan
        ? sourceAgunan?.tipe || existingPkAgunan?.tipe_kendaraan || null
        : existingPkAgunan?.tipe_kendaraan || null,

      tahun_kendaraan: isReusedAgunan
        ? sourceAgunan?.tahun || existingPkAgunan?.tahun_kendaraan || null
        : existingPkAgunan?.tahun_kendaraan || null,

      lokasi_fisik: isReusedAgunan
        ? sourceAgunan?.lokasi_fisik || location.lokasiFisik
        : location.lokasiFisik,

      lokasi_keterangan: isReusedAgunan
        ? sourceAgunan?.lokasi_detail ||
          collateral.lokasiKeterangan ||
          location.sumber
        : collateral.lokasiKeterangan || location.sumber,

      status_order:
        collateral.statusOrder ||
        existingPkAgunan?.status_order ||
        (collateral.certificateLocation === "PERLU_ORDER_CO"
          ? "PERLU_ORDER"
          : "BELUM_ORDER"),

      status_migrasi:
        collateral.statusMigrasi ||
        existingPkAgunan?.status_migrasi ||
        "BELUM_MIGRASI",

      status_dokumen:
        collateral.statusDokumen ||
        existingPkAgunan?.status_dokumen ||
        "BELUM_LENGKAP",

      status_agunan:
        collateral.statusAgunan || existingPkAgunan?.status_agunan || "PROSES",

      agunan_id: agunanId,

      peran_agunan:
        collateral.peranAgunan || existingPkAgunan?.peran_agunan || null,

      /*
       * REUSE = TRUE.
       * Relasi lama tetap memiliki flag masing-masing.
       */
      pernah_agunan_pinjaman_lama:
        isReusedAgunan ||
        collateral.pernahAgunanPinjamanLama ||
        existingPkAgunan?.pernah_agunan_pinjaman_lama ||
        false,

      status_ht_lama: existingPkAgunan?.status_ht_lama || null,

      nomor_ht_lama: existingPkAgunan?.nomor_ht_lama || null,

      tanggal_ht_lama: existingPkAgunan?.tanggal_ht_lama || null,

      updated_at: new Date().toISOString(),
    };

    /*
     * ================================================================
     * SIMPAN RELASI PK_AGUNAN
     * ================================================================
     *
     * Existing:
     *   UPDATE relasi yang sama.
     *
     * Reuse:
     *   INSERT relasi baru.
     *
     * Tidak pernah memindahkan relasi dari PK lama.
     */

    let pkAgunanId = existingPkAgunan?.id || null;

    if (existingPkAgunan) {
      const updateResult = await supabase
        .from("pk_agunan")
        .update(pkAgunanPayload)
        .eq("id", existingPkAgunan.id)
        .eq("pk_id", pkId);

      if (updateResult.error) {
        throw updateResult.error;
      }

      pkAgunanId = existingPkAgunan.id;
    } else {
      const insertResult = await supabase
        .from("pk_agunan")
        .insert(pkAgunanPayload)
        .select("*")
        .single();

      if (insertResult.error) {
        throw insertResult.error;
      }

      if (!insertResult.data) {
        throw new Error(`Relasi PK Agunan ke-${index + 1} gagal dibuat.`);
      }

      pkAgunanId = insertResult.data.id;
    }

    usedPkAgunanIds.add(String(pkAgunanId));

    /*
     * ================================================================
     * SIMPAN PENGIKATAN
     * ================================================================
     */

    await syncAgunanBinding({
      supabase,
      pkAgunanId,
      binding: collateral.binding,
    });
  }

  /*
   * ================================================================
   * RELASI YANG DIHAPUS DARI FORM
   * ================================================================
   *
   * Jangan DELETE.
   * Jangan hapus master agunan.
   * Hanya tandai relasi PK sebagai DILEPAS.
   */

  const removedRows = existingRows.filter(
    (row) => row?.id && !usedPkAgunanIds.has(String(row.id)),
  );

  for (const removed of removedRows) {
    const updateResult = await supabase
      .from("pk_agunan")
      .update({
        status_agunan: "DILEPAS",
        updated_at: new Date().toISOString(),
      })
      .eq("id", removed.id)
      .eq("pk_id", pkId);

    if (updateResult.error) {
      throw updateResult.error;
    }
  }
}
