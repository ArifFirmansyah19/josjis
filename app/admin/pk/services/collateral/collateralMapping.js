import {
  textOrEmpty,
  isUuid,
  generateFallbackOwnerId,
} from "../shared/pkHelpers";

export function mapCertificateTypeToUi(value) {
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

export function mapCertificateLocationToUi(pkAgunan, agunan) {
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

  if (source.includes("dibawa debitur")) {
    return "DIBAWA_DEBITUR";
  }

  if (source.includes("order")) {
    return "PERLU_ORDER_CO";
  }

  if (source.includes("notaris")) {
    return "DI_NOTARIS";
  }

  return "DI_CABANG";
}

export function mapCollateralToUi({
  pkAgunan,
  agunan,
  owners,
  binding,
  notary,
}) {
  const type = pkAgunan?.jenis_agunan || agunan?.jenis_agunan || "SHM";
  const isBpkb = String(type).toUpperCase() === "BPKB";

  const ownerRows = Array.isArray(owners)
    ? owners
        .map((owner, index) => ({
          // ID lokal untuk form, bukan ID database.
          id: generateFallbackOwnerId(owner, index),

          // UUID asli dari tabel agunan_pemilik.
          dbId: isUuid(owner?.id) ? owner.id : null,

          nama: textOrEmpty(owner?.nama),
          name: textOrEmpty(owner?.nama),
          nik: textOrEmpty(owner?.nik),
          hubungan: textOrEmpty(owner?.hubungan),
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

    // Tipe agunan tambahan
    tipeAgunan: agunan?.tipe_agunan ?? pkAgunan?.tipe_agunan ?? null,
    tipeAgunanLainnya:
      agunan?.tipe_agunan_lainnya ?? pkAgunan?.tipe_agunan_lainnya ?? "",
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
      covernote: textOrEmpty(binding?.covernote),
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
