"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileUp,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

const MAX_PDF_BYTES = 2 * 1024 * 1024;

const REQUIRED_BY_PRODUCT = {
  KUR: ["PK", "Polis Penjaminan", "Form Aplikasi"],
  KUM: ["PK", "Form Aplikasi"],
};

const EXTRA_DOCUMENTS = [
  "IDEB Debitur",
  "IDEB Pasangan",
  "Sertifikat Hak Milik",
  "APHT",
  "SKMHT",
  "Covernote Notaris",
  "Agunan",
  "Moral Obligasi",
];

function safeName(value) {
  return String(value || "dokumen")
    .normalize("NFKD")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 90);
}

function formatBytes(bytes) {
  const size = Number(bytes || 0);

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeProduk(value) {
  const produk = String(value ?? "")
    .trim()
    .toUpperCase();

  if (produk === "KUR" || produk.includes("KREDIT USAHA RAKYAT")) {
    return "KUR";
  }

  if (produk === "KUM" || produk.includes("KREDIT USAHA MIKRO")) {
    return "KUM";
  }

  return "";
}

function getProdukAsli(row) {
  return normalizeProduk(
    row?.pk?.jenis_pengajuan_kredit ?? row?.jenis_pengajuan_kredit,
  );
}

function newSlotId() {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDocumentId(doc) {
  return doc?.id ? String(doc.id) : "";
}

function getDocumentOwnerId(doc) {
  return String(doc?.migrasi_debitur_id || "");
}

function getDocumentType(doc) {
  return String(doc?.jenis_dokumen || "");
}

function getDocumentName(doc) {
  return String(doc?.nama_file || "dokumen.pdf");
}

function getDocumentSize(doc) {
  return Number(doc?.ukuran_bytes ?? doc?.size ?? 0);
}

function isDocumentActive(doc) {
  return String(doc?.status || "TERSIMPAN").toUpperCase() !== "DIHAPUS";
}

function sortDocumentsNewestFirst(items) {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime(),
  );
}

async function readApiResponse(response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.error || "Permintaan ke server gagal.");
  }

  return result;
}

/* =========================================================
   KOMPRESI PDF
   Worker PDF.js harus tersedia di public/pdf.worker.mjs.
   ========================================================= */

async function compressPdfToLimit(file, maxBytes = MAX_PDF_BYTES) {
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("File harus berformat PDF.");
  }

  if (!file.size) {
    throw new Error("File PDF kosong.");
  }

  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { jsPDF } = await import("jspdf");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

  const source = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(source),
    isEvalSupported: false,
  });

  let pdf = null;
  let lastBlob = null;

  const attempts = [
    { scale: 1.45, quality: 0.78 },
    { scale: 1.25, quality: 0.7 },
    { scale: 1.08, quality: 0.63 },
    { scale: 0.92, quality: 0.56 },
    { scale: 0.78, quality: 0.49 },
  ];

  try {
    pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;

    for (const attempt of attempts) {
      let output = null;

      for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
        const page = await pdf.getPage(pageNo);
        const baseViewport = page.getViewport({ scale: 1 });

        const scale = Math.min(
          attempt.scale,
          1800 / Math.max(baseViewport.width, baseViewport.height),
        );

        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");

        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        try {
          const context = canvas.getContext("2d", {
            alpha: false,
          });

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

          const imageData = canvas.toDataURL("image/jpeg", attempt.quality);

          const orientation =
            viewport.width >= viewport.height ? "landscape" : "portrait";

          if (!output) {
            output = new jsPDF({
              orientation,
              unit: "pt",
              format: [viewport.width, viewport.height],
              compress: true,
            });
          } else {
            output.addPage([viewport.width, viewport.height], orientation);
          }

          output.addImage(
            imageData,
            "JPEG",
            0,
            0,
            viewport.width,
            viewport.height,
            undefined,
            "FAST",
          );
        } finally {
          canvas.width = 1;
          canvas.height = 1;

          try {
            page.cleanup();
          } catch {
            // Abaikan kegagalan cleanup.
          }
        }
      }

      lastBlob = new Blob([output.output("arraybuffer")], {
        type: "application/pdf",
      });

      if (lastBlob.size <= maxBytes) {
        return {
          blob: lastBlob,
          originalSize: file.size,
          compressedSize: lastBlob.size,
          pages: pageCount,
        };
      }
    }
  } finally {
    try {
      await loadingTask.destroy();
    } catch {
      // Jangan menutupi error utama kompresi.
    }
  }

  throw new Error(
    `PDF masih ${formatBytes(lastBlob?.size || file.size)} setelah kompresi. ` +
      "Batas maksimal 2 MB. Coba pecah PDF menjadi beberapa file " +
      "atau gunakan hasil scan yang lebih ringan.",
  );
}

