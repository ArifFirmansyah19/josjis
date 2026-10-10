"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import {
  Archive,
  ArrowRightLeft,
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
  {
    value: STATUS.AKTIF,
    label: "Aktif",
  },
  {
    value: STATUS.NONAKTIF,
    label: "Nonaktif",
  },
  {
    value: STATUS.ARSIP,
    label: "Arsip",
  },
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
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === STATUS.ARSIP) {
    return "bg-slate-100 text-slate-600 border-slate-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
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
  const [form, setForm] = useState(emptyForm);

  const [showMove, setShowMove] = useState(false);
  const [moveSource, setMoveSource] = useState(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [moveMode, setMoveMode] = useState("SELURUH");

  const [deleteState, setDeleteState] = useState(emptyDeleteState);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

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

    if (unitResult.error) {
      setError(unitResult.error.message);
    } else {
      setUnits(unitResult.data || []);
    }

    if (cabangResult.error) {
      setError((current) => {
        if (current) return current;
        return cabangResult.error.message;
      });
    } else {
      setCabangs(cabangResult.data || []);
    }

    setLoading(false);
  }

  const cabangMap = useMemo(() => {
    const map = {};

    for (const cabang of cabangs) {
      map[cabang.id] = cabang;
    }

    return map;
  }, [cabangs]);

  const filteredUnits = useMemo(() => {
    const keyword = normalize(search);

    return units.filter((unit) => {
      const matchesSearch =
        !keyword ||
        normalize(unit.nama_unit).includes(keyword) ||
        normalize(unit.kode_unit).includes(keyword) ||
        normalize(unit.kode_legacy).includes(keyword) ||
        normalize(unit.kode_kawasan).includes(keyword) ||
        normalize(cabangMap[unit.cabang_id]?.nama_cabang).includes(keyword);

      const matchesStatus =
        statusFilter === "SEMUA" || unit.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [units, search, statusFilter, cabangMap]);

  const summary = useMemo(() => {
    return {
      total: units.length,
      aktif: units.filter((item) => item.status === STATUS.AKTIF).length,
      nonaktif: units.filter((item) => item.status === STATUS.NONAKTIF).length,
      arsip: units.filter((item) => item.status === STATUS.ARSIP).length,
    };
  }, [units]);

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
    const kodeKawasan = form.kode_kawasan.trim();
    const kodeLegacy = form.kode_legacy.trim();

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
        kode_kawasan: kodeKawasan || null,
        kode_legacy: kodeLegacy || null,
        cabang_id: form.cabang_id,
        status: form.status,
      };

      if (form.status === STATUS.ARSIP) {
        payload.archived_at =
          editingUnit?.archived_at || new Date().toISOString();
      } else {
        payload.archived_at = null;
      }

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

    const payload = {
      status: nextStatus,
      archived_at:
        nextStatus === STATUS.ARSIP ? new Date().toISOString() : null,
    };

    const { error: updateError } = await supabase
      .from("unit")
      .update(payload)
      .eq("id", unit.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(
      nextStatus === STATUS.NONAKTIF
        ? "Unit berhasil dinonaktifkan."
        : nextStatus === STATUS.ARSIP
          ? "Unit berhasil diarsipkan."
          : "Unit berhasil diaktifkan kembali.",
    );

    await loadAll();
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
    setShowMove(true);
  }

  function closeMove() {
    setShowMove(false);
    setMoveSource(null);
    setMoveTarget("");
    setMoveMode("SELURUH");
  }

  async function executeMovePreview(event) {
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

    setDeleteState({
      ...emptyDeleteState,
      unit,
    });
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
      /*
       * Pemeriksaan awal.
       *
       * Saat tabel operasional sudah tersedia, tambahkan pengecekan
       * masing-masing tabel di sini.
       *
       * Untuk sekarang kita hanya memastikan unit masih ada.
       * Sistem TIDAK melakukan DELETE otomatis.
       */

      const { data: currentUnit, error: unitError } = await supabase
        .from("unit")
        .select("id, nama_unit")
        .eq("id", unit.id)
        .maybeSingle();

      if (unitError) {
        throw unitError;
      }

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
    const unit = deleteState.unit;

    if (!unit) return false;

    return (
      deleteState.checked &&
      normalize(deleteState.typingName) === normalize(unit.nama_unit)
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
      step: 3,
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
      step: 4,
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
      step: 5,
    }));
  }

  async function executePermanentDelete() {
    const unit = deleteState.unit;

    if (!unit) return;

    /*
     * PENTING:
     * Jangan melakukan DELETE permanen dari browser dengan anon key.
     *
     * Eksekusi final nantinya harus dipindahkan ke backend / Edge Function
     * yang memverifikasi:
     * - Admin
     * - password
     * - OTP
     * - unit benar-benar kosong
     * - audit log
     * - histori unit
     *
     * Untuk saat ini tombol final sengaja belum menjalankan DELETE.
     */

    setDeleteState((current) => ({
      ...current,
      error:
        "Penghapusan permanen belum diaktifkan. Tahap ini harus diproses melalui backend aman agar password, OTP, audit log, histori unit, dan DELETE tidak dieksekusi menggunakan anon key.",
    }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Master Data</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
              Master Unit
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Kelola unit kerja, status unit, perpindahan data, dan histori.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadAll}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              Tambah Unit
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{success}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Total Unit"
            value={summary.total}
            icon={Landmark}
          />

          <SummaryCard
            label="Unit Aktif"
            value={summary.aktif}
            icon={CheckCircle2}
          />

          <SummaryCard
            label="Nonaktif"
            value={summary.nonaktif}
            icon={XCircle}
          />

          <SummaryCard label="Arsip" value={summary.arsip} icon={Archive} />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1 lg:max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama unit, kode, legacy, kawasan..."
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
                />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-10 min-w-[150px] appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-9 text-sm text-zinc-700 outline-none focus:border-zinc-400"
                >
                  <option value="SEMUA">Semua Status</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center px-6 py-16 text-sm text-zinc-500">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Memuat data unit...
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Landmark className="h-10 w-10 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-700">
                Tidak ada unit ditemukan
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Coba ubah kata pencarian atau filter status.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3">Unit</th>
                      <th className="px-5 py-3">Kode Unit</th>
                      <th className="px-5 py-3">Cabang</th>
                      <th className="px-5 py-3">Kawasan</th>
                      <th className="px-5 py-3">Legacy</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-100">
                    {filteredUnits.map((unit) => {
                      const cabang = cabangMap[unit.cabang_id];

                      return (
                        <tr
                          key={unit.id}
                          className="transition hover:bg-zinc-50/60"
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium text-zinc-900">
                              {unit.nama_unit}
                            </div>
                            <div className="mt-0.5 text-xs text-zinc-400">
                              ID: {unit.id}
                            </div>
                          </td>

                          <td className="px-5 py-4 font-medium text-zinc-700">
                            {unit.kode_unit || "-"}
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-zinc-700">
                              {cabang?.nama_cabang || "-"}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {cabang?.kode_cabang || ""}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-zinc-600">
                            {unit.kode_kawasan || "-"}
                          </td>

                          <td className="px-5 py-4 text-zinc-600">
                            {unit.kode_legacy || "-"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                                unit.status,
                              )}`}
                            >
                              {statusLabel(unit.status)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
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
                                  onClick={() =>
                                    updateStatus(unit, STATUS.NONAKTIF)
                                  }
                                />
                              ) : unit.status === STATUS.NONAKTIF ? (
                                <ActionButton
                                  icon={CheckCircle2}
                                  label="Aktifkan"
                                  onClick={() =>
                                    updateStatus(unit, STATUS.AKTIF)
                                  }
                                />
                              ) : null}

                              {unit.status !== STATUS.ARSIP && (
                                <ActionButton
                                  icon={Archive}
                                  label="Arsipkan"
                                  onClick={() =>
                                    updateStatus(unit, STATUS.ARSIP)
                                  }
                                />
                              )}

                              <ActionButton
                                icon={Trash2}
                                label="Hapus Permanen"
                                danger
                                onClick={() => openPermanentDelete(unit)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-zinc-100 lg:hidden">
                {filteredUnits.map((unit) => {
                  const cabang = cabangMap[unit.cabang_id];

                  return (
                    <div key={unit.id} className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900">
                            {unit.nama_unit}
                          </div>

                          <div className="mt-1 text-sm text-zinc-500">
                            {unit.kode_unit || "-"}
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                            unit.status,
                          )}`}
                        >
                          {statusLabel(unit.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 p-3 text-sm">
                        <InfoItem
                          label="Cabang"
                          value={cabang?.nama_cabang || "-"}
                        />
                        <InfoItem
                          label="Legacy"
                          value={unit.kode_legacy || "-"}
                        />
                        <InfoItem
                          label="Kawasan"
                          value={unit.kode_kawasan || "-"}
                        />
                        <InfoItem label="Kode" value={unit.kode_unit || "-"} />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <MobileAction
                          icon={Edit3}
                          label="Edit"
                          onClick={() => openEdit(unit)}
                        />

                        <MobileAction
                          icon={ArrowRightLeft}
                          label="Pindahkan"
                          onClick={() => openMove(unit)}
                        />

                        {unit.status === STATUS.AKTIF ? (
                          <MobileAction
                            icon={XCircle}
                            label="Nonaktifkan"
                            onClick={() => updateStatus(unit, STATUS.NONAKTIF)}
                          />
                        ) : unit.status === STATUS.NONAKTIF ? (
                          <MobileAction
                            icon={CheckCircle2}
                            label="Aktifkan"
                            onClick={() => updateStatus(unit, STATUS.AKTIF)}
                          />
                        ) : null}

                        {unit.status !== STATUS.ARSIP && (
                          <MobileAction
                            icon={Archive}
                            label="Arsipkan"
                            onClick={() => updateStatus(unit, STATUS.ARSIP)}
                          />
                        )}

                        <MobileAction
                          icon={Trash2}
                          label="Hapus Permanen"
                          danger
                          onClick={() => openPermanentDelete(unit)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="border-t border-zinc-200 px-5 py-3 text-xs text-zinc-400">
            Menampilkan {filteredUnits.length} dari {units.length} unit.
          </div>
        </div>
      </div>

      {showForm && (
        <ModalOverlay>
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {editingUnit ? "Edit Unit" : "Tambah Unit"}
                </h2>

                <p className="mt-0.5 text-sm text-zinc-500">
                  {editingUnit
                    ? "Perbarui informasi unit kerja."
                    : "Tambahkan unit kerja baru ke JOSJIS."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5 p-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="Nama Unit" required>
                    <input
                      type="text"
                      value={form.nama_unit}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          nama_unit: event.target.value,
                        }))
                      }
                      placeholder="Contoh: Jambi Kuamang Kuning 3"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Kode Unit" required>
                    <input
                      type="text"
                      value={form.kode_unit}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          kode_unit: event.target.value,
                        }))
                      }
                      placeholder="Contoh: JKK 3"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Kode Legacy">
                    <input
                      type="text"
                      value={form.kode_legacy}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          kode_legacy: event.target.value,
                        }))
                      }
                      placeholder="Contoh: 11081A"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Kode Kawasan">
                    <input
                      type="text"
                      value={form.kode_kawasan}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          kode_kawasan: event.target.value,
                        }))
                      }
                      placeholder="Contoh: K04110"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Cabang" required>
                    <div className="relative">
                      <select
                        value={form.cabang_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            cabang_id: event.target.value,
                          }))
                        }
                        className="form-input appearance-none pr-9"
                      >
                        <option value="">Pilih Cabang</option>

                        {cabangs.map((cabang) => (
                          <option key={cabang.id} value={cabang.id}>
                            {cabang.nama_cabang}
                            {cabang.kode_cabang
                              ? ` — ${cabang.kode_cabang}`
                              : ""}
                          </option>
                        ))}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    </div>
                  </FormField>

                  <FormField label="Status" required>
                    <div className="relative">
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
                        className="form-input appearance-none pr-9"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    </div>
                  </FormField>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <div className="font-medium">Catatan</div>
                  <div className="mt-1 text-blue-600">
                    Nonaktif dan Arsip tidak menghapus data unit. Penghapusan
                    permanen memiliki proses keamanan tersendiri.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {editingUnit ? "Simpan Perubahan" : "Tambah Unit"}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {showMove && moveSource && (
        <ModalOverlay>
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Pindahkan Data Unit
                </h2>

                <p className="mt-0.5 text-sm text-zinc-500">
                  {moveSource.nama_unit}
                </p>
              </div>

              <button
                type="button"
                onClick={closeMove}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={executeMovePreview}>
              <div className="space-y-5 p-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Unit Tujuan
                  </label>

                  <div className="relative">
                    <select
                      value={moveTarget}
                      onChange={(event) => setMoveTarget(event.target.value)}
                      className="form-input appearance-none pr-9"
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

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Jenis Pemindahan
                  </label>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        moveMode === "SELURUH"
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="moveMode"
                        value="SELURUH"
                        checked={moveMode === "SELURUH"}
                        onChange={(event) => setMoveMode(event.target.value)}
                        className="sr-only"
                      />

                      <div className="font-medium text-zinc-900">
                        Seluruh Data
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Memindahkan seluruh data yang terkait unit.
                      </div>
                    </label>

                    <label
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        moveMode === "SELEKTIF"
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="moveMode"
                        value="SELEKTIF"
                        checked={moveMode === "SELEKTIF"}
                        onChange={(event) => setMoveMode(event.target.value)}
                        className="sr-only"
                      />

                      <div className="font-medium text-zinc-900">Selektif</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Memilih data tertentu untuk dipindahkan.
                      </div>
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <div className="font-medium">Preview migrasi</div>
                  <div className="mt-1">
                    Eksekusi pemindahan akan diaktifkan setelah seluruh tabel
                    operasional dan histori unit terhubung.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
                <button
                  type="button"
                  onClick={closeMove}
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Tutup
                </button>

                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Preview Pemindahan
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {deleteState.unit && (
        <ModalOverlay>
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      Hapus Permanen
                    </h2>

                    <p className="text-sm text-zinc-500">
                      {deleteState.unit.nama_unit}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closePermanentDelete}
                disabled={deleteState.checking}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-5 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full ${
                      deleteState.step >= step ? "bg-red-500" : "bg-zinc-200"
                    }`}
                  />
                ))}
              </div>

              {deleteState.error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {deleteState.error}
                </div>
              )}

              {deleteState.step === 1 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex gap-3">
                      <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                      <div>
                        <div className="font-semibold text-red-800">
                          Penghapusan permanen
                        </div>

                        <div className="mt-1 text-sm leading-6 text-red-700">
                          Unit hanya boleh dihapus apabila seluruh data terkait
                          sudah dipindahkan atau sudah tidak memiliki relasi
                          aktif.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-zinc-600">
                    Sistem akan melakukan pemeriksaan data sebelum proses
                    penghapusan dilanjutkan.
                  </div>

                  <button
                    type="button"
                    onClick={checkUnitRelatedData}
                    disabled={deleteState.checking}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleteState.checking ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Memeriksa Data...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Periksa Data Unit
                      </>
                    )}
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
                      Pemeriksaan awal berhasil dilakukan.
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200">
                    <DeleteCheckRow
                      label="Pegawai"
                      value={deleteState.counts.pegawai}
                    />
                    <DeleteCheckRow label="PK" value={deleteState.counts.pk} />
                    <DeleteCheckRow
                      label="Agunan"
                      value={deleteState.counts.agunan}
                    />
                    <DeleteCheckRow
                      label="Order Agunan"
                      value={deleteState.counts.orderAgunan}
                    />
                    <DeleteCheckRow
                      label="Migrasi"
                      value={deleteState.counts.migrasi}
                    />
                    <DeleteCheckRow
                      label="Notaris"
                      value={deleteState.counts.notaris}
                    />
                    <DeleteCheckRow
                      label="BAST"
                      value={deleteState.counts.bast}
                      last
                    />
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Pemeriksaan detail seluruh tabel operasional akan diaktifkan
                    bersamaan dengan modul migrasi dan histori.
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
                    className="h-10 w-full rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
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

                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Ketik nama unit persis untuk memastikan Anda menghapus
                      unit yang benar.
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-50 p-4 text-sm">
                    <div className="text-zinc-500">Nama unit</div>
                    <div className="mt-1 font-semibold text-zinc-900">
                      {deleteState.unit.nama_unit}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={deleteState.typingName}
                    onChange={(event) =>
                      setDeleteState((current) => ({
                        ...current,
                        typingName: event.target.value,
                        error: "",
                      }))
                    }
                    placeholder="Ketik nama unit di sini"
                    className="form-input"
                    autoFocus
                  />

                  <button
                    type="submit"
                    disabled={!deleteState.typingName.trim()}
                    className="h-10 w-full rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
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

                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Masukkan password Admin untuk melanjutkan.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700">
                      Password Admin
                    </label>

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
                      className="form-input"
                      autoFocus
                    />
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Password tidak akan disimpan di database atau audit log.
                  </div>

                  <button
                    type="submit"
                    disabled={!deleteState.adminPassword.trim()}
                    className="h-10 w-full rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Verifikasi Password
                  </button>
                </form>
              )}

              {deleteState.step === 5 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-semibold text-zinc-900">
                      Verifikasi OTP
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      OTP akan dikirim melalui mekanisme keamanan Admin.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700">
                      OTP
                    </label>

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
                      className="form-input text-center text-lg tracking-[0.3em]"
                      autoFocus
                    />
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="font-semibold text-red-800">
                      Konfirmasi terakhir
                    </div>

                    <div className="mt-1 text-sm leading-6 text-red-700">
                      Setelah penghapusan permanen dijalankan, unit tidak dapat
                      dikembalikan melalui tombol Undo.
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteState((current) => ({
                          ...current,
                          error: "",
                          step: 4,
                        }))
                      }
                      className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Kembali
                    </button>

                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={!deleteState.otp.trim()}
                      className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Verifikasi OTP
                    </button>
                  </div>
                </div>
              )}

              {deleteState.step === 6 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                    <Trash2 className="mx-auto h-10 w-10 text-red-600" />

                    <h3 className="mt-3 font-semibold text-red-900">
                      Hapus Unit Secara Permanen?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-red-700">
                      Unit <strong>{deleteState.unit.nama_unit}</strong> akan
                      dihapus permanen setelah seluruh pemeriksaan keamanan
                      berhasil.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteState((current) => ({
                          ...current,
                          error: "",
                          step: 5,
                        }))
                      }
                      className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      onClick={executePermanentDelete}
                      className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Hapus Permanen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </DashboardLayout>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-zinc-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-900">
            {value}
          </div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
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
      className={`rounded-lg p-2 transition ${
        danger
          ? "text-red-500 hover:bg-red-50 hover:text-red-700"
          : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function MobileAction({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium transition ${
        danger
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-0.5 truncate text-sm font-medium text-zinc-700">
        {value}
      </div>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
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

function ModalOverlay({ children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px]">
      {children}
    </div>
  );
}
