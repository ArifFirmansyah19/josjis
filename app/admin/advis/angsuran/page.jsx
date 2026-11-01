"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  Database,
  Search,
  CheckSquare,
  Square,
  Users,
  AlertCircle,
} from "lucide-react";

import { createAdvisPelunasanPdf } from "@/lib/advis-pdf";
import { supabase } from "@/lib/supabase";

/* =========================================================
   KONSTANTA DATA 2A
========================================================= */

const UNITS = [
  {
    id: "e2b50285-3bd4-4f78-bbde-c299f92ae1e8",
    kode: "JKK1",
    name: "Jambi Kuamang Kuning 1",
  },
  {
    id: "0baec32b-1845-45f3-bcc0-d2202b0b5976",
    kode: "JKK2",
    name: "Jambi Kuamang Kuning 2",
  },
];

const INDEX_2A = {
  norekPinjaman: 5,
  nama: 6,
  totalTunggakan: 24,
  norekTabungan: 25,
  namaMks: 30,
};

/* =========================================================
   FORMAT HURUF
========================================================= */

function toTitleCase(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\b\p{L}/gu, (huruf) => huruf.toUpperCase());
}

function textValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/* =========================================================
   FORMAT NOMINAL
========================================================= */

function formatNominal(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  // Jika sumber berupa angka JavaScript, titik adalah pemisah desimal.
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";

    return new Intl.NumberFormat("id-ID", {
      useGrouping: true,
      maximumFractionDigits: 10,
    }).format(value);
  }

  let cleaned = String(value).trim();

  if (!cleaned) return "";

  // Jika berupa teks Indonesia, contoh: 9.693.994,1
  // pertahankan koma sebagai pemisah desimal.
  cleaned = cleaned.replace(/[^\d.,-]/g, "");

  const lastComma = cleaned.lastIndexOf(",");

  if (lastComma >= 0) {
    const integerPart = cleaned.slice(0, lastComma).replace(/[.,]/g, "");

    const decimalPart = cleaned.slice(lastComma + 1).replace(/\D/g, "");

    const formattedInteger = integerPart
      ? Number(integerPart).toLocaleString("id-ID")
      : "0";

    return decimalPart
      ? `${formattedInteger},${decimalPart}`
      : formattedInteger;
  }

  // Jika teks hanya berisi angka dan titik, anggap titik sebagai
  // pemisah ribuan apabila polanya sesuai format Indonesia.
  const bagian = cleaned.split(".");

  if (bagian.length > 1 && bagian.slice(1).every((part) => part.length === 3)) {
    const integer = bagian.join("");
    return Number(integer).toLocaleString("id-ID");
  }

  // Selain itu, titik dianggap sebagai pemisah desimal.
  const angka = Number(cleaned);

  if (!Number.isFinite(angka)) return "";

  return new Intl.NumberFormat("id-ID", {
    useGrouping: true,
    maximumFractionDigits: 10,
  }).format(angka);
}

function getNominalParts(value) {
  const parts = String(value || "").split(",");

  return {
    integer: Number((parts[0] || "0").replace(/\./g, "") || 0),
    decimal: parts.length > 1 ? parts[1] : "",
  };
}

/* =========================================================
   PEMBULATAN KE ATAS KELIPATAN 1.000
========================================================= */

function bulatkanKeAtasRibuan(value) {
  const { integer, decimal } = getNominalParts(value);

  if (!Number.isSafeInteger(integer) || integer < 0) {
    return null;
  }

  const adaPecahanDesimal = decimal !== "" && /[1-9]/.test(decimal);
  const adaSisaRibuan = integer % 1000 !== 0;

  if (!adaPecahanDesimal && !adaSisaRibuan) {
    return integer;
  }

  return (Math.floor(integer / 1000) + 1) * 1000;
}

