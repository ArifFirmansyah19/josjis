"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Printer,
  Eye,
  CheckSquare,
  Square,
  RefreshCw,
} from "lucide-react";

import { createAdvisPelunasanPdf } from "@/lib/advis-pdf";

const STORAGE_KEY = "raportmu_advis_easycoll_source";

const BRANCH_1 = "Jambi Kuamang Kuning 1";
const BRANCH_2 = "Jambi Kuamang Kuning 2";

function tanggalHariIni() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatTanggalIndonesia(value) {
  if (!value) return "";

  const [tahun, bulan, tanggal] = value.split("-");

  const namaBulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${tanggal} ${namaBulan[Number(bulan) - 1]} ${tahun}`;
}

function parseNominal(value) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : null;
}

function bulatkanKeAtasRibuan(value) {
  const number = parseNominal(value);

  if (number === null) return null;

  return Math.ceil(number / 1000) * 1000;
}

function formatRupiah(value) {
  if (value === null || value === undefined) return "";

  return Number(value).toLocaleString("id-ID");
}

const KATA_ANGKA = [
  "nol",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

function terbilangInteger(value) {
  const n = Math.floor(Number(value));

  if (!Number.isFinite(n) || n < 0) return "";

  if (n < 12) return KATA_ANGKA[n];

  if (n < 20) {
    return `${terbilangInteger(n - 10)} belas`;
  }

  if (n < 100) {
    const puluhan = Math.floor(n / 10);
    const satuan = n % 10;

    return `${terbilangInteger(puluhan)} puluh${
      satuan ? ` ${terbilangInteger(satuan)}` : ""
    }`;
  }

  if (n < 200) {
    return `seratus${n > 100 ? ` ${terbilangInteger(n - 100)}` : ""}`;
  }

  if (n < 1000) {
    const ratusan = Math.floor(n / 100);
    const sisa = n % 100;

    return `${terbilangInteger(ratusan)} ratus${
      sisa ? ` ${terbilangInteger(sisa)}` : ""
    }`;
  }

  if (n < 2000) {
    return `seribu${n > 1000 ? ` ${terbilangInteger(n - 1000)}` : ""}`;
  }

  const satuanBesar = [
    { nilai: 1_000_000_000_000, nama: "triliun" },
    { nilai: 1_000_000_000, nama: "miliar" },
    { nilai: 1_000_000, nama: "juta" },
    { nilai: 1000, nama: "ribu" },
  ];

  for (const satuan of satuanBesar) {
    if (n >= satuan.nilai) {
      const depan = Math.floor(n / satuan.nilai);
      const sisa = n % satuan.nilai;

      return `${terbilangInteger(depan)} ${satuan.nama}${
        sisa ? ` ${terbilangInteger(sisa)}` : ""
      }`;
    }
  }

  return "";
}

function terbilangNominal(value) {
  if (!Number.isSafeInteger(value) || value < 0) return "";

  const hasil = `${terbilangInteger(value)} rupiah`;

  return hasil.charAt(0).toUpperCase() + hasil.slice(1);
}

function base64ToBytes(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

function base64ToBlob(base64) {
  return new Blob([base64ToBytes(base64)], {
    type: "application/pdf",
  });
}

export default function EasyCollAdvisPage() {
  const [sourceData, setSourceData] = useState([]);
  const [branch, setBranch] = useState("SEMUA");
  const [selectedIds, setSelectedIds] = useState([]);
  const [tanggal, setTanggal] = useState(tanggalHariIni());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Deteksi ukuran layar untuk menentukan zoom PDF.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const updateScreen = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateScreen();
    mediaQuery.addEventListener("change", updateScreen);

    return () => {
      mediaQuery.removeEventListener("change", updateScreen);
    };
  }, []);

  // Membaca sumber data dari Easy Call.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);

      if (!raw) {
        setError(
          "Data Easy Call tidak ditemukan. Silakan kembali dan proses Easy Call terlebih dahulu.",
        );
        return;
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError("Data Easy Call kosong atau tidak valid.");
        return;
      }

      setSourceData(parsed);
      setSelectedIds(parsed.map((item) => item.id));
    } catch (err) {
      console.error("Gagal membaca data Easy Call:", err);
      setError("Data Easy Call gagal dibaca dari penyimpanan browser.");
    }
  }, []);

  // Filter data sesuai unit yang dipilih.
  const visibleData = useMemo(() => {
    if (branch === "JKK1") {
      return sourceData.filter((item) => item.mbu === BRANCH_1);
    }

    if (branch === "JKK2") {
      return sourceData.filter((item) => item.mbu === BRANCH_2);
    }

    return sourceData;
  }, [sourceData, branch]);

  // Hanya data pada unit aktif yang dicentang yang masuk PDF.
  const selectedData = useMemo(() => {
    return visibleData.filter((item) => selectedIds.includes(item.id));
  }, [visibleData, selectedIds]);

  const jkk1Count = sourceData.filter((item) => item.mbu === BRANCH_1).length;

  const jkk2Count = sourceData.filter((item) => item.mbu === BRANCH_2).length;

  const allVisibleSelected =
    visibleData.length > 0 &&
    visibleData.every((item) => selectedIds.includes(item.id));

  function clearPreview() {
    setPreviewUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return "";
    });
  }

  function changeBranch(nextBranch) {
    setBranch(nextBranch);

    const dataUnit =
      nextBranch === "JKK1"
        ? sourceData.filter((item) => item.mbu === BRANCH_1)
        : nextBranch === "JKK2"
          ? sourceData.filter((item) => item.mbu === BRANCH_2)
          : sourceData;

    // Otomatis pilih seluruh data pada unit yang baru dipilih.
    setSelectedIds(dataUnit.map((item) => item.id));

    clearPreview();
    setError("");
  }

  function toggleItem(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id],
    );

    clearPreview();
    setError("");
  }

  function toggleAllVisible() {
    const visibleIds = visibleData.map((item) => item.id);

    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedIds((current) =>
        Array.from(new Set([...current, ...visibleIds])),
      );
    }

    clearPreview();
    setError("");
  }

  function handleResetSelection() {
    setSelectedIds(visibleData.map((item) => item.id));
    clearPreview();
    setError("");
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handlePreview() {
    setError("");

    if (!selectedData.length) {
      setError("Pilih minimal satu debitur untuk dibuatkan Advis.");
      return;
    }

    if (!tanggal) {
      setError("Tanggal Advis wajib diisi.");
      return;
    }

    const invalidIndex = selectedData.findIndex((item) => {
      const nominal = bulatkanKeAtasRibuan(item.total_tgg);

      return (
        !item.nama?.trim() ||
        !item.norekPinjaman?.trim() ||
        !item.norekTabungan?.trim() ||
        nominal === null ||
        nominal <= 0
      );
    });

    if (invalidIndex >= 0) {
      setError(
        `Data ${invalidIndex + 1} belum lengkap. Periksa nama, rekening pinjaman, rekening tabungan, dan nominal.`,
      );
      return;
    }

    try {
      setLoading(true);

      const pdfGabungan = await PDFDocument.create();

      for (let index = 0; index < selectedData.length; index++) {
        const item = selectedData[index];
        const nominalAkhir = bulatkanKeAtasRibuan(item.total_tgg);

        const pdfBase64 = await createAdvisPelunasanPdf({
          nama: item.nama.trim(),
          norekPinjaman: item.norekPinjaman.trim(),
          norekTabungan: item.norekTabungan.trim(),
          tanggal: formatTanggalIndonesia(tanggal),
          nominal: formatRupiah(nominalAkhir),
          terbilang: terbilangNominal(nominalAkhir),
          detailTransaksi: "Pembayaran Angsuran",
        });

        if (!pdfBase64) {
          throw new Error(`PDF untuk ${item.nama} tidak berhasil dibuat.`);
        }

        const pdfSumber = await PDFDocument.load(base64ToBytes(pdfBase64));

        const halaman = await pdfGabungan.copyPages(
          pdfSumber,
          pdfSumber.getPageIndices(),
        );

        halaman.forEach((page) => pdfGabungan.addPage(page));
      }

      const hasilBytes = await pdfGabungan.save();
      const hasilBase64 = bytesToBase64(hasilBytes);
      const blob = base64ToBlob(hasilBase64);
      const newUrl = URL.createObjectURL(blob);

      setPreviewUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return newUrl;
      });
    } catch (err) {
      console.error("Gagal membuat Advis EasyColl:", err);
      setError(err?.message || "Gagal membuat PDF Advis EasyColl.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!previewUrl) return;

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `Advis_EasyColl_${selectedData.length}_Data.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handlePrint() {
    if (!previewUrl) return;

    const printWindow = window.open(previewUrl, "_blank");

    if (!printWindow) {
      setError(
        "Jendela cetak diblokir browser. Izinkan pop-up untuk situs ini.",
      );
    }
  }

  const pdfZoom = isMobile ? "40" : "100";
  const pdfPreviewSrc = previewUrl
    ? `${previewUrl}#zoom=${pdfZoom}&toolbar=1&navpanes=0`
    : "";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin/advis"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
              title="Kembali"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Advis EasyColl
              </h1>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Pilih unit dan debitur yang akan dibuatkan Advis Angsuran.
              </p>
            </div>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText size={22} />
          </div>
        </div>

        {/* Pilihan unit */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-bold text-gray-900">Pilih Unit</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { value: "JKK1", label: "JKK 1", count: jkk1Count },
              { value: "JKK2", label: "JKK 2", count: jkk2Count },
              { value: "SEMUA", label: "Keduanya", count: sourceData.length },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => changeBranch(option.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  branch === option.value
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">
                    {option.label}
                  </span>

                  {branch === option.value && (
                    <CheckSquare size={19} className="text-blue-600" />
                  )}
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  {option.count} debitur
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Daftar debitur */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">Daftar Debitur</h2>
              <p className="mt-1 text-xs text-gray-500">
                Centang debitur yang akan dibuatkan Advis.
              </p>
            </div>

            <div className="text-sm font-semibold text-blue-700">
              {selectedData.length} dari {visibleData.length} dipilih
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleAllVisible}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              {allVisibleSelected ? (
                <Square size={15} />
              ) : (
                <CheckSquare size={15} />
              )}
              {allVisibleSelected ? "Batalkan Pilihan" : "Pilih Semua"}
            </button>

            <button
              type="button"
              onClick={handleResetSelection}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={14} />
              Reset Pilihan
            </button>
          </div>

          {/* Tombol preview di atas tabel */}
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">
                {selectedData.length} debitur dipilih
              </p>
              <p className="mt-1 text-xs text-gray-600">
                PDF hanya berisi debitur yang dipilih pada unit aktif.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePreview}
              disabled={loading || !selectedData.length}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Membuat PDF...
                </>
              ) : (
                <>
                  <Eye size={17} />
                  Buat Preview PDF ({selectedData.length})
                </>
              )}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-3 text-center">Pilih</th>
                  <th className="px-3 py-3 text-left">No.</th>
                  <th className="px-3 py-3 text-left">Nama Debitur</th>
                  <th className="px-3 py-3 text-left">Rekening Pinjaman</th>
                  <th className="px-3 py-3 text-left">Rekening Tabungan</th>
                  <th className="px-3 py-3 text-left">Unit</th>
                  <th className="px-3 py-3 text-right">Nominal Advis</th>
                </tr>
              </thead>

              <tbody>
                {visibleData.map((item, index) => {
                  const checked = selectedIds.includes(item.id);
                  const nominal = bulatkanKeAtasRibuan(item.total_tgg);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`cursor-pointer border-t border-gray-100 ${
                        checked ? "bg-blue-50/50" : "bg-white"
                      } hover:bg-gray-50`}
                    >
                      <td className="px-3 py-3 text-center">
                        {checked ? (
                          <CheckSquare
                            size={17}
                            className="inline text-blue-600"
                          />
                        ) : (
                          <Square size={17} className="inline text-gray-400" />
                        )}
                      </td>

                      <td className="px-3 py-3">{index + 1}</td>

                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-gray-900">
                        {item.nama}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {item.norekPinjaman}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {item.norekTabungan}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {item.mbu === BRANCH_1 ? "JKK 1" : "JKK 2"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                        {nominal !== null
                          ? `Rp${formatRupiah(nominal)}`
                          : "Tidak valid"}
                      </td>
                    </tr>
                  );
                })}

                {!visibleData.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      Tidak ada data untuk unit ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tanggal */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <label className="block text-sm font-semibold text-gray-700">
            Tanggal Advis
          </label>

          <input
            type="date"
            value={tanggal}
            onChange={(event) => {
              setTanggal(event.target.value);
              clearPreview();
            }}
            className="mt-2 min-h-[48px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm sm:max-w-sm"
          />

          <p className="mt-2 text-xs text-gray-500">
            Tanggal dokumen: {formatTanggalIndonesia(tanggal)}
          </p>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Preview PDF */}
        {previewUrl && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
              <div>
                <h2 className="font-bold text-gray-900">
                  Preview Advis EasyColl
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {selectedData.length} debitur dalam satu file PDF.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex min-h-[42px] items-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Download size={16} />
                  Download
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Printer size={16} />
                  Cetak
                </button>
              </div>
            </div>

            <div className="bg-gray-200 p-2 sm:p-4">
              <iframe
                key={`${previewUrl}-${pdfZoom}`}
                src={pdfPreviewSrc}
                title="Preview PDF Advis EasyColl"
                className="h-[65vh] min-h-[420px] w-full rounded-lg border-0 bg-white sm:h-[85vh] sm:min-h-[700px]"
              />
            </div>
          </section>
        )}

        <p className="text-center text-xs text-gray-400">
          Data bersumber dari hasil pemrosesan Easy Call.
        </p>
      </div>
    </main>
  );
}
