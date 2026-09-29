"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";

import NotarisToolbar from "../notaris/components/NotarisToolbar";
import NotarisTable from "../notaris/components/NotarisTable";
import NotarisForm from "../notaris/components/NotarisForm";
import NotarisDetailModal from "../notaris/components/NotarisDetailModal";

import {
  getNotarisData,
  createNotaris,
  updateNotaris,
  deleteNotaris,
} from "../notaris/services/notarisSupabase";

export default function DataNotarisPage() {
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [viewingRecord, setViewingRecord] = useState(null);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const result = await getNotarisData();

      setRecords(result);
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal mengambil data notaris.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return records;
    }

    return records.filter((record) => {
      return [
        record.nama_notaris,
        record.provinsi,
        record.kabupaten,
        record.nomor_rekening,
        record.jenis_rekanan ? "iya" : "tidak",
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [records, search]);

  function handleAdd() {
    setEditingRecord(null);
    setFormOpen(true);
  }

  function handleEdit(record) {
    setViewingRecord(null);
    setEditingRecord(record);
    setFormOpen(true);
  }

  function handleView(record) {
    setViewingRecord(record);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingRecord(null);
  }

  async function handleSave(formData) {
    try {
      setError("");

      if (editingRecord) {
        await updateNotaris({
          id: editingRecord.id,
          ...formData,
        });
      } else {
        await createNotaris(formData);
      }

      handleCloseForm();

      await loadData();
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal menyimpan data notaris.");

      throw err;
    }
  }

  async function handleDelete(id) {
    const record = records.find((item) => item.id === id);

    if (!record) return;

    const confirmed = window.confirm(
      `Hapus data notaris "${record.nama_notaris}"?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await deleteNotaris(id);

      if (viewingRecord?.id === id) {
        setViewingRecord(null);
      }

      await loadData();
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal menghapus data notaris.");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Data Notaris
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Master data notaris untuk kebutuhan proses agunan.
          </p>
        </div>

        {/* TOOLBAR */}
        <NotarisToolbar
          search={search}
          onSearchChange={setSearch}
          onAdd={handleAdd}
        />

        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* TABLE */}
        <NotarisTable
          records={filteredRecords}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* FORM */}
        <NotarisForm
          open={formOpen}
          editingRecord={editingRecord}
          onClose={handleCloseForm}
          onSave={handleSave}
        />

        {/* DETAIL */}
        <NotarisDetailModal
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
        />
      </div>
    </DashboardLayout>
  );
}
