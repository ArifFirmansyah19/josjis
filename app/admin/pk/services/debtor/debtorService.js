function nullableText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

export async function syncRelatedParties({ supabase, pkId, relatedParties }) {
  if (!pkId) {
    throw new Error("ID PK diperlukan untuk menyimpan Pihak Terkait.");
  }

  const desired = Array.isArray(relatedParties) ? relatedParties : [];

  // Validasi nama pihak terkait.
  desired.forEach((party) => {
    if (!party?.nama?.trim()) {
      throw new Error("Nama Pihak Terkait wajib diisi.");
    }
  });

  // Ambil data pihak terkait yang sudah tersimpan.
  const existingResult = await supabase
    .from("pk_related_party")
    .select("id, pk_id")
    .eq("pk_id", pkId);

  if (existingResult.error) {
    throw existingResult.error;
  }

  const existingRows = existingResult.data || [];

  const existingMap = new Map(existingRows.map((row) => [String(row.id), row]));

  // Identifikasi pihak terkait lama yang masih digunakan.
  const desiredIds = new Set(
    desired
      .map((party) => party?.id)
      .filter((id) => id && existingMap.has(String(id)))
      .map((id) => String(id)),
  );

  // Hapus pihak terkait yang sudah dikeluarkan dari formulir.
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

  // Simpan perubahan pihak terkait satu per satu.
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

      // Kolom alamat lama dikosongkan sesuai perilaku asli.
      street: null,
      rt: null,
      rw: null,
      village: null,
      district: null,
      regency: null,

      updated_at: new Date().toISOString(),
    };

    // Perbarui pihak terkait yang sudah ada.
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
      // Tambahkan pihak terkait baru.
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
