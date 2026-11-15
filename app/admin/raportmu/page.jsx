"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Database,
  FileSpreadsheet,
  X,
  Eye,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import BookingModal from "./components/BookingModal";
import EasyCallModal from "./components/EasyCallModal";
import ExcelImportCard from "./components/ExcelImportCard";
import RaportMuProcessMenu from "./components/RaportMuProcessMenu";
import TwoATagihanModal from "./components/TwoATagihanModal";

import { getRaportMuData, saveRaportMuData } from "./services/raportMuStorage";

const UNITS = [
  { id: "JKK1", name: "Jambi Kuamang Kuning 1" },
  { id: "JKK2", name: "Jambi Kuamang Kuning 2" },
];

const COLUMNS = [
  { index: 5, label: "No. Rekening" },
  { index: 6, label: "Nama Debitur" },
  { index: 7, label: "Limit" },
  { index: 8, label: "BADE" },
  { index: 14, label: "Produk / Jenis Pinjaman" },
  { index: 19, label: "Angsuran" },
  { index: 24, label: "Total Tunggakan" },
  { index: 25, label: "AGF1" },
  { index: 26, label: "Saldo AGF1" },
  { index: 27, label: "Kecukupan Saldo" },
  { index: 28, label: "Easy Coll" },
  { index: 30, label: "Nama MKS" },
];

const DESKTOP_COLUMNS = COLUMNS.filter((column) => column.index !== 30);

const MKS_PRIORITY = ["syech", "aris", "andri", "fadil"];

function getJakartaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);

  if (!Number.isFinite(number)) return String(value);

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(number);
}

function formatCell(column, value) {
  if (value === null || value === undefined || value === "") return "-";

  if (column.index === 5 || column.index === 25) {
    return String(value);
  }

  if ([7, 8, 19, 24, 26, 27].includes(column.index)) {
    return formatNumber(value);
  }

  return String(value);
}

function formatUpdatedAt(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function normalizeMksName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getMksName(row) {
  return String(row?.[30] ?? "").trim() || "MKS tidak diketahui";
}

function getMksPriority(name) {
  const normalized = normalizeMksName(name);

  const index = MKS_PRIORITY.findIndex((priority) =>
    normalized.includes(priority),
  );

  return index === -1 ? MKS_PRIORITY.length : index;
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-zinc-800">
        {value === null || value === undefined || value === "" ? "-" : value}
      </p>
    </div>
  );
}

function DataDetailModal({ item, onClose }) {
  if (!item) return null;

  const row = item.row;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
              Detail Data 2A
            </p>
            <h3 className="mt-1 truncate text-base font-bold text-zinc-900">
              {row?.[6] || "Nama Debitur tidak tersedia"}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {item.unit} · {item.mks}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            aria-label="Tutup detail"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[11px] font-medium text-blue-700">BADE</p>
              <p className="mt-1 text-lg font-bold text-blue-950">
                {formatNumber(row?.[8])}
              </p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-[11px] font-medium text-amber-700">
                Total Tunggakan
              </p>
              <p className="mt-1 text-lg font-bold text-amber-950">
                {formatNumber(row?.[24])}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 sm:col-span-1">
              <p className="text-[11px] font-medium text-zinc-500">
                Jenis Pinjaman
              </p>
              <p className="mt-1 text-lg font-bold text-zinc-900">
                {row?.[14] || "-"}
              </p>
            </div>
          </div>

          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Informasi Debitur dan Pinjaman
          </h4>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <DetailItem
                key={column.index}
                label={column.label}
                value={formatCell(column, row?.[column.index])}
              />
            ))}
          </div>

          <h4 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Informasi Sumber Data
          </h4>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <DetailItem label="Unit" value={item.unitName} />
            <DetailItem label="Kode Unit" value={item.unit} />
            <DetailItem label="Nama MKS" value={item.mks} />
            <DetailItem label="Nama File Excel" value={item.namaFile} />
            <DetailItem
              label="Terakhir Diperbarui"
              value={formatUpdatedAt(item.updatedAt)}
            />
            <DetailItem label="Tanggal Data" value={item.tanggalData} />
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-lg bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Tutup Detail
          </button>
        </div>
      </div>
    </div>
  );
}

