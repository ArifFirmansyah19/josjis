"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calculator,
  Check,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  WalletCards,
  X,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";

// ============================================================
// HELPER TERBILANG
// ============================================================

const ANGKA_TERBILANG = [
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
  let n = Math.floor(Math.abs(Number(value)));

  if (!Number.isFinite(n)) {
    return "";
  }

  if (n < 12) {
    return ANGKA_TERBILANG[n];
  }

  if (n < 20) {
    return `${terbilangInteger(n - 10)} belas`;
  }

  if (n < 100) {
    const puluh = Math.floor(n / 10);
    const satuan = n % 10;

    return `${terbilangInteger(puluh)} puluh${
      satuan ? ` ${terbilangInteger(satuan)}` : ""
    }`;
  }

  if (n < 200) {
    return `seratus${n > 100 ? ` ${terbilangInteger(n - 100)}` : ""}`;
  }

  if (n < 1000) {
    const ratus = Math.floor(n / 100);
    const sisa = n % 100;

    return `${terbilangInteger(ratus)} ratus${
      sisa ? ` ${terbilangInteger(sisa)}` : ""
    }`;
  }

  if (n < 2000) {
    return `seribu${n > 1000 ? ` ${terbilangInteger(n - 1000)}` : ""}`;
  }

  if (n < 1_000_000) {
    const ribu = Math.floor(n / 1000);
    const sisa = n % 1000;

    return `${terbilangInteger(ribu)} ribu${
      sisa ? ` ${terbilangInteger(sisa)}` : ""
    }`;
  }

  if (n < 2_000_000) {
    return `satu juta${
      n > 1_000_000 ? ` ${terbilangInteger(n - 1_000_000)}` : ""
    }`;
  }

  if (n < 1_000_000_000) {
    const juta = Math.floor(n / 1_000_000);
    const sisa = n % 1_000_000;

    return `${terbilangInteger(juta)} juta${
      sisa ? ` ${terbilangInteger(sisa)}` : ""
    }`;
  }

  if (n < 2_000_000_000) {
    return `satu miliar${
      n > 1_000_000_000 ? ` ${terbilangInteger(n - 1_000_000_000)}` : ""
    }`;
  }

  if (n < 1_000_000_000_000) {
    const miliar = Math.floor(n / 1_000_000_000);
    const sisa = n % 1_000_000_000;

    return `${terbilangInteger(miliar)} miliar${
      sisa ? ` ${terbilangInteger(sisa)}` : ""
    }`;
  }

  if (n < 2_000_000_000_000) {
    return `satu triliun${
      n > 1_000_000_000_000 ? ` ${terbilangInteger(n - 1_000_000_000_000)}` : ""
    }`;
  }

  if (n < 1_000_000_000_000_000) {
    const triliun = Math.floor(n / 1_000_000_000_000);
    const sisa = n % 1_000_000_000_000;

    return `${terbilangInteger(triliun)} triliun${
      sisa ? ` ${terbilangInteger(sisa)}` : ""
    }`;
  }

  return String(n);
}

// ============================================================
// TERBILANG NOMINAL EXACT
//
// Contoh:
// 49.050.005,02
// menjadi:
// empat puluh sembilan juta lima puluh ribu lima koma dua rupiah
//
// TIDAK menggunakan istilah "sen".
// ============================================================

function terbilangRupiahExact(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "";
  }

  let raw = String(value).replace(/rp/gi, "").replace(/\s/g, "").trim();

  // Hilangkan titik ribuan.
  raw = raw.replace(/\./g, "");

  const parts = raw.split(",");

  let integerPart = parts[0] || "0";

  // Jika ada lebih dari satu koma, gabungkan bagian desimal.
  let decimalPart = parts.length > 1 ? parts.slice(1).join("") : "";

  integerPart = integerPart.replace(/\D/g, "");
  decimalPart = decimalPart.replace(/\D/g, "");

  if (!integerPart) {
    integerPart = "0";
  }

  integerPart = integerPart.replace(/^0+(?=\d)/, "");

  const integerNumber = Number(integerPart);

  if (!Number.isFinite(integerNumber)) {
    return "";
  }

  let hasil = terbilangInteger(integerNumber);

  if (decimalPart) {
    // Contoh:
    // 02 -> 2
    // 20 -> 20
    // 50 -> 50
    const decimalNumber = Number(decimalPart);

    if (Number.isFinite(decimalNumber) && decimalNumber > 0) {
      hasil += ` koma ${terbilangInteger(decimalNumber)}`;
    }
  }

  return `${hasil} rupiah`;
}

