"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  X,
  MessageCircle,
  Share2,
  FolderArchive,
  CalendarDays,
  CreditCard,
  LoaderCircle,
} from "lucide-react";
import { useUnit } from "@/components/UnitContext";

const PAGE_SIZE = 10;
const API_BASE = "/api/admin/penyerahan-agunan-lunas";

function formatTanggal(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "-";

  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}/${String(date.getUTCFullYear()).slice(-2)}`;
}

function formatTanggalWaktu(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatNomorBast(item) {
  if (item?.nomor_urut_surat == null || item?.tahun_surat == null) {
    return "-";
  }

  return `${String(item.nomor_urut_surat).padStart(3, "0")}/${item.tahun_surat}`;
}

function formatUkuran(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return "-";

  const size = Number(bytes);

  if (size < 1024) return `${size} byte`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function safeFilename(value) {
  return (
    String(value || "Tanpa Nama")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim()
      .slice(0, 140) || "Tanpa Nama"
  );
}

function filenameFromResponse(response, fallback) {
  const disposition = response.headers.get("Content-Disposition") || "";

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return safeFilename(decodeURIComponent(utf8Match[1]));
    } catch {
      // Gunakan nama biasa bila encoding nama file tidak valid.
    }
  }

  const regularMatch = disposition.match(/filename="?([^";]+)"?/i);

  return safeFilename(regularMatch?.[1] || fallback);
}

async function readJsonResponse(response, fallbackMessage) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
}

function saveBlobToDevice(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = safeFilename(filename);
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

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

          // PDF menyesuaikan lebar layar, maksimal skala 2.
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
      {/* Area scroll khusus PDF */}
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
          <p className="break-words text-sm text-red-700">{error}</p>
          <p className="max-w-lg text-xs text-slate-500">
            Periksa instalasi pdfjs-dist dan file worker PDF.js.
          </p>
        </div>
      )}
    </div>
  );
}

export default function PenyerahanAgunanLunasPage() {
  const { activeUnit } = useUnit();

  const [data, setData] = useState([]);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const [zipLoading, setZipLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [fileAction, setFileAction] = useState(null);
  const [sharing, setSharing] = useState(false);

  const isAdmin = role?.toUpperCase() === "ADMIN";
  const isPreviewOpen = previewLoading || Boolean(previewUrl);

  const loadData = useCallback(async () => {
    if (!activeUnit?.code) {
      setData([]);
      setPagination({
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 0,
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        unitCode: activeUnit.code,
        q: query,
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      const response = await fetch(`${API_BASE}?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await readJsonResponse(
        response,
        "Data serah terima gagal dimuat.",
      );

      setData(result.data ?? []);
      setPagination(
        result.pagination ?? {
          page,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 0,
        },
      );

      if (result.role) setRole(result.role);
    } catch (err) {
      setData([]);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat data.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeUnit?.code, query, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeUnit?.code]);

  // Kunci scroll halaman belakang, tetapi biarkan area PDF menerima sentuhan.

  useEffect(() => {
    if (!isPreviewOpen) return;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyTouchAction: body.style.touchAction,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.touchAction = "none";

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      body.style.touchAction = previous.bodyTouchAction;

      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;

      window.scrollTo(0, scrollY);
    };
  }, [isPreviewOpen]);

  // Lepaskan URL PDF lama ketika preview ditutup atau diganti.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleSearch(event) {
    event.preventDefault();
    const nextQuery = search.trim();

    if (nextQuery === query) {
      if (page !== 1) setPage(1);
      else loadData();
      return;
    }

    setPage(1);
    setQuery(nextQuery);
  }

  function openCreate() {
    window.location.href = "/admin/penyerahan-agunan-lunas/tambah";
  }

  function openEdit(id) {
    // Pastikan halaman edit memang tersedia pada rute ini.
    window.location.href = `/admin/penyerahan-agunan-lunas/${encodeURIComponent(id)}/edit`;
  }

  function toggleSelected(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  const currentPageIds = data.map((item) => item.id);

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.includes(id));

  function toggleSelectCurrentPage() {
    setSelectedIds((current) => {
      if (allCurrentPageSelected) {
        return current.filter((id) => !currentPageIds.includes(id));
      }

      return [...new Set([...current, ...currentPageIds])];
    });
  }

  function closeFileAction() {
    if (!sharing) setFileAction(null);
  }

  async function shareFileToWhatsApp() {
    if (!fileAction || sharing) return;

    const { blob, filename, mimeType } = fileAction;

    const file = new File([blob], filename, {
      type: mimeType || blob.type || "application/octet-stream",
    });

    // Jangan menunggu permintaan jaringan di sini: file sudah disiapkan
    // sebelum dialog ditampilkan, sehingga tombol ini langsung memulai share.
    if (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      setSharing(true);

      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: "Dokumen Serah Terima Agunan JOSJIS",
        });

        setFileAction(null);
      } catch (err) {
        // Pengguna mungkin sengaja menutup menu berbagi.
        if (err?.name !== "AbortError") {
          setError(
            "Berbagi file gagal. Coba lagi atau simpan file ke perangkat.",
          );
        }
      } finally {
        setSharing(false);
      }

      return;
    }

    // Fallback: browser tidak mendukung pengiriman file melalui Web Share API.
    // File diunduh dan WhatsApp dibuka dengan pesan; lampiran perlu dipilih manual.
    saveBlobToDevice(blob, filename);

    const message = `Dokumen ${filename} sudah diunduh. Silakan lampirkan file tersebut di WhatsApp.`;

    setFileAction(null);

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function openDetail(id) {
    setDetail(null);
    setDetailLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await readJsonResponse(
        response,
        "Detail data gagal dimuat.",
      );

      setDetail(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Detail data gagal dimuat.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closePreview() {
    setPreviewUrl("");
    setPreviewName("");
    setPreviewLoading(false);
  }

  async function previewDocument(item) {
    if (!item?.id) return;

    setPreviewUrl("");
    setPreviewName(
      `Serah Terima Agunan - ${safeFilename(item.nama_debitur)}.pdf`,
    );
    setPreviewLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(item.id)}/dokumen?inline=1`,
        { method: "GET", cache: "no-store" },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Dokumen PDF gagal dibuka.");
      }

      const blob = await response.blob();

      if (!blob.size) throw new Error("Dokumen PDF kosong.");

      const pdfBlob =
        blob.type === "application/pdf"
          ? blob
          : new Blob([blob], { type: "application/pdf" });

      setPreviewUrl(URL.createObjectURL(pdfBlob));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Dokumen PDF gagal dibuka.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function downloadDocument(item) {
    if (!item?.id) return;

    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(item.id)}/dokumen`,
        { method: "GET", cache: "no-store" },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Dokumen PDF gagal diunduh.");
      }

      const blob = await response.blob();

      if (!blob.size) throw new Error("Dokumen PDF kosong.");

      const filename = filenameFromResponse(
        response,
        `Serah Terima Agunan - ${safeFilename(item.nama_debitur)}.pdf`,
      );

      setFileAction({
        blob,
        filename,
        mimeType: "application/pdf",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Dokumen PDF gagal diunduh.",
      );
    }
  }

  function downloadPreview() {
    if (!previewUrl) return;

    fetch(previewUrl)
      .then((response) => response.blob())
      .then((blob) => saveBlobToDevice(blob, previewName))
      .catch(() => setError("PDF gagal disiapkan untuk diunduh."));
  }

  async function downloadSelectedZip() {
    if (selectedIds.length === 0) {
      setError("Pilih minimal satu data untuk mengunduh ZIP.");
      return;
    }

    setZipLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "ZIP dokumen gagal dibuat.");
      }

      const blob = await response.blob();

      if (!blob.size) throw new Error("File ZIP yang diterima kosong.");

      const filename = filenameFromResponse(
        response,
        `Kumpulan-Penyerahan-Agunan-Debitur-${new Date()
          .toISOString()
          .slice(0, 10)}.zip`,
      );

      setFileAction({
        blob,
        filename,
        mimeType: "application/zip",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ZIP dokumen gagal dibuat.",
      );
    } finally {
      setZipLoading(false);
    }
  }

  async function deleteRecord(item) {
    if (!isAdmin) {
      setError("Hanya Admin yang dapat menghapus data.");
      return;
    }

    const confirmed = window.confirm(
      `Yakin ingin menghapus data serah terima agunan lunas atas nama ${
        item.nama_debitur || "-"
      }?\n\nTindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(item.id)}`,
        { method: "DELETE", cache: "no-store" },
      );

      const result = await readJsonResponse(response, "Data gagal dihapus.");

      setSelectedIds((current) => current.filter((id) => id !== item.id));

      if (result.storageCleanupWarning) {
        window.alert(
          "Data berhasil dihapus, tetapi file penyimpanan belum berhasil dibersihkan. Hubungi administrator.",
        );
      } else {
        window.alert("Data serah terima berhasil dihapus.");
      }

      if (data.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data gagal dihapus.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSelected() {
    if (!isAdmin) {
      setError("Hanya Admin yang dapat menghapus data.");
      return;
    }

    if (!selectedIds.length) {
      setError("Pilih minimal satu data yang ingin dihapus.");
      return;
    }

    const confirmed = window.confirm(
      `Anda akan menghapus ${selectedIds.length} data serah terima.\n\nPenghapusan tidak dapat dibatalkan. Lanjutkan?`,
    );

    if (!confirmed) return;

    setBulkDeleteLoading(true);
    setError("");

    const idsToDelete = [...selectedIds];
    const deletedIds = [];
    const failed = [];
    let storageWarningCount = 0;

    try {
      for (const id of idsToDelete) {
        try {
          const response = await fetch(
            `${API_BASE}/${encodeURIComponent(id)}`,
            { method: "DELETE", cache: "no-store" },
          );

          const result = await readJsonResponse(
            response,
            "Data gagal dihapus.",
          );

          deletedIds.push(id);

          if (result.storageCleanupWarning) storageWarningCount += 1;
        } catch (err) {
          failed.push({
            id,
            message: err instanceof Error ? err.message : "Penghapusan gagal.",
          });
        }
      }

      setSelectedIds((current) =>
        current.filter((id) => !deletedIds.includes(id)),
      );

      if (deletedIds.length && data.length <= deletedIds.length && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await loadData();
      }

      if (failed.length) {
        setError(
          `${deletedIds.length} data berhasil dihapus, ${failed.length} data gagal. Silakan periksa dan coba kembali.`,
        );
      } else if (storageWarningCount) {
        window.alert(
          `${deletedIds.length} data berhasil dihapus. Pembersihan penyimpanan perlu diperiksa untuk ${storageWarningCount} data.`,
        );
      } else {
        window.alert(`${deletedIds.length} data berhasil dihapus.`);
      }
    } finally {
      setBulkDeleteLoading(false);
    }
  }

  const busy = loading || zipLoading || bulkDeleteLoading;

  return (
    <main className="min-w-0 w-full space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wider text-[#174C40]">
            OPERASIONAL
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            Serah Terima Agunan Lunas
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pencatatan dan pemantauan dokumen penyerahan agunan lunas.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#174C40] px-4 text-sm font-semibold text-white hover:bg-[#10382F] sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Tambah Serah Terima
          </button>
        )}
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">UNIT AKTIF</p>
            <p className="mt-1 break-words font-semibold text-zinc-900">
              {activeUnit?.name ?? "-"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Kode unit: {activeUnit?.code ?? "-"}
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex w-full min-w-0 gap-2 sm:max-w-lg"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama / nomor rekening..."
                aria-label="Cari nama debitur atau nomor rekening"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-2 text-sm outline-none focus:border-[#174C40] focus:bg-white focus:ring-2 focus:ring-[#174C40]/10 sm:pl-10 sm:pr-3"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-10 shrink-0 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              Cari
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              title="Muat ulang"
              aria-label="Muat ulang data"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </form>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Terjadi kesalahan</p>
            <p className="mt-1 break-words">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError("");
                loadData();
              }}
              className="mt-2 font-semibold underline"
            >
              Coba lagi
            </button>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Tutup pesan kesalahan"
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-4 sm:px-5">
          <div>
            <h2 className="font-semibold text-zinc-900">Daftar penyerahan</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {pagination.total} data ditemukan
            </p>
          </div>
          <span className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
            {activeUnit?.value === "JKK1" ? "JKK 1" : "JKK 2"}
          </span>
        </div>

        <div className="space-y-3 border-b border-zinc-100 bg-zinc-50/70 p-3 sm:flex sm:items-center sm:justify-between sm:space-y-0 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectCurrentPage}
              disabled={!data.length || busy}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:border-[#174C40] disabled:opacity-50"
            >
              {allCurrentPageSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {allCurrentPageSelected ? "Batal pilih halaman" : "Pilih halaman"}
            </button>
            <span className="text-xs text-zinc-500">
              {selectedIds.length} dipilih
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs font-semibold text-zinc-500 underline"
              >
                Kosongkan
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={downloadSelectedZip}
              disabled={!selectedIds.length || busy}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#174C40] px-3 text-xs font-semibold text-white hover:bg-[#10382F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {zipLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FolderArchive className="h-4 w-4" />
              )}
              {zipLoading ? "Membuat ZIP..." : "Unduh ZIP"}
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={deleteSelected}
                disabled={!selectedIds.length || busy}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkDeleteLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {bulkDeleteLoading ? "Menghapus..." : "Hapus pilihan"}
              </button>
            )}
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div className="p-12 text-center text-sm text-zinc-500">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
            Memuat data...
          </div>
        ) : data.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="mx-auto mb-3 h-9 w-9 text-zinc-300" />
            <p className="font-semibold text-zinc-700">
              Belum ada data penyerahan
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Data akan muncul setelah penyerahan disimpan.
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#174C40] px-4 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Tambah Data Pertama
              </button>
            )}
          </div>
        ) : (
          <>
            {/* MOBILE */}
            <div className="divide-y divide-zinc-100 sm:hidden">
              {data.map((item, index) => (
                <article key={item.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelected(item.id)}
                      aria-label={`Pilih data ${item.nama_debitur || ""}`}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#174C40]"
                    />

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openDetail(item.id)}
                        className="block w-full text-left"
                      >
                        <span className="block break-words text-sm font-bold text-zinc-900">
                          {item.nama_debitur || "-"}
                        </span>
                      </button>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          BAST {formatNomorBast(item)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatTanggal(item.tanggal_penyerahan)}
                        </span>
                      </div>

                      <div className="mt-2 flex min-w-0 items-start gap-1.5 text-xs text-zinc-500">
                        <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="break-all">
                          {item.nomor_rekening_pinjaman || "-"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <IconButton
                            label={`Detail ${item.nama_debitur}`}
                            onClick={() => openDetail(item.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </IconButton>

                          <IconButton
                            label={`Preview PDF ${item.nama_debitur}`}
                            onClick={() => previewDocument(item)}
                            disabled={previewLoading}
                          >
                            <FileText className="h-4 w-4" />
                          </IconButton>

                          <IconButton
                            label={`Unduh PDF ${item.nama_debitur}`}
                            onClick={() => downloadDocument(item)}
                          >
                            <Download className="h-4 w-4" />
                          </IconButton>

                          {isAdmin && (
                            <>
                              <IconButton
                                label={`Edit ${item.nama_debitur}`}
                                onClick={() => openEdit(item.id)}
                                className="text-blue-700 hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </IconButton>

                              <IconButton
                                label={`Hapus ${item.nama_debitur}`}
                                onClick={() => deleteRecord(item)}
                                disabled={busy}
                                className="text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </IconButton>
                            </>
                          )}
                        </div>

                        <span className="shrink-0 text-[10px] text-zinc-400">
                          #{(page - 1) * PAGE_SIZE + index + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* DESKTOP */}
            <div className="hidden w-full overflow-x-auto sm:block">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="w-12 px-4 py-4">
                      <span className="sr-only">Pilih</span>
                    </th>
                    <th className="px-4 py-4 font-semibold">No.</th>
                    <th className="px-4 py-4 font-semibold">Nomor BAST</th>
                    <th className="px-4 py-4 font-semibold">Nama Debitur</th>
                    <th className="px-4 py-4 font-semibold">Tanggal</th>
                    <th className="px-4 py-4 font-semibold">Dokumen</th>
                    <th className="px-4 py-4 font-semibold">Nomor Rekening</th>
                    <th className="px-4 py-4 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {data.map((item, index) => (
                    <tr key={item.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          aria-label={`Pilih ${item.nama_debitur || ""}`}
                          className="h-4 w-4 accent-[#174C40]"
                        />
                      </td>
                      <td className="px-4 py-4 text-zinc-500">
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-[#174C40]">
                        {formatNomorBast(item)}
                      </td>
                      <td className="max-w-[230px] px-4 py-4">
                        <button
                          type="button"
                          onClick={() => openDetail(item.id)}
                          className="break-words text-left font-semibold text-zinc-900 hover:text-[#174C40]"
                        >
                          {item.nama_debitur || "-"}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-zinc-600">
                        {formatTanggal(item.tanggal_penyerahan)}
                      </td>
                      <td className="max-w-[210px] px-4 py-4">
                        <div
                          className="flex items-center gap-2 truncate text-zinc-600"
                          title={item.nama_file_asli || "Dokumen penyerahan"}
                        >
                          <FileText className="h-4 w-4 shrink-0 text-[#174C40]" />
                          <span className="truncate">
                            {item.nama_file_asli || "Dokumen penyerahan"}
                          </span>
                        </div>
                      </td>
                      <td className="break-all px-4 py-4 text-zinc-600">
                        {item.nomor_rekening_pinjaman || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1.5">
                          <IconButton
                            label={`Detail ${item.nama_debitur}`}
                            onClick={() => openDetail(item.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            label={`Preview ${item.nama_debitur}`}
                            onClick={() => previewDocument(item)}
                            disabled={previewLoading}
                          >
                            <FileText className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            label={`Unduh ${item.nama_debitur}`}
                            onClick={() => downloadDocument(item)}
                          >
                            <Download className="h-4 w-4" />
                          </IconButton>

                          {isAdmin && (
                            <>
                              <IconButton
                                label={`Edit ${item.nama_debitur}`}
                                onClick={() => openEdit(item.id)}
                                className="text-blue-700 hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label={`Hapus ${item.nama_debitur}`}
                                onClick={() => deleteRecord(item)}
                                disabled={busy}
                                className="text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </IconButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-zinc-100 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-zinc-500">
            Halaman {pagination.totalPages === 0 ? 0 : page} dari{" "}
            {pagination.totalPages}
          </p>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs disabled:opacity-40 sm:text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </button>

            <button
              type="button"
              disabled={
                loading ||
                pagination.totalPages === 0 ||
                page >= pagination.totalPages
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.totalPages, current + 1),
                )
              }
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs disabled:opacity-40 sm:text-sm"
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* DETAIL */}
      {(detailLoading || detail) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/50 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !detailLoading) {
              setDetail(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            className="my-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-4 sm:px-6">
              <div>
                <h2
                  id="detail-title"
                  className="font-bold text-zinc-900 sm:text-lg"
                >
                  Detail Serah Terima
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Informasi dokumen penyerahan agunan lunas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                disabled={detailLoading}
                aria-label="Tutup detail"
                className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-sm text-zinc-500">
                <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
                Memuat detail...
              </div>
            ) : detail ? (
              <>
                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6">
                  <DetailField
                    label="Nama Debitur"
                    value={detail.nama_debitur}
                  />
                  <DetailField
                    label="Nomor BAST"
                    value={formatNomorBast(detail)}
                  />
                  <DetailField
                    label="Nomor Rekening Pinjaman"
                    value={detail.nomor_rekening_pinjaman}
                  />
                  <DetailField
                    label="Tanggal Penyerahan"
                    value={formatTanggal(detail.tanggal_penyerahan)}
                  />
                  <DetailField
                    label="Tahun Surat Keluar"
                    value={detail.tahun_surat}
                  />
                  <DetailField
                    label="Nomor Urut Surat"
                    value={detail.nomor_urut_surat}
                  />
                  <DetailField
                    label="Nama File"
                    value={detail.nama_file_asli}
                    wide
                  />
                  <DetailField
                    label="Ukuran File"
                    value={formatUkuran(detail.ukuran_file_bytes)}
                  />
                  <DetailField
                    label="Tipe File"
                    value={detail.tipe_file_asli}
                  />
                  <DetailField
                    label="Dibuat Pada"
                    value={formatTanggalWaktu(detail.created_at)}
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 p-4 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={() => setDetail(null)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => previewDocument(detail)}
                    disabled={previewLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#174C40]/30 px-4 text-sm font-semibold text-[#174C40] disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                    Preview PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadDocument(detail)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#174C40] px-4 text-sm font-semibold text-white"
                  >
                    <Download className="h-4 w-4" />
                    Unduh PDF
                  </button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}

      {/* PREVIEW PDF: scroll layar belakang terkunci, area PDF tetap menerima sentuhan */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-[60] overflow-hidden overscroll-none bg-black/75"
          style={{ height: "100dvh" }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Preview dokumen PDF"
            className="absolute inset-0 mx-auto flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:inset-y-3 sm:h-auto sm:max-h-none sm:max-w-6xl sm:rounded-2xl"
          >
            <div className="z-10 flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-[#174C40]" />
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900">Preview PDF</p>
                  <p className="max-w-[55vw] truncate text-xs text-zinc-500">
                    {previewName}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {previewUrl && (
                  <button
                    type="button"
                    onClick={downloadPreview}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#174C40] px-3 text-xs font-semibold text-white"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Unduh</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={closePreview}
                  aria-label="Tutup preview PDF"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              {previewLoading ? (
                <div className="flex h-full items-center justify-center gap-2 bg-slate-100 text-sm text-slate-600">
                  <LoaderCircle size={22} className="animate-spin" />
                  Mengunduh PDF...
                </div>
              ) : previewUrl ? (
                <PdfCanvasViewer
                  key={previewUrl}
                  url={previewUrl}
                  fileName={previewName}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Menyiapkan dokumen...
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* PILIH SIMPAN ATAU BAGIKAN PDF/ZIP */}
      {fileAction && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto overscroll-contain bg-black/60 p-3 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeFileAction();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-action-title"
            className="my-auto w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="file-action-title"
                  className="text-lg font-bold text-zinc-900"
                >
                  Simpan atau kirim file
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Pilih tindakan untuk dokumen ini.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFileAction}
                disabled={sharing}
                aria-label="Tutup pilihan file"
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
              {fileAction.mimeType === "application/zip" ? (
                <FolderArchive className="h-7 w-7 shrink-0 text-[#174C40]" />
              ) : (
                <FileText className="h-7 w-7 shrink-0 text-red-600" />
              )}
              <p className="break-words text-sm font-medium text-zinc-800">
                {fileAction.filename}
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  saveBlobToDevice(fileAction.blob, fileAction.filename);
                  setFileAction(null);
                }}
                disabled={sharing}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#174C40] px-4 py-3 text-sm font-semibold text-white hover:bg-[#10382F] disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Simpan ke perangkat
              </button>

              <button
                type="button"
                onClick={shareFileToWhatsApp}
                disabled={sharing}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {sharing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                {sharing ? "Membuka menu berbagi..." : "Kirim melalui WhatsApp"}
              </button>

              <button
                type="button"
                onClick={() => setFileAction(null)}
                disabled={sharing}
                className="min-h-10 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Batal
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Jika perangkat mendukung berbagi file, pilih WhatsApp dari menu
              berbagi yang muncul. Jika tidak, file akan disimpan dan WhatsApp
              dibuka agar kamu dapat melampirkannya secara manual.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

function IconButton({
  label,
  onClick,
  disabled = false,
  className = "",
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:border-[#174C40] hover:text-[#174C40] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function DetailField({ label, value, wide = false }) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-zinc-100 bg-zinc-50 p-3 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-zinc-900">
        {value == null || value === "" ? "-" : String(value)}
      </p>
    </div>
  );
}
