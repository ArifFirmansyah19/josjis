export function createEmptyDocuments() {
  return {
    pasFoto: false,
    spesimen: false,
    ktpDebitur: false,
    gcg: false,
    pdpIndividu: false,
    nak: false,
    rab: false,
    buktiKebun: false,
    fcSertifikat: false,
    suratJualBeli: false,
    pbb: false,
    kk: false,
    akteNikah: false,
    npwp: false,
    bpjsTk: false,
    aplikasiPermohonan: false,
    idebDebitur: false,
    idebPasangan: false,
    idebPihakKetiga: false,
    formDelegasi: false,
    fotoOtsKebun: false,
    fotoOtsRumah: false,
    fotoPk: false,
    cn: false,
    orderSijitu: false,
    ktpPasangan: false,
    dokumenPk: false,
    bastMoral: false,
    suratUsahaMikroKecil: false,
  };
}

export function toggleDocument(documents, key, value) {
  return {
    ...documents,
    [key]: value,
  };
}
