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
  { value: "DIBAWA_DEBITUR", label: "Dibawa Debitur saat PK" },
  { value: "PERLU_ORDER_CO", label: "Perlu di-order dari CO" },
  { value: "DI_CABANG", label: "Di Cabang" },
  { value: "DI_NOTARIS", label: "Di Notaris" },
];

export const BINDING_TYPES = {
  NONE: "TIDAK ADA",
  SKMHT: "SKMHT",
  APHT: "APHT",
};

function normalizeLoanType(value) {
  return value ? String(value).trim().toUpperCase() : "";
}

function normalizeCollateralType(value) {
  return value ? String(value).trim().toUpperCase() : "";
}

function normalizeCertificateType(value) {
  if (!value) return "";
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "ELEKTRONIK" || normalized === "ELECTRONIC")
    return "ELEKTRONIK";
  if (normalized === "FISIK" || normalized === "PHYSICAL") return "FISIK";
  return normalized;
}

export function isBindingEligibleCollateral(collateral) {
  return (
    normalizeCollateralType(
      collateral?.type ?? collateral?.jenisAgunan ?? collateral?.jenis_agunan,
    ) === "SHM"
  );
}

export function getFirstBindingCollateral(collaterals = []) {
  if (!Array.isArray(collaterals)) return null;
  return collaterals.find(isBindingEligibleCollateral) || null;
}

export function getBindingType(
  loanTypeOrLimit,
  limitOrCollaterals = [],
  maybeCollaterals = [],
) {
  let loanType = "";
  let limit = 0;
  let collaterals = [];
  if (
    typeof loanTypeOrLimit === "string" &&
    LOAN_TYPES.includes(normalizeLoanType(loanTypeOrLimit))
  ) {
    loanType = normalizeLoanType(loanTypeOrLimit);
    limit = Number(limitOrCollaterals || 0);
    collaterals = Array.isArray(maybeCollaterals) ? maybeCollaterals : [];
  } else {
    limit = Number(loanTypeOrLimit || 0);
    collaterals = Array.isArray(limitOrCollaterals) ? limitOrCollaterals : [];
  }
  if (!Number.isFinite(limit) || limit <= 0) return BINDING_TYPES.NONE;
  if (loanType !== "KUM" && loanType !== "KUR") return BINDING_TYPES.NONE;
  const firstShm = getFirstBindingCollateral(collaterals);
  if (!firstShm) return BINDING_TYPES.NONE;
  const certificateType = normalizeCertificateType(
    firstShm.certificateType ?? firstShm.certificate_type,
  );
  if (loanType === "KUM") {
    if (certificateType === "ELEKTRONIK") {
      return limit > 25000000 && limit <= 500000000
        ? BINDING_TYPES.APHT
        : BINDING_TYPES.NONE;
    }
    if (certificateType === "FISIK") {
      if (limit > 200000000) return BINDING_TYPES.APHT;
      if (limit > 25000000) return BINDING_TYPES.SKMHT;
    }
    return BINDING_TYPES.NONE;
  }
  if (loanType === "KUR") {
    if (certificateType === "ELEKTRONIK") {
      return limit > 100000000 && limit <= 500000000
        ? BINDING_TYPES.APHT
        : BINDING_TYPES.NONE;
    }
    if (certificateType === "FISIK") {
      if (limit > 200000000) return BINDING_TYPES.APHT;
      if (limit > 100000000) return BINDING_TYPES.SKMHT;
    }
    return BINDING_TYPES.NONE;
  }
  return BINDING_TYPES.NONE;
}

export function requiresBinding(
  loanTypeOrLimit,
  limitOrCollaterals = [],
  maybeCollaterals = [],
) {
  return (
    getBindingType(loanTypeOrLimit, limitOrCollaterals, maybeCollaterals) !==
    BINDING_TYPES.NONE
  );
}

export function getLoanStatus(pkDate) {
  if (!pkDate) return "DRAFT";
  const today = new Date();
  const date = new Date(pkDate);
  if (Number.isNaN(date.getTime())) return "DRAFT";
  return date <= today ? "ACTIVE" : "DRAFT";
}

export function requiresGuaranteePolicy(loanType) {
  return normalizeLoanType(loanType) === "KUR";
}

export function getGuaranteeProviders(loanType) {
  return normalizeLoanType(loanType) === "KUR" ? ["Askrindo", "Jamkrindo"] : [];
}

export function requiresNpwp(loanType, limit) {
  const amount = Number(limit || 0);
  const normalizedLoanType = normalizeLoanType(loanType);
  if (normalizedLoanType === "KUM") return amount > 25000000;
  if (normalizedLoanType === "KUR") return amount > 50000000;
  return false;
}

export function requiresBpjsTk(loanType, limit) {
  return (
    normalizeLoanType(loanType) === "KUR" && Number(limit || 0) > 100000000
  );
}

export function getCertificateOrderStatus(collateral) {
  if (!collateral) return "NONE";
  if (collateral.certificateLocation === "PERLU_ORDER_CO") return "PERLU_ORDER";
  if (collateral.certificateLocation === "DI_CABANG") return "DI_CABANG";
  if (collateral.certificateLocation === "DI_NOTARIS") return "DI_NOTARIS";
  return "DIBAWA_DEBITUR";
}
