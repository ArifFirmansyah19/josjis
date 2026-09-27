"use client";

import { useRef, useState } from "react";

import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

const ALLOWED_EXTENSIONS = [".xls", ".xlsx", ".xlsm", ".xlsb"];

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  const mb = bytes / (1024 * 1024);

  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getExtension(fileName) {
  const name = String(fileName || "");
  const index = name.lastIndexOf(".");

  if (index === -1) {
    return "";
  }

  return name.slice(index).toLowerCase();
}

export default function ExcelImportCard({
  data,
  onImport,
  onRemove,
  onFileReady,
}) {
  const inputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");

  async function processFile(file) {
    if (!file) {
      return;
    }

    setError("");

    const extension = getExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError(
        "Format file tidak didukung. Gunakan .xls, .xlsx, .xlsm, atau .xlsb.",
      );

      return;
    }

    setProcessing(true);

    try {
      /*
       * File asli dikirim ke parent.
       *
       * Ini penting karena popup 2A nantinya
       * membutuhkan File .xlsb asli untuk
       * dikirim kembali ke Excel Engine.
       */
      if (onFileReady) {
        onFileReady(file);
      }

      /*
       * Untuk tampilan/dashboard, kita tetap
       * menyimpan metadata file melalui onImport.
       *
       * File binary TIDAK disimpan ke LocalStorage.
       */
      const importData = {
        fileName: file.name,
        fileSize: file.size,
        importedAt: new Date().toISOString(),
        totalRows: 0,
        sheetCount: 0,
        sheets: [],
        status: "IMPORTED",
        updatedAt: new Date().toISOString(),
      };

      onImport(importData);
    } catch (processError) {
      console.error("Gagal memproses file Excel:", processError);

      setError(processError?.message || "File Excel gagal diproses.");
    } finally {
      setProcessing(false);
    }
  }

  function handleInputChange(event) {
    const file = event.target.files?.[0];

    if (file) {
      processFile(file);
    }

    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      processFile(file);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);
  }

  function handleRemove() {
    if (processing) {
      return;
    }

    if (onFileReady) {
      onFileReady(null);
    }

    onRemove();
  }

  const hasFile = Boolean(data?.fileName);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">File RaportMU</h2>

        <p className="mt-1 text-sm text-zinc-500">
          Upload file Excel RaportMU satu kali. File ini akan digunakan kembali
          untuk proses Booking, 2A / Tagihan, dan proses lainnya.
        </p>
      </div>

      {!hasFile ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={processing}
          className={[
            "w-full rounded-2xl border-2 border-dashed p-8 text-center transition",
            dragActive
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
            processing ? "cursor-wait opacity-70" : "cursor-pointer",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx,.xlsm,.xlsb"
            className="hidden"
            onChange={handleInputChange}
          />

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            ) : (
              <Upload className="h-5 w-5 text-zinc-500" />
            )}
          </div>

          <h3 className="mt-4 text-sm font-semibold text-zinc-900">
            {processing ? "Memproses file..." : "Upload File Excel"}
          </h3>

          <p className="mt-1 text-sm text-zinc-500">
            Klik untuk memilih file atau drag & drop ke area ini.
          </p>

          <p className="mt-3 text-xs text-zinc-400">
            Mendukung .xls, .xlsx, .xlsm, dan .xlsb
          </p>
        </button>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-zinc-900">
                    {data.fileName}
                  </h3>

                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                </div>

                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span>{formatFileSize(data.fileSize)}</span>

                  {data.importedAt && (
                    <span>
                      Di-upload{" "}
                      {new Date(data.importedAt).toLocaleString("id-ID")}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-emerald-600">
                  File siap digunakan untuk proses RaportMU.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={processing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Ganti File
              </button>

              <button
                type="button"
                onClick={handleRemove}
                disabled={processing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Hapus
              </button>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx,.xlsm,.xlsb"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </section>
  );
}
