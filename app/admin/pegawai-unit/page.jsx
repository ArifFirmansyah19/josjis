"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Save,
  Building2,
  Users,
  Phone,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const EMPTY_FORM = {
  nama: "",
  nip: "",
  kode_agen: "",
  unit_id: "",
  jabatan: "",
  jenis_pegawai: "PENGAWAS",
  no_hp: "",
  email: "",
  aktif: true,
  pengawas_id: "",
  status: "Aktif",
};

const inputClass =
  "w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-base text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100 sm:text-sm";

const jenisLabel = {
  BRANCH_MANAGER: "Branch Manager",
  PENGAWAS: "Pengawas",
  MKA: "MKA",
  MKS: "MKS",
  MBCM: "MBCM",
};

const show = (value) =>
  value === null || value === undefined || value === "" ? "-" : value;

export default function MasterPegawaiPage() {
  const { activeUnit } = useUnit();

  const [unit, setUnit] = useState(null);
  const [units, setUnits] = useState([]);
  const [pegawai, setPegawai] = useState([]);
  const [mksRows, setMksRows] = useState([]);
  const [mbcm, setMbcm] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("SEMUA");
  const [filterStatus, setFilterStatus] = useState("SEMUA");

  const [modalOpen, setModalOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [unitForm, setUnitForm] = useState({
    nama_unit: "",
    kode_kawasan: "",
    kode_legacy: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [unitResult, unitsResult, bmResult, mksResult, mbcmResult] =
        await Promise.all([
          activeUnit?.value
            ? supabase
                .from("unit")
                .select("*")
                .eq("kode_unit", activeUnit.value)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

          supabase.from("unit").select("*").order("nama_unit"),

          supabase
            .from("pegawai")
            .select("*")
            .eq("jenis_pegawai", "BRANCH_MANAGER")
            .order("nama"),

          supabase.from("mks").select("*"),

          supabase.from("josjis_pegawai_pengawas").select("*").order("nama"),
        ]);

      if (unitResult.error) throw unitResult.error;
      if (unitsResult.error) throw unitsResult.error;
      if (bmResult.error) throw bmResult.error;
      if (mksResult.error) throw mksResult.error;

      let pegawaiResult = { data: [], error: null };

      if (unitResult.data?.id) {
        pegawaiResult = await supabase
          .from("pegawai")
          .select("*")
          .eq("unit_id", unitResult.data.id)
          .order("nama");

        if (pegawaiResult.error) throw pegawaiResult.error;
      }

      setUnit(unitResult.data || null);
      setUnits(unitsResult.data || []);
      setMksRows(mksResult.data || []);
      setMbcm(mbcmResult.error ? [] : mbcmResult.data || []);

      const combined = [
        ...(bmResult.data || []),
        ...(pegawaiResult.data || []).filter(
          (p) => p.jenis_pegawai !== "BRANCH_MANAGER",
        ),
      ];

      setPegawai([...new Map(combined.map((p) => [p.id, p])).values()]);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal memuat data pegawai.");
    } finally {
      setLoading(false);
    }
  }, [activeUnit?.value]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const mksByPegawai = useMemo(
    () => Object.fromEntries(mksRows.map((item) => [item.pegawai_id, item])),
    [mksRows],
  );

  const employees = useMemo(() => {
    const regular = pegawai.map((p) => {
      const mks = mksByPegawai[p.id];

      return {
        ...p,
        kode_agen: mks?.kode_agen || "",
        pengawas_id: mks?.pengawas_id || "",
        _mksId: mks?.id || null,
        _isMbcm: false,
      };
    });

    const globalMbcm = mbcm.map((p) => ({
      ...p,
      jenis_pegawai: "MBCM",
      aktif: p.status === "Aktif",
      unit_id: null,
      kode_agen: "",
      _isMbcm: true,
    }));

    return [...regular, ...globalMbcm];
  }, [pegawai, mbcm, mksByPegawai]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return employees
      .filter((p) => {
        const jenis = p.jenis_pegawai;
        const aktif = p._isMbcm ? p.status === "Aktif" : p.aktif !== false;

        const cocokJenis = filterJenis === "SEMUA" || jenis === filterJenis;

        const cocokStatus =
          filterStatus === "SEMUA" ||
          (filterStatus === "AKTIF" && aktif) ||
          (filterStatus === "NONAKTIF" && !aktif);

        const cocokCari =
          !keyword ||
          [
            p.nama,
            p.nip,
            p.kode_agen,
            p.jabatan,
            p.no_hp,
            p.nomor_hp,
            p.email,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(keyword),
          );

        return cocokJenis && cocokStatus && cocokCari;
      })
      .sort((a, b) =>
        String(a.nama || "").localeCompare(String(b.nama || ""), "id", {
          sensitivity: "base",
        }),
      );
  }, [employees, search, filterJenis, filterStatus]);

  const pengawasOptions = pegawai.filter(
    (p) => p.jenis_pegawai === "PENGAWAS" && p.aktif !== false,
  );

  const isActive = (item) =>
    item._isMbcm ? item.status === "Aktif" : item.aktif !== false;

  function openEmployeeDetail(item) {
    setSelectedEmployee(item);
  }

  function closeEmployeeDetail() {
    setSelectedEmployee(null);
  }

  function editSelectedEmployee() {
    if (!selectedEmployee) return;

    const item = selectedEmployee;
    setSelectedEmployee(null);
    openEdit(item);
  }

  function openAdd() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      unit_id: unit?.id || "",
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);

    setForm({
      ...EMPTY_FORM,
      nama: item.nama || "",
      nip: item.nip || "",
      kode_agen: item.kode_agen || "",
      unit_id: item.unit_id || "",
      jabatan: item.jabatan || "",
      jenis_pegawai: item.jenis_pegawai || "PENGAWAS",
      no_hp: item.no_hp || item.nomor_hp || "",
      email: item.email || "",
      aktif: item._isMbcm ? item.status === "Aktif" : item.aktif !== false,
      pengawas_id: item.pengawas_id || "",
      status: item.status || "Aktif",
    });

    setError("");
    setModalOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  }

  async function saveEmployee() {
    if (!form.nama.trim()) {
      setError("Nama pegawai wajib diisi.");
      return;
    }

    if (!form.jabatan.trim()) {
      setError("Jabatan wajib diisi.");
      return;
    }

    if (form.jenis_pegawai === "MKS" && !form.pengawas_id) {
      setError("Pilih pengawas untuk pegawai MKS.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (form.jenis_pegawai === "MBCM") {
        const payload = {
          nama: form.nama.trim(),
          nip: form.nip.trim(),
          jabatan: form.jabatan.trim(),
          no_hp: form.no_hp.trim() || null,
          status: form.aktif ? "Aktif" : "Tidak Aktif",
          updated_at: new Date().toISOString(),
        };

        if (!payload.nip) {
          throw new Error("NIP MBCM wajib diisi.");
        }

        const result = editing?.id
          ? await supabase
              .from("josjis_pegawai_pengawas")
              .update(payload)
              .eq("id", editing.id)
          : await supabase.from("josjis_pegawai_pengawas").insert(payload);

        if (result.error) throw result.error;
      } else {
        const selectedUnit = units.find((u) => u.id === form.unit_id);

        const payload = {
          nama: form.nama.trim(),
          nip: form.nip.trim() || null,
          jabatan: form.jabatan.trim(),
          jenis_pegawai: form.jenis_pegawai,
          unit_id: form.unit_id || null,
          cabang_id: selectedUnit?.cabang_id || unit?.cabang_id || null,
          no_hp: form.no_hp.trim() || null,
          email: form.email.trim() || null,
          aktif: form.aktif,
          updated_at: new Date().toISOString(),
        };

        let pegawaiId = editing?.id;

        if (pegawaiId) {
          const { error: updateError } = await supabase
            .from("pegawai")
            .update(payload)
            .eq("id", pegawaiId);

          if (updateError) throw updateError;
        } else {
          const { data, error: insertError } = await supabase
            .from("pegawai")
            .insert(payload)
            .select("id")
            .single();

          if (insertError) throw insertError;
          pegawaiId = data.id;
        }

        if (form.jenis_pegawai === "MKS") {
          const mksPayload = {
            pegawai_id: pegawaiId,
            pengawas_id: form.pengawas_id,
            kode_agen: form.kode_agen.trim() || null,
            updated_at: new Date().toISOString(),
          };

          const existingMks = mksByPegawai[pegawaiId];

          const result = existingMks
            ? await supabase
                .from("mks")
                .update(mksPayload)
                .eq("id", existingMks.id)
            : await supabase.from("mks").insert(mksPayload);

          if (result.error) throw result.error;
        } else if (editing?._mksId) {
          const { error: deleteMksError } = await supabase
            .from("mks")
            .delete()
            .eq("id", editing._mksId);

          if (deleteMksError) throw deleteMksError;
        }
      }

      setModalOpen(false);
      setEditing(null);
      setSuccess(
        editing
          ? "Data pegawai berhasil diperbarui."
          : "Data pegawai berhasil ditambahkan.",
      );

      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan data pegawai.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(item) {
    const confirmed = window.confirm(
      `Hapus data ${item.nama}? Tindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    setError("");
    setSuccess("");

    try {
      if (item._isMbcm) {
        const { error: deleteError } = await supabase
          .from("josjis_pegawai_pengawas")
          .delete()
          .eq("id", item.id);

        if (deleteError) throw deleteError;
      } else {
        if (item.jenis_pegawai === "MKS") {
          const { error: mksError } = await supabase
            .from("mks")
            .delete()
            .eq("pegawai_id", item.id);

          if (mksError) throw mksError;
        }

        const { error: deleteError } = await supabase
          .from("pegawai")
          .delete()
          .eq("id", item.id);

        if (deleteError) throw deleteError;
      }

      setSuccess(`${item.nama} berhasil dihapus.`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menghapus data pegawai.");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleStatus(item) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (item._isMbcm) {
        const { error: updateError } = await supabase
          .from("josjis_pegawai_pengawas")
          .update({
            status: item.status === "Aktif" ? "Tidak Aktif" : "Aktif",
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from("pegawai")
          .update({
            aktif: !item.aktif,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (updateError) throw updateError;
      }

      setSuccess("Status pegawai berhasil diperbarui.");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal mengubah status pegawai.");
    } finally {
      setSaving(false);
    }
  }

  function openUnitEdit() {
    if (!unit) return;

    setUnitForm({
      nama_unit: unit.nama_unit || "",
      kode_kawasan: unit.kode_kawasan || "",
      kode_legacy: unit.kode_legacy || "",
    });

    setError("");
    setUnitModalOpen(true);
  }

  async function saveUnit() {
    if (!unit?.id) return;

    if (!unitForm.nama_unit.trim()) {
      setError("Nama unit wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("unit")
        .update({
          nama_unit: unitForm.nama_unit.trim(),
          kode_kawasan: unitForm.kode_kawasan.trim() || null,
          kode_legacy: unitForm.kode_legacy.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", unit.id);

      if (updateError) throw updateError;

      setUnitModalOpen(false);
      setSuccess("Informasi unit berhasil diperbarui.");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal memperbarui informasi unit.");
    } finally {
      setSaving(false);
    }
  }

  const selectedSupervisor = selectedEmployee?.pengawas_id
    ? pegawai.find((p) => p.id === selectedEmployee.pengawas_id)
    : null;

  const selectedUnit = selectedEmployee?.unit_id
    ? units.find((u) => u.id === selectedEmployee.unit_id)
    : null;

  return (
    <main className="mx-auto w-full max-w-[960px] min-w-0 space-y-5 px-3 pb-8 sm:space-y-6 sm:px-5 lg:px-6">
      {/* HEADER */}
      <header>
        <div className="mb-2 flex items-center gap-2 text-zinc-400">
          <Users size={16} />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Data Master
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
              Master Pegawai
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              Kelola data pegawai, jabatan, unit kerja, dan informasi kontak.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
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

      {/* NOTIFICATION */}
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

      {/* INFORMASI UNIT */}
      {unit && (
        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Building2 size={18} className="shrink-0 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-900">
                Informasi Unit
              </h2>
            </div>

            <button
              type="button"
              onClick={openUnitEdit}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
            >
              <Pencil size={13} />
              Edit
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
            <Info label="Nama Unit" value={unit.nama_unit} />
            <Info label="Kode Kawasan" value={unit.kode_kawasan} />
            <Info label="Kode Unit" value={unit.kode_unit} />
          </div>
        </section>
      )}

      {!unit && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Unit aktif tidak ditemukan. Periksa pilihan unit di bagian atas.
        </div>
      )}

      {/* DAFTAR PEGAWAI */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {/* TOOLBAR */}
        <div className="space-y-3 border-b border-zinc-100 p-3 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, NIP, kode agen, jabatan..."
                className={`${inputClass} h-11 pl-10`}
              />
            </div>

            <button
              type="button"
              onClick={openAdd}
              disabled={!unit}
              className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
            >
              <Plus size={17} />
              Tambah Pegawai
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className={`${inputClass} h-10`}
            >
              <option value="SEMUA">Semua Jenis</option>
              {Object.entries(jenisLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`${inputClass} h-10`}
            >
              <option value="SEMUA">Semua Status</option>
              <option value="AKTIF">Aktif</option>
              <option value="NONAKTIF">Tidak Aktif</option>
            </select>
          </div>
        </div>

        {/* SECTION TITLE */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Users size={17} className="text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Daftar Pegawai
            </h2>
          </div>

          {!loading && (
            <span className="text-xs text-zinc-400">
              {filtered.length} dari {employees.length} data
            </span>
          )}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="px-4 py-16 text-center">
            <RefreshCw
              size={24}
              className="mx-auto animate-spin text-zinc-400"
            />
            <p className="mt-3 text-sm text-zinc-500">Memuat data pegawai...</p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
              <Users size={22} className="text-zinc-400" />
            </div>

            <p className="mt-4 text-sm font-semibold text-zinc-800">
              {search || filterJenis !== "SEMUA" || filterStatus !== "SEMUA"
                ? "Data tidak ditemukan"
                : "Belum ada data pegawai"}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              {search || filterJenis !== "SEMUA" || filterStatus !== "SEMUA"
                ? "Coba ubah kata kunci atau filter pencarian."
                : "Tambahkan data pegawai untuk memulai."}
            </p>
          </div>
        )}

        {/* EMPLOYEE CARDS */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-5">
            {filtered.map((p) => (
              <article
                key={`${p.jenis_pegawai}-${p.id}`}
                className="flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm sm:p-5"
              >
                {/* AREA KARTU YANG BISA DIKLIK */}
                <button
                  type="button"
                  onClick={() => openEmployeeDetail(p)}
                  aria-label={`Lihat detail ${p.nama}`}
                  className="block w-full min-w-0 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
                >
                  {/* CARD HEADER */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                      <UserRound size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-semibold leading-5 text-zinc-900 sm:text-base">
                        {show(p.nama)}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-600">
                          <ShieldCheck size={14} />
                          {jenisLabel[p.jenis_pegawai] || p.jenis_pegawai}
                        </span>

                        <span
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                            isActive(p)
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {isActive(p) ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EMPLOYEE INFORMATION */}
                  <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-zinc-50 p-3 sm:grid-cols-2 sm:p-4">
                    <Info label="NIP" value={p.nip} mono />
                    <Info label="Kode Agen" value={p.kode_agen} mono />
                    <Info label="Jabatan" value={p.jabatan} />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Phone size={13} />
                        <span className="text-[11px] font-medium uppercase tracking-wide">
                          Nomor HP / WA
                        </span>
                      </div>
                      <p className="mt-1.5 break-all text-sm font-medium text-zinc-800">
                        {show(p.no_hp || p.nomor_hp)}
                      </p>
                    </div>

                    {!p._isMbcm && (
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Mail size={13} />
                          <span className="text-[11px] font-medium uppercase tracking-wide">
                            Email
                          </span>
                        </div>
                        <p className="mt-1.5 break-all text-sm font-medium text-zinc-800">
                          {show(p.email)}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-center text-xs font-medium text-zinc-400">
                    Klik untuk melihat detail
                  </p>
                </button>

                {/* ACTIONS */}
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={() => toggleStatus(p)}
                    disabled={saving || deletingId === p.id}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50"
                  >
                    Ubah Status
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    disabled={saving || deletingId === p.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteEmployee(p)}
                    disabled={saving || deletingId === p.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === p.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Hapus
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* FOOTER */}
        {!loading && (
          <div className="border-t border-zinc-100 px-4 py-3 sm:px-5">
            <p className="text-xs text-zinc-400">
              Menampilkan {filtered.length} dari {employees.length} data
              pegawai.
            </p>
          </div>
        )}
      </section>

      {/* MODAL DETAIL PEGAWAI */}
      {selectedEmployee && (
        <Modal title="Detail Pegawai" onClose={closeEmployeeDetail}>
          <div className="space-y-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
                <UserRound size={26} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="break-words text-base font-semibold text-zinc-900">
                  {show(selectedEmployee.nama)}
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  {jenisLabel[selectedEmployee.jenis_pegawai] ||
                    selectedEmployee.jenis_pegawai}
                </p>

                <span
                  className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    isActive(selectedEmployee)
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {isActive(selectedEmployee) ? "Aktif" : "Tidak Aktif"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 p-4">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Informasi Pegawai
              </h4>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Info label="Nama Lengkap" value={selectedEmployee.nama} />

                <Info label="NIP" value={selectedEmployee.nip} mono />

                <Info
                  label="Jenis Pegawai"
                  value={jenisLabel[selectedEmployee.jenis_pegawai]}
                />

                <Info label="Jabatan" value={selectedEmployee.jabatan} />

                <Info
                  label="Nomor HP / WhatsApp"
                  value={selectedEmployee.no_hp || selectedEmployee.nomor_hp}
                />

                {!selectedEmployee._isMbcm && (
                  <Info label="Email" value={selectedEmployee.email} />
                )}

                {!selectedEmployee._isMbcm && (
                  <Info label="Unit Kerja" value={selectedUnit?.nama_unit} />
                )}

                {selectedEmployee.jenis_pegawai === "MKS" && (
                  <>
                    <Info
                      label="Kode Agen"
                      value={selectedEmployee.kode_agen}
                      mono
                    />

                    <Info label="Pengawas" value={selectedSupervisor?.nama} />
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEmployeeDetail}
                className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={editSelectedEmployee}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                <Pencil size={15} />
                Edit Pegawai
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL PEGAWAI */}
      {modalOpen && (
        <Modal
          title={editing ? "Edit Pegawai" : "Tambah Pegawai"}
          onClose={closeForm}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Nama"
                value={form.nama}
                onChange={(v) => setForm({ ...form, nama: v })}
                required
              />

              <Field
                label="NIP"
                value={form.nip}
                onChange={(v) => setForm({ ...form, nip: v })}
              />

              <Field
                label="Jabatan"
                value={form.jabatan}
                onChange={(v) => setForm({ ...form, jabatan: v })}
                required
              />

              <Field
                label="Nomor HP / WhatsApp"
                value={form.no_hp}
                onChange={(v) => setForm({ ...form, no_hp: v })}
                type="tel"
              />

              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                type="email"
              />

              <Select
                label="Jenis Pegawai"
                value={form.jenis_pegawai}
                onChange={(v) => setForm({ ...form, jenis_pegawai: v })}
                options={Object.entries(jenisLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />

              {form.jenis_pegawai !== "MBCM" && (
                <Select
                  label="Unit"
                  value={form.unit_id}
                  onChange={(v) => setForm({ ...form, unit_id: v })}
                  options={[
                    { value: "", label: "Tanpa Unit" },
                    ...units.map((u) => ({
                      value: u.id,
                      label: u.nama_unit,
                    })),
                  ]}
                />
              )}

              {form.jenis_pegawai === "MKS" && (
                <>
                  <Field
                    label="Kode Agen"
                    value={form.kode_agen}
                    onChange={(v) => setForm({ ...form, kode_agen: v })}
                  />

                  <Select
                    label="Pengawas"
                    value={form.pengawas_id}
                    onChange={(v) => setForm({ ...form, pengawas_id: v })}
                    options={[
                      { value: "", label: "Pilih Pengawas" },
                      ...pengawasOptions.map((p) => ({
                        value: p.id,
                        label: p.nama,
                      })),
                    ]}
                  />
                </>
              )}
            </div>

            <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-3">
              <span className="text-sm font-medium text-zinc-700">
                Pegawai aktif
              </span>
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                className="h-4 w-4 accent-zinc-900"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="h-11 rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={saveEmployee}
              disabled={saving}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL UNIT */}
      {unitModalOpen && (
        <Modal
          title="Edit Informasi Unit"
          onClose={() => {
            if (!saving) setUnitModalOpen(false);
          }}
        >
          <div className="space-y-3">
            <Field
              label="Nama Unit"
              value={unitForm.nama_unit}
              onChange={(v) => setUnitForm({ ...unitForm, nama_unit: v })}
              required
            />

            <Field
              label="Kode Kawasan"
              value={unitForm.kode_kawasan}
              onChange={(v) => setUnitForm({ ...unitForm, kode_kawasan: v })}
            />

            <Field
              label="Kode Legacy"
              value={unitForm.kode_legacy}
              onChange={(v) => setUnitForm({ ...unitForm, kode_legacy: v })}
            />

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Kode Unit
              </label>
              <input
                value={unit?.kode_unit || ""}
                disabled
                className={`${inputClass} bg-zinc-100 text-zinc-400`}
              />
              <p className="mt-1.5 text-xs text-zinc-400">
                Kode Unit tidak diubah karena digunakan sebagai identitas unit
                aktif.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setUnitModalOpen(false)}
              disabled={saving}
              className="h-11 rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={saveUnit}
              disabled={saving}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function Info({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div
        className={`mt-1.5 break-words text-sm font-medium text-zinc-800 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {show(value)}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      <input
        type={type}
        value={value ?? ""}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
        {label}
      </span>

      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-xl sm:rounded-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
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
      >
        <X size={16} />
      </button>
    </div>
  );
}
