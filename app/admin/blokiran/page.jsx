"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Edit3,
  FileSearch,
  LockKeyhole,
  Plus,
  Search,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

/* =========================================================
   MOCK DATA
   SEMENTARA UNTUK TAMPILAN
   NANTI DIGANTI DENGAN SUPABASE
========================================================= */

const mockPK = [
  {
    id: "pk-001",
    unit: "JKK1",
    mks: "Aris",
    nama: "Budi Santoso",
    rekTabungan: "11081-01-001234-5",
    rekPinjaman: "11081-88-001122-3",
    cif: "CIF00123",
    produk: "KUM",
    limit: 150000000,
  },
  {
    id: "pk-002",
    unit: "JKK1",
    mks: "Fadilah Jismi",
    nama: "Siti Rahma",
    rekTabungan: "11081-01-002345-6",
    rekPinjaman: "11081-88-002233-4",
    cif: "CIF00234",
    produk: "KUR",
    limit: 200000000,
  },
  {
    id: "pk-003",
    unit: "JKK1",
    mks: "Aris",
    nama: "Andi Saputra",
    rekTabungan: "11081-01-003456-7",
    rekPinjaman: "11081-88-003344-5",
    cif: "CIF00345",
    produk: "KUM",
    limit: 125000000,
  },
  {
    id: "pk-004",
    unit: "JKK2",
    mks: "Fadilah Jismi",
    nama: "Rudi Hartono",
    rekTabungan: "11081-02-004567-8",
    rekPinjaman: "11081-89-004455-6",
    cif: "CIF00456",
    produk: "KUR",
    limit: 300000000,
  },
];

