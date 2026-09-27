/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  FileDown,
  FileText,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";

import {
  TopUpModal,
  ManualModal,
  EditNotasiModal,
  DeleteOrderModal,
} from "@/components/order-agunan/OrderAgunanModals";

import OrderAgunanPrint from "@/components/order-agunan/OrderAgunanPrint";

import {
  prepareExportAssets,
  downloadOverallPdf,
  downloadWord,
  downloadZip,
} from "@/components/order-agunan/OrderAgunanExport";

/* =========================================================
   CONSTANT
========================================================= */

const NEXT_NOMOR_SURAT = {
  "JKK 1": "157",
  "JKK 2": "001",
};

const MASTER_KEY = "josjis_pegawai_unit";

const UNIT_INFO = {
  JKK1: {
    code: "11081A",
    name: "Jambi Kuamang Kuning 1",
    workUnit: "KCP KUAMANG KUNING 1",
  },
  JKK2: {
    code: "11081B",
    name: "Jambi Kuamang Kuning 2",
    workUnit: "KCP KUAMANG KUNING 2",
  },
};

const DEFAULT_MASTER = {
  JKK1: {
    supervisor: {
      name: "",
      nip: "",
      position: "",
    },
    mka: [],
  },
  JKK2: {
    supervisor: {
      name: "",
      nip: "",
      position: "",
    },
    mka: [],
  },
};

/* =========================================================
   DUMMY DATA
========================================================= */

const DUMMY_LUNAS = [
  {
    id: "ORD-001",
    noNotasi: "156",
    namaDebitur: "JISMI",
    norekPinjaman: "1234567890",
    status: "Lunas",
    agunan: [
      {
        jenis: "SHM",
        nomor: "1147",
        desa: "Mendalo",
        namaSertifikat: "JISMI",
        keteranganPemilik: "milik sendiri",
        luas: "120",
        keterangan: "Bundel, MAP No. 1",
      },
    ],
  },
  {
    id: "ORD-002",
    noNotasi: "",
    namaDebitur: "BUDI SANTOSO",
    norekPinjaman: "1234567891",
    status: "Lunas",
    agunan: [
      {
        jenis: "SHM",
        nomor: "2251",
        desa: "Sungai Duren",
        namaSertifikat: "BUDI SANTOSO",
        keteranganPemilik: "milik sendiri",
        luas: "150",
        keterangan: "Bundel, MAP No. 2",
      },
    ],
  },
];

const DUMMY_BELUM_LUNAS = [
  {
    id: "TOPUP-001",
    noNotasi: "",
    namaDebitur: "ANDI SAPUTRA",
    norekPinjaman: "1234567893",
    status: "Top Up",
    agunan: [
      {
        jenis: "SHM",
        nomor: "4412",
        desa: "Simpang Sungai Duren",
        namaSertifikat: "ANDI SAPUTRA",
        keteranganPemilik: "milik sendiri",
        luas: "180",
        keterangan: "Bundel, MAP No. 3",
      },
    ],
  },
  {
    id: "TOPUP-002",
    noNotasi: "",
    namaDebitur: "FADIL",
    norekPinjaman: "1234567892",
    status: "Top Up",
    agunan: [
      {
        jenis: "SHM",
        nomor: "3301",
        desa: "Pematang Gajah",
        namaSertifikat: "FADIL",
        keteranganPemilik: "milik sendiri",
        luas: "200",
        keterangan: "Bundel, MAP No. 4",
      },
    ],
  },
  {
    id: "TOPUP-003",
    noNotasi: "",
    namaDebitur: "RINA",
    norekPinjaman: "1234567894",
    status: "Top Up",
    agunan: [
      {
        jenis: "SHM",
        nomor: "5521",
        desa: "Mendalo",
        namaSertifikat: "RINA",
        keteranganPemilik: "milik sendiri",
        luas: "110",
        keterangan: "Bundel, MAP No. 5",
      },
    ],
  },
];

