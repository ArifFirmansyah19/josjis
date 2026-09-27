import * as XLSX from "xlsx";

const ALLOWED_EXTENSIONS = [".xls", ".xlsx", ".xlsm", ".xlsb"];

function getExtension(fileName) {
  const name = String(fileName || "").toLowerCase();
  const index = name.lastIndexOf(".");

  return index === -1 ? "" : name.slice(index);
}

function isSupportedFile(file) {
  if (!file) return false;

  return ALLOWED_EXTENSIONS.includes(getExtension(file.name));
}

function getSheetRows(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });
}

function findPortUnitSheet(workbook) {
  return workbook.SheetNames.find(
    (name) => String(name).trim().toLowerCase() === "portunit",
  );
}

export async function parseRaportMuExcel(file) {
  if (!file) {
    throw new Error("File Excel belum dipilih.");
  }

  if (!isSupportedFile(file)) {
    throw new Error(
      "Format file tidak didukung. Gunakan .xls, .xlsx, .xlsm, atau .xlsb.",
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
    cellNF: false,
    cellText: true,
  });

  const sheetNames = workbook.SheetNames || [];

  const portUnitSheet = findPortUnitSheet(workbook);

  if (!portUnitSheet) {
    throw new Error('Sheet "PortUnit" tidak ditemukan di file Excel.');
  }

  const portUnitRows = getSheetRows(workbook, portUnitSheet);

  return {
    fileName: file.name,
    fileSize: file.size,
    importedAt: new Date().toISOString(),
    status: "READY",

    sheetCount: sheetNames.length,

    portUnit: {
      sheetName: portUnitSheet,
      rows: portUnitRows,
      rowCount: portUnitRows.length,
    },
  };
}

export function formatFileSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  const units = ["Bytes", "KB", "MB", "GB"];

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}
