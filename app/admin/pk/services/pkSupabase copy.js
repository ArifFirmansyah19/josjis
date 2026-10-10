function textOrEmpty(value) {
  return value === undefined || value === null ? "" : String(value);
}
function nullableText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}
function nullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function nullableDate(value) {
  return value === undefined || value === null || value === "" ? null : value;
}
function isUuid(value) {
  return (
    !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value),
    )
  );
}
function generateFallbackOwnerId(owner, index = 0) {
  const nama = String(owner?.nama || "OWNER")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/gi, "")
    .toUpperCase();
  return `OWNER-${nama || "OWNER"}-${index}`;
}
function mapCertificateTypeToUi(value) {
  if (!value) return "Fisik";
  const normalized = String(value).trim().toLowerCase();
  if (["fisik", "physical", "fisik_sertifikat"].includes(normalized)) {
    return "Fisik";
  }
  if (
    ["elektronik", "electronic", "elektronik_sertifikat"].includes(normalized)
  ) {
    return "Elektronik";
  }
  return String(value);
}
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
  return "DI_CABANG";
}
function mapCollateralToUi({ pkAgunan, agunan, owners, binding, notary }) {
  const type = pkAgunan?.jenis_agunan || agunan?.jenis_agunan || "SHM";
  const isBpkb = String(type).toUpperCase() === "BPKB";
  const ownerRows = Array.isArray(owners)
    ? owners
        .map((owner, index) => ({
          id: owner.id || generateFallbackOwnerId(owner, index),
          nama: textOrEmpty(owner.nama),
          nik: textOrEmpty(owner.nik),
          hubungan: textOrEmpty(owner.hubungan),
        }))
        .filter((owner) => owner.nama)
    : [];
  const firstOwner = ownerRows[0] || null;
  const number = isBpkb
    ? textOrEmpty(agunan?.nomor_bpkb ?? pkAgunan?.nomor_bpkb)
    : textOrEmpty(agunan?.nomor_sertifikat ?? pkAgunan?.nomor_sertifikat);
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
    relationship: textOrEmpty(pkAgunan?.hubungan_dengan_debitur),
    value: pkAgunan?.nilai_agunan ?? agunan?.nilai_agunan ?? "",
    address: {
      village: pkAgunan?.desa_kelurahan ?? agunan?.alamat_desa_kelurahan ?? "",
      district: pkAgunan?.kecamatan ?? agunan?.alamat_kecamatan ?? "",
      regency: pkAgunan?.kabupaten ?? agunan?.alamat_kabupaten ?? "",
    },
    nomorPolisi: textOrEmpty(agunan?.nomor_polisi ?? pkAgunan?.nomor_polisi),
    nomorRangka: textOrEmpty(agunan?.nomor_rangka ?? pkAgunan?.nomor_rangka),
    nomorMesin: textOrEmpty(agunan?.nomor_mesin ?? pkAgunan?.nomor_mesin),
    merek: textOrEmpty(agunan?.merek ?? pkAgunan?.merk_kendaraan),
    tipe: textOrEmpty(agunan?.tipe ?? pkAgunan?.tipe_kendaraan),
    tahun: textOrEmpty(agunan?.tahun ?? pkAgunan?.tahun_kendaraan),
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
    pernahAgunanPinjamanLama: Boolean(pkAgunan?.pernah_agunan_pinjaman_lama),
    isReusedAgunan: Boolean(pkAgunan?.pernah_agunan_pinjaman_lama),
  };
}
async function fetchCollaterals({ supabase, pkIds }) {
  if (!Array.isArray(pkIds) || !pkIds.length) {
    return new Map();
  }
  const collateralMap = new Map();
  const { data: pkAgunanRows, error: pkAgunanError } = await supabase
    .from("pk_agunan")
    .select("*")
    .in("pk_id", pkIds)
    .order("urutan", {
      ascending: true,
    });
  if (pkAgunanError) {
    throw pkAgunanError;
  }
  if (!pkAgunanRows?.length) {
    return collateralMap;
  }
  const agunanIds = [
    ...new Set(pkAgunanRows.map((row) => row?.agunan_id).filter(Boolean)),
  ];
  let agunanRows = [];
  if (agunanIds.length) {
    const result = await supabase
      .from("agunan")
      .select("*")
      .in("id", agunanIds);
    if (result.error) {
      throw result.error;
    }
    agunanRows = result.data || [];
  }
  const agunanMap = new Map(agunanRows.map((row) => [String(row.id), row]));
  let ownerRows = [];
  if (agunanIds.length) {
    const result = await supabase
      .from("agunan_pemilik")
      .select("*")
      .in("agunan_id", agunanIds)
      .order("is_primary", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      });
    if (result.error) {
      throw result.error;
    }
    ownerRows = result.data || [];
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
  const pkAgunanIds = pkAgunanRows.map((row) => row?.id).filter(Boolean);
  let bindingRows = [];
  if (pkAgunanIds.length) {
    const result = await supabase
      .from("agunan_pengikatan")
      .select("*")
      .in("pk_agunan_id", pkAgunanIds)
      .order("created_at", {
        ascending: true,
      });
    if (!result.error) {
      bindingRows = result.data || [];
    }
  }
  const bindingMap = new Map();
  bindingRows.forEach((binding) => {
    if (
      binding?.pk_agunan_id &&
      !bindingMap.has(String(binding.pk_agunan_id))
    ) {
      bindingMap.set(String(binding.pk_agunan_id), binding);
    }
  });
  const notaryIds = [
    ...new Set(
      bindingRows.map((binding) => binding?.notaris_id).filter(isUuid),
    ),
  ];
  let notaryRows = [];
  if (notaryIds.length) {
    const result = await supabase
      .from("notaris")
      .select("id, nama_notaris")
      .in("id", notaryIds);
    if (!result.error) {
      notaryRows = result.data || [];
    }
  }
  const notaryMap = new Map(notaryRows.map((row) => [String(row.id), row]));
  pkAgunanRows.forEach((pkAgunan) => {
    if (!pkAgunan?.pk_id) return;
    const pkId = String(pkAgunan.pk_id);
    if (!collateralMap.has(pkId)) {
      collateralMap.set(pkId, []);
    }
    const agunan = pkAgunan.agunan_id
      ? agunanMap.get(String(pkAgunan.agunan_id)) || null
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
function getLatestInsuranceRow(rows, jenisAsuransi) {
  return (
    (rows || [])
      .filter(
        (row) =>
          String(row?.jenis_asuransi || "").toUpperCase() ===
          String(jenisAsuransi).toUpperCase(),
      )
      .sort((a, b) => {
        const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
        const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
        return bTime - aTime;
      })[0] || null
  );
}
function mapInsuranceRows(rows, pkId) {
  const insuranceRows = (rows || []).filter(
    (row) => String(row?.pk_id) === String(pkId),
  );

  const findInsurance = (jenisAsuransi) =>
    insuranceRows.find(
      (row) =>
        String(row?.jenis_asuransi || "").toUpperCase() ===
        String(jenisAsuransi).toUpperCase(),
    ) || null;

  const guarantee = findInsurance("PENJAMINAN");
  const afms = findInsurance("AFMS");
  const ajk = findInsurance("AJK");
  const axa = findInsurance("AXA");
  const sijitu = findInsurance("SIJITU");
  const magi = findInsurance("MAGI");

  const life = afms || ajk;

  return {
    guarantee: {
      id: guarantee?.id || null,
      provider: guarantee?.provider || "",
      policyNumber: guarantee?.nomor_polis || "",
      applicationDate: guarantee?.tanggal_pengajuan || "",
      premium: guarantee?.premi ?? "",
      orderStatus: guarantee?.status || "",
      postingStatus: guarantee?.advis_status || "",
      paymentStatus: guarantee?.payment_status || "",
      filePath: guarantee?.file_path || "",
      fileName: guarantee?.file_name || "",
      metadata: guarantee?.metadata || {},
      notes: guarantee?.notes || "",
    },

    life: {
      id: life?.id || null,
      type: life?.jenis_asuransi || "",
      policyNumber: life?.nomor_polis || "",
      premium: life?.premi ?? "",
      orderStatus: life?.status || "BELUM_DIORDER",
      postingStatus: life?.advis_status || "BELUM_POSTING",
      paymentStatus: life?.payment_status || "",
      filePath: life?.file_path || "",
      fileName: life?.file_name || "",
      metadata: life?.metadata || {},
      notes: life?.notes || "",
    },

    axa: {
      id: axa?.id || null,
      enabled: axa?.status === "AKTIF",
      policyNumber: axa?.nomor_polis || "",
      premium: axa?.premi ?? "",
      status: axa?.status || "",
      postingStatus: axa?.advis_status || "",
      paymentStatus: axa?.payment_status || "",
      filePath: axa?.file_path || "",
      fileName: axa?.file_name || "",
      metadata: axa?.metadata || {},
      notes: axa?.notes || "",
    },

    sijitu: {
      id: sijitu?.id || null,
      orderStatus: sijitu?.status || "BELUM_DIORDER",
      postingStatus: sijitu?.advis_status || "BELUM_POSTING",
      paymentStatus: sijitu?.payment_status || "",
      filePath: sijitu?.file_path || "",
      fileName: sijitu?.file_name || "",
      metadata: sijitu?.metadata || {},
      notes: sijitu?.notes || "",
    },

    magi: {
      id: magi?.id || null,
      orderStatus: magi?.status || "BELUM_ADVIS",
      postingStatus: magi?.advis_status || "BELUM_POSTING",
      premium: magi?.premi ?? "",
      paymentStatus: magi?.payment_status || "",
      filePath: magi?.file_path || "",
      fileName: magi?.file_name || "",
      metadata: magi?.metadata || {},
      notes: magi?.notes || "",
    },

    // Ini penting:
    // data mentah dari Supabase tetap dipertahankan.
    rows: insuranceRows.map((row) => ({
      id: row.id,
      pkId: row.pk_id,
      jenisAsuransi: row.jenis_asuransi,
      provider: row.provider,
      nomorPolis: row.nomor_polis,
      tanggalPengajuan: row.tanggal_pengajuan,
      premi: row.premi,
      advisStatus: row.advis_status,
      paymentStatus: row.payment_status,
      status: row.status,
      filePath: row.file_path,
      fileName: row.file_name,
      metadata: row.metadata || {},
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}
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
    const result = await supabase
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
    if (!result.error) {
      relatedPartyRows = result.data || [];
    }
  }
  const relatedPartyMap = new Map();
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
  let completenessRows = [];
  if (pkIds.length) {
    const result = await supabase
      .from("v_pk_completeness_final")
      .select(
        "pk_id, unit_id, mks_id, status_kelengkapan, dokumen_pk_lengkap, seluruh_agunan_lengkap, lengkap_di_co",
      )
      .in("pk_id", pkIds);
    if (!result.error) {
      completenessRows = result.data || [];
    }
  }
  const completenessMap = new Map(
    completenessRows.map((item) => [String(item.pk_id), item]),
  );
  const mksResult = await supabase
    .from("mks")
    .select("id, pegawai_id, kode_agen");
  const mksRows = mksResult.error ? [] : mksResult.data || [];
  const pegawaiResult = await supabase.from("pegawai").select("*");
  const pegawaiRows = pegawaiResult.error ? [] : pegawaiResult.data || [];
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
  const collateralMap = await fetchCollaterals({
    supabase,
    pkIds,
  });
  const insuranceResult = await supabase
    .from("pk_asuransi")
    .select("*")
    .in("pk_id", pkIds);
  if (insuranceResult.error) {
    throw insuranceResult.error;
  }
  const insuranceRows = insuranceResult.data || [];
  return rows.map((row) => {
    const rowId = String(row.id);
    const completeness = completenessMap.get(rowId) || null;
    const mksId = row.mks_id || completeness?.mks_id || null;
    const mks = mksId ? mksMap.get(String(mksId)) : null;
    const collaterals = collateralMap.get(rowId) || [];
    const relatedParties = relatedPartyMap.get(rowId) || [];
    const limit = row.limit_kredit ?? 0;
    const insurance = mapInsuranceRows(insuranceRows, row.id);
    return {
      ...row,
      id: row.id,
      unitId: row.unit_id,
      mksId,
      mksName: mks?.name || "-",
      mksAgentCode: mks?.code || "",
      tanggalPk: row.tanggal_pk || null,
      tanggalPeminjaman: row.tanggal_aplikasi || null,
      jenisPengajuanKredit: row.jenis_pengajuan_kredit || "",
      tenor: row.jangka_waktu ?? null,
      limitKredit: Number(limit || 0),
      jumlahAgunan:
        row.jumlah_agunan ??
        row.total_agunan ??
        row.agunan_count ??
        row.jumlahAgunan ??
        collaterals.length,
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
      insurance,
      statusKelengkapan: completeness?.status_kelengkapan || null,
      dokumenPkLengkap: completeness?.dokumen_pk_lengkap ?? false,
      seluruhAgunanLengkap: completeness?.seluruh_agunan_lengkap ?? false,
      lengkapDiCo: completeness?.lengkap_di_co ?? false,
    };
  });
}
async function syncInsurance({ supabase, pkId, insurance }) {
  if (!pkId || !insurance) return;
  const items = [];
  if (
    insurance?.guarantee?.provider ||
    insurance?.guarantee?.policyNumber ||
    insurance?.guarantee?.applicationDate
  ) {
    items.push({
      jenis_asuransi: "PENJAMINAN",
      provider: insurance.guarantee.provider || null,
      nomor_polis: insurance.guarantee.policyNumber || null,
      tanggal_pengajuan: insurance.guarantee.applicationDate || null,
      premi: null,
      status: null,
      advis_status: null,
    });
  }
  if (
    insurance?.life?.type ||
    insurance?.life?.policyNumber ||
    insurance?.life?.premium !== undefined ||
    insurance?.life?.advisStatus
  ) {
    items.push({
      jenis_asuransi: insurance.life.type || "AFMS",
      provider: null,
      nomor_polis: insurance.life.policyNumber || null,
      tanggal_pengajuan: null,
      premi:
        insurance.life.premium === "" ||
        insurance.life.premium === null ||
        insurance.life.premium === undefined
          ? null
          : Number(insurance.life.premium),
      status: null,
      advis_status: insurance.life.advisStatus || null,
    });
  }
  if (
    insurance?.axa?.enabled ||
    insurance?.axa?.policyNumber ||
    insurance?.axa?.premium !== undefined
  ) {
    items.push({
      jenis_asuransi: "AXA",
      provider: "AXA",
      nomor_polis: insurance.axa.policyNumber || null,
      tanggal_pengajuan: null,
      premi:
        insurance.axa.premium === "" ||
        insurance.axa.premium === null ||
        insurance.axa.premium === undefined
          ? null
          : Number(insurance.axa.premium),
      status: insurance.axa.enabled ? "AKTIF" : "TIDAK_AKTIF",
      advis_status: null,
    });
  }
  items.push({
    jenis_asuransi: "SIJITU",
    provider: null,
    nomor_polis: null,
    tanggal_pengajuan: null,
    premi: null,
    status: insurance?.sijitu?.orderStatus || "BELUM_DIORDER",
    advis_status: insurance?.sijitu?.postingStatus || "BELUM_POSTING",
  });
  items.push({
    jenis_asuransi: "MAGI",
    provider: null,
    nomor_polis: null,
    tanggal_pengajuan: null,
    premi: null,
    status: insurance?.magi?.advisStatus || "BELUM_ADVIS",
    advis_status: insurance?.magi?.postingStatus || "BELUM_POSTING",
  });
  const existingResult = await supabase
    .from("pk_asuransi")
    .select("id, jenis_asuransi")
    .eq("pk_id", pkId)
    .in(
      "jenis_asuransi",
      items.map((item) => item.jenis_asuransi),
    );
  if (existingResult.error) {
    throw existingResult.error;
  }
  const existingMap = new Map(
    (existingResult.data || []).map((row) => [row.jenis_asuransi, row]),
  );
  for (const item of items) {
    const payload = {
      pk_id: pkId,
      jenis_asuransi: item.jenis_asuransi,
      provider: item.provider ?? null,
      nomor_polis: item.nomor_polis ?? null,
      tanggal_pengajuan: item.tanggal_pengajuan ?? null,
      premi: item.premi ?? null,
      status: item.status ?? null,
      advis_status: item.advis_status ?? null,
      updated_at: new Date().toISOString(),
    };
    const existing = existingMap.get(item.jenis_asuransi);
    if (existing?.id) {
      const result = await supabase
        .from("pk_asuransi")
        .update(payload)
        .eq("id", existing.id)
        .eq("pk_id", pkId);
      if (result.error) {
        throw result.error;
      }
    } else {
      const result = await supabase.from("pk_asuransi").insert(payload);
      if (result.error) {
        throw result.error;
      }
    }
  }
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
async function syncRelatedParties({ supabase, pkId, relatedParties }) {
  if (!pkId) {
    throw new Error("ID PK diperlukan untuk menyimpan Pihak Terkait.");
  }
  const desired = Array.isArray(relatedParties) ? relatedParties : [];
  desired.forEach((party) => {
    if (!party?.nama?.trim()) {
      throw new Error("Nama Pihak Terkait wajib diisi.");
    }
  });
  const existingResult = await supabase
    .from("pk_related_party")
    .select("id, pk_id")
    .eq("pk_id", pkId);
  if (existingResult.error) {
    throw existingResult.error;
  }
  const existingRows = existingResult.data || [];
  const existingMap = new Map(existingRows.map((row) => [String(row.id), row]));
  const desiredIds = new Set(
    desired
      .map((party) => party?.id)
      .filter((id) => id && existingMap.has(String(id)))
      .map((id) => String(id)),
  );
  const deleteIds = existingRows
    .filter((row) => !desiredIds.has(String(row.id)))
    .map((row) => row.id);
  if (deleteIds.length) {
    const result = await supabase
      .from("pk_related_party")
      .delete()
      .eq("pk_id", pkId)
      .in("id", deleteIds);
    if (result.error) {
      throw result.error;
    }
  }
  for (const party of desired) {
    const partyId = party?.id ? String(party.id) : "";
    const partyPayload = {
      pk_id: pkId,
      nama: party.nama?.trim() || "",
      nik: nullableText(party.nik),
      hubungan: nullableText(party.hubungan),
      phone: nullableText(party.phone),
      has_account: Boolean(party.has_account),
      cif: party.has_account ? nullableText(party.cif) : null,
      savings_account_number: party.has_account
        ? nullableText(party.savings_account_number)
        : null,
      alamat_jalan: nullableText(party.alamat_jalan),
      alamat_rt: nullableText(party.alamat_rt),
      alamat_rw: nullableText(party.alamat_rw),
      alamat_desa_kelurahan: nullableText(party.alamat_desa_kelurahan),
      alamat_kecamatan: nullableText(party.alamat_kecamatan),
      alamat_kabupaten: nullableText(party.alamat_kabupaten),
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
      const result = await supabase
        .from("pk_related_party")
        .update(partyPayload)
        .eq("id", partyId)
        .eq("pk_id", pkId);
      if (result.error) {
        throw result.error;
      }
    } else {
      const result = await supabase
        .from("pk_related_party")
        .insert(partyPayload)
        .select("*")
        .single();
      if (result.error) {
        throw result.error;
      }
      if (!result.data) {
        throw new Error("Pihak Terkait baru gagal disimpan.");
      }
    }
  }
}
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
  if (!owners.length && nullableText(collateral?.owner)) {
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
    nomorPolisi: nullableText(
      collateral?.nomorPolisi ?? collateral?.nomor_polisi,
    ),
    nomorRangka: nullableText(
      collateral?.nomorRangka ?? collateral?.nomor_rangka,
    ),
    nomorMesin: nullableText(collateral?.nomorMesin ?? collateral?.nomor_mesin),
    merek: nullableText(collateral?.merek ?? collateral?.merk),
    tipe: nullableText(collateral?.tipe),
    tahun: nullableNumber(collateral?.tahun),
    owners,
    owner: nullableText(collateral?.owner),
    relationship: nullableText(collateral?.relationship),
    value: nullableNumber(collateral?.value),
    address: {
      village: nullableText(
        collateral?.address?.village ??
          collateral?.address?.desa ??
          collateral?.address?.kelurahan,
      ),
      district: nullableText(
        collateral?.address?.district ?? collateral?.address?.kecamatan,
      ),
      regency: nullableText(
        collateral?.address?.regency ?? collateral?.address?.kabupaten,
      ),
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
function validateCollateral(collateral, index) {
  if (!collateral) {
    throw new Error(`Data Agunan ke-${index + 1} tidak valid.`);
  }
  const type = String(collateral.type || "")
    .trim()
    .toUpperCase();
  if (!["SHM", "BPKB"].includes(type)) {
    throw new Error(`Jenis Agunan ke-${index + 1} harus SHM atau BPKB.`);
  }
  if (!collateral.number) {
    throw new Error(`Nomor ${type} Agunan ke-${index + 1} wajib diisi.`);
  }
  if (!Array.isArray(collateral.owners) || !collateral.owners.length) {
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
    default:
      return {
        lokasiFisik: "CABANG",
        sumber: "Di Cabang",
      };
  }
}
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
  if (existingResult.data?.length) {
    const result = await supabase
      .from("agunan_pemilik")
      .delete()
      .eq("agunan_id", agunanId);
    if (result.error) {
      throw result.error;
    }
  }
  const now = new Date().toISOString();
  const result = await supabase.from("agunan_pemilik").insert(
    desiredOwners.map((owner, index) => ({
      agunan_id: agunanId,
      nama: owner.nama.trim(),
      nik: owner.nik?.trim() || null,
      hubungan: owner.hubungan?.trim() || null,
      is_primary: index === 0,
      created_at: now,
      updated_at: now,
    })),
  );
  if (result.error) {
    throw result.error;
  }
}
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
  const existing = existingResult.data?.[0] || null;
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
    const result = await supabase
      .from("agunan_pengikatan")
      .update(payload)
      .eq("id", existing.id)
      .eq("pk_agunan_id", pkAgunanId);
    if (result.error) {
      throw result.error;
    }
  } else {
    const result = await supabase.from("agunan_pengikatan").insert(payload);
    if (result.error) {
      throw result.error;
    }
  }
}
async function syncCollaterals({ supabase, pkId, collaterals }) {
  if (!pkId) {
    throw new Error("ID PK diperlukan untuk menyimpan Agunan.");
  }
  const desired = Array.isArray(collaterals)
    ? collaterals.filter(Boolean).map(normalizeCollateralForSave)
    : [];
  desired.forEach(validateCollateral);
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
  const existingMap = new Map(
    existingRows.filter((row) => row?.id).map((row) => [String(row.id), row]),
  );
  const usedIds = new Set();
  for (let index = 0; index < desired.length; index++) {
    const collateral = desired[index];
    const type = String(collateral.type || "")
      .trim()
      .toUpperCase();
    let existingPkAgunan =
      collateral.pkAgunanId && isUuid(collateral.pkAgunanId)
        ? existingMap.get(String(collateral.pkAgunanId)) || null
        : null;
    if (!existingPkAgunan && collateral.id && isUuid(collateral.id)) {
      existingPkAgunan = existingMap.get(String(collateral.id)) || null;
    }
    const hasCurrentRelation = Boolean(existingPkAgunan?.id);
    const hasMaster = Boolean(
      collateral.agunanId && isUuid(collateral.agunanId),
    );
    const isExplicitReuse = Boolean(
      collateral.isReusedAgunan ||
      collateral.pernahAgunanPinjamanLama ||
      collateral.isReused ||
      collateral.reuseFromLoanId,
    );
    const isReusedAgunan = Boolean(
      hasMaster && !hasCurrentRelation && isExplicitReuse,
    );
    let agunanId = existingPkAgunan?.agunan_id || null;
    if (!agunanId && hasMaster) {
      agunanId = collateral.agunanId;
    }
    const reuseMaster = isReusedAgunan
      ? await fetchMasterAgunanForReuse({
          supabase,
          agunanId,
        })
      : null;
    const location = mapLocationToDb(collateral.certificateLocation);
    const certificateType = mapCertificateTypeToDb(collateral.certificateType);
    const isBpkb = type === "BPKB";
    const source = isReusedAgunan ? reuseMaster?.agunan || null : null;
    const effectiveNumber = isReusedAgunan
      ? (isBpkb ? source?.nomor_bpkb : source?.nomor_sertifikat) ||
        collateral.number
      : collateral.number;
    const effectiveCertificateType = isReusedAgunan
      ? (source?.certificate_type ?? certificateType)
      : certificateType;
    const effectiveBookDate = isReusedAgunan
      ? (source?.tanggal_terbit ?? collateral.bookDate)
      : collateral.bookDate;
    const effectiveArea = isReusedAgunan
      ? (source?.luas ?? collateral.area)
      : collateral.area;
    const effectiveValue = isReusedAgunan
      ? (source?.nilai_agunan ?? collateral.value)
      : collateral.value;
    const address = collateral.address || {};
    const inputVillage =
      address.village ?? address.desa ?? address.kelurahan ?? null;
    const inputDistrict = address.district ?? address.kecamatan ?? null;
    const inputRegency = address.regency ?? address.kabupaten ?? null;
    const effectiveVillage = isReusedAgunan
      ? (source?.alamat_desa_kelurahan ?? inputVillage)
      : inputVillage;
    const effectiveDistrict = isReusedAgunan
      ? (source?.alamat_kecamatan ?? inputDistrict)
      : inputDistrict;
    const effectiveRegency = isReusedAgunan
      ? (source?.alamat_kabupaten ?? inputRegency)
      : inputRegency;
    const effectiveNomorPolisi = isReusedAgunan
      ? (source?.nomor_polisi ?? collateral.nomorPolisi)
      : collateral.nomorPolisi;
    const effectiveNomorRangka = isReusedAgunan
      ? (source?.nomor_rangka ?? collateral.nomorRangka)
      : collateral.nomorRangka;
    const effectiveNomorMesin = isReusedAgunan
      ? (source?.nomor_mesin ?? collateral.nomorMesin)
      : collateral.nomorMesin;
    const effectiveMerek = isReusedAgunan
      ? (source?.merek ?? collateral.merek)
      : collateral.merek;
    const effectiveTipe = isReusedAgunan
      ? (source?.tipe ?? collateral.tipe)
      : collateral.tipe;
    const effectiveTahun = isReusedAgunan
      ? (source?.tahun ?? collateral.tahun)
      : collateral.tahun;
    const agunanPayload = {
      jenis_agunan: type,
      nomor_identitas: effectiveNumber,
      nomor_sertifikat: isBpkb ? null : effectiveNumber,
      nomor_bpkb: isBpkb ? effectiveNumber : null,
      nomor_polisi: isBpkb ? effectiveNomorPolisi : null,
      nomor_rangka: isBpkb ? effectiveNomorRangka : null,
      nomor_mesin: isBpkb ? effectiveNomorMesin : null,
      merek: isBpkb ? effectiveMerek : null,
      tipe: isBpkb ? effectiveTipe : null,
      tahun: isBpkb ? effectiveTahun : null,
      certificate_type: effectiveCertificateType,
      tanggal_terbit: effectiveBookDate,
      objek: isReusedAgunan ? source?.objek || null : null,
      luas: effectiveArea,
      alamat_desa_kelurahan: effectiveVillage,
      alamat_kecamatan: effectiveDistrict,
      alamat_kabupaten: effectiveRegency,
      nilai_agunan: effectiveValue,
      lokasi_fisik: isReusedAgunan
        ? source?.lokasi_fisik || location.lokasiFisik
        : location.lokasiFisik,
      lokasi_detail: isReusedAgunan
        ? source?.lokasi_detail || collateral.lokasiKeterangan || null
        : collateral.lokasiKeterangan || null,
      sumber_fisik_sertifikat: isReusedAgunan
        ? source?.sumber_fisik_sertifikat || location.sumber
        : location.sumber,
      catatan: isReusedAgunan ? source?.catatan || null : collateral.note,
      updated_at: new Date().toISOString(),
    };
    if (agunanId && isUuid(agunanId)) {
      if (!isReusedAgunan) {
        const result = await supabase
          .from("agunan")
          .update(agunanPayload)
          .eq("id", agunanId)
          .select("*")
          .single();
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error(
            `Master Agunan ${agunanId} tidak ditemukan saat update.`,
          );
        }
      }
    } else {
      const result = await supabase
        .from("agunan")
        .insert(agunanPayload)
        .select("*")
        .single();
      if (result.error) {
        throw result.error;
      }
      if (!result.data) {
        throw new Error(`Master Agunan ke-${index + 1} gagal dibuat.`);
      }
      agunanId = result.data.id;
    }
    let snapshotOwners = [];
    if (isReusedAgunan) {
      snapshotOwners = reuseMaster?.owners || [];
    } else {
      const owners = (collateral.owners || [])
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
    const ownerNames = snapshotOwners
      .map((owner) => owner?.nama)
      .filter(Boolean);
    const ownerNiks = snapshotOwners.map((owner) => owner?.nik).filter(Boolean);
    const snapshotRelationship =
      collateral.relationship || snapshotOwners[0]?.hubungan || null;
    const bindingType = collateral.binding?.type || "TIDAK_ADA";
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
      alamat_agunan:
        [effectiveVillage, effectiveDistrict, effectiveRegency]
          .filter(Boolean)
          .join(", ") || null,
      desa_kelurahan: effectiveVillage,
      kecamatan: effectiveDistrict,
      kabupaten: effectiveRegency,
      objek_agunan: isReusedAgunan ? source?.objek || null : null,
      status_pengikatan:
        bindingType === "SKMHT"
          ? "SKMHT"
          : bindingType === "APHT"
            ? "APHT"
            : "TIDAK_DIIKAT",
      jenis_pengikatan: ["SKMHT", "APHT"].includes(bindingType)
        ? bindingType
        : null,
      nomor_pengikatan: existingPkAgunan?.nomor_pengikatan || null,
      tanggal_pengikatan: existingPkAgunan?.tanggal_pengikatan || null,
      nilai_pengikatan:
        collateral.binding?.fee ?? existingPkAgunan?.nilai_pengikatan ?? null,
      nomor_bpkb: isBpkb ? effectiveNumber : null,
      nomor_polisi: isBpkb ? effectiveNomorPolisi : null,
      nomor_rangka: isBpkb ? effectiveNomorRangka : null,
      nomor_mesin: isBpkb ? effectiveNomorMesin : null,
      merk_kendaraan: isBpkb ? effectiveMerek : null,
      tipe_kendaraan: isBpkb ? effectiveTipe : null,
      tahun_kendaraan: isBpkb ? effectiveTahun : null,
      lokasi_fisik: isReusedAgunan
        ? source?.lokasi_fisik || location.lokasiFisik
        : location.lokasiFisik,
      lokasi_keterangan: isReusedAgunan
        ? source?.lokasi_detail ||
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
    let pkAgunanId = existingPkAgunan?.id || null;
    if (existingPkAgunan) {
      const result = await supabase
        .from("pk_agunan")
        .update(pkAgunanPayload)
        .eq("id", existingPkAgunan.id)
        .eq("pk_id", pkId);
      if (result.error) {
        throw result.error;
      }
    } else {
      const result = await supabase
        .from("pk_agunan")
        .insert(pkAgunanPayload)
        .select("*")
        .single();
      if (result.error) {
        throw result.error;
      }
      if (!result.data) {
        throw new Error(`Relasi PK Agunan ke-${index + 1} gagal dibuat.`);
      }
      pkAgunanId = result.data.id;
    }
    usedIds.add(String(pkAgunanId));
    await syncAgunanBinding({
      supabase,
      pkAgunanId,
      binding: collateral.binding,
    });
  }
  const removedRows = existingRows.filter(
    (row) => row?.id && !usedIds.has(String(row.id)),
  );
  for (const removed of removedRows) {
    const result = await supabase
      .from("pk_agunan")
      .update({
        status_agunan: "DILEPAS",
        updated_at: new Date().toISOString(),
      })
      .eq("id", removed.id)
      .eq("pk_id", pkId);
    if (result.error) {
      throw result.error;
    }
  }
}
