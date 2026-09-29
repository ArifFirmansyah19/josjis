"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";

import SuratKeluarToolbar from "./components/SuratKeluarToolbar";
import SuratKeluarBook from "./components/SuratKeluarBook";
import SuratKeluarForm from "./components/SuratKeluarForm";
import SuratKeluarNumberSettings from "./components/SuratKeluarNumberSettings";
import SuratKeluarDetailModal from "./components/SuratKeluarDetailModal";

import {
  getSuratKeluarData,
  createSuratKeluar,
  updateSuratKeluar,
  deleteSuratKeluar,
} from "./services/suratKeluarSupabase";

import { exportSuratKeluarPdf } from "./services/suratKeluarPdf";

const ROWS_PER_PAGE = 10;

export default function SuratKeluarPage() {
  const [unit, setUnit] = useState("JKK 1");
  const [tahun, setTahun] = useState(new Date().getFullYear());

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [numberSettingsOpen, setNumberSettingsOpen] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);

  // Record yang sedang dilihat pada popup detail
  const [viewingRecord, setViewingRecord] = useState(null);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(records.length / ROWS_PER_PAGE));
  }, [records.length]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const kodeUnit = unit === "JKK 1" ? "JKK1" : "JKK2";

      const result = await getSuratKeluarData(kodeUnit, tahun);

      setRecords(result);

      /*
       * Setelah data dimuat:
       * selalu buka halaman terakhir.
       */
      const nextTotalPages = Math.max(
        1,
        Math.ceil(result.length / ROWS_PER_PAGE),
      );

      setPage(nextTotalPages);
    } catch (err) {
      console.error(err);

      setError(
        err?.message || "Gagal mengambil data Surat Keluar dari database.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [unit, tahun]);

  function handleUnitChange(nextUnit) {
    setUnit(nextUnit);
    setPage(1);

    // Tutup popup jika sedang terbuka
    setViewingRecord(null);
  }

  function handleTahunChange(nextYear) {
    setTahun(nextYear);
    setPage(1);

    // Tutup popup jika sedang terbuka
    setViewingRecord(null);
  }

  function handleAdd() {
    setEditingRecord(null);
    setFormOpen(true);
  }

  function handleEdit(record) {
    setEditingRecord(record);
    setFormOpen(true);

    // Kalau edit dibuka dari tempat lain, tutup detail
    setViewingRecord(null);
  }

  function handleView(record) {
    setViewingRecord(record);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingRecord(null);
  }

  function handleCloseDetail() {
    setViewingRecord(null);
  }

  async function handleSave(formData) {
    try {
      setError("");

      const kodeUnit = unit === "JKK 1" ? "JKK1" : "JKK2";

      if (editingRecord) {
        await updateSuratKeluar({
          id: editingRecord.id,
          tanggal: formData.tanggal,
          keterangan: formData.keterangan,
          tujuan: formData.tujuan,
        });
      } else {
        await createSuratKeluar({
          kodeUnit,
          tanggal: formData.tanggal,
          keterangan: formData.keterangan,
          tujuan: formData.tujuan,
        });
      }

      handleCloseForm();

      await loadData();
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal menyimpan Surat Keluar.");
    }
  }

  async function handleDelete(id) {
    const record = records.find((item) => item.id === id);

    if (!record) return;

    const nomor = String(record.nomor_urut).padStart(3, "0");

    const confirmed = window.confirm(
      `Hapus pencatatan surat nomor ${nomor}?\n\nNomor tersebut tidak akan digunakan kembali.`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await deleteSuratKeluar(id);

      // Kalau yang dihapus sedang terbuka di detail
      if (viewingRecord?.id === id) {
        setViewingRecord(null);
      }

      await loadData();
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal menghapus surat.");
    }
  }

  function handleExport() {
    exportSuratKeluarPdf({
      unit,
      tahun,
      records,
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* =====================================================
            HEADER
            ===================================================== */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Surat Keluar
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Buku register surat keluar resmi JKK 1 dan JKK 2.
          </p>
        </div>

        {/* =====================================================
            TOOLBAR
            ===================================================== */}
        <SuratKeluarToolbar
          unit={unit}
          tahun={tahun}
          onUnitChange={handleUnitChange}
          onTahunChange={handleTahunChange}
          onAdd={handleAdd}
          onSettings={() => setNumberSettingsOpen(true)}
          onExport={handleExport}
        />

        {/* =====================================================
            ERROR
            ===================================================== */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            BUKU SURAT KELUAR
            ===================================================== */}
        <SuratKeluarBook
          unit={unit}
          tahun={tahun}
          records={records}
          page={page}
          totalPages={totalPages}
          rowsPerPage={ROWS_PER_PAGE}
          loading={loading}
          onPageChange={setPage}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* =====================================================
            FORM TAMBAH / EDIT
            ===================================================== */}
        <SuratKeluarForm
          open={formOpen}
          editingRecord={editingRecord}
          selectedYear={tahun}
          onClose={handleCloseForm}
          onSave={handleSave}
        />

        {/* =====================================================
            PENGATURAN NOMOR
            ===================================================== */}
        <SuratKeluarNumberSettings
          open={numberSettingsOpen}
          unit={unit}
          tahun={tahun}
          onClose={() => setNumberSettingsOpen(false)}
          onSaved={async () => {
            await loadData();
          }}
        />

        {/* =====================================================
            DETAIL SURAT
            ===================================================== */}
        <SuratKeluarDetailModal
          record={viewingRecord}
          onClose={handleCloseDetail}
        />
      </div>
    </DashboardLayout>
  );
}
