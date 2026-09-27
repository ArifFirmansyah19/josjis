import {
  requiresNpwp,
  requiresBpjsTk,
  requiresGuaranteePolicy,
} from "./pkRules";

export const PK_DOCUMENTS = [
  {
    key: "pasFoto",
    label: "Pas Foto",
  },
  {
    key: "spesimen",
    label: "Spesimen",
  },
  {
    key: "ktpDebitur",
    label: "KTP Debitur",
  },
  {
    key: "gcg",
    label: "GCG",
  },
  {
    key: "pdpIndividu",
    label: "PDP Individu",
  },
  {
    key: "nak",
    label: "NAK",
  },
  {
    key: "rab",
    label: "RAB",
  },
  {
    key: "buktiKebun",
    label: "Bukti Kebun",
  },
  {
    key: "fcSertifikat",
    label: "FC Sertifikat",
  },
  {
    key: "suratJualBeli",
    label: "Surat Jual Beli",
    optional: true,
  },
  {
    key: "pbb",
    label: "PBB",
  },
  {
    key: "kk",
    label: "KK",
  },
  {
    key: "akteNikah",
    label: "Akte Nikah",
    optional: true,
  },
  {
    key: "npwp",
    label: "NPWP",
  },
  {
    key: "bpjsTk",
    label: "BPJS TK",
  },
  {
    key: "aplikasiPermohonan",
    label: "Aplikasi Permohonan",
  },
  {
    key: "idebDebitur",
    label: "iDeb Debitur",
  },
  {
    key: "idebPasangan",
    label: "iDeb Pasangan",
    optional: true,
  },
  {
    key: "idebPihakKetiga",
    label: "iDeb Pihak Ketiga",
    optional: true,
  },
  {
    key: "formDelegasi",
    label: "Form Delegasi",
  },
  {
    key: "fotoOtsKebun",
    label: "Foto OTS Kebun/Usaha",
  },
  {
    key: "fotoOtsRumah",
    label: "Foto OTS Rumah/Tempat Tinggal",
  },
  {
    key: "fotoPk",
    label: "Foto PK",
  },
  {
    key: "cn",
    label: "CN",
  },
  {
    key: "orderSijitu",
    label: "Order SIJITU",
  },
  {
    key: "ktpPasangan",
    label: "KTP Pasangan",
    optional: true,
  },
  {
    key: "dokumenPk",
    label: "Dokumen PK",
  },
  {
    key: "bastMoral",
    label: "BAST Moral",
    optional: true,
  },
  {
    key: "suratUsahaMikroKecil",
    label: "Surat Usaha Mikro Kecil",
  },
];

export function getApplicableDocuments(pk) {
  return PK_DOCUMENTS.filter((document) => {
    if (document.key === "npwp") {
      return requiresNpwp(pk.loanType, pk.limit);
    }

    if (document.key === "bpjsTk") {
      return requiresBpjsTk(pk.loanType, pk.limit);
    }

    if (document.key === "ktpPasangan") {
      return pk.maritalStatus === "ISTRI" || pk.maritalStatus === "SUAMI";
    }

    if (document.key === "idebPasangan") {
      return pk.maritalStatus === "ISTRI" || pk.maritalStatus === "SUAMI";
    }

    if (document.key === "cn") {
      return Boolean(pk.binding?.type);
    }

    if (document.key === "bastMoral") {
      return Boolean(pk.hasMoralCollateral);
    }

    if (document.key === "guaranteePolicy") {
      return requiresGuaranteePolicy(pk.loanType);
    }

    return true;
  });
}

export function getCompleteness(pk) {
  const documents = pk.documents || {};

  const missing = [];

  if (!pk.debtorName) {
    missing.push("Nama Debitur");
  }

  if (!pk.nik) {
    missing.push("NIK");
  }

  if (!pk.applicationNumber) {
    missing.push("No. Aplikasi");
  }

  if (!pk.pkNumber) {
    missing.push("No. PK");
  }

  if (!pk.limit) {
    missing.push("Limit");
  }

  if (!pk.tenor) {
    missing.push("Tenor");
  }

  if (!pk.cif) {
    missing.push("CIF");
  }

  if (pk.maritalStatus === "ISTRI" || pk.maritalStatus === "SUAMI") {
    if (!pk.spouse?.name) {
      missing.push("Nama Pasangan");
    }
  }

  if (!pk.collaterals?.length) {
    missing.push("Agunan");
  }

  const applicableDocuments = getApplicableDocuments(pk);

  applicableDocuments.forEach((document) => {
    if (document.optional) {
      return;
    }

    if (!documents[document.key]) {
      missing.push(document.label);
    }
  });

  return {
    complete: missing.length === 0,
    missing,
    total: applicableDocuments.length,
    completed:
      applicableDocuments.length -
      applicableDocuments.filter((document) => !documents[document.key]).length,
  };
}