/* =========================================================
   TOMBOL
   ========================================================= */

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
}) {
  const styles =
    variant === "secondary"
      ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      : variant === "danger"
        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "bg-emerald-700 text-white hover:bg-emerald-800";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles}`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   HALAMAN PERSIAPAN MIGRASI
   ========================================================= */

export default function PersiapanMigrasiPage() {
  const router = useRouter();

  const [payload, setPayload] = useState(null);
  const [debitur, setDebitur] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [products, setProducts] = useState({});
  const [documents, setDocuments] = useState([]);
  const [extraSlots, setExtraSlots] = useState({});
  const [extraChoice, setExtraChoice] = useState({});

  const [busyKey, setBusyKey] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const [notice, setNotice] = useState({
    type: "",
    message: "",
  });

  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const fileInputs = useRef({});
  const previewUrlRef = useRef("");
  const previewRequestRef = useRef(0);

  const rows = useMemo(
    () =>
      debitur.map((row, index) => ({
        ...row,
        _id: String(row.id ?? row.noPk ?? index),
        _debiturId: String(row.migrasi_debitur_id || ""),
      })),
    [debitur],
  );

  const chosenRows = useMemo(
    () => rows.filter((row) => selectedIds.includes(row._id)),
    [rows, selectedIds],
  );

  const loadDocuments = useCallback(async (batchId) => {
    if (!batchId) {
      throw new Error(
        "ID batch migrasi tidak ditemukan. Kembali ke halaman Migrasi dan buat persiapan baru.",
      );
    }

    const response = await fetch(
      `/api/admin/migrasi/dokumen?batch_id=${encodeURIComponent(batchId)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const result = await readApiResponse(response);

    const loaded = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.documents)
        ? result.documents
        : Array.isArray(result.dokumen)
          ? result.dokumen
          : [];

    const activeDocuments = loaded.filter(isDocumentActive);
    setDocuments(activeDocuments);

    return activeDocuments;
  }, []);

  /* =======================================================
     TUTUP PREVIEW DAN BERSIHKAN OBJECT URL
     ======================================================= */

  const closePreview = useCallback(() => {
    previewRequestRef.current += 1;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    setPreviewUrl("");
    setPreviewDoc(null);
    setPreviewError("");
    setPreviewLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  /* Tombol Escape menutup modal. */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closePreview();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePreview]);

  /* Kunci scroll halaman utama selama modal preview terbuka. */
  useEffect(() => {
    if (!previewDoc) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverscroll =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
    };
  }, [previewDoc]);

  /* =======================================================
     MUAT DATA BATCH, DEBITUR, DAN DOKUMEN
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const raw = sessionStorage.getItem("josjis_persiapan_migrasi");

        if (!raw) {
          if (!cancelled) {
            setNotice({
              type: "error",
              message:
                "Data persiapan tidak ditemukan. Kembali ke halaman Migrasi dan pilih debitur terlebih dahulu.",
            });
          }

          return;
        }

        const parsed = JSON.parse(raw);
        const batchId = parsed.batch_id;

        const selectedDebitur = Array.isArray(parsed.debitur)
          ? parsed.debitur
          : [];

        if (!batchId || !selectedDebitur.length) {
          throw new Error(
            "Data batch atau debitur tidak lengkap. Silakan mulai kembali dari halaman Migrasi.",
          );
        }

        const monitoringResponse = await fetch(
          `/api/admin/migrasi/monitoring?batch_id=${encodeURIComponent(batchId)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const monitoringResult = await readApiResponse(monitoringResponse);

        const monitoringBatch = monitoringResult.data?.[0];

        if (!monitoringBatch) {
          throw new Error("Data batch tidak ditemukan di Monitoring Migrasi.");
        }

        const monitoringDebitur = Array.isArray(monitoringBatch.debitur)
          ? monitoringBatch.debitur
          : [];

        const currentDebitur = monitoringDebitur.map((relation) => {
          const selected = selectedDebitur.find(
            (item) => String(item.pk_id ?? item.id) === String(relation.pk_id),
          );

          const pk = relation.pk ?? {};

          return {
            ...selected,
            id: relation.id,
            migrasi_debitur_id: relation.id,
            pk_id: relation.pk_id,
            pk,
            nama: pk.nama_debitur ?? selected?.nama ?? "",
            noPk: pk.nomor_pk ?? selected?.noPk ?? "",
            cif: pk.cif ?? selected?.cif ?? "",
            limit: pk.limit_kredit ?? selected?.limit ?? null,
            jenis_pengajuan_kredit: pk.jenis_pengajuan_kredit ?? "",
          };
        });

        if (!currentDebitur.length) {
          throw new Error("Belum ada debitur di batch migrasi ini.");
        }

        if (cancelled) return;

        setPayload(parsed);
        setDebitur(currentDebitur);
        setSelectedIds(currentDebitur.map((row) => String(row.id)));

        const initialProducts = {};

        currentDebitur.forEach((row) => {
          initialProducts[String(row.id)] = getProdukAsli(row);
        });

        setProducts(initialProducts);
        setLoadingDocuments(true);

        const loadedDocuments = await loadDocuments(batchId);

        if (cancelled) return;

        const initialSlots = {};

        for (const row of currentDebitur) {
          const pkId = String(row.id || "");
          const relationId = String(row.migrasi_debitur_id || "");

          initialSlots[pkId] = loadedDocuments
            .filter(
              (doc) =>
                getDocumentOwnerId(doc) === relationId &&
                EXTRA_DOCUMENTS.includes(getDocumentType(doc)),
            )
            .map((doc) => ({
              slotId: `doc-${getDocumentId(doc)}`,
              name: getDocumentType(doc),
              documentId: getDocumentId(doc),
            }));
        }

        setExtraSlots(initialSlots);
      } catch (error) {
        if (!cancelled) {
          setNotice({
            type: "error",
            message: error?.message || "Data persiapan migrasi gagal dimuat.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingDocuments(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadDocuments]);

  /* =======================================================
     HELPER DOKUMEN
     ======================================================= */

  const getRequiredNames = useCallback(
    (pkId) => REQUIRED_BY_PRODUCT[products[pkId]] || [],
    [products],
  );

  const getSlots = useCallback((pkId) => extraSlots[pkId] || [], [extraSlots]);

  const getDocumentsFor = useCallback(
    (row, docName) =>
      sortDocumentsNewestFirst(
        documents.filter(
          (doc) =>
            getDocumentOwnerId(doc) === row._debiturId &&
            getDocumentType(doc) === docName &&
            isDocumentActive(doc),
        ),
      ),
    [documents],
  );

  const addExtraDoc = (pkId) => {
    const choice = extraChoice[pkId];

    if (!choice) return;

    setExtraSlots((previous) => ({
      ...previous,
      [pkId]: [
        ...(previous[pkId] || []),
        {
          slotId: newSlotId(),
          name: choice,
          documentId: "",
        },
      ],
    }));

    setExtraChoice((previous) => ({
      ...previous,
      [pkId]: "",
    }));
  };

  const removeEmptySlot = (pkId, slotId) => {
    setExtraSlots((previous) => ({
      ...previous,
      [pkId]: (previous[pkId] || []).filter((slot) => slot.slotId !== slotId),
    }));
  };

  /* =======================================================
     UPLOAD PDF
     ======================================================= */

  const handleUpload = async (row, docName, file, slot = null) => {
    if (!file) return;

    if (!row._debiturId) {
      setNotice({
        type: "error",
        message:
          "Relasi debitur migrasi tidak ditemukan. Kembali ke halaman Migrasi dan buat batch baru.",
      });

      return;
    }

    const busyId = slot?.slotId || `${row._id}::${docName}`;

    setBusyKey(busyId);
    setNotice({ type: "", message: "" });

    try {
      const compressed = await compressPdfToLimit(file);

      if (compressed.compressedSize > MAX_PDF_BYTES) {
        throw new Error("PDF hasil kompresi masih melebihi batas 2 MB.");
      }

      const baseName = file.name.replace(/\.pdf$/i, "");

      const outputFile = new File(
        [compressed.blob],
        `${safeName(baseName)}_compressed.pdf`,
        {
          type: "application/pdf",
          lastModified: Date.now(),
        },
      );

      const formData = new FormData();

      formData.append("file", outputFile);
      formData.append("migrasi_debitur_id", row._debiturId);
      formData.append("jenis_dokumen", docName);

      const response = await fetch("/api/admin/migrasi/dokumen", {
        method: "POST",
        body: formData,
      });

      await readApiResponse(response);

      const latestDocuments = await loadDocuments(payload?.batch_id);

      if (slot) {
        const latest = sortDocumentsNewestFirst(
          latestDocuments.filter(
            (doc) =>
              getDocumentOwnerId(doc) === row._debiturId &&
              getDocumentType(doc) === docName,
          ),
        )[0];

        if (latest) {
          setExtraSlots((previous) => {
            const current = previous[row._id] || [];

            const existingSlot = current.find(
              (item) => item.slotId === slot.slotId,
            );

            if (existingSlot?.documentId) {
              return {
                ...previous,
                [row._id]: [
                  ...current,
                  {
                    slotId: `doc-${getDocumentId(latest)}`,
                    name: docName,
                    documentId: getDocumentId(latest),
                  },
                ],
              };
            }

            return {
              ...previous,
              [row._id]: current.map((item) =>
                item.slotId === slot.slotId
                  ? {
                      ...item,
                      documentId: getDocumentId(latest),
                    }
                  : item,
              ),
            };
          });
        }
      }

      setNotice({
        type: "success",
        message:
          `${docName} berhasil disimpan di Supabase. ` +
          `Ukuran awal ${formatBytes(compressed.originalSize)}, ` +
          `hasil kompresi ${formatBytes(compressed.compressedSize)}.`,
      });
    } catch (error) {
      console.error("Gagal upload PDF:", error);

      setNotice({
        type: "error",
        message: error?.message || "Gagal memproses atau mengunggah PDF.",
      });
    } finally {
      setBusyKey("");

      if (fileInputs.current[busyId]) {
        fileInputs.current[busyId].value = "";
      }
    }
  };

  /* =======================================================
     AMBIL FILE PDF UNTUK PREVIEW
     ======================================================= */

  const handlePreviewDoc = async (doc) => {
    const documentId = getDocumentId(doc);

    if (!documentId) {
      setNotice({
        type: "error",
        message: "ID dokumen tidak ditemukan.",
      });

      return;
    }

    const requestId = ++previewRequestRef.current;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    setPreviewUrl("");
    setPreviewDoc(doc);
    setPreviewError("");
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

        throw new Error(result.error || "Gagal memuat preview PDF.");
      }

      const responseBlob = await response.blob();

      if (!responseBlob.size) {
        throw new Error("File PDF kosong atau tidak dapat dibaca.");
      }

      const pdfBlob = new Blob([responseBlob], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(pdfBlob);

      if (requestId !== previewRequestRef.current) {
        URL.revokeObjectURL(url);
        return;
      }

      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (error) {
      if (requestId === previewRequestRef.current) {
        setPreviewError(error?.message || "Gagal membuka preview PDF.");
      }
    } finally {
      if (requestId === previewRequestRef.current) {
        setPreviewLoading(false);
      }
    }
  };

  /* =======================================================
     HAPUS DOKUMEN
     ======================================================= */

  const handleDeleteDoc = async (doc) => {
    const documentId = getDocumentId(doc);

    if (!documentId) {
      setNotice({
        type: "error",
        message: "ID dokumen tidak ditemukan.",
      });

      return;
    }

    const confirmed = window.confirm(
      `Hapus dokumen "${getDocumentName(doc)}"?`,
    );

    if (!confirmed) return;

    setDeletingId(documentId);
    setNotice({ type: "", message: "" });

    try {
      const response = await fetch(
        `/api/admin/migrasi/dokumen?id=${encodeURIComponent(documentId)}`,
        {
          method: "DELETE",
          cache: "no-store",
        },
      );

      await readApiResponse(response);

      await loadDocuments(payload?.batch_id);

      setExtraSlots((previous) => {
        const updated = {};

        for (const [pkId, slots] of Object.entries(previous)) {
          updated[pkId] = slots.map((slot) =>
            slot.documentId === documentId ? { ...slot, documentId: "" } : slot,
          );
        }

        return updated;
      });

      if (getDocumentId(previewDoc) === documentId) {
        closePreview();
      }

      setNotice({
        type: "success",
        message: "Dokumen berhasil dihapus.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error?.message ||
          "Gagal menghapus dokumen. Periksa dukungan DELETE pada API.",
      });
    } finally {
      setDeletingId("");
    }
  };

  /* =======================================================
     TAMPILAN SAAT DATA BELUM TERSEDIA
     ======================================================= */

  if (!payload && !debitur.length) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <ActionButton
          variant="secondary"
          onClick={() => router.push("/admin/migrasi")}
        >
          <ArrowLeft size={16} />
          Kembali ke Migrasi
        </ActionButton>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Data persiapan migrasi belum tersedia. Kembali ke halaman Migrasi,
          pilih debitur, lalu klik <b>Persiapan Migrasi</b>.
        </div>

        {notice.message && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {notice.message}
          </p>
        )}
      </main>
    );
  }

  /* =======================================================
     TAMPILAN UTAMA
     ======================================================= */

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/migrasi")}
            className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Kembali ke Migrasi
          </button>

          <h1 className="text-2xl font-bold text-slate-900">
            Persiapan Dokumen Migrasi
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Unit: <b>{payload?.unit || "-"}</b> · Dokumen disimpan di Supabase
            Storage.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <b>Catatan kompresi:</b> setiap PDF diproses agar maksimal 2 MB. Untuk
        mengecilkan ukuran, halaman PDF dirender menjadi gambar sehingga teks
        hasil kompresi tidak lagi bisa diseleksi atau dicari. Periksa
        keterbacaan sebelum dipakai sebagai dokumen resmi. Jika PDF tetap lebih
        dari 2 MB, coba pecah PDF menjadi beberapa file atau gunakan hasil scan
        yang lebih ringan.
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <b>Dokumen berulang:</b> Sertifikat Hak Milik, SKMHT, IDEB Debitur, dan
        IDEB Pasangan dapat ditambahkan lebih dari satu kali. Setiap PDF
        disimpan sebagai dokumen terpisah. Menghapus slot kosong hanya
        menghilangkan slot dari tampilan, bukan menghapus dokumen di server.
      </div>

      {loadingDocuments && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <LoaderCircle className="animate-spin" size={17} />
          Memuat daftar dokumen dari Supabase...
        </div>
      )}

      {notice.message && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.type === "error" ? (
            <X size={17} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          )}

          <span>{notice.message}</span>

          <button
            type="button"
            className="ml-auto"
            onClick={() => setNotice({ type: "", message: "" })}
            aria-label="Tutup pemberitahuan"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div className="text-sm text-slate-700">
          <b>{chosenRows.length}</b> dari {rows.length} debitur dipilih.
        </div>

        <div className="flex gap-2">
          <ActionButton
            variant="secondary"
            onClick={() => setSelectedIds(rows.map((row) => row._id))}
          >
            Pilih semua
          </ActionButton>

          <ActionButton variant="secondary" onClick={() => setSelectedIds([])}>
            Kosongkan pilihan
          </ActionButton>
        </div>
      </div>

      <div className="space-y-5">
        {rows.map((row) => {
          const isSelected = selectedIds.includes(row._id);
          const requiredNames = getRequiredNames(row._id);
          const slots = getSlots(row._id);
          const masterProduct = getProdukAsli(row);
          const validMasterProduct = Boolean(masterProduct);
          const pkNumber = String(row.noPk || "").toUpperCase();

          const numberSuggestsOtherProduct =
            (pkNumber.includes("KUR") && masterProduct === "KUM") ||
            (pkNumber.includes("KUM") && masterProduct === "KUR");

          return (
            <section
              key={row._id}
              className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                isSelected
                  ? "border-emerald-300"
                  : "border-slate-200 opacity-80"
              }`}
            >
              <div className="flex flex-col gap-3 border-b bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) =>
                      setSelectedIds((previous) =>
                        event.target.checked
                          ? [...new Set([...previous, row._id])]
                          : previous.filter((id) => id !== row._id),
                      )
                    }
                    className="mt-1 h-4 w-4 accent-emerald-700"
                    aria-label={`Pilih ${row.nama || row.noPk}`}
                  />

                  <div>
                    <h2 className="font-bold text-slate-900">
                      {row.nama || "Nama debitur belum diisi"}
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      No. PK: {row.noPk || "-"} · CIF: {row.cif || "-"} · Limit:{" "}
                      {row.limit != null
                        ? `Rp ${Number(row.limit).toLocaleString("id-ID")}`
                        : "-"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Produk master:{" "}
                      <b>
                        {validMasterProduct
                          ? masterProduct
                          : "Belum ditentukan"}
                      </b>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Produk PK
                  </span>

                  <span
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      products[row._id]
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {products[row._id] || "Perlu diperiksa"}
                  </span>
                </div>
              </div>

              {numberSuggestsOtherProduct && (
                <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                  <b>Periksa jenis produk:</b> nomor PK tampak berbeda dari
                  jenis pengajuan di data master. Pastikan jenis produk dan
                  dokumen wajib benar sebelum melanjutkan.
                </div>
              )}

              <div className="space-y-4 p-4">
                {!products[row._id] ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Produk master belum dikenali sebagai KUR atau KUM. Periksa
                    data produk terlebih dahulu.
                  </p>
                ) : (
                  <>
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-slate-800">
                        Dokumen wajib
                      </h3>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {requiredNames.map((docName) => {
                          const existingDocs = getDocumentsFor(row, docName);
                          const busyId = `${row._id}::${docName}`;

                          return (
                            <DocumentCard
                              key={docName}
                              docName={docName}
                              documents={existingDocs}
                              busy={busyKey === busyId}
                              deletingId={deletingId}
                              inputRef={(element) => {
                                fileInputs.current[busyId] = element;
                              }}
                              onUpload={(file) =>
                                handleUpload(row, docName, file)
                              }
                              onPreview={handlePreviewDoc}
                              onDelete={handleDeleteDoc}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-bold text-slate-800">
                        Dokumen tambahan
                      </h3>

                      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                        <select
                          value={extraChoice[row._id] || ""}
                          onChange={(event) =>
                            setExtraChoice((previous) => ({
                              ...previous,
                              [row._id]: event.target.value,
                            }))
                          }
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Pilih dokumen tambahan...</option>

                          {EXTRA_DOCUMENTS.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>

                        <ActionButton
                          variant="secondary"
                          onClick={() => addExtraDoc(row._id)}
                          disabled={!extraChoice[row._id]}
                        >
                          <Plus size={16} />
                          Tambah dokumen
                        </ActionButton>
                      </div>

                      {slots.length ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {slots.map((slot) => {
                            const slotDocument = documents.find(
                              (doc) =>
                                getDocumentId(doc) === slot.documentId &&
                                getDocumentOwnerId(doc) === row._debiturId,
                            );

                            return (
                              <div key={slot.slotId} className="relative">
                                <DocumentCard
                                  docName={slot.name}
                                  documents={slotDocument ? [slotDocument] : []}
                                  busy={busyKey === slot.slotId}
                                  deletingId={deletingId}
                                  inputRef={(element) => {
                                    fileInputs.current[slot.slotId] = element;
                                  }}
                                  onUpload={(file) =>
                                    handleUpload(row, slot.name, file, slot)
                                  }
                                  onPreview={handlePreviewDoc}
                                  onDelete={handleDeleteDoc}
                                />

                                {!slot.documentId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeEmptySlot(row._id, slot.slotId)
                                    }
                                    className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    title="Hapus slot kosong"
                                    aria-label={`Hapus slot kosong ${slot.name}`}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Belum ada dokumen tambahan. Kamu dapat menambahkan
                          beberapa dokumen dengan kategori yang sama.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* =====================================================
          MODAL PREVIEW PDF
          ===================================================== */}

      {previewDoc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/70 p-2 sm:p-5"
          onClick={closePreview}
          style={{
            overscrollBehavior: "none",
            touchAction: "pan-y",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${getDocumentName(previewDoc)}`}
            className="flex h-[92dvh] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">
                  Preview Dokumen PDF
                </h2>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {getDocumentName(previewDoc)}
                </p>
              </div>

              <button
                type="button"
                onClick={closePreview}
                className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Tutup preview"
                title="Tutup preview"
              >
                <X size={20} />
              </button>
            </div>

            {/* Viewer mengisi ruang di antara header dan footer */}
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-200">
              {previewLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white">
                  <LoaderCircle
                    size={32}
                    className="animate-spin text-emerald-700"
                  />

                  <p className="text-sm text-slate-600">
                    Memuat dokumen PDF...
                  </p>
                </div>
              )}

              {previewError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center">
                  <p className="text-sm text-red-700">{previewError}</p>

                  <ActionButton variant="secondary" onClick={closePreview}>
                    Tutup
                  </ActionButton>
                </div>
              )}

              {!previewLoading && !previewError && previewUrl && (
                <PdfJsViewer key={previewUrl} url={previewUrl} />
              )}
            </div>

            {/* Footer modal */}
            <div className="flex shrink-0 justify-end border-t border-slate-200 px-4 py-3">
              <ActionButton variant="secondary" onClick={closePreview}>
                <X size={16} />
                Tutup Preview
              </ActionButton>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   KARTU DOKUMEN
   ========================================================= */