const initialBlocked = [
  {
    id: "blok-001",
    unit: "JKK1",

    mks: "Aris",
    nama: "Budi Santoso",

    rekTabungan: "11081-01-001234-5",
    rekPinjaman: "11081-88-001122-3",
    cif: "CIF00123",
    produk: "KUM",
    limit: 150000000,

    // JUMLAH BLOKIRAN AWAL
    blokiranAwal: 5000000,

    // JUMLAH YANG SUDAH DIBUKA
    jumlahDibuka: 2000000,

    // STATUS
    statusBayar: false,
    tutupBlokiran: false,
  },

  {
    id: "blok-002",
    unit: "JKK1",

    mks: "Fadilah Jismi",
    nama: "Siti Rahma",

    rekTabungan: "11081-01-002345-6",
    rekPinjaman: "11081-88-002233-4",
    cif: "CIF00234",
    produk: "KUR",
    limit: 200000000,

    blokiranAwal: 7500000,
    jumlahDibuka: 0,

    statusBayar: false,
    tutupBlokiran: false,
  },

  {
    id: "blok-003",
    unit: "JKK1",

    mks: "Aris",
    nama: "Andi Saputra",

    rekTabungan: "11081-01-003456-7",
    rekPinjaman: "11081-88-003344-5",
    cif: "CIF00345",
    produk: "KUM",
    limit: 125000000,

    blokiranAwal: 3000000,
    jumlahDibuka: 3000000,

    statusBayar: true,
    tutupBlokiran: true,
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getSisaBlokiran(item) {
  return Math.max(
    0,
    Number(item.blokiranAwal || 0) - Number(item.jumlahDibuka || 0),
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ value, type = "default" }) {
  const styles = value
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-zinc-100 text-zinc-500 ring-zinc-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {value ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <span className="h-3.5 w-3.5 rounded-full border border-zinc-300" />
      )}

      {value ? "Sudah" : "Belum"}
    </span>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function BlokiranPage() {
  /*
    SEMENTARA

    Nanti activeUnit diambil dari UnitContext / Topbar.

    Contoh:
    const { activeUnit } = useUnit();

    sehingga ketika Topbar berubah:
    JKK1 -> JKK2

    data halaman ini otomatis berubah.
  */

  const activeUnit = "JKK1";

  const [data, setData] = useState(initialBlocked);

  /* ADD */

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addMode, setAddMode] = useState("search");

  const [search, setSearch] = useState("");
  const [selectedSearch, setSelectedSearch] = useState([]);

  /* DETAIL */

  const [selectedRow, setSelectedRow] = useState(null);

  /* EDIT */

  const [showEdit, setShowEdit] = useState(false);

  /* DELETE */

  const [showDelete, setShowDelete] = useState(false);

  /* MANUAL FORM */

  const [manualForm, setManualForm] = useState({
    mks: "",
    nama: "",
    rekTabungan: "",
    rekPinjaman: "",
    cif: "",
    produk: "",
    limit: "",
    blokiranAwal: "",
  });

  /* =======================================================
     FILTER UNIT AKTIF
  ======================================================= */

  const unitData = useMemo(() => {
    return data.filter((item) => item.unit === activeUnit);
  }, [data, activeUnit]);

  /* =======================================================
     SEARCH DATA PK
  ======================================================= */

  const searchResults = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return [];
    }

    return mockPK.filter((item) => {
      if (item.unit !== activeUnit) {
        return false;
      }

      return [
        item.nama,
        item.mks,
        item.rekTabungan,
        item.rekPinjaman,
        item.cif,
        item.produk,
      ].some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [search, activeUnit]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const totalBlokiran = unitData.reduce(
      (total, item) => total + Number(item.blokiranAwal || 0),
      0,
    );

    const totalDibuka = unitData.reduce(
      (total, item) => total + Number(item.jumlahDibuka || 0),
      0,
    );

    return {
      totalData: unitData.length,
      totalBlokiran,
      totalDibuka,

      belumBayar: unitData.filter((item) => !item.statusBayar).length,

      belumDitutup: unitData.filter((item) => !item.tutupBlokiran).length,
    };
  }, [unitData]);

  /* =======================================================
     SEARCH SELECTION
  ======================================================= */

  function toggleSearchSelection(id) {
    setSelectedSearch((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  /* =======================================================
     ADD FROM PK
  ======================================================= */

  function addSelectedPK() {
    const selected = mockPK.filter((item) => selectedSearch.includes(item.id));

    const newRows = selected
      .filter(
        (item) =>
          !data.some(
            (existing) =>
              existing.unit === activeUnit &&
              existing.rekTabungan === item.rekTabungan,
          ),
      )
      .map((item) => ({
        id: `blok-${Date.now()}-${item.id}`,

        unit: item.unit,

        mks: item.mks,
        nama: item.nama,

        rekTabungan: item.rekTabungan,
        rekPinjaman: item.rekPinjaman,

        cif: item.cif,
        produk: item.produk,
        limit: item.limit,

        blokiranAwal: 0,
        jumlahDibuka: 0,

        statusBayar: false,
        tutupBlokiran: false,
      }));

    setData((current) => [...newRows, ...current]);

    setSelectedSearch([]);
    setSearch("");
    setShowAddPanel(false);
  }

  /* =======================================================
     ADD MANUAL
  ======================================================= */

  function addManual() {
    if (
      !manualForm.nama ||
      !manualForm.rekTabungan ||
      !manualForm.blokiranAwal
    ) {
      return;
    }

    const newRow = {
      id: `blok-manual-${Date.now()}`,

      unit: activeUnit,

      mks: manualForm.mks,
      nama: manualForm.nama,

      rekTabungan: manualForm.rekTabungan,
      rekPinjaman: manualForm.rekPinjaman,

      cif: manualForm.cif,
      produk: manualForm.produk,
      limit: Number(manualForm.limit) || 0,

      blokiranAwal: Number(manualForm.blokiranAwal) || 0,

      jumlahDibuka: 0,

      statusBayar: false,
      tutupBlokiran: false,
    };

    setData((current) => [newRow, ...current]);

    setManualForm({
      mks: "",
      nama: "",
      rekTabungan: "",
      rekPinjaman: "",
      cif: "",
      produk: "",
      limit: "",
      blokiranAwal: "",
    });

    setShowAddPanel(false);
  }

  /* =======================================================
     UPDATE
  ======================================================= */

  function updateSelectedRow(patch) {
    if (!selectedRow) return;

    setData((current) =>
      current.map((item) =>
        item.id === selectedRow.id
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );

    setSelectedRow((current) =>
      current
        ? {
            ...current,
            ...patch,
          }
        : null,
    );
  }

  /* =======================================================
     DELETE

     NANTI:
     SUPABASE HARD DELETE

     .from("blokiran")
     .delete()
     .eq("id", selectedRow.id)

     Tidak menggunakan archive / soft delete.
  ======================================================= */

  function deleteSelectedRow() {
    if (!selectedRow) return;

    setData((current) => current.filter((item) => item.id !== selectedRow.id));

    setSelectedRow(null);
    setShowDelete(false);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-6">
      {/* =================================================
            HEADER
        ================================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Blokiran
            </h1>

            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
              {activeUnit}
            </span>
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            Pengelolaan blokiran debitur pada unit aktif.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddMode("search");
            setShowAddPanel(true);
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Tambah Blokiran
        </button>
      </div>

      {/* =================================================
            SUMMARY
        ================================================= */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Total Data"
          value={summary.totalData}
          icon={LockKeyhole}
        />

        <SummaryCard
          label="Total Blokiran"
          value={formatRupiah(summary.totalBlokiran)}
          icon={CircleDollarSign}
          compact
        />

        <SummaryCard
          label="Sudah Dibuka"
          value={formatRupiah(summary.totalDibuka)}
          icon={CheckCircle2}
          compact
        />

        <SummaryCard
          label="Belum Ditutup"
          value={summary.belumDitutup}
          icon={WalletCards}
        />
      </div>

      {/* =================================================
            TABLE
        ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {/* TABLE TOP */}

        <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Data Blokiran</h2>

            <p className="mt-0.5 text-xs text-zinc-500">
              Data unit {activeUnit}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAddMode("search");
              setShowAddPanel(true);
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <Search className="h-3.5 w-3.5" />
            Cari Debitur
          </button>
        </div>

        {/* =================================================
              DESKTOP
          ================================================= */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[950px] text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70">
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Nama Debitur
                </th>

                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Rek Tabungan
                </th>

                <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Jml Blokiran
                </th>

                <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Jml Dibuka
                </th>

                <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Status Bayar
                </th>

                <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Tutup Blokiran
                </th>

                <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {unitData.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedRow(item)}
                  className="cursor-pointer transition hover:bg-zinc-50"
                >
                  {/* NAMA */}

                  <td className="px-5 py-4">
                    <div className="font-semibold text-zinc-900">
                      {item.nama}
                    </div>

                    <div className="mt-0.5 text-xs text-zinc-400">
                      {item.mks || "-"}
                    </div>
                  </td>

                  {/* REK */}

                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-zinc-600">
                      {item.rekTabungan}
                    </span>
                  </td>

                  {/* BLOKIRAN */}

                  <td className="px-5 py-4 text-right">
                    <span className="font-semibold text-zinc-900">
                      {formatRupiah(item.blokiranAwal)}
                    </span>
                  </td>

                  {/* DIBUKA */}

                  <td className="px-5 py-4 text-right">
                    <span className="font-semibold text-emerald-600">
                      {formatRupiah(item.jumlahDibuka)}
                    </span>
                  </td>

                  {/* BAYAR */}

                  <td className="px-5 py-4 text-center">
                    <StatusBadge value={item.statusBayar} />
                  </td>

                  {/* TUTUP */}

                  <td className="px-5 py-4 text-center">
                    <StatusBadge value={item.tutupBlokiran} />
                  </td>

                  {/* AKSI */}

                  <td
                    className="px-5 py-4 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRow(item);
                          setShowEdit(true);
                        }}
                        className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRow(item);
                          setShowDelete(true);
                        }}
                        className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {unitData.length === 0 && (
            <EmptyState onAdd={() => setShowAddPanel(true)} />
          )}
        </div>

        {/* =================================================
              MOBILE
          ================================================= */}

        <div className="divide-y divide-zinc-100 md:hidden">
          {unitData.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedRow(item)}
              className="flex cursor-pointer items-center gap-3 px-4 py-4 transition active:bg-zinc-50"
            >
              {/* ICON */}

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                <UserRound className="h-5 w-5" />
              </div>

              {/* NAMA */}

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-zinc-900">
                  {item.nama}
                </div>

                <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">
                  {item.rekTabungan}
                </div>
              </div>

              {/* JUMLAH */}

              <div className="shrink-0 text-right">
                <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  Blokiran
                </div>

                <div className="mt-1 text-sm font-bold text-zinc-900">
                  {formatRupiah(item.blokiranAwal)}
                </div>
              </div>

              {/* ACTION */}

              <div
                className="flex shrink-0 items-center"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSelectedRow(item)}
                  className="rounded-lg p-1.5 text-zinc-300"
                >
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>
              </div>
            </div>
          ))}

          {unitData.length === 0 && (
            <EmptyState onAdd={() => setShowAddPanel(true)} />
          )}
        </div>
      </div>

      {/* =====================================================
          TAMBAH
      ===================================================== */}

      {showAddPanel && (
        <AddModal
          activeUnit={activeUnit}
          mode={addMode}
          setMode={setAddMode}
          onClose={() => setShowAddPanel(false)}
          search={search}
          setSearch={setSearch}
          searchResults={searchResults}
          selectedSearch={selectedSearch}
          toggleSearchSelection={toggleSearchSelection}
          addSelectedPK={addSelectedPK}
          manualForm={manualForm}
          setManualForm={setManualForm}
          addManual={addManual}
          data={data}
        />
      )}

      {/* =====================================================
          DETAIL
      ===================================================== */}

      {selectedRow && !showEdit && !showDelete && (
        <DetailModal
          item={selectedRow}
          onClose={() => setSelectedRow(null)}
          onEdit={() => setShowEdit(true)}
          onDelete={() => setShowDelete(true)}
        />
      )}

      {/* =====================================================
          EDIT
      ===================================================== */}

      {selectedRow && showEdit && (
        <EditModal
          item={selectedRow}
          onClose={() => setShowEdit(false)}
          onSave={(patch) => {
            updateSelectedRow(patch);
            setShowEdit(false);
          }}
        />
      )}

      {/* =====================================================
          DELETE
      ===================================================== */}

      {selectedRow && showDelete && (
        <DeleteModal
          item={selectedRow}
          onClose={() => setShowDelete(false)}
          onDelete={deleteSelectedRow}
        />
      )}
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({ label, value, icon: Icon, compact = false }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <Icon className="h-4 w-4" />
        </div>

        <span
          className={`font-bold tracking-tight text-zinc-900 ${
            compact ? "text-sm sm:text-base" : "text-2xl"
          }`}
        >
          {value}
        </span>
      </div>

      <div className="mt-3 text-xs font-medium text-zinc-500">{label}</div>
    </div>
  );
}

