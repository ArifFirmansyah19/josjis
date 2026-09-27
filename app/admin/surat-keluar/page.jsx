/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";

import SuratKeluarBook from "./components/SuratKeluarBook";
import SuratKeluarForm from "./components/SuratKeluarForm";
import SuratKeluarToolbar from "./components/SuratKeluarToolbar";

import {
  getSuratKeluarData,
  saveSuratKeluarData,
} from "./services/suratKeluarStorage";

import { exportSuratKeluarPdf } from "./services/suratKeluarPdf";

const ROWS_PER_PAGE = 10;

const EMPTY_DATA = {
  "JKK 1": [],
  "JKK 2": [],
};

export default function SuratKeluarPage() {
  const [unit, setUnit] = useState("JKK 1");
  const [data, setData] = useState(EMPTY_DATA);

  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const records = data[unit] || [];

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(records.length / ROWS_PER_PAGE));
  }, [records.length]);

  /*
   * Ambil data awal dari localStorage
   */
  useEffect(() => {
    const savedData = getSuratKeluarData();

    setData({
      "JKK 1": Array.isArray(savedData?.["JKK 1"]) ? savedData["JKK 1"] : [],
      "JKK 2": Array.isArray(savedData?.["JKK 2"]) ? savedData["JKK 2"] : [],
    });
  }, []);

  /*
   * Setiap pindah unit, selalu buka halaman terakhir.
   * Kalau belum ada data, halaman 1.
   */
  useEffect(() => {
    setPage(totalPages);
  }, [unit, totalPages]);

  function persist(nextData) {
    setData(nextData);
    saveSuratKeluarData(nextData);
  }

  function handleAdd() {
    setEditingRecord(null);
    setFormOpen(true);
  }

  function handleEdit(record) {
    setEditingRecord(record);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingRecord(null);
  }

  function handleSave(formData) {
    const currentRecords = data[unit] || [];

    let nextRecords;

    /*
     * EDIT
     */
    if (editingRecord) {
      nextRecords = currentRecords.map((record) => {
        if (record.id !== editingRecord.id) {
          return record;
        }

        return {
          ...record,
          tanggal: formData.tanggal,
          keterangan: formData.keterangan,
          tujuan: formData.tujuan,

          // Pertahankan metadata sumber jika record berasal
          // dari halaman lain seperti BAST.
          sumber: record.sumber || "MANUAL",
          sumberId: record.sumberId || null,
        };
      });
    } else {
      /*
       * TAMBAH MANUAL
       */
      const newRecord = {
        id: `SK-${Date.now()}`,
        unit,
        tanggal: formData.tanggal,
        keterangan: formData.keterangan,
        tujuan: formData.tujuan,

        // Metadata internal.
        // Tidak ditampilkan di tabel maupun PDF.
        sumber: "MANUAL",
        sumberId: null,
      };

      nextRecords = [...currentRecords, newRecord];
    }

    const nextData = {
      ...data,
      [unit]: nextRecords,
    };

    persist(nextData);

    /*
     * Setelah tambah/edit, buka halaman terakhir.
     */
    const nextTotalPages = Math.max(
      1,
      Math.ceil(nextRecords.length / ROWS_PER_PAGE),
    );

    setPage(nextTotalPages);

    handleCloseForm();
  }

  function handleDelete(id) {
    const record = records.find((item) => item.id === id);

    if (!record) return;

    const confirmed = window.confirm("Hapus pencatatan surat keluar ini?");

    if (!confirmed) return;

    const nextRecords = records.filter((item) => item.id !== id);

    const nextData = {
      ...data,
      [unit]: nextRecords,
    };

    persist(nextData);

    const nextTotalPages = Math.max(
      1,
      Math.ceil(nextRecords.length / ROWS_PER_PAGE),
    );

    setPage(Math.min(page, nextTotalPages));
  }

  function handleUnitChange(nextUnit) {
    setUnit(nextUnit);
  }

  function handleExport() {
    exportSuratKeluarPdf({
      unit,
      records,
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header halaman */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Surat Keluar
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Buku register surat keluar JKK 1 dan JKK 2.
          </p>
        </div>

        {/* Toolbar */}
        <SuratKeluarToolbar
          unit={unit}
          onUnitChange={handleUnitChange}
          onAdd={handleAdd}
          onExport={handleExport}
        />

        {/* Buku */}
        <SuratKeluarBook
          unit={unit}
          records={records}
          page={page}
          totalPages={totalPages}
          rowsPerPage={ROWS_PER_PAGE}
          onPageChange={setPage}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Form */}
        <SuratKeluarForm
          open={formOpen}
          editingRecord={editingRecord}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      </div>
    </DashboardLayout>
  );
}