function DocumentCard({
  docName,
  documents,
  busy,
  deletingId,
  inputRef,
  onUpload,
  onPreview,
  onDelete,
}) {
  const inputId = useRef(
    `upload-${safeName(docName)}-${Math.random().toString(36).slice(2, 8)}`,
  ).current;

  const latest = documents?.[0] || null;
  const uploadedCount = documents?.length || 0;

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-3 flex items-start gap-2">
        <div
          className={`rounded-lg p-2 ${
            uploadedCount
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <FileCheck2 size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{docName}</p>

          {latest ? (
            <>
              <p className="mt-1 text-xs text-emerald-700">
                Tersimpan · {formatBytes(getDocumentSize(latest))}
              </p>

              {uploadedCount > 1 && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {uploadedCount} file tersimpan untuk kategori ini
                </p>
              )}

              <p className="mt-0.5 break-all text-[11px] text-slate-500">
                {getDocumentName(latest)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-amber-700">Belum diunggah</p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => onUpload(event.target.files?.[0])}
      />

      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${
            busy ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {busy ? (
            <LoaderCircle className="animate-spin" size={14} />
          ) : latest ? (
            <RefreshCw size={14} />
          ) : (
            <FileUp size={14} />
          )}

          {busy ? "Memproses..." : latest ? "Unggah versi baru" : "Unggah PDF"}
        </label>

        {documents?.map((doc, index) => {
          const documentId = getDocumentId(doc);
          const deleting = deletingId === documentId;

          return (
            <div key={documentId} className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onPreview(doc)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                title={`Preview ${getDocumentName(doc)}`}
              >
                <Eye size={14} />
                Preview{documents.length > 1 ? ` ${index + 1}` : ""}
              </button>

              <button
                type="button"
                onClick={() => onDelete(doc)}
                disabled={deleting || Boolean(deletingId)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                title={`Hapus ${getDocumentName(doc)}`}
              >
                {deleting ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}

                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        PDF saja · maksimal 2 MB per file
      </p>
    </div>
  );
}

/* =========================================================
   PDF.JS VIEWER
   ========================================================= */

function PdfJsViewer({ url }) {
  const containerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;
    let pdfDocument = null;

    const renderTasks = [];
    const canvases = [];

    async function renderPdf() {
      setLoading(true);
      setError("");
      setPageCount(0);

      const container = containerRef.current;

      if (!container) {
        setError("Area preview PDF tidak tersedia.");
        setLoading(false);
        return;
      }

      container.replaceChildren();

      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

        if (cancelled) return;

        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

        loadingTask = pdfjsLib.getDocument({
          url,
          isEvalSupported: false,
        });

        pdfDocument = await loadingTask.promise;

        if (cancelled) return;

        const totalPages = pdfDocument.numPages;
        setPageCount(totalPages);

        if (!totalPages) {
          throw new Error("PDF tidak memiliki halaman.");
        }

        const availableWidth = Math.max(240, container.clientWidth - 24);

        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
          if (cancelled) return;

          const page = await pdfDocument.getPage(pageNumber);

          if (cancelled) {
            page.cleanup();
            return;
          }

          const baseViewport = page.getViewport({ scale: 1 });

          const scale = Math.min(1.5, availableWidth / baseViewport.width);

          const viewport = page.getViewport({ scale });

          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

          const canvas = document.createElement("canvas");

          const context = canvas.getContext("2d", {
            alpha: false,
          });

          if (!context) {
            throw new Error("Browser tidak dapat menampilkan halaman PDF.");
          }

          canvas.width = Math.ceil(viewport.width * pixelRatio);
          canvas.height = Math.ceil(viewport.height * pixelRatio);

          canvas.style.display = "block";
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.maxWidth = "100%";
          canvas.style.background = "#ffffff";
          canvas.style.boxShadow = "0 1px 4px rgba(0,0,0,0.12)";

          const pageWrapper = document.createElement("div");

          pageWrapper.style.display = "flex";
          pageWrapper.style.flexDirection = "column";
          pageWrapper.style.alignItems = "center";
          pageWrapper.style.width = "100%";
          pageWrapper.style.padding = "12px";
          pageWrapper.style.boxSizing = "border-box";
          pageWrapper.style.flexShrink = "0";

          const pageLabel = document.createElement("div");

          pageLabel.textContent = `Halaman ${pageNumber} dari ${totalPages}`;

          pageLabel.style.fontSize = "12px";
          pageLabel.style.color = "#64748b";
          pageLabel.style.marginBottom = "8px";

          pageWrapper.appendChild(pageLabel);
          pageWrapper.appendChild(canvas);
          container.appendChild(pageWrapper);

          canvases.push(canvas);

          const renderTask = page.render({
            canvasContext: context,
            viewport,
            transform:
              pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : null,
            background: "#ffffff",
          });

          renderTasks.push(renderTask);

          await renderTask.promise;

          page.cleanup();
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Gagal merender PDF:", err);

          setError(err?.message || "Gagal menampilkan isi halaman PDF.");

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
        } catch {
          // Render mungkin sudah selesai atau dibatalkan.
        }
      }

      for (const canvas of canvases) {
        canvas.width = 1;
        canvas.height = 1;
      }

      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };
  }, [url]);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-200">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white">
          <LoaderCircle size={30} className="animate-spin text-emerald-700" />

          <p className="text-sm text-slate-600">Merender halaman PDF...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white p-6">
          <p className="text-center text-sm text-red-700">{error}</p>
        </div>
      )}

      {!error && (
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorY: "contain",
            touchAction: "pan-y",
          }}
        />
      )}

      {!loading && !error && pageCount > 0 && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs text-white">
          {pageCount} halaman
        </div>
      )}
    </div>
  );
}