function formatRupiahBulat(value) {
  if (value === null || value === undefined) return "";

  return Number(value).toLocaleString("id-ID");
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
  if (value === null || value === undefined) return "";

  if (!Number.isSafeInteger(value) || value < 0) {
    return "Nominal tidak valid";
  }

  const hasil = `${terbilangInteger(value)} rupiah`;

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

/* =========================================================
   DATA FORM
========================================================= */

function buatDataKosong(id) {
  return {
    id,
    nama: "",
    norekPinjaman: "",
    norekTabungan: "",
    keterangan: "Pembayaran Angsuran",
    nominal: "",
  };
}

function ambilDataBaris2A(row, recordId, index) {
  const nama = textValue(row?.[INDEX_2A.nama]);
  const norekPinjaman = textValue(row?.[INDEX_2A.norekPinjaman]);
  const norekTabungan = textValue(row?.[INDEX_2A.norekTabungan]);
  const totalTunggakan = textValue(row?.[INDEX_2A.totalTunggakan]);

  return {
    key: `${recordId}-${norekPinjaman || index}`,
    nama,
    norekPinjaman,
    norekTabungan,
    nominal: formatNominal(totalTunggakan),
    namaMks: textValue(row?.[INDEX_2A.namaMks]),
  };
}

/* =========================================================
   KOMPONEN FIELD
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
   HALAMAN ADVIS ANGSURAN
========================================================= */

export default function AdvisAngsuranPage() {
  const [dataList, setDataList] = useState([buatDataKosong(1)]);

  const [tanggal, setTanggal] = useState(tanggalHariIni());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const [sumberInput, setSumberInput] = useState("manual");

  // Data 2A
  const [unitTerpilih, setUnitTerpilih] = useState("");
  const [mksTerpilih, setMksTerpilih] = useState("");
  const [data2A, setData2A] = useState([]);
  const [loading2A, setLoading2A] = useState(false);
  const [error2A, setError2A] = useState("");
  const [kataKunci, setKataKunci] = useState("");
  const [dataTerpilih, setDataTerpilih] = useState([]);

  const nextId = useRef(2);
  const iframeRef = useRef(null);

  /* =======================================================
     AMBIL DATA 2A DARI SUPABASE
  ======================================================= */

  async function muatData2A() {
    setLoading2A(true);
    setError2A("");
    setData2A([]);
    setDataTerpilih([]);
    setMksTerpilih("");

    try {
      const { data, error: queryError } = await supabase
        .from("raportmu_hasil")
        .select(
          "id, unit_id, mks_id, jenis_data, tanggal_data, nama_file, data, total_rows, updated_at",
        )
        .eq("jenis_data", "DUA_A")
        .order("updated_at", { ascending: false });

      if (queryError) throw queryError;

      const records = (data || []).filter((record) => {
        const rows = Array.isArray(record.data) ? record.data : [];
        return rows.length > 0;
      });

      setData2A(records);

      if (!records.length) {
        setError2A("Belum ada data 2A tersimpan.");
      }
    } catch (err) {
      console.error("Gagal mengambil Data 2A:", err);
      setError2A(err?.message || "Gagal mengambil Data 2A dari database.");
    } finally {
      setLoading2A(false);
    }
  }

  useEffect(() => {
    if (sumberInput === "data2a") {
      muatData2A();
    }
  }, [sumberInput]);

  /* =======================================================
     PILIHAN UNIT
  ======================================================= */

  const dataUnit = useMemo(() => {
    if (!unitTerpilih) return [];

    return data2A.filter((record) => record.unit_id === unitTerpilih);
  }, [data2A, unitTerpilih]);

  /* =======================================================
     DAFTAR MKS BERDASARKAN UNIT
  ======================================================= */

  const daftarMks = useMemo(() => {
    const hasil = new Set();

    dataUnit.forEach((record) => {
      const rows = Array.isArray(record.data) ? record.data : [];

      rows.forEach((row) => {
        const namaMks = textValue(row?.[INDEX_2A.namaMks]);
        if (namaMks) hasil.add(namaMks);
      });
    });

    return [...hasil].sort((a, b) => a.localeCompare(b, "id"));
  }, [dataUnit]);

  /* =======================================================
     DAFTAR DEBITUR DARI MKS TERPILIH
  ======================================================= */

  const daftarDebitur = useMemo(() => {
    if (!unitTerpilih || !mksTerpilih) return [];

    const hasil = [];
    const rekeningSudahAda = new Set();

    dataUnit.forEach((record) => {
      const rows = Array.isArray(record.data) ? record.data : [];

      rows.forEach((row, index) => {
        const item = ambilDataBaris2A(row, record.id, index);

        if (item.namaMks !== mksTerpilih) return;

        if (
          !item.nama ||
          !item.norekPinjaman ||
          !item.norekTabungan ||
          !item.nominal
        ) {
          return;
        }

        const rekeningKey = item.norekPinjaman;

        // Mencegah rekening yang sama tampil berulang.
        if (rekeningSudahAda.has(rekeningKey)) return;

        rekeningSudahAda.add(rekeningKey);

        hasil.push({
          ...item,
          tanggalData: record.tanggal_data,
          namaFile: record.nama_file || "",
        });
      });
    });

    return hasil;
  }, [dataUnit, unitTerpilih, mksTerpilih]);

  /* =======================================================
     FILTER PENCARIAN
  ======================================================= */

  const daftarDebiturTampil = useMemo(() => {
    const keyword = kataKunci.trim().toLowerCase();

    if (!keyword) return daftarDebitur;

    return daftarDebitur.filter((item) => {
      return (
        item.nama.toLowerCase().includes(keyword) ||
        item.norekPinjaman.toLowerCase().includes(keyword) ||
        item.norekTabungan.toLowerCase().includes(keyword)
      );
    });
  }, [daftarDebitur, kataKunci]);

  /* =======================================================
     CHECKBOX DEBITUR
  ======================================================= */

  function toggleDebitur(key) {
    setDataTerpilih((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function toggleSemuaDebitur() {
    const semuaKey = daftarDebiturTampil.map((item) => item.key);

    const semuaSudahDipilih =
      semuaKey.length > 0 &&
      semuaKey.every((key) => dataTerpilih.includes(key));

    if (semuaSudahDipilih) {
      setDataTerpilih((current) =>
        current.filter((key) => !semuaKey.includes(key)),
      );
    } else {
      setDataTerpilih((current) => [...new Set([...current, ...semuaKey])]);
    }
  }

  /* =======================================================
     MASUKKAN DATA TERPILIH KE FORM ADVIS
  ======================================================= */

  function masukkanDataTerpilih() {
    const pilihan = daftarDebitur.filter((item) =>
      dataTerpilih.includes(item.key),
    );

    if (!pilihan.length) {
      setError2A("Pilih minimal satu debitur terlebih dahulu.");
      return;
    }

    const dataBaru = pilihan.map((item) => ({
      ...buatDataKosong(nextId.current++),
      nama: toTitleCase(item.nama),
      norekPinjaman: item.norekPinjaman,
      norekTabungan: item.norekTabungan,
      keterangan: "Pembayaran Angsuran",
      nominal: item.nominal,
    }));

    setDataList((current) => {
      const dataTerisi = current.filter((item) => {
        return (
          item.nama.trim() ||
          item.norekPinjaman.trim() ||
          item.norekTabungan.trim() ||
          item.nominal.trim()
        );
      });

      const rekeningAda = new Set(
        dataTerisi.map((item) => item.norekPinjaman.trim()).filter(Boolean),
      );

      const dataYangBelumAda = dataBaru.filter(
        (item) => !rekeningAda.has(item.norekPinjaman.trim()),
      );

      return [...dataTerisi, ...dataYangBelumAda];
    });

    setError("");
    setError2A("");
    setDataTerpilih([]);
    setSumberInput("manual");
  }

  /* =======================================================
     DATA NOMINAL AKHIR DAN TERBILANG
  ======================================================= */

  const dataDenganNominal = useMemo(() => {
    return dataList.map((item) => {
      const nominalAkhir = bulatkanKeAtasRibuan(item.nominal);

      return {
        ...item,
        nominalAkhir,
        nominalDitampilkan: formatRupiahBulat(nominalAkhir),
        terbilang: terbilangNominal(nominalAkhir),
      };
    });
  }, [dataList]);

  const jumlahDataValid = dataDenganNominal.filter((item) => {
    return (
      item.nama.trim() &&
      item.norekPinjaman.trim() &&
      item.norekTabungan.trim() &&
      item.keterangan.trim() &&
      item.nominal.trim() &&
      item.nominalAkhir !== null &&
      item.nominalAkhir > 0 &&
      item.terbilang !== "Nominal tidak valid"
    );
  }).length;

  const canPreview =
    dataList.length > 0 &&
    jumlahDataValid === dataList.length &&
    Boolean(tanggal);

  /* =======================================================
     TAMBAH DATA MANUAL
  ======================================================= */

  function tambahData() {
    const id = nextId.current++;

    setDataList((current) => [...current, buatDataKosong(id)]);
    setError("");
  }

  /* =======================================================
     HAPUS DATA
  ======================================================= */

  function hapusData(id) {
    if (dataList.length <= 1) {
      setError("Minimal harus ada satu data Advis Angsuran.");
      return;
    }

    setDataList((current) => current.filter((item) => item.id !== id));
    setError("");
  }

  /* =======================================================
     UPDATE DATA
  ======================================================= */

  function updateData(id, field, value) {
    setDataList((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );

    setError("");
  }

  /* =======================================================
     BERSIHKAN PREVIEW
  ======================================================= */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /* =======================================================
     BUAT PDF GABUNGAN
  ======================================================= */

  async function handlePreview() {
    setError("");

    if (!canPreview) {
      setError(
        "Mohon lengkapi seluruh data. Pastikan setiap nominal sudah benar.",
      );
      return;
    }

    try {
      setLoading(true);

      const pdfGabungan = await PDFDocument.create();

      for (let index = 0; index < dataDenganNominal.length; index++) {
        const item = dataDenganNominal[index];

        const pdfBase64 = await createAdvisPelunasanPdf({
          nama: item.nama.trim(),
          norekPinjaman: item.norekPinjaman.trim(),
          norekTabungan: item.norekTabungan.trim(),
          tanggal: formatTanggalIndonesia(tanggal),
          nominal: item.nominalDitampilkan,
          terbilang: item.terbilang,
          detailTransaksi: item.keterangan.trim(),
        });

        if (!pdfBase64) {
          throw new Error(
            `PDF untuk data ke-${index + 1} tidak berhasil dibuat.`,
          );
        }

        const pdfSumber = await PDFDocument.load(base64ToBytes(pdfBase64));

        const halaman = await pdfGabungan.copyPages(
          pdfSumber,
          pdfSumber.getPageIndices(),
        );

        halaman.forEach((page) => {
          pdfGabungan.addPage(page);
        });
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
      console.error("Gagal membuat Advis Angsuran:", err);
      setError(err?.message || "Gagal membuat PDF Advis Angsuran.");
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     DOWNLOAD PDF
  ======================================================= */

  function handleDownload() {
    if (!previewUrl) return;

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `Advis_Angsuran_${dataList.length}_Data.pdf`;

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
    setDataList([buatDataKosong(nextId.current++)]);
    setTanggal(tanggalHariIni());
    setError("");
    setError2A("");
    setDataTerpilih([]);

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
              href="/admin/advis"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-100"
              title="Kembali"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Advis Angsuran
              </h1>

              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Buat beberapa Advis Angsuran dalam satu file PDF.
              </p>
            </div>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText size={22} />
          </div>
        </div>

        {/* INFORMASI JUMLAH DATA */}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Data Advis Angsuran
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Setiap data akan menjadi satu halaman PDF.
            </p>
          </div>

          <div className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-700">
            {dataList.length} Data
          </div>
        </div>

        {/* PILIH SUMBER DATA */}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-3 font-bold text-gray-900">Sumber Data Advis</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSumberInput("manual")}
              className={`flex min-h-[58px] items-center gap-3 rounded-xl border px-4 text-left transition ${
                sumberInput === "manual"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FileText size={20} />
              <span>
                <span className="block text-sm font-bold">Input Manual</span>
                <span className="mt-1 block text-xs opacity-75">
                  Isi data debitur satu per satu
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSumberInput("data2a")}
              className={`flex min-h-[58px] items-center gap-3 rounded-xl border px-4 text-left transition ${
                sumberInput === "data2a"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Database size={20} />
              <span>
                <span className="block text-sm font-bold">
                  Ambil dari Data 2A
                </span>
                <span className="mt-1 block text-xs opacity-75">
                  Pilih debitur dari data tersimpan
                </span>
              </span>
            </button>
          </div>
        </section>

        {/* PANEL DATA 2A */}

        {sumberInput === "data2a" && (
          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">
                  Ambil Debitur dari Data 2A
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Pilih unit, MKS, kemudian centang debitur yang akan
                  dimasukkan.
                </p>
              </div>

              <button
                type="button"
                onClick={muatData2A}
                disabled={loading2A}
                className="flex min-h-[40px] items-center gap-2 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading2A ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                Muat Ulang
              </button>
            </div>

            {loading2A && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 py-8 text-sm text-gray-500">
                <Loader2 size={18} className="animate-spin" />
                Mengambil data 2A...
              </div>
            )}

            {!loading2A && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Unit
                    </label>

                    <select
                      value={unitTerpilih}
                      onChange={(e) => {
                        setUnitTerpilih(e.target.value);
                        setMksTerpilih("");
                        setDataTerpilih([]);
                        setKataKunci("");
                      }}
                      className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Pilih Unit</option>
                      {UNITS.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.kode} — {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      MKS
                    </label>

                    <select
                      value={mksTerpilih}
                      onChange={(e) => {
                        setMksTerpilih(e.target.value);
                        setDataTerpilih([]);
                        setKataKunci("");
                      }}
                      disabled={!unitTerpilih}
                      className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    >
                      <option value="">Pilih MKS</option>
                      {daftarMks.map((mks) => (
                        <option key={mks} value={mks}>
                          {mks}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {unitTerpilih && daftarMks.length === 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Tidak ditemukan nama MKS pada Data 2A untuk unit ini.
                  </div>
                )}

                {mksTerpilih && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 p-3">
                      <div className="flex items-center gap-2 text-sm text-blue-900">
                        <Users size={17} />
                        <span className="font-semibold">{mksTerpilih}</span>
                      </div>

                      <span className="text-xs font-semibold text-blue-700">
                        {daftarDebitur.length} Debitur
                      </span>
                    </div>

                    <div className="relative">
                      <Search
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={kataKunci}
                        onChange={(e) => setKataKunci(e.target.value)}
                        placeholder="Cari nama atau nomor rekening..."
                        className="min-h-[44px] w-full rounded-xl border border-gray-300 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={toggleSemuaDebitur}
                        disabled={!daftarDebiturTampil.length}
                        className="flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-40"
                      >
                        {daftarDebiturTampil.length > 0 &&
                        daftarDebiturTampil.every((item) =>
                          dataTerpilih.includes(item.key),
                        ) ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                        Centang Semua yang Ditampilkan
                      </button>

                      <span className="text-xs text-gray-500">
                        {dataTerpilih.length} dipilih
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      {daftarDebiturTampil.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          Tidak ada debitur yang cocok.
                        </div>
                      ) : (
                        <div className="max-h-[440px] divide-y divide-gray-100 overflow-y-auto">
                          {daftarDebiturTampil.map((item) => {
                            const checked = dataTerpilih.includes(item.key);

                            return (
                              <label
                                key={item.key}
                                className={`flex cursor-pointer items-start gap-3 p-4 transition hover:bg-gray-50 ${
                                  checked ? "bg-blue-50/60" : "bg-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleDebitur(item.key)}
                                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                                />

                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-gray-900">
                                    {item.nama}
                                  </p>

                                  <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-gray-500 sm:grid-cols-2">
                                    <p>
                                      Rek. Pinjaman:{" "}
                                      <span className="font-medium text-gray-700">
                                        {item.norekPinjaman}
                                      </span>
                                    </p>
                                    <p>
                                      Rek. Tabungan:{" "}
                                      <span className="font-medium text-gray-700">
                                        {item.norekTabungan}
                                      </span>
                                    </p>
                                  </div>

                                  <p className="mt-2 text-sm font-bold text-blue-700">
                                    Total Tunggakan: Rp{item.nominal}
                                  </p>

                                  {item.namaFile && (
                                    <p className="mt-1 truncate text-[11px] text-gray-400">
                                      Sumber: {item.namaFile}
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {error2A && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <AlertCircle size={17} className="mt-0.5 shrink-0" />
                        {error2A}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={masukkanDataTerpilih}
                      disabled={dataTerpilih.length === 0}
                      className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus size={18} />
                      Masukkan {dataTerpilih.length} Debitur ke Tabel Advis
                    </button>
                  </>
                )}
              </>
            )}

            {error2A && !mksTerpilih && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                {error2A}
              </div>
            )}
          </section>
        )}

        {/* TANGGAL ADVIS */}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Tanggal Advis
            <span className="ml-1 text-red-500">*</span>
          </label>

          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-sm"
            required
          />

          <p className="mt-2 text-xs text-gray-500">
            Tanggal dokumen:{" "}
            <strong className="text-gray-700">
              {formatTanggalIndonesia(tanggal)}
            </strong>
          </p>
        </section>

        {/* DAFTAR FORM DATA */}

        {dataDenganNominal.map((item, index) => (
          <section
            key={item.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
              <div>
                <h2 className="font-bold text-gray-900">
                  Data Angsuran {index + 1}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Halaman PDF {index + 1}
                </p>
              </div>

              {dataList.length > 1 && (
                <button
                  type="button"
                  onClick={() => hapusData(item.id)}
                  disabled={loading}
                  className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Hapus
                </button>
              )}
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field
                  label="Nama Debitur"
                  value={item.nama}
                  onChange={(e) =>
                    updateData(item.id, "nama", toTitleCase(e.target.value))
                  }
                  placeholder="Masukkan nama debitur"
                  required
                />

                <Field
                  label="Nomor Rekening Pinjaman"
                  value={item.norekPinjaman}
                  onChange={(e) =>
                    updateData(item.id, "norekPinjaman", e.target.value)
                  }
                  placeholder="Nomor rekening pinjaman"
                  required
                />

                <Field
                  label="Nomor Rekening Tabungan"
                  value={item.norekTabungan}
                  onChange={(e) =>
                    updateData(item.id, "norekTabungan", e.target.value)
                  }
                  placeholder="Nomor rekening tabungan"
                  required
                />

                <Field
                  label="Keterangan"
                  value={item.keterangan}
                  onChange={(e) =>
                    updateData(
                      item.id,
                      "keterangan",
                      toTitleCase(e.target.value),
                    )
                  }
                  placeholder="Pembayaran Angsuran"
                  required
                />

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Nominal Angsuran
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
                        updateData(
                          item.id,
                          "nominal",
                          formatNominal(e.target.value),
                        )
                      }
                      placeholder="0"
                      className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Nominal pada Advis
                    </p>

                    <p className="text-lg font-bold text-gray-900">
                      {item.nominalAkhir !== null && item.nominal
                        ? `Rp${item.nominalDitampilkan}`
                        : "Rp0"}
                    </p>

                    <div className="mt-3 border-t border-blue-100 pt-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                        Terbilang
                      </p>

                      <p className="text-sm font-medium leading-relaxed text-gray-800">
                        {item.terbilang ||
                          "Terbilang akan muncul setelah nominal diisi."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* TAMBAH DATA */}

        <button
          type="button"
          onClick={tambahData}
          disabled={loading}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-white px-4 text-sm font-bold text-blue-700 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
        >
          <Plus size={19} />
          Tambah Data Angsuran
        </button>

        {/* ERROR */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* TOMBOL FORM */}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={resetForm}
            disabled={loading}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Reset Semua Data
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
                Membuat {dataList.length} Halaman...
              </>
            ) : (
              <>
                <Eye size={17} />
                Tampilkan Preview PDF ({dataList.length} Data)
              </>
            )}
          </button>
        </div>

        {/* PREVIEW PDF */}

        {previewUrl && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="font-bold text-gray-900">
                  Preview Advis Angsuran
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {dataList.length} data dalam satu file PDF, {dataList.length}{" "}
                  halaman.
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

            <div className="w-full overflow-hidden bg-gray-200 p-2 sm:p-4">
              <div className="mx-auto w-full max-w-[900px] overflow-hidden rounded-lg bg-white shadow-sm">
                <div className="block w-full overflow-hidden sm:hidden">
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
                      title="Preview PDF Advis Angsuran Mobile"
                      className="block h-[900px] w-full border-0 bg-white"
                    />
                  </div>
                </div>

                <iframe
                  src={previewUrl}
                  title="Preview PDF Advis Angsuran Desktop"
                  className="hidden h-[80vh] min-h-[650px] w-full border-0 bg-white sm:block"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 sm:px-6">
              Setiap data dicetak pada halaman tersendiri. Periksa seluruh
              halaman sebelum mengunduh atau mencetak.
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

/* =========================================================
   BASE64 DAN PDF
========================================================= */

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
