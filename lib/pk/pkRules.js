export const LOAN_TYPES = ["KUM", "KUR", "KPP", "KSM"];

export const MARITAL_STATUS = [
  "ISTRI",
  "SUAMI",
  "DUDA",
  "JANDA",
  "CERAI HIDUP",
  "CERAI MATI",
];

export const CERTIFICATE_TYPES = ["Fisik", "Elektronik"];

export const CERTIFICATE_LOCATIONS = [
  {
    value: "DIBAWA_DEBITUR",
    label: "Dibawa Debitur saat PK",
  },
  {
    value: "PERLU_ORDER_CO",
    label: "Perlu di-order dari CO",
  },
  {
    value: "DI_CABANG",
    label: "Di Cabang",
  },
  {
    value: "DI_NOTARIS",
    label: "Di Notaris",
  },
];

export const BINDING_TYPES = {
  NONE: "TIDAK ADA",
  SKMHT: "SKMHT",
  APHT: "APHT",
};

export function getBindingType(limit, collaterals = []) {
  const amount = Number(limit || 0);

  const hasElectronicCertificate = collaterals.some(
    (item) => item.certificateType === "Elektronik",
  );

  if (hasElectronicCertificate) {
    return BINDING_TYPES.APHT;
  }

  if (amount > 200000000) {
    return BINDING_TYPES.APHT;
  }

  if (amount > 100000000) {
    return BINDING_TYPES.SKMHT;
  }

  return BINDING_TYPES.NONE;
}

export function requiresBinding(limit, collaterals = []) {
  return getBindingType(limit, collaterals) !== BINDING_TYPES.NONE;
}

export function getLoanStatus(pkDate) {
  if (!pkDate) {
    return "DRAFT";
  }

  const today = new Date();
  const date = new Date(pkDate);

  if (Number.isNaN(date.getTime())) {
    return "DRAFT";
  }

  return date <= today ? "ACTIVE" : "DRAFT";
}

export function requiresGuaranteePolicy(loanType) {
  return loanType === "KUR";
}

export function getGuaranteeProviders(loanType) {
  if (loanType !== "KUR") {
    return [];
  }

  return ["Askrindo", "Jamkrindo"];
}

export function requiresNpwp(loanType, limit) {
  const amount = Number(limit || 0);

  if (loanType === "KUM") {
    return amount > 25000000;
  }

  if (loanType === "KUR") {
    return amount > 50000000;
  }

  return false;
}

export function requiresBpjsTk(loanType, limit) {
  return loanType === "KUR" && Number(limit || 0) > 100000000;
}

export function getCertificateOrderStatus(collateral) {
  if (!collateral) {
    return "NONE";
  }

  if (collateral.certificateLocation === "PERLU_ORDER_CO") {
    return "PERLU_ORDER";
  }

  if (collateral.certificateLocation === "DI_CABANG") {
    return "DI_CABANG";
  }

  if (collateral.certificateLocation === "DI_NOTARIS") {
    return "DI_NOTARIS";
  }

  return "DIBAWA_DEBITUR";
}
