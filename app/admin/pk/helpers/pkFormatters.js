import { UNIT_UUID } from "../constants/pkConstants";

export function getUnitUuid(activeUnit) {
  if (!activeUnit?.value) {
    return null;
  }

  return UNIT_UUID[activeUnit.value] || null;
}

export function formatMksName(name) {
  if (!name) {
    return "-";
  }

  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] || "-";
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];

  return `${lastName}/${firstName}`;
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateShort(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatCurrency(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function getDateYear(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return String(date.getFullYear());
}

export function getDateMonth(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return String(date.getMonth() + 1).padStart(2, "0");
}

export function getLimitBucket(value) {
  const limit = Number(value || 0);

  if (limit <= 25000000) {
    return "0-25";
  }

  if (limit <= 100000000) {
    return "25-100";
  }

  if (limit <= 200000000) {
    return "100-200";
  }

  if (limit <= 500000000) {
    return "200-500";
  }

  return "500+";
}

export function getRole() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("role") ||
    localStorage.getItem("user_role") ||
    localStorage.getItem("userRole") ||
    ""
  ).toUpperCase();
}
