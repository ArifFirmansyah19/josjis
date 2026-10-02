"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileImage,
  FilePlus2,
  FileText,
  FolderOpen,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Merge,
  Minus,
  Package,
  RotateCcw,
  RotateCw,
  Scissors,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";

/* =========================================================
   CONSTANTS
========================================================= */

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const A4_MARGIN = 28;

const PDF_ACCEPT = ".pdf";
const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.bmp,.gif";

/* =========================================================
   HELPERS
========================================================= */

function formatBytes(bytes = 0) {
  if (!bytes || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function ensurePdfExtension(name) {
  const clean = String(name || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");

  if (!clean) {
    return "hasil-josjis.pdf";
  }

  return clean.toLowerCase().endsWith(".pdf") ? clean : `${clean}.pdf`;
}

function stripPdfExtension(name) {
  return String(name || "").replace(/\.pdf$/i, "");
}

function getBaseName(filename) {
  return stripPdfExtension(filename || "hasil-josjis");
}

function isPdf(file) {
  return file?.type === "application/pdf" || /\.pdf$/i.test(file?.name || "");
}

function isImage(file) {
  return (
    file?.type?.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(file?.name || "")
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

function parsePdfRanges(input, totalPages) {
  if (!input || !totalPages) {
    return [];
  }

  const result = [];

  const chunks = input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    if (chunk.includes("-")) {
      const [startRaw, endRaw] = chunk.split("-");

      let start = parseInt(startRaw, 10);

      let end = parseInt(endRaw, 10);

      if (Number.isNaN(start) || Number.isNaN(end)) {
        continue;
      }

      start = Math.max(1, Math.min(start, totalPages));

      end = Math.max(1, Math.min(end, totalPages));

      if (start > end) {
        [start, end] = [end, start];
      }

      for (let page = start; page <= end; page++) {
        result.push(page - 1);
      }
    } else {
      const page = parseInt(chunk, 10);

      if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
        result.push(page - 1);
      }
    }
  }

  return [...new Set(result)];
}

function grayscaleCanvas(canvas) {
  const context = canvas.getContext("2d");

  if (!context) return;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
    );

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  context.putImageData(imageData, 0, 0);
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }

  return pdfjs;
}

async function renderPdfPageToCanvas(pdfPage, scale = 1.5) {
  const viewport = pdfPage.getViewport({
    scale,
  });

  const canvas = document.createElement("canvas");

  canvas.width = Math.ceil(viewport.width);

  canvas.height = Math.ceil(viewport.height);

  const context = canvas.getContext("2d", {
    alpha: false,
  });

  if (!context) {
    throw new Error("Canvas tidak tersedia.");
  }

  context.fillStyle = "#ffffff";

  context.fillRect(0, 0, canvas.width, canvas.height);

  await pdfPage.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas;
}

async function canvasToJpegBlob(canvas, quality = 0.75) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Gagal membuat gambar hasil."));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

function getCompressionConfig(level) {
  const configs = {
    light: {
      scale: 1.6,
      quality: 0.82,
      min: 0.75,
      max: 0.9,
      description: "Kualitas tinggi · kompresi ringan",
    },

    medium: {
      scale: 1.35,
      quality: 0.68,
      min: 0.5,
      max: 0.75,
      description: "Seimbang antara ukuran dan kualitas",
    },

    strong: {
      scale: 1.05,
      quality: 0.5,
      min: 0.25,
      max: 0.55,
      description: "Ukuran lebih kecil · kompresi kuat",
    },
  };

  return configs[level] || configs.medium;
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function KelolaPdfPage() {
  const [mode, setMode] = useState("compress");

  const [files, setFiles] = useState([]);

  const [pages, setPages] = useState([]);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [outputName, setOutputName] = useState("");

  const [compressionLevel, setCompressionLevel] = useState("medium");

  const [colorMode, setColorMode] = useState("color");

  const [splitRanges, setSplitRanges] = useState("");

  const [zoom, setZoom] = useState(1);

  /* =========================
     SAVE RESULT
  ========================= */

  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const [resultBlob, setResultBlob] = useState(null);

  const [resultSize, setResultSize] = useState(0);

  const [selectedDirectory, setSelectedDirectory] = useState(null);

  const [selectedDirectoryName, setSelectedDirectoryName] = useState("");

  const [savingFile, setSavingFile] = useState(false);

  const fileInputRef = useRef(null);

  const imageInputRef = useRef(null);

  /* =========================================================
     CLEANUP
  ========================================================= */

  useEffect(() => {
    return () => {
      pages.forEach((page) => {
        if (page.previewUrl) {
          URL.revokeObjectURL(page.previewUrl);
        }
      });
    };
  }, [pages]);

  /* =========================================================
     COMPUTED
  ========================================================= */

  const totalPages = pages.length;

  const selectedSplitPages = useMemo(() => {
    return parsePdfRanges(splitRanges, totalPages);
  }, [splitRanges, totalPages]);

  const compressionConfig = getCompressionConfig(compressionLevel);

  const estimatedCompression = useMemo(() => {
    const originalSize = files[0]?.size || 0;

    if (!originalSize) {
      return {
        low: 0,
        high: 0,
      };
    }

    return {
      low: Math.round(originalSize * compressionConfig.min),
      high: Math.round(originalSize * compressionConfig.max),
    };
  }, [files, compressionConfig]);

  /* =========================================================
     MESSAGE
  ========================================================= */

  function showMessage(text) {
    setError("");
    setMessage(text);
  }

  function showError(text) {
    setMessage("");
    setError(text);
  }

  /* =========================================================
     RESET
  ========================================================= */

  function resetWorkspace() {
    pages.forEach((page) => {
      if (page.previewUrl) {
        URL.revokeObjectURL(page.previewUrl);
      }
    });

    setFiles([]);
    setPages([]);
    setMessage("");
    setError("");
    setOutputName("");
    setSplitRanges("");
    setZoom(1);

    setSaveModalOpen(false);
    setResultBlob(null);
    setResultSize(0);
    setSelectedDirectory(null);
    setSelectedDirectoryName("");
  }

  /* =========================================================
     FILE PICKER
  ========================================================= */

  function openFilePicker() {
    if (mode === "image-to-pdf") {
      imageInputRef.current?.click();
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleFiles(incomingFiles) {
    setError("");
    setMessage("");

    const selected = Array.from(incomingFiles || []);

    if (!selected.length) {
      return;
    }

    if (mode === "image-to-pdf") {
      const images = selected.filter(isImage);

      if (!images.length) {
        showError("Silakan pilih file gambar.");
        return;
      }

      setFiles(images);

      setOutputName("gambar-ke-pdf.pdf");

      return;
    }

    const pdfs = selected.filter(isPdf);

    if (!pdfs.length) {
      showError("Silakan pilih file PDF.");
      return;
    }

    if (mode === "compress" || mode === "pages" || mode === "split") {
      const first = pdfs[0];

      setFiles([first]);

      setOutputName(`${getBaseName(first.name)}-${mode}.pdf`);

      await loadPagesForPreview(first);

      return;
    }

    if (mode === "merge") {
      setFiles(pdfs);

      setOutputName("gabungan-josjis.pdf");

      setPages([]);
    }
  }

  /* =========================================================
     LOAD PDF PREVIEW
  ========================================================= */

  async function loadPagesForPreview(file) {
    try {
      setLoading(true);

      const pdfjs = await loadPdfJs();

      const buffer = await file.arrayBuffer();

      const pdf = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
      }).promise;

      const loadedPages = [];

      const maxPreviewPages = Math.min(pdf.numPages, 100);

      for (let i = 1; i <= maxPreviewPages; i++) {
        const pdfPage = await pdf.getPage(i);

        const canvas = await renderPdfPageToCanvas(pdfPage, 1.0);

        const previewUrl = canvas.toDataURL("image/jpeg", 0.75);

        loadedPages.push({
          id: `${file.name}-${i}-${Date.now()}`,
          originalIndex: i - 1,
          originalPageNumber: i,
          rotation: 0,
          deleted: false,
          previewUrl,
        });
      }

      setPages(loadedPages);

      if (pdf.numPages > maxPreviewPages) {
        showMessage(
          `PDF memiliki ${pdf.numPages} halaman. Preview menampilkan ${maxPreviewPages} halaman pertama.`,
        );
      }
    } catch (err) {
      console.error(err);

      showError("Gagal membaca halaman PDF.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     PAGE EDITING
  ========================================================= */

  function toggleDeletePage(id) {
    setPages((current) =>
      current.map((page) =>
        page.id === id
          ? {
              ...page,
              deleted: !page.deleted,
            }
          : page,
      ),
    );
  }

  function rotatePage(id, direction) {
    setPages((current) =>
      current.map((page) =>
        page.id === id
          ? {
              ...page,
              rotation: (page.rotation + direction + 360) % 360,
            }
          : page,
      ),
    );
  }

  function movePage(index, direction) {
    setPages((current) => {
      const next = [...current];

      const target = index + direction;

      if (target < 0 || target >= next.length) {
        return current;
      }

      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });
  }

  /* =========================================================
     PREPARE OUTPUT
  ========================================================= */

  function prepareOutput(bytes, defaultName) {
    const blob = new Blob([bytes], {
      type: "application/pdf",
    });

    setResultBlob(blob);
    setResultSize(bytes.byteLength);

    setOutputName(ensurePdfExtension(outputName || defaultName));

    setSaveModalOpen(true);
  }

  /* =========================================================
     COMPRESS PDF
  ========================================================= */

  async function processCompression() {
    if (!files[0]) {
      showError("Silakan upload PDF terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const pdfjs = await loadPdfJs();

      const sourceBuffer = await files[0].arrayBuffer();

      const sourcePdf = await pdfjs.getDocument({
        data: new Uint8Array(sourceBuffer),
      }).promise;

      const { PDFDocument } = await import("pdf-lib");

      const outputPdf = await PDFDocument.create();

      const config = getCompressionConfig(compressionLevel);

      /*
        PDF dirender menjadi gambar,
        kemudian dimasukkan kembali
        ke PDF.

        Keuntungan:
        - ukuran bisa jauh lebih kecil
        - warna bisa diubah menjadi
          hitam putih
        - hasil visual lebih konsisten

        Konsekuensi:
        - text layer PDF hilang
        - teks tidak lagi selectable
      */

      for (let i = 1; i <= sourcePdf.numPages; i++) {
        const sourcePage = await sourcePdf.getPage(i);

        const canvas = await renderPdfPageToCanvas(sourcePage, config.scale);

        if (colorMode === "grayscale") {
          grayscaleCanvas(canvas);
        }

        const jpegBlob = await canvasToJpegBlob(canvas, config.quality);

        const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

        const image = await outputPdf.embedJpg(jpegBytes);

        const outputPage = outputPdf.addPage([A4_WIDTH, A4_HEIGHT]);

        const pageWidth = A4_WIDTH - A4_MARGIN * 2;

        const pageHeight = A4_HEIGHT - A4_MARGIN * 2;

        const ratio = Math.min(
          pageWidth / canvas.width,
          pageHeight / canvas.height,
        );

        const drawWidth = canvas.width * ratio;

        const drawHeight = canvas.height * ratio;

        const x = (A4_WIDTH - drawWidth) / 2;

        const y = (A4_HEIGHT - drawHeight) / 2;

        outputPage.drawImage(image, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const outputBytes = await outputPdf.save({
        useObjectStreams: true,
      });

      prepareOutput(
        outputBytes,
        `${getBaseName(files[0].name)}-compressed.pdf`,
      );

      showMessage(
        `PDF selesai diproses. Ukuran hasil ${formatBytes(
          outputBytes.length,
        )}.`,
      );
    } catch (err) {
      console.error(err);

      showError(err?.message || "Gagal mengompres PDF.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     IMAGE TO PDF
  ========================================================= */

  async function processImages() {
    if (!files.length) {
      showError("Silakan pilih gambar terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { PDFDocument } = await import("pdf-lib");

      const outputPdf = await PDFDocument.create();

      for (const file of files) {
        const imageBitmap = await createImageBitmap(file);

        const canvas = document.createElement("canvas");

        canvas.width = imageBitmap.width;

        canvas.height = imageBitmap.height;

        const context = canvas.getContext("2d");

        context.fillStyle = "#ffffff";

        context.fillRect(0, 0, canvas.width, canvas.height);

        context.drawImage(imageBitmap, 0, 0);

        if (colorMode === "grayscale") {
          grayscaleCanvas(canvas);
        }

        const jpegBlob = await canvasToJpegBlob(canvas, 0.9);

        const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

        const image = await outputPdf.embedJpg(jpegBytes);

        const page = outputPdf.addPage([A4_WIDTH, A4_HEIGHT]);

        const maxWidth = A4_WIDTH - A4_MARGIN * 2;

        const maxHeight = A4_HEIGHT - A4_MARGIN * 2;

        const ratio = Math.min(
          maxWidth / image.width,
          maxHeight / image.height,
        );

        const width = image.width * ratio;

        const height = image.height * ratio;

        page.drawImage(image, {
          x: (A4_WIDTH - width) / 2,
          y: (A4_HEIGHT - height) / 2,
          width,
          height,
        });

        imageBitmap.close();
      }

      const outputBytes = await outputPdf.save({
        useObjectStreams: true,
      });

      prepareOutput(outputBytes, "gambar-ke-pdf.pdf");

      showMessage(`${files.length} gambar berhasil dibuat menjadi PDF A4.`);
    } catch (err) {
      console.error(err);

      showError(err?.message || "Gagal membuat PDF dari gambar.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     MERGE PDF
  ========================================================= */

  async function processMerge() {
    if (files.length < 2) {
      showError("Gabungkan PDF membutuhkan minimal 2 file.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { PDFDocument } = await import("pdf-lib");

      const outputPdf = await PDFDocument.create();

      for (const file of files) {
        const bytes = await file.arrayBuffer();

        const sourcePdf = await PDFDocument.load(bytes);

        const copiedPages = await outputPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices(),
        );

        copiedPages.forEach((page) => outputPdf.addPage(page));
      }

      const outputBytes = await outputPdf.save({
        useObjectStreams: true,
      });

      prepareOutput(outputBytes, "gabungan-josjis.pdf");

      showMessage(`${files.length} PDF berhasil digabung.`);
    } catch (err) {
      console.error(err);

      showError(err?.message || "Gagal menggabungkan PDF.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     PAGE EDITOR
  ========================================================= */

  async function processPageEditing() {
    if (!files[0]) {
      showError("Silakan upload PDF terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { PDFDocument, degrees } = await import("pdf-lib");

      const bytes = await files[0].arrayBuffer();

      const sourcePdf = await PDFDocument.load(bytes);

      const outputPdf = await PDFDocument.create();

      const activePages = pages.filter((page) => !page.deleted);

      if (!activePages.length) {
        showError("Semua halaman dihapus. Sisakan minimal satu halaman.");
        return;
      }

      for (const pageInfo of activePages) {
        const [copiedPage] = await outputPdf.copyPages(sourcePdf, [
          pageInfo.originalIndex,
        ]);

        if (pageInfo.rotation) {
          copiedPage.setRotation(degrees(pageInfo.rotation));
        }

        outputPdf.addPage(copiedPage);
      }

      const outputBytes = await outputPdf.save({
        useObjectStreams: true,
      });

      prepareOutput(outputBytes, `${getBaseName(files[0].name)}-halaman.pdf`);

      showMessage("Susunan halaman berhasil diproses.");
    } catch (err) {
      console.error(err);

      showError(err?.message || "Gagal mengatur halaman PDF.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     SPLIT PDF
  ========================================================= */

  async function processSplit() {
    if (!files[0]) {
      showError("Silakan upload PDF terlebih dahulu.");
      return;
    }

    const selected = parsePdfRanges(splitRanges, totalPages);

    if (!selected.length) {
      showError("Masukkan halaman yang ingin dipisahkan. Contoh: 1-3, 5-7");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { PDFDocument } = await import("pdf-lib");

      const sourceBytes = await files[0].arrayBuffer();

      const sourcePdf = await PDFDocument.load(sourceBytes);

      const outputPdf = await PDFDocument.create();

      const copiedPages = await outputPdf.copyPages(sourcePdf, selected);

      copiedPages.forEach((page) => outputPdf.addPage(page));

      const outputBytes = await outputPdf.save({
        useObjectStreams: true,
      });

      prepareOutput(
        outputBytes,
        `${getBaseName(files[0].name)}-halaman-terpilih.pdf`,
      );

      showMessage(`${selected.length} halaman berhasil dipilih.`);
    } catch (err) {
      console.error(err);

      showError(err?.message || "Gagal memisahkan halaman PDF.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     PROCESS CURRENT MODE
  ========================================================= */

  async function processCurrentMode() {
    if (mode === "compress") {
      await processCompression();
      return;
    }

    if (mode === "image-to-pdf") {
      await processImages();
      return;
    }

    if (mode === "merge") {
      await processMerge();
      return;
    }

    if (mode === "pages") {
      await processPageEditing();
      return;
    }

    if (mode === "split") {
      await processSplit();
    }
  }

  /* =========================================================
     MODE CHANGE
  ========================================================= */

  function changeMode(nextMode) {
    if (loading) return;

    resetWorkspace();

    setMode(nextMode);
  }

  /* =========================================================
     DIRECTORY PICKER
  ========================================================= */

  async function selectDirectory() {
    if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
      showError(
        "Browser/perangkat ini belum mendukung pemilihan folder langsung.",
      );

      return;
    }

    try {
      const directory = await window.showDirectoryPicker({
        mode: "readwrite",
      });

      setSelectedDirectory(directory);

      setSelectedDirectoryName(directory.name);

      setError("");
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }

      console.error(err);

      showError("Folder tidak dapat dipilih.");
    }
  }

  /* =========================================================
     SAVE RESULT
  ========================================================= */

  async function saveResultFile(fileName) {
    if (!resultBlob) {
      showError("File hasil belum tersedia.");
      return;
    }

    const cleanName = ensurePdfExtension(
      fileName || outputName || "hasil-josjis.pdf",
    );

    setSavingFile(true);
    setError("");

    try {
      /*
        Jika user sudah memilih folder,
        tulis file langsung ke folder.
      */

      if (selectedDirectory) {
        /*
          Cek apakah file sudah ada.
        */

        let existingFile = null;

        try {
          existingFile = await selectedDirectory.getFileHandle(cleanName, {
            create: false,
          });
        } catch {
          existingFile = null;
        }

        if (existingFile) {
          const overwrite = window.confirm(
            `File "${cleanName}" sudah ada di folder tersebut.\n\nTimpa file tersebut?`,
          );

          if (!overwrite) {
            return;
          }
        }

        const fileHandle =
          existingFile ||
          (await selectedDirectory.getFileHandle(cleanName, {
            create: true,
          }));

        const writable = await fileHandle.createWritable();

        await writable.write(resultBlob);

        await writable.close();

        setOutputName(cleanName);

        setSaveModalOpen(false);

        showMessage(
          `PDF berhasil disimpan sebagai "${cleanName}" di folder "${selectedDirectoryName}".`,
        );

        return;
      }

      /*
        Fallback:
        browser download.
      */

      downloadBlob(resultBlob, cleanName);

      setOutputName(cleanName);

      setSaveModalOpen(false);

      showMessage(`PDF berhasil diunduh sebagai "${cleanName}".`);
    } catch (err) {
      console.error(err);

      showError(err?.message || "Gagal menyimpan PDF.");
    } finally {
      setSavingFile(false);
    }
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <DashboardLayout>
      <div className="min-h-full space-y-5 pb-10">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h1 className="text-lg font-bold text-zinc-900">
                    Kelola PDF
                  </h1>

                  <p className="mt-0.5 text-xs text-zinc-500">
                    Kompres, gabungkan, atur, pisahkan, dan ubah gambar menjadi
                    PDF.
                  </p>
                </div>
              </div>
            </div>

            {(files.length > 0 || pages.length > 0) && (
              <button
                type="button"
                onClick={resetWorkspace}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Bersihkan
              </button>
            )}
          </div>
        </div>

        {/* =================================================
            MODE SELECTOR
        ================================================= */}

        <ModeSelector mode={mode} onChange={changeMode} />

        {/* =================================================
            ALERTS
        ================================================= */}

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            UPLOAD AREA
        ================================================= */}

        <input
          ref={fileInputRef}
          type="file"
          accept={PDF_ACCEPT}
          multiple={mode === "merge"}
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);

            event.target.value = "";
          }}
        />

        <input
          ref={imageInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);

            event.target.value = "";
          }}
        />

        <UploadArea
          mode={mode}
          files={files}
          loading={loading}
          onClick={openFilePicker}
        />

        {/* =================================================
            MODE CONTROLS
        ================================================= */}

        {mode === "compress" && (
          <CompressionControls
            level={compressionLevel}
            setLevel={setCompressionLevel}
            colorMode={colorMode}
            setColorMode={setColorMode}
            originalSize={files[0]?.size || 0}
            estimated={estimatedCompression}
          />
        )}

        {mode === "image-to-pdf" && (
          <ImageToPdfControls
            colorMode={colorMode}
            setColorMode={setColorMode}
            files={files}
          />
        )}

        {mode === "split" && (
          <SplitControls
            ranges={splitRanges}
            setRanges={setSplitRanges}
            totalPages={totalPages}
            selectedPages={selectedSplitPages}
          />
        )}

        {mode === "pages" && pages.length > 0 && (
          <PageEditor
            pages={pages}
            setPages={setPages}
            zoom={zoom}
            setZoom={setZoom}
            onMove={movePage}
            onRotate={rotatePage}
            onDelete={toggleDeletePage}
          />
        )}

        {mode === "merge" && files.length > 0 && <MergeList files={files} />}

        {/* =================================================
            PROCESS BUTTON
        ================================================= */}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={processCurrentMode}
            disabled={loading || !files.length}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                Proses PDF
              </>
            )}
          </button>
        </div>

        {/* =================================================
            INFORMATION
        ================================================= */}

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex gap-3">
            <Archive className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />

            <div className="text-[11px] leading-5 text-zinc-500">
              <div className="font-semibold text-zinc-700">Catatan</div>

              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>File asli tidak ditimpa.</li>

                <li>Hasil diproses menjadi file baru.</li>

                <li>
                  Untuk kompres PDF, pilihan hitam putih melakukan rasterisasi
                  halaman sehingga text layer PDF dapat hilang.
                </li>

                <li>Pada HP, lokasi penyimpanan mengikuti dukungan browser.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* =================================================
            SAVE MODAL
        ================================================= */}

        <SavePdfModal
          open={saveModalOpen}
          size={resultSize}
          defaultName={outputName || "hasil-josjis.pdf"}
          directoryName={selectedDirectoryName}
          onClose={() => {
            if (!savingFile) {
              setSaveModalOpen(false);
            }
          }}
          onSelectDirectory={selectDirectory}
          onSave={saveResultFile}
          saving={savingFile}
        />
      </div>
    </DashboardLayout>
  );
}

/* =========================================================
   MODE SELECTOR
========================================================= */

function ModeSelector({ mode, onChange }) {
  const items = [
    {
      id: "compress",
      label: "Kompres PDF",
      description: "Kecilkan ukuran PDF",
      icon: Archive,
    },
    {
      id: "image-to-pdf",
      label: "Gambar → PDF",
      description: "Jadikan gambar PDF A4",
      icon: ImageIcon,
    },
    {
      id: "merge",
      label: "Gabungkan PDF",
      description: "Satukan beberapa PDF",
      icon: Merge,
    },
    {
      id: "pages",
      label: "Atur Halaman",
      description: "Hapus, rotate, urutkan",
      icon: FileText,
    },
    {
      id: "split",
      label: "Pisahkan PDF",
      description: "Pilih halaman tertentu",
      icon: Scissors,
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;

        const active = mode === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  active ? "bg-white/10" : "bg-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div className="text-xs font-bold">{item.label}</div>

                <div
                  className={`mt-1 text-[10px] ${
                    active ? "text-zinc-300" : "text-zinc-400"
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   UPLOAD AREA
========================================================= */

function UploadArea({ mode, files, loading, onClick }) {
  const imageMode = mode === "image-to-pdf";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="group w-full rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-6 text-left transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 transition group-hover:bg-zinc-900 group-hover:text-white">
          {imageMode ? (
            <FileImage className="h-5 w-5" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
        </div>

        <div className="mt-3 text-sm font-semibold text-zinc-800">
          {files.length
            ? `${files.length} file dipilih`
            : imageMode
              ? "Pilih gambar"
              : mode === "merge"
                ? "Pilih beberapa PDF"
                : "Upload PDF"}
        </div>

        <div className="mt-1 text-[11px] text-zinc-400">
          {imageMode
            ? "JPG, JPEG, PNG, WEBP, BMP, GIF"
            : mode === "merge"
              ? "Pilih dua atau lebih file PDF"
              : "Klik untuk memilih file PDF"}
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   COMPRESSION CONTROLS
========================================================= */

function CompressionControls({
  level,
  setLevel,
  colorMode,
  setColorMode,
  originalSize,
  estimated,
}) {
  const options = [
    {
      id: "light",
      label: "Ringan",
      description: "Kualitas tinggi",
    },
    {
      id: "medium",
      label: "Sedang",
      description: "Seimbang",
    },
    {
      id: "strong",
      label: "Kuat",
      description: "Ukuran lebih kecil",
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Archive className="h-4 w-4 text-zinc-500" />

        <h2 className="text-sm font-bold text-zinc-800">Pengaturan kompresi</h2>
      </div>

      {/* QUALITY */}

      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold text-zinc-600">
          Tingkat kompresi
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((option) => {
            const active = level === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setLevel(option.id)}
                className={`rounded-xl border p-3 text-left ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="text-xs font-bold">{option.label}</div>

                <div
                  className={`mt-1 text-[10px] ${
                    active ? "text-zinc-300" : "text-zinc-400"
                  }`}
                >
                  {option.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* COLOR */}

      <ColorModeSelector
        value={colorMode}
        onChange={setColorMode}
        title="Warna PDF hasil"
      />

      {/* ESTIMATE */}

      {originalSize > 0 && (
        <div className="mt-4 rounded-xl bg-zinc-50 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoItem label="Ukuran asli" value={formatBytes(originalSize)} />

            <InfoItem
              label="Perkiraan hasil"
              value={`${formatBytes(estimated.low)} – ${formatBytes(
                estimated.high,
              )}`}
            />

            <InfoItem
              label="Mode"
              value={colorMode === "grayscale" ? "Hitam putih" : "Berwarna"}
            />
          </div>

          <p className="mt-3 text-[10px] leading-4 text-zinc-400">
            Perkiraan adalah kisaran. Ukuran aktual ditampilkan setelah proses
            selesai.
          </p>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   IMAGE TO PDF CONTROLS
========================================================= */

function ImageToPdfControls({ colorMode, setColorMode, files }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-zinc-500" />

        <h2 className="text-sm font-bold text-zinc-800">
          Pengaturan gambar → PDF
        </h2>
      </div>

      <ColorModeSelector
        value={colorMode}
        onChange={setColorMode}
        title="Warna hasil PDF"
      />

      {files.length > 0 && (
        <div className="mt-4 text-[11px] text-zinc-400">
          {files.length} gambar akan ditempatkan pada halaman A4 dengan ukuran
          proporsional.
        </div>
      )}
    </div>
  );
}

/* =========================================================
   COLOR MODE
========================================================= */

function ColorModeSelector({ value, onChange, title }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-xs font-semibold text-zinc-600">{title}</div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange("color")}
          className={`rounded-xl border p-3 text-left ${
            value === "color"
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white hover:bg-zinc-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-400 via-yellow-300 to-blue-500">
              <span className="text-xs font-bold text-white">A</span>
            </div>

            <div>
              <div className="text-xs font-bold">Tetap Berwarna</div>

              <div
                className={`mt-0.5 text-[10px] ${
                  value === "color" ? "text-zinc-300" : "text-zinc-400"
                }`}
              >
                Pertahankan warna asli
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange("grayscale")}
          className={`rounded-xl border p-3 text-left ${
            value === "grayscale"
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white hover:bg-zinc-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200">
              <div className="h-4 w-4 rounded-full bg-zinc-600" />
            </div>

            <div>
              <div className="text-xs font-bold">Hitam Putih</div>

              <div
                className={`mt-0.5 text-[10px] ${
                  value === "grayscale" ? "text-zinc-300" : "text-zinc-400"
                }`}
              >
                Ubah seluruh halaman menjadi grayscale
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   SPLIT CONTROLS
========================================================= */

function SplitControls({ ranges, setRanges, totalPages, selectedPages }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Scissors className="h-4 w-4 text-zinc-500" />

        <h2 className="text-sm font-bold text-zinc-800">Pilih halaman</h2>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
          Nomor halaman
        </label>

        <input
          type="text"
          value={ranges}
          onChange={(event) => setRanges(event.target.value)}
          placeholder="Contoh: 1-3, 5-7"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
          <span>
            Total: <b className="text-zinc-600">{totalPages}</b> halaman
          </span>

          <span>•</span>

          <span>
            Dipilih: <b className="text-zinc-600">{selectedPages.length}</b>
          </span>
        </div>
      </div>

      {selectedPages.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {selectedPages.map((page) => (
            <span
              key={page}
              className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-600"
            >
              {page + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PAGE EDITOR
========================================================= */

function PageEditor({ pages, zoom, setZoom, onMove, onRotate, onDelete }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-500" />

            <h2 className="text-sm font-bold text-zinc-800">Atur halaman</h2>
          </div>

          <p className="mt-1 text-[10px] text-zinc-400">
            Drag/ubah urutan, rotate, atau hapus halaman.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
          <button
            type="button"
            onClick={() => setZoom(Math.max(0.6, zoom - 0.1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <span className="w-12 text-center text-[10px] font-semibold text-zinc-500">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoom(Math.min(1.4, zoom + 0.1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pages.map((page, index) => (
          <PageCard
            key={page.id}
            page={page}
            index={index}
            zoom={zoom}
            onMove={onMove}
            onRotate={onRotate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   PAGE CARD
========================================================= */

function PageCard({ page, index, zoom, onMove, onRotate, onDelete }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-zinc-50 transition ${
        page.deleted ? "border-red-200 opacity-50" : "border-zinc-200"
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-zinc-300" />

          <span className="text-[10px] font-bold text-zinc-500">
            Urutan {index + 1}
          </span>
        </div>

        <span className="rounded-md bg-zinc-100 px-1.5 py-1 text-[9px] font-medium text-zinc-400">
          Halaman asli {page.originalPageNumber}
        </span>
      </div>

      <div className="flex justify-center overflow-auto bg-zinc-100 p-3">
        <div
          className="relative bg-white shadow-md"
          style={{
            width: `${210 * zoom}mm`,
            aspectRatio: "210 / 297",
          }}
        >
          {page.previewUrl ? (
            <img
              src={page.previewUrl}
              alt={`Halaman ${page.originalPageNumber}`}
              className="h-full w-full object-contain"
              style={{
                transform: `rotate(${page.rotation}deg)`,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-300">
              <FileText className="h-8 w-8" />
            </div>
          )}

          {page.deleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75">
              <span className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-600">
                Akan dihapus
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 border-t border-zinc-200 bg-white p-2">
        <SmallActionButton
          title="Naik"
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
        >
          <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
        </SmallActionButton>

        <SmallActionButton
          title="Turun"
          disabled={index === 999999}
          onClick={() => onMove(index, 1)}
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-90" />
        </SmallActionButton>

        <SmallActionButton title="Putar" onClick={() => onRotate(page.id, 90)}>
          <RotateCw className="h-3.5 w-3.5" />
        </SmallActionButton>

        <SmallActionButton
          title={page.deleted ? "Pulihkan" : "Hapus"}
          danger={!page.deleted}
          onClick={() => onDelete(page.id)}
        >
          {page.deleted ? (
            <RotateCcw className="h-3.5 w-3.5" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </SmallActionButton>
      </div>
    </div>
  );
}

/* =========================================================
   MERGE LIST
========================================================= */

function MergeList({ files }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Merge className="h-4 w-4 text-zinc-500" />

        <h2 className="text-sm font-bold text-zinc-800">Urutan PDF</h2>
      </div>

      <div className="mt-4 space-y-2">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-zinc-500">
              {index + 1}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-zinc-700">
                {file.name}
              </div>

              <div className="mt-0.5 text-[10px] text-zinc-400">
                {formatBytes(file.size)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({ label, value }) {
  return (
    <div>
      <div className="text-[9px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </div>

      <div className="mt-1 text-xs font-bold text-zinc-700">{value}</div>
    </div>
  );
}

/* =========================================================
   SMALL ACTION
========================================================= */

function SmallActionButton({ children, onClick, disabled, danger, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 items-center justify-center rounded-lg border text-xs transition ${
        danger
          ? "border-red-100 text-red-500 hover:bg-red-50"
          : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
      } disabled:cursor-not-allowed disabled:opacity-25`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   SAVE PDF MODAL
========================================================= */

function SavePdfModal({
  open,
  size,
  defaultName,
  directoryName,
  onClose,
  onSelectDirectory,
  onSave,
  saving,
}) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) {
      setName(stripPdfExtension(defaultName));
    }
  }, [open, defaultName]);

  if (!open) {
    return null;
  }

  const supportsFolder =
    typeof window !== "undefined" && "showDirectoryPicker" in window;

  function submit() {
    const clean = name.trim();

    if (!clean) {
      return;
    }

    onSave(ensurePdfExtension(clean));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <Download className="h-4 w-4 text-zinc-600" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-zinc-900">Simpan PDF</h3>

              <p className="mt-0.5 text-[10px] text-zinc-400">
                Tentukan nama dan lokasi file.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY */}

        <div className="space-y-5 p-5">
          {/* SIZE */}

          <div className="rounded-xl bg-zinc-50 p-3">
            <div className="text-[9px] font-medium uppercase tracking-wide text-zinc-400">
              Ukuran file hasil
            </div>

            <div className="mt-1 text-sm font-bold text-zinc-800">
              {formatBytes(size)}
            </div>
          </div>

          {/* NAME */}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Nama file
            </label>

            <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-100">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submit();
                  }
                }}
                disabled={saving}
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"
                placeholder="Nama file"
                autoFocus
              />

              <div className="flex items-center border-l border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-400">
                .pdf
              </div>
            </div>
          </div>

          {/* DIRECTORY */}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Lokasi penyimpanan
            </label>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
                  <FolderOpen className="h-4 w-4 text-zinc-400" />
                </div>

                <div className="min-w-0 flex-1">
                  {directoryName ? (
                    <>
                      <div className="truncate text-xs font-bold text-zinc-700">
                        {directoryName}
                      </div>

                      <div className="mt-0.5 text-[10px] text-emerald-600">
                        Folder dipilih
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-medium text-zinc-600">
                        Folder belum dipilih
                      </div>

                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        {supportsFolder
                          ? "Pilih folder tujuan"
                          : "Mengikuti lokasi download browser"}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {supportsFolder && (
              <button
                type="button"
                onClick={onSelectDirectory}
                disabled={saving}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                <FolderOpen className="h-3.5 w-3.5" />

                {directoryName ? "Ganti Folder" : "Pilih Folder"}
              </button>
            )}

            {!supportsFolder && (
              <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[10px] leading-5 text-amber-700">
                Browser ini tidak mendukung pemilihan folder langsung. File akan
                mengikuti lokasi download browser/perangkat.
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={saving || !name.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Simpan PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
