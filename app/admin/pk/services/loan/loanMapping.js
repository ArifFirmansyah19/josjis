export function mapInsuranceRows(rows, pkId) {
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

export function mapPkRow({
  row,
  completeness,
  mks,
  collaterals,
  relatedParties,
  insurance,
}) {
  const limit = row.limit_kredit ?? 0;

  return {
    ...row,
    id: row.id,
    unitId: row.unit_id,
    mksId: row.mks_id || completeness?.mks_id || null,
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
}
