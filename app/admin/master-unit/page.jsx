"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Archive,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

const STATUS = {
  AKTIF: "AKTIF",
  NONAKTIF: "NONAKTIF",
  ARSIP: "ARSIP",
};

const STATUS_OPTIONS = [
  { value: STATUS.AKTIF, label: "Aktif" },
  { value: STATUS.NONAKTIF, label: "Nonaktif" },
  { value: STATUS.ARSIP, label: "Arsip" },
];

const emptyForm = {
  nama_unit: "",
  kode_unit: "",
  kode_kawasan: "",
  kode_legacy: "",
  cabang_id: "",
  status: STATUS.AKTIF,
};

const emptyDeleteState = {
  unit: null,
  checking: false,
  checked: false,
  error: "",
  counts: {},
  typingName: "",
  adminPassword: "",
  otp: "",
  step: 1,
};

const inputClass =
  "w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-base text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100 sm:text-sm";

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function statusLabel(status) {
  if (status === STATUS.NONAKTIF) return "Nonaktif";
  if (status === STATUS.ARSIP) return "Arsip";
  return "Aktif";
}

function statusClass(status) {
  if (status === STATUS.NONAKTIF) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === STATUS.ARSIP) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function MasterUnitPage() {
  const [units, setUnits] = useState([]);
  const [cabangs, setCabangs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("SEMUA");

  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [showMove, setShowMove] = useState(false);
  const [moveSource, setMoveSource] = useState(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [moveMode, setMoveMode] = useState("SELURUH");

  const [deleteState, setDeleteState] = useState(emptyDeleteState);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [unitResult, cabangResult] = await Promise.all([
        supabase
          .from("unit")
          .select(
            "id, nama_unit, kode_unit, kode_legacy, kode_kawasan, cabang_id, status, archived_at",
          )
          .order("nama_unit", { ascending: true }),

        supabase
          .from("cabang")
          .select("id, nama_cabang, kode_cabang")
          .order("nama_cabang", { ascending: true }),
      ]);

      if (unitResult.error) throw unitResult.error;
      if (cabangResult.error) throw cabangResult.error;

      setUnits(unitResult.data || []);
      setCabangs(cabangResult.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal memuat data unit.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const cabangMap = useMemo(() => {
    return Object.fromEntries(cabangs.map((cabang) => [cabang.id, cabang]));
  }, [cabangs]);

  const filteredUnits = useMemo(() => {
    const keyword = normalize(search);

    return units
      .filter((unit) => {
        const matchesSearch =
          !keyword ||
          [
            unit.nama_unit,
            unit.kode_unit,
            unit.kode_legacy,
            unit.kode_kawasan,
            cabangMap[unit.cabang_id]?.nama_cabang,
            cabangMap[unit.cabang_id]?.kode_cabang,
          ].some((value) => normalize(value).includes(keyword));

        const matchesStatus =
          statusFilter === "SEMUA" || unit.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) =>
        String(a.nama_unit || "").localeCompare(
          String(b.nama_unit || ""),
          "id",
          { sensitivity: "base" },
        ),
      );
  }, [units, search, statusFilter, cabangMap]);

  const summary = useMemo(
    () => ({
      total: units.length,
      aktif: units.filter((item) => item.status === STATUS.AKTIF).length,
      nonaktif: units.filter((item) => item.status === STATUS.NONAKTIF).length,
      arsip: units.filter((item) => item.status === STATUS.ARSIP).length,
    }),
    [units],
  );

  function resetForm() {
    setForm({
      ...emptyForm,
      cabang_id: cabangs.length === 1 ? cabangs[0].id : "",
    });
    setEditingUnit(null);
  }

  function openAdd() {
    setSuccess("");
    setError("");
    resetForm();
    setShowForm(true);
  }

  function openEdit(unit) {
    setSuccess("");
    setError("");
    setEditingUnit(unit);

    setForm({
      nama_unit: unit.nama_unit || "",
      kode_unit: unit.kode_unit || "",
      kode_kawasan: unit.kode_kawasan || "",
      kode_legacy: unit.kode_legacy || "",
      cabang_id: unit.cabang_id || "",
      status: unit.status || STATUS.AKTIF,
    });

    setSelectedUnit(null);
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingUnit(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const namaUnit = form.nama_unit.trim();
    const kodeUnit = form.kode_unit.trim();

    if (!namaUnit) {
      setError("Nama Unit wajib diisi.");
      return;
    }

    if (!kodeUnit) {
      setError("Kode Unit wajib diisi.");
      return;
    }

    if (!form.cabang_id) {
      setError("Cabang wajib dipilih.");
      return;
    }

    if (!form.status) {
      setError("Status unit wajib dipilih.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nama_unit: namaUnit,
        kode_unit: kodeUnit,
        kode_kawasan: form.kode_kawasan.trim() || null,
        kode_legacy: form.kode_legacy.trim() || null,
        cabang_id: form.cabang_id,
        status: form.status,
        archived_at:
          form.status === STATUS.ARSIP
            ? editingUnit?.archived_at || new Date().toISOString()
            : null,
      };

      if (editingUnit) {
        const { error: updateError } = await supabase
          .from("unit")
          .update(payload)
          .eq("id", editingUnit.id);

        if (updateError) throw updateError;
        setSuccess("Data unit berhasil diperbarui.");
      } else {
        const { error: insertError } = await supabase
          .from("unit")
          .insert(payload);

        if (insertError) throw insertError;
        setSuccess("Unit baru berhasil ditambahkan.");
      }

      setShowForm(false);
      setEditingUnit(null);
      setForm(emptyForm);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Terjadi kesalahan saat menyimpan unit.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(unit, nextStatus) {
    setError("");
    setSuccess("");

    const confirmation =
      nextStatus === STATUS.NONAKTIF
        ? `Nonaktifkan unit "${unit.nama_unit}"?`
        : nextStatus === STATUS.ARSIP
          ? `Arsipkan unit "${unit.nama_unit}"?`
          : `Aktifkan kembali unit "${unit.nama_unit}"?`;

    if (!window.confirm(confirmation)) return;

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from("unit")
        .update({
          status: nextStatus,
          archived_at:
            nextStatus === STATUS.ARSIP ? new Date().toISOString() : null,
        })
        .eq("id", unit.id);

      if (updateError) throw updateError;

      setSuccess(
        nextStatus === STATUS.NONAKTIF
          ? "Unit berhasil dinonaktifkan."
          : nextStatus === STATUS.ARSIP
            ? "Unit berhasil diarsipkan."
            : "Unit berhasil diaktifkan kembali.",
      );

      await loadAll();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal mengubah status unit.");
    } finally {
      setSaving(false);
    }
  }

  function openMove(unit) {
    setError("");
    setSuccess("");

    const availableTargets = units.filter(
      (item) =>
        item.id !== unit.id &&
        item.cabang_id === unit.cabang_id &&
        item.status !== STATUS.ARSIP,
    );

    setMoveSource(unit);
    setMoveTarget(availableTargets[0]?.id || "");
    setMoveMode("SELURUH");
    setSelectedUnit(null);
    setShowMove(true);
  }

  function closeMove() {
    setShowMove(false);
    setMoveSource(null);
    setMoveTarget("");
    setMoveMode("SELURUH");
  }

  function executeMovePreview(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!moveSource) {
      setError("Unit sumber tidak ditemukan.");
      return;
    }

    if (!moveTarget) {
      setError("Unit tujuan wajib dipilih.");
      return;
    }

    if (moveSource.id === moveTarget) {
      setError("Unit sumber dan tujuan tidak boleh sama.");
      return;
    }

    const target = units.find((item) => item.id === moveTarget);

    if (!target) {
      setError("Unit tujuan tidak ditemukan.");
      return;
    }

    setError(
      "Pemindahan data belum dieksekusi. Modul migrasi akan dijalankan setelah tabel PK, Agunan, Pegawai, Order, Migrasi, Notaris, BAST, dan histori unit sudah terhubung.",
    );
  }

  function openPermanentDelete(unit) {
    setError("");
    setSuccess("");
    setSelectedUnit(null);
    setDeleteState({ ...emptyDeleteState, unit });
  }

  function closePermanentDelete() {
    if (deleteState.checking) return;
    setDeleteState(emptyDeleteState);
  }

  async function checkUnitRelatedData() {
    const unit = deleteState.unit;
    if (!unit) return;

    setDeleteState((current) => ({
      ...current,
      checking: true,
      error: "",
      checked: false,
      counts: {},
    }));

    try {
      const { data: currentUnit, error: unitError } = await supabase
        .from("unit")
        .select("id, nama_unit")
        .eq("id", unit.id)
        .maybeSingle();

      if (unitError) throw unitError;
      if (!currentUnit) {
        throw new Error("Unit tidak ditemukan atau sudah dihapus.");
      }

      const counts = {
        pegawai: null,
        pk: null,
        agunan: null,
        orderAgunan: null,
        migrasi: null,
        notaris: null,
        bast: null,
      };

      setDeleteState((current) => ({
        ...current,
        checking: false,
        checked: true,
        counts,
        step: 2,
      }));
    } catch (err) {
      setDeleteState((current) => ({
        ...current,
        checking: false,
        checked: false,
        error: err?.message || "Gagal melakukan pemeriksaan data unit.",
      }));
    }
  }

  function canContinueDelete() {
    return (
      deleteState.checked &&
      normalize(deleteState.typingName) ===
        normalize(deleteState.unit?.nama_unit)
    );
  }

  function goDeleteStep3(event) {
    event.preventDefault();

    if (!canContinueDelete()) {
      setDeleteState((current) => ({
        ...current,
        error: "Ketik nama unit persis seperti nama unit yang akan dihapus.",
      }));
      return;
    }

    setDeleteState((current) => ({
      ...current,
      error: "",
      step: 4,
    }));
  }

  function goDeleteStep4(event) {
    event.preventDefault();

    if (!deleteState.adminPassword.trim()) {
      setDeleteState((current) => ({
        ...current,
        error: "Password Admin wajib diisi.",
      }));
      return;
    }

    setDeleteState((current) => ({
      ...current,
      error: "",
      step: 5,
    }));
  }

  function verifyOtp(event) {
    event.preventDefault();

    if (!deleteState.otp.trim()) {
      setDeleteState((current) => ({
        ...current,
        error: "OTP wajib diisi.",
      }));
      return;
    }

    setDeleteState((current) => ({
      ...current,
      error: "",
      step: 6,
    }));
  }

  function executePermanentDelete() {
    setDeleteState((current) => ({
      ...current,
      error:
        "Penghapusan permanen belum diaktifkan. Proses ini harus melalui backend aman yang memverifikasi Admin, password, OTP, relasi data, audit log, dan histori unit.",
    }));
  }

  const selectedCabang = selectedUnit
    ? cabangMap[selectedUnit.cabang_id]
    : null;

  return (
    <main className="mx-auto w-full max-w-[960px] min-w-0 space-y-5 px-3 pb-8 sm:space-y-6 sm:px-5 lg:px-6">
      <header>
        <div className="mb-2 flex items-center gap-2 text-zinc-400">
          <Landmark size={16} />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Data Master
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
              Master Unit
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              Kelola unit kerja, status, perpindahan data, dan histori.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAll}
            disabled={loading || saving}
            title="Refresh data"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 sm:w-auto sm:px-3"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="ml-2 hidden text-sm font-medium sm:inline">
              Refresh
            </span>
          </button>
        </div>
      </header>

      {error && (
        <Notice message={error} type="error" onClose={() => setError("")} />
      )}

      {success && (
        <Notice
          message={success}
          type="success"
          onClose={() => setSuccess("")}
        />
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total Unit" value={summary.total} icon={Landmark} />
        <SummaryCard
          label="Unit Aktif"
          value={summary.aktif}
          icon={CheckCircle2}
        />
        <SummaryCard label="Nonaktif" value={summary.nonaktif} icon={XCircle} />
        <SummaryCard label="Arsip" value={summary.arsip} icon={Archive} />
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="space-y-3 border-b border-zinc-100 p-3 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama unit, kode, cabang..."
                className={`${inputClass} h-11 pl-10`}
              />
            </div>

            <button
              type="button"
              onClick={openAdd}
              className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-700 sm:w-auto"
            >
              <Plus size={17} />
              Tambah Unit
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`${inputClass} h-10 sm:max-w-[220px]`}
          >
            <option value="SEMUA">Semua Status</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Building2 size={17} className="text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-900">Daftar Unit</h2>
          </div>

          {!loading && (
            <span className="text-xs text-zinc-400">
              {filteredUnits.length} dari {units.length} data
            </span>
          )}
        </div>

        {loading ? (
          <div className="px-4 py-16 text-center">
            <RefreshCw
              size={24}
              className="mx-auto animate-spin text-zinc-400"
            />
            <p className="mt-3 text-sm text-zinc-500">Memuat data unit...</p>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
              <Landmark size={22} className="text-zinc-400" />
            </div>
            <p className="mt-4 text-sm font-semibold text-zinc-800">
              {search || statusFilter !== "SEMUA"
                ? "Data tidak ditemukan"
                : "Belum ada data unit"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {search || statusFilter !== "SEMUA"
                ? "Coba ubah kata kunci atau filter."
                : "Tambahkan unit baru untuk memulai."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-5">
            {filteredUnits.map((unit) => {
              const cabang = cabangMap[unit.cabang_id];

              return (
                <article
                  key={unit.id}
                  className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm sm:p-5"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedUnit(unit)}
                    className="block w-full min-w-0 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
                    aria-label={`Lihat detail ${unit.nama_unit}`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                        <Landmark size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-semibold leading-5 text-zinc-900 sm:text-base">
                          {unit.nama_unit || "-"}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500">
                          {unit.kode_unit || "-"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${statusClass(
                              unit.status,
                            )}`}
                          >
                            {statusLabel(unit.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 p-3 sm:p-4">
                      <InfoItem
                        label="Cabang"
                        value={cabang?.nama_cabang || "-"}
                      />
                      <InfoItem
                        label="Kode Cabang"
                        value={cabang?.kode_cabang || "-"}
                      />
                      <InfoItem
                        label="Kode Kawasan"
                        value={unit.kode_kawasan || "-"}
                      />
                      <InfoItem
                        label="Kode Legacy"
                        value={unit.kode_legacy || "-"}
                      />
                    </div>

                    <p className="mt-3 text-center text-xs font-medium text-zinc-400">
                      Klik untuk melihat detail
                    </p>
                  </button>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-3">
                    <ActionButton
                      icon={Edit3}
                      label="Edit"
                      onClick={() => openEdit(unit)}
                    />
                    <ActionButton
                      icon={ArrowRightLeft}
                      label="Pindahkan Data"
                      onClick={() => openMove(unit)}
                    />
                    {unit.status === STATUS.AKTIF ? (
                      <ActionButton
                        icon={XCircle}
                        label="Nonaktifkan"
                        onClick={() => updateStatus(unit, STATUS.NONAKTIF)}
                      />
                    ) : unit.status === STATUS.NONAKTIF ? (
                      <ActionButton
                        icon={CheckCircle2}
                        label="Aktifkan"
                        onClick={() => updateStatus(unit, STATUS.AKTIF)}
                      />
                    ) : null}
                    {unit.status !== STATUS.ARSIP && (
                      <ActionButton
                        icon={Archive}
                        label="Arsipkan"
                        onClick={() => updateStatus(unit, STATUS.ARSIP)}
                      />
                    )}
                    <ActionButton
                      icon={Trash2}
                      label="Hapus Permanen"
                      danger
                      onClick={() => openPermanentDelete(unit)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="border-t border-zinc-100 px-4 py-3 sm:px-5">
            <p className="text-xs text-zinc-400">
              Menampilkan {filteredUnits.length} dari {units.length} unit.
            </p>
          </div>
        )}
      </section>

      {selectedUnit && (
        <Modal title="Detail Unit" onClose={() => setSelectedUnit(null)}>
          <div className="space-y-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
                <Landmark size={26} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-base font-semibold text-zinc-900">
                  {selectedUnit.nama_unit}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {selectedUnit.kode_unit || "-"}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusClass(
                    selectedUnit.status,
                  )}`}
                >
                  {statusLabel(selectedUnit.status)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 p-4">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Informasi Unit
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoItem label="Nama Unit" value={selectedUnit.nama_unit} />
                <InfoItem label="Kode Unit" value={selectedUnit.kode_unit} />
                <InfoItem
                  label="Cabang"
                  value={selectedCabang?.nama_cabang || "-"}
                />
                <InfoItem
                  label="Kode Cabang"
                  value={selectedCabang?.kode_cabang || "-"}
                />
                <InfoItem
                  label="Kode Kawasan"
                  value={selectedUnit.kode_kawasan}
                />
                <InfoItem
                  label="Kode Legacy"
                  value={selectedUnit.kode_legacy}
                />
                <InfoItem
                  label="Status"
                  value={statusLabel(selectedUnit.status)}
                />
                <InfoItem
                  label="Tanggal Arsip"
                  value={
                    selectedUnit.archived_at
                      ? new Date(selectedUnit.archived_at).toLocaleDateString(
                          "id-ID",
                        )
                      : "-"
                  }
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedUnit(null)}
                className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => openEdit(selectedUnit)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-700"
              >
                <Edit3 size={15} />
                Edit Unit
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal
          title={editingUnit ? "Edit Unit" : "Tambah Unit"}
          subtitle={
            editingUnit
              ? "Perbarui informasi unit kerja."
              : "Tambahkan unit kerja baru ke JOSJIS."
          }
          onClose={closeForm}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nama Unit" required>
                <input
                  value={form.nama_unit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      nama_unit: event.target.value,
                    }))
                  }
                  placeholder="Contoh: Jambi Kuamang Kuning 3"
                  className={inputClass}
                />
              </Field>

              <Field label="Kode Unit" required>
                <input
                  value={form.kode_unit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      kode_unit: event.target.value,
                    }))
                  }
                  placeholder="Contoh: JKK 3"
                  className={inputClass}
                />
              </Field>

              <Field label="Kode Legacy">
                <input
                  value={form.kode_legacy}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      kode_legacy: event.target.value,
                    }))
                  }
                  placeholder="Contoh: 11081A"
                  className={inputClass}
                />
              </Field>

              <Field label="Kode Kawasan">
                <input
                  value={form.kode_kawasan}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      kode_kawasan: event.target.value,
                    }))
                  }
                  placeholder="Contoh: K04110"
                  className={inputClass}
                />
              </Field>

              <Field label="Cabang" required>
                <select
                  value={form.cabang_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cabang_id: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Pilih Cabang</option>
                  {cabangs.map((cabang) => (
                    <option key={cabang.id} value={cabang.id}>
                      {cabang.nama_cabang}
                      {cabang.kode_cabang ? ` — ${cabang.kode_cabang}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status" required>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <div className="font-medium">Catatan</div>
              <p className="mt-1 text-blue-600">
                Nonaktif dan Arsip tidak menghapus data unit. Penghapusan
                permanen memiliki proses keamanan tersendiri.
              </p>
            </div>

            {error && <InlineError>{error}</InlineError>}

            <ModalActions
              onCancel={closeForm}
              saving={saving}
              submitLabel={editingUnit ? "Simpan Perubahan" : "Tambah Unit"}
            />
          </form>
        </Modal>
      )}

      {showMove && moveSource && (
        <Modal
          title="Pindahkan Data Unit"
          subtitle={moveSource.nama_unit}
          onClose={closeMove}
          maxWidth="max-w-xl"
        >
          <form onSubmit={executeMovePreview} className="space-y-5">
            <Field label="Unit Tujuan" required>
              <select
                value={moveTarget}
                onChange={(event) => setMoveTarget(event.target.value)}
                className={inputClass}
              >
                <option value="">Pilih Unit Tujuan</option>
                {units
                  .filter(
                    (item) =>
                      item.id !== moveSource.id &&
                      item.cabang_id === moveSource.cabang_id &&
                      item.status !== STATUS.ARSIP,
                  )
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.nama_unit} — {unit.kode_unit}
                    </option>
                  ))}
              </select>
            </Field>

            <div>
              <div className="mb-2 text-xs font-semibold text-zinc-600">
                Jenis Pemindahan
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  {
                    value: "SELURUH",
                    label: "Seluruh Data",
                    description: "Memindahkan seluruh data terkait unit.",
                  },
                  {
                    value: "SELEKTIF",
                    label: "Selektif",
                    description: "Memilih data tertentu untuk dipindahkan.",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      moveMode === option.value
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="moveMode"
                      value={option.value}
                      checked={moveMode === option.value}
                      onChange={(event) => setMoveMode(event.target.value)}
                      className="sr-only"
                    />
                    <div className="text-sm font-semibold text-zinc-900">
                      {option.label}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {option.description}
                    </p>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <div className="font-medium">Preview migrasi</div>
              <p className="mt-1">
                Eksekusi pemindahan belum diaktifkan sampai seluruh tabel
                operasional dan histori unit terhubung.
              </p>
            </div>

            {error && <InlineError>{error}</InlineError>}

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeMove}
                className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-700"
              >
                <ArrowRightLeft size={15} />
                Preview Pemindahan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteState.unit && (
        <Modal
          title="Hapus Permanen"
          subtitle={deleteState.unit.nama_unit}
          onClose={closePermanentDelete}
          maxWidth="max-w-xl"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full ${
                    deleteState.step >= step ? "bg-red-500" : "bg-zinc-200"
                  }`}
                />
              ))}
            </div>

            {deleteState.error && (
              <InlineError>{deleteState.error}</InlineError>
            )}

            {deleteState.step === 1 && (
              <div className="space-y-5">
                <DangerNotice
                  title="Penghapusan permanen"
                  text="Unit hanya boleh dihapus apabila seluruh data terkait sudah dipindahkan atau tidak memiliki relasi aktif."
                />
                <p className="text-sm text-zinc-600">
                  Sistem akan melakukan pemeriksaan awal sebelum proses
                  penghapusan dilanjutkan.
                </p>
                <button
                  type="button"
                  onClick={checkUnitRelatedData}
                  disabled={deleteState.checking}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {deleteState.checking ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  {deleteState.checking
                    ? "Memeriksa Data..."
                    : "Periksa Data Unit"}
                </button>
              </div>
            )}

            {deleteState.step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-zinc-900">
                    Hasil Pemeriksaan
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Pemeriksaan awal berhasil. Jumlah relasi operasional belum
                    diperiksa.
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  {[
                    ["Pegawai", deleteState.counts.pegawai],
                    ["PK", deleteState.counts.pk],
                    ["Agunan", deleteState.counts.agunan],
                    ["Order Agunan", deleteState.counts.orderAgunan],
                    ["Migrasi", deleteState.counts.migrasi],
                    ["Notaris", deleteState.counts.notaris],
                    ["BAST", deleteState.counts.bast],
                  ].map(([label, value], index, array) => (
                    <DeleteCheckRow
                      key={label}
                      label={label}
                      value={value}
                      last={index === array.length - 1}
                    />
                  ))}
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Pemeriksaan detail seluruh tabel operasional belum
                  diimplementasikan.
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteState((current) => ({
                      ...current,
                      step: 3,
                      error: "",
                    }))
                  }
                  className="h-11 w-full rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Lanjutkan
                </button>
              </div>
            )}

            {deleteState.step === 3 && (
              <form onSubmit={goDeleteStep3} className="space-y-5">
                <div>
                  <h3 className="font-semibold text-zinc-900">
                    Konfirmasi Nama Unit
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Ketik nama unit persis untuk memastikan unit yang benar.
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-50 p-4 text-sm">
                  <div className="text-zinc-500">Nama unit</div>
                  <div className="mt-1 font-semibold text-zinc-900">
                    {deleteState.unit.nama_unit}
                  </div>
                </div>
                <input
                  value={deleteState.typingName}
                  onChange={(event) =>
                    setDeleteState((current) => ({
                      ...current,
                      typingName: event.target.value,
                      error: "",
                    }))
                  }
                  placeholder="Ketik nama unit di sini"
                  className={inputClass}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!deleteState.typingName.trim()}
                  className="h-11 w-full rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  Lanjutkan
                </button>
              </form>
            )}

            {deleteState.step === 4 && (
              <form onSubmit={goDeleteStep4} className="space-y-5">
                <div>
                  <h3 className="font-semibold text-zinc-900">
                    Verifikasi Admin
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Masukkan password Admin untuk melanjutkan.
                  </p>
                </div>
                <input
                  type="password"
                  value={deleteState.adminPassword}
                  onChange={(event) =>
                    setDeleteState((current) => ({
                      ...current,
                      adminPassword: event.target.value,
                      error: "",
                    }))
                  }
                  placeholder="Masukkan password Admin"
                  className={inputClass}
                  autoFocus
                />
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Password tidak disimpan di database atau audit log. Tahap ini
                  belum melakukan verifikasi ke backend.
                </div>
                <button
                  type="submit"
                  disabled={!deleteState.adminPassword.trim()}
                  className="h-11 w-full rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  Lanjutkan
                </button>
              </form>
            )}

            {deleteState.step === 5 && (
              <form onSubmit={verifyOtp} className="space-y-5">
                <div>
                  <h3 className="font-semibold text-zinc-900">
                    Verifikasi OTP
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Masukkan OTP untuk melanjutkan.
                  </p>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={deleteState.otp}
                  onChange={(event) =>
                    setDeleteState((current) => ({
                      ...current,
                      otp: event.target.value.replace(/\D/g, ""),
                      error: "",
                    }))
                  }
                  placeholder="Masukkan OTP"
                  className={`${inputClass} text-center text-lg tracking-[0.3em]`}
                  autoFocus
                />
                <DangerNotice
                  title="Konfirmasi terakhir"
                  text="Penghapusan permanen tidak dapat dibatalkan melalui tombol Undo."
                />
                <button
                  type="submit"
                  disabled={!deleteState.otp.trim()}
                  className="h-11 w-full rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  Verifikasi OTP
                </button>
              </form>
            )}

            {deleteState.step === 6 && (
              <div className="space-y-5">
                <DangerNotice
                  title="Penghapusan belum diaktifkan"
                  text={`Unit ${deleteState.unit.nama_unit} belum dapat dihapus. Tahap verifikasi password dan OTP di atas hanya simulasi tampilan; backend aman belum terhubung.`}
                />
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteState((current) => ({
                        ...current,
                        error: "",
                        step: 5,
                      }))
                    }
                    className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={executePermanentDelete}
                    className="h-11 rounded-xl bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Hapus Permanen
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-zinc-500 sm:text-sm">{label}</div>
          <div className="mt-1 text-xl font-semibold text-zinc-900 sm:text-2xl">
            {value}
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 sm:h-10 sm:w-10">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div className="mt-1.5 break-words text-sm font-medium text-zinc-800">
        {value === null || value === undefined || value === "" ? "-" : value}
      </div>
    </div>
  );
}

function Field({ label, required = false, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Modal({ title, subtitle, onClose, children, maxWidth = "max-w-xl" }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`max-h-[92dvh] w-full ${maxWidth} overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-5`}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, saving, submitLabel }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={saving}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {saving && <RefreshCw size={15} className="animate-spin" />}
        {saving ? "Menyimpan..." : submitLabel}
      </button>
    </div>
  );
}

function Notice({ message, type, onClose }) {
  const isError = type === "error";

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <span className="break-words">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100"
        aria-label="Tutup pemberitahuan"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function InlineError({ children }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      {children}
    </div>
  );
}

function DangerNotice({ title, text }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex gap-3">
        <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div>
          <div className="font-semibold text-red-800">{title}</div>
          <p className="mt-1 text-sm leading-6 text-red-700">{text}</p>
        </div>
      </div>
    </div>
  );
}

function DeleteCheckRow({ label, value, last = false }) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${
        !last ? "border-b border-zinc-100" : ""
      }`}
    >
      <span className="text-sm text-zinc-600">{label}</span>
      {value === null ? (
        <span className="text-xs font-medium text-amber-600">
          Belum terhubung
        </span>
      ) : (
        <span
          className={`text-sm font-semibold ${
            value === 0 ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
