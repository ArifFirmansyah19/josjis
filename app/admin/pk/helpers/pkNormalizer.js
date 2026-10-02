// app/admin/pk/helpers/pkNormalizer.js

function nullableText(value) {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();

  return text === "" ? null : text;
}

function nullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
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

/* ========================================================================
 * NORMALIZE OWNER AGUNAN
 * ======================================================================== */

function normalizeCollateralOwners(collateral) {
  if (Array.isArray(collateral?.owners) && collateral.owners.length > 0) {
    return collateral.owners
      .map((owner) => ({
        id: owner?.id || null,
        nama: String(owner?.nama || "").trim(),
        nik: String(owner?.nik || "").trim(),
      }))
      .filter((owner) => owner.nama !== "");
  }

  if (collateral?.owner) {
    return [
      {
        id: collateral?.ownerId || null,
        nama: String(collateral.owner).trim(),
        nik: String(collateral?.ownerNik || "").trim(),
      },
    ];
  }

  return [];
}

/* ========================================================================
 * NORMALIZE AGUNAN
 * ======================================================================== */

export function normalizeCollaterals(collaterals) {
  if (!Array.isArray(collaterals)) {
    return [];
  }

  return collaterals.map((collateral) => {
    const owners = normalizeCollateralOwners(collateral);
    const firstOwner = owners[0] || null;

    return {
      id: collateral?.id || null,

      pkAgunanId: collateral?.pkAgunanId || collateral?.pk_agunan_id || null,

      agunanId: collateral?.agunanId || collateral?.agunan_id || null,

      /* ---------------------------------------------------------------
       * DOKUMEN AGUNAN
       * --------------------------------------------------------------- */

      type: nullableText(collateral?.type ?? collateral?.jenis_agunan) || "SHM",

      number:
        nullableText(
          collateral?.number ??
            collateral?.nomor ??
            collateral?.nomor_sertifikat ??
            collateral?.nomor_bpkb,
        ) || "",

      certificateType:
        nullableText(
          collateral?.certificateType ?? collateral?.certificate_type,
        ) || "Fisik",

      certificateLocation:
        nullableText(
          collateral?.certificateLocation ??
            collateral?.certificate_location ??
            collateral?.sumber_fisik_sertifikat,
        ) || "DIBAWA_DEBITUR",

      area: nullableNumber(
        collateral?.area ?? collateral?.luas ?? collateral?.luas_tanah,
      ),

      bookDate: nullableDate(
        collateral?.bookDate ??
          collateral?.book_date ??
          collateral?.tanggal_terbit ??
          collateral?.tanggal_terbit_sertifikat,
      ),

      /* ---------------------------------------------------------------
       * KEPEMILIKAN
       * --------------------------------------------------------------- */

      owner: nullableText(collateral?.owner ?? firstOwner?.nama) || "",

      owners,

      relationship:
        nullableText(
          collateral?.relationship ??
            collateral?.hubungan ??
            collateral?.hubungan_dengan_debitur ??
            firstOwner?.hubungan,
        ) || "",

      /* ---------------------------------------------------------------
       * NILAI AGUNAN
       * --------------------------------------------------------------- */

      value: nullableNumber(
        collateral?.value ?? collateral?.nilai ?? collateral?.nilai_agunan,
      ),

      /* ---------------------------------------------------------------
       * ALAMAT AGUNAN
       * --------------------------------------------------------------- */

      address: {
        street: String(
          collateral?.address?.street ?? collateral?.alamat_jalan ?? "",
        ).trim(),

        rt: String(
          collateral?.address?.rt ?? collateral?.alamat_rt ?? "",
        ).trim(),

        rw: String(
          collateral?.address?.rw ?? collateral?.alamat_rw ?? "",
        ).trim(),

        village: String(
          collateral?.address?.village ??
            collateral?.alamat_desa_kelurahan ??
            collateral?.desa_kelurahan ??
            "",
        ).trim(),

        district: String(
          collateral?.address?.district ??
            collateral?.alamat_kecamatan ??
            collateral?.kecamatan ??
            "",
        ).trim(),

        regency: String(
          collateral?.address?.regency ??
            collateral?.alamat_kabupaten ??
            collateral?.kabupaten ??
            "",
        ).trim(),
      },

      /* ---------------------------------------------------------------
       * CATATAN
       * --------------------------------------------------------------- */

      note: nullableText(collateral?.note ?? collateral?.catatan) || "",

      /* ---------------------------------------------------------------
       * PENGIKATAN
       * --------------------------------------------------------------- */

      binding: {
        type:
          nullableText(
            collateral?.binding?.type ??
              collateral?.binding_type ??
              collateral?.jenis_pengikatan ??
              collateral?.status_pengikatan,
          ) || "TIDAK_ADA",

        notaryName: String(
          collateral?.binding?.notaryName ??
            collateral?.binding?.notary_name ??
            "",
        ).trim(),

        notaryCode: String(
          collateral?.binding?.notaryCode ??
            collateral?.binding?.notary_code ??
            "",
        ).trim(),

        fee: nullableNumber(
          collateral?.binding?.fee ??
            collateral?.binding?.biaya ??
            collateral?.biaya_pengikatan,
        ),

        outgoingLetterNumber: String(
          collateral?.binding?.outgoingLetterNumber ??
            collateral?.binding?.outgoing_letter_number ??
            "",
        ).trim(),

        note: String(
          collateral?.binding?.note ?? collateral?.binding?.catatan ?? "",
        ).trim(),

        status: String(
          collateral?.binding?.status ??
            collateral?.binding_status ??
            "BELUM_DIPROSES",
        ).trim(),
      },

      /* ---------------------------------------------------------------
       * STATUS AGUNAN
       * --------------------------------------------------------------- */

      statusOrder:
        nullableText(collateral?.statusOrder ?? collateral?.status_order) ||
        "BELUM_ORDER",

      statusMigrasi:
        nullableText(collateral?.statusMigrasi ?? collateral?.status_migrasi) ||
        "BELUM_MIGRASI",

      statusDokumen:
        nullableText(collateral?.statusDokumen ?? collateral?.status_dokumen) ||
        "BELUM_LENGKAP",

      statusAgunan:
        nullableText(collateral?.statusAgunan ?? collateral?.status_agunan) ||
        "PROSES",

      lokasiFisik:
        nullableText(collateral?.lokasiFisik ?? collateral?.lokasi_fisik) ||
        "CABANG",

      lokasiKeterangan:
        nullableText(
          collateral?.lokasiKeterangan ?? collateral?.lokasi_keterangan,
        ) || "",

      peranAgunan:
        nullableText(collateral?.peranAgunan ?? collateral?.peran_agunan) ||
        "UTAMA",

      /* ---------------------------------------------------------------
       * DATA KENDARAAN
       * --------------------------------------------------------------- */

      nomorBpkb:
        nullableText(collateral?.nomorBpkb ?? collateral?.nomor_bpkb) || "",

      nomorPolisi:
        nullableText(collateral?.nomorPolisi ?? collateral?.nomor_polisi) || "",

      nomorRangka:
        nullableText(collateral?.nomorRangka ?? collateral?.nomor_rangka) || "",

      nomorMesin:
        nullableText(collateral?.nomorMesin ?? collateral?.nomor_mesin) || "",

      merkKendaraan:
        nullableText(
          collateral?.merkKendaraan ??
            collateral?.merk_kendaraan ??
            collateral?.merek,
        ) || "",

      tipeKendaraan:
        nullableText(
          collateral?.tipeKendaraan ??
            collateral?.tipe_kendaraan ??
            collateral?.tipe,
        ) || "",

      tahunKendaraan: nullableNumber(
        collateral?.tahunKendaraan ??
          collateral?.tahun_kendaraan ??
          collateral?.tahun,
      ),

      /* ---------------------------------------------------------------
       * FIELD AGUNAN LAINNYA
       * --------------------------------------------------------------- */

      nomorIdentitas: nullableText(
        collateral?.nomorIdentitas ?? collateral?.nomor_identitas,
      ),

      objekAgunan: nullableText(
        collateral?.objekAgunan ??
          collateral?.objek_agunan ??
          collateral?.objek,
      ),

      lokasiDetail: nullableText(
        collateral?.lokasiDetail ?? collateral?.lokasi_detail,
      ),
    };
  });
}

