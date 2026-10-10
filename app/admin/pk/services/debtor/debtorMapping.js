export function mapRelatedPartyToUi(party) {
  return {
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
  };
}

export function groupRelatedPartiesByPk(rows) {
  const relatedPartyMap = new Map();

  (rows || []).forEach((party) => {
    if (!party?.pk_id) return;

    const key = String(party.pk_id);

    if (!relatedPartyMap.has(key)) {
      relatedPartyMap.set(key, []);
    }

    relatedPartyMap.get(key).push(mapRelatedPartyToUi(party));
  });

  return relatedPartyMap;
}
