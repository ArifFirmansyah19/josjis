"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Database,
  FileSpreadsheet,
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
  { index: 14, label: "Produk" },
  { index: 19, label: "Angsuran" },
  { index: 24, label: "Total Tunggakan" },
  { index: 25, label: "AGF1" },
  { index: 26, label: "Saldo AGF1" },
  { index: 27, label: "Kecukupan Saldo" },
  { index: 28, label: "Easy Coll" },
  { index: 30, label: "Nama MKS" },
];

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
  if (value === null || value === undefined || value === "") return "";

  const number = Number(value);

  if (!Number.isFinite(number)) return String(value);

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(number);
}

function formatCell(column, value) {
  if (value === null || value === undefined) return "";

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

function getRecordMksName(record) {
  const firstRow = Array.isArray(record.data) ? record.data[0] : null;

  return String(firstRow?.[30] ?? "").trim() || "MKS tidak diketahui";
}

function DataSeluruh2A() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const today = getJakartaDate();

      // Ambil seluruh data 2A hari ini, termasuk nama file sumber.
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

  const totalRows = unitSummary.reduce(
    (total, unit) => total + unit.totalRows,
    0,
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <Database className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-base font-bold text-zinc-900">
              Seluruh Data 2A Tersimpan
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Gabungan data JKK 1 dan JKK 2 · {getJakartaDate()}
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

      <div className="grid grid-cols-1 gap-3 border-b border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <p className="text-xs text-zinc-500">Total Seluruh Data</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {formatNumber(totalRows)}
          </p>
          <p className="text-xs text-zinc-500">Baris data</p>
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
      ) : (
        <>
          {unitSummary.map((unit) => {
            let rowNumber = 0;

            return (
              <div
                key={unit.id}
                className="border-b border-zinc-200 last:border-b-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 px-5 py-3">
                  <h3 className="text-sm font-bold text-zinc-800">
                    {unit.name}
                  </h3>
                  <span className="text-xs text-zinc-500">
                    {formatNumber(unit.totalRows)} baris
                  </span>
                </div>

                {unit.records.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-zinc-400">
                    Belum ada data 2A tersimpan untuk unit ini hari ini.
                  </div>
                ) : (
                  <div className="space-y-4 p-4">
                    {unit.records.map((record) => {
                      const rows = Array.isArray(record.data)
                        ? record.data
                        : [];

                      const startNumber = rowNumber + 1;
                      rowNumber += rows.length;

                      return (
                        <div
                          key={record.id}
                          className="overflow-hidden rounded-xl border border-zinc-200"
                        >
                          {/* Informasi sumber file */}
                          <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
                                <FileSpreadsheet className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                                  Sumber File Excel
                                </p>
                                <p
                                  className="mt-1 break-all text-sm font-semibold text-blue-950"
                                  title={
                                    record.nama_file ||
                                    "Nama file tidak tersedia"
                                  }
                                >
                                  {record.nama_file ||
                                    "Nama file tidak tersedia"}
                                </p>
                                <p className="mt-1 text-xs text-blue-800">
                                  MKS: {getRecordMksName(record)}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 sm:text-right">
                              <p className="text-xs font-semibold text-zinc-700">
                                {formatNumber(rows.length)} baris data
                              </p>
                              <p className="mt-1 text-[11px] text-zinc-500">
                                Diperbarui: {formatUpdatedAt(record.updated_at)}
                              </p>
                            </div>
                          </div>

                          <div className="max-h-[420px] overflow-auto">
                            <table className="w-full min-w-max border-collapse text-xs">
                              <thead className="sticky top-0 z-10 bg-zinc-100">
                                <tr>
                                  <th className="border border-zinc-200 px-3 py-2 text-center">
                                    No.
                                  </th>
                                  <th className="border border-zinc-200 px-3 py-2 text-left">
                                    Unit
                                  </th>
                                  {COLUMNS.map((column) => (
                                    <th
                                      key={column.index}
                                      className="whitespace-nowrap border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700"
                                    >
                                      {column.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>

                              <tbody>
                                {rows.map((row, index) => (
                                  <tr
                                    key={`${record.id}-${index}`}
                                    className="hover:bg-zinc-50"
                                  >
                                    <td className="border border-zinc-200 px-3 py-2 text-center font-semibold text-zinc-500">
                                      {startNumber + index}
                                    </td>

                                    <td className="whitespace-nowrap border border-zinc-200 px-3 py-2 font-medium text-zinc-600">
                                      {unit.id}
                                    </td>

                                    {COLUMNS.map((column) => (
                                      <td
                                        key={column.index}
                                        className="whitespace-nowrap border border-zinc-200 px-3 py-2 text-zinc-700"
                                      >
                                        {formatCell(
                                          column,
                                          row?.[column.index],
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}

                                {rows.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={COLUMNS.length + 2}
                                      className="px-4 py-6 text-center text-zinc-400"
                                    >
                                      Tidak ada baris data.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {records.length === 0 && (
            <div className="px-5 py-10 text-center">
              <Database className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-3 text-sm font-semibold text-zinc-700">
                Belum ada data 2A tersimpan
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Data dari JKK 1 maupun JKK 2 akan tampil di sini setelah
                disimpan.
              </p>
            </div>
          )}
        </>
      )}
    </section>
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

      {/* DATA 2A GABUNGAN JKK 1 DAN JKK 2 */}
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