/* ========================================================================
 * BUILD PAYLOAD UPDATE PK
 *
 * Field di bawah hanya untuk tabel public.pk.
 *
 * PENTING:
 * - rt dan rw tetap dikirim.
 * - addendum_1, addendum_2, addendum_3 TIDAK dikirim karena kolom
 *   tersebut tidak ada pada tabel pk.
 * - relatedParties TIDAK dimasukkan di sini karena disimpan terpisah
 *   oleh pkSupabase.js melalui syncRelatedParties().
 * - collaterals TIDAK dimasukkan ke payload pk karena Agunan disimpan
 *   pada tabel agunan / pk_agunan dan tabel terkait lainnya.
 * ======================================================================== */

export function buildPkUpdatePayload(pk) {
  if (!pk?.id) return null;

  return {
    /* ================================================================
     * DATA KREDIT
     * ================================================================ */

    jenis_pengajuan_kredit: nullableText(pk.jenis_pengajuan_kredit),

    nomor_aplikasi: nullableText(pk.nomor_aplikasi),

    tanggal_aplikasi: nullableDate(pk.tanggal_aplikasi),

    tanggal_pk: nullableDate(pk.tanggal_pk),

    nomor_pk: nullableText(pk.nomor_pk),

    cif: nullableText(pk.cif),

    limit_kredit: nullableNumber(pk.limit_kredit),

    jangka_waktu: nullableNumber(pk.jangka_waktu),

    rekening_tabungan: nullableText(pk.rekening_tabungan),

    rekening_kredit: nullableText(pk.rekening_kredit),

    /* ================================================================
     * IDENTITAS DEBITUR
     * ================================================================ */

    nama_debitur: nullableText(pk.nama_debitur),

    status_debitur: nullableText(pk.status_debitur),

    penyebutan_debitur: nullableText(pk.penyebutan_debitur),

    jenis_kelamin: nullableText(pk.jenis_kelamin),

    nomor_ktp: nullableText(pk.nomor_ktp ?? pk.nik),

    tanggal_expired_ktp: nullableDate(pk.tanggal_expired_ktp),

    tempat_lahir: nullableText(pk.tempat_lahir),

    tanggal_lahir: nullableDate(pk.tanggal_lahir),

    profesi: nullableText(pk.profesi),

    nomor_handphone: nullableText(pk.nomor_handphone ?? pk.nomorHp),

    /* ================================================================
     * ALAMAT DEBITUR
     * ================================================================ */

    alamat_jalan: nullableText(pk.alamat_jalan),

    rt: nullableText(pk.rt),

    rw: nullableText(pk.rw),

    alamat_desa_kelurahan: nullableText(pk.alamat_desa_kelurahan),

    alamat_kecamatan: nullableText(pk.alamat_kecamatan),

    alamat_kabupaten: nullableText(pk.alamat_kabupaten),

    /* ================================================================
     * PASANGAN
     * ================================================================ */

    nama_pasangan: nullableText(pk.nama_pasangan),

    nik_pasangan: nullableText(pk.nik_pasangan),

    nomor_handphone_pasangan: nullableText(pk.nomor_handphone_pasangan),

    alamat_pasangan_sama_debitur: nullableBoolean(
      pk.alamat_pasangan_sama_debitur,
    ),

    alamat_pasangan_jalan: nullableText(pk.alamat_pasangan_jalan),

    alamat_pasangan_rt: nullableText(pk.alamat_pasangan_rt),

    alamat_pasangan_rw: nullableText(pk.alamat_pasangan_rw),

    alamat_pasangan_desa_kelurahan: nullableText(
      pk.alamat_pasangan_desa_kelurahan,
    ),

    alamat_pasangan_kecamatan: nullableText(pk.alamat_pasangan_kecamatan),

    alamat_pasangan_kabupaten: nullableText(pk.alamat_pasangan_kabupaten),

    /* ================================================================
     * KREDIT
     * ================================================================ */

    tujuan_kredit: nullableText(pk.tujuan_kredit),

    bunga_per_bulan: nullableNumber(pk.bunga_per_bulan),

    bunga_per_tahun: nullableNumber(pk.bunga_per_tahun),

    angsuran_kredit: nullableNumber(pk.angsuran_kredit),

    tanggal_acuan_angsuran: nullableDate(pk.tanggal_acuan_angsuran),

    /* ================================================================
     * BIAYA
     * ================================================================ */

    biaya_provisi: nullableNumber(pk.biaya_provisi),

    biaya_admin: nullableNumber(pk.biaya_admin),

    biaya_provisi_rupiah: nullableNumber(pk.biaya_provisi_rupiah),

    materai: nullableNumber(pk.materai),

    premi_asuransi_jiwa: nullableNumber(pk.premi_asuransi_jiwa),

    nilai_agunan_bangunan: nullableNumber(pk.nilai_agunan_bangunan),

    biaya_premi_kebakaran: nullableNumber(pk.biaya_premi_kebakaran),

    biaya_notaris: nullableNumber(pk.biaya_notaris),

    nilai_pengikatan: nullableNumber(pk.nilai_pengikatan),

    total_biaya: nullableNumber(pk.total_biaya),

    limit_kredit_sebelumnya: nullableNumber(pk.limit_kredit_sebelumnya),

    nominal_pelunasan_pinjaman_exist: nullableNumber(
      pk.nominal_pelunasan_pinjaman_exist,
    ),

    biaya_blokir_bpkb: nullableNumber(pk.biaya_blokir_bpkb),

    /* ================================================================
     * ASURANSI / NOTARIS
     * ================================================================ */

    pt_asuransi_jiwa: nullableText(pk.pt_asuransi_jiwa),

    rekening_asuransi_jiwa: nullableText(pk.rekening_asuransi_jiwa),

    rekening_notaris: nullableText(pk.rekening_notaris),

    pt_asuransi_kendaraan: nullableText(pk.pt_asuransi_kendaraan),

    nomor_rekening_blokiran: nullableText(pk.nomor_rekening_blokiran),

    klasifikasi_debitur: nullableText(pk.klasifikasi_debitur),

    /* ================================================================
     * STATUS
     * ================================================================ */

    status_pk: nullableText(pk.status_pk ?? pk.loanStatus) ?? "AKTIF",

    notaris_id: nullableText(pk.notaris_id),

    updated_at: new Date().toISOString(),
  };
}
