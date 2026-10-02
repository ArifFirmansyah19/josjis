"use client";

import { useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import {
  AlertCircle,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Import,
  Info,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Upload,
  X,
} from "lucide-react";

/* =========================================================
   TEMPLATE DATA
========================================================= */

const TEMPLATE_TYPES = [
  {
    id: "PK",
    title: "Data PK",
    description: "Template untuk import data Perjanjian Kredit.",
    icon: FileText,
    format: ".xlsx",
    color: "blue",
    fields: [
      "Nama Debitur",
      "NIK",
      "CIF",
      "No. Rekening",
      "No. PK",
      "Tgl PK",
      "Limit Pinjaman",
      "Tenor",
      "Jenis Pinjaman",
      "MKS",
    ],
  },
  {
    id: "AGUNAN",
    title: "Data Agunan",
    description: "Template data agunan dan dokumen jaminan.",
    icon: Database,
    format: ".xlsx",
    color: "emerald",
    fields: [
      "No. Rekening",
      "Nama Debitur",
      "No. SHM",
      "Nama Pemilik",
      "Pengikatan",
      "Posisi Fisik",
      "Status Legal",
      "Notaris",
      "Keterangan",
    ],
  },
  {
    id: "MIGRASI_NON_DMS",
    title: "Migrasi NON-DMS",
    description: "Template untuk proses migrasi NON-DMS.",
    icon: RefreshCw,
    format: ".xlsx",
    color: "violet",
    fields: [
      "No. Rekening",
      "Nama Debitur",
      "CIF",
      "No. PK",
      "Tanggal Migrasi",
      "Maker",
      "Checker",
      "Keterangan",
    ],
  },
  {
    id: "ORDER_AGUNAN",
    title: "Order Agunan",
    description: "Template data order pengambilan agunan.",
    icon: ArrowDownToLine,
    format: ".xlsx",
    color: "amber",
    fields: [
      "No. Rekening",
      "Nama Debitur",
      "No. SHM",
      "Tujuan Order",
      "Asal Dokumen",
      "Keterangan",
    ],
  },
  {
    id: "PENDING_NOTARIS",
    title: "Pending Notaris",
    description: "Template monitoring pending pengikatan notaris.",
    icon: Clock3,
    format: ".xlsx",
    color: "rose",
    fields: [
      "No. Rekening",
      "Nama Debitur",
      "Limit Pinjaman",
      "Tgl PK",
      "Pengikatan",
      "No. Rekening",
      "Keterangan",
      "Status",
    ],
  },
];

/* =========================================================
   DUMMY IMPORT HISTORY
========================================================= */

const INITIAL_HISTORY = [
  {
    id: 1,
    fileName: "PK_JKK1_September.xlsx",
    type: "PK",
    unit: "JKK1",
    total: 125,
    success: 122,
    error: 3,
    date: "30 September 2026 09:15",
    status: "SELESAI",
  },
  {
    id: 2,
    fileName: "Agunan_JKK1.xlsx",
    type: "AGUNAN",
    unit: "JKK1",
    total: 84,
    success: 84,
    error: 0,
    date: "29 September 2026 14:32",
    status: "SELESAI",
  },
  {
    id: 3,
    fileName: "Migrasi_NON_DMS_JKK2.xlsx",
    type: "MIGRASI_NON_DMS",
    unit: "JKK2",
    total: 42,
    success: 40,
    error: 2,
    date: "27 September 2026 10:04",
    status: "SELESAI",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getUnitCode(activeUnit) {
  return (
    activeUnit?.kode_unit ||
    activeUnit?.kode ||
    activeUnit?.kode_legacy ||
    "JKK1"
  );
}

function getTemplate(id) {
  return TEMPLATE_TYPES.find((item) => item.id === id);
}

function createPreviewRows(type, fileName) {
  if (!fileName) return [];

  const templates = {
    PK: [
      {
        row: 2,
        nama: "Budi Santoso",
        nik: "1571********0001",
        cif: "12345678",
        rekening: "123001234567890",
        noPk: "PK/001/2026",
        limit: "Rp100.000.000",
        status: "VALID",
      },
      {
        row: 3,
        nama: "Siti Aminah",
        nik: "1571********0002",
        cif: "12345679",
        rekening: "123001234567891",
        noPk: "PK/002/2026",
        limit: "Rp200.000.000",
        status: "VALID",
      },
      {
        row: 4,
        nama: "Andi Saputra",
        nik: "-",
        cif: "12345680",
        rekening: "123001234567892",
        noPk: "PK/003/2026",
        limit: "Rp150.000.000",
        status: "ERROR",
      },
    ],
    AGUNAN: [
      {
        row: 2,
        nama: "Budi Santoso",
        rekening: "123001234567890",
        shm: "SHM 12345",
        pemilik: "Budi Santoso",
        pengikatan: "SKMHT",
        posisi: "CABANG",
        status: "VALID",
      },
      {
        row: 3,
        nama: "Siti Aminah",
        rekening: "123001234567891",
        shm: "SHM 67890",
        pemilik: "Siti Aminah",
        pengikatan: "APHT",
        posisi: "NOTARIS",
        status: "VALID",
      },
      {
        row: 4,
        nama: "Andi Saputra",
        rekening: "123001234567892",
        shm: "-",
        pemilik: "Andi Saputra",
        pengikatan: "APHT",
        posisi: "CO",
        status: "ERROR",
      },
    ],
    MIGRASI_NON_DMS: [
      {
        row: 2,
        nama: "Budi Santoso",
        rekening: "123001234567890",
        cif: "12345678",
        noPk: "PK/001/2026",
        tanggal: "30/09/2026",
        maker: "2501838353",
        checker: "2501838123",
        status: "VALID",
      },
      {
        row: 3,
        nama: "Siti Aminah",
        rekening: "123001234567891",
        cif: "12345679",
        noPk: "PK/002/2026",
        tanggal: "30/09/2026",
        maker: "2501838353",
        checker: "2501838123",
        status: "VALID",
      },
      {
        row: 4,
        nama: "Andi Saputra",
        rekening: "123001234567892",
        cif: "-",
        noPk: "PK/003/2026",
        tanggal: "30/09/2026",
        maker: "2501838353",
        checker: "-",
        status: "ERROR",
      },
    ],
    ORDER_AGUNAN: [
      {
        row: 2,
        nama: "Budi Santoso",
        rekening: "123001234567890",
        shm: "SHM 12345",
        tujuan: "Penyatuan Dokumen",
        asal: "CO",
        status: "VALID",
      },
      {
        row: 3,
        nama: "Siti Aminah",
        rekening: "123001234567891",
        shm: "SHM 67890",
        tujuan: "Top Up",
        asal: "Notaris",
        status: "VALID",
      },
    ],
    PENDING_NOTARIS: [
      {
        row: 2,
        nama: "Budi Santoso",
        rekening: "123001234567890",
        limit: "Rp100.000.000",
        tanggal: "25/09/2026",
        pengikatan: "APHT",
        status: "VALID",
      },
      {
        row: 3,
        nama: "Siti Aminah",
        rekening: "123001234567891",
        limit: "Rp250.000.000",
        tanggal: "26/09/2026",
        pengikatan: "APHT",
        status: "VALID",
      },
    ],
  };

  return templates[type] || [];
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ImportDataPage() {
  const { activeUnit } = useUnit();

  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("IMPORT");
  const [selectedType, setSelectedType] = useState("PK");

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [previewRows, setPreviewRows] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const [history, setHistory] = useState(INITIAL_HISTORY);

  const [showHistoryDetail, setShowHistoryDetail] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const unitCode = getUnitCode(activeUnit);
  const currentTemplate = getTemplate(selectedType);

  /* =======================================================
     FILE HANDLING
  ======================================================= */

  function validateFile(file) {
    if (!file) return false;

    const allowed = [".xlsx", ".xls", ".xlsm", ".csv"];

    const lower = file.name.toLowerCase();

    return allowed.some((ext) => lower.endsWith(ext));
  }

  function handleFile(file) {
    if (!file) return;

    if (!validateFile(file)) {
      alert("Format file tidak didukung. Gunakan XLSX, XLS, XLSM, atau CSV.");
      return;
    }

    setSelectedFile(file);

    const rows = createPreviewRows(selectedType, file.name);

    setPreviewRows(rows);
    setShowPreview(false);
  }

  function handleInputChange(event) {
    const file = event.target.files?.[0];

    handleFile(file);

    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    handleFile(file);
  }

  function clearFile() {
    setSelectedFile(null);
    setPreviewRows([]);
    setShowPreview(false);
  }

  /* =======================================================
     IMPORT
  ======================================================= */

  function handlePreview() {
    if (!selectedFile) {
      alert("Silakan pilih file Excel terlebih dahulu.");
      return;
    }

    setShowPreview(true);
  }

  function handleImport() {
    if (!selectedFile) {
      alert("Silakan pilih file terlebih dahulu.");
      return;
    }

    const total = previewRows.length || 0;
    const error = previewRows.filter((row) => row.status === "ERROR").length;

    const success = Math.max(total - error, 0);

    const newHistory = {
      id: Date.now(),
      fileName: selectedFile.name,
      type: selectedType,
      unit: unitCode,
      total: total,
      success,
      error,
      date: new Date().toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "SELESAI",
    };

    setHistory((prev) => [newHistory, ...prev]);

    alert(
      `Preview import berhasil.\n\nValid: ${success}\nError: ${error}\n\nDatabase belum diubah pada tahap prototype ini.`,
    );
  }

  /* =======================================================
     TEMPLATE DOWNLOAD
  ======================================================= */

  function downloadTemplate(template) {
    /*
      Prototype:
      Untuk sekarang kita membuat file CSV sederhana.
      Nanti bisa diganti dengan generator XLSX
      menggunakan library seperti SheetJS / ExcelJS.
    */

    const header = template.fields.join(",");

    const example = template.fields
      .map((field) => {
        if (field.toLowerCase().includes("nama")) {
          return "Contoh Debitur";
        }

        if (field.toLowerCase().includes("nik")) {
          return "1571XXXXXXXX0001";
        }

        if (field.toLowerCase().includes("rekening")) {
          return "123001234567890";
        }

        if (field.toLowerCase().includes("limit")) {
          return "100000000";
        }

        return "";
      })
      .join(",");

    const csv = `${header}\n${example}\n`;

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `Template_${template.title.replace(/\s+/g, "_")}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredPreview = useMemo(() => {
    if (!search.trim()) {
      return previewRows;
    }

    const keyword = search.toLowerCase();

    return previewRows.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(keyword),
      ),
    );
  }, [previewRows, search]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) {
      return history;
    }

    const keyword = historySearch.toLowerCase();

    return history.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(keyword),
      ),
    );
  }, [history, historySearch]);

  const validCount = previewRows.filter((row) => row.status === "VALID").length;

  const errorCount = previewRows.filter((row) => row.status === "ERROR").length;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-6">
        <div className="mx-auto max-w-[1500px] space-y-5">
          {/* HEADER */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-sm">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Template & Import
                  </h1>

                  <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                    Kelola template dan import data JOSJIS
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Database className="h-4 w-4 text-blue-600" />

              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Unit Aktif
                </div>

                <div className="text-sm font-bold text-slate-800">
                  {unitCode}
                </div>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("IMPORT")}
              className={`flex min-w-[140px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === "IMPORT"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Upload className="h-4 w-4" />
              Import Data
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("TEMPLATE")}
              className={`flex min-w-[140px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === "TEMPLATE"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Template
            </button>
          </div>

          {/* =================================================
              TEMPLATE TAB
          ================================================== */}

          {activeTab === "TEMPLATE" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                  <div>
                    <h2 className="text-sm font-bold text-blue-900">
                      Template Import JOSJIS
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      Gunakan template yang sesuai dengan jenis data. Jangan
                      mengubah nama kolom agar proses validasi dapat berjalan
                      dengan benar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {TEMPLATE_TYPES.map((template) => {
                  const Icon = template.icon;

                  return (
                    <div
                      key={template.id}
                      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                          <Icon className="h-5 w-5" />
                        </div>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                          {template.format}
                        </span>
                      </div>

                      <h3 className="mt-4 text-base font-bold text-slate-900">
                        {template.title}
                      </h3>

                      <p className="mt-1 min-h-[40px] text-xs leading-5 text-slate-500">
                        {template.description}
                      </p>

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Kolom utama
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {template.fields.slice(0, 5).map((field) => (
                            <span
                              key={field}
                              className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-600"
                            >
                              {field}
                            </span>
                          ))}

                          {template.fields.length > 5 && (
                            <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500">
                              +{template.fields.length - 5} lainnya
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => downloadTemplate(template)}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Download className="h-4 w-4" />
                        Download Template
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================
              IMPORT TAB
          ================================================== */}

          {activeTab === "IMPORT" && (
            <div className="space-y-5">
              {/* TYPE SELECTOR */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-slate-900">
                    Jenis Data
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Pilih jenis data sebelum mengupload file.
                  </p>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {TEMPLATE_TYPES.map((template) => {
                    const Icon = template.icon;

                    const active = selectedType === template.id;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          setSelectedType(template.id);
                          clearFile();
                        }}
                        className={`flex min-w-[150px] items-center gap-2 rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />

                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold">
                            {template.title}
                          </div>

                          <div className="mt-0.5 text-[10px] opacity-70">
                            {template.format}
                          </div>
                        </div>

                        {active && (
                          <CheckCircle2 className="ml-auto h-4 w-4 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* UPLOAD AREA */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Upload {currentTemplate?.title}
                    </h2>

                    <p className="text-xs text-slate-500">
                      File akan diperiksa sebelum data dimasukkan.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadTemplate(currentTemplate)}
                    className="flex w-fit items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    Download template
                  </button>
                </div>

                {!selectedFile ? (
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${
                      isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40"
                    }`}
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                      <Upload className="h-6 w-6" />
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-800">
                      Tarik file ke sini
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      atau klik untuk memilih file dari komputer
                    </p>

                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {[".xlsx", ".xls", ".xlsm", ".csv"].map((extension) => (
                        <span
                          key={extension}
                          className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm"
                        >
                          {extension}
                        </span>
                      ))}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.xlsm,.csv"
                      onChange={handleInputChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="rounded-xl bg-white p-3 text-emerald-600 shadow-sm">
                          <FileSpreadsheet className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-800">
                            {selectedFile.name}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            {formatFileSize(selectedFile.size)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={clearFile}
                        className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus
                      </button>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handlePreview}
                        className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-100 hover:bg-blue-50"
                      >
                        <Table2 className="h-4 w-4" />
                        Preview Data
                      </button>

                      <button
                        type="button"
                        onClick={handleImport}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                      >
                        <Import className="h-4 w-4" />
                        Import Data
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* PREVIEW */}
              {showPreview && selectedFile && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          Preview Data
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          {selectedFile.name}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:flex">
                        <div className="rounded-xl bg-emerald-50 px-3 py-2">
                          <div className="text-[10px] font-medium text-emerald-600">
                            Valid
                          </div>
                          <div className="text-lg font-bold text-emerald-700">
                            {validCount}
                          </div>
                        </div>

                        <div className="rounded-xl bg-rose-50 px-3 py-2">
                          <div className="text-[10px] font-medium text-rose-600">
                            Error
                          </div>
                          <div className="text-lg font-bold text-rose-700">
                            {errorCount}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative mt-4 max-w-md">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari data preview..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-blue-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-bold">Baris</th>
                          <th className="px-4 py-3 font-bold">Data</th>
                          <th className="px-4 py-3 font-bold">Status</th>
                          <th className="px-4 py-3 font-bold">Keterangan</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredPreview.map((row) => {
                          const entries = Object.entries(row);

                          const rowNumber = entries.find(
                            ([key]) => key === "row",
                          )?.[1];

                          const status = entries.find(
                            ([key]) => key === "status",
                          )?.[1];

                          const dataEntries = entries.filter(
                            ([key]) => key !== "row" && key !== "status",
                          );

                          return (
                            <tr
                              key={`${rowNumber}-${JSON.stringify(row)}`}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 font-semibold text-slate-600">
                                {rowNumber}
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex max-w-[600px] flex-wrap gap-x-4 gap-y-1.5">
                                  {dataEntries.map(([key, value]) => (
                                    <div key={key} className="flex gap-1">
                                      <span className="font-medium capitalize text-slate-400">
                                        {key}:
                                      </span>

                                      <span className="text-slate-700">
                                        {value || "-"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                {status === "VALID" ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                    <Check className="h-3 w-3" />
                                    VALID
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">
                                    <AlertCircle className="h-3 w-3" />
                                    ERROR
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-slate-500">
                                {status === "ERROR"
                                  ? "Data wajib belum lengkap."
                                  : "Data siap diimport."}
                              </td>
                            </tr>
                          );
                        })}

                        {filteredPreview.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-10 text-center text-xs text-slate-400"
                            >
                              Tidak ada data.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-slate-500">
                      Total preview:{" "}
                      <span className="font-bold text-slate-700">
                        {previewRows.length}
                      </span>{" "}
                      baris
                    </div>

                    {errorCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowErrorModal(true)}
                        className="flex w-fit items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700"
                      >
                        <AlertCircle className="h-4 w-4" />
                        Lihat detail error
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* HISTORY */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-slate-700" />

                        <h2 className="text-sm font-bold text-slate-900">
                          Riwayat Import
                        </h2>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Riwayat proses import data.
                      </p>
                    </div>

                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        value={historySearch}
                        onChange={(event) =>
                          setHistorySearch(event.target.value)
                        }
                        placeholder="Cari riwayat..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* DESKTOP */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-[900px] w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-bold">File</th>

                        <th className="px-4 py-3 font-bold">Jenis</th>

                        <th className="px-4 py-3 font-bold">Unit</th>

                        <th className="px-4 py-3 font-bold">Data</th>

                        <th className="px-4 py-3 font-bold">Hasil</th>

                        <th className="px-4 py-3 font-bold">Waktu</th>

                        <th className="px-4 py-3 text-right font-bold">Aksi</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />

                              <span className="font-semibold text-slate-700">
                                {item.fileName}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {getTemplate(item.type)?.title || item.type}
                          </td>

                          <td className="px-4 py-3 font-semibold">
                            {item.unit}
                          </td>

                          <td className="px-4 py-3">{item.total}</td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-600">
                                {item.success}
                              </span>

                              {item.error > 0 && (
                                <span className="font-bold text-rose-600">
                                  / {item.error} error
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-slate-500">
                            {item.date}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setShowHistoryDetail(item)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50"
                            >
                              Detail
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {filteredHistory.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-xs text-slate-400"
                          >
                            Belum ada riwayat import.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {filteredHistory.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setShowHistoryDetail(item)}
                      className="block w-full p-4 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-slate-800">
                            {item.fileName}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-500">
                            {getTemplate(item.type)?.title} • {item.unit}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                              Total {item.total}
                            </span>

                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                              Valid {item.success}
                            </span>

                            {item.error > 0 && (
                              <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
                                Error {item.error}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-[10px] text-slate-400">
                            {item.date}
                          </div>
                        </div>

                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                      </div>
                    </button>
                  ))}

                  {filteredHistory.length === 0 && (
                    <div className="px-4 py-10 text-center text-xs text-slate-400">
                      Belum ada riwayat import.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================
          ERROR MODAL
      ==================================================== */}

      {showErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                  <AlertCircle className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Detail Error
                  </h3>

                  <p className="text-[10px] text-slate-500">
                    Data yang belum memenuhi validasi.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="space-y-3">
                {previewRows
                  .filter((row) => row.status === "ERROR")
                  .map((row) => {
                    const entries = Object.entries(row).filter(
                      ([key]) => key !== "row" && key !== "status",
                    );

                    return (
                      <div
                        key={row.row}
                        className="rounded-xl border border-rose-100 bg-rose-50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-800">
                            Baris {row.row}
                          </span>

                          <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-rose-600">
                            ERROR
                          </span>
                        </div>

                        <div className="mt-2 space-y-1">
                          {entries.map(([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between gap-4 text-[10px]"
                            >
                              <span className="text-rose-600">{key}</span>

                              <span className="font-semibold text-rose-900">
                                {value || "-"}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 rounded-lg bg-white/70 p-2 text-[10px] text-rose-700">
                          Data wajib belum lengkap atau format tidak sesuai.
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          HISTORY DETAIL MODAL
      ==================================================== */}

      {showHistoryDetail && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Detail Import
                </div>

                <h3 className="mt-1 max-w-[280px] truncate text-sm font-bold text-slate-900">
                  {showHistoryDetail.fileName}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryDetail(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-400">Jenis Data</div>

                  <div className="mt-1 text-xs font-bold text-slate-800">
                    {getTemplate(showHistoryDetail.type)?.title}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-400">Unit</div>

                  <div className="mt-1 text-xs font-bold text-slate-800">
                    {showHistoryDetail.unit}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <div className="text-[10px] text-slate-400">Total</div>

                  <div className="mt-1 text-lg font-bold text-slate-800">
                    {showHistoryDetail.total}
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <div className="text-[10px] text-emerald-600">Valid</div>

                  <div className="mt-1 text-lg font-bold text-emerald-700">
                    {showHistoryDetail.success}
                  </div>
                </div>

                <div className="rounded-xl bg-rose-50 p-3 text-center">
                  <div className="text-[10px] text-rose-600">Error</div>

                  <div className="mt-1 text-lg font-bold text-rose-700">
                    {showHistoryDetail.error}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-[10px] text-slate-400">Waktu Import</div>

                <div className="mt-1 text-xs font-semibold text-slate-700">
                  {showHistoryDetail.date}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                  <span className="text-xs font-bold text-emerald-800">
                    {showHistoryDetail.status}
                  </span>
                </div>

                <p className="mt-1 text-[10px] leading-5 text-emerald-700">
                  Proses import tercatat sebagai berhasil.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => setShowHistoryDetail(null)}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