/* =========================================================
   ADD MODAL
========================================================= */

function AddModal({
  activeUnit,
  mode,
  setMode,
  onClose,

  search,
  setSearch,

  searchResults,
  selectedSearch,
  toggleSearchSelection,
  addSelectedPK,

  manualForm,
  setManualForm,
  addManual,

  data,
}) {
  return (
    <Modal
      title="Tambah Blokiran"
      subtitle={`Unit aktif: ${activeUnit}`}
      onClose={onClose}
      wide
    >
      {/* MODE */}

      <div className="mb-5 flex rounded-xl bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            mode === "search"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500"
          }`}
        >
          Cari dari PK
        </button>

        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            mode === "manual"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500"
          }`}
        >
          Input Manual
        </button>
      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      {mode === "search" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, rekening, CIF..."
              autoFocus
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
            />
          </div>

          {search && (
            <div className="overflow-hidden rounded-xl border border-zinc-200">
              {searchResults.length > 0 ? (
                <div className="divide-y divide-zinc-100">
                  {searchResults.map((item) => {
                    const checked = selectedSearch.includes(item.id);

                    const alreadyAdded = data.some(
                      (existing) =>
                        existing.unit === activeUnit &&
                        existing.rekTabungan === item.rekTabungan,
                    );

                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                          checked ? "bg-zinc-50" : "hover:bg-zinc-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={alreadyAdded}
                          onChange={() => toggleSearchSelection(item.id)}
                          className="h-4 w-4 rounded border-zinc-300"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-zinc-900">
                            {item.nama}
                          </div>

                          <div className="mt-0.5 text-xs text-zinc-500">
                            {item.mks} · {item.produk} · {item.rekTabungan}
                          </div>
                        </div>

                        {alreadyAdded && (
                          <span className="text-[10px] font-semibold text-emerald-600">
                            Sudah ada
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <FileSearch className="mx-auto h-7 w-7 text-zinc-300" />

                  <p className="mt-2 text-sm font-medium text-zinc-700">
                    Data tidak ditemukan
                  </p>

                  <p className="mt-1 text-xs text-zinc-400">
                    Coba gunakan nama, rekening, atau CIF.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {selectedSearch.length} data dipilih
            </span>

            <button
              type="button"
              disabled={selectedSearch.length === 0}
              onClick={addSelectedPK}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Tambahkan
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          MANUAL
      ================================================= */}

      {mode === "manual" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Nama Debitur"
              required
              value={manualForm.nama}
              onChange={(value) =>
                setManualForm({
                  ...manualForm,
                  nama: value,
                })
              }
            />

            <InputField
              label="MKS"
              value={manualForm.mks}
              onChange={(value) =>
                setManualForm({
                  ...manualForm,
                  mks: value,
                })
              }
            />

            <InputField
              label="Rek Tabungan"
              required
              value={manualForm.rekTabungan}
              onChange={(value) =>
                setManualForm({
                  ...manualForm,
                  rekTabungan: value,
                })
              }
            />

            <InputField
              label="Rek Pinjaman"
              value={manualForm.rekPinjaman}
              onChange={(value) =>
                setManualForm({
                  ...manualForm,
                  rekPinjaman: value,
                })
              }
            />

            <InputField
              label="CIF"
              value={manualForm.cif}
              onChange={(value) =>
                setManualForm({
                  ...manualForm,
                  cif: value,
                })
              }
            />

            <InputField
              label="Produk"
              value={manualForm.produk}
              onChange={(value) =>
                setManualForm({
                  ...manualForm,
                  produk: value,
                })
              }
            />

            <InputField
              label="Limit"
              type="number"
              value={manualForm.limit}
              onChange={(value) =>
                setManualForm({
                  ...manualForm,
                  limit: value,
                })
              }
            />

            <InputField
              label="Jumlah Blokiran Awal"
              required
              type="number"
              value={manualForm.blokiranAwal}
              onChange={(value) =>
                setManualForm({
                  ...manualForm,
                  blokiranAwal: value,
                })
              }
            />
          </div>

          <div className="flex justify-end border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={addManual}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              Tambahkan
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* =========================================================
   DETAIL MODAL
========================================================= */

function DetailModal({ item, onClose, onEdit, onDelete }) {
  const sisa = getSisaBlokiran(item);

  return (
    <Modal
      title="Detail Blokiran"
      subtitle={`${item.nama} · ${item.unit}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        {/* PROFILE */}

        <div className="flex items-center gap-4 rounded-2xl bg-zinc-50 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white">
            <UserRound className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-bold text-zinc-900">{item.nama}</div>

            <div className="mt-1 text-xs text-zinc-500">
              MKS:{" "}
              <span className="font-semibold text-zinc-700">
                {item.mks || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* DATA DEBITUR */}

        <div>
          <SectionTitle title="Data Debitur" />

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Rek Tabungan" value={item.rekTabungan} mono />

            <DetailItem
              label="Rek Pinjaman"
              value={item.rekPinjaman || "-"}
              mono
            />

            <DetailItem label="CIF" value={item.cif || "-"} />

            <DetailItem label="Produk" value={item.produk || "-"} />

            <DetailItem label="Limit" value={formatRupiah(item.limit)} />
          </div>
        </div>

        {/* BLOKIRAN */}

        <div>
          <SectionTitle title="Informasi Blokiran" />

          <div className="grid gap-3 sm:grid-cols-3">
            <DetailItem
              label="Blokiran Awal"
              value={formatRupiah(item.blokiranAwal)}
              strong
            />

            <DetailItem
              label="Sudah Dibuka"
              value={formatRupiah(item.jumlahDibuka)}
              strong
            />

            <DetailItem
              label="Sisa Blokiran"
              value={formatRupiah(sisa)}
              strong
            />
          </div>
        </div>

        {/* STATUS */}

        <div>
          <SectionTitle title="Status" />

          <div className="grid gap-3 sm:grid-cols-2">
            <StatusBox label="Status Bayar" value={item.statusBayar} />

            <StatusBox label="Tutup Blokiran" value={item.tutupBlokiran} />
          </div>
        </div>

        {/* ACTION */}

        <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Hapus Permanen
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            <Edit3 className="h-4 w-4" />
            Edit Data
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   EDIT MODAL
========================================================= */

function EditModal({ item, onClose, onSave }) {
  const [blokiranAwal, setBlokiranAwal] = useState(item.blokiranAwal);

  const [jumlahDibuka, setJumlahDibuka] = useState(item.jumlahDibuka);

  const [statusBayar, setStatusBayar] = useState(item.statusBayar);

  const [tutupBlokiran, setTutupBlokiran] = useState(item.tutupBlokiran);

  return (
    <Modal title="Edit Blokiran" subtitle={item.nama} onClose={onClose}>
      <div className="space-y-5">
        {/* IDENTITAS */}

        <div className="rounded-xl bg-zinc-50 p-4">
          <div className="text-sm font-bold text-zinc-900">{item.nama}</div>

          <div className="mt-1 font-mono text-xs text-zinc-500">
            {item.rekTabungan}
          </div>
        </div>

        {/* NOMINAL */}

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="Blokiran Awal"
            type="number"
            value={blokiranAwal}
            onChange={(value) => setBlokiranAwal(Number(value) || 0)}
          />

          <InputField
            label="Blokiran yang Dibuka"
            type="number"
            value={jumlahDibuka}
            onChange={(value) => setJumlahDibuka(Number(value) || 0)}
          />
        </div>

        {/* STATUS */}

        <div className="space-y-2">
          <EditToggle
            label="Status Bayar"
            description="Blokiran sudah dibayar"
            value={statusBayar}
            onChange={setStatusBayar}
          />

          <EditToggle
            label="Tutup Blokiran"
            description="Blokiran sudah ditutup kembali"
            value={tutupBlokiran}
            onChange={setTutupBlokiran}
          />
        </div>

        {/* SAVE */}

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() =>
              onSave({
                blokiranAwal,
                jumlahDibuka,
                statusBayar,
                tutupBlokiran,
              })
            }
            className="h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   DELETE MODAL
========================================================= */

function DeleteModal({ item, onClose, onDelete }) {
  return (
    <Modal
      title="Hapus Data Blokiran"
      subtitle="Tindakan ini tidak dapat dibatalkan."
      onClose={onClose}
    >
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <Trash2 className="h-4 w-4" />
          </div>

          <div>
            <p className="text-sm font-semibold text-red-900">
              Hapus {item.nama}?
            </p>

            <p className="mt-1 text-xs leading-5 text-red-700">
              Data blokiran akan dihapus secara permanen dari database. Tidak
              ada arsip atau data cadangan di dalam proses penghapusan ini.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Batal
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
        >
          Hapus Permanen
        </button>
      </div>
    </Modal>
  );
}

/* =========================================================
   EDIT TOGGLE
========================================================= */

function EditToggle({ label, description, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-left transition hover:bg-zinc-50"
    >
      <div>
        <div className="text-sm font-semibold text-zinc-700">{label}</div>

        <div className="mt-0.5 text-xs text-zinc-400">{description}</div>
      </div>

      <span
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${
          value ? "bg-emerald-500" : "bg-zinc-200"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

/* =========================================================
   STATUS BOX
========================================================= */

function StatusBox({ label, value }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        value
          ? "border-emerald-200 bg-emerald-50"
          : "border-zinc-200 bg-zinc-50"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        {label}
      </div>

      <div
        className={`mt-2 flex items-center gap-2 text-sm font-semibold ${
          value ? "text-emerald-700" : "text-zinc-500"
        }`}
      >
        {value ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <span className="h-4 w-4 rounded-full border-2 border-zinc-300" />
        )}

        {value ? "Sudah" : "Belum"}
      </div>
    </div>
  );
}

/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({ label, value, mono = false, strong = false }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        {label}
      </div>

      <div
        className={`mt-1.5 text-sm ${
          strong ? "font-bold text-zinc-900" : "font-medium text-zinc-700"
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({ title }) {
  return (
    <div className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
      {title}
    </div>
  );
}

/* =========================================================
   INPUT
========================================================= */

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold text-zinc-600">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </div>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
      />
    </label>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({ onAdd }) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
        <LockKeyhole className="h-6 w-6" />
      </div>

      <p className="mt-3 text-sm font-semibold text-zinc-700">
        Belum ada data blokiran
      </p>

      <p className="mt-1 text-xs text-zinc-400">
        Tambahkan data blokiran untuk unit aktif.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
      >
        <Plus className="h-3.5 w-3.5" />
        Tambah Blokiran
      </button>
    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({ title, subtitle, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        {/* HEADER */}

        <div className="flex shrink-0 items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-900">{title}</h2>

            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BODY */}

        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
