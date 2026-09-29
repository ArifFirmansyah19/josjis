"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";

import {
  UserRound,
  Users,
  BriefcaseBusiness,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function PegawaiUnitPage() {
  const { activeUnit } = useUnit();

  const [unitData, setUnitData] = useState(null);
  const [pegawai, setPegawai] = useState([]);
  const [mks, setMks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showMkaModal, setShowMkaModal] = useState(false);
  const [editingMka, setEditingMka] = useState(null);

  const [mkaForm, setMkaForm] = useState({
    nama: "",
    nip: "",
    jabatan: "MKA",
  });

  /*
   * =========================================================
   * LOAD DATA
   * =========================================================
   */

  async function loadData() {
    if (!activeUnit?.value) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      /*
       * Cari UUID unit berdasarkan kode JKK1 / JKK2
       */

      const unitResult = await supabase
        .from("unit")
        .select("id, nama_unit, kode_unit, kode_legacy, cabang_id")
        .eq("kode_unit", activeUnit.value)
        .single();

      if (unitResult.error) {
        throw new Error(
          `Gagal mencari unit ${activeUnit.value}: ${unitResult.error.message}`,
        );
      }

      const currentUnit = unitResult.data;

      setUnitData(currentUnit);

      const unitId = currentUnit.id;

      /*
       * =====================================================
       * PEGAWAI UNIT AKTIF
       * =====================================================
       */

      const pegawaiResult = await supabase
        .from("pegawai")
        .select("*")
        .eq("unit_id", unitId)
        .order("nama", { ascending: true });

      if (pegawaiResult.error) {
        throw new Error(
          `Gagal membaca data pegawai: ${pegawaiResult.error.message}`,
        );
      }

      /*
       * =====================================================
       * BRANCH MANAGER
       *
       * Branch Manager tidak mempunyai unit_id karena
       * digunakan bersama JKK1 dan JKK2.
       * =====================================================
       */

      const branchManagerResult = await supabase
        .from("pegawai")
        .select("*")
        .eq("jenis_pegawai", "BRANCH_MANAGER")
        .order("nama", { ascending: true });

      if (branchManagerResult.error) {
        throw new Error(
          `Gagal membaca data Branch Manager: ${branchManagerResult.error.message}`,
        );
      }

      /*
       * Gabungkan Branch Manager + pegawai unit aktif
       */

      const semuaPegawai = [
        ...(branchManagerResult.data || []),
        ...(pegawaiResult.data || []),
      ];

      setPegawai(semuaPegawai);

      /*
       * =====================================================
       * MKS
       * =====================================================
       */

      const mksResult = await supabase.from("mks").select("*");

      if (mksResult.error) {
        throw new Error(`Gagal membaca data MKS: ${mksResult.error.message}`);
      }

      setMks(mksResult.data || []);
    } catch (err) {
      console.error(err);

      setError(err?.message || "Terjadi kesalahan saat membaca data.");
    } finally {
      setLoading(false);
    }
  }

  /*
   * Jalankan ulang ketika unit aktif dari Topbar berubah.
   *
   * loadData sengaja tidak dimasukkan ke dependency karena
   * fungsi dibuat ulang setiap render.
   */

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUnit?.value]);

  /*
   * =========================================================
   * DATA TURUNAN
   * =========================================================
   */

  const branchManagers = useMemo(() => {
    return pegawai.filter((item) => item.jenis_pegawai === "BRANCH_MANAGER");
  }, [pegawai]);

  const currentUnitPegawai = useMemo(() => {
    if (!unitData) return [];

    return pegawai.filter(
      (item) =>
        item.unit_id === unitData.id && item.jenis_pegawai !== "BRANCH_MANAGER",
    );
  }, [pegawai, unitData]);

  const pengawasList = useMemo(() => {
    return currentUnitPegawai.filter(
      (item) => item.jenis_pegawai === "PENGAWAS",
    );
  }, [currentUnitPegawai]);

  const mkaList = useMemo(() => {
    return currentUnitPegawai.filter((item) => item.jenis_pegawai === "MKA");
  }, [currentUnitPegawai]);

  const mksPegawaiList = useMemo(() => {
    return currentUnitPegawai.filter((item) => item.jenis_pegawai === "MKS");
  }, [currentUnitPegawai]);

  /*
   * MKS berdasarkan pegawai_id
   */

  const mksList = useMemo(() => {
    const currentMksIds = new Set(mksPegawaiList.map((item) => item.id));

    return mks.filter((item) => currentMksIds.has(item.pegawai_id));
  }, [mks, mksPegawaiList]);

  /*
   * =========================================================
   * HELPER
   * =========================================================
   */

  async function getActiveUnitId() {
    if (!activeUnit?.value) {
      throw new Error("Unit aktif belum tersedia.");
    }

    const { data, error } = await supabase
      .from("unit")
      .select("id")
      .eq("kode_unit", activeUnit.value)
      .single();

    if (error) {
      throw new Error(`Gagal mendapatkan ID unit: ${error.message}`);
    }

    return data.id;
  }

  function showSuccess(message) {
    setSuccess(message);

    setTimeout(() => {
      setSuccess("");
    }, 3000);
  }

  /*
   * =========================================================
   * MKA
   * =========================================================
   */

  function openAddMka() {
    setEditingMka(null);

    setMkaForm({
      nama: "",
      nip: "",
      jabatan: "MKA",
    });

    setError("");
    setShowMkaModal(true);
  }

  function openEditMka(item) {
    setEditingMka(item);

    setMkaForm({
      nama: item.nama || "",
      nip: item.nip || "",
      jabatan: item.jabatan || "MKA",
    });

    setError("");
    setShowMkaModal(true);
  }

  function closeMkaModal() {
    if (saving) return;

    setShowMkaModal(false);
    setEditingMka(null);

    setMkaForm({
      nama: "",
      nip: "",
      jabatan: "MKA",
    });
  }

  async function handleSaveMka(e) {
    e.preventDefault();

    if (!mkaForm.nama.trim()) {
      setError("Nama MKA wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const unitId = await getActiveUnitId();

      /*
       * EDIT
       */

      if (editingMka) {
        const { error } = await supabase
          .from("pegawai")
          .update({
            nama: mkaForm.nama.trim(),
            nip: mkaForm.nip.trim() || null,
            jabatan: mkaForm.jabatan.trim() || "MKA",
          })
          .eq("id", editingMka.id)
          .eq("unit_id", unitId);

        if (error) {
          throw new Error(`Gagal mengubah data MKA: ${error.message}`);
        }

        showSuccess("Data MKA berhasil diperbarui.");
      } else {

      /*
       * TAMBAH
       */
        const { error } = await supabase.from("pegawai").insert({
          nama: mkaForm.nama.trim(),
          nip: mkaForm.nip.trim() || null,
          jabatan: mkaForm.jabatan.trim() || "MKA",
          jenis_pegawai: "MKA",
          cabang_id: unitData?.cabang_id || null,
          unit_id: unitId,
          aktif: true,
        });

        if (error) {
          throw new Error(`Gagal menambah data MKA: ${error.message}`);
        }

        showSuccess("MKA berhasil ditambahkan.");
      }

      closeMkaModal();

      await loadData();
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal menyimpan data MKA.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMka(item) {
    const confirmed = window.confirm(
      `Hapus MKA "${item.nama}" dari ${unitData?.nama_unit}?`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      const unitId = await getActiveUnitId();

      const { error } = await supabase
        .from("pegawai")
        .delete()
        .eq("id", item.id)
        .eq("unit_id", unitId)
        .eq("jenis_pegawai", "MKA");

      if (error) {
        throw new Error(`Gagal menghapus MKA: ${error.message}`);
      }

      showSuccess("MKA berhasil dihapus.");

      await loadData();
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal menghapus data MKA.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * =========================================================
   * PENGAWAS
   * =========================================================
   */

  function openEditPengawas(item) {
    const nama = window.prompt("Nama Pengawas", item.nama || "");

    if (nama === null) return;

    const nip = window.prompt("NIP", item.nip || "");

    if (nip === null) return;

    const jabatan = window.prompt("Jabatan", item.jabatan || "PENGAWAS");

    if (jabatan === null) return;

    savePengawas(item, {
      nama,
      nip,
      jabatan,
    });
  }

  async function savePengawas(item, form) {
    if (!form.nama.trim()) {
      setError("Nama Pengawas wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const unitId = await getActiveUnitId();

      const { error } = await supabase
        .from("pegawai")
        .update({
          nama: form.nama.trim(),
          nip: form.nip.trim() || null,
          jabatan: form.jabatan.trim() || "PENGAWAS",
        })
        .eq("id", item.id)
        .eq("unit_id", unitId)
        .eq("jenis_pegawai", "PENGAWAS");

      if (error) {
        throw new Error(`Gagal mengubah Pengawas: ${error.message}`);
      }

      showSuccess("Data Pengawas berhasil diperbarui.");

      await loadData();
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal menyimpan data Pengawas.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Pegawai Unit
            </h1>

            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Data pegawai berdasarkan unit aktif pada Topbar.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4 sm:py-2 sm:text-sm"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* ================================================= */}
        {/* UNIT AKTIF */}
        {/* ================================================= */}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
                Unit Aktif
              </div>

              <div className="mt-1 text-sm font-bold text-gray-900 sm:text-lg">
                {unitData?.nama_unit ||
                  activeUnit?.label ||
                  activeUnit?.value ||
                  "-"}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unitData?.kode_unit && (
                <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700 sm:px-3 sm:py-1.5 sm:text-sm">
                  {unitData.kode_unit}
                </span>
              )}

              {unitData?.kode_legacy && (
                <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700 sm:px-3 sm:py-1.5 sm:text-sm">
                  {unitData.kode_legacy}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 sm:gap-3 sm:p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <div className="min-w-0">
              <div className="text-xs font-semibold sm:text-sm">
                Terjadi kesalahan
              </div>

              <div className="mt-1 break-words text-[11px] sm:text-sm">
                {error}
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* SUCCESS */}
        {/* ================================================= */}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700 sm:gap-3 sm:p-4">
            <CheckCircle2 size={18} />

            <span className="text-xs font-medium sm:text-sm">{success}</span>
          </div>
        )}

        {/* ================================================= */}
        {/* LOADING */}
        {/* ================================================= */}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <RefreshCw
              size={26}
              className="mx-auto animate-spin text-gray-400"
            />

            <div className="mt-3 text-xs text-gray-500 sm:text-sm">
              Membaca data pegawai...
            </div>
          </div>
        ) : (
          <>
            {/* ================================================= */}
            {/* RINGKASAN */}
            {/* ================================================= */}

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              <SummaryCard
                icon={<BriefcaseBusiness size={18} />}
                title="Branch Manager"
                value={branchManagers.length}
              />

              <SummaryCard
                icon={<ShieldCheck size={18} />}
                title="Pengawas"
                value={pengawasList.length}
              />

              <SummaryCard
                icon={<UserRound size={18} />}
                title="MKA"
                value={mkaList.length}
              />

              <SummaryCard
                icon={<Users size={18} />}
                title="MKS"
                value={mksPegawaiList.length}
              />
            </div>

            {/* ================================================= */}
            {/* BRANCH MANAGER */}
            {/* ================================================= */}

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <SectionHeader
                icon={<BriefcaseBusiness size={18} />}
                title="Branch Manager"
                subtitle="Berlaku untuk JKK1 dan JKK2"
              />

              <div className="p-3 sm:p-5">
                {branchManagers.length === 0 ? (
                  <EmptyState text="Belum ada data Branch Manager." />
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full table-fixed text-[10px] sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left">
                          <th className="w-[35px] px-2 py-2 font-semibold text-gray-700 sm:w-[60px] sm:px-4 sm:py-3">
                            No
                          </th>

                          <th className="px-2 py-2 font-semibold text-gray-700 sm:px-4 sm:py-3">
                            Nama
                          </th>

                          <th className="w-[90px] px-2 py-2 font-semibold text-gray-700 sm:w-auto sm:px-4 sm:py-3">
                            NIP
                          </th>

                          <th className="w-[85px] px-2 py-2 font-semibold text-gray-700 sm:w-auto sm:px-4 sm:py-3">
                            Jabatan
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {branchManagers.map((item, index) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-2 py-2 text-gray-500 sm:px-4 sm:py-3">
                              {index + 1}
                            </td>

                            <td className="truncate px-2 py-2 font-medium text-gray-900 sm:px-4 sm:py-3">
                              {item.nama}
                            </td>

                            <td className="truncate px-2 py-2 text-gray-600 sm:px-4 sm:py-3">
                              {item.nip || "-"}
                            </td>

                            <td className="truncate px-2 py-2 text-gray-600 sm:px-4 sm:py-3">
                              {item.jabatan || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* ================================================= */}
            {/* PENGAWAS */}
            {/* ================================================= */}

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <SectionHeader
                icon={<ShieldCheck size={18} />}
                title="Pengawas"
                subtitle={unitData?.nama_unit || activeUnit?.value || "-"}
              />

              <div className="p-3 sm:p-5">
                {pengawasList.length === 0 ? (
                  <EmptyState text="Belum ada Pengawas pada unit ini." />
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full table-fixed text-[10px] sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left">
                          <th className="w-[35px] px-2 py-2 font-semibold text-gray-700 sm:w-[60px] sm:px-4 sm:py-3">
                            No
                          </th>

                          <th className="px-2 py-2 font-semibold text-gray-700 sm:px-4 sm:py-3">
                            Nama
                          </th>

                          <th className="w-[90px] px-2 py-2 font-semibold text-gray-700 sm:w-auto sm:px-4 sm:py-3">
                            NIP
                          </th>

                          <th className="w-[75px] px-2 py-2 font-semibold text-gray-700 sm:w-auto sm:px-4 sm:py-3">
                            Jabatan
                          </th>

                          <th className="w-[48px] px-1 py-2 text-center font-semibold text-gray-700 sm:w-[90px] sm:px-4 sm:py-3">
                            Aksi
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {pengawasList.map((item, index) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-2 py-2 text-gray-500 sm:px-4 sm:py-3">
                              {index + 1}
                            </td>

                            <td className="truncate px-2 py-2 font-medium text-gray-900 sm:px-4 sm:py-3">
                              {item.nama}
                            </td>

                            <td className="truncate px-2 py-2 text-gray-600 sm:px-4 sm:py-3">
                              {item.nip || "-"}
                            </td>

                            <td className="truncate px-2 py-2 text-gray-600 sm:px-4 sm:py-3">
                              {item.jabatan || "-"}
                            </td>

                            <td className="px-1 py-2 text-center sm:px-4 sm:py-3">
                              <button
                                type="button"
                                onClick={() => openEditPengawas(item)}
                                disabled={saving}
                                title="Edit"
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:gap-2 sm:px-3 sm:py-2"
                              >
                                <Pencil size={13} />

                                <span className="hidden sm:inline">Edit</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* ================================================= */}
            {/* MKA */}
            {/* ================================================= */}

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <SectionHeader
                icon={<UserRound size={18} />}
                title="MKA"
                subtitle={unitData?.nama_unit || activeUnit?.value || "-"}
                action={
                  <button
                    type="button"
                    onClick={openAddMka}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-gray-800 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm"
                  >
                    <Plus size={15} />
                    Tambah MKA
                  </button>
                }
              />

              <div className="p-3 sm:p-5">
                {mkaList.length === 0 ? (
                  <EmptyState text="Belum ada MKA pada unit ini." />
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full table-fixed text-[10px] sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left">
                          <th className="w-[35px] px-2 py-2 font-semibold text-gray-700 sm:w-[60px] sm:px-4 sm:py-3">
                            No
                          </th>

                          <th className="px-2 py-2 font-semibold text-gray-700 sm:px-4 sm:py-3">
                            Nama
                          </th>

                          <th className="w-[85px] px-2 py-2 font-semibold text-gray-700 sm:w-auto sm:px-4 sm:py-3">
                            NIP
                          </th>

                          <th className="hidden px-2 py-2 font-semibold text-gray-700 sm:table-cell sm:px-4 sm:py-3">
                            Jabatan
                          </th>

                          <th className="w-[82px] px-1 py-2 text-center font-semibold text-gray-700 sm:w-[150px] sm:px-4 sm:py-3">
                            Aksi
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {mkaList.map((item, index) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-2 py-2 text-gray-500 sm:px-4 sm:py-3">
                              {index + 1}
                            </td>

                            <td className="truncate px-2 py-2 font-medium text-gray-900 sm:px-4 sm:py-3">
                              {item.nama}
                            </td>

                            <td className="truncate px-2 py-2 text-gray-600 sm:px-4 sm:py-3">
                              {item.nip || "-"}
                            </td>

                            <td className="hidden truncate px-2 py-2 text-gray-600 sm:table-cell sm:px-4 sm:py-3">
                              {item.jabatan || "-"}
                            </td>

                            <td className="px-1 py-2 text-center sm:px-4 sm:py-3">
                              <div className="flex justify-center gap-1 sm:gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditMka(item)}
                                  disabled={saving}
                                  title="Edit"
                                  className="inline-flex items-center justify-center rounded-md border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:gap-2 sm:px-3 sm:py-2"
                                >
                                  <Pencil size={13} />

                                  <span className="hidden sm:inline">Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMka(item)}
                                  disabled={saving}
                                  title="Hapus"
                                  className="inline-flex items-center justify-center rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 sm:gap-2 sm:px-3 sm:py-2"
                                >
                                  <Trash2 size={13} />

                                  <span className="hidden sm:inline">
                                    Hapus
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* ================================================= */}
            {/* MKS */}
            {/* ================================================= */}

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <SectionHeader
                icon={<Users size={18} />}
                title="MKS"
                subtitle={unitData?.nama_unit || activeUnit?.value || "-"}
              />

              <div className="p-3 sm:p-5">
                {mksPegawaiList.length === 0 ? (
                  <EmptyState text="Belum ada MKS pada unit ini." />
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full table-fixed text-[10px] sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left">
                          <th className="w-[30px] px-1.5 py-2 font-semibold text-gray-700 sm:w-[60px] sm:px-4 sm:py-3">
                            No
                          </th>

                          <th className="px-1.5 py-2 font-semibold text-gray-700 sm:px-4 sm:py-3">
                            Nama MKS
                          </th>

                          <th className="hidden w-[110px] px-2 py-2 font-semibold text-gray-700 sm:table-cell sm:w-auto sm:px-4 sm:py-3">
                            NIP
                          </th>

                          <th className="w-[75px] px-1.5 py-2 font-semibold text-gray-700 sm:w-auto sm:px-4 sm:py-3">
                            Kode Agen
                          </th>

                          <th className="w-[80px] px-1.5 py-2 font-semibold text-gray-700 sm:w-auto sm:px-4 sm:py-3">
                            Pengawas
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {mksPegawaiList.map((item, index) => {
                          const mksData = mksList.find(
                            (mksItem) => mksItem.pegawai_id === item.id,
                          );

                          const pengawas = pengawasList.find(
                            (pengawasItem) =>
                              pengawasItem.id === mksData?.pengawas_id,
                          );

                          return (
                            <tr
                              key={item.id}
                              className="border-b border-gray-100 last:border-0"
                            >
                              <td className="px-1.5 py-2 text-gray-500 sm:px-4 sm:py-3">
                                {index + 1}
                              </td>

                              <td className="truncate px-1.5 py-2 font-medium text-gray-900 sm:px-4 sm:py-3">
                                {item.nama}
                              </td>

                              <td className="hidden truncate px-2 py-2 text-gray-600 sm:table-cell sm:px-4 sm:py-3">
                                {item.nip || "-"}
                              </td>

                              <td className="truncate px-1.5 py-2 text-gray-600 sm:px-4 sm:py-3">
                                {mksData?.kode_agen || "-"}
                              </td>

                              <td className="truncate px-1.5 py-2 text-gray-600 sm:px-4 sm:py-3">
                                {pengawas?.nama || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ================================================= */}
        {/* MODAL MKA */}
        {/* ================================================= */}

        {showMkaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* Header */}

              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 sm:text-lg">
                    {editingMka ? "Edit MKA" : "Tambah MKA"}
                  </h2>

                  <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">
                    Unit: {unitData?.nama_unit || activeUnit?.value || "-"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeMkaModal}
                  disabled={saving}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 sm:p-2"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}

              <form
                onSubmit={handleSaveMka}
                className="space-y-4 p-4 sm:space-y-5 sm:p-6"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                    Nama MKA
                  </label>

                  <input
                    type="text"
                    value={mkaForm.nama}
                    onChange={(e) =>
                      setMkaForm((prev) => ({
                        ...prev,
                        nama: e.target.value,
                      }))
                    }
                    placeholder="Nama lengkap"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                    NIP
                  </label>

                  <input
                    type="text"
                    value={mkaForm.nip}
                    onChange={(e) =>
                      setMkaForm((prev) => ({
                        ...prev,
                        nip: e.target.value,
                      }))
                    }
                    placeholder="NIP"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                    Jabatan
                  </label>

                  <input
                    type="text"
                    value={mkaForm.jabatan}
                    onChange={(e) =>
                      setMkaForm((prev) => ({
                        ...prev,
                        jabatan: e.target.value,
                      }))
                    }
                    placeholder="Jabatan"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 sm:text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-1 sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={closeMkaModal}
                    disabled={saving}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:flex-none sm:px-4 sm:text-sm"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:gap-2 sm:px-5 sm:text-sm"
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        Simpan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/*
 * =========================================================
 * SUMMARY CARD
 * =========================================================
 */

function SummaryCard({ icon, title, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 sm:h-10 sm:w-10">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="truncate text-[9px] font-medium text-gray-500 sm:text-xs">
            {title}
          </div>

          <div className="mt-0.5 text-xl font-bold text-gray-900 sm:mt-1 sm:text-2xl">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * =========================================================
 * SECTION HEADER
 * =========================================================
 */

function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 sm:h-10 sm:w-10">
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900 sm:text-base">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-0.5 truncate text-[10px] text-gray-500 sm:text-xs">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

/*
 * =========================================================
 * EMPTY STATE
 * =========================================================
 */

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center sm:p-8">
      <div className="text-xs text-gray-500 sm:text-sm">{text}</div>
    </div>
  );
}
