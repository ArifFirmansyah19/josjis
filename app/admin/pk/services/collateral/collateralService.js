import { nullableText, nullableNumber, isUuid } from "../shared/pkHelpers";

import {
  normalizeCollateralForSave,
  validateCollateral,
  mapLocationToDb,
  mapCertificateTypeToDb,
  buildBindingNote,
} from "./collateralValidation";

const NIK_OPTIONAL_RELATIONSHIPS = new Set(["JUAL_BELI", "SAUDARA", "WARIS"]);

function normalizeRelationship(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export async function syncAgunanOwners({ supabase, agunanId, owners }) {
  if (!agunanId || !isUuid(agunanId)) {
    throw new Error("ID Agunan tidak valid untuk menyimpan pemilik.");
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const desiredOwners = (Array.isArray(owners) ? owners : [])
    .map((owner) => {
      const hubungan = normalizeRelationship(owner?.hubungan);

      const rawDbId = owner?.dbId;
      const rawId = owner?.id;

      // Hanya UUID database yang boleh dikirim sebagai dbId.
      const dbId =
        typeof rawDbId === "string" && uuidPattern.test(rawDbId)
          ? rawDbId
          : typeof rawId === "string" && uuidPattern.test(rawId)
            ? rawId
            : null;

      return {
        dbId,
        nama: String(owner?.nama ?? owner?.name ?? "").trim(),
        nik: NIK_OPTIONAL_RELATIONSHIPS.has(hubungan)
          ? null
          : String(owner?.nik ?? owner?.NIK ?? "").trim() || null,
        hubungan: hubungan || null,
      };
    })
    .filter((owner) => owner.nama);

  if (!desiredOwners.length) {
    throw new Error("Minimal satu Pemilik Agunan harus diisi.");
  }

  // Hindari ID database yang sama dipakai dua kali dalam satu formulir.
  const dbIds = desiredOwners.map((owner) => owner.dbId).filter(Boolean);

  if (new Set(dbIds).size !== dbIds.length) {
    throw new Error(
      "Terdapat ID pemilik database yang duplikat. Periksa daftar pemilik agunan.",
    );
  }

  const result = await supabase.rpc("sync_agunan_owners", {
    p_agunan_id: agunanId,
    p_owners: desiredOwners,
  });

  if (result.error) {
    throw new Error(`Gagal menyimpan pemilik agunan: ${result.error.message}`);
  }

  if (!Array.isArray(result.data)) {
    throw new Error(
      "Respons sync_agunan_owners tidak valid. Pastikan fungsi RPC mengembalikan array pemilik.",
    );
  }

  return result.data.map((owner) => {
    if (!owner?.id || !uuidPattern.test(String(owner.id))) {
      throw new Error("Respons RPC berisi ID pemilik yang tidak valid.");
    }

    const nama = String(owner.nama ?? "").trim();

    if (!nama) {
      throw new Error("Respons RPC berisi pemilik tanpa nama.");
    }

    return {
      // ID lokal untuk kebutuhan UI.
      id: `OWNER_${owner.id}`,

      // UUID asli dari tabel agunan_pemilik.
      dbId: owner.id,

      name: nama,
      nama,
      nik: owner.nik ?? "",
      hubungan: owner.hubungan ?? null,
      is_primary: Boolean(owner.is_primary),
    };
  });
}

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
    .order("created_at", { ascending: true });

  if (existingResult.error) {
    throw existingResult.error;
  }

  const existing = existingResult.data?.[0] || null;

  const notaryId = isUuid(bindingData.notaryId)
    ? bindingData.notaryId
    : existing?.notaris_id || null;

  const noteValue =
    bindingData.note !== undefined
      ? bindingData.note
      : bindingData.catatan !== undefined
        ? bindingData.catatan
        : (existing?.catatan ?? null);

  const covernoteValue =
    bindingData.covernote !== undefined
      ? bindingData.covernote
      : (existing?.covernote ?? null);

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

    catatan:
      noteValue == null || String(noteValue).trim() === ""
        ? null
        : String(noteValue),
    covernote:
      covernoteValue == null || String(covernoteValue).trim() === ""
        ? null
        : String(covernoteValue),

    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const result = await supabase
      .from("agunan_pengikatan")
      .update(payload)
      .eq("id", existing.id)
      .eq("pk_agunan_id", pkAgunanId)
      .select("id, catatan, covernote")
      .single();

    if (result.error) {
      throw result.error;
    }
  } else {
    const result = await supabase
      .from("agunan_pengikatan")
      .insert(payload)
      .select("id, catatan, covernote")
      .single();

    if (result.error) {
      throw result.error;
    }
  }
}

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
    .order("urutan", { ascending: true });

  if (existingResult.error) {
    throw existingResult.error;
  }

  const existingRows = existingResult.data || [];

  // Hanya relasi yang masih aktif yang boleh dipakai ulang
  // sebagai relasi yang sedang diedit.
  const activeRows = existingRows.filter(
    (row) =>
      row?.id && String(row.status_agunan || "").toUpperCase() !== "DILEPAS",
  );

  const existingMap = new Map(activeRows.map((row) => [String(row.id), row]));

  const usedIds = new Set();

  const optionalNikRelationships = new Set(["JUAL_BELI", "SAUDARA", "WARIS"]);

  const normalizeRelationshipValue = (value) =>
    String(value || "")
      .trim()
      .toUpperCase();

  for (let index = 0; index < desired.length; index++) {
    const collateral = desired[index];

    const type = String(collateral.type || "")
      .trim()
      .toUpperCase();

    // Cari relasi berdasarkan ID relasi PK, bukan ID master agunan.
    let existingPkAgunan = null;

    const relationIdCandidates = [collateral.pkAgunanId, collateral.id];

    for (const candidate of relationIdCandidates) {
      if (!candidate || !isUuid(candidate)) continue;

      const match = existingMap.get(String(candidate));

      if (match && !usedIds.has(String(match.id))) {
        existingPkAgunan = match;
        break;
      }
    }

    const hasCurrentRelation = Boolean(existingPkAgunan?.id);

    const existingMasterId =
      existingPkAgunan?.agunan_id && isUuid(existingPkAgunan.agunan_id)
        ? existingPkAgunan.agunan_id
        : null;

    const inputMasterId =
      collateral.agunanId && isUuid(collateral.agunanId)
        ? collateral.agunanId
        : null;

    // Relasi lama harus tetap mengacu ke master yang sama.
    if (
      existingMasterId &&
      inputMasterId &&
      existingMasterId !== inputMasterId
    ) {
      throw new Error(
        `Agunan ke-${index + 1}: ID master tidak cocok dengan relasi PK yang sedang diedit.`,
      );
    }

    const agunanId = existingMasterId || inputMasterId;

    const isExplicitReuse = Boolean(
      collateral.isReusedAgunan ||
      collateral.pernahAgunanPinjamanLama ||
      collateral.isReused ||
      collateral.reuseFromLoanId,
    );

    // Master lama untuk relasi baru wajib dipilih sebagai reuse.
    if (agunanId && !hasCurrentRelation && !isExplicitReuse) {
      throw new Error(
        `Agunan ke-${index + 1} menggunakan master lama, tetapi belum ditandai sebagai reuse. ` +
          "Pilih reuse secara eksplisit atau buat master agunan baru.",
      );
    }

    // Pertahankan status reuse pada relasi yang sedang diedit.
    const isReusedAgunan = Boolean(
      agunanId &&
      (isExplicitReuse || existingPkAgunan?.pernah_agunan_pinjaman_lama),
    );

    let masterId = agunanId;

    // Data master dan pemilik hanya dibaca ketika reuse.
    const reuseMaster = isReusedAgunan
      ? await fetchMasterAgunanForReuse({
          supabase,
          agunanId: masterId,
        })
      : null;

    if (isReusedAgunan && !reuseMaster?.agunan) {
      throw new Error(
        `Master Agunan ${masterId} tidak ditemukan atau tidak dapat dibaca.`,
      );
    }

    const location = mapLocationToDb(collateral.certificateLocation);

    const certificateType = mapCertificateTypeToDb(collateral.certificateType);

    const isBpkb = type === "BPKB";
    const source = isReusedAgunan ? reuseMaster.agunan : null;

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

      tipe_agunan: isReusedAgunan
        ? (source?.tipe_agunan ?? collateral.tipeAgunan ?? null)
        : collateral.tipeAgunan || null,

      tipe_agunan_lainnya: isReusedAgunan
        ? (source?.tipe_agunan_lainnya ?? collateral.tipeAgunanLainnya ?? null)
        : collateral.tipeAgunan === "LAINNYA"
          ? collateral.tipeAgunanLainnya?.trim() || null
          : null,

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
      objek: isReusedAgunan ? (source?.objek ?? null) : null,
      luas: effectiveArea,

      alamat_desa_kelurahan: effectiveVillage,
      alamat_kecamatan: effectiveDistrict,
      alamat_kabupaten: effectiveRegency,
      nilai_agunan: effectiveValue,

      lokasi_fisik: isReusedAgunan
        ? (source?.lokasi_fisik ?? location.lokasiFisik)
        : location.lokasiFisik,

      lokasi_detail: isReusedAgunan
        ? (source?.lokasi_detail ?? collateral.lokasiKeterangan ?? null)
        : collateral.lokasiKeterangan || null,

      sumber_fisik_sertifikat: isReusedAgunan
        ? (source?.sumber_fisik_sertifikat ?? location.sumber)
        : location.sumber,

      catatan: isReusedAgunan ? (source?.catatan ?? null) : collateral.note,

      updated_at: new Date().toISOString(),
    };

    // Master reuse hanya dibaca, tidak di-update.
    if (!masterId) {
      const insertResult = await supabase
        .from("agunan")
        .insert(agunanPayload)
        .select("*")
        .single();

      if (insertResult.error) {
        throw insertResult.error;
      }

      if (!insertResult.data?.id) {
        throw new Error(`Master Agunan ke-${index + 1} gagal dibuat.`);
      }

      masterId = insertResult.data.id;
    } else if (!isReusedAgunan) {
      const updateResult = await supabase
        .from("agunan")
        .update(agunanPayload)
        .eq("id", masterId)
        .select("*")
        .single();

      if (updateResult.error) {
        throw updateResult.error;
      }

      if (!updateResult.data) {
        throw new Error(
          `Master Agunan ${masterId} tidak ditemukan saat update.`,
        );
      }
    }

    let snapshotOwners = [];

    if (isReusedAgunan) {
      // Tidak pernah menjalankan sinkronisasi pemilik saat reuse.
      snapshotOwners = Array.isArray(reuseMaster?.owners)
        ? reuseMaster.owners
        : [];
    } else {
      const owners = (Array.isArray(collateral.owners) ? collateral.owners : [])
        .map((owner) => ({
          ...owner,

          // id lokal tidak digunakan sebagai ID database.
          dbId: owner?.dbId || null,

          nama: String(owner?.nama ?? owner?.name ?? "").trim(),

          hubungan: collateral.relationship || owner?.hubungan || null,
        }))
        .filter((owner) => owner.nama);

      const savedOwners = await syncAgunanOwners({
        supabase,
        agunanId: masterId,
        owners,
      });

      // Gunakan hasil database agar dbId yang dikembalikan akurat.
      snapshotOwners = Array.isArray(savedOwners) ? savedOwners : [];
    }

    const relationship = normalizeRelationshipValue(
      collateral.relationship || snapshotOwners[0]?.hubungan,
    );

    const nikOptional = optionalNikRelationships.has(relationship);

    const ownerNames = snapshotOwners
      .map((owner) => String(owner?.nama ?? owner?.name ?? "").trim())
      .filter(Boolean);

    const ownerNiks = nikOptional
      ? []
      : snapshotOwners
          .map((owner) => String(owner?.nik ?? owner?.NIK ?? "").trim())
          .filter(Boolean);

    const bindingType = String(collateral.binding?.type || "TIDAK_ADA")
      .trim()
      .toUpperCase();

    const pkAgunanPayload = {
      pk_id: pkId,
      urutan: index + 1,
      jenis_agunan: type,

      nama_pemilik: ownerNames.join(", ") || null,
      nomor_ktp_pemilik: ownerNiks.join(", ") || null,

      tanggal_expired_ktp_pemilik: null,
      alamat_pemilik: null,
      hubungan_dengan_debitur: relationship || null,

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

      objek_agunan: isReusedAgunan ? (source?.objek ?? null) : null,

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
        ? (source?.lokasi_fisik ?? location.lokasiFisik)
        : location.lokasiFisik,

      lokasi_keterangan: isReusedAgunan
        ? (source?.lokasi_detail ??
          collateral.lokasiKeterangan ??
          location.sumber)
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
        existingPkAgunan?.status_agunan === "DILEPAS"
          ? "PROSES"
          : collateral.statusAgunan ||
            existingPkAgunan?.status_agunan ||
            "PROSES",

      agunan_id: masterId,

      peran_agunan:
        collateral.peranAgunan || existingPkAgunan?.peran_agunan || null,

      pernah_agunan_pinjaman_lama:
        isReusedAgunan ||
        Boolean(
          collateral.pernahAgunanPinjamanLama ||
          existingPkAgunan?.pernah_agunan_pinjaman_lama,
        ),

      status_ht_lama: existingPkAgunan?.status_ht_lama || null,

      nomor_ht_lama: existingPkAgunan?.nomor_ht_lama || null,

      tanggal_ht_lama: existingPkAgunan?.tanggal_ht_lama || null,

      updated_at: new Date().toISOString(),
    };

    let pkAgunanId = existingPkAgunan?.id || null;

    if (existingPkAgunan) {
      const updateRelationResult = await supabase
        .from("pk_agunan")
        .update(pkAgunanPayload)
        .eq("id", existingPkAgunan.id)
        .eq("pk_id", pkId)
        .select("id")
        .single();

      if (updateRelationResult.error) {
        throw updateRelationResult.error;
      }

      if (!updateRelationResult.data?.id) {
        throw new Error(`Relasi PK Agunan ke-${index + 1} gagal diperbarui.`);
      }

      pkAgunanId = updateRelationResult.data.id;
    } else {
      const insertRelationResult = await supabase
        .from("pk_agunan")
        .insert(pkAgunanPayload)
        .select("id")
        .single();

      if (insertRelationResult.error) {
        throw insertRelationResult.error;
      }

      if (!insertRelationResult.data?.id) {
        throw new Error(`Relasi PK Agunan ke-${index + 1} gagal dibuat.`);
      }

      pkAgunanId = insertRelationResult.data.id;
    }

    usedIds.add(String(pkAgunanId));

    await syncAgunanBinding({
      supabase,
      pkAgunanId,
      binding: collateral.binding,
    });
  }

  // Relasi yang tidak lagi dikirim oleh formulir tetap disimpan
  // sebagai riwayat, bukan dihapus.
  const removedRows = existingRows.filter(
    (row) =>
      row?.id &&
      !usedIds.has(String(row.id)) &&
      String(row.status_agunan || "").toUpperCase() !== "DILEPAS",
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
