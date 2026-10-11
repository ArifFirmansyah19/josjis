import {
  nullableText,
  nullableNumber,
  nullableDate,
  isUuid,
} from "../shared/pkHelpers";

const NIK_OPTIONAL_RELATIONSHIPS = new Set(["JUAL_BELI", "SAUDARA", "WARIS"]);

function normalizeRelationship(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export function normalizeCollateralForSave(collateral) {
  const relationship = nullableText(collateral?.relationship);
  const normalizedRelationship = normalizeRelationship(relationship);

  const rawOwners = Array.isArray(collateral?.owners) ? collateral.owners : [];

  let owners = rawOwners
    .map((owner) => {
      const ownerRelationship = nullableText(owner?.hubungan) || relationship;

      const normalizedOwnerRelationship =
        normalizeRelationship(ownerRelationship);

      const nikOptional = NIK_OPTIONAL_RELATIONSHIPS.has(
        normalizedOwnerRelationship,
      );

      return {
        id: owner?.id || null,
        nama: nullableText(owner?.nama ?? owner?.name),
        nik: nikOptional ? null : nullableText(owner?.nik),
        hubungan: ownerRelationship,
      };
    })
    .filter((owner) => owner.nama);

  // Kompatibilitas dengan data lama yang hanya memiliki satu pemilik.
  if (!owners.length && nullableText(collateral?.owner)) {
    const nikOptional = NIK_OPTIONAL_RELATIONSHIPS.has(normalizedRelationship);

    owners = [
      {
        id: null,
        nama: nullableText(collateral.owner),
        nik: nikOptional
          ? null
          : nullableText(
              collateral?.ownerNik ??
                collateral?.nikPemilik ??
                collateral?.nik_pemilik,
            ),
        hubungan: relationship,
      },
    ];
  }

  const isReusedAgunan = Boolean(
    collateral?.isReusedAgunan ||
    collateral?.isReused ||
    collateral?.reuseFromLoanId,
  );

  const pernahAgunanPinjamanLama = Boolean(
    collateral?.pernahAgunanPinjamanLama || isReusedAgunan,
  );

  return {
    id: collateral?.id || null,
    pkAgunanId: collateral?.pkAgunanId || null,
    agunanId: collateral?.agunanId || null,

    type: nullableText(collateral?.type),
    tipeAgunan: nullableText(collateral?.tipeAgunan),
    tipeAgunanLainnya: nullableText(collateral?.tipeAgunanLainnya),

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
    relationship,

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
      covernote: nullableText(collateral?.binding?.covernote),

      status: nullableText(collateral?.binding?.status) || "BELUM_DIPROSES",
    },

    statusOrder: nullableText(collateral?.statusOrder),
    statusMigrasi: nullableText(collateral?.statusMigrasi),
    statusDokumen: nullableText(collateral?.statusDokumen),
    statusAgunan: nullableText(collateral?.statusAgunan),

    lokasiFisik: nullableText(collateral?.lokasiFisik),
    lokasiKeterangan: nullableText(collateral?.lokasiKeterangan),

    peranAgunan: nullableText(collateral?.peranAgunan),

    pernahAgunanPinjamanLama,
    isReusedAgunan,
    reuseFromLoanId: collateral?.reuseFromLoanId || null,
  };
}

export function validateCollateral(collateral, index = 0) {
  const nomor = index + 1;

  if (!collateral) {
    throw new Error(`Data Agunan ke-${nomor} tidak valid.`);
  }

  const type = String(collateral.type || "")
    .trim()
    .toUpperCase();

  if (!["SHM", "BPKB"].includes(type)) {
    throw new Error(`Jenis Agunan ke-${nomor} harus SHM atau BPKB.`);
  }

  if (!nullableText(collateral.number)) {
    throw new Error(`Nomor ${type} Agunan ke-${nomor} wajib diisi.`);
  }

  if (!Array.isArray(collateral.owners) || !collateral.owners.length) {
    throw new Error(`Pemilik Agunan ke-${nomor} wajib diisi.`);
  }

  if (
    !collateral.owners.some((owner) => nullableText(owner?.nama ?? owner?.name))
  ) {
    throw new Error(`Nama Pemilik Agunan ke-${nomor} wajib diisi.`);
  }

  const isExplicitReuse = Boolean(
    collateral.isReusedAgunan ||
    collateral.pernahAgunanPinjamanLama ||
    collateral.isReused ||
    collateral.reuseFromLoanId,
  );

  if (isExplicitReuse && !isUuid(collateral.agunanId)) {
    throw new Error(
      `Agunan pinjaman lama ke-${nomor} harus memiliki ID master agunan yang valid.`,
    );
  }

  const relationship = normalizeRelationship(collateral.relationship);

  if (NIK_OPTIONAL_RELATIONSHIPS.has(relationship)) {
    // NIK memang tidak diwajibkan untuk hubungan ini.
    // Nilai NIK akan dinormalisasi menjadi null saat penyimpanan.
    return;
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

  if (normalized === "FISIK") return "FISIK";
  if (normalized === "ELEKTRONIK") return "ELEKTRONIK";

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
