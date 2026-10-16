"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  LoaderCircle,
  Eye,
  X,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  UserPlus,
  Pencil,
  Archive,
  CheckSquare,
  Square,
  Package,
} from "lucide-react";

/* =========================================================
   UTILITAS
========================================================= */

function formatBytes(bytes) {
  const size = Number(bytes || 0);

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRupiah(value) {
  if (value == null || value === "") return "-";

  const number = Number(value);

  return Number.isFinite(number)
    ? `Rp ${number.toLocaleString("id-ID")}`
    : String(value);
}

function safeName(value) {
  return (
    String(value || "dokumen")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/[.\s]+$/g, "")
      .slice(0, 100) || "dokumen"
  );
}

async function parseResponse(response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.error || `Permintaan gagal (${response.status}).`);
  }

  return result;
}

function isPreparationBatch(batch) {
  return String(batch?.status || "").toUpperCase() === "PERSIAPAN";
}

function StatusBadge({ status }) {
  const config = {
    LENGKAP: "bg-emerald-100 text-emerald-800",
    BELUM_LENGKAP: "bg-amber-100 text-amber-800",
    BELUM_ADA_DOKUMEN: "bg-slate-100 text-slate-700",
    PRODUK_PERLU_DICEK: "bg-orange-100 text-orange-800",
    PK_TIDAK_DITEMUKAN: "bg-red-100 text-red-800",
  };

  const labels = {
    LENGKAP: "Lengkap",
    BELUM_LENGKAP: "Belum lengkap",
    BELUM_ADA_DOKUMEN: "Belum ada dokumen",
    PRODUK_PERLU_DICEK: "Produk perlu dicek",
    PK_TIDAK_DITEMUKAN: "PK tidak ditemukan",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        config[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {labels[status] || status || "Belum diketahui"}
    </span>
  );
}

/* =========================================================
   PDF VIEWER
   PDF.js membuat scroll dokumen terpisah dari halaman utama.
   Worker harus tersedia di public/pdf.worker.mjs.
========================================================= */

function PdfCanvasViewer({ url, fileName }) {
  const containerRef = useRef(null);
  const pagesRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;
    let pdfDocument = null;
    const renderTasks = [];

    async function renderPdf() {
      setLoading(true);
      setError("");

      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

        if (cancelled) return;

        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

        loadingTask = pdfjs.getDocument({
          url,
          withCredentials: false,
        });

        pdfDocument = await loadingTask.promise;

        if (cancelled) return;

        const container = containerRef.current;
        const pagesElement = pagesRef.current;

        if (!container || !pagesElement) {
          throw new Error("Area preview PDF tidak tersedia.");
        }

        pagesElement.replaceChildren();

        for (
          let pageNumber = 1;
          pageNumber <= pdfDocument.numPages;
          pageNumber++
        ) {
          if (cancelled) return;

          const page = await pdfDocument.getPage(pageNumber);

          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const availableWidth = Math.max(container.clientWidth - 24, 280);
          const scale = Math.min(availableWidth / baseViewport.width, 2);
          const viewport = page.getViewport({ scale });

          const pageWrapper = document.createElement("div");
          pageWrapper.className =
            "mx-auto mb-4 w-fit max-w-full overflow-hidden rounded-sm bg-white shadow-md";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Browser tidak mendukung render canvas PDF.");
          }

          const outputScale = window.devicePixelRatio || 1;

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.display = "block";
          canvas.setAttribute(
            "aria-label",
            `Halaman ${pageNumber} dari ${pdfDocument.numPages}`,
          );

          pageWrapper.appendChild(canvas);
          pagesElement.appendChild(pageWrapper);

          const renderTask = page.render({
            canvasContext: context,
            viewport,
            transform:
              outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
          });

          renderTasks.push(renderTask);
          await renderTask.promise;
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Gagal menampilkan PDF.");
          setLoading(false);
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;

      for (const task of renderTasks) {
        try {
          task.cancel();
        } catch {}
      }

      try {
        loadingTask?.destroy();
      } catch {}

      try {
        pdfDocument?.destroy();
      } catch {}
    };
  }, [url]);

  return (
    <div className="relative h-full min-h-0 bg-slate-200">
      <div
        ref={containerRef}
        className="h-full min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-3 py-4 sm:px-5"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          touchAction: "pan-y",
        }}
      >
        <div ref={pagesRef} className="min-h-full">
          {!loading && !error && (
            <p className="pb-3 text-center text-xs text-slate-500">
              {fileName}
            </p>
          )}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <LoaderCircle size={22} className="animate-spin" />
            Merender halaman PDF...
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-auto p-6 text-center">
          <AlertTriangle size={30} className="text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
          <p className="max-w-lg text-xs text-slate-500">
            Pastikan pdfjs-dist tersedia dan file public/pdf.worker.mjs sesuai
            dengan versi PDF.js yang terpasang.
          </p>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   HALAMAN MONITORING
