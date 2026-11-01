"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Eye,
  Search,
  Plus,
  Trash2,
  Database,
  Pencil,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { createAdvisAsuransiJiwaPdf } from "@/lib/advis-pdf";

/* =========================================================
   FORMAT DATA
========================================================= */

function toTitleCase(value) {
  return String(value || "")
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
  if (n < 12) return KATA_ANGKA[n];

  if (n < 20) return `${terbilangInteger(n - 10)} belas`;

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
   TANGGAL DAN NOMINAL TAMPILAN
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

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

function normalisasiNomorAplikasi(value) {
  return String(value || "")
    .trim()
    .replace(/^AD-/i, "")
    .trim();
}

function nomorAplikasiPDF(value) {
  const nomor = normalisasiNomorAplikasi(value);
  return nomor ? `AD-${nomor}` : "";
}

/* =========================================================
   PDF BASE64
========================================================= */

function base64ToBlob(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: "application/pdf" });
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  readOnly = false,
  type = "text",
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className={`min-h-[46px] w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
          readOnly
            ? "border-gray-200 bg-gray-50 text-gray-600"
            : "border-gray-300 bg-white text-gray-900"
        }`}
      />
    </div>
  );
}

function emptyItem() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    sumber: "MANUAL",
    pkId: "",
    nama: "",
    rekeningTabungan: "",
    nomorAplikasi: "",
    asuradurId: "",
    namaAsuradur: "",
    rekeningGiroAsuradur: "",
    nominal: "",
  };
}

/* =========================================================
   HALAMAN ADVIS ASURANSI JIWA
========================================================= */