/* =========================================================
   MASTER PEGAWAI
========================================================= */

function readMaster() {
  if (typeof window === "undefined") {
    return DEFAULT_MASTER;
  }

  try {
    const saved = localStorage.getItem(MASTER_KEY);

    if (!saved) {
      return DEFAULT_MASTER;
    }

    const parsed = JSON.parse(saved);

    return {
      JKK1: {
        supervisor: {
          ...DEFAULT_MASTER.JKK1.supervisor,
          ...(parsed?.JKK1?.supervisor || {}),
        },
        mka: Array.isArray(parsed?.JKK1?.mka) ? parsed.JKK1.mka : [],
      },

      JKK2: {
        supervisor: {
          ...DEFAULT_MASTER.JKK2.supervisor,
          ...(parsed?.JKK2?.supervisor || {}),
        },
        mka: Array.isArray(parsed?.JKK2?.mka) ? parsed.JKK2.mka : [],
      },
    };
  } catch {
    return DEFAULT_MASTER;
  }
}

/* =========================================================
   HELPERS
========================================================= */

function formatDokumenLengkap(agunan) {
  if (!agunan) {
    return "—";
  }

  return `${agunan.jenis} No. ${agunan.nomor}/${agunan.desa} an. ${agunan.namaSertifikat} (${agunan.keteranganPemilik}) Luas ${agunan.luas} M2`;
}

function formatAgunanSurat(agunan) {
  if (!agunan) {
    return "—";
  }

  const nomor = agunan.nomor ? ` No. ${agunan.nomor}` : "";

  const desa = agunan.desa ? `/${agunan.desa}` : "";

  const nama = agunan.namaSertifikat ? ` an. ${agunan.namaSertifikat}` : "";

  return `${agunan.jenis}${nomor}${desa}${nama}`;
}

