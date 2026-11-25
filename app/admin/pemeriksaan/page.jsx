"use client";

import React, { useState, useMemo } from "react";
import {
  ClipboardCheck,
  Search,
  CheckSquare,
  Square,
  Printer,
  X,
  Check,
  Database,
  FileCheck2,
} from "lucide-react";
// Contoh data database PK (bisa diganti/diambil dari API / state database PK Anda)
const INITIAL_PK_DATABASE = [
  {
    id: "PK-2026-001",
    noPk: "PK.1108/KUR/2026/001",
    noAplikasi: "KUR 11081A051026001",
    namaDebitur: "SINDU ARIBOWO",
    nikDebitur: "15092210940003",
    jenisFasilitas: "KUR Mikro",
    limitKredit: "Rp 100.000.000",
    unitKerja: "KCP Muara Bungo",
  },
  {
    id: "PK-2026-002",
    noPk: "PK.1108/KUM/2026/014",
    noAplikasi: "KUM 11081B071026014",
    namaDebitur: "SITI RAHMAWATI",
    nikDebitur: "1571015508920002",
    jenisFasilitas: "KUM Modal Kerja",
    limitKredit: "Rp 250.000.000",
    unitKerja: "KCP Jambi Sipin",
  },
  {
    id: "PK-2026-003",
    noPk: "PK.1108/KPP/2026/009",
    noAplikasi: "KPP 11081C121026009",
    namaDebitur: "HENDRA KURNIAWAN",
    nikDebitur: "1502021804880005",
    jenisFasilitas: "KPP Investasi",
    limitKredit: "Rp 350.000.000",
    unitKerja: "KCP Bangko",
  },
];

const DEFAULT_CHECKLIST_ITEMS = [
  {
    id: "doc-1",
    label:
      "Asli / Salinan Perjanjian Kredit (PK) telah ditandatangani & bermeterai cukup",
  },
  {
    id: "doc-2",
    label: "Fotokopi e-KTP Debitur & Pasangan (masih berlaku / jelas terbaca)",
  },
  {
    id: "doc-3",
    label:
      "Fotokopi Kartu Keluarga (KK) & Buku Nikah / Akta Cerai / Surat Keterangan Belum Menikah",
  },
  {
    id: "doc-4",
    label: "Surat Keterangan Usaha (SKU) / NIB / Dokumen Legalitas Usaha aktif",
  },
  {
    id: "doc-5",
    label:
      "Surat Pernyataan Debitur (OTS / Bukan Kredit Topengan / Tempilan / Percaloan)",
  },
  {
    id: "doc-6",
    label:
      "Surat GCG (Good Corporate Governance) telah ditandatangani (2 rangkap)",
  },
  {
    id: "doc-7",
    label:
      "Lembar Verifikasi OTS / Video Call & Kolase Foto OTS (Usaha & Rumah)",
  },
  {
    id: "doc-8",
    label:
      "Kolase Foto PK & Bukti Penyerahan Buku Tabungan / Kartu ATM / Livin",
  },
  {
    id: "doc-9",
    label:
      "Dokumen Agunan / Jaminan (SHM/SHGB/BPKB) & Surat Kuasa / Penyerahan Jaminan",
  },
  {
    id: "doc-10",
    label:
      "Bukti Persetujuan Orang Tua / Penjamin / Ahli Waris (jika dipersyaratkan)",
  },
  {
    id: "doc-11",
    label:
      "Formulir Aplikasi Kredit, Advis Pencairan & Kelengkapan BI Checking / SLIK",
  },
  {
    id: "doc-12",
    label: "Dokumen / Catatan Tambahan Khusus Sesuai Ketentuan Komite / Unit",
  },
];

