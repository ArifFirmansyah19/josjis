"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Printer,
  Share2,
  FileText,
  RefreshCw,
} from "lucide-react";

const STORAGE_KEY = "raportmu_advis_data";
const ENGINE_URL = "http://127.0.0.1:8765/raportmu/advis";

const TRANSACTIONS = {
  4056: {
    code: "4056",
    label: "4056-Angsuran",
    description: "Pembayaran Angsuran",
  },
  4052: {
    code: "4052",
    label: "4052-Angsuran dari GNC",
    description: "Pembayaran Angsuran",
  },
  4204: {
    code: "4204",
    label: "4204-Pelunasan",
    description: "Pelunasan Kredit",
  },
  1314: {
    code: "1314",
    label: "1314-GNC ke Tabungan",
    description: "Pindah Buku",
  },
  4234: {
    code: "4234",
    label: "4234-Penarikan Kelebihan Bayar",
    description: "Penarikan Kelebihan Bayar",
  },
  4104: {
    code: "4104",
    label: "4104-Pelunasan Pokok Sebagian",
    description: "Pelunasan Pokok Sebagian",
  },
};

function formatRupiah(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0";

  return Math.round(number).toLocaleString("id-ID");
}

function getTransaction(item) {
  const raw =
    item?.transactionCode ??
    item?.transaction_code ??
    item?.transaction?.code ??
    item?.transaction?.label ??
    item?.transaction ??
    item?.kotran ??
    item?.kode_kotran ??
    item?.kode_transaksi ??
    "4056";

  const match = String(raw)
    .trim()
    .match(/(?:^|\D)(4056|4052|4204|1314|4234|4104)(?!\d)/);

  return TRANSACTIONS[match?.[1] || "4056"];
}

function prepareItem(item, index) {
  const rawAmount = item?.total_tgg ?? 0;
  const amount =
    typeof rawAmount === "string"
      ? Number(
          rawAmount
            .replace(/rp/gi, "")
            .replace(/\s/g, "")
            .replace(/\.(?=\d{3}(?:\D|$))/g, "")
            .replace(",", "."),
        )
      : Number(rawAmount);

  return {
    ...item,
    _id: `${index}-${String(item?.acctno ?? "")}-${String(item?.nama ?? "")}`,
    nama: String(item?.nama ?? "").trim(),
    acctno: String(item?.acctno ?? "").trim(),
    agf1: String(item?.agf1 ?? "").trim(),
    alamat: String(item?.alamat ?? "").trim(),
    mbu: String(item?.mbu ?? "").trim(),
    nama_mks: String(item?.nama_mks ?? "").trim(),
    total_tgg: Number.isFinite(amount) ? amount : 0,
    transaction: getTransaction(item),
  };
}

function getDateStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function safeFilename(value) {
  return (
    String(value || "Advis_Easy_Call")
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "Advis_Easy_Call"
  );
}

function makePdfFilename() {
  return `Advis_Easy_Call_${getDateStamp()}.pdf`;
}

/**
 * Backend menerima array data Easy Call yang sudah diproses.
 * PDF dibuat oleh Excel menggunakan template asli.
 */