function getTanggalHariIni() {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function StatusBadge({ status }) {
  const isLunas = status === "Lunas";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isLunas
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      }`}
    >
      {status}
    </span>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function OrderAgunanPage() {
  const { activeUnit } = useUnit();

  /* =======================================================
     UNIT
  ======================================================= */

  const currentUnit = activeUnit?.value || "JKK1";

  const currentUnitInfo = UNIT_INFO[currentUnit] || UNIT_INFO.JKK1;

  const currentSuratKeluar = currentUnit === "JKK2" ? "JKK 2" : "JKK 1";

  /* =======================================================
     MASTER
  ======================================================= */

  const [master, setMaster] = useState(DEFAULT_MASTER);

  useEffect(() => {
    setMaster(readMaster());
  }, [activeUnit?.value]);

  const currentMaster =
    master[currentUnit] || DEFAULT_MASTER[currentUnit] || DEFAULT_MASTER.JKK1;

  const supervisor = currentMaster?.supervisor || {};

  /* =======================================================
     ORDER
  ======================================================= */

  const [orders, setOrders] = useState(DUMMY_LUNAS);

  /* =======================================================
     TOP UP
  ======================================================= */

  const [searchOpen, setSearchOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedTopUps, setSelectedTopUps] = useState([]);

  /* =======================================================
     MANUAL
  ======================================================= */

  const [manualOpen, setManualOpen] = useState(false);

  const [manualForm, setManualForm] = useState({
    namaDebitur: "",
    norekPinjaman: "",
    jenis: "SHM",
    nomor: "",
    desa: "",
    namaSertifikat: "",
    keteranganPemilik: "milik sendiri",
    luas: "",
    keterangan: "",
  });

  /* =======================================================
     EDIT NOTASI
  ======================================================= */

  const [editOpen, setEditOpen] = useState(false);

  const [editingOrder, setEditingOrder] = useState(null);

  const [editNoNotasi, setEditNoNotasi] = useState("");

  /* =======================================================
     DELETE
  ======================================================= */

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [deletingOrder, setDeletingOrder] = useState(null);

  /* =======================================================
     SURAT BERTANDA TANGAN
  ======================================================= */

  const [signedLetter, setSignedLetter] = useState(null);

  /* =======================================================
     FOTO BDS
  ======================================================= */

  const [bdsPhotos, setBdsPhotos] = useState({});

  /* =======================================================
     PREVIEW
  ======================================================= */

  const [previewOpen, setPreviewOpen] = useState(false);

  /* =======================================================
     NOMOR SURAT
  ======================================================= */

  const [suratKeluar, setSuratKeluar] = useState(currentSuratKeluar);

  const [noSurat, setNoSurat] = useState(
    NEXT_NOMOR_SURAT[currentSuratKeluar] || "",
  );

  /* =======================================================
     EXPORT
  ======================================================= */

  const [exporting, setExporting] = useState(false);

  /* =======================================================
     NOMOR FILE
  ======================================================= */

  function getUnitLabel() {
    return currentUnit === "JKK2" ? "JKK 2" : "JKK 1";
  }

  function getTanggalFile() {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, "0");

    const month = String(now.getMonth() + 1).padStart(2, "0");

    const year = now.getFullYear();

    return `${day}${month}${year}`;
  }

  function getExportBaseName() {
    return `order_agunan_${getUnitLabel()}_${getTanggalFile()}`;
  }

  /* =======================================================
     SYNC SURAT KELUAR DENGAN UNIT AKTIF
  ======================================================= */

  useEffect(() => {
    setSuratKeluar(currentSuratKeluar);

    setNoSurat(NEXT_NOMOR_SURAT[currentSuratKeluar] || "");
  }, [currentSuratKeluar]);

  /* =======================================================
     FILTER TOP UP
  ======================================================= */

  const filteredTopUps = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) {
      return DUMMY_BELUM_LUNAS;
    }

    return DUMMY_BELUM_LUNAS.filter(
      (item) =>
        item.namaDebitur.toLowerCase().includes(keyword) ||
        item.norekPinjaman.includes(keyword),
    );
  }, [searchTerm]);

  /* =======================================================
     SURAT ROWS
     
     Satu sumber data untuk:
     - Preview
     - Print
     - PDF
     - Word
  ======================================================= */

  const suratRows = useMemo(() => {
    return orders.map((order, index) => ({
      id: order.id,
      no: index + 1,
      notasi: order.noNotasi || "—",
      namaDebitur: order.namaDebitur || "—",
      norekPinjaman: order.norekPinjaman || "—",

      // Keterangan surat = STATUS
      status: order.status || "—",

      agunan: Array.isArray(order.agunan) ? order.agunan : [],
    }));
  }, [orders]);

  /* =======================================================
     CEK FOTO BDS
  ======================================================= */

  const hasBdsPhotos = useMemo(() => {
    return suratRows.some(
      (row) =>
        Array.isArray(bdsPhotos?.[row.id]) && bdsPhotos[row.id].length > 0,
    );
  }, [suratRows, bdsPhotos]);

  /* =======================================================
     TANGGAL
  ======================================================= */

  const tanggalHariIni = useMemo(() => getTanggalHariIni(), []);

  /* =======================================================
     NOMOR SURAT
  ======================================================= */

  function handleSuratKeluarChange(event) {
    const value = event.target.value;

    setSuratKeluar(value);

    setNoSurat(NEXT_NOMOR_SURAT[value] || "");
  }

  /* =======================================================
     TOP UP
  ======================================================= */

  function toggleTopUp(id) {
    setSelectedTopUps((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  }

  function tambahTopUp() {
    if (selectedTopUps.length === 0) {
      window.alert("Pilih minimal satu data untuk ditambahkan sebagai Top Up.");

      return;
    }

    const selected = DUMMY_BELUM_LUNAS.filter((item) =>
      selectedTopUps.includes(item.id),
    );

    setOrders((current) => {
      const existingIds = new Set(current.map((item) => item.id));

      const newItems = selected
        .filter((item) => !existingIds.has(item.id))
        .map((item) => ({
          ...item,
          status: "Top Up",
        }));

      return [...current, ...newItems];
    });

    setSelectedTopUps([]);
    setSearchTerm("");
    setSearchOpen(false);
  }

  /* =======================================================
     MANUAL
  ======================================================= */

  function handleManualChange(event) {
    const { name, value } = event.target;

    setManualForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetManualForm() {
    setManualForm({
      namaDebitur: "",
      norekPinjaman: "",
      jenis: "SHM",
      nomor: "",
      desa: "",
      namaSertifikat: "",
      keteranganPemilik: "milik sendiri",
      luas: "",
      keterangan: "",
    });
  }

  function simpanManual() {
    if (!manualForm.namaDebitur.trim() || !manualForm.norekPinjaman.trim()) {
      window.alert("Nama debitur dan nomor rekening wajib diisi.");

      return;
    }

    const newOrder = {
      id: `MANUAL-${Date.now()}`,

      noNotasi: "",

      namaDebitur: manualForm.namaDebitur.trim(),

      norekPinjaman: manualForm.norekPinjaman.trim(),

      status: "Lunas",

      agunan: [
        {
          jenis: manualForm.jenis,
          nomor: manualForm.nomor,
          desa: manualForm.desa,
          namaSertifikat: manualForm.namaSertifikat,
          keteranganPemilik: manualForm.keteranganPemilik,
          luas: manualForm.luas,
          keterangan: manualForm.keterangan,
        },
      ],
    };

    setOrders((current) => [...current, newOrder]);

    resetManualForm();
    setManualOpen(false);
  }

  /* =======================================================
     EDIT NOTASI
  ======================================================= */

  function openEditNotasi(order) {
    setEditingOrder(order);
    setEditNoNotasi(order.noNotasi || "");
    setEditOpen(true);
  }

  function simpanEdit() {
    if (!editingOrder) {
      return;
    }

    setOrders((current) =>
      current.map((item) =>
        item.id === editingOrder.id
          ? {
              ...item,
              noNotasi: editNoNotasi.trim(),
            }
          : item,
      ),
    );

    setEditOpen(false);
    setEditingOrder(null);
    setEditNoNotasi("");
  }

  /* =======================================================
     DELETE
  ======================================================= */

  function openDelete(order) {
    setDeletingOrder(order);
    setDeleteOpen(true);
  }

  function hapusOrder() {
    if (!deletingOrder) {
      return;
    }

    const orderId = deletingOrder.id;

    setOrders((current) => current.filter((item) => item.id !== orderId));

    setBdsPhotos((current) => {
      const photos = current[orderId] || [];

      photos.forEach((photo) => {
        if (photo?.url) {
          URL.revokeObjectURL(photo.url);
        }
      });

      const next = {
        ...current,
      };

      delete next[orderId];

      return next;
    });

    setDeleteOpen(false);
    setDeletingOrder(null);
  }

  /* =======================================================
     SURAT BERTANDA TANGAN
  ======================================================= */

  function handleSignedLetter(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      window.alert("File surat harus berupa foto atau gambar.");

      event.target.value = "";

      return;
    }

    if (signedLetter?.url) {
      URL.revokeObjectURL(signedLetter.url);
    }

    const url = URL.createObjectURL(file);

    setSignedLetter({
      file,
      url,
      name: file.name,
    });

    event.target.value = "";
  }

  function removeSignedLetter() {
    if (signedLetter?.url) {
      URL.revokeObjectURL(signedLetter.url);
    }

    setSignedLetter(null);
  }

  /* =======================================================
     FOTO BDS
     
     Multiple upload.
     Urutan file dipertahankan.
  ======================================================= */

  function handleBdsPhotos(orderId, event) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length !== files.length) {
      window.alert("Hanya file gambar yang dapat digunakan sebagai foto BDS.");
    }

    const photos = imageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setBdsPhotos((current) => ({
      ...current,

      [orderId]: [...(current[orderId] || []), ...photos],
    }));

    event.target.value = "";
  }

  function removeBdsPhoto(orderId, photoIndex) {
    setBdsPhotos((current) => {
      const photos = current[orderId] || [];

      const photo = photos[photoIndex];

      if (photo?.url) {
        URL.revokeObjectURL(photo.url);
      }

      const nextPhotos = photos.filter((_, index) => index !== photoIndex);

      return {
        ...current,
        [orderId]: nextPhotos,
      };
    });
  }

  /* =======================================================
     PREVIEW
  ======================================================= */

  function handleOpenPreview() {
    if (orders.length === 0) {
      window.alert("Belum ada data Order Agunan.");

      return;
    }

    setPreviewOpen(true);
  }

  /* =======================================================
     PRINT SURAT
  ======================================================= */

  function printSurat() {
    if (orders.length === 0) {
      window.alert("Belum ada data Order Agunan.");

      return;
    }

    setPreviewOpen(true);

    setTimeout(() => {
      window.print();
    }, 500);
  }

  function handlePrintPreview() {
    printSurat();
  }

  /* =======================================================
     CETAK PDF SURAT
     
     PDF bagian bawah:
     hanya surat Preview.

     Menggunakan browser print.
     User dapat memilih Save as PDF.
  ======================================================= */

  async function handleCetakPdfSurat() {
    if (orders.length === 0) {
      window.alert("Belum ada data Order Agunan.");

      return;
    }

    setPreviewOpen(true);

    await new Promise((resolve) => setTimeout(resolve, 400));

    window.print();
  }

  /* =======================================================
     PDF KESELURUHAN
     
     Isi:
     1. Surat bertanda tangan
     2. Semua foto BDS
     
     BDS:
     2 foto per halaman.
  ======================================================= */

  async function handleCetakPdfKeseluruhan() {
    if (!signedLetter && !hasBdsPhotos) {
      window.alert("Belum ada surat bertanda tangan atau foto BDS.");

      return;
    }

    try {
      setExporting(true);

      const assets = await prepareExportAssets({
        signedLetter,
        bdsPhotos,
        rows: suratRows,
      });

      await downloadOverallPdf({
        assets,
        suratKeluar,
        date: new Date(),
      });
    } catch (error) {
      console.error(error);

      window.alert("PDF keseluruhan gagal dibuat.");
    } finally {
      setExporting(false);
    }
  }

  /* =======================================================
     WORD
     
     Isi:
     1. Layout surat
     2. Tabel berdasarkan Preview
     3. Foto BDS
     
     BDS:
     2 foto per halaman.
  ======================================================= */

  async function handleCetakWord() {
    try {
      setExporting(true);

      const assets = await prepareExportAssets({
        signedLetter,
        bdsPhotos,
        rows: suratRows,
      });

      await downloadWord({
        rows: suratRows,
        suratKeluar,
        noSurat,
        tanggal: tanggalHariIni,
        supervisor,
        assets,
        date: new Date(),
      });
    } catch (error) {
      console.error(error);

      window.alert("Dokumen Word gagal dibuat.");
    } finally {
      setExporting(false);
    }
  }

  /* =======================================================
     ZIP
     
     1. Kompres semua foto
     2. Buat PDF
     3. Buat Word
     4. ZIP DEFLATE level 9
     
     Hanya download 1 file ZIP.
  ======================================================= */

  async function handleGenerateZip() {
    if (!signedLetter && !hasBdsPhotos) {
      window.alert("Belum ada surat bertanda tangan atau foto BDS.");

      return;
    }

    try {
      setExporting(true);

      await downloadZip({
        rows: suratRows,
        bdsPhotos,
        signedLetter,
        suratKeluar,
        noSurat,
        tanggal: tanggalHariIni,
        supervisor,
        date: new Date(),
      });
    } catch (error) {
      console.error(error);

      window.alert("ZIP gagal dibuat.");
    } finally {
      setExporting(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f7f7f5] text-[#171717]">
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="border-b border-zinc-200 bg-white">
          <div className="px-6 py-5 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">
                    Order Agunan
                  </h1>

                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                    {currentUnitInfo.name}
                  </span>
                </div>

                <p className="mt-1 text-sm text-zinc-500">
                  Kelola data agunan untuk pengambilan kredit mikro.
                </p>
              </div>

              {/* BUTTON ATAS */}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCetakWord}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />

                  {exporting ? "Memproses..." : "Cetak Word"}
                </button>

                <button
                  type="button"
                  onClick={handleCetakPdfKeseluruhan}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />

                  {exporting ? "Memproses..." : "Cetak PDF"}
                </button>

                <button
                  type="button"
                  onClick={handleGenerateZip}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />

                  {exporting ? "Membuat ZIP..." : "Generate ZIP"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="px-6 py-6 lg:px-8">
          {/* ===============================================
              SURAT CONFIG
          =============================================== */}

          <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100">
                <FileText className="h-4 w-4 text-zinc-700" />
              </div>

              <div>
                <h2 className="text-sm font-bold">Nomor Surat</h2>

                <p className="text-xs text-zinc-500">
                  Nomor mengikuti surat keluar unit dan tetap dapat diedit.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[180px_180px_1fr]">
              {/* SURAT KELUAR */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
                  Surat Keluar
                </label>

                <select
                  value={suratKeluar}
                  onChange={handleSuratKeluarChange}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                >
                  <option value="JKK 1">JKK 1</option>

                  <option value="JKK 2">JKK 2</option>
                </select>
              </div>

              {/* NO SURAT */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
                  No. Surat
                </label>

                <input
                  type="text"
                  value={noSurat}
                  onChange={(event) => setNoSurat(event.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  placeholder="Nomor surat"
                />
              </div>

              {/* PREVIEW NUMBER */}

              <div className="flex items-end">
                <div className="rounded-xl bg-zinc-50 px-4 py-2.5 text-xs text-zinc-600">
                  <span className="font-semibold">Nomor:</span>{" "}
                  NRF.R02.JBI.Um.JKK/
                  {suratKeluar}/{noSurat || "-"}/2026
                </div>
              </div>
            </div>
          </div>

          {/* ===============================================
              ACTION
          =============================================== */}

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold">Daftar Order Agunan</h2>

              <p className="mt-0.5 text-xs text-zinc-500">
                Data lunas otomatis tersedia. Data belum lunas dapat ditambahkan
                sebagai Top Up.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              >
                <Plus className="h-4 w-4" />
                Tambah Pinjaman
              </button>

              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
                Input Manual
              </button>
            </div>
          </div>

          {/* ===============================================
              SIGNED LETTER
          =============================================== */}

          <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-bold">Surat Bertanda Tangan</h3>

                <p className="mt-1 text-xs text-zinc-500">
                  Upload foto/scan surat yang sudah ditandatangani. File ini
                  masuk ke PDF keseluruhan dan ZIP, bukan ke Word.
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50">
                <Upload className="h-4 w-4" />
                Upload Surat
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSignedLetter}
                />
              </label>
            </div>

            {signedLetter && (
              <div className="mt-4 flex items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <img
                  src={signedLetter.url}
                  alt="Preview surat bertanda tangan"
                  className="h-20 w-20 rounded-lg border border-zinc-200 bg-white object-contain"
                />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {signedLetter.name}
                  </div>

                  <div className="mt-1 text-xs text-zinc-500">
                    Surat siap dimasukkan ke PDF keseluruhan dan ZIP.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={removeSignedLetter}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-red-50 hover:text-red-600"
                  title="Hapus surat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* ===============================================
              MAIN TABLE
          =============================================== */}

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="w-14 px-4 py-3 text-center text-xs font-bold text-zinc-600">
                      No.
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold text-zinc-600">
                      No. Notasi
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold text-zinc-600">
                      Nama Debitur
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold text-zinc-600">
                      Norek. Pinjaman
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold text-zinc-600">
                      Dokumen
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-bold text-zinc-600">
                      Status
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-bold text-zinc-600">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-14 text-center">
                        <div className="mx-auto max-w-sm">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
                            <FileText className="h-5 w-5 text-zinc-400" />
                          </div>

                          <div className="text-sm font-semibold text-zinc-700">
                            Belum ada Order Agunan
                          </div>

                          <div className="mt-1 text-xs text-zinc-500">
                            Tambahkan pinjaman atau gunakan Input Manual.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, index) => {
                      const agunanList = Array.isArray(order.agunan)
                        ? order.agunan
                        : [];

                      const photos = bdsPhotos[order.id] || [];

                      return (
                        <tr
                          key={order.id}
                          className="border-b border-zinc-100 align-top last:border-b-0 hover:bg-zinc-50/50"
                        >
                          {/* NO */}

                          <td className="px-4 py-4 text-center text-xs font-semibold text-zinc-500">
                            {index + 1}
                          </td>

                          {/* NOTASI */}

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-800">
                                {order.noNotasi || "—"}
                              </span>

                              <button
                                type="button"
                                onClick={() => openEditNotasi(order)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                                title="Edit nomor notasi"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* DEBITUR */}

                          <td className="px-4 py-4">
                            <div className="font-semibold text-zinc-800">
                              {order.namaDebitur}
                            </div>
                          </td>

                          {/* NOREK */}

                          <td className="px-4 py-4 font-mono text-xs text-zinc-600">
                            {order.norekPinjaman}
                          </td>

                          {/* DOKUMEN */}

                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              {agunanList.length === 0 ? (
                                <div className="text-xs text-zinc-400">
                                  Belum ada dokumen
                                </div>
                              ) : (
                                agunanList.map((agunan, agunanIndex) => (
                                  <div
                                    key={`${order.id}-agunan-${agunanIndex}`}
                                    className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2"
                                  >
                                    {agunanList.length > 1 && (
                                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                        Agunan {agunanIndex + 1}
                                      </div>
                                    )}

                                    <div className="text-xs leading-5 text-zinc-700">
                                      {formatDokumenLengkap(agunan)}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </td>

                          {/* STATUS */}

                          <td className="px-4 py-4 text-center">
                            <StatusBadge status={order.status} />
                          </td>

                          {/* AKSI */}

                          <td className="px-4 py-4">
                            <div className="flex flex-col items-center gap-2">
                              {/* BDS */}

                              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50">
                                <Upload className="h-3.5 w-3.5" />
                                BDS
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(event) =>
                                    handleBdsPhotos(order.id, event)
                                  }
                                />
                              </label>

                              {/* DELETE */}

                              <button
                                type="button"
                                onClick={() => openDelete(order)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Hapus
                              </button>
                            </div>

                            {/* BDS PREVIEW */}

                            {photos.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {photos.map((photo, photoIndex) => (
                                  <div
                                    key={`${order.id}-photo-${photoIndex}`}
                                    className="flex items-center gap-2"
                                  >
                                    <img
                                      src={photo.url}
                                      alt={photo.name}
                                      className="h-10 w-10 rounded-lg border border-zinc-200 object-cover"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-[10px] text-zinc-500">
                                        {photo.name}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeBdsPhoto(order.id, photoIndex)
                                      }
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                      title="Hapus foto"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* =============================================
                TABLE FOOTER
            ============================================= */}

            <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-zinc-500">
                Total{" "}
                <span className="font-bold text-zinc-700">{orders.length}</span>{" "}
                data Order Agunan.
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
                >
                  <FileText className="h-4 w-4" />
                  Preview
                </button>

                <button
                  type="button"
                  onClick={handleCetakPdfSurat}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  Cetak PDF
                </button>

                <button
                  type="button"
                  onClick={handlePrintPreview}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>
            </div>
          </div>

          {/* ===============================================
              INFO
          =============================================== */}

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

              <div className="text-xs leading-5 text-blue-800">
                <div className="font-semibold">Informasi Order Agunan</div>

                <div className="mt-1">
                  Data pada tabel adalah data kerja sementara. Saat database
                  sudah terhubung, sumber data pinjaman dapat diganti tanpa
                  mengubah alur tampilan ini.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            MODALS
        ================================================= */}

        <TopUpModal
          open={searchOpen}
          onClose={() => {
            setSearchOpen(false);
            setSearchTerm("");
            setSelectedTopUps([]);
          }}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredTopUps={filteredTopUps}
          selectedTopUps={selectedTopUps}
          toggleTopUp={toggleTopUp}
          tambahTopUp={tambahTopUp}
          formatDokumenLengkap={formatDokumenLengkap}
          StatusBadge={StatusBadge}
        />

        <ManualModal
          open={manualOpen}
          onClose={() => setManualOpen(false)}
          manualForm={manualForm}
          handleManualChange={handleManualChange}
          resetManualForm={resetManualForm}
          simpanManual={simpanManual}
        />

        <EditNotasiModal
          open={editOpen}
          order={editingOrder}
          editNoNotasi={editNoNotasi}
          setEditNoNotasi={setEditNoNotasi}
          onClose={() => {
            setEditOpen(false);
            setEditingOrder(null);
            setEditNoNotasi("");
          }}
          simpanEdit={simpanEdit}
        />

        <DeleteOrderModal
          open={deleteOpen}
          order={deletingOrder}
          onClose={() => {
            setDeleteOpen(false);
            setDeletingOrder(null);
          }}
          hapusOrder={hapusOrder}
        />

        {/* =================================================
            PREVIEW
        ================================================= */}

        {previewOpen && (
          <div className="order-agunan-preview-overlay">
            {/* TOOLBAR - TIDAK IKUT PRINT */}

            <div className="order-agunan-preview-toolbar no-print">
              <div>
                <div className="text-sm font-bold text-zinc-800">
                  Preview Surat Order Agunan
                </div>

                <div className="text-xs text-zinc-500">
                  {suratKeluar} · No. {noSurat || "-"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCetakPdfSurat}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  Cetak PDF
                </button>

                <button
                  type="button"
                  onClick={handlePrintPreview}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700"
                >
                  <X className="h-4 w-4" />
                  Tutup
                </button>
              </div>
            </div>

            {/* TARGET SURAT */}

            <div className="order-agunan-preview-scroll">
              <OrderAgunanPrint
                rows={suratRows}
                suratKeluar={suratKeluar}
                noSurat={noSurat}
                tanggal={tanggalHariIni}
                supervisor={supervisor}
              />
            </div>
          </div>
        )}

        {/* =================================================
            GLOBAL PRINT CSS
        ================================================= */}

        <style jsx global>{`
          .order-agunan-preview-overlay {
            position: fixed;
            inset: 0;
            z-index: 100;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.6);
          }

          .order-agunan-preview-toolbar {
            position: sticky;
            top: 0;
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 16px 20px;
            background: white;
            border-bottom: 1px solid #e4e4e7;
          }

          .order-agunan-preview-scroll {
            min-height: 100vh;
            padding: 30px;
          }

          .order-agunan-print {
            margin-left: auto;
            margin-right: auto;
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            body * {
              visibility: hidden !important;
            }

            #order-agunan-print,
            #order-agunan-print * {
              visibility: visible !important;
            }

            #order-agunan-print {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              min-height: 297mm !important;
              margin: 0 !important;
              padding: 65px 70px !important;
              box-shadow: none !important;
              background: white !important;
            }

            .no-print {
              display: none !important;
            }

            .order-agunan-preview-overlay {
              position: static !important;
              inset: auto !important;
              overflow: visible !important;
              background: white !important;
            }

            .order-agunan-preview-scroll {
              min-height: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
