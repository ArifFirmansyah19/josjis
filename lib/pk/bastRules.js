export const BAST_TYPES = {
  MORAL_OBLIGASI: "MORAL_OBLIGASI",
};

export const BAST_DESTINATIONS = {
  DEBITUR: "DEBITUR",
  NOTARIS: "NOTARIS",
};

/**
 * Membuat keterangan surat BAST
 * berdasarkan nomor surat, agunan, dan nama debitur.
 */
export function createBastDescription({
  number = "",
  collaterals = [],
  debtorName = "",
}) {
  const certificateNumbers = collaterals
    .map((item) => item?.number)
    .filter(Boolean);

  const normalizedNumber = String(number || "").trim();

  const normalizedDebtor = String(debtorName || "").trim();

  let description = normalizedNumber
    ? `${normalizedNumber} BAST MORAL`
    : "BAST MORAL";

  if (certificateNumbers.length > 0) {
    description += ` ${certificateNumbers.join(" & ")}`;
  }

  if (normalizedDebtor) {
    description += ` AN. ${normalizedDebtor.toUpperCase()}`;
  }

  return description;
}

/**
 * Label tujuan BAST.
 */
export function getBastDestinationLabel(destination, notaryName = "") {
  if (destination === BAST_DESTINATIONS.NOTARIS) {
    return notaryName ? `Notaris: ${notaryName}` : "Notaris";
  }

  if (destination === BAST_DESTINATIONS.DEBITUR) {
    return "Debitur";
  }

  return "-";
}

/**
 * Membuat object BAST kosong.
 */
export function createEmptyBast() {
  return {
    type: BAST_TYPES.MORAL_OBLIGASI,

    number: "",
    date: "",

    description: "",

    destination: "",
    notaryName: "",

    collateralIds: [],

    status: "DRAFT",

    savedAt: "",

    pdfGenerated: false,
  };
}
