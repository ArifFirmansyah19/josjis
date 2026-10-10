import { nullableText, nullableNumber, isUuid } from "../shared/pkHelpers";

import {
  normalizeCollateralForSave,
  validateCollateral,
  mapLocationToDb,
  mapCertificateTypeToDb,
  buildBindingNote,
} from "./collateralValidation";

/**
 * Simpan daftar pemilik pada master agunan.
 * Perilaku asli dipertahankan: daftar pemilik lama
 * dihapus dan diganti dengan daftar terbaru.
 */
export async function syncAgunanOwners({ supabase, agunanId, owners }) {
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

/**
 * Ambil master agunan dan pemiliknya ketika agunan
 * digunakan kembali dari pinjaman sebelumnya.
 */
export async function fetchMasterAgunanForReuse({ supabase, agunanId }) {
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

/**
 * Simpan informasi pengikatan agunan pada relasi PK Agunan.
 */
export async function syncAgunanBinding({ supabase, pkAgunanId, binding }) {
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

    // Pertahankan informasi surat dan pengikatan sebelumnya.
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

/**
 * Sinkronisasi seluruh agunan pada suatu PK.
 *
 * - Memperbarui relasi PK Agunan yang sudah ada.
 * - Membuat master agunan baru jika diperlukan.
 * - Mempertahankan master dan pemilik saat reuse.
 * - Memperbarui pengikatan.
 * - Menandai relasi yang dikeluarkan sebagai DILEPAS,
 *   bukan menghapus riwayat relasinya.
 */
export async function syncCollaterals({ supabase, pkId, collaterals }) {
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
      // Master tidak boleh diperbarui saat reuse.
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
      // Gunakan pemilik master lama tanpa menghapus
      // atau mengganti daftar pemiliknya.
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

  // Jangan hapus riwayat relasi. Tandai sebagai DILEPAS.
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
