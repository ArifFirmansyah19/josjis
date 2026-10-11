export function textOrEmpty(value) {
  return value === undefined || value === null ? "" : String(value);
}

export function nullableText(value) {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  return text || null;
}

export function nullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function nullableDate(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

export function isUuid(value) {
  return (
    !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value),
    )
  );
}

export function generateFallbackOwnerId(owner, index = 0) {
  // Jika sudah ada ID lokal, pertahankan agar identitas form stabil.
  if (owner?.id && !isUuid(owner.id)) {
    return owner.id;
  }

  // ID ini hanya untuk form, bukan ID database.
  return `OWNER-LOCAL-${index}`;
}
