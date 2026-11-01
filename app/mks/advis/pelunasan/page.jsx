"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Eye,
} from "lucide-react";

import { createAdvisPelunasanPdf } from "@/lib/advis-pdf";

/* =========================================================
   FORMAT NOMINAL
========================================================= */

function toTitleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b\p{L}/gu, (huruf) => huruf.toUpperCase());
}

function formatNominal(value) {
  const cleaned = String(value ?? "").replace(/[^\d,]/g, "");
  const parts = cleaned.split(",");

  const integerPart = (parts[0] || "").replace(/\./g, "");
  const decimalPart = parts.length > 1 ? parts.slice(1).join("") : "";

  const formattedInteger = integerPart
    ? Number(integerPart).toLocaleString("id-ID")
    : "";

  return parts.length > 1
    ? `${formattedInteger},${decimalPart}`
    : formattedInteger;
}

function getNominalParts(value) {
  const parts = String(value || "").split(",");

  return {
    integer: Number((parts[0] || "0").replace(/\./g, "") || 0),
    decimal: parts.length > 1 ? parts[1] : "",
  };
}

/* =========================================================
   TERBILANG
========================================================= */

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

  if (n < 12) {
    return KATA_ANGKA[n];
  }

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
  if (!value) return "";

  const { integer, decimal } = getNominalParts(value);

  if (!Number.isSafeInteger(integer) || integer < 0) {
    return "Nominal tidak valid";
  }

  let hasil = terbilangInteger(integer);

  if (decimal && /[1-9]/.test(decimal)) {
    const angkaDesimal = Number(decimal);

    if (Number.isFinite(angkaDesimal)) {
      hasil += ` koma ${terbilangInteger(angkaDesimal)}`;
    }
  }

  hasil += " rupiah";

  return hasil.charAt(0).toUpperCase() + hasil.slice(1);
}

/* =========================================================
   TANGGAL INDONESIA
========================================================= */

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

/* =========================================================
   KONVERSI BASE64 KE BLOB
========================================================= */

function base64ToBlob(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], {
    type: "application/pdf",
  });
}

/* =========================================================
   INPUT FIELD
========================================================= */