export default function AdvisAsuransiJiwaPage() {
  const [mode, setMode] = useState("MANUAL");

  const [asuradur, setAsuradur] = useState([]);
  const [loadingAsuradur, setLoadingAsuradur] = useState(true);

  const [items, setItems] = useState([emptyItem()]);
  const [tanggal, setTanggal] = useState(tanggalHariIni());

  const [keyword, setKeyword] = useState("");
  const [hasilPK, setHasilPK] = useState([]);
  const [loadingPK, setLoadingPK] = useState(false);
  const [searched, setSearched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const iframeRef = useRef(null);

  /* =======================================================
     LOAD MASTER ASURADUR
     HANYA ASURANSI JIWA
  ======================================================= */

  const loadAsuradur = useCallback(async () => {
    setLoadingAsuradur(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("asuradur")
        .select("id, nama_asuradur, nomor_rekening_giro, jenis_asuransi")
        .eq("jenis_asuransi", "ASURANSI_JIWA")
        .order("nama_asuradur", { ascending: true });

      if (queryError) throw queryError;

      setAsuradur(data || []);
    } catch (err) {
      console.error("Gagal mengambil Master Asuradur Jiwa:", err);
      setError(
        err?.message || "Gagal mengambil Master Asuradur Asuransi Jiwa.",
      );
    } finally {
      setLoadingAsuradur(false);
    }
  }, []);

  useEffect(() => {
    loadAsuradur();
  }, [loadAsuradur]);

  /* =======================================================
     PREVIEW URL CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /* =======================================================
     TERBILANG SETIAP ITEM
  ======================================================= */

  const itemTerbilang = useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      value: terbilangNominal(item.nominal),
    }));
  }, [items]);

  /* =======================================================
     VALIDASI DAN DUPLIKASI DEBITUR
  ======================================================= */

  const duplicateItemIds = useMemo(() => {
    const seen = new Map();
    const duplicates = new Set();

    items.forEach((item) => {
      const nama = String(item.nama || "")
        .trim()
        .toLowerCase();
      const rekening = String(item.rekeningTabungan || "").trim();
      const nomorAplikasi = normalisasiNomorAplikasi(
        item.nomorAplikasi,
      ).toLowerCase();

      // Identitas utama: nomor rekening tabungan.
      // Jika kosong, gunakan nama dan nomor aplikasi.
      const key = rekening
        ? `REK:${rekening}`
        : `DATA:${nama}|${nomorAplikasi}`;

      if (!nama && !rekening && !nomorAplikasi) return;

      if (seen.has(key)) {
        duplicates.add(item.id);
        duplicates.add(seen.get(key));
      } else {
        seen.set(key, item.id);
      }
    });

    return duplicates;
  }, [items]);

  const canPreview =
    items.length > 0 &&
    Boolean(tanggal) &&
    duplicateItemIds.size === 0 &&
    items.every((item) => {
      const integer = getNominalParts(item.nominal).integer;

      return (
        item.nama.trim() &&
        item.rekeningTabungan.trim() &&
        normalisasiNomorAplikasi(item.nomorAplikasi) &&
        item.namaAsuradur.trim() &&
        item.rekeningGiroAsuradur.trim() &&
        item.nominal.trim() &&
        Number.isSafeInteger(integer) &&
        integer > 0 &&
        terbilangNominal(item.nominal) !== "Nominal tidak valid"
      );
    });

  /* =======================================================
     UPDATE ITEM
  ======================================================= */

  function clearPreview() {
    setPreviewUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return "";
    });
  }

  function updateItem(id, changes) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );

    clearPreview();
    setError("");
  }

  function addItem() {
    setItems((current) => [...current, emptyItem()]);
    setInfo("");
    setError("");
    clearPreview();
  }

  function removeItem(id) {
    setItems((current) => {
      if (current.length <= 1) return current;
      return current.filter((item) => item.id !== id);
    });

    clearPreview();
    setInfo("");
    setError("");
  }

  function selectAsuradur(itemId, asuradurId) {
    const selected = asuradur.find((a) => String(a.id) === String(asuradurId));

    updateItem(itemId, {
      asuradurId: selected?.id || "",
      namaAsuradur: selected?.nama_asuradur || "",
      rekeningGiroAsuradur: selected?.nomor_rekening_giro || "",
    });
  }

  /* =======================================================
     PENCARIAN DATABASE PK
  ======================================================= */

  async function handleSearchPK(event) {
    event?.preventDefault();

    const q = keyword.trim();

    if (!q) {
      setError(
        "Masukkan nama debitur, rekening pinjaman, atau nomor aplikasi.",
      );
      return;
    }

    setLoadingPK(true);
    setError("");
    setInfo("");
    setSearched(true);
    setHasilPK([]);

    try {
      const pattern = `%${q}%`;

      const selectFields =
        "id, nama_debitur, nomor_aplikasi, rekening_tabungan, rekening_kredit, tanggal_pk, limit_kredit, jenis_pengajuan_kredit";

      const [byNama, byRekening, byAplikasi] = await Promise.all([
        supabase
          .from("pk")
          .select(selectFields)
          .ilike("nama_debitur", pattern)
          .limit(30),

        supabase
          .from("pk")
          .select(selectFields)
          .ilike("rekening_kredit", pattern)
          .limit(30),

        supabase
          .from("pk")
          .select(selectFields)
          .ilike("nomor_aplikasi", pattern)
          .limit(30),
      ]);

      if (byNama.error) throw byNama.error;
      if (byRekening.error) throw byRekening.error;
      if (byAplikasi.error) throw byAplikasi.error;

      const combined = [
        ...(byNama.data || []),
        ...(byRekening.data || []),
        ...(byAplikasi.data || []),
      ];

      const uniquePK = Array.from(
        new Map(combined.map((pk) => [pk.id, pk])).values(),
      );

      setHasilPK(uniquePK);

      if (uniquePK.length === 0) {
        console.info("PK tidak ditemukan untuk kata kunci:", q);
      }
    } catch (err) {
      console.error("Gagal mencari Database PK:", err);

      setError(err?.message || "Gagal mengambil data PK dari database.");
    } finally {
      setLoadingPK(false);
    }
  }

  /* =======================================================
     PILIH PK KE DAFTAR ADVIS
  ======================================================= */

  function addPKToForm(pk) {
    const sudahAda = items.some(
      (item) =>
        (item.pkId && item.pkId === pk.id) ||
        (item.rekeningTabungan &&
          item.rekeningTabungan.trim() ===
            String(pk.rekening_tabungan || "").trim()),
    );

    if (sudahAda) {
      setError(
        `${pk.nama_debitur || "Debitur"} sudah ada dalam daftar Advis ini.`,
      );
      setInfo("");
      return;
    }

    const newItem = {
      ...emptyItem(),
      sumber: "DATABASE PK",
      pkId: pk.id,
      nama: pk.nama_debitur || "",
      rekeningTabungan: pk.rekening_tabungan || "",
      nomorAplikasi: normalisasiNomorAplikasi(pk.nomor_aplikasi),
    };

    setItems((current) => [...current, newItem]);
    setInfo(
      `${pk.nama_debitur || "Data PK"} berhasil ditambahkan. Pilih Asuradur Jiwa dan isi nominal pembayaran.`,
    );
    setError("");
    clearPreview();
  }

  /* =======================================================
     BUAT PREVIEW PDF
  ======================================================= */

  async function handlePreview() {
    setError("");
    setInfo("");

    if (duplicateItemIds.size > 0) {
      setError(
        "Terdapat debitur yang sama lebih dari satu kali. Hapus atau periksa data yang duplikat sebelum membuat PDF.",
      );
      return;
    }

    if (!canPreview) {
      setError("Mohon lengkapi seluruh data Advis dengan benar.");
      return;
    }

    try {
      setLoading(true);

      const pdfItems = items.map((item) => ({
        nama: item.nama.trim(),
        rekeningGiroAsuradur: item.rekeningGiroAsuradur.trim(),
        namaAsuradur: item.namaAsuradur.trim(),
        rekeningTabunganDebitur: item.rekeningTabungan.trim(),
        nomorAplikasi: nomorAplikasiPDF(item.nomorAplikasi),
        tanggal: formatTanggalIndonesia(tanggal),
        nominal: item.nominal.trim(),
        terbilang: terbilangNominal(item.nominal),
      }));

      const pdfBase64 = await createAdvisAsuransiJiwaPdf(pdfItems);

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
      console.error("Gagal membuat Advis Asuransi Jiwa:", err);
      setError(err?.message || "Gagal membuat preview PDF.");
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     DOWNLOAD
  ======================================================= */

  function handleDownload() {
    if (!previewUrl) return;

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `Advis_Asuransi_Jiwa_${tanggal || "Dokumen"}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /* =======================================================
     CETAK
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
     RESET
  ======================================================= */

  function resetForm() {
    setItems([emptyItem()]);
    setTanggal(tanggalHariIni());
    setKeyword("");
    setHasilPK([]);
    setSearched(false);
    setError("");
    setInfo("");
    clearPreview();
  }

  /* =======================================================
     TAMPILAN
  ======================================================= */

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
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
                Advis Asuransi Jiwa
              </h1>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Buat beberapa Advis Asuransi Jiwa dalam satu dokumen PDF.
              </p>
            </div>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText size={22} />
          </div>
        </div>

        {/* PILIH MODE */}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="font-bold text-gray-900">Sumber Data</h2>
            <p className="mt-1 text-sm text-gray-500">
              Pilih cara memasukkan data Advis Asuransi Jiwa.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode("MANUAL");
                setError("");
                setInfo("");
              }}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                mode === "MANUAL"
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600">
                <Pencil size={20} />
              </div>

              <div>
                <p className="font-bold text-gray-900">Input Manual</p>
                <p className="mt-1 text-xs text-gray-500">
                  Isi data debitur secara manual.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("DATABASE");
                setError("");
                setInfo("");
              }}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                mode === "DATABASE"
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600">
                <Database size={20} />
              </div>

              <div>
                <p className="font-bold text-gray-900">Database PK</p>
                <p className="mt-1 text-xs text-gray-500">
                  Cari debitur dari data PK.
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* PENCARIAN DATABASE */}

        {mode === "DATABASE" && (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4">
              <h2 className="font-bold text-gray-900">Cari Data PK</h2>
              <p className="mt-1 text-sm text-gray-500">
                Cari menggunakan nama debitur, rekening pinjaman, atau nomor
                aplikasi.
              </p>
            </div>

            <form
              onSubmit={handleSearchPK}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Nama debitur, rekening pinjaman, atau nomor aplikasi..."
                  className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={loadingPK}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingPK ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Search size={17} />
                )}
                Cari PK
              </button>
            </form>

            {loadingPK && (
              <div className="mt-5 flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 size={18} className="animate-spin" />
                Mengambil data PK...
              </div>
            )}

            {!loadingPK && searched && hasilPK.length === 0 && (
              <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-6 text-center">
                <Search className="mx-auto mb-2 text-gray-400" size={25} />
                <p className="text-sm font-semibold text-gray-700">
                  Data PK tidak ditemukan.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Periksa kembali kata kunci pencarian.
                </p>
              </div>
            )}

            {!loadingPK && hasilPK.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    Hasil pencarian
                  </p>
                  <span className="text-xs text-gray-500">
                    {hasilPK.length} data PK
                  </span>
                </div>

                {hasilPK.map((pk) => {
                  const sudahAda = items.some(
                    (item) =>
                      (item.pkId && item.pkId === pk.id) ||
                      (item.rekeningTabungan &&
                        item.rekeningTabungan.trim() ===
                          String(pk.rekening_tabungan || "").trim()),
                  );

                  return (
                    <div
                      key={pk.id}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900">
                            {pk.nama_debitur || "-"}
                          </p>

                          <div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-1 text-xs text-gray-600 sm:grid-cols-2">
                            <p>
                              Rekening Tabungan:{" "}
                              <strong className="text-gray-800">
                                {pk.rekening_tabungan || "-"}
                              </strong>
                            </p>

                            <p>
                              Rekening Pinjaman:{" "}
                              <strong className="text-gray-800">
                                {pk.rekening_kredit || "-"}
                              </strong>
                            </p>

                            <p>
                              Nomor Aplikasi:{" "}
                              <strong className="text-gray-800">
                                {nomorAplikasiPDF(pk.nomor_aplikasi) || "-"}
                              </strong>
                            </p>

                            <p>
                              Plafon:{" "}
                              <strong className="text-gray-800">
                                {formatRupiah(pk.limit_kredit)}
                              </strong>
                            </p>

                            <p>
                              Tanggal PK:{" "}
                              <strong className="text-gray-800">
                                {pk.tanggal_pk
                                  ? formatTanggalIndonesia(pk.tanggal_pk)
                                  : "-"}
                              </strong>
                            </p>

                            <p>
                              Jenis Kredit:{" "}
                              <strong className="text-gray-800">
                                {pk.jenis_pengajuan_kredit || "-"}
                              </strong>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={sudahAda}
                          onClick={() => addPKToForm(pk)}
                          className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          <Plus size={15} />
                          {sudahAda ? "Sudah Ditambahkan" : "Tambah Debitur"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* STATUS MASTER ASURADUR */}

        {loadingAsuradur && (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            <Loader2 size={17} className="animate-spin" />
            Memuat Master Asuradur Asuransi Jiwa...
          </div>
        )}

        {!loadingAsuradur && asuradur.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Master Asuradur Asuransi Jiwa belum tersedia. Pastikan data Asuradur
            dengan jenis ASURANSI_JIWA sudah terdaftar.
          </div>
        )}

        {/* TANGGAL ADVIS */}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Tanggal Advis <span className="text-red-500">*</span>
              </label>

              <input
                type="date"
                value={tanggal}
                onChange={(e) => {
                  setTanggal(e.target.value);
                  clearPreview();
                }}
                className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="text-xs text-gray-500">
                Tanggal dokumen:{" "}
                <strong className="text-gray-700">
                  {formatTanggalIndonesia(tanggal)}
                </strong>
              </p>
            </div>

            <div className="flex items-end">
              <div className="w-full rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Jumlah Advis
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {items.length} halaman
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Setiap debitur dibuat menjadi satu halaman PDF.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DAFTAR FORM ADVIS */}

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Daftar Advis Asuransi Jiwa
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Periksa dan lengkapi data setiap debitur sebelum membuat PDF.
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Plus size={17} />
              Tambah Data Advis
            </button>
          </div>

          {duplicateItemIds.size > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Ada debitur yang terdaftar lebih dari satu kali. Periksa nomor
              rekening tabungan atau identitas debitur pada daftar.
            </div>
          )}

          {items.map((item, index) => {
            const terbilang =
              itemTerbilang.find((t) => t.id === item.id)?.value || "";

            const duplicate = duplicateItemIds.has(item.id);

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-gray-900">
                        Advis Asuransi Jiwa {index + 1}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.sumber}
                        {item.pkId ? " • Terhubung dengan Database PK" : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    title="Hapus data"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div className="space-y-5 p-4 sm:p-5">
                  {duplicate && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      Data debitur ini terindikasi duplikat.
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field
                      label="Nama Debitur"
                      value={item.nama}
                      onChange={(e) =>
                        updateItem(item.id, {
                          nama: toTitleCase(e.target.value),
                        })
                      }
                      placeholder="Nama debitur"
                      required
                    />

                    <Field
                      label="Nomor Rekening Tabungan Debitur (D/)"
                      value={item.rekeningTabungan}
                      onChange={(e) =>
                        updateItem(item.id, {
                          rekeningTabungan: e.target.value,
                        })
                      }
                      placeholder="Nomor rekening tabungan"
                      required
                    />

                    <Field
                      label="Nomor Aplikasi"
                      value={item.nomorAplikasi}
                      onChange={(e) =>
                        updateItem(item.id, {
                          nomorAplikasi: e.target.value,
                        })
                      }
                      placeholder="Contoh: KUR11081B202816001"
                      required
                    />

                    {/* ASURADUR */}

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Nama Asuradur
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <select
                        value={item.asuradurId}
                        onChange={(e) =>
                          selectAsuradur(item.id, e.target.value)
                        }
                        disabled={loadingAsuradur || asuradur.length === 0}
                        className="min-h-[46px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      >
                        <option value="">Pilih Asuradur Jiwa</option>

                        {asuradur.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nama_asuradur}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Field
                      label="Nomor Rekening Giro Asuradur (K/)"
                      value={item.rekeningGiroAsuradur}
                      readOnly
                      placeholder="Terisi otomatis dari Master Asuradur"
                      required
                    />

                    {/* NOMINAL */}

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Nominal Pembayaran Premi
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                          Rp
                        </span>

                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.nominal}
                          onChange={(e) =>
                            updateItem(item.id, {
                              nominal: formatNominal(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="min-h-[46px] w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DETAIL TRANSAKSI */}

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Detail Transaksi pada Advis
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-800">
                      Pembayaran Premi Asuransi Jiwa an.{" "}
                      {item.nama || "[Nama Debitur]"}
                    </p>
                  </div>

                  {/* NOMOR APLIKASI PDF */}

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Nomor Aplikasi pada Dokumen
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-800">
                      {nomorAplikasiPDF(item.nomorAplikasi) ||
                        "[AD-Nomor Aplikasi]"}
                    </p>
                  </div>

                  {/* TERBILANG */}

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Terbilang Otomatis
                    </p>

                    <p className="text-sm font-medium leading-relaxed text-gray-800">
                      {terbilang ||
                        "Terbilang akan muncul setelah nominal diisi."}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* PESAN */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {info && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {info}
          </div>
        )}

        {/* TOMBOL */}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={loading}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Reset Form
            </button>

            <button
              type="button"
              onClick={handlePreview}
              disabled={!canPreview || loading}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                  Preview Advis Asuransi Jiwa
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {items.length} data Advis dalam satu dokumen PDF.
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
              {/* MOBILE */}

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
                    title="Preview PDF Advis Asuransi Jiwa Mobile"
                    className="h-[900px] w-full border-0 bg-white"
                  />
                </div>
              </div>

              {/* DESKTOP */}

              <iframe
                src={previewUrl}
                title="Preview PDF Advis Asuransi Jiwa Desktop"
                className="hidden h-[75vh] min-h-[550px] w-full rounded-lg border border-gray-300 bg-white sm:block"
              />
            </div>

            <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 sm:px-6">
              Periksa seluruh halaman PDF. Jika ada data yang salah, ubah
              formulir lalu buat preview kembali.
            </div>
          </section>
        )}

        <p className="text-center text-xs leading-relaxed text-gray-400">
          Data Advis hanya digunakan untuk membuat dokumen PDF dan tidak
          disimpan atau mengubah data PK di database.
        </p>
      </div>
    </main>
  );
}
