"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Upload,
  Save,
  LoaderCircle,
  X,
  Image as ImageIcon,
  FileCheck2,
  AlertCircle,
} from "lucide-react";

const MAX_INPUT_SIZE = 15 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 500 * 1024;
const MAX_FILES = 20;

const COMPRESSION_LEVELS = [
  { pdfScale: 1.6, imageMax: 1800, quality: 0.76 },
  { pdfScale: 1.4, imageMax: 1500, quality: 0.68 },
  { pdfScale: 1.2, imageMax: 1300, quality: 0.6 },
  { pdfScale: 1.05, imageMax: 1100, quality: 0.53 },
  { pdfScale: 0.9, imageMax: 950, quality: 0.46 },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} byte`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isPdf(file) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function isImage(file) {
  return (
    file.type.startsWith("image/") &&
    ["image/jpeg", "image/png", "image/webp"].includes(file.type)
  );
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Gagal memproses gambar."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

async function loadImage(file) {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = url;

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(new Error(`Gambar "${file.name}" tidak dapat dibaca.`));
    });

    return image;
  } finally {
    // URL dicabut setelah gambar selesai digunakan oleh pemanggil.
    // Fungsi ini mengembalikan elemen gambar yang sudah dimuat.
    // URL gambar tetap hidup selama decoding berlangsung.
    // Pemanggil tidak memerlukan URL untuk menggambar ulang.
  }
}

async function renderImageToJpeg(file, maxDimension, quality) {
  const image = await loadImage(file);

  try {
    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;

    if (!originalWidth || !originalHeight) {
      throw new Error(`Ukuran gambar "${file.name}" tidak valid.`);
    }

    const scale = Math.min(
      1,
      maxDimension / Math.max(originalWidth, originalHeight),
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(originalWidth * scale));
    canvas.height = Math.max(1, Math.round(originalHeight * scale));

    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Browser tidak dapat memproses gambar.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await canvasToJpeg(canvas, quality);
  } finally {
    // Membersihkan resource gambar setelah selesai diproses.
    image.src = "";
  }
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  return pdfjs;
}

async function renderPdfPageToJpeg(page, scale, quality) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));

  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("Browser tidak dapat memproses halaman PDF.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport,
    background: "#ffffff",
  }).promise;

  const blob = await canvasToJpeg(canvas, quality);

  canvas.width = 1;
  canvas.height = 1;

  return blob;
}

async function buildCompressedPdf(files, level) {
  const { PDFDocument } = await import("pdf-lib");

  const outputPdf = await PDFDocument.create();
  outputPdf.setTitle("Dokumen Serah Terima Agunan Lunas");
  outputPdf.setProducer("JOSJIS");

  const firstIsPdf = isPdf(files[0]);

  if (firstIsPdf) {
    const pdfjs = await loadPdfJs();
    const sourceBytes = new Uint8Array(await files[0].arrayBuffer());

    const loadingTask = pdfjs.getDocument({
      data: sourceBytes,
      isEvalSupported: false,
    });

    const sourcePdf = await loadingTask.promise;

    try {
      if (sourcePdf.numPages > MAX_FILES) {
        throw new Error(
          `PDF memiliki ${sourcePdf.numPages} halaman. Maksimal ${MAX_FILES} halaman.`,
        );
      }

      for (let pageNumber = 1; pageNumber <= sourcePdf.numPages; pageNumber++) {
        const sourcePage = await sourcePdf.getPage(pageNumber);
        const viewport = sourcePage.getViewport({ scale: 1 });
        const jpegBlob = await renderPdfPageToJpeg(
          sourcePage,
          level.pdfScale,
          level.quality,
        );

        const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
        const embeddedImage = await outputPdf.embedJpg(jpegBytes);

        // Pertahankan proporsi halaman sumber dalam satuan PDF points.
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
        const outputPage = outputPdf.addPage([pageWidth, pageHeight]);

        outputPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });

        sourcePage.cleanup();
      }
    } finally {
      await loadingTask.destroy();
    }
  } else {
    for (const file of files) {
      const jpegBlob = await renderImageToJpeg(
        file,
        level.imageMax,
        level.quality,
      );

      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
      const embeddedImage = await outputPdf.embedJpg(jpegBytes);

      // Gunakan kertas A4 portrait atau landscape sesuai foto.
      const isLandscape = embeddedImage.width > embeddedImage.height;

      const pageWidth = isLandscape ? 841.89 : 595.28;
      const pageHeight = isLandscape ? 595.28 : 841.89;

      const page = outputPdf.addPage([pageWidth, pageHeight]);

      const scale = Math.min(
        pageWidth / embeddedImage.width,
        pageHeight / embeddedImage.height,
      );

      const drawWidth = embeddedImage.width * scale;
      const drawHeight = embeddedImage.height * scale;

      page.drawImage(embeddedImage, {
        x: (pageWidth - drawWidth) / 2,
        y: (pageHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });
    }
  }

  const bytes = await outputPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  return new Blob([bytes], { type: "application/pdf" });
}

async function prepareDocument(files, onProgress) {
  let lastSize = 0;

  for (let index = 0; index < COMPRESSION_LEVELS.length; index++) {
    onProgress(
      `Mengoptimalkan dokumen (${index + 1}/${COMPRESSION_LEVELS.length})...`,
    );

    const blob = await buildCompressedPdf(files, COMPRESSION_LEVELS[index]);

    lastSize = blob.size;

    if (blob.size <= MAX_OUTPUT_SIZE) {
      const name = isPdf(files[0])
        ? files[0].name.replace(/\.pdf$/i, "")
        : "dokumen-serah-terima";

      return new File([blob], `${name}-terkompresi.pdf`, {
        type: "application/pdf",
        lastModified: Date.now(),
      });
    }
  }

  throw new Error(
    `Dokumen belum dapat diperkecil hingga maksimal 500 KB. ` +
      `Ukuran terkecil yang dihasilkan ${formatBytes(lastSize)}. ` +
      `Dokumen tidak diunggah agar kualitas tetap terjaga. ` +
      `Coba kurangi jumlah halaman atau gunakan hasil scan yang lebih kecil.`,
  );
}

export default function TambahSerahTerimaAgunanLunasPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    unitCode: "JKK1",
    namaDebitur: "",
    nomorRekeningPinjaman: "",
    tanggalPenyerahan: new Date().toLocaleDateString("sv-SE"),
  });

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const selectedFiles = Array.from(event.target.files || []);

    setError("");
    setSuccess("");

    if (!selectedFiles.length) return;

    if (selectedFiles.length > MAX_FILES) {
      setError(`Maksimal ${MAX_FILES} file atau halaman foto sekaligus.`);
      event.target.value = "";
      return;
    }

    const pdfFiles = selectedFiles.filter(isPdf);
    const imageFiles = selectedFiles.filter(isImage);

    if (pdfFiles.length > 0 && imageFiles.length > 0) {
      setError("Pilih PDF saja atau foto saja. Jangan mencampur keduanya.");
      event.target.value = "";
      return;
    }

    if (pdfFiles.length > 1) {
      setError(
        "Pilih satu PDF. Jika dokumen terpisah, gabungkan terlebih dahulu menjadi satu PDF.",
      );
      event.target.value = "";
      return;
    }

    const invalidFiles = selectedFiles.filter(
      (file) => !isPdf(file) && !isImage(file),
    );

    if (invalidFiles.length) {
      setError("Format yang didukung: satu PDF, atau foto JPG, PNG, dan WebP.");
      event.target.value = "";
      return;
    }

    const oversized = selectedFiles.find((file) => file.size > MAX_INPUT_SIZE);

    if (oversized) {
      setError(`File "${oversized.name}" melebihi batas input 15 MB per file.`);
      event.target.value = "";
      return;
    }

    if (selectedFiles.some((file) => file.size === 0)) {
      setError("Ada file kosong yang tidak dapat diproses.");
      event.target.value = "";
      return;
    }

    setFiles(selectedFiles);
  }

  function removeFile(index) {
    setFiles((previous) => previous.filter((_, i) => i !== index));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.namaDebitur.trim()) {
      setError("Nama debitur wajib diisi.");
      return;
    }

    if (!form.nomorRekeningPinjaman.trim()) {
      setError("Nomor rekening pinjaman wajib diisi.");
      return;
    }

    if (!form.tanggalPenyerahan) {
      setError("Tanggal penyerahan wajib diisi.");
      return;
    }

    if (!files.length) {
      setError("Pilih satu PDF atau beberapa foto terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);

      const hasPdf = isPdf(files[0]);

      if (hasPdf && files.length !== 1) {
        throw new Error("Untuk format PDF, pilih satu file saja.");
      }

      setProgress("Menyiapkan dokumen...");
      const compressedFile = await prepareDocument(files, setProgress);

      if (compressedFile.size > MAX_OUTPUT_SIZE) {
        throw new Error(
          "Ukuran akhir melebihi 500 KB. Dokumen tidak akan diunggah.",
        );
      }

      setProgress(
        `Mengunggah PDF hasil kompresi (${formatBytes(compressedFile.size)})...`,
      );

      const formData = new FormData();
      formData.append("unitCode", form.unitCode);
      formData.append("namaDebitur", form.namaDebitur.trim());
      formData.append(
        "nomorRekeningPinjaman",
        form.nomorRekeningPinjaman.trim(),
      );
      formData.append("tanggalPenyerahan", form.tanggalPenyerahan);
      formData.append("dokumen", compressedFile);
      formData.append(
        "namaFileAsli",
        files.map((file) => file.name).join(", "),
      );

      const response = await fetch("/api/admin/penyerahan-agunan-lunas", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Data gagal disimpan.");
      }

      setSuccess("Data berhasil disimpan. Membuka daftar data...");
      router.push("/admin/penyerahan-agunan-lunas");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses dokumen.",
      );
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/penyerahan-agunan-lunas")}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowLeft size={17} />
          Kembali
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            Tambah Serah Terima Agunan Lunas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Isi data debitur dan lampirkan dokumen serah terima.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <FileText size={21} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                Informasi Penyerahan
              </h2>
              <p className="text-sm text-gray-500">
                Nomor surat dibuat otomatis oleh sistem.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="unitCode"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                id="unitCode"
                value={form.unitCode}
                onChange={(event) =>
                  updateField("unitCode", event.target.value)
                }
                required
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="JKK1">JKK 1 — Jambi Kuamang Kuning 1</option>
                <option value="JKK2">JKK 2 — Jambi Kuamang Kuning 2</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="tanggalPenyerahan"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Tanggal Penyerahan <span className="text-red-500">*</span>
              </label>
              <input
                id="tanggalPenyerahan"
                type="date"
                value={form.tanggalPenyerahan}
                onChange={(event) =>
                  updateField("tanggalPenyerahan", event.target.value)
                }
                required
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="namaDebitur"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Nama Debitur <span className="text-red-500">*</span>
              </label>
              <input
                id="namaDebitur"
                type="text"
                value={form.namaDebitur}
                onChange={(event) =>
                  updateField("namaDebitur", event.target.value)
                }
                placeholder="Masukkan nama debitur"
                maxLength={200}
                required
                disabled={loading}
                autoComplete="off"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="nomorRekeningPinjaman"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Nomor Rekening Pinjaman <span className="text-red-500">*</span>
              </label>
              <input
                id="nomorRekeningPinjaman"
                type="text"
                value={form.nomorRekeningPinjaman}
                onChange={(event) =>
                  updateField("nomorRekeningPinjaman", event.target.value)
                }
                placeholder="Masukkan nomor rekening pinjaman"
                maxLength={100}
                required
                disabled={loading}
                autoComplete="off"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-gray-900">
              Dokumen Serah Terima
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Pilih satu PDF atau beberapa foto untuk digabungkan menjadi satu
              PDF.
            </p>
          </div>

          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Batas ukuran PDF: 500 KB</p>
                <p className="mt-1">
                  Sistem akan mencoba mengompres dokumen secara otomatis. Jika
                  ukuran tidak bisa mencapai batas tanpa kompresi lebih lanjut
                  yang berpotensi mengurangi keterbacaan, dokumen tidak akan
                  diunggah.
                </p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
            disabled={loading}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-5 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/40 disabled:opacity-50"
          >
            <div className="mb-3 rounded-full bg-blue-50 p-3 text-blue-700">
              <Upload size={25} />
            </div>
            <span className="font-medium text-gray-800">
              {files.length ? "Ganti pilihan dokumen" : "Pilih PDF atau foto"}
            </span>
            <span className="mt-1 text-sm text-gray-500">
              PDF tunggal atau maksimal {MAX_FILES} foto JPG, PNG, WebP
            </span>
            <span className="mt-1 text-xs text-gray-400">
              Maksimal 15 MB per file sebelum kompresi
            </span>
          </button>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800">
                  Dokumen dipilih ({files.length})
                </p>
                <p className="text-xs text-gray-500">
                  Total input:{" "}
                  {formatBytes(files.reduce((sum, file) => sum + file.size, 0))}
                </p>
              </div>

              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3"
                >
                  <div className="rounded-lg bg-white p-3 text-blue-700">
                    {isPdf(file) ? (
                      <FileText size={23} />
                    ) : (
                      <ImageIcon size={23} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {isPdf(file) ? "PDF" : "Foto"} · {formatBytes(file.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    title="Hapus file pilihan"
                    onClick={() => removeFile(index)}
                    disabled={loading}
                    className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-red-600 disabled:opacity-50"
                  >
                    <X size={19} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div
              role="status"
              className="mt-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"
            >
              <LoaderCircle size={20} className="animate-spin shrink-0" />
              <div>
                <p className="font-medium">Mohon tunggu</p>
                <p className="mt-1">{progress || "Memproses dokumen..."}</p>
              </div>
            </div>
          )}

          {files.length > 0 && !loading && (
            <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
              <FileCheck2 size={16} className="mt-0.5 shrink-0" />
              <p>
                Ukuran akhir akan diperiksa sebelum upload. PDF hasil kompresi
                berupa gambar per halaman, sehingga teks di dalam PDF tidak lagi
                bisa dipilih atau dicari.
              </p>
            </div>
          )}
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/admin/penyerahan-agunan-lunas")}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Save size={18} />
                Kompres & Simpan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