function Field({ label, value, onChange, placeholder, required = false }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

/* =========================================================
   HALAMAN ADVIS PELUNASAN
========================================================= */

export default function AdvisPelunasanPage() {
  const [nama, setNama] = useState("");
  const [norekPinjaman, setNorekPinjaman] = useState("");
  const [norekTabungan, setNorekTabungan] = useState("");
  const [keterangan, setKeterangan] = useState("Pelunasan Pinjaman");
  const [nominal, setNominal] = useState("");
  const [tanggal, setTanggal] = useState(tanggalHariIni());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const iframeRef = useRef(null);

  const terbilang = useMemo(() => terbilangNominal(nominal), [nominal]);

  const canPreview =
    nama.trim() &&
    norekPinjaman.trim() &&
    norekTabungan.trim() &&
    keterangan.trim() &&
    nominal.trim() &&
    Number(getNominalParts(nominal).integer) > 0 &&
    tanggal &&
    terbilang !== "Nominal tidak valid";

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /* =======================================================
     BUAT PREVIEW PDF
  ======================================================= */

  async function handlePreview() {
    setError("");

    if (!canPreview) {
      setError("Mohon lengkapi seluruh data dengan benar.");
      return;
    }

    try {
      setLoading(true);

      const pdfBase64 = await createAdvisPelunasanPdf({
        nama: nama.trim(),
        norekPinjaman: norekPinjaman.trim(),
        norekTabungan: norekTabungan.trim(),
        tanggal: formatTanggalIndonesia(tanggal),
        nominal: nominal.trim(),
        terbilang,
        detailTransaksi: keterangan.trim(),
      });

      if (!pdfBase64) {
        throw new Error("PDF tidak berhasil dibuat.");
      }

      const blob = base64ToBlob(pdfBase64);
      const newUrl = URL.createObjectURL(blob);

      setPreviewUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return newUrl;
      });
    } catch (err) {
      console.error("Gagal membuat preview Advis:", err);
      setError(err?.message || "Gagal membuat preview PDF.");
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     DOWNLOAD PDF
  ======================================================= */

  function handleDownload() {
    if (!previewUrl) return;

    const safeName = norekPinjaman.trim().replace(/[^a-zA-Z0-9_-]/g, "");

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `Advis_Pelunasan_${safeName || "Debitur"}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /* =======================================================
     CETAK PDF
  ======================================================= */

  function handlePrint() {
    if (!previewUrl) return;

    const printWindow = window.open(previewUrl, "_blank");

    if (!printWindow) {
      setError(
        "Jendela cetak diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.",
      );
    }
  }

  /* =======================================================
     RESET FORM
  ======================================================= */

  function resetForm() {
    setNama("");
    setNorekPinjaman("");
    setNorekTabungan("");
    setKeterangan("Pelunasan Pinjaman");
    setNominal("");
    setTanggal(tanggalHariIni());
    setError("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
  }

  /* =======================================================
     TAMPILAN
  ======================================================= */

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* HEADER */}

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/mks/advis"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-100"
              title="Kembali"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Advis Pelunasan
              </h1>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Input data dan periksa dokumen sebelum diunduh atau dicetak.
              </p>
            </div>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText size={22} />
          </div>
        </div>

        {/* FORM INPUT */}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900">
              Data Pelunasan
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Lengkapi data berikut untuk membuat dokumen Advis.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              label="Nama Debitur"
              value={nama}
              onChange={(e) => setNama(toTitleCase(e.target.value))}
              placeholder="Masukkan nama debitur"
              required
            />

            <Field
              label="Nomor Rekening Pinjaman"
              value={norekPinjaman}
              onChange={(e) => setNorekPinjaman(e.target.value)}
              placeholder="Nomor rekening pinjaman"
              required
            />

            <Field
              label="Nomor Rekening Tabungan"
              value={norekTabungan}
              onChange={(e) => setNorekTabungan(e.target.value)}
              placeholder="Nomor rekening tabungan"
              required
            />

            <Field
              label="Keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(toTitleCase(e.target.value))}
              placeholder="Pelunasan Pinjaman"
              required
            />

            {/* NOMINAL */}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Nominal Pelunasan
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                  Rp
                </span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={nominal}
                  onChange={(e) => setNominal(formatNominal(e.target.value))}
                  placeholder="0"
                  className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Terbilang Otomatis
                </p>

                <p className="text-sm font-medium leading-relaxed text-gray-800">
                  {terbilang || "Terbilang akan muncul setelah nominal diisi."}
                </p>
              </div>
            </div>

            {/* TANGGAL */}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Tanggal Advis
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />

              <p className="text-xs text-gray-500">
                Tanggal dokumen:{" "}
                <strong className="text-gray-700">
                  {formatTanggalIndonesia(tanggal)}
                </strong>
              </p>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* TOMBOL FORM */}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={loading}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Reset Form
            </button>

            <button
              type="button"
              onClick={handlePreview}
              disabled={!canPreview || loading}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Membuat Preview...
                </>
              ) : (
                <>
                  <Eye size={17} />
                  Tampilkan Preview PDF
                </>
              )}
            </button>
          </div>
        </section>

        {/* PREVIEW PDF */}

        {previewUrl && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="font-bold text-gray-900">
                  Preview Advis Pelunasan
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Periksa dokumen sebelum mengunduh atau mencetak.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:flex-none"
                >
                  <Download size={16} />
                  Download
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 sm:flex-none"
                >
                  <Printer size={16} />
                  Cetak
                </button>
              </div>
            </div>

            <div className="w-full overflow-hidden bg-gray-100 p-2 sm:p-4">
              {/* PREVIEW MOBILE - SKALA 40% */}
              <div className="overflow-hidden rounded-lg sm:hidden">
                <div
                  style={{
                    width: "250%",
                    height: "360px",
                    transform: "scale(0.4)",
                    transformOrigin: "top left",
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="Preview PDF Advis Pelunasan Mobile"
                    className="h-[900px] w-full border-0 bg-white"
                  />
                </div>
              </div>

              {/* PREVIEW DESKTOP - UKURAN NORMAL */}
              <iframe
                src={previewUrl}
                title="Preview PDF Advis Pelunasan Desktop"
                className="hidden h-[75vh] min-h-[550px] w-full rounded-lg border border-gray-300 bg-white sm:block"
              />
            </div>

            <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 sm:px-6">
              Jika ada data yang salah, ubah data pada formulir lalu tekan
              Tampilkan Preview PDF kembali.
            </div>
          </section>
        )}

        <p className="text-center text-xs leading-relaxed text-gray-400">
          Data pada halaman ini hanya digunakan untuk membuat dokumen PDF dan
          tidak disimpan ke database.
        </p>
      </div>
    </main>
  );
}