export default function CeklisDokumenPK({ pkDatabase = INITIAL_PK_DATABASE }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPk, setSelectedPk] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Menyimpan status centang & keterangan per item ceklis untuk tiap PK
  const [checklistByPk, setChecklistByPk] = useState({});

  const filteredPkList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pkDatabase;
    return pkDatabase.filter(
      (item) =>
        item.noPk.toLowerCase().includes(q) ||
        item.noAplikasi.toLowerCase().includes(q) ||
        item.namaDebitur.toLowerCase().includes(q) ||
        item.nikDebitur.toLowerCase().includes(q) ||
        item.unitKerja.toLowerCase().includes(q),
    );
  }, [pkDatabase, searchQuery]);

  const getCurrentItems = (pkId) => {
    if (!pkId) return [];
    if (checklistByPk[pkId]) return checklistByPk[pkId];
    return DEFAULT_CHECKLIST_ITEMS.map((item) => ({
      ...item,
      checked: false,
      keterangan: "",
    }));
  };

  const handleSelectPk = (pk) => {
    setSelectedPk(pk);
    setChecklistByPk((prev) => {
      if (prev[pk.id]) return prev;
      return {
        ...prev,
        [pk.id]: DEFAULT_CHECKLIST_ITEMS.map((item) => ({
          ...item,
          checked: false,
          keterangan: "",
        })),
      };
    });
  };

  const handleOpenLengkapi = () => {
    if (!selectedPk) return;
    setIsModalOpen(true);
  };

  const toggleItemChecked = (itemId) => {
    if (!selectedPk) return;
    setChecklistByPk((prev) => {
      const current = getCurrentItems(selectedPk.id);
      const updated = current.map((it) =>
        it.id === itemId ? { ...it, checked: !it.checked } : it,
      );
      return { ...prev, [selectedPk.id]: updated };
    });
  };

  const handleKeteranganChange = (itemId, value) => {
    if (!selectedPk) return;
    setChecklistByPk((prev) => {
      const current = getCurrentItems(selectedPk.id);
      const updated = current.map((it) =>
        it.id === itemId ? { ...it, keterangan: value } : it,
      );
      return { ...prev, [selectedPk.id]: updated };
    });
  };

  const handleCheckAll = (value) => {
    if (!selectedPk) return;
    setChecklistByPk((prev) => {
      const current = getCurrentItems(selectedPk.id);
      const updated = current.map((it) => ({ ...it, checked: value }));
      return { ...prev, [selectedPk.id]: updated };
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const activeItems = selectedPk ? getCurrentItems(selectedPk.id) : [];
  const checkedCount = activeItems.filter((i) => i.checked).length;

  return (
    <div className="min-h-screen bg-slate-100 pb-24 md:pb-12 font-sans">
      {/* Header Sticky Mobile-Friendly */}
      <header className="sticky top-0 z-30 bg-[#003d79] text-white px-4 py-3.5 shadow-md flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2.5">
          <ClipboardCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h1 className="text-sm font-bold leading-tight">
              Ceklis Dokumen PK
            </h1>
            <p className="text-[11px] text-blue-200">
              {selectedPk
                ? `${selectedPk.noPk} • ${checkedCount}/${activeItems.length} Lengkap`
                : "Cari PK dari Database PK"}
            </p>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={handleOpenLengkapi}
            disabled={!selectedPk}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            <FileCheck2 className="w-4 h-4" /> Lengkapi
          </button>
          <button
            onClick={handlePrint}
            disabled={!selectedPk}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-[#003d79] font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            <Printer className="w-4 h-4" /> Unduh PDF / Cetak
          </button>
        </div>
      </header>

      {/* Panel Pencarian & Pemilihan PK dari Database PK */}
      <section className="max-w-4xl mx-auto px-4 pt-4 space-y-3 print:hidden">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#003d79] flex items-center gap-1.5">
              <Database className="w-4 h-4" /> Cari PK dari Database PK
            </label>
            <span className="text-[11px] text-slate-500">
              {filteredPkList.length} data ditemukan
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari No. PK, No. Aplikasi, Nama Debitur, atau NIK..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#003d79] focus:outline-none text-base"
            />
          </div>

          {/* Hasil Pencarian PK */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {filteredPkList.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Data PK tidak ditemukan di database PK.
              </div>
            ) : (
              filteredPkList.map((pk) => {
                const isSelected = selectedPk?.id === pk.id;
                const pkItems = getCurrentItems(pk.id);
                const doneCount = pkItems.filter((i) => i.checked).length;

                return (
                  <div
                    key={pk.id}
                    onClick={() => handleSelectPk(pk)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-blue-50 border-[#003d79] ring-1 ring-[#003d79]"
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#003d79]">
                          {pk.noPk}
                        </span>
                        <span className="text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600">
                          {pk.jenisFasilitas}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                        {pk.namaDebitur}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        NIK: {pk.nikDebitur} • {pk.limitKredit} • {pk.unitKerja}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                          doneCount === pkItems.length
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {doneCount}/{pkItems.length}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Tombol Lengkapi di Desktop / Tablet */}
          {selectedPk && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                Terpilih:{" "}
                <b className="text-slate-900">{selectedPk.namaDebitur}</b> (
                {selectedPk.noPk})
              </div>
              <button
                type="button"
                onClick={handleOpenLengkapi}
                className="flex items-center gap-1.5 bg-[#003d79] hover:bg-[#002b57] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs shrink-0"
              >
                <FileCheck2 className="w-4 h-4 text-amber-400" /> Lengkapi
                Ceklis
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Area Preview Kertas A4 */}
      <main className="max-w-5xl mx-auto p-4 overflow-x-auto print:p-0 print:overflow-visible">
        <div
          className="bg-white mx-auto shadow-lg border border-slate-200 text-black print:shadow-none print:border-none"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "14mm 16mm",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "9.5pt",
            lineHeight: "1.35",
            boxSizing: "border-box",
          }}
        >
          <h2 className="text-center font-bold text-sm underline uppercase mb-3">
            CEKLIS KELENGKAPAN DOKUMEN PERJANJIAN KREDIT (PK)
          </h2>

          {/* Identitas PK */}
          <table className="w-full border-collapse border border-black mb-3 text-[9pt]">
            <tbody>
              <tr>
                <td className="border border-black px-2.5 py-1 w-36 font-semibold">
                  Nomor PK
                </td>
                <td className="border border-black px-2.5 py-1 font-bold">
                  :{" "}
                  {selectedPk?.noPk ||
                    "................................................"}
                </td>
                <td className="border border-black px-2.5 py-1 w-32 font-semibold">
                  No. Aplikasi
                </td>
                <td className="border border-black px-2.5 py-1">
                  :{" "}
                  {selectedPk?.noAplikasi ||
                    "...................................."}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1 font-semibold">
                  Nama Debitur
                </td>
                <td className="border border-black px-2.5 py-1 font-bold">
                  :{" "}
                  {selectedPk?.namaDebitur ||
                    "................................................"}
                </td>
                <td className="border border-black px-2.5 py-1 font-semibold">
                  NIK Debitur
                </td>
                <td className="border border-black px-2.5 py-1">
                  :{" "}
                  {selectedPk?.nikDebitur ||
                    "...................................."}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1 font-semibold">
                  Jenis / Limit
                </td>
                <td className="border border-black px-2.5 py-1">
                  :{" "}
                  {selectedPk
                    ? `${selectedPk.jenisFasilitas} (${selectedPk.limitKredit})`
                    : "................................................"}
                </td>
                <td className="border border-black px-2.5 py-1 font-semibold">
                  Unit Kerja
                </td>
                <td className="border border-black px-2.5 py-1">
                  :{" "}
                  {selectedPk?.unitKerja ||
                    "...................................."}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tabel Ceklis Dokumen & Keterangan */}
          <table className="w-full border-collapse border border-black text-[9pt]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black px-2 py-1.5 w-8 text-center">
                  No
                </th>
                <th className="border border-black px-2.5 py-1.5 text-left">
                  Item Ceklis Dokumen PK
                </th>
                <th className="border border-black px-2 py-1.5 w-16 text-center">
                  Status
                </th>
                <th className="border border-black px-2.5 py-1.5 w-52 text-left">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              {(selectedPk ? activeItems : DEFAULT_CHECKLIST_ITEMS).map(
                (item, idx) => {
                  const isChecked = Boolean(item.checked);
                  return (
                    <tr key={item.id}>
                      <td className="border border-black px-2 py-1 text-center align-top">
                        {idx + 1}
                      </td>
                      <td className="border border-black px-2.5 py-1 align-top">
                        {item.label}
                      </td>
                      <td className="border border-black px-2 py-1 text-center font-bold align-top">
                        {isChecked ? "☑ Ada" : "☐"}
                      </td>
                      <td className="border border-black px-2.5 py-1 align-top text-[8.5pt]">
                        {item.keterangan || ""}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>

          {/* Ringkasan & Tanda Tangan */}
          <div className="mt-3 flex items-center justify-between text-[8.5pt] text-slate-700">
            <span>
              Kelengkapan Dokumen:{" "}
              <b>
                {checkedCount} /{" "}
                {activeItems.length || DEFAULT_CHECKLIST_ITEMS.length} Item Terc
                checklist
              </b>
            </span>
            <span>Dicetak dari Sistem Ceklis PK</span>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-6 text-center text-[9pt]">
            <div>
              <p className="font-semibold">Petugas Pemeriksa</p>
              <div className="h-14"></div>
              <p className="underline">
                (....................................................)
              </p>
            </div>
            <div>
              <p className="font-semibold">Mengetahui / Menyetujui</p>
              <div className="h-14"></div>
              <p className="underline">
                (....................................................)
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Floating Bar Mobile */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 p-3 flex gap-2.5 md:hidden shadow-lg print:hidden">
        <button
          type="button"
          onClick={handleOpenLengkapi}
          disabled={!selectedPk}
          className="flex-1 flex items-center justify-center gap-2 bg-[#003d79] active:bg-[#002b57] disabled:opacity-40 text-white font-bold text-sm py-3 rounded-xl shadow-sm"
        >
          <FileCheck2 className="w-4 h-4 text-amber-400" /> Lengkapi
        </button>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!selectedPk}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 active:bg-amber-600 disabled:opacity-40 text-slate-900 font-bold text-sm py-3 rounded-xl shadow-sm"
        >
          <Printer className="w-4 h-4" /> Unduh PDF
        </button>
      </div>

      {/* MODAL LENGKAPI CEKLIS DOKUMEN PK */}
      {isModalOpen && selectedPk && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 print:hidden">
          <div className="bg-white w-full md:max-w-xl rounded-t-2xl md:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-base truncate">
                  Lengkapi Ceklis — {selectedPk.namaDebitur}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {selectedPk.noPk} • {checkedCount}/{activeItems.length} item
                  dicentang
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aksi Cepat Centang Semua / Kosongkan */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-600">Aksi Cepat:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCheckAll(true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-100 text-[#003d79] font-bold"
                >
                  Centang Semua
                </button>
                <button
                  type="button"
                  onClick={() => handleCheckAll(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-semibold"
                >
                  Reset Centang
                </button>
              </div>
            </div>

            {/* Daftar Ceklis & Kolom Keterangan */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {activeItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition space-y-2.5 ${
                    item.checked
                      ? "bg-emerald-50/50 border-emerald-300"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleItemChecked(item.id)}
                    className="w-full flex items-start gap-3 text-left"
                  >
                    {item.checked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-xs sm:text-sm font-semibold leading-snug ${
                        item.checked ? "text-slate-900" : "text-slate-700"
                      }`}
                    >
                      {idx + 1}. {item.label}
                    </span>
                  </button>

                  {/* Kolom Keterangan */}
                  <div>
                    <input
                      type="text"
                      value={item.keterangan}
                      onChange={(e) =>
                        handleKeteranganChange(item.id, e.target.value)
                      }
                      placeholder="Tambahkan keterangan (opsional, misal: menyusul, fotokopi, catatan)..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[#003d79] focus:outline-none text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-[#003d79] hover:bg-[#002b57] text-white font-bold py-3 rounded-xl text-sm shadow"
              >
                <Check className="w-4 h-4" /> Simpan & Lihat Preview A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style Khusus Print A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
