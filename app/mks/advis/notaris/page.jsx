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
  UserRound,
  Database,
  Pencil,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { createAdvisNotarisPdf } from "@/lib/advis-pdf";

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
   TANGGAL
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

/* =========================================================
   PDF BASE64
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
   KOMPONEN FIELD
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
    notarisId: "",
    namaNotaris: "",
    rekeningNotaris: "",
    jenisPengikatan: "APHT",
    nominal: "",
  };
}

/* =========================================================
   HALAMAN ADVIS NOTARIS
========================================================= */

export default function AdvisNotarisPage() {
  const [mode, setMode] = useState("MANUAL");

  const [notaris, setNotaris] = useState([]);
  const [loadingNotaris, setLoadingNotaris] = useState(true);

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
     LOAD MASTER NOTARIS
  ======================================================= */

  const loadNotaris = useCallback(async () => {
    setLoadingNotaris(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("notaris")
        .select(
          "id, nama_notaris, nomor_rekening, provinsi, kabupaten, jenis_rekanan",
        )
        .order("nama_notaris", { ascending: true });

      if (queryError) throw queryError;

      setNotaris(data || []);
    } catch (err) {
      console.error("Gagal mengambil Master Data Notaris:", err);
      setError(
        err?.message || "Gagal mengambil Master Data Notaris dari database.",
      );
    } finally {
      setLoadingNotaris(false);
    }
  }, []);

  useEffect(() => {
    loadNotaris();
  }, [loadNotaris]);

  /* =======================================================
     PREVIEW URL CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
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
     VALIDASI FORM
  ======================================================= */

  const canPreview =
    items.length > 0 &&
    Boolean(tanggal) &&
    items.every((item) => {
      const integer = getNominalParts(item.nominal).integer;

      return (
        item.nama.trim() &&
        item.rekeningTabungan.trim() &&
        item.namaNotaris.trim() &&
        item.rekeningNotaris.trim() &&
        ["APHT", "SKMHT"].includes(item.jenisPengikatan) &&
        item.nominal.trim() &&
        Number.isSafeInteger(integer) &&
        integer > 0 &&
        terbilangNominal(item.nominal) !== "Nominal tidak valid"
      );
    });

  /* =======================================================
     UPDATE ITEM
  ======================================================= */

  function updateItem(id, changes) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );

    setPreviewUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return "";
    });
  }

  function addItem() {
    setItems((current) => [...current, emptyItem()]);
    setInfo("");
    setError("");
  }

  function removeItem(id) {
    setItems((current) => {
      if (current.length <= 1) return current;
      return current.filter((item) => item.id !== id);
    });

    setPreviewUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return "";
    });
  }

  function selectNotaris(itemId, notarisId) {
    const selected = notaris.find((n) => n.id === notarisId);

    updateItem(itemId, {
      notarisId: selected?.id || "",
      namaNotaris: selected?.nama_notaris || "",
      rekeningNotaris: selected?.nomor_rekening || "",
    });
  }

  /* =======================================================
     PENCARIAN DATABASE PK
  ======================================================= */

  async function handleSearchPK(event) {
    event?.preventDefault();

    const q = keyword.trim();

    if (!q) {
      setError("Masukkan nama debitur atau nomor rekening pinjaman.");
      return;
    }

    setLoadingPK(true);
    setError("");
    setInfo("");
    setSearched(true);
    setHasilPK([]);

    try {
      const pattern = `%${q}%`;

      const [byNama, byRekening] = await Promise.all([
        supabase
          .from("pk")
          .select(
            "id, nama_debitur, rekening_tabungan, rekening_kredit, tanggal_pk, limit_kredit, notaris_id",
          )
          .ilike("nama_debitur", pattern)
          .limit(30),

        supabase
          .from("pk")
          .select(
            "id, nama_debitur, rekening_tabungan, rekening_kredit, tanggal_pk, limit_kredit, notaris_id",
          )
          .ilike("rekening_kredit", pattern)
          .limit(30),
      ]);

      if (byNama.error) throw byNama.error;
      if (byRekening.error) throw byRekening.error;

      const combined = [...(byNama.data || []), ...(byRekening.data || [])];

      const uniquePK = Array.from(
        new Map(combined.map((pk) => [pk.id, pk])).values(),
      );

      if (!uniquePK.length) {
        setHasilPK([]);
        return;
      }

      const pkIds = uniquePK.map((pk) => pk.id);

      /* Ambil agunan milik PK yang ditemukan */
      const { data: agunanData, error: agunanError } = await supabase
        .from("pk_agunan")
        .select("id, pk_id, jenis_pengikatan")
        .in("pk_id", pkIds);

      if (agunanError) throw agunanError;

      const agunanIds = (agunanData || []).map((a) => a.id);

      let pengikatanData = [];

      if (agunanIds.length) {
        const { data, error: pengikatanError } = await supabase
          .from("agunan_pengikatan")
          .select(
            "id, pk_agunan_id, actual_type, required_type, status, notaris_id",
          )
          .in("pk_agunan_id", agunanIds);

        if (pengikatanError) throw pengikatanError;

        pengikatanData = data || [];
      }

      const enriched = uniquePK.map((pk) => {
        const agunanPK = (agunanData || []).filter((a) => a.pk_id === pk.id);

        const pengikatanPK = agunanPK.flatMap((agunan) => {
          const pengikatan = pengikatanData.filter(
            (p) => p.pk_agunan_id === agunan.id,
          );

          return pengikatan.map((p) => ({
            ...p,
            jenis_pengikatan:
              p.actual_type || p.required_type || agunan.jenis_pengikatan || "",
          }));
        });

        const jenisList = Array.from(
          new Set(
            pengikatanPK
              .map((p) => String(p.jenis_pengikatan || "").toUpperCase())
              .filter((jenis) => ["APHT", "SKMHT"].includes(jenis)),
          ),
        );

        const notarisIds = [
          ...new Set(
            [pk.notaris_id, ...pengikatanPK.map((p) => p.notaris_id)].filter(
              Boolean,
            ),
          ),
        ];

        return {
          ...pk,
          jenisList,
          pengikatan: pengikatanPK,
          notarisIds,
        };
      });

      setHasilPK(enriched);
    } catch (err) {
      console.error("Gagal mencari Database PK:", err);
      setError(err?.message || "Gagal mengambil data PK.");
    } finally {
      setLoadingPK(false);
    }
  }

  /* =======================================================
     PILIH PK KE FORM ADVIS
  ======================================================= */

  function addPKToForm(pk, jenisPilihan) {
    const jenis = jenisPilihan || pk.jenisList?.[0] || "APHT";

    const pengikatanTerpilih = pk.pengikatan?.find(
      (p) => String(p.jenis_pengikatan || "").toUpperCase() === jenis,
    );

    const notarisId = pengikatanTerpilih?.notaris_id || pk.notaris_id || "";

    const notarisTerpilih = notaris.find((n) => n.id === notarisId);

    const newItem = {
      ...emptyItem(),
      sumber: "DATABASE PK",
      pkId: pk.id,
      nama: pk.nama_debitur || "",
      rekeningTabungan: pk.rekening_tabungan || "",
      jenisPengikatan: jenis,
      notarisId: notarisTerpilih?.id || "",
      namaNotaris: notarisTerpilih?.nama_notaris || "",
      rekeningNotaris: notarisTerpilih?.nomor_rekening || "",
      nominal: "",
    };

    setItems((current) => [...current, newItem]);
    setInfo(
      `${pk.nama_debitur || "Data PK"} berhasil ditambahkan ke daftar Advis. Silakan isi nominal dan periksa notaris.`,
    );
    setError("");
    setPreviewUrl("");
  }

  /* =======================================================
     BUAT PREVIEW PDF
  ======================================================= */

  async function handlePreview() {
    setError("");
    setInfo("");

    if (!canPreview) {
      setError("Mohon lengkapi seluruh data Advis dengan benar.");
      return;
    }

    try {
      setLoading(true);

      const pdfItems = items.map((item) => ({
        nama: item.nama.trim(),
        rekeningNotaris: item.rekeningNotaris.trim(),
        namaNotaris: item.namaNotaris.trim(),
        rekeningTabunganDebitur: item.rekeningTabungan.trim(),
        tanggal: formatTanggalIndonesia(tanggal),
        nominal: item.nominal.trim(),
        terbilang: terbilangNominal(item.nominal),
        jenisPengikatan: item.jenisPengikatan,
        detailTransaksi: `Pembayaran Biaya ${item.jenisPengikatan} an. ${item.nama.trim()}`,
      }));

      const pdfBase64 = await createAdvisNotarisPdf(pdfItems);

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
      console.error("Gagal membuat Advis Notaris:", err);
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
    link.download = `Advis_Notaris_${tanggal || "Dokumen"}.pdf`;

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
                Advis Notaris
              </h1>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Buat beberapa Advis Notaris dalam satu dokumen PDF.
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
              Pilih cara memasukkan data Advis Notaris.
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
                  Isi data debitur dan pilih notaris.
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
                Cari menggunakan nama debitur atau nomor rekening pinjaman.
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
                  placeholder="Nama debitur atau rekening pinjaman..."
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

            {!loadingPK && !error && searched && hasilPK.length === 0 && (
              <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-6 text-center">
                <Search className="mx-auto mb-2 text-gray-400" size={25} />
                <p className="text-sm font-semibold text-gray-700">
                  Data PK tidak ditemukan.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Periksa kembali nama debitur atau nomor rekening pinjaman.
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
                  const namaNotarisPK = pk.notarisIds
                    .map((id) => notaris.find((n) => n.id === id)?.nama_notaris)
                    .filter(Boolean);

                  const jenisTersedia =
                    pk.jenisList?.length > 0 ? pk.jenisList : ["APHT", "SKMHT"];

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

                            <p className="sm:col-span-2">
                              Notaris:{" "}
                              <strong className="text-gray-800">
                                {namaNotarisPK.length
                                  ? [...new Set(namaNotarisPK)].join(", ")
                                  : "Belum terhubung"}
                              </strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {jenisTersedia.map((jenis) => (
                            <button
                              key={jenis}
                              type="button"
                              onClick={() => addPKToForm(pk, jenis)}
                              className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              <Plus size={15} />
                              Tambah {jenis}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* MASTER NOTARIS STATUS */}

        {loadingNotaris && (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            <Loader2 size={17} className="animate-spin" />
            Memuat Master Data Notaris...
          </div>
        )}

        {!loadingNotaris && notaris.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Master Data Notaris belum dapat ditampilkan. Periksa akses database
            atau isi data notaris terlebih dahulu.
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
                  setPreviewUrl("");
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
                  Setiap data akan dibuat menjadi satu halaman PDF.
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
                Data Advis Notaris
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Periksa dan lengkapi setiap data sebelum membuat PDF.
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

          {items.map((item, index) => {
            const terbilang =
              itemTerbilang.find((t) => t.id === item.id)?.value || "";

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
                        Advis Notaris {index + 1}
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
                      label="Nomor Rekening Tabungan Debitur"
                      value={item.rekeningTabungan}
                      onChange={(e) =>
                        updateItem(item.id, {
                          rekeningTabungan: e.target.value,
                        })
                      }
                      placeholder="Nomor rekening tabungan"
                      required
                    />

                    {/* NOTARIS */}

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Nama Notaris
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <select
                        value={item.notarisId}
                        onChange={(e) => selectNotaris(item.id, e.target.value)}
                        disabled={loadingNotaris || notaris.length === 0}
                        className="min-h-[46px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      >
                        <option value="">Pilih Notaris</option>

                        {notaris.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.nama_notaris}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Field
                      label="Nomor Rekening Notaris (K/)"
                      value={item.rekeningNotaris}
                      readOnly
                      placeholder="Terisi otomatis dari Master Notaris"
                      required
                    />

                    {/* JENIS PENGIKATAN */}

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Jenis Pengikatan
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <select
                        value={item.jenisPengikatan}
                        onChange={(e) =>
                          updateItem(item.id, {
                            jenisPengikatan: e.target.value,
                          })
                        }
                        className="min-h-[46px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="APHT">APHT</option>
                        <option value="SKMHT">SKMHT</option>
                      </select>
                    </div>

                    {/* NOMINAL */}

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Nominal Pembayaran
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

                  {/* KETERANGAN OTOMATIS */}

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Keterangan pada Advis
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-800">
                      Pembayaran Biaya {item.jenisPengikatan} an.{" "}
                      {item.nama || "[Nama Debitur]"}
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
                  Preview Advis Notaris
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
              {/* MOBILE 40% */}

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
                    title="Preview PDF Advis Notaris Mobile"
                    className="h-[900px] w-full border-0 bg-white"
                  />
                </div>
              </div>

              {/* DESKTOP NORMAL */}

              <iframe
                src={previewUrl}
                title="Preview PDF Advis Notaris Desktop"
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
