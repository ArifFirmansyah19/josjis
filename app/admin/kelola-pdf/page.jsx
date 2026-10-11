"use client";

import { useMemo, useRef, useState } from "react";
import { Archive, FileText, Loader2, Package, X } from "lucide-react";
import { ModeSelector, UploadArea, PdfNotes } from "./components/PdfShared";
import SavePdfModal from "./components/SavePdfModal";
import CompressPdf from "./features/CompressPdf";
import ImageToPdf from "./features/ImageToPdf";
import MergePdf from "./features/MergePdf";
import EditPdfPages from "./features/EditPdfPages";
import SplitPdf from "./features/SplitPdf";
import {
  downloadBlob,
  ensurePdfExtension,
  getBaseName,
  isImage,
  isPdf,
  parsePdfRanges,
} from "./lib/pdf-utils";
import {
  compressPdf,
  editPdfPages,
  imagesToPdf,
  loadPdfPagePreviews,
  mergePdfs,
  splitPdf,
} from "./lib/pdf-engine";

const PDF_ACCEPT = ".pdf";
const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.bmp,.gif";

export default function KelolaPdfPage() {
  const [mode, setMode] = useState("compress");
  const [files, setFiles] = useState([]);
  const [pages, setPages] = useState([]);
  const [totalSourcePages, setTotalSourcePages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [outputName, setOutputName] = useState("");
  const [compressionLevel, setCompressionLevel] = useState("medium");
  const [colorMode, setColorMode] = useState("color");
  const [splitRanges, setSplitRanges] = useState([""]);
  const [splitOutputMode, setSplitOutputMode] = useState("separate");
  const [zoom, setZoom] = useState(1);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultSize, setResultSize] = useState(0);
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [selectedDirectoryName, setSelectedDirectoryName] = useState("");
  const [savingFile, setSavingFile] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const splitPageGroups = useMemo(
    () =>
      splitRanges
        .map((range) => parsePdfRanges(range, totalSourcePages))
        .filter((group) => group.length > 0),
    [splitRanges, totalSourcePages],
  );
  const selectedSplitPages = useMemo(
    () => [...new Set(splitPageGroups.flat())].sort((a, b) => a - b),
    [splitPageGroups],
  );
  const totalPages = totalSourcePages;

  function showMessage(text) {
    setError("");
    setMessage(text);
  }
  function showError(text) {
    setMessage("");
    setError(text);
  }

  function resetWorkspace() {
    setFiles([]);
    setPages([]);
    setTotalSourcePages(0);
    setMessage("");
    setError("");
    setProgress("");
    setOutputName("");
    setSplitRanges([""]);
    setSplitOutputMode("separate");
    setZoom(1);
    setSaveModalOpen(false);
    setResultBlob(null);
    setResultSize(0);
    setSelectedDirectory(null);
    setSelectedDirectoryName("");
  }

  function openFilePicker() {
    if (mode === "image-to-pdf") imageInputRef.current?.click();
    else fileInputRef.current?.click();
  }

  async function handleFiles(incomingFiles) {
    setError("");
    setMessage("");
    const selected = Array.from(incomingFiles || []);
    if (!selected.length) return;
    if (mode === "image-to-pdf") {
      const images = selected.filter(isImage);
      if (!images.length) {
        showError("Silakan pilih file gambar yang didukung.");
        return;
      }
      setFiles(images);
      setPages([]);
      setTotalSourcePages(0);
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
      setPages([]);
      setTotalSourcePages(0);
      setSplitRanges([""]);
      setOutputName(`${getBaseName(first.name)}-${mode}.pdf`);
      setLoading(true);
      setProgress("Membaca halaman PDF...");
      try {
        const result = await loadPdfPagePreviews(first, (current, total) =>
          setProgress(`Membuat preview halaman ${current} dari ${total}...`),
        );
        setPages(result.pages);
        setTotalSourcePages(result.totalPages);
        showMessage(`PDF berhasil dibaca: ${result.totalPages} halaman.`);
      } catch (err) {
        console.error(err);
        setPages([]);
        setTotalSourcePages(0);
        showError(err?.message || "Gagal membaca halaman PDF.");
      } finally {
        setLoading(false);
        setProgress("");
      }
      return;
    }
    if (mode === "merge") {
      setFiles(pdfs);
      setPages([]);
      setTotalSourcePages(0);
      setOutputName("gabungan-josjis.pdf");
    }
  }

  function toggleDeletePage(id) {
    setPages((current) =>
      current.map((page) =>
        page.id === id ? { ...page, deleted: !page.deleted } : page,
      ),
    );
  }
  function rotatePage(id, direction) {
    setPages((current) =>
      current.map((page) =>
        page.id === id
          ? { ...page, rotation: (page.rotation + direction + 360) % 360 }
          : page,
      ),
    );
  }
  function movePage(index, direction) {
    setPages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function moveMergeFile(index, direction) {
    setFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function prepareOutput(bytes, defaultName) {
    const blob = new Blob([bytes], { type: "application/pdf" });
    setResultBlob(blob);
    setResultSize(bytes.byteLength);
    setOutputName(ensurePdfExtension(outputName || defaultName));
    setSaveModalOpen(true);
  }

  async function processCurrentMode() {
    if (!files.length) {
      showError("Silakan pilih file terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    setProgress("Memulai proses...");
    try {
      let outputBytes;
      if (mode === "compress") {
        outputBytes = await compressPdf({
          file: files[0],
          level: compressionLevel,
          colorMode,
          onProgress: (current, total) =>
            setProgress(`Mengompres halaman ${current} dari ${total}...`),
        });
        prepareOutput(
          outputBytes,
          `${getBaseName(files[0].name)}-compressed.pdf`,
        );
        showMessage(
          `PDF selesai diproses. Ukuran hasil ${(outputBytes.length / 1024 / 1024).toFixed(2)} MB.`,
        );
      } else if (mode === "image-to-pdf") {
        outputBytes = await imagesToPdf({
          files,
          colorMode,
          onProgress: (current, total) =>
            setProgress(`Memproses gambar ${current} dari ${total}...`),
        });
        prepareOutput(outputBytes, "gambar-ke-pdf.pdf");
        showMessage(`${files.length} gambar berhasil dibuat menjadi PDF A4.`);
      } else if (mode === "merge") {
        if (files.length < 2)
          throw new Error("Gabungkan PDF membutuhkan minimal 2 file.");
        outputBytes = await mergePdfs(files, (current, total) =>
          setProgress(`Menggabungkan file ${current} dari ${total}...`),
        );
        prepareOutput(outputBytes, "gabungan-josjis.pdf");
        showMessage(`${files.length} PDF berhasil digabung.`);
      } else if (mode === "pages") {
        outputBytes = await editPdfPages({
          file: files[0],
          pages,
          onProgress: (current, total) =>
            setProgress(`Menyusun halaman ${current} dari ${total}...`),
        });
        prepareOutput(outputBytes, `${getBaseName(files[0].name)}-halaman.pdf`);
        showMessage("Susunan halaman berhasil diproses.");
      } else if (mode === "split") {
        if (!splitPageGroups.length)
          throw new Error(
            "Masukkan rentang halaman yang valid, misalnya 1-5 pada baris pertama dan 7-8 pada baris kedua.",
          );
        if (splitOutputMode === "combined") {
          const orderedPages = [...new Set(splitPageGroups.flat())];
          outputBytes = await splitPdf({
            file: files[0],
            selectedPages: orderedPages,
          });
          prepareOutput(
            outputBytes,
            `${getBaseName(files[0].name)}-halaman-terpilih.pdf`,
          );
          showMessage(
            `${orderedPages.length} halaman dari ${splitPageGroups.length} kelompok berhasil dijadikan satu PDF.`,
          );
        } else {
          const baseName = getBaseName(files[0].name);
          for (let i = 0; i < splitPageGroups.length; i++) {
            const group = splitPageGroups[i];
            const bytes = await splitPdf({
              file: files[0],
              selectedPages: group,
            });
            const firstPage = Math.min(...group) + 1;
            const lastPage = Math.max(...group) + 1;
            const rangeLabel =
              firstPage === lastPage
                ? `hal-${firstPage}`
                : `hal-${firstPage}-${lastPage}`;
            downloadBlob(
              new Blob([bytes], { type: "application/pdf" }),
              `${baseName}-${rangeLabel}.pdf`,
            );
            setProgress(
              `Menyiapkan file ${i + 1} dari ${splitPageGroups.length}...`,
            );
            if (i < splitPageGroups.length - 1)
              await new Promise((resolve) => window.setTimeout(resolve, 350));
          }
          setOutputName(`${baseName}-pisah`);
          setResultBlob(null);
          setSaveModalOpen(false);
          showMessage(
            `${splitPageGroups.length} file PDF berhasil disiapkan untuk diunduh. Jika browser meminta izin beberapa download, pilih Izinkan.`,
          );
        }
      }
    } catch (err) {
      console.error(err);
      showError(err?.message || "Proses PDF gagal.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  function changeMode(nextMode) {
    if (loading) return;
    resetWorkspace();
    setMode(nextMode);
  }

  async function selectDirectory() {
    if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
      showError(
        "Browser/perangkat ini belum mendukung pemilihan folder langsung.",
      );
      return;
    }
    try {
      const directory = await window.showDirectoryPicker({ mode: "readwrite" });
      setSelectedDirectory(directory);
      setSelectedDirectoryName(directory.name);
      setError("");
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(err);
        showError("Folder tidak dapat dipilih.");
      }
    }
  }

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
      if (selectedDirectory) {
        let existingFile = null;
        try {
          existingFile = await selectedDirectory.getFileHandle(cleanName, {
            create: false,
          });
        } catch {
          existingFile = null;
        }
        if (
          existingFile &&
          !window.confirm(
            `File "${cleanName}" sudah ada di folder tersebut.\n\nTimpa file tersebut?`,
          )
        )
          return;
        const fileHandle =
          existingFile ||
          (await selectedDirectory.getFileHandle(cleanName, { create: true }));
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

  return (
    <div className="min-h-full space-y-5 pb-10">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900">Kelola PDF</h1>
              <p className="mt-0.5 text-xs text-zinc-500">
                Kompres, gabungkan, atur, pisahkan, dan ubah gambar menjadi PDF.
              </p>
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
      <ModeSelector mode={mode} onChange={changeMode} />
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
      {loading && progress && (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progress}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={PDF_ACCEPT}
        multiple={mode === "merge"}
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
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
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <UploadArea
        mode={mode}
        files={files}
        loading={loading}
        onClick={openFilePicker}
      />
      {mode === "compress" && (
        <CompressPdf
          level={compressionLevel}
          setLevel={setCompressionLevel}
          colorMode={colorMode}
          setColorMode={setColorMode}
          originalSize={files[0]?.size || 0}
        />
      )}
      {mode === "image-to-pdf" && (
        <ImageToPdf
          colorMode={colorMode}
          setColorMode={setColorMode}
          files={files}
        />
      )}
      {mode === "split" && (
        <SplitPdf
          ranges={splitRanges}
          setRanges={setSplitRanges}
          totalPages={totalPages}
          selectedPages={selectedSplitPages}
          pages={pages}
          outputMode={splitOutputMode}
          setOutputMode={setSplitOutputMode}
        />
      )}
      {mode === "pages" && pages.length > 0 && (
        <EditPdfPages
          pages={pages}
          zoom={zoom}
          setZoom={setZoom}
          onMove={movePage}
          onRotate={rotatePage}
          onDelete={toggleDeletePage}
        />
      )}
      {mode === "merge" && files.length > 0 && (
        <MergePdf
          files={files}
          onMove={moveMergeFile}
          onRemove={(index) =>
            setFiles((current) => current.filter((_, i) => i !== index))
          }
        />
      )}
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
      <PdfNotes />
      <SavePdfModal
        open={saveModalOpen}
        size={resultSize}
        defaultName={outputName || "hasil-josjis.pdf"}
        directoryName={selectedDirectoryName}
        onClose={() => {
          if (!savingFile) setSaveModalOpen(false);
        }}
        onSelectDirectory={selectDirectory}
        onSave={saveResultFile}
        saving={savingFile}
      />
    </div>
  );
}
