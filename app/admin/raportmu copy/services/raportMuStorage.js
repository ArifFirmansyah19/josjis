const STORAGE_KEY = "josjis_raportmu";

const DEFAULT_DATA = {
  fileName: null,
  fileSize: null,
  importedAt: null,

  totalRows: 0,
  sheetCount: 0,
  sheets: [],

  status: "EMPTY",
  updatedAt: null,
};

export function getRaportMuData() {
  if (typeof window === "undefined") {
    return DEFAULT_DATA;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_DATA;
    }

    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_DATA,
      ...parsed,
    };
  } catch (error) {
    console.error("Gagal membaca data RaportMU:", error);

    return DEFAULT_DATA;
  }
}

export function saveRaportMuData(data) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Gagal menyimpan data RaportMU:", error);

    throw new Error(
      "Data RaportMU terlalu besar untuk disimpan di Local Storage.",
    );
  }
}

export function clearRaportMuData() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