function DataSeluruh2A() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const today = getJakartaDate();

      const { data, error: queryError } = await supabase
        .from("raportmu_hasil")
        .select(
          "id,unit_id,mks_id,jenis_data,tanggal_data,nama_file,data,total_rows,updated_at",
        )
        .eq("jenis_data", "DUA_A")
        .eq("tanggal_data", today)
        .order("updated_at", { ascending: false });

      if (queryError) throw queryError;

      const { data: unitData, error: unitError } = await supabase
        .from("unit")
        .select("id,nama_unit");

      if (unitError) throw unitError;

      const unitMap = new Map(
        (unitData || []).map((item) => [item.id, item.nama_unit]),
      );

      const normalized = (data || []).map((record) => ({
        ...record,
        nama_unit: unitMap.get(record.unit_id) || "Unit tidak diketahui",
        kode_unit:
          UNITS.find((unit) => unit.name === unitMap.get(record.unit_id))?.id ||
          "-",
      }));

      setRecords(normalized);
    } catch (err) {
      console.error("Gagal mengambil seluruh data 2A:", err);
      setError(err?.message || "Data 2A gagal dimuat.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unitSummary = useMemo(() => {
    return UNITS.map((unit) => {
      const unitRecords = records.filter(
        (record) => record.nama_unit === unit.name,
      );

      const totalRows = unitRecords.reduce(
        (total, record) => total + (Number(record.total_rows) || 0),
        0,
      );

      return {
        ...unit,
        records: unitRecords,
        totalRows,
      };
    });
  }, [records]);

  const groupedRows = useMemo(() => {
    const allRows = [];

    records.forEach((record) => {
      const rows = Array.isArray(record.data) ? record.data : [];

      rows.forEach((row, index) => {
        allRows.push({
          key: `${record.id}-${index}`,
          recordId: record.id,
          rowIndex: index,
          row,
          unit: record.kode_unit || "-",
          unitName: record.nama_unit,
          namaFile: record.nama_file || "Nama file tidak tersedia",
          updatedAt: record.updated_at,
          tanggalData: record.tanggal_data,
          mks: getMksName(row),
        });
      });
    });

    const groups = new Map();

    allRows.forEach((item) => {
      const key = normalizeMksName(item.mks);

      if (!groups.has(key)) {
        groups.set(key, {
          name: item.mks,
          rows: [],
        });
      }

      groups.get(key).rows.push(item);
    });

    return Array.from(groups.values()).sort((a, b) => {
      const priorityA = getMksPriority(a.name);
      const priorityB = getMksPriority(b.name);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return a.name.localeCompare(b.name, "id");
    });
  }, [records]);

  const totalRows = unitSummary.reduce(
    (total, unit) => total + unit.totalRows,
    0,
  );

  const displayedRows = groupedRows.reduce(
    (total, group) => total + group.rows.length,
    0,
  );

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <Database className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Seluruh Data 2A Tersimpan
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Gabungan JKK 1 dan JKK 2 · {getJakartaDate()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Muat Ulang
          </button>
        </div>

        {/* RINGKASAN */}
        <div className="grid grid-cols-1 gap-3 border-b border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-3 sm:p-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-xs text-zinc-500">Total Seluruh Data</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {formatNumber(totalRows)}
            </p>
            <p className="text-xs text-zinc-500">Baris data tersimpan</p>
          </div>

          {unitSummary.map((unit) => (
            <div
              key={unit.id}
              className="rounded-xl border border-zinc-200 bg-white p-3"
            >
              <p className="text-xs font-medium text-zinc-600">{unit.name}</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">
                {formatNumber(unit.totalRows)}
              </p>
              <p className="text-xs text-zinc-500">
                {unit.records.length > 0
                  ? `${unit.records.length} data tersimpan`
                  : "Belum ada data"}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="m-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat seluruh data 2A...
          </div>
        ) : displayedRows > 0 ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 sm:px-5">
              <div>
                <p className="text-sm font-bold text-zinc-800">
                  Tabel Gabungan 2A
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatNumber(displayedRows)} baris · {groupedRows.length}{" "}
                  kelompok MKS
                </p>
              </div>

              <span className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                JKK 1 + JKK 2
              </span>
            </div>

            {/* TABEL RESPONSIF */}
            <div className="bg-zinc-50 px-2 py-3 sm:px-4 sm:py-4">
              <div className="max-h-[650px] overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
                <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
                  <thead className="sticky top-0 z-20 bg-zinc-100">
                    {/* HEADER MOBILE */}
                    <tr className="md:hidden">
                      <th className="w-[39%] border-b border-zinc-200 bg-zinc-100 px-3 py-3.5 text-left font-bold text-zinc-700">
                        Nama Debitur
                      </th>
                      <th className="w-[18%] border-b border-zinc-200 bg-zinc-100 px-2 py-3.5 text-right font-bold text-zinc-700">
                        BADE
                      </th>
                      <th className="w-[21%] border-b border-zinc-200 bg-zinc-100 px-2 py-3.5 text-left font-bold text-zinc-700">
                        Produk
                      </th>
                      <th className="w-[22%] border-b border-zinc-200 bg-zinc-100 px-3 py-3.5 text-right font-bold text-zinc-700">
                        Tunggakan
                      </th>
                    </tr>

                    {/* HEADER DESKTOP */}
                    <tr className="hidden md:table-row">
                      <th className="w-12 border-b border-zinc-200 bg-zinc-100 px-4 py-4 text-center font-bold text-zinc-700">
                        No.
                      </th>

                      {DESKTOP_COLUMNS.map((column) => (
                        <th
                          key={column.index}
                          className="border-b border-zinc-200 bg-zinc-100 px-4 py-4 text-left font-bold text-zinc-700"
                        >
                          {column.label}
                        </th>
                      ))}

                      <th className="w-24 border-b border-zinc-200 bg-zinc-100 px-4 py-4 text-center font-bold text-zinc-700">
                        Detail
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {(() => {
                      let rowNumber = 0;

                      return groupedRows.map((group) => (
                        <FragmentGroup
                          key={normalizeMksName(group.name)}
                          group={group}
                          getRowNumber={() => ++rowNumber}
                          onSelect={setSelectedItem}
                        />
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-center text-[11px] text-zinc-500">
                <Eye className="mr-1 inline h-3.5 w-3.5" />
                Klik baris debitur untuk melihat seluruh detail data.
              </p>
            </div>
          </>
        ) : (
          <div className="px-5 py-10 text-center">
            <Database className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm font-semibold text-zinc-700">
              Belum ada data 2A tersimpan
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Data dari JKK 1 maupun JKK 2 akan tampil di sini setelah disimpan.
            </p>
          </div>
        )}
      </section>

      <DataDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}

function FragmentGroup({ group, getRowNumber, onSelect }) {
  return (
    <>
      {/* HEADER KELOMPOK MKS */}
      <tr className="bg-blue-50">
        <td
          colSpan={5}
          className="border-b border-t border-blue-100 px-4 py-3.5 md:hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
              <span className="truncate text-xs font-bold text-blue-950">
                {group.name}
              </span>
            </div>

            <span className="shrink-0 rounded-full border border-blue-100 bg-white px-3 py-1 text-[10px] font-semibold text-blue-700">
              {formatNumber(group.rows.length)} debitur
            </span>
          </div>
        </td>

        <td
          colSpan={DESKTOP_COLUMNS.length + 2}
          className="hidden border-b border-t border-blue-100 px-5 py-3.5 md:table-cell"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-sm font-bold text-blue-950">
                {group.name}
              </span>
            </div>

            <span className="rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-semibold text-blue-700">
              {formatNumber(group.rows.length)} debitur
            </span>
          </div>
        </td>
      </tr>

      {group.rows.map((item) => {
        const number = getRowNumber();
        const row = item.row;

        return (
          <tr
            key={item.key}
            onClick={() => onSelect(item)}
            className="group cursor-pointer bg-white transition-colors hover:bg-blue-50/70 active:bg-blue-100"
            title="Klik untuk melihat detail lengkap"
          >
            {/* MOBILE: NAMA */}
            <td className="border-b border-zinc-100 px-4 py-4 align-middle md:hidden">
              <div className="line-clamp-2 break-words text-xs font-bold leading-5 text-zinc-900">
                {row?.[6] || "Nama tidak tersedia"}
              </div>

              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-400">
                <span>{item.unit}</span>
                <span>·</span>
                <span className="font-medium text-blue-600">Lihat detail</span>
              </div>
            </td>

            {/* MOBILE: BADE */}
            <td className="border-b border-zinc-100 px-2 py-4 text-right align-middle md:hidden">
              <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-zinc-800">
                {formatNumber(row?.[8])}
              </span>
            </td>

            {/* MOBILE: PRODUK */}
            <td className="border-b border-zinc-100 px-2 py-4 align-middle md:hidden">
              <span className="line-clamp-2 break-words text-[11px] leading-5 text-zinc-600">
                {row?.[14] || "-"}
              </span>
            </td>

            {/* MOBILE: TUNGGAKAN */}
            <td className="border-b border-zinc-100 px-3 py-4 text-right align-middle md:hidden">
              <span className="whitespace-nowrap text-xs font-bold tabular-nums text-zinc-900">
                {formatNumber(row?.[24])}
              </span>
            </td>

            {/* DESKTOP: NOMOR */}
            <td className="hidden border-b border-zinc-100 px-4 py-4 text-center text-xs text-zinc-400 md:table-cell">
              {number}
            </td>

            {/* DESKTOP: DATA LENGKAP */}
            {DESKTOP_COLUMNS.map((column) => (
              <td
                key={column.index}
                className="hidden border-b border-zinc-100 px-4 py-4 text-xs leading-5 text-zinc-700 md:table-cell"
              >
                <span
                  className={
                    column.index === 6
                      ? "font-bold text-zinc-900"
                      : column.index === 8 || column.index === 24
                        ? "font-semibold tabular-nums text-zinc-800"
                        : ""
                  }
                >
                  {formatCell(column, row?.[column.index])}
                </span>
              </td>
            ))}

            {/* DESKTOP: DETAIL */}
            <td className="hidden border-b border-zinc-100 px-4 py-4 text-center md:table-cell">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-semibold text-zinc-600 transition group-hover:border-blue-200 group-hover:bg-white group-hover:text-blue-700">
                <Eye className="h-3.5 w-3.5" />
                Detail
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
}

export default function RaportMuPage() {
  const [data, setData] = useState(null);
  const [excelFile, setExcelFile] = useState(null);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [twoAOpen, setTwoAOpen] = useState(false);
  const [easyCallOpen, setEasyCallOpen] = useState(false);

  useEffect(() => {
    setData(getRaportMuData());
  }, []);

  function handleImport(importData) {
    const nextData = {
      ...importData,
      updatedAt: new Date().toISOString(),
    };

    try {
      saveRaportMuData(nextData);
      setData(nextData);
    } catch (error) {
      console.error("Gagal menyimpan RaportMU:", error);
      window.alert(error?.message || "Data RaportMU gagal disimpan.");
    }
  }

  function handleFileReady(file) {
    setExcelFile(file);
  }

  function handleRemove() {
    const confirmed = window.confirm("Hapus data RaportMU hari ini?");
    if (!confirmed) return;

    setExcelFile(null);
    setBookingOpen(false);
    setTwoAOpen(false);
    setEasyCallOpen(false);

    const emptyData = {
      fileName: null,
      fileSize: null,
      importedAt: null,
      totalRows: 0,
      sheetCount: 0,
      sheets: [],
      status: "EMPTY",
      updatedAt: new Date().toISOString(),
    };

    setData(emptyData);
    saveRaportMuData(emptyData);
  }

  function handleOpenBooking() {
    if (!excelFile) {
      window.alert(
        "File Excel belum tersedia. Upload file RaportMU terlebih dahulu.",
      );
      return;
    }

    setBookingOpen(true);
  }

  function handleOpenTwoA() {
    if (!excelFile) {
      window.alert(
        "File Excel belum tersedia. Upload file RaportMU terlebih dahulu.",
      );
      return;
    }

    setTwoAOpen(true);
  }

  function handleOpenEasyCall() {
    if (!excelFile) {
      window.alert(
        "File Excel belum tersedia. Upload file RaportMU terlebih dahulu.",
      );
      return;
    }

    setEasyCallOpen(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          RaportMU
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Import, proses, dan export data RaportMU.
        </p>
      </div>

      <ExcelImportCard
        data={data}
        onImport={handleImport}
        onRemove={handleRemove}
        onFileReady={handleFileReady}
      />

      <DataSeluruh2A />

      <RaportMuProcessMenu
        disabled={!excelFile}
        onBookingClick={handleOpenBooking}
        onTwoAClick={handleOpenTwoA}
        onEasyCallClick={handleOpenEasyCall}
      />

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        file={excelFile}
      />

      <TwoATagihanModal
        open={twoAOpen}
        onClose={() => setTwoAOpen(false)}
        file={excelFile}
      />

      <EasyCallModal
        open={easyCallOpen}
        onClose={() => setEasyCallOpen(false)}
        file={excelFile}
      />
    </div>
  );
}