========================================================= */

export default function MonitoringMigrasiPage() {
  const router = useRouter();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyword, setKeyword] = useState("");
  const [expanded, setExpanded] = useState({});
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [busyAction, setBusyAction] = useState("");
  const [busyBatchId, setBusyBatchId] = useState("");

  const [editingBatch, setEditingBatch] = useState(null);
  const [batchNameInput, setBatchNameInput] = useState("");
  const [savingBatchName, setSavingBatchName] = useState(false);

  /* Kunci scroll halaman di belakang modal PDF. */
  useEffect(() => {
    if (!preview) return;

    const oldOverflow = document.body.style.overflow;
    const oldPosition = document.body.style.position;
    const oldWidth = document.body.style.width;
    const oldTop = document.body.style.top;
    const oldTouchAction = document.body.style.touchAction;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = oldOverflow;
      document.body.style.position = oldPosition;
      document.body.style.width = oldWidth;
      document.body.style.top = oldTop;
      document.body.style.touchAction = oldTouchAction;

      window.scrollTo(0, scrollY);
    };
  }, [preview]);

  /* Revoke object URL saat preview diganti atau ditutup. */
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadMonitoring = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await fetch("/api/admin/migrasi/monitoring", {
        method: "GET",
        cache: "no-store",
      });

      const result = await parseResponse(response);

      setBatches(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err?.message || "Gagal memuat monitoring migrasi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMonitoring();
  }, [loadMonitoring]);

  const closePreview = () => {
    setPreview(null);
    setPreviewUrl("");
    setPreviewError("");
    setPreviewLoading(false);
  };

  const openPreview = async (doc, row) => {
    const documentId = String(doc?.id || "");

    if (!documentId) {
      setError("ID dokumen tidak ditemukan.");
      return;
    }

    setPreviewUrl("");
    setPreviewError("");
    setPreview({
      document: doc,
      debitur: row,
    });
    setPreviewLoading(true);

    try {
      const response = await fetch(
        `/api/admin/migrasi/dokumen/download?id=${encodeURIComponent(documentId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Gagal membuka dokumen.");
      }

      const blob = await response.blob();

      if (
        blob.type &&
        blob.type !== "application/pdf" &&
        blob.type !== "application/octet-stream"
      ) {
        throw new Error("File yang diterima bukan PDF.");
      }

      const pdfBlob =
        blob.type === "application/pdf"
          ? blob
          : new Blob([blob], { type: "application/pdf" });

      setPreviewUrl(URL.createObjectURL(pdfBlob));
    } catch (err) {
      setPreviewError(err?.message || "Gagal membuka preview PDF.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadPreview = () => {
    if (!previewUrl || !preview?.document) return;

    const anchor = document.createElement("a");
    anchor.href = previewUrl;
    anchor.download = safeName(preview.document.nama_file);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  /* POST ke API pengelolaan monitoring. */
  const manageRequest = async (payload) => {
    const response = await fetch("/api/admin/migrasi/monitoring/manage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return parseResponse(response);
  };

  const openEditBatchName = (batch) => {
    setError("");
    setNotice("");
    setEditingBatch(batch);
    setBatchNameInput(batch.nama_batch || "");
  };

  const saveBatchName = async () => {
    if (!editingBatch?.id) return;

    const namaBatch = batchNameInput.trim();

    if (!namaBatch) {
      setError("Nama batch wajib diisi dan tidak boleh dikosongkan.");
      return;
    }

    if (namaBatch.length > 100) {
      setError("Nama batch maksimal 100 karakter.");
      return;
    }

    setError("");
    setNotice("");
    setSavingBatchName(true);

    try {
      const result = await manageRequest({
        action: "rename_batch",
        batch_id: editingBatch.id,
        nama_batch: namaBatch,
      });

      setEditingBatch(null);
      setBatchNameInput("");

      setNotice(result.message || "Nama batch berhasil diperbarui.");

      await loadMonitoring(true);
    } catch (err) {
      setError(err?.message || "Gagal memperbarui nama batch.");
    } finally {
      setSavingBatchName(false);
    }
  };

  /* Unduh file ZIP dari API. */
  const downloadZip = async (url, fallbackName) => {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || "Gagal membuat ZIP.");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = fallbackName;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const downloadDebiturZip = async (row) => {
    if (!row?.id) return;

    setError("");
    setNotice("");
    setBusyAction(`zip-debitur-${row.id}`);

    try {
      const name = safeName(row.pk?.nama_debitur || "Debitur");
      const fileName = `Dokumen_${name}.zip`;

      await downloadZip(
        `/api/admin/migrasi/monitoring/zip?migrasi_debitur_id=${encodeURIComponent(row.id)}`,
        fileName,
      );

      setNotice(`ZIP dokumen ${name} berhasil diminta.`);
    } catch (err) {
      setError(err?.message || "Gagal mengunduh ZIP debitur.");
    } finally {
      setBusyAction("");
    }
  };

  const downloadBatchZip = async (batch) => {
    if (!batch?.id) return;

    if (!batch.nama_batch?.trim()) {
      setError(
        "Batch belum memiliki nama. Silakan isi nama batch terlebih dahulu.",
      );
      return;
    }

    setError("");
    setNotice("");
    setBusyBatchId(String(batch.id));
    setBusyAction(`zip-batch-${batch.id}`);

    try {
      const namaFile = `${safeName(batch.nama_batch)}.zip`;

      await downloadZip(
        `/api/admin/migrasi/monitoring/zip?batch_id=${encodeURIComponent(batch.id)}`,
        namaFile,
      );

      setNotice(`ZIP ${batch.nama_batch} berhasil diunduh.`);
    } catch (err) {
      setError(err?.message || "Gagal mengunduh ZIP batch.");
    } finally {
      setBusyAction("");
      setBusyBatchId("");
    }
  };

  const addDebitur = async (batch) => {
    if (!isPreparationBatch(batch)) {
      setError(
        "Debitur hanya dapat ditambahkan pada batch berstatus PERSIAPAN.",
      );
      return;
    }

    const pkId = window.prompt(
      "Masukkan ID PK yang akan ditambahkan ke batch ini.\nGunakan ID dari tabel PK, bukan nomor PK.",
    );

    if (pkId == null) return;

    const normalizedPkId = pkId.trim();

    if (!normalizedPkId) {
      setError("ID PK tidak boleh kosong.");
      return;
    }

    setError("");
    setNotice("");
    setBusyAction(`add-${batch.id}`);

    try {
      await manageRequest({
        action: "add_debitur",
        batch_id: batch.id,
        pk_id: normalizedPkId,
      });

      setNotice("Debitur berhasil ditambahkan ke batch.");
      await loadMonitoring(true);
    } catch (err) {
      setError(err?.message || "Gagal menambahkan debitur.");
    } finally {
      setBusyAction("");
    }
  };

  const replacePk = async (batch, row) => {
    if (!isPreparationBatch(batch)) {
      setError("Relasi PK hanya dapat diganti pada batch berstatus PERSIAPAN.");
      return;
    }

    const pkId = window.prompt(
      `Ganti relasi PK untuk debitur "${row.pk?.nama_debitur || "-"}".\nMasukkan ID PK baru dari tabel PK.`,
    );

    if (pkId == null) return;

    const normalizedPkId = pkId.trim();

    if (!normalizedPkId) {
      setError("ID PK tidak boleh kosong.");
      return;
    }

    if (
      !window.confirm(
        "Ganti relasi PK untuk debitur ini?\n\nData PK sumber tidak akan diubah atau dihapus.",
      )
    ) {
      return;
    }

    setError("");
    setNotice("");
    setBusyAction(`replace-${row.id}`);

    try {
      await manageRequest({
        action: "replace_pk",
        migrasi_debitur_id: row.id,
        pk_id: normalizedPkId,
      });

      setNotice("Relasi PK berhasil diganti.");
      await loadMonitoring(true);
    } catch (err) {
      setError(err?.message || "Gagal mengganti relasi PK.");
    } finally {
      setBusyAction("");
    }
  };

  const deleteDocument = async (batch, row, doc) => {
    if (!isPreparationBatch(batch)) {
      setError("Dokumen hanya dapat dikelola pada batch berstatus PERSIAPAN.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus dokumen "${doc.nama_file || doc.jenis_dokumen}" dari daftar migrasi?\n\nPenghapusan menggunakan soft delete. File sumber di Storage tidak langsung dihapus.`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setBusyAction(`delete-doc-${doc.id}`);

    try {
      await manageRequest({
        action: "soft_delete_document",
        dokumen_id: doc.id,
        migrasi_debitur_id: row.id,
      });

      setNotice("Dokumen berhasil dihapus dari daftar aktif.");
      await loadMonitoring(true);
    } catch (err) {
      setError(err?.message || "Gagal menghapus dokumen.");
    } finally {
      setBusyAction("");
    }
  };

  const deleteDebitur = async (batch, row) => {
    if (!isPreparationBatch(batch)) {
      setError("Debitur hanya dapat dihapus pada batch berstatus PERSIAPAN.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus debitur "${row.pk?.nama_debitur || "-"}" dari batch ini?\n\nIni menggunakan soft delete. Data PK sumber tidak dihapus.`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setBusyAction(`delete-debitur-${row.id}`);

    try {
      await manageRequest({
        action: "soft_delete_debitur",
        migrasi_debitur_id: row.id,
      });

      setSelectedIds((previous) => previous.filter((id) => id !== row.id));
      setNotice("Debitur berhasil dihapus dari daftar aktif.");
      await loadMonitoring(true);
    } catch (err) {
      setError(err?.message || "Gagal menghapus debitur.");
    } finally {
      setBusyAction("");
    }
  };

  const deleteBatch = async (batch) => {
    if (!isPreparationBatch(batch)) {
      setError("Batch hanya dapat dihapus saat berstatus PERSIAPAN.");
      return;
    }

    const confirmed = window.confirm(
      `HAPUS BATCH MIGRASI?\n\n` +
        `Unit: ${batch.unit?.nama || "-"}\n` +
        `Jumlah debitur: ${batch.jumlah_debitur || 0}\n\n` +
        `Semua debitur dan dokumen migrasi dalam batch ini akan ` +
        `ditandai terhapus.\n\n` +
        `Data PK asli tidak akan dihapus atau diubah.\n\n` +
        `Lanjutkan?`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setBusyAction(`delete-batch-${batch.id}`);

    try {
      const result = await manageRequest({
        action: "soft_delete_batch",
        batch_id: batch.id,
      });

      setSelectedIds((previous) =>
        previous.filter(
          (id) => !(batch.debitur || []).some((row) => row.id === id),
        ),
      );

      setExpanded((previous) => ({
        ...previous,
        [batch.id]: false,
      }));

      setNotice(result.message || "Batch berhasil ditandai terhapus.");

      await loadMonitoring(true);
    } catch (err) {
      setError(err?.message || "Gagal menghapus batch.");
    } finally {
      setBusyAction("");
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const toggleSelectBatch = (rows) => {
    const ids = rows.map((row) => row.id);
    const allSelected =
      ids.length > 0 && ids.every((id) => selectedIds.includes(id));

    setSelectedIds((previous) =>
      allSelected
        ? previous.filter((id) => !ids.includes(id))
        : [...new Set([...previous, ...ids])],
    );
  };

  const bulkDeleteDebitur = async (batch) => {
    if (!isPreparationBatch(batch)) {
      setError("Penghapusan massal hanya diizinkan pada batch PERSIAPAN.");
      return;
    }

    const idsInBatch = (batch.debitur || [])
      .filter((row) => selectedIds.includes(row.id))
      .map((row) => row.id);

    if (idsInBatch.length === 0) {
      setError("Pilih minimal satu debitur dari batch ini.");
      return;
    }

    if (
      !window.confirm(
        `Hapus ${idsInBatch.length} debitur terpilih dari batch ini?\n\nSemua akan menggunakan soft delete. Data PK sumber tidak dihapus.`,
      )
    ) {
      return;
    }

    setError("");
    setNotice("");
    setBusyAction(`bulk-delete-${batch.id}`);

    try {
      await manageRequest({
        action: "bulk_soft_delete_debitur",
        batch_id: batch.id,
        migrasi_debitur_ids: idsInBatch,
      });

      setSelectedIds((previous) =>
        previous.filter((id) => !idsInBatch.includes(id)),
      );

      setNotice(
        `${idsInBatch.length} debitur berhasil dihapus dari daftar aktif.`,
      );
      await loadMonitoring(true);
    } catch (err) {
      setError(err?.message || "Gagal menghapus debitur terpilih.");
    } finally {
      setBusyAction("");
    }
  };

  const normalizedKeyword = keyword.trim().toLowerCase();

  const filteredBatches = batches
    .map((batch) => {
      const filteredDebitur = (batch.debitur || []).filter((row) => {
        const pk = row.pk || {};

        const text = [
          pk.nama_debitur,
          pk.nomor_pk,
          pk.cif,
          row.produk,
          batch.unit?.nama,
          batch.unit?.kode_unit,
          batch.id,
        ]
          .join(" ")
          .toLowerCase();

        return !normalizedKeyword || text.includes(normalizedKeyword);
      });

      return {
        ...batch,
        filteredDebitur,
      };
    })
    .filter((batch) => {
      if (!normalizedKeyword) return true;

      return (
        batch.filteredDebitur.length > 0 ||
        String(batch.id).toLowerCase().includes(normalizedKeyword)
      );
    });

  const totalDebitur = batches.reduce(
    (sum, batch) => sum + Number(batch.jumlah_debitur || 0),
    0,
  );

  const totalDokumen = batches.reduce(
    (sum, batch) => sum + Number(batch.jumlah_dokumen || 0),
    0,
  );

  const totalLengkap = batches.reduce(
    (sum, batch) => sum + Number(batch.jumlah_lengkap || 0),
    0,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/migrasi")}
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Kembali ke Migrasi
          </button>

          <h1 className="text-2xl font-bold text-slate-900">
            Monitoring Migrasi
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Pantau batch, debitur, kelengkapan dokumen, dan kelola berkas
            migrasi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadMonitoring(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Perbarui data
        </button>
      </div>

      {/* NOTIFIKASI */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 rounded p-1 hover:bg-red-100"
            aria-label="Tutup pesan error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="shrink-0 rounded p-1 hover:bg-emerald-100"
            aria-label="Tutup pesan sukses"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* RINGKASAN */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total batch"
          value={batches.length}
          description="Batch migrasi"
        />
        <SummaryCard
          label="Total debitur"
          value={totalDebitur}
          description="Debitur dalam batch aktif"
        />
        <SummaryCard
          label="Total dokumen"
          value={totalDokumen}
          description="Dokumen dalam monitoring"
        />
        <SummaryCard
          label="Dokumen lengkap"
          value={totalLengkap}
          description="Sesuai aturan wajib saat ini"
        />
      </div>

      {/* PENCARIAN */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Cari nama debitur, nomor PK, CIF, unit..."
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {/* DAFTAR BATCH */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border bg-white p-12 text-sm text-slate-600">
          <LoaderCircle className="animate-spin" size={20} />
          Memuat monitoring migrasi...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center">
          <FileText className="mx-auto mb-3 text-slate-400" size={32} />
          <p className="font-semibold text-slate-800">
            Data monitoring belum ditemukan
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Coba kata kunci lain atau buat batch dari halaman Migrasi.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBatches.map((batch) => {
            const isExpanded = Boolean(expanded[batch.id]);
            const preparation = isPreparationBatch(batch);
            const visibleRows = batch.filteredDebitur || [];
            const selectedInBatch = visibleRows.filter((row) =>
              selectedIds.includes(row.id),
            ).length;
            const allVisibleSelected =
              visibleRows.length > 0 &&
              visibleRows.every((row) => selectedIds.includes(row.id));

            return (
              <section
                key={batch.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                {/* HEADER BATCH */}
                <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-900">
                        {batch.nama_batch || "Batch belum bernama"}
                      </h2>

                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                        {batch.unit?.kode_unit ||
                          batch.unit?.kode_legacy ||
                          "-"}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          preparation
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {batch.status || "Status tidak diketahui"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-600">
                      Unit: {batch.unit?.nama || "Unit tidak diketahui"}
                    </p>

                    <p className="mt-1 break-all text-xs text-slate-500">
                      Batch ID: {batch.id}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Dibuat: {formatDate(batch.created_at)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
                    <MiniCount label="Debitur" value={batch.jumlah_debitur} />
                    <MiniCount label="Dokumen" value={batch.jumlah_dokumen} />
                    <MiniCount label="Lengkap" value={batch.jumlah_lengkap} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditBatchName(batch)}
                      disabled={Boolean(busyAction)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                      title="Ubah nama batch"
                    >
                      <Pencil size={16} />
                      <span>Edit Nama</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadBatchZip(batch)}
                      disabled={Boolean(busyAction)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      title="Unduh dokumen semua debitur dalam satu ZIP"
                    >
                      {busyAction === `zip-batch-${batch.id}` ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Package size={16} />
                      )}
                      <span>ZIP batch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addDebitur(batch)}
                      disabled={!preparation || Boolean(busyAction)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        preparation
                          ? "Tambahkan PK ke batch"
                          : "Hanya tersedia untuk batch PERSIAPAN"
                      }
                    >
                      {busyAction === `add-${batch.id}` ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <UserPlus size={16} />
                      )}
                      <span>Tambah debitur</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((previous) => ({
                          ...previous,
                          [batch.id]: !previous[batch.id],
                        }))
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={16} />
                          Tutup
                        </>
                      ) : (
                        <>
                          <ChevronDown size={16} />
                          Lihat debitur
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteBatch(batch)}
                      disabled={!preparation || Boolean(busyAction)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        preparation
                          ? "Hapus batch beserta seluruh debitur dan dokumen migrasinya"
                          : "Hanya tersedia untuk batch PERSIAPAN"
                      }
                    >
                      {busyAction === `delete-batch-${batch.id}` ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      <span>Hapus Batch</span>
                    </button>
                  </div>
                </div>

                {/* ISI BATCH */}
                {isExpanded && (
                  <div className="border-t border-slate-200">
                    {/* AKSI SELEKSI MASSAL */}
                    <div className="flex flex-col gap-3 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectBatch(visibleRows)}
                          disabled={visibleRows.length === 0}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                        >
                          {allVisibleSelected ? (
                            <CheckSquare size={17} />
                          ) : (
                            <Square size={17} />
                          )}
                          {allVisibleSelected
                            ? "Batal pilih semua"
                            : "Pilih semua"}
                        </button>

                        <span className="text-sm text-slate-500">
                          {selectedInBatch} dipilih
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => bulkDeleteDebitur(batch)}
                        disabled={
                          !preparation ||
                          selectedInBatch === 0 ||
                          Boolean(busyAction)
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busyAction === `bulk-delete-${batch.id}` ? (
                          <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        Hapus pilihan ({selectedInBatch})
                      </button>
                    </div>

                    {visibleRows.length === 0 ? (
                      <p className="p-5 text-sm text-slate-500">
                        Tidak ada debitur yang cocok dengan pencarian.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {visibleRows.map((row) => {
                          const pk = row.pk || {};
                          const docs = row.dokumen || [];
                          const rowSelected = selectedIds.includes(row.id);

                          return (
                            <div key={row.id} className="space-y-4 p-4">
                              {/* INFORMASI DEBITUR */}
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleSelected(row.id)}
                                    className="mt-1 shrink-0 rounded p-1 text-slate-600 hover:bg-slate-100"
                                    aria-label={
                                      rowSelected
                                        ? "Batalkan pilihan debitur"
                                        : "Pilih debitur"
                                    }
                                    title={
                                      rowSelected
                                        ? "Batalkan pilihan"
                                        : "Pilih debitur"
                                    }
                                  >
                                    {rowSelected ? (
                                      <CheckSquare
                                        size={20}
                                        className="text-emerald-700"
                                      />
                                    ) : (
                                      <Square size={20} />
                                    )}
                                  </button>

                                  <div className="min-w-0 flex-1">
                                    <h3 className="break-words font-semibold text-slate-900">
                                      {pk.nama_debitur || "Nama tidak tersedia"}
                                    </h3>

                                    <p className="mt-1 break-words text-xs text-slate-500">
                                      PK: {pk.nomor_pk || "-"} · CIF:{" "}
                                      {pk.cif || "-"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      Limit: {formatRupiah(pk.limit_kredit)} ·
                                      Produk: {row.produk || "Perlu diperiksa"}
                                    </p>

                                    <p className="mt-1 break-all text-[11px] text-slate-400">
                                      Relasi migrasi: {row.id}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 lg:items-end">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge
                                      status={row.status_kelengkapan}
                                    />
                                    <span className="text-xs text-slate-500">
                                      {row.jumlah_dokumen_tersimpan || 0}/
                                      {row.jumlah_dokumen || 0} dokumen
                                      tersimpan
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => downloadDebiturZip(row)}
                                      disabled={Boolean(busyAction)}
                                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                    >
                                      {busyAction ===
                                      `zip-debitur-${row.id}` ? (
                                        <LoaderCircle
                                          size={15}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Archive size={15} />
                                      )}
                                      ZIP debitur
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => replacePk(batch, row)}
                                      disabled={
                                        !preparation || Boolean(busyAction)
                                      }
                                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                                      title="Ganti relasi PK, bukan mengedit data PK sumber"
                                    >
                                      <Pencil size={15} />
                                      Ganti PK
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => deleteDebitur(batch, row)}
                                      disabled={
                                        !preparation || Boolean(busyAction)
                                      }
                                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      {busyAction ===
                                      `delete-debitur-${row.id}` ? (
                                        <LoaderCircle
                                          size={15}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Trash2 size={15} />
                                      )}
                                      Hapus debitur
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {row.dokumen_kurang?.length > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                  <b>Dokumen wajib belum ada:</b>{" "}
                                  {row.dokumen_kurang.join(", ")}
                                </div>
                              )}

                              {/* DAFTAR DOKUMEN */}
                              {docs.length === 0 ? (
                                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                                  Belum ada dokumen yang diunggah.
                                </p>
                              ) : (
                                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                  {docs.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 p-3"
                                    >
                                      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                                        <FileText size={18} />
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800">
                                          {doc.jenis_dokumen}
                                        </p>

                                        <p className="truncate text-xs text-slate-500">
                                          {doc.nama_file}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                          {formatBytes(doc.ukuran_bytes)} ·{" "}
                                          {formatDate(doc.created_at)}
                                        </p>

                                        {doc.status && (
                                          <p className="mt-1 text-[11px] text-slate-400">
                                            Status: {doc.status}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex shrink-0 flex-col gap-1">
                                        <button
                                          type="button"
                                          onClick={() => openPreview(doc, row)}
                                          className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100"
                                          title="Preview PDF"
                                          aria-label={`Preview ${doc.nama_file}`}
                                        >
                                          <Eye size={17} />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            deleteDocument(batch, row, doc)
                                          }
                                          disabled={
                                            !preparation || Boolean(busyAction)
                                          }
                                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                          title="Hapus dokumen"
                                          aria-label={`Hapus ${doc.nama_file}`}
                                        >
                                          {busyAction ===
                                          `delete-doc-${doc.id}` ? (
                                            <LoaderCircle
                                              size={17}
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <Trash2 size={17} />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* MODAL PREVIEW PDF */}
      {preview && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden overscroll-none bg-slate-950/80 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Preview dokumen PDF"
          onTouchMove={(event) => {
            if (event.target === event.currentTarget) {
              event.preventDefault();
            }
          }}
        >
          <div className="flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-white shadow-2xl sm:h-[95dvh] sm:max-w-6xl sm:rounded-xl">
            {/* HEADER MODAL */}
            <div className="z-10 flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white p-3 sm:p-4">
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold text-slate-900">
                  {preview.document.jenis_dokumen}
                </h2>
                <p className="truncate text-xs text-slate-500">
                  {preview.debitur.pk?.nama_debitur || "Debitur"} ·{" "}
                  {preview.document.nama_file}
                </p>
              </div>

              <button
                type="button"
                onClick={downloadPreview}
                disabled={!previewUrl}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Unduh</span>
              </button>

              <button
                type="button"
                onClick={closePreview}
                className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Tutup preview"
                aria-label="Tutup preview"
              >
                <X size={20} />
              </button>
            </div>

            {/* AREA PDF YANG BISA DIGULIR */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {previewLoading ? (
                <div className="flex h-full items-center justify-center gap-2 bg-slate-100 text-sm text-slate-600">
                  <LoaderCircle className="animate-spin" size={22} />
                  Mengunduh PDF...
                </div>
              ) : previewError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <AlertTriangle className="text-red-600" size={30} />
                  <p className="text-sm text-red-700">{previewError}</p>
                  <button
                    type="button"
                    onClick={closePreview}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Tutup
                  </button>
                </div>
              ) : previewUrl ? (
                <PdfCanvasViewer
                  key={previewUrl}
                  url={previewUrl}
                  fileName={preview.document.nama_file}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Menyiapkan dokumen...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingBatch && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-batch-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2
              id="edit-batch-title"
              className="text-lg font-bold text-slate-900"
            >
              Edit Nama Batch
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nama ini akan digunakan sebagai nama folder utama dan file ZIP.
            </p>

            <label
              htmlFor="nama-batch"
              className="mt-4 block text-sm font-medium text-slate-700"
            >
              Nama batch
            </label>

            <input
              id="nama-batch"
              type="text"
              value={batchNameInput}
              onChange={(event) => setBatchNameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !savingBatchName) {
                  saveBatchName();
                }
              }}
              maxLength={100}
              autoFocus
              placeholder="Contoh: migrasi10102026"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-xs text-slate-500">
              Maksimal 100 karakter. Nama tidak boleh kosong.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingBatch(null);
                  setBatchNameInput("");
                }}
                disabled={savingBatchName}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={saveBatchName}
                disabled={savingBatchName || !batchNameInput.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingBatchName && (
                  <LoaderCircle size={16} className="animate-spin" />
                )}
                Simpan Nama
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   KOMPONEN RINGKASAN
========================================================= */

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {Number(value || 0).toLocaleString("id-ID")}
      </p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function MiniCount({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-lg font-bold text-slate-900">
        {Number(value || 0).toLocaleString("id-ID")}
      </p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
