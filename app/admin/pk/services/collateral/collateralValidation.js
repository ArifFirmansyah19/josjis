import {
  nullableText,
  nullableNumber,
  nullableDate,
  isUuid,
} from "../shared/pkHelpers";

export function normalizeCollateralForSave(collateral) {
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

export function validateCollateral(collateral, index) {
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

export function mapLocationToDb(certificateLocation) {
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

export function mapCertificateTypeToDb(value) {
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

export function buildBindingNote(binding) {
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