// ============================================================
// PARSE NOMINAL INDONESIA
//
// 50.000.000       -> 50000000
// 1.250.000        -> 1250000
// 49.050.005,02    -> 49050005.02
// ============================================================

function parseNominalIndonesia(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return 0;
  }

  let raw = String(value).replace(/rp/gi, "").replace(/\s/g, "").trim();

  if (!raw) {
    return 0;
  }

  if (raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else {
    raw = raw.replace(/\./g, "");
  }

  raw = raw.replace(/[^\d.-]/g, "");

  const result = Number(raw);

  return Number.isFinite(result) ? result : 0;
}

// ============================================================
// FORMAT NOMINAL DI INPUT
//
// User mengetik:
// 50000000
//
// Input tampil:
// 50.000.000
//
// Tetapi state tetap:
// 50000000
//
// Untuk desimal:
// 49050005,02
//
// tampil:
// 49.050.005,02
//
// state:
// 49050005,02
// ============================================================

function formatNominalInput(value) {
  if (value === null || value === undefined || String(value) === "") {
    return "";
  }

  let raw = String(value);

  // Hanya izinkan angka dan koma.
  raw = raw.replace(/[^\d,]/g, "");

  if (!raw) {
    return "";
  }

  const commaIndex = raw.indexOf(",");

  let integerPart;
  let decimalPart = "";

  if (commaIndex >= 0) {
    integerPart = raw.slice(0, commaIndex);

    decimalPart = raw.slice(commaIndex + 1).replace(/,/g, "");
  } else {
    integerPart = raw;
  }

  integerPart = integerPart.replace(/\D/g, "");

  if (!integerPart) {
    integerPart = "0";
  }

  // Buang nol depan kecuali hanya "0".
  integerPart = integerPart.replace(/^0+(?=\d)/, "");

  const formattedInteger = Number(integerPart).toLocaleString("id-ID");

  if (commaIndex >= 0) {
    return `${formattedInteger},${decimalPart}`;
  }

  return formattedInteger;
}

// ============================================================
// NORMALISASI INPUT NOMINAL
//
// Dipakai supaya nilai internal bersih.
// Tidak menghilangkan koma desimal Pelunasan.
// ============================================================

function normalizeNominalInput(value) {
  if (value === null || value === undefined) {
    return "";
  }

  let raw = String(value);

  raw = raw.replace(/[^\d,]/g, "");

  const commaIndex = raw.indexOf(",");

  if (commaIndex === -1) {
    return raw;
  }

  const integerPart = raw.slice(0, commaIndex).replace(/\D/g, "");

  const decimalPart = raw.slice(commaIndex + 1).replace(/\D/g, "");

  return `${integerPart},${decimalPart}`;
}

// ============================================================
// INPUT NOMINAL
// ============================================================