async function requestAdvisPdf(items) {
  if (!items.length) {
    throw new Error("Pilih minimal satu debitur.");
  }

  const payload = items.map((item) => ({
    nama: item.nama,
    acctno: item.acctno,
    agf1: item.agf1,
    alamat: item.alamat || "",
    total_tgg: item.total_tgg,
    mbu: item.mbu,
    nama_mks: item.nama_mks,
    transactionCode: item.transaction.code,
  }));

  let response;

  try {
    response = await fetch(ENGINE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ data: payload }),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Tidak dapat terhubung ke Excel Engine. Pastikan server.py sedang berjalan di komputer ini dan port 8765 aktif.",
    );
  }

  const responseText = await response.text();

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Respons Excel Engine tidak valid (HTTP ${response.status}). Pastikan endpoint /raportmu/advis aktif.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
        result?.message ||
        `Excel Engine gagal memproses PDF (HTTP ${response.status}).`,
    );
  }

  if (result?.success === false) {
    throw new Error(
      result?.error || result?.message || "Gagal membuat PDF Advis.",
    );
  }

  if (!result?.pdfBase64) {
    throw new Error(
      result?.error ||
        result?.message ||
        "PDF tidak ditemukan dalam respons Excel Engine.",
    );
  }

  // Decode Base64 menjadi PDF Blob.
  const binary = atob(result.pdfBase64);
  const chunks = [];
  const chunkSize = 1024 * 512;

  for (let offset = 0; offset < binary.length; offset += chunkSize) {
    const slice = binary.slice(offset, offset + chunkSize);
    const bytes = new Uint8Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      bytes[i] = slice.charCodeAt(i);
    }

    chunks.push(bytes);
  }

  const blob = new Blob(chunks, {
    type: "application/pdf",
  });

  if (!blob.size) {
    throw new Error("PDF hasil Excel kosong.");
  }

  return {
    blob,
    count: Number(result.count) || items.length,
    fileName: safeFilename(result.fileName || "Advis_EasyCall").endsWith(".pdf")
      ? safeFilename(result.fileName || "Advis_EasyCall.pdf")
      : `${safeFilename(result.fileName || "Advis_EasyCall")}.pdf`,
    fileSize: Number(result.fileSize) || blob.size,
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function CetakAdvisPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [currentId, setCurrentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFilename, setPdfFilename] = useState("");
  const [pdfCount, setPdfCount] = useState(0);
  const [pdfSignature, setPdfSignature] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError(
          "Data Easy Call tidak ditemukan. Kembali ke tabel Easy Call dan klik Proses Advis.",
        );
        return;
      }

      const prepared = parsed.map(prepareItem);

      setItems(prepared);
      setSelected(new Set(prepared.map((item) => item._id)));
      setCurrentId(prepared[0]._id);
    } catch (loadError) {
      setError(loadError?.message || "Gagal membaca data Easy Call.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Bersihkan object URL ketika PDF diganti atau halaman ditutup.
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return items;

    return items.filter((item) =>
      [
        item.nama,
        item.acctno,
        item.agf1,
        item.mbu,
        item.transaction.label,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      ),
    );
  }, [items, search]);

  const selectedItems = useMemo(
    () => items.filter((item) => selected.has(item._id)),
    [items, selected],
  );

  const currentPreviewIndex = Math.max(
    0,
    selectedItems.findIndex((item) => item._id === currentId),
  );

  const previewItem =
    selectedItems[currentPreviewIndex] ||
    items.find((item) => item._id === currentId) ||
    null;

  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selected.has(item._id));

  const currentSignature = useMemo(
    () =>
      JSON.stringify(
        selectedItems.map((item) => ({
          nama: item.nama,
          acctno: item.acctno,
          agf1: item.agf1,
          alamat: item.alamat,
          total_tgg: item.total_tgg,
          transaction: item.transaction.code,
        })),
      ),
    [selectedItems],
  );

  const hasCurrentPdf = Boolean(pdfBlob) && pdfSignature === currentSignature;

  const invalidatePdf = useCallback(() => {
    setPdfBlob(null);
    setPdfUrl("");
    setPdfFilename("");
    setPdfCount(0);
    setPdfSignature("");
  }, []);

  const toggleItem = useCallback(
    (id, checked) => {
      setSelected((previous) => {
        const next = new Set(previous);

        if (checked) next.add(id);
        else next.delete(id);

        return next;
      });

      if (checked) setCurrentId(id);
      invalidatePdf();
      setError("");
    },
    [invalidatePdf],
  );

  function toggleAllVisible() {
    setSelected((previous) => {
      const next = new Set(previous);

      if (allVisibleSelected) {
        visibleItems.forEach((item) => next.delete(item._id));
      } else {
        visibleItems.forEach((item) => next.add(item._id));
      }

      return next;
    });

    invalidatePdf();
    setError("");
  }

  function changePage(direction) {
    if (!selectedItems.length) return;

    const nextIndex = Math.max(
      0,
      Math.min(selectedItems.length - 1, currentPreviewIndex + direction),
    );

    setCurrentId(selectedItems[nextIndex]._id);
  }

  async function ensurePdf() {
    if (!selectedItems.length) {
      throw new Error("Pilih minimal satu debitur.");
    }

    if (hasCurrentPdf) {
      return {
        blob: pdfBlob,
        fileName: pdfFilename,
        count: pdfCount,
      };
    }

    const result = await requestAdvisPdf(selectedItems);
    const newUrl = URL.createObjectURL(result.blob);

    setPdfBlob(result.blob);
    setPdfUrl(newUrl);
    setPdfFilename(result.fileName);
    setPdfCount(result.count);
    setPdfSignature(currentSignature);

    return result;
  }

  async function handleGenerate() {
    if (!selectedItems.length || working) return;

    setError("");
    setWorking(true);

    try {
      await ensurePdf();
    } catch (err) {
      setError(err?.message || "Gagal membuat PDF Advis.");
    } finally {
      setWorking(false);
    }
  }

  async function handleDownload() {
    if (!selectedItems.length || working) return;

    setError("");
    setWorking(true);

    try {
      const result = await ensurePdf();
      downloadBlob(result.blob, result.fileName || makePdfFilename());
    } catch (err) {
      setError(err?.message || "Gagal mengunduh PDF Advis.");
    } finally {
      setWorking(false);
    }
  }

  async function handleShare() {
    if (!selectedItems.length || working) return;

    setError("");
    setWorking(true);

    try {
      const result = await ensurePdf();

      const file = new File(
        [result.blob],
        result.fileName || makePdfFilename(),
        { type: "application/pdf" },
      );

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          title: "Advis Easy Call",
          text: `Advis untuk ${result.count} debitur`,
          files: [file],
        });
      } else {
        downloadBlob(result.blob, file.name);

        window.open(
          `https://wa.me/?text=${encodeURIComponent(
            `Advis Easy Call untuk ${result.count} debitur sudah diunduh. Silakan lampirkan file PDF ${file.name} ke chat WhatsApp.`,
          )}`,
          "_blank",
          "noopener,noreferrer",
        );

        setError(
          "PDF sudah diunduh. WhatsApp dibuka; lampirkan PDF secara manual jika browser tidak mendukung berbagi file.",
        );
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        setError(err?.message || "Gagal membagikan PDF Advis.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function handlePrint() {
    if (!selectedItems.length || working) return;

    // Buka jendela lebih awal agar mengurangi risiko pemblokir pop-up.
    const printWindow = window.open("", "_blank");

    setError("");
    setWorking(true);

    try {
      const result = await ensurePdf();
      const url = URL.createObjectURL(result.blob);

      if (!printWindow) {
        downloadBlob(result.blob, result.fileName || makePdfFilename());
        setError(
          "Pop-up diblokir. PDF sudah diunduh; buka file tersebut untuk mencetak.",
        );
        return;
      }

      printWindow.location.href = url;

      // Jangan mencabut URL terlalu cepat; PDF viewer perlu waktu memuat.
      window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    } catch (err) {
      if (printWindow && !printWindow.closed) printWindow.close();

      setError(err?.message || "Gagal menyiapkan PDF untuk dicetak.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-4 text-zinc-900 md:p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-0.5 rounded-lg border border-zinc-200 p-2 hover:bg-zinc-100"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div>
              <h1 className="text-xl font-semibold">Advis Easy Call</h1>
              <p className="mt-1 text-sm text-zinc-500">
                PDF dibuat menggunakan template Excel asli. Satu debitur satu
                halaman.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || working || !selectedItems.length}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Cetak
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={loading || working || !selectedItems.length}
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              Bagikan
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || working || !selectedItems.length}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {working ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Unduh PDF ({selectedItems.length})
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="grid min-h-[75vh] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">Pilih Debitur</div>
                  <div className="text-xs text-zinc-500">
                    {selectedItems.length} dari {items.length} dipilih
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleAllVisible}
                  disabled={loading || !visibleItems.length || working}
                  className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-40"
                >
                  {allVisibleSelected ? "Lepas pilihan" : "Pilih semua"}
                </button>
              </div>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama / rekening..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat data...
                </div>
              ) : (
                visibleItems.map((item) => (
                  <div
                    key={item._id}
                    className={`flex gap-3 border-b border-zinc-100 p-3 hover:bg-zinc-50 ${
                      previewItem?._id === item._id ? "bg-blue-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(item._id)}
                      onChange={(event) =>
                        toggleItem(item._id, event.target.checked)
                      }
                      disabled={working}
                      className="mt-1 h-4 w-4 rounded border-zinc-300"
                      aria-label={`Pilih Advis ${item.nama}`}
                    />

                    <button
                      type="button"
                      onClick={() => setCurrentId(item._id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-sm font-medium">
                        {item.nama || "Nama tidak tersedia"}
                      </div>

                      <div className="mt-0.5 truncate text-xs text-zinc-500">
                        {item.acctno || "-"}
                      </div>

                      <div className="mt-1 text-xs text-zinc-700">
                        {item.transaction.code} ·{" "}
                        <strong>Rp {formatRupiah(item.total_tgg)}</strong>
                      </div>
                    </button>
                  </div>
                ))
              )}

              {!loading && visibleItems.length === 0 && (
                <div className="p-6 text-center text-sm text-zinc-500">
                  Tidak ada debitur yang cocok.
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-[65vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-3">
              <div className="min-w-0">
                <div className="font-semibold">
                  {previewItem?.nama || "Pratinjau PDF Advis"}
                </div>

                <div className="text-xs text-zinc-500">
                  {previewItem
                    ? `${previewItem.transaction.code} · ${previewItem.acctno || "-"}`
                    : "Pilih debitur di sebelah kiri"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || working || !selectedItems.length}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                >
                  {working ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasCurrentPdf ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {working
                    ? "Memproses Excel..."
                    : hasCurrentPdf
                      ? "Buat Ulang PDF"
                      : "Buat Pratinjau PDF"}
                </button>

                <button
                  type="button"
                  onClick={() => changePage(-1)}
                  disabled={!selectedItems.length || currentPreviewIndex <= 0}
                  className="rounded-lg border border-zinc-300 p-2 hover:bg-zinc-50 disabled:opacity-40"
                  aria-label="Advis sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="min-w-[88px] text-center text-xs text-zinc-600">
                  {selectedItems.length
                    ? `${currentPreviewIndex + 1} / ${selectedItems.length}`
                    : "0 / 0"}
                </span>

                <button
                  type="button"
                  onClick={() => changePage(1)}
                  disabled={
                    !selectedItems.length ||
                    currentPreviewIndex >= selectedItems.length - 1
                  }
                  className="rounded-lg border border-zinc-300 p-2 hover:bg-zinc-50 disabled:opacity-40"
                  aria-label="Advis berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-zinc-200 p-3 md:p-6">
              {hasCurrentPdf && pdfUrl ? (
                <div className="mx-auto h-[75vh] min-h-[500px] w-full max-w-[900px] overflow-hidden rounded-lg bg-white shadow-lg">
                  <iframe
                    key={`${pdfUrl}-${currentPreviewIndex}`}
                    title={`Pratinjau PDF Advis halaman ${
                      currentPreviewIndex + 1
                    }`}
                    src={`${pdfUrl}#page=${currentPreviewIndex + 1}&view=FitH`}
                    className="h-full w-full border-0"
                  />
                </div>
              ) : (
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
                  {working ? (
                    <>
                      <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
                      <div className="font-medium">
                        Sedang membuat PDF menggunakan Excel
                      </div>
                      <p className="max-w-md text-sm text-zinc-500">
                        Template asli sedang diisi. Waktu proses bergantung pada
                        jumlah debitur yang dipilih.
                      </p>
                    </>
                  ) : (
                    <>
                      <FileText className="h-12 w-12 text-zinc-400" />
                      <div className="font-medium">
                        Pratinjau PDF belum dibuat
                      </div>
                      <p className="max-w-md text-sm text-zinc-500">
                        Pilih debitur yang dibutuhkan, lalu klik Buat Pratinjau
                        PDF. PDF akan dibuat dari template Excel asli, bukan
                        digambar ulang oleh browser.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500">
              {hasCurrentPdf
                ? `PDF Excel siap · ${pdfCount} halaman · ${(
                    pdfBlob.size / 1024
                  ).toFixed(1)} KB`
                : "PDF dibuat saat diperlukan agar Excel tidak berjalan setiap kali halaman dibuka."}{" "}
              Nama MKS, unit, dan alamat tidak ditambahkan secara otomatis jika
              tidak tersedia pada data sumber.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
