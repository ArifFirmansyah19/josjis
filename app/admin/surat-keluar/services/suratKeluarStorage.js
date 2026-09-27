const STORAGE_KEY = "josjis_surat_keluar";

const DEFAULT_DATA = {
  "JKK 1": [],
  "JKK 2": [],
};

export function getSuratKeluarData() {
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
      "JKK 1": Array.isArray(parsed["JKK 1"]) ? parsed["JKK 1"] : [],
      "JKK 2": Array.isArray(parsed["JKK 2"]) ? parsed["JKK 2"] : [],
    };
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveSuratKeluarData(data) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