function NominalInput({ value, onChange, placeholder = "0" }) {
  function handleChange(event) {
    const cleanValue = normalizeNominalInput(event.target.value);

    onChange(cleanValue);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={formatNominalInput(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
    />
  );
}

// ============================================================
// BULAT KE ATAS RP1.000
// ============================================================

function roundUpThousand(value) {
  const number = parseNominalIndonesia(value);

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return Math.ceil(number / 1000) * 1000;
}

// ============================================================
// FORMAT RUPIAH INTEGER
// ============================================================

function formatRupiah(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Rp0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
}

// ============================================================
// FORMAT RUPIAH EXACT
//
// 49050005,02
// -> Rp49.050.005,02
//
// Tidak mengubah desimal.
// ============================================================

function formatRupiahExact(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "Rp0";
  }

  let raw = String(value).replace(/rp/gi, "").replace(/\s/g, "").trim();

  raw = raw.replace(/[^\d,]/g, "");

  if (!raw) {
    return "Rp0";
  }

  const parts = raw.split(",");

  let integerPart = parts[0] || "0";

  const decimalPart = parts.length > 1 ? parts.slice(1).join("") : "";

  integerPart = integerPart.replace(/\./g, "");
  integerPart = integerPart.replace(/\D/g, "");

  if (!integerPart) {
    integerPart = "0";
  }

  integerPart = integerPart.replace(/^0+(?=\d)/, "");

  const formattedInteger = Number(integerPart).toLocaleString("id-ID");

  return decimalPart
    ? `Rp${formattedInteger},${decimalPart}`
    : `Rp${formattedInteger}`;
}

// ============================================================
// DATA DUMMY 2A
// ============================================================

const dummy2AJKK1 = [
  {
    id: "2a-jkk1-001",
    nama: "Budi Santoso",
    norek: "11081A000123456",
    tunggakan: 1_250_000,
  },
  {
    id: "2a-jkk1-002",
    nama: "Andi Saputra",
    norek: "11081A000123457",
    tunggakan: 2_350_000,
  },
  {
    id: "2a-jkk1-003",
    nama: "Siti Aminah",
    norek: "11081A000123458",
    tunggakan: 875_500,
  },
  {
    id: "2a-jkk1-004",
    nama: "Dedi Irawan",
    norek: "11081A000123459",
    tunggakan: 1_005_000,
  },
];

const dummy2AJKK2 = [
  {
    id: "2a-jkk2-001",
    nama: "Rudi Hartono",
    norek: "11081B000223456",
    tunggakan: 1_750_000,
  },
  {
    id: "2a-jkk2-002",
    nama: "Yuli Astuti",
    norek: "11081B000223457",
    tunggakan: 925_000,
  },
  {
    id: "2a-jkk2-003",
    nama: "Hendra Wijaya",
    norek: "11081B000223458",
    tunggakan: 3_125_000,
  },
];

// ============================================================
// DATA DUMMY EASY CALL
// ============================================================

const dummyEasyCallJKK1 = [
  {
    id: "ec-jkk1-001",
    unit: "JKK 1",
    nama: "Budi Santoso",
    norek: "11081A000123456",
    nominal: 1_250_000,
  },
  {
    id: "ec-jkk1-002",
    unit: "JKK 1",
    nama: "Siti Aminah",
    norek: "11081A000123458",
    nominal: 875_500,
  },
];

const dummyEasyCallJKK2 = [
  {
    id: "ec-jkk2-001",
    unit: "JKK 2",
    nama: "Rudi Hartono",
    norek: "11081B000223456",
    nominal: 1_750_000,
  },
  {
    id: "ec-jkk2-002",
    unit: "JKK 2",
    nama: "Hendra Wijaya",
    norek: "11081B000223458",
    nominal: 3_125_000,
  },
];

// ============================================================
// MENU CARD
// ============================================================

function MenuCard({ icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
        <Icon size={22} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-900">{title}</div>

        <div className="mt-0.5 text-sm text-slate-500">{description}</div>
      </div>

      <ChevronRight
        size={20}
        className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5"
      />
    </button>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function CetakAdvisPage() {
  const { activeUnit } = useUnit();

  const [mode, setMode] = useState(null);

  // ==========================================================
  // MANUAL
  // ==========================================================

  const [manualRows, setManualRows] = useState([
    {
      id: 1,
      nama: "",
      norek: "",
      nominal: "",
      keterangan: "",
    },
  ]);

  // ==========================================================
  // PELUNASAN
  // ==========================================================

  const [pelunasanRows, setPelunasanRows] = useState([
    {
      id: 1,
      nama: "",
      norek: "",
      nominal: "",
      keterangan: "",
    },
  ]);

  // ==========================================================
  // 2A
  // ==========================================================

  const [sumber2A, setSumber2A] = useState("JKK1");

  const [selected2A, setSelected2A] = useState([]);

  const [saldo2A, setSaldo2A] = useState({});

  // ==========================================================
  // EASY CALL
  // ==========================================================

  const [selectedEC, setSelectedEC] = useState([]);

  // ==========================================================
  // SEARCH
  // ==========================================================

  const [search2A, setSearch2A] = useState("");

  const [searchEC, setSearchEC] = useState("");

  // ==========================================================
  // DATA 2A
  // ==========================================================

  const data2A = useMemo(() => {
    return sumber2A === "JKK1" ? dummy2AJKK1 : dummy2AJKK2;
  }, [sumber2A]);

  // ==========================================================
  // DATA EASY CALL
  // ==========================================================

  const dataEasyCall = useMemo(() => {
    return [...dummyEasyCallJKK1, ...dummyEasyCallJKK2];
  }, []);

  // ==========================================================
  // FILTER 2A
  // ==========================================================

  const filtered2A = useMemo(() => {
    const keyword = search2A.trim().toLowerCase();

    if (!keyword) {
      return data2A;
    }

    return data2A.filter((item) => {
      return (
        item.nama.toLowerCase().includes(keyword) ||
        item.norek.toLowerCase().includes(keyword)
      );
    });
  }, [data2A, search2A]);

  // ==========================================================
  // FILTER EASY CALL
  // ==========================================================

  const filteredEC = useMemo(() => {
    const keyword = searchEC.trim().toLowerCase();

    if (!keyword) {
      return dataEasyCall;
    }

    return dataEasyCall.filter((item) => {
      return (
        item.nama.toLowerCase().includes(keyword) ||
        item.norek.toLowerCase().includes(keyword) ||
        item.unit.toLowerCase().includes(keyword)
      );
    });
  }, [dataEasyCall, searchEC]);

  // ==========================================================
  // MANUAL
  // ==========================================================

  function tambahManual() {
    setManualRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        nama: "",
        norek: "",
        nominal: "",
        keterangan: "",
      },
    ]);
  }

  function hapusManual(id) {
    setManualRows((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return prev.filter((item) => item.id !== id);
    });
  }

  function updateManual(id, field, value) {
    setManualRows((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  // ==========================================================
  // PELUNASAN
  // ==========================================================

  function tambahPelunasan() {
    setPelunasanRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        nama: "",
        norek: "",
        nominal: "",
        keterangan: "",
      },
    ]);
  }

  function hapusPelunasan(id) {
    setPelunasanRows((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return prev.filter((item) => item.id !== id);
    });
  }

  function updatePelunasan(id, field, value) {
    setPelunasanRows((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  // ==========================================================
  // 2A
  // ==========================================================

  function toggle2A(id) {
    setSelected2A((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function updateSaldo2A(id, value) {
    setSaldo2A((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  function selectAll2A() {
    const ids = filtered2A.map((item) => item.id);

    const semuaDipilih =
      ids.length > 0 && ids.every((id) => selected2A.includes(id));

    if (semuaDipilih) {
      setSelected2A((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelected2A((prev) => [...new Set([...prev, ...ids])]);
    }
  }

  // ==========================================================
  // HITUNG TAMBAHAN SALDO 2A
  // ==========================================================

  function hitungTambahanSaldo2A(item) {
    const saldo = parseNominalIndonesia(saldo2A[item.id] || 0);

    const minimumBalance = 100_000;

    if (saldo >= minimumBalance) {
      return 0;
    }

    return minimumBalance - saldo;
  }

  // ==========================================================
  // HITUNG NOMINAL 2A
  // ==========================================================

  function hitungNominal2A(item) {
    const tambahanSaldo = hitungTambahanSaldo2A(item);

    const total = Number(item.tunggakan || 0) + tambahanSaldo;

    return roundUpThousand(total);
  }

  // ==========================================================
  // EASY CALL
  // ==========================================================

  function toggleEC(id) {
    setSelectedEC((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function selectAllEC() {
    const ids = filteredEC.map((item) => item.id);

    const semuaDipilih =
      ids.length > 0 && ids.every((id) => selectedEC.includes(id));

    if (semuaDipilih) {
      setSelectedEC((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedEC((prev) => [...new Set([...prev, ...ids])]);
    }
  }

  // ==========================================================
  // GENERATE MANUAL
  // ==========================================================

  function generateManual() {
    const hasil = manualRows
      .filter(
        (item) =>
          item.nama.trim() ||
          item.norek.trim() ||
          item.nominal.trim() ||
          item.keterangan.trim(),
      )
      .map((item) => {
        const nominal = roundUpThousand(item.nominal);

        return {
          nama: item.nama,
          norek: item.norek,
          nominal,
          nominalDisplay: formatRupiah(nominal),
          terbilang: terbilangRupiahExact(String(nominal)),
          keterangan: item.keterangan,
          tanggal: new Date().toISOString().slice(0, 10),
        };
      });

    if (!hasil.length) {
      alert("Belum ada data Advis Manual.");
      return;
    }

    console.log("HASIL ADVIS MANUAL:", hasil);

    alert(
      `Data Advis Manual siap dibuat.\n\nJumlah data: ${hasil.length}\n\nTemplate Excel akan dihubungkan setelah template di-upload.`,
    );
  }

  // ==========================================================
  // GENERATE 2A
  // ==========================================================

  function generate2A() {
    const dataTerpilih = data2A
      .filter((item) => selected2A.includes(item.id))
      .map((item) => {
        const saldo = parseNominalIndonesia(saldo2A[item.id] || 0);

        const tambahanSaldo = hitungTambahanSaldo2A(item);

        const nominal = hitungNominal2A(item);

        return {
          sumber: sumber2A,
          nama: item.nama,
          norek: item.norek,
          tunggakan: item.tunggakan,
          saldoSekarang: saldo,
          tambahanSaldo,
          nominal,
          nominalDisplay: formatRupiah(nominal),
          terbilang: terbilangRupiahExact(String(nominal)),
          keterangan:
            tambahanSaldo > 0
              ? "2A + penyesuaian saldo minimum Rp100.000"
              : "2A",
          tanggal: new Date().toISOString().slice(0, 10),
        };
      });

    if (!dataTerpilih.length) {
      alert("Pilih minimal satu data 2A.");
      return;
    }

    console.log("HASIL ADVIS 2A:", dataTerpilih);

    alert(
      `Data Advis 2A siap dibuat.\n\nSumber: ${sumber2A}\nJumlah data: ${dataTerpilih.length}\n\nTemplate Excel akan dihubungkan setelah template di-upload.`,
    );
  }

  // ==========================================================
  // GENERATE EASY CALL
  // ==========================================================

  function generateEasyCall() {
    const dataTerpilih = dataEasyCall
      .filter((item) => selectedEC.includes(item.id))
      .map((item) => ({
        sumber: "EASY CALL",
        unit: item.unit,
        nama: item.nama,
        norek: item.norek,

        // EC mengikuti nominal sumber.
        nominal: item.nominal,

        nominalDisplay: formatRupiah(item.nominal),

        terbilang: terbilangRupiahExact(String(item.nominal)),

        keterangan: "Easy Call",

        tanggal: new Date().toISOString().slice(0, 10),
      }));

    if (!dataTerpilih.length) {
      alert("Pilih minimal satu data Easy Call.");
      return;
    }

    console.log("HASIL ADVIS EASY CALL:", dataTerpilih);

    alert(
      `Data Advis Easy Call siap dibuat.\n\nSumber: JKK 1 + JKK 2\nJumlah data: ${dataTerpilih.length}\n\nTemplate Excel akan dihubungkan setelah template di-upload.`,
    );
  }

  // ==========================================================
  // GENERATE PELUNASAN
  // ==========================================================

  function generatePelunasan() {
    const hasil = pelunasanRows
      .filter(
        (item) =>
          item.nama.trim() ||
          item.norek.trim() ||
          item.nominal.trim() ||
          item.keterangan.trim(),
      )
      .map((item) => {
        // PENTING:
        // Jangan Number().
        // Nominal harus dipertahankan persis.
        const nominalRaw = item.nominal.trim();

        return {
          nama: item.nama,
          norek: item.norek,

          nominal: nominalRaw,

          nominalDisplay: formatRupiahExact(nominalRaw),

          terbilang: terbilangRupiahExact(nominalRaw),

          keterangan: item.keterangan,

          tanggal: new Date().toISOString().slice(0, 10),
        };
      });

    if (!hasil.length) {
      alert("Belum ada data Advis Pelunasan.");
      return;
    }

    const nominalKosong = hasil.some((item) => !item.nominal);

    if (nominalKosong) {
      alert("Nominal Pelunasan belum diisi.");
      return;
    }

    console.log("HASIL ADVIS PELUNASAN:", hasil);

    alert(
      `Data Advis Pelunasan siap dibuat.\n\nJumlah data: ${hasil.length}\n\nNominal tidak dibulatkan dan desimal dipertahankan.`,
    );
  }

  // ==========================================================
  // RESET 2A
  // ==========================================================

  function reset2A() {
    setSelected2A([]);
    setSaldo2A({});
    setSearch2A("");
  }

  // ==========================================================
  // HEADER
  // ==========================================================

  const unitLabel =
    activeUnit?.nama_unit ||
    activeUnit?.nama ||
    activeUnit?.kode_unit ||
    "Unit";

  const tanggalHariIni = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // ==========================================================
  // LANDING
  // ==========================================================

  function renderLanding() {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cetak Advis</h1>

          <p className="mt-1 text-sm text-slate-500">
            Pilih jenis advis yang akan dibuat.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <MenuCard
            icon={FileText}
            title="Advis Manual"
            description="Input data transaksi secara manual."
            onClick={() => setMode("manual")}
          />

          <MenuCard
            icon={FileSpreadsheet}
            title="Advis 2A"
            description="Ambil data 2A dari JKK 1 atau JKK 2."
            onClick={() => setMode("2a")}
          />

          <MenuCard
            icon={WalletCards}
            title="Advis EC / Easy Call"
            description="Gabungkan data Easy Call JKK 1 dan JKK 2."
            onClick={() => setMode("easycall")}
          />

          <MenuCard
            icon={Calculator}
            title="Advis Pelunasan"
            description="Input nominal pelunasan tanpa pembulatan."
            onClick={() => setMode("pelunasan")}
          />
        </div>
      </div>
    );
  }

  // ==========================================================
  // HEADER MODE
  // ==========================================================

  function renderModeHeader(title, description) {
    return (
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setMode(null)}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Kembali"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>

            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
          {unitLabel}
        </div>
      </div>
    );
  }

  // ==========================================================
  // MANUAL UI
  // ==========================================================

  function renderManual() {
    return (
      <div>
        {renderModeHeader(
          "Advis Manual",
          "Input transaksi secara manual. Nominal dibulatkan ke atas kelipatan Rp1.000.",
        )}

        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="font-semibold">Ketentuan nominal</div>

          <div className="mt-1">
            Nominal bebas diinput. Sistem membulatkan ke atas ke kelipatan
            Rp1.000.
          </div>

          <div className="mt-1">
            Contoh: <b>Rp4.500 → Rp5.000</b>
          </div>
        </div>

        <div className="space-y-4">
          {manualRows.map((row, index) => {
            const nominalHasil = roundUpThousand(row.nominal);

            return (
              <div
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="font-semibold text-slate-900">
                    Data {index + 1}
                  </div>

                  <button
                    type="button"
                    onClick={() => hapusManual(row.id)}
                    disabled={manualRows.length <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Nama Debitur
                    </label>

                    <input
                      type="text"
                      value={row.nama}
                      onChange={(e) =>
                        updateManual(row.id, "nama", e.target.value)
                      }
                      placeholder="Nama debitur"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      No. Rekening Pinjaman
                    </label>

                    <input
                      type="text"
                      value={row.norek}
                      onChange={(e) =>
                        updateManual(row.id, "norek", e.target.value)
                      }
                      placeholder="No. rekening"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Nominal Transaksi
                    </label>

                    <NominalInput
                      value={row.nominal}
                      onChange={(value) =>
                        updateManual(row.id, "nominal", value)
                      }
                    />

                    {row.nominal && (
                      <div className="mt-2 text-right text-xs text-slate-500">
                        Menjadi:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatRupiah(nominalHasil)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Keterangan Transaksi
                    </label>

                    <input
                      type="text"
                      value={row.keterangan}
                      onChange={(e) =>
                        updateManual(row.id, "keterangan", e.target.value)
                      }
                      placeholder="Keterangan"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={tambahManual}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={17} />
            Tambah Data
          </button>

          <button
            type="button"
            onClick={generateManual}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <FileText size={17} />
            Buat Advis
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // 2A UI
  // ==========================================================

  function render2A() {
    return (
      <div>
        {renderModeHeader(
          "Advis 2A",
          "Pilih sumber JKK, kemudian pilih data 2A yang akan dibuat.",
        )}

        <div className="mb-4 grid gap-3 md:grid-cols-[auto_1fr_auto]">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => {
                setSumber2A("JKK1");
                reset2A();
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                sumber2A === "JKK1"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              JKK 1
            </button>

            <button
              type="button"
              onClick={() => {
                setSumber2A("JKK2");
                reset2A();
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                sumber2A === "JKK2"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              JKK 2
            </button>
          </div>

          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search2A}
              onChange={(e) => setSearch2A(e.target.value)}
              placeholder="Cari nama atau nomor rekening..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={selectAll2A}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Check size={17} />
            Pilih Semua
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="font-semibold">Aturan saldo 2A</div>

          <div className="mt-1">
            Saldo Sekarang harus menyisakan minimal <b>Rp100.000</b>.
          </div>

          <div className="mt-1">
            Jika saldo Rp25.000, sistem menambahkan Rp75.000 ke nominal
            tunggakan sebelum pembulatan.
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 md:grid md:grid-cols-[40px_1.3fr_1fr_150px_150px_150px] md:gap-3">
            <div />
            <div>Debitur</div>
            <div>No. Rekening</div>
            <div className="text-right">Tunggakan</div>
            <div className="text-right">Saldo Sekarang</div>
            <div className="text-right">Nominal Advis</div>
          </div>

          {filtered2A.map((item) => {
            const checked = selected2A.includes(item.id);

            const tambahan = hitungTambahanSaldo2A(item);

            const nominal = hitungNominal2A(item);

            return (
              <div
                key={item.id}
                className={`border-b border-slate-100 p-4 last:border-b-0 ${
                  checked ? "bg-slate-50" : "bg-white"
                }`}
              >
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggle2A(item.id)}
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {checked && <Check size={13} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_150px_150px_150px]">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {item.nama}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500 md:hidden">
                          {item.norek}
                        </div>
                      </div>

                      <div className="hidden items-center text-sm text-slate-600 md:flex">
                        {item.norek}
                      </div>

                      <div>
                        <div className="text-xs text-slate-500 md:hidden">
                          Tunggakan
                        </div>

                        <div className="text-sm font-semibold text-slate-900 md:text-right">
                          {formatRupiah(item.tunggakan)}
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 text-xs text-slate-500 md:hidden">
                          Saldo Sekarang
                        </div>

                        <NominalInput
                          value={saldo2A[item.id] || ""}
                          onChange={(value) => updateSaldo2A(item.id, value)}
                        />
                      </div>

                      <div>
                        <div className="text-xs text-slate-500 md:hidden">
                          Nominal Advis
                        </div>

                        <div className="text-sm font-bold text-slate-900 md:text-right">
                          {formatRupiah(nominal)}
                        </div>

                        {tambahan > 0 && (
                          <div className="mt-1 text-right text-xs text-amber-600">
                            +{formatRupiah(tambahan)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!filtered2A.length && (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Data tidak ditemukan.
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            {selected2A.length} data dipilih
          </div>

          <button
            type="button"
            onClick={generate2A}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <FileText size={17} />
            Buat Advis 2A
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // EASY CALL UI
  // ==========================================================

  function renderEasyCall() {
    return (
      <div>
        {renderModeHeader(
          "Advis EC / Easy Call",
          "Data Easy Call JKK 1 dan JKK 2 digabung otomatis.",
        )}

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchEC}
              onChange={(e) => setSearchEC(e.target.value)}
              placeholder="Cari nama, nomor rekening, atau unit..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={selectAllEC}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Check size={17} />
            Pilih Semua
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="font-semibold">Sumber Easy Call</div>

          <div className="mt-1">
            Data berasal dari Easy Call RaportMU dan menggabungkan{" "}
            <b>JKK 1 + JKK 2</b>.
          </div>

          <div className="mt-1">
            Tidak menggunakan aturan saldo minimum Rp100.000.
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 md:grid md:grid-cols-[40px_100px_1.3fr_1fr_160px] md:gap-3">
            <div />
            <div>Unit</div>
            <div>Debitur</div>
            <div>No. Rekening</div>
            <div className="text-right">Nominal</div>
          </div>

          {filteredEC.map((item) => {
            const checked = selectedEC.includes(item.id);

            return (
              <div
                key={item.id}
                className={`border-b border-slate-100 p-4 last:border-b-0 ${
                  checked ? "bg-slate-50" : "bg-white"
                }`}
              >
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggleEC(item.id)}
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {checked && <Check size={13} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="grid gap-3 md:grid-cols-[100px_1.3fr_1fr_160px]">
                      <div>
                        <div className="text-xs text-slate-500 md:hidden">
                          Unit
                        </div>

                        <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {item.unit}
                        </span>
                      </div>

                      <div>
                        <div className="font-semibold text-slate-900">
                          {item.nama}
                        </div>
                      </div>

                      <div className="text-sm text-slate-600">
                        <div className="text-xs text-slate-500 md:hidden">
                          No. Rekening
                        </div>

                        {item.norek}
                      </div>

                      <div>
                        <div className="text-xs text-slate-500 md:hidden">
                          Nominal
                        </div>

                        <div className="text-sm font-bold text-slate-900 md:text-right">
                          {formatRupiah(item.nominal)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!filteredEC.length && (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Data tidak ditemukan.
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            {selectedEC.length} data dipilih
          </div>

          <button
            type="button"
            onClick={generateEasyCall}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <FileText size={17} />
            Buat Advis Easy Call
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PELUNASAN UI
  // ==========================================================

  function renderPelunasan() {
    return (
      <div>
        {renderModeHeader(
          "Advis Pelunasan",
          "Input transaksi pelunasan. Nominal dipertahankan persis tanpa pembulatan.",
        )}

        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">Nominal Pelunasan</div>

          <div className="mt-1">
            Sistem <b>tidak melakukan pembulatan</b>.
          </div>

          <div className="mt-1">
            Contoh:
            <span className="mx-1 font-semibold">49.050.005,02</span>→
            <span className="ml-1 font-semibold">
              empat puluh sembilan juta lima puluh ribu lima koma dua rupiah
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {pelunasanRows.map((row, index) => {
            const terbilang = terbilangRupiahExact(row.nominal);

            return (
              <div
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="font-semibold text-slate-900">
                    Data {index + 1}
                  </div>

                  <button
                    type="button"
                    onClick={() => hapusPelunasan(row.id)}
                    disabled={pelunasanRows.length <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Nama Debitur
                    </label>

                    <input
                      type="text"
                      value={row.nama}
                      onChange={(e) =>
                        updatePelunasan(row.id, "nama", e.target.value)
                      }
                      placeholder="Nama debitur"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      No. Rekening Pinjaman
                    </label>

                    <input
                      type="text"
                      value={row.norek}
                      onChange={(e) =>
                        updatePelunasan(row.id, "norek", e.target.value)
                      }
                      placeholder="No. rekening"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Nominal Transaksi
                    </label>

                    <NominalInput
                      value={row.nominal}
                      onChange={(value) =>
                        updatePelunasan(row.id, "nominal", value)
                      }
                      placeholder="49.050.005,02"
                    />

                    {row.nominal && (
                      <>
                        <div className="mt-2 text-right text-xs text-slate-500">
                          Nominal:
                          <span className="ml-1 font-semibold text-slate-700">
                            {formatRupiahExact(row.nominal)}
                          </span>
                        </div>

                        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                          <span className="font-semibold text-slate-700">
                            Terbilang:
                          </span>{" "}
                          {terbilang || "-"}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Keterangan Transaksi
                    </label>

                    <input
                      type="text"
                      value={row.keterangan}
                      onChange={(e) =>
                        updatePelunasan(row.id, "keterangan", e.target.value)
                      }
                      placeholder="Keterangan"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={tambahPelunasan}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={17} />
            Tambah Data
          </button>

          <button
            type="button"
            onClick={generatePelunasan}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <FileText size={17} />
            Buat Advis Pelunasan
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Cetak Advis</span>

            {mode && (
              <>
                <ChevronRight size={14} />

                <span className="font-medium text-slate-700">
                  {mode === "manual"
                    ? "Advis Manual"
                    : mode === "2a"
                      ? "Advis 2A"
                      : mode === "easycall"
                        ? "Advis EC / Easy Call"
                        : "Advis Pelunasan"}
                </span>
              </>
            )}
          </div>

          <div className="hidden text-xs text-slate-400 sm:block">
            {tanggalHariIni}
          </div>
        </div>

        {mode === null && renderLanding()}

        {mode === "manual" && renderManual()}

        {mode === "2a" && render2A()}

        {mode === "easycall" && renderEasyCall()}

        {mode === "pelunasan" && renderPelunasan()}
      </div>
    </DashboardLayout>
  );
}
