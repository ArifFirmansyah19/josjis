"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Upload,
  Download,
  X,
  Pencil,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";

const DUMMY_DATA = [
  {
    id: 1,
    debitur: "Budi Santoso",
    limit: 250000000,
    tglPk: "2026-09-10",
    pengikatan: "APHT",
    norek: "1234567890",
    keterangan: "Pengikatan 2, siap 1",
    status: "Selesai Sebagian",
    unit: "JKK1",
  },
  {
    id: 2,
    debitur: "Siti Aminah",
    limit: 350000000,
    tglPk: "2026-09-15",
    pengikatan: "APHT",
    norek: "1234567891",
    keterangan: "Menunggu pengikatan",
    status: "Pending",
    unit: "JKK1",
  },
  {
    id: 3,
    debitur: "Andi Saputra",
    limit: 180000000,
    tglPk: "2026-09-18",
    pengikatan: "",
    norek: "1234567892",
    keterangan: "Dokumen sedang dilengkapi",
    status: "Pending",
    unit: "JKK1",
  },
  {
    id: 4,
    debitur: "Dewi Lestari",
    limit: 500000000,
    tglPk: "2026-09-05",
    pengikatan: "APHT",
    norek: "1234567893",
    keterangan: "Sudah selesai seluruhnya",
    status: "Selesai",
    unit: "JKK2",
  },
];

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTanggal(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStatusClass(status) {
  if (status === "Selesai") {
    return "text-gray-900";
  }

  if (status === "Selesai Sebagian") {
    return "text-gray-700";
  }

  return "text-gray-600";
}

export default function PendingNotarisPage() {
  const { activeUnit } = useUnit();

  const [data, setData] = useState(DUMMY_DATA);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    debitur: "",
    limit: "",
    tglPk: "",
    pengikatan: "",
    norek: "",
    keterangan: "",
    status: "Pending",
  });

  const currentUnit = activeUnit?.kode_unit || activeUnit?.kode || "JKK1";

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const unitMatch =
        !currentUnit || currentUnit === "SEMUA" || item.unit === currentUnit;

      const keyword = search.toLowerCase().trim();

      const searchMatch =
        !keyword ||
        item.debitur?.toLowerCase().includes(keyword) ||
        item.norek?.toLowerCase().includes(keyword) ||
        item.keterangan?.toLowerCase().includes(keyword);

      const statusMatch =
        statusFilter === "Semua" || item.status === statusFilter;

      return unitMatch && searchMatch && statusMatch;
    });
  }, [data, currentUnit, search, statusFilter]);

  function openAddModal() {
    setEditingId(null);

    setForm({
      debitur: "",
      limit: "",
      tglPk: "",
      pengikatan: "",
      norek: "",
      keterangan: "",
      status: "Pending",
    });

    setShowModal(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);

    setForm({
      debitur: item.debitur || "",
      limit: item.limit || "",
      tglPk: item.tglPk || "",
      pengikatan: item.pengikatan === "APHT" ? "APHT" : "",
      norek: item.norek || "",
      keterangan: item.keterangan || "",
      status: item.status || "Pending",
    });

    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!form.debitur.trim()) {
      alert("Nama debitur wajib diisi.");
      return;
    }

    const payload = {
      id: editingId || Date.now(),
      debitur: form.debitur.trim(),
      limit: Number(form.limit) || 0,
      tglPk: form.tglPk,
      // Pengikatan hanya boleh APHT
      pengikatan: form.pengikatan === "APHT" ? "APHT" : "",
      norek: form.norek.trim(),
      keterangan: form.keterangan.trim(),
      status: form.status,
      unit: currentUnit,
    };

    if (editingId) {
      setData((prev) =>
        prev.map((item) =>
          item.id === editingId ? { ...item, ...payload } : item,
        ),
      );
    } else {
      setData((prev) => [payload, ...prev]);
    }

    closeModal();
  }

  function handleDelete(id) {
    const item = data.find((x) => x.id === id);

    if (!item) return;

    const yakin = window.confirm(
      `Hapus monitoring Pending Notaris untuk ${item.debitur}?`,
    );

    if (!yakin) return;

    setData((prev) => prev.filter((item) => item.id !== id));
  }

  function handleExport() {
    const rows = filteredData.map((item) => ({
      Debitur: item.debitur,
      "Limit Pinjaman": item.limit,
      "Tgl PK": item.tglPk,
      Pengikatan: item.pengikatan,
      "No. Rekening": item.norek,
      Keterangan: item.keterangan,
      Status: item.status,
    }));

    if (!rows.length) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = Object.keys(rows[0]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            return `"${String(value).replaceAll('"', '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Pending-Notaris-${currentUnit}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function handleImport() {
    alert(
      "Import Excel akan disambungkan ke template Excel Anda. Struktur template tidak saya ubah sebelum file template diberikan.",
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full px-3 py-4 sm:px-5 lg:px-6">
        {/* HEADER */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">
              Pending Notaris
            </h1>

            <p className="mt-0.5 text-xs text-gray-500">
              Monitoring pengikatan yang masih berproses di notaris.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800"
          >
            <Plus size={15} />
            Tambah
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            {/* SEARCH */}
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari debitur / rekening..."
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-xs outline-none focus:border-gray-400 focus:bg-white"
              />
            </div>

            {/* STATUS */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs outline-none focus:border-gray-400"
            >
              <option value="Semua">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Selesai Sebagian">Selesai Sebagian</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleImport}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:flex-none"
            >
              <Upload size={14} />
              Import Excel
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:flex-none"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-medium text-gray-500">
                  <th className="px-3 py-2.5">Debitur</th>
                  <th className="px-3 py-2.5">Limit Pinjaman</th>
                  <th className="px-3 py-2.5">Tgl PK</th>
                  <th className="px-3 py-2.5">Pengikatan</th>
                  <th className="px-3 py-2.5">No. Rekening</th>
                  <th className="px-3 py-2.5">Keterangan</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="w-20 px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-xs text-gray-400"
                    >
                      Tidak ada data.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70"
                    >
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        {item.debitur}
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">
                        {formatRupiah(item.limit)}
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
                        {formatTanggal(item.tglPk)}
                      </td>

                      <td className="px-3 py-2.5 text-gray-700">
                        {item.pengikatan || "-"}
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
                        {item.norek || "-"}
                      </td>

                      <td className="max-w-[240px] truncate px-3 py-2.5 text-gray-600">
                        {item.keterangan || "-"}
                      </td>

                      <td
                        className={`px-3 py-2.5 whitespace-nowrap ${getStatusClass(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Edit"
                            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            title="Hapus"
                            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE */}
        <div className="space-y-2 md:hidden">
          {filteredData.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-xs text-gray-400">
              Tidak ada data.
            </div>
          ) : (
            filteredData.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-3"
              >
                {/* ROW 1 */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">
                      {item.debitur}
                    </div>

                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {item.norek || "-"}
                    </div>
                  </div>

                  <div className="shrink-0 text-right text-xs text-gray-700">
                    {formatRupiah(item.limit)}
                  </div>
                </div>

                {/* ROW 2 */}
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-gray-100 pt-2">
                  <div>
                    <div className="text-[10px] text-gray-400">Tgl PK</div>

                    <div className="text-[11px] text-gray-700">
                      {formatTanggal(item.tglPk)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-gray-400">Pengikatan</div>

                    <div className="text-[11px] text-gray-700">
                      {item.pengikatan || "-"}
                    </div>
                  </div>
                </div>

                {/* KETERANGAN */}
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <div className="text-[10px] text-gray-400">Keterangan</div>

                  <div className="mt-0.5 text-[11px] leading-4 text-gray-700">
                    {item.keterangan || "-"}
                  </div>
                </div>

                {/* BOTTOM */}
                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                  <div
                    className={`text-[11px] font-medium ${getStatusClass(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER COUNT */}
        <div className="mt-2 text-[11px] text-gray-400">
          {filteredData.length} data ditampilkan
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
            {/* MODAL HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {editingId
                    ? "Edit Pending Notaris"
                    : "Tambah Pending Notaris"}
                </h2>

                <p className="text-[10px] text-gray-400">{currentUnit}</p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X size={17} />
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-700">
                  Nama Debitur
                </label>

                <input
                  type="text"
                  value={form.debitur}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      debitur: e.target.value,
                    })
                  }
                  placeholder="Nama debitur"
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-700">
                    Limit Pinjaman
                  </label>

                  <input
                    type="number"
                    value={form.limit}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        limit: e.target.value,
                      })
                    }
                    placeholder="250000000"
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-700">
                    Tgl PK
                  </label>

                  <input
                    type="date"
                    value={form.tglPk}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tglPk: e.target.value,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              {/* HANYA APHT */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-700">
                  Pengikatan
                </label>

                <select
                  value={form.pengikatan}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pengikatan: e.target.value,
                    })
                  }
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-gray-400"
                >
                  <option value="">Tidak ada</option>
                  <option value="APHT">APHT</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-700">
                  No. Rekening Pinjaman
                </label>

                <input
                  type="text"
                  value={form.norek}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      norek: e.target.value,
                    })
                  }
                  placeholder="Nomor rekening"
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-700">
                  Keterangan
                </label>

                <textarea
                  value={form.keterangan}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      keterangan: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Contoh: Pengikatan 2, siap 1"
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-700">
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value,
                    })
                  }
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-gray-400"
                >
                  <option value="Pending">Pending</option>
                  <option value="Selesai Sebagian">Selesai Sebagian</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              {/* ACTION */}
              <div className="flex gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-9 flex-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="h-9 flex-1 rounded-lg bg-gray-900 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
