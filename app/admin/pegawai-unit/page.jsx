"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";
import {
  RefreshCw,
  Pencil,
  Plus,
  Trash2,
  X,
  Save,
  UserCog,
  ShieldCheck,
  BriefcaseBusiness,
  KeyRound,
  MapPin,
  Power,
} from "lucide-react";

function showValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

export default function PegawaiPage() {
  const { activeUnit } = useUnit();

  const [unitData, setUnitData] = useState(null);
  const [pegawai, setPegawai] = useState([]);
  const [mks, setMks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showPegawaiModal, setShowPegawaiModal] = useState(false);
  const [showMksModal, setShowMksModal] = useState(false);
  const [showMkaModal, setShowMkaModal] = useState(false);

  // Editing
  const [editingPegawai, setEditingPegawai] = useState(null);
  const [editingMks, setEditingMks] = useState(null);
  const [editingMka, setEditingMka] = useState(null);

  // Form unit
  const [unitForm, setUnitForm] = useState({
    nama_unit: "",
    kode_unit: "",
    kode_legacy: "",
    kode_kawasan: "",
  });

  // Form pegawai umum
  const [pegawaiForm, setPegawaiForm] = useState({
    nama: "",
    nip: "",
    jabatan: "",
    aktif: true,
  });

  // Form MKS
  const [mksForm, setMksForm] = useState({
    nama: "",
    nip: "",
    jabatan: "",
    kode_agen: "",
    pengawas_id: "",
    aktif: true,
  });

  // Form MKA
  const [mkaForm, setMkaForm] = useState({
    nama: "",
    nip: "",
    jabatan: "MKA",
    aktif: true,
  });

  function showSuccess(message) {
    setSuccess(message);
    setError("");

    window.setTimeout(() => {
      setSuccess("");
    }, 3000);
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      if (!activeUnit?.value) {
        setUnitData(null);
        setPegawai([]);
        setMks([]);
        return;
      }

      // ============================================================
      // UNIT
      // ============================================================

      const { data: unit, error: unitError } = await supabase
        .from("unit")
        .select(
          "id, nama_unit, kode_unit, kode_legacy, kode_kawasan, cabang_id",
        )
        .eq("kode_unit", activeUnit.value)
        .maybeSingle();

      if (unitError) throw unitError;

      if (!unit) {
        throw new Error(
          `Data unit dengan kode ${activeUnit.value} tidak ditemukan.`,
        );
      }

      setUnitData(unit);

      setUnitForm({
        nama_unit: unit.nama_unit || "",
        kode_unit: unit.kode_unit || "",
        kode_legacy: unit.kode_legacy || "",
        kode_kawasan: unit.kode_kawasan || "",
      });

      // ============================================================
      // PEGAWAI UNIT
      // ============================================================

      const { data: unitPegawai, error: pegawaiError } = await supabase
        .from("pegawai")
        .select(
          "id, nama, nip, jabatan, jenis_pegawai, cabang_id, unit_id, aktif, created_at, updated_at",
        )
        .eq("unit_id", unit.id)
        .order("nama", { ascending: true });

      if (pegawaiError) throw pegawaiError;

      // ============================================================
      // BRANCH MANAGER
      // BM tidak menggunakan unit_id
      // ============================================================

      const { data: branchManagers, error: bmError } = await supabase
        .from("pegawai")
        .select(
          "id, nama, nip, jabatan, jenis_pegawai, cabang_id, unit_id, aktif, created_at, updated_at",
        )
        .eq("jenis_pegawai", "BRANCH_MANAGER")
        .order("nama", { ascending: true });

      if (bmError) throw bmError;

      setPegawai([...(branchManagers || []), ...(unitPegawai || [])]);

      // ============================================================
      // MKS
      // ============================================================

      const { data: mksData, error: mksError } = await supabase
        .from("mks")
        .select(
          "id, pegawai_id, pengawas_id, kode_agen, created_at, updated_at",
        );

      if (mksError) throw mksError;

      setMks(mksData || []);
    } catch (err) {
      console.error("loadData error:", err);
      setError(err?.message || "Gagal memuat data master pegawai.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeUnit?.value]);

  // ============================================================
  // DERIVED DATA
  // ============================================================

  const branchManagers = useMemo(
    () => pegawai.filter((item) => item.jenis_pegawai === "BRANCH_MANAGER"),
    [pegawai],
  );

  const currentUnitPegawai = useMemo(
    () =>
      pegawai.filter(
        (item) =>
          item.unit_id === unitData?.id &&
          item.jenis_pegawai !== "BRANCH_MANAGER",
      ),
    [pegawai, unitData],
  );

  const pengawasList = useMemo(
    () =>
      currentUnitPegawai.filter((item) => item.jenis_pegawai === "PENGAWAS"),
    [currentUnitPegawai],
  );

  const mkaList = useMemo(
    () => currentUnitPegawai.filter((item) => item.jenis_pegawai === "MKA"),
    [currentUnitPegawai],
  );

  const mksPegawaiList = useMemo(
    () => currentUnitPegawai.filter((item) => item.jenis_pegawai === "MKS"),
    [currentUnitPegawai],
  );

  const mksList = useMemo(() => {
    return mksPegawaiList
      .map((pegawaiItem) => {
        const mksItem = mks.find((item) => item.pegawai_id === pegawaiItem.id);

        return {
          ...pegawaiItem,
          mks_id: mksItem?.id || null,
          kode_agen: mksItem?.kode_agen || "",
          pengawas_id: mksItem?.pengawas_id || null,
        };
      })
      .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  }, [mksPegawaiList, mks]);

  const pegawaiById = useMemo(() => {
    const map = new Map();

    pegawai.forEach((item) => {
      map.set(item.id, item);
    });

    return map;
  }, [pegawai]);

  // ============================================================
  // UNIT
  // ============================================================

  function openUnitModal() {
    if (!unitData) return;

    setUnitForm({
      nama_unit: unitData.nama_unit || "",
      kode_unit: unitData.kode_unit || "",
      kode_legacy: unitData.kode_legacy || "",
      kode_kawasan: unitData.kode_kawasan || "",
    });

    setShowUnitModal(true);
  }

  async function handleSaveUnit() {
    if (!unitData?.id) return;

    if (!unitForm.nama_unit.trim()) {
      setError("Nama unit wajib diisi.");
      return;
    }

    if (!unitForm.kode_unit.trim()) {
      setError("Kode unit wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { data, error: updateError } = await supabase
        .from("unit")
        .update({
          nama_unit: unitForm.nama_unit.trim(),
          kode_unit: unitForm.kode_unit.trim(),
          kode_legacy: unitForm.kode_legacy.trim() || null,
          kode_kawasan: unitForm.kode_kawasan.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", unitData.id)
        .select(
          "id, nama_unit, kode_unit, kode_legacy, kode_kawasan, cabang_id",
        )
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "Data unit tidak berhasil diperbarui. Periksa izin/RLS.",
        );
      }

      setShowUnitModal(false);

      await loadData();

      showSuccess("Data unit berhasil diperbarui.");
    } catch (err) {
      console.error("handleSaveUnit error:", err);
      setError(err?.message || "Gagal menyimpan data unit.");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // PEGAWAI UMUM
  // ============================================================

  function openPegawaiModal(item) {
    setEditingPegawai(item);

    setPegawaiForm({
      nama: item?.nama || "",
      nip: item?.nip || "",
      jabatan: item?.jabatan || "",
      aktif: item?.aktif !== false,
    });

    setShowPegawaiModal(true);
  }

  async function handleSavePegawai() {
    if (!editingPegawai?.id) return;

    if (!pegawaiForm.nama.trim()) {
      setError("Nama pegawai wajib diisi.");
      return;
    }

    if (!pegawaiForm.jabatan.trim()) {
      setError("Jabatan wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { data, error: updateError } = await supabase
        .from("pegawai")
        .update({
          nama: pegawaiForm.nama.trim(),
          nip: pegawaiForm.nip.trim() || null,
          jabatan: pegawaiForm.jabatan.trim(),
          aktif: pegawaiForm.aktif,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingPegawai.id)
        .select(
          "id, nama, nip, jabatan, jenis_pegawai, aktif, unit_id, cabang_id",
        )
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "Data pegawai tidak berubah. Periksa izin/RLS tabel pegawai.",
        );
      }

      setShowPegawaiModal(false);
      setEditingPegawai(null);

      await loadData();

      showSuccess(`Data ${pegawaiForm.nama.trim()} berhasil diperbarui.`);
    } catch (err) {
      console.error("handleSavePegawai error:", err);
      setError(err?.message || "Gagal menyimpan data pegawai.");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // TOGGLE AKTIF / NONAKTIF
  // ============================================================

  async function togglePegawaiAktif(item) {
    if (!item?.id) return;

    try {
      setSaving(true);
      setError("");

      const newStatus = item.aktif === false;

      const { data, error: updateError } = await supabase
        .from("pegawai")
        .update({
          aktif: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .select("id, nama, aktif")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      // Sangat penting:
      // Jika RLS menolak update atau tidak ada row yang terkena,
      // data akan null dan kita tidak menampilkan pesan sukses.
      if (!data) {
        throw new Error(
          "Status tidak berubah. Data pegawai tidak ditemukan atau akses update ditolak oleh RLS.",
        );
      }

      console.log("Status pegawai berhasil diubah:", data);

      await loadData();

      showSuccess(
        newStatus
          ? `${item.nama} berhasil diaktifkan.`
          : `${item.nama} berhasil dinonaktifkan.`,
      );
    } catch (err) {
      console.error("togglePegawaiAktif error:", err);

      setError(err?.message || "Gagal mengubah status aktif/nonaktif pegawai.");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // MKS
  // ============================================================

  function openMksModal(item) {
    setEditingMks(item);

    setMksForm({
      nama: item?.nama || "",
      nip: item?.nip || "",
      jabatan: item?.jabatan || "",
      kode_agen: item?.kode_agen || "",
      pengawas_id: item?.pengawas_id || "",
      aktif: item?.aktif !== false,
    });

    setShowMksModal(true);
  }

  async function handleSaveMks() {
    if (!editingMks?.id) return;

    if (!mksForm.nama.trim()) {
      setError("Nama MKS wajib diisi.");
      return;
    }

    if (!mksForm.jabatan.trim()) {
      setError("Jabatan MKS wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // ==========================================================
      // UPDATE PEGAWAI
      // ==========================================================

      const { data: updatedPegawai, error: pegawaiUpdateError } = await supabase
        .from("pegawai")
        .update({
          nama: mksForm.nama.trim(),
          nip: mksForm.nip.trim() || null,
          jabatan: mksForm.jabatan.trim(),
          aktif: mksForm.aktif,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingMks.id)
        .select(
          "id, nama, nip, jabatan, jenis_pegawai, aktif, unit_id, cabang_id",
        )
        .maybeSingle();

      if (pegawaiUpdateError) {
        throw pegawaiUpdateError;
      }

      if (!updatedPegawai) {
        throw new Error(
          "Data pegawai MKS tidak berhasil diperbarui. Periksa izin/RLS.",
        );
      }

      // ==========================================================
      // CARI DATA MKS
      // ==========================================================

      const mksRecord = mks.find((item) => item.pegawai_id === editingMks.id);

      // ==========================================================
      // UPDATE MKS
      // ==========================================================

      if (mksRecord) {
        const { data: updatedMks, error: mksUpdateError } = await supabase
          .from("mks")
          .update({
            kode_agen: mksForm.kode_agen.trim() || null,
            pengawas_id: mksForm.pengawas_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("pegawai_id", editingMks.id)
          .select("id, pegawai_id, kode_agen, pengawas_id")
          .maybeSingle();

        if (mksUpdateError) {
          throw mksUpdateError;
        }

        if (!updatedMks) {
          throw new Error(
            "Data MKS tidak ditemukan atau tidak dapat diperbarui.",
          );
        }
      } else {
        // ========================================================
        // INSERT MKS
        // ========================================================

        const { data: insertedMks, error: mksInsertError } = await supabase
          .from("mks")
          .insert({
            pegawai_id: editingMks.id,
            kode_agen: mksForm.kode_agen.trim() || null,
            pengawas_id: mksForm.pengawas_id || null,
          })
          .select("id, pegawai_id, kode_agen, pengawas_id")
          .maybeSingle();

        if (mksInsertError) {
          throw mksInsertError;
        }

        if (!insertedMks) {
          throw new Error("Data MKS gagal dibuat.");
        }
      }

      setShowMksModal(false);
      setEditingMks(null);

      await loadData();

      showSuccess(`Data MKS ${mksForm.nama.trim()} berhasil diperbarui.`);
    } catch (err) {
      console.error("handleSaveMks error:", err);

      setError(err?.message || "Gagal menyimpan data MKS.");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // MKA
  // ============================================================

  function openAddMkaModal() {
    setEditingMka(null);

    setMkaForm({
      nama: "",
      nip: "",
      jabatan: "MKA",
      aktif: true,
    });

    setShowMkaModal(true);
  }

  function openEditMkaModal(item) {
    setEditingMka(item);

    setMkaForm({
      nama: item?.nama || "",
      nip: item?.nip || "",
      jabatan: item?.jabatan || "MKA",
      aktif: item?.aktif !== false,
    });

    setShowMkaModal(true);
  }

  async function handleSaveMka() {
    if (!unitData?.id) {
      setError("Unit aktif tidak ditemukan.");
      return;
    }

    if (!mkaForm.nama.trim()) {
      setError("Nama MKA wajib diisi.");
      return;
    }

    if (!mkaForm.jabatan.trim()) {
      setError("Jabatan wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingMka?.id) {
        // ========================================================
        // UPDATE MKA
        // ========================================================

        const { data, error: updateError } = await supabase
          .from("pegawai")
          .update({
            nama: mkaForm.nama.trim(),
            nip: mkaForm.nip.trim() || null,
            jabatan: mkaForm.jabatan.trim(),
            aktif: mkaForm.aktif,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMka.id)
          .eq("unit_id", unitData.id)
          .eq("jenis_pegawai", "MKA")
          .select("id, nama, nip, jabatan, jenis_pegawai, unit_id, aktif")
          .maybeSingle();

        if (updateError) throw updateError;

        if (!data) {
          throw new Error("Data MKA tidak berhasil diperbarui.");
        }

        showSuccess(`MKA ${mkaForm.nama.trim()} berhasil diperbarui.`);
      } else {
        // ========================================================
        // INSERT MKA
        // ========================================================

        const { data, error: insertError } = await supabase
          .from("pegawai")
          .insert({
            nama: mkaForm.nama.trim(),
            nip: mkaForm.nip.trim() || null,
            jabatan: mkaForm.jabatan.trim(),
            jenis_pegawai: "MKA",
            cabang_id: unitData.cabang_id,
            unit_id: unitData.id,
            aktif: mkaForm.aktif,
          })
          .select("id, nama, nip, jabatan, jenis_pegawai, unit_id, aktif")
          .maybeSingle();

        if (insertError) throw insertError;

        if (!data) {
          throw new Error("Data MKA gagal ditambahkan.");
        }

        showSuccess(`MKA ${mkaForm.nama.trim()} berhasil ditambahkan.`);
      }

      setShowMkaModal(false);
      setEditingMka(null);

      await loadData();
    } catch (err) {
      console.error("handleSaveMka error:", err);

      setError(err?.message || "Gagal menyimpan data MKA.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMka(item) {
    if (!item?.id) return;

    const confirmed = window.confirm(
      `Hapus MKA "${item.nama}" dari master pegawai?`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");

      const { data, error: deleteError } = await supabase
        .from("pegawai")
        .delete()
        .eq("id", item.id)
        .eq("unit_id", unitData?.id)
        .eq("jenis_pegawai", "MKA")
        .select("id, nama")
        .maybeSingle();

      if (deleteError) throw deleteError;

      if (!data) {
        throw new Error("Data MKA tidak terhapus. Periksa izin/RLS.");
      }

      await loadData();

      showSuccess(`MKA ${item.nama} berhasil dihapus.`);
    } catch (err) {
      console.error("handleDeleteMka error:", err);

      setError(err?.message || "Gagal menghapus MKA.");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <DashboardLayout>
      <div className="space-y-4 p-3 sm:p-4 md:space-y-6 md:p-6">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              Master Pegawai
            </h1>

            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
              Kelola data unit dan pegawai JOSJIS
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading || saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10"
            title="Refresh"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* ======================================================
            ALERT
        ====================================================== */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* ======================================================
            UNIT
        ====================================================== */}

        <SectionCard
          icon={<MapPin size={18} />}
          title="Unit Aktif"
          action={
            <button
              type="button"
              onClick={openUnitModal}
              disabled={!unitData || saving}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <Pencil size={13} />
              <span>Edit</span>
            </button>
          }
        >
          {unitData ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <InfoBox label="Nama Unit" value={unitData.nama_unit} />

              <InfoBox label="Kode Unit" value={unitData.kode_unit} />

              <InfoBox label="Kode Legacy" value={unitData.kode_legacy} />

              <InfoBox label="Kode Kawasan" value={unitData.kode_kawasan} />
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
              Belum ada unit aktif.
            </div>
          )}
        </SectionCard>

        {/* ======================================================
            SUMMARY
        ====================================================== */}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryCard
            icon={<UserCog size={18} />}
            label="Branch Manager"
            value={branchManagers.length}
          />

          <SummaryCard
            icon={<ShieldCheck size={18} />}
            label="Pengawas"
            value={pengawasList.length}
          />

          <SummaryCard
            icon={<BriefcaseBusiness size={18} />}
            label="MKA"
            value={mkaList.length}
          />

          <SummaryCard
            icon={<KeyRound size={18} />}
            label="MKS"
            value={mksList.length}
          />
        </div>

        {/* ======================================================
            LOADING
        ====================================================== */}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            <RefreshCw size={22} className="mx-auto mb-2 animate-spin" />
            Memuat data pegawai...
          </div>
        ) : (
          <>
            {/* ==================================================
                BRANCH MANAGER
            ================================================== */}

            <SectionCard
              icon={<UserCog size={18} />}
              title="Branch Manager"
              description="Data Branch Manager yang digunakan bersama unit."
            >
              {branchManagers.length === 0 ? (
                <EmptyTable text="Belum ada data Branch Manager." />
              ) : (
                <ResponsiveTable
                  headers={["Nama", "NIP", "Jabatan", "Status", "Aksi"]}
                  desktopRows={branchManagers.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <Td strong>{showValue(item.nama)}</Td>
                      <Td>{showValue(item.nip)}</Td>
                      <Td>{showValue(item.jabatan)}</Td>
                      <Td>
                        <StatusBadge aktif={item.aktif} />
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <IconActionButton
                            icon={<Pencil size={14} />}
                            title="Edit"
                            onClick={() => openPegawaiModal(item)}
                          />

                          <IconActionButton
                            icon={
                              item.aktif ? <X size={14} /> : <Power size={14} />
                            }
                            title={item.aktif ? "Nonaktifkan" : "Aktifkan"}
                            onClick={() => togglePegawaiAktif(item)}
                          />
                        </div>
                      </Td>
                    </tr>
                  ))}
                  mobileCards={branchManagers.map((item) => (
                    <CompactMobileCard
                      key={item.id}
                      title={item.nama}
                      subtitle={item.jabatan}
                      status={item.aktif}
                      actions={
                        <>
                          <IconActionButton
                            icon={<Pencil size={14} />}
                            title="Edit"
                            onClick={() => openPegawaiModal(item)}
                          />

                          <IconActionButton
                            icon={
                              item.aktif ? <X size={14} /> : <Power size={14} />
                            }
                            title={item.aktif ? "Nonaktifkan" : "Aktifkan"}
                            onClick={() => togglePegawaiAktif(item)}
                          />
                        </>
                      }
                    >
                      <CompactInfo label="NIP" value={item.nip} />

                      <CompactInfo label="Jabatan" value={item.jabatan} />
                    </CompactMobileCard>
                  ))}
                />
              )}
            </SectionCard>

            {/* ==================================================
                PENGAWAS
            ================================================== */}

            <SectionCard
              icon={<ShieldCheck size={18} />}
              title="Pengawas"
              description={`Pengawas pada ${showValue(unitData?.nama_unit)}.`}
            >
              {pengawasList.length === 0 ? (
                <EmptyTable text="Belum ada data Pengawas." />
              ) : (
                <ResponsiveTable
                  headers={["Nama", "NIP", "Jabatan", "Status", "Aksi"]}
                  desktopRows={pengawasList.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <Td strong>{showValue(item.nama)}</Td>
                      <Td>{showValue(item.nip)}</Td>
                      <Td>{showValue(item.jabatan)}</Td>
                      <Td>
                        <StatusBadge aktif={item.aktif} />
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <IconActionButton
                            icon={<Pencil size={14} />}
                            title="Edit"
                            onClick={() => openPegawaiModal(item)}
                          />

                          <IconActionButton
                            icon={
                              item.aktif ? <X size={14} /> : <Power size={14} />
                            }
                            title={item.aktif ? "Nonaktifkan" : "Aktifkan"}
                            onClick={() => togglePegawaiAktif(item)}
                          />
                        </div>
                      </Td>
                    </tr>
                  ))}
                  mobileCards={pengawasList.map((item) => (
                    <CompactMobileCard
                      key={item.id}
                      title={item.nama}
                      subtitle={item.jabatan}
                      status={item.aktif}
                      actions={
                        <>
                          <IconActionButton
                            icon={<Pencil size={14} />}
                            title="Edit"
                            onClick={() => openPegawaiModal(item)}
                          />

                          <IconActionButton
                            icon={
                              item.aktif ? <X size={14} /> : <Power size={14} />
                            }
                            title={item.aktif ? "Nonaktifkan" : "Aktifkan"}
                            onClick={() => togglePegawaiAktif(item)}
                          />
                        </>
                      }
                    >
                      <CompactInfo label="NIP" value={item.nip} />

                      <CompactInfo label="Jabatan" value={item.jabatan} />
                    </CompactMobileCard>
                  ))}
                />
              )}
            </SectionCard>

            {/* ==================================================
                MKA
            ================================================== */}

            <SectionCard
              icon={<BriefcaseBusiness size={18} />}
              title="MKA"
              description="Master pegawai MKA pada unit aktif."
              action={
                <button
                  type="button"
                  onClick={openAddMkaModal}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  <Plus size={13} />
                  <span>Tambah</span>
                </button>
              }
            >
              {mkaList.length === 0 ? (
                <EmptyTable text="Belum ada data MKA." />
              ) : (
                <ResponsiveTable
                  headers={["Nama", "NIP", "Jabatan", "Status", "Aksi"]}
                  desktopRows={mkaList.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <Td strong>{showValue(item.nama)}</Td>
                      <Td>{showValue(item.nip)}</Td>
                      <Td>{showValue(item.jabatan)}</Td>
                      <Td>
                        <StatusBadge aktif={item.aktif} />
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <IconActionButton
                            icon={<Pencil size={14} />}
                            title="Edit"
                            onClick={() => openEditMkaModal(item)}
                          />

                          <IconActionButton
                            icon={
                              item.aktif ? <X size={14} /> : <Power size={14} />
                            }
                            title={item.aktif ? "Nonaktifkan" : "Aktifkan"}
                            onClick={() => togglePegawaiAktif(item)}
                          />

                          <IconActionButton
                            icon={<Trash2 size={14} />}
                            title="Hapus"
                            danger
                            onClick={() => handleDeleteMka(item)}
                          />
                        </div>
                      </Td>
                    </tr>
                  ))}
                  mobileCards={mkaList.map((item) => (
                    <CompactMobileCard
                      key={item.id}
                      title={item.nama}
                      subtitle={item.jabatan}
                      status={item.aktif}
                      actions={
                        <>
                          <IconActionButton
                            icon={<Pencil size={14} />}
                            title="Edit"
                            onClick={() => openEditMkaModal(item)}
                          />

                          <IconActionButton
                            icon={
                              item.aktif ? <X size={14} /> : <Power size={14} />
                            }
                            title={item.aktif ? "Nonaktifkan" : "Aktifkan"}
                            onClick={() => togglePegawaiAktif(item)}
                          />

                          <IconActionButton
                            icon={<Trash2 size={14} />}
                            title="Hapus"
                            danger
                            onClick={() => handleDeleteMka(item)}
                          />
                        </>
                      }
                    >
                      <CompactInfo label="NIP" value={item.nip} />

                      <CompactInfo label="Jabatan" value={item.jabatan} />
                    </CompactMobileCard>
                  ))}
                />
              )}
            </SectionCard>

            {/* ==================================================
                MKS
            ================================================== */}

            <SectionCard
              icon={<KeyRound size={18} />}
              title="MKS"
              description="Master MKS beserta kode agen dan Pengawas."
            >
              {mksList.length === 0 ? (
                <EmptyTable text="Belum ada data MKS." />
              ) : (
                <ResponsiveTable
                  headers={[
                    "Nama",
                    "NIP",
                    "Jabatan",
                    "Kode Agen",
                    "Pengawas",
                    "Status",
                    "Aksi",
                  ]}
                  desktopRows={mksList.map((item) => {
                    const pengawas = item.pengawas_id
                      ? pegawaiById.get(item.pengawas_id)
                      : null;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <Td strong>{showValue(item.nama)}</Td>

                        <Td>{showValue(item.nip)}</Td>

                        <Td>{showValue(item.jabatan)}</Td>

                        <Td>
                          <span className="font-mono text-xs font-semibold text-gray-800">
                            {showValue(item.kode_agen)}
                          </span>
                        </Td>

                        <Td>{showValue(pengawas?.nama)}</Td>

                        <Td>
                          <StatusBadge aktif={item.aktif} />
                        </Td>

                        <Td>
                          <div className="flex gap-1">
                            {/* EDIT MKS */}
                            <IconActionButton
                              icon={<Pencil size={14} />}
                              title="Edit MKS"
                              onClick={() => openMksModal(item)}
                            />

                            {/* TOGGLE MKS */}
                            <IconActionButton
                              icon={
                                item.aktif ? (
                                  <X size={14} />
                                ) : (
                                  <Power size={14} />
                                )
                              }
                              title={
                                item.aktif ? "Nonaktifkan MKS" : "Aktifkan MKS"
                              }
                              onClick={() => togglePegawaiAktif(item)}
                            />
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                  mobileCards={mksList.map((item) => {
                    const pengawas = item.pengawas_id
                      ? pegawaiById.get(item.pengawas_id)
                      : null;

                    return (
                      <CompactMobileCard
                        key={item.id}
                        title={item.nama}
                        subtitle={`Kode Agen: ${item.kode_agen || "-"}`}
                        status={item.aktif}
                        actions={
                          <>
                            {/* EDIT */}
                            <IconActionButton
                              icon={<Pencil size={14} />}
                              title="Edit MKS"
                              onClick={() => openMksModal(item)}
                            />

                            {/* TOGGLE */}
                            <IconActionButton
                              icon={
                                item.aktif ? (
                                  <X size={14} />
                                ) : (
                                  <Power size={14} />
                                )
                              }
                              title={
                                item.aktif ? "Nonaktifkan MKS" : "Aktifkan MKS"
                              }
                              onClick={() => togglePegawaiAktif(item)}
                            />
                          </>
                        }
                      >
                        <CompactInfo label="NIP" value={item.nip} />

                        <CompactInfo label="Jabatan" value={item.jabatan} />

                        <CompactInfo label="Pengawas" value={pengawas?.nama} />

                        <CompactInfo label="Kode Agen" value={item.kode_agen} />
                      </CompactMobileCard>
                    );
                  })}
                />
              )}
            </SectionCard>
          </>
        )}

        {/* ======================================================
            MODAL UNIT
        ====================================================== */}

        <Modal
          open={showUnitModal}
          title="Edit Unit"
          onClose={() => setShowUnitModal(false)}
        >
          <div className="space-y-4">
            <FormField
              label="Nama Unit"
              value={unitForm.nama_unit}
              onChange={(value) =>
                setUnitForm((prev) => ({
                  ...prev,
                  nama_unit: value,
                }))
              }
              required
            />

            <FormField
              label="Kode Unit"
              value={unitForm.kode_unit}
              onChange={(value) =>
                setUnitForm((prev) => ({
                  ...prev,
                  kode_unit: value,
                }))
              }
              required
            />

            <FormField
              label="Kode Legacy"
              value={unitForm.kode_legacy}
              onChange={(value) =>
                setUnitForm((prev) => ({
                  ...prev,
                  kode_legacy: value,
                }))
              }
            />

            <FormField
              label="Kode Kawasan"
              value={unitForm.kode_kawasan}
              onChange={(value) =>
                setUnitForm((prev) => ({
                  ...prev,
                  kode_kawasan: value,
                }))
              }
            />

            <ModalActions
              onCancel={() => setShowUnitModal(false)}
              onSave={handleSaveUnit}
              saving={saving}
            />
          </div>
        </Modal>

        {/* ======================================================
            MODAL PEGAWAI
        ====================================================== */}

        <Modal
          open={showPegawaiModal}
          title="Edit Pegawai"
          onClose={() => setShowPegawaiModal(false)}
        >
          <div className="space-y-4">
            <FormField
              label="Nama"
              value={pegawaiForm.nama}
              onChange={(value) =>
                setPegawaiForm((prev) => ({
                  ...prev,
                  nama: value,
                }))
              }
              required
            />

            <FormField
              label="NIP"
              value={pegawaiForm.nip}
              onChange={(value) =>
                setPegawaiForm((prev) => ({
                  ...prev,
                  nip: value,
                }))
              }
            />

            <FormField
              label="Jabatan"
              value={pegawaiForm.jabatan}
              onChange={(value) =>
                setPegawaiForm((prev) => ({
                  ...prev,
                  jabatan: value,
                }))
              }
              required
            />

            <ToggleField
              label="Status Pegawai"
              value={pegawaiForm.aktif}
              onChange={(value) =>
                setPegawaiForm((prev) => ({
                  ...prev,
                  aktif: value,
                }))
              }
            />

            <ModalActions
              onCancel={() => setShowPegawaiModal(false)}
              onSave={handleSavePegawai}
              saving={saving}
            />
          </div>
        </Modal>

        {/* ======================================================
            MODAL MKS
        ====================================================== */}

        <Modal
          open={showMksModal}
          title="Edit MKS"
          onClose={() => setShowMksModal(false)}
        >
          <div className="space-y-4">
            <FormField
              label="Nama"
              value={mksForm.nama}
              onChange={(value) =>
                setMksForm((prev) => ({
                  ...prev,
                  nama: value,
                }))
              }
              required
            />

            <FormField
              label="NIP"
              value={mksForm.nip}
              onChange={(value) =>
                setMksForm((prev) => ({
                  ...prev,
                  nip: value,
                }))
              }
            />

            <FormField
              label="Jabatan"
              value={mksForm.jabatan}
              onChange={(value) =>
                setMksForm((prev) => ({
                  ...prev,
                  jabatan: value,
                }))
              }
              required
            />

            <FormField
              label="Kode Agen"
              value={mksForm.kode_agen}
              onChange={(value) =>
                setMksForm((prev) => ({
                  ...prev,
                  kode_agen: value,
                }))
              }
            />

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Pengawas
              </label>

              <select
                value={mksForm.pengawas_id}
                onChange={(event) =>
                  setMksForm((prev) => ({
                    ...prev,
                    pengawas_id: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              >
                <option value="">- Pilih Pengawas -</option>

                {pengawasList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama}
                  </option>
                ))}
              </select>
            </div>

            <ToggleField
              label="Status MKS"
              value={mksForm.aktif}
              onChange={(value) =>
                setMksForm((prev) => ({
                  ...prev,
                  aktif: value,
                }))
              }
            />

            <ModalActions
              onCancel={() => setShowMksModal(false)}
              onSave={handleSaveMks}
              saving={saving}
            />
          </div>
        </Modal>

        {/* ======================================================
            MODAL MKA
        ====================================================== */}

        <Modal
          open={showMkaModal}
          title={editingMka ? "Edit MKA" : "Tambah MKA"}
          onClose={() => setShowMkaModal(false)}
        >
          <div className="space-y-4">
            <FormField
              label="Nama"
              value={mkaForm.nama}
              onChange={(value) =>
                setMkaForm((prev) => ({
                  ...prev,
                  nama: value,
                }))
              }
              required
            />

            <FormField
              label="NIP"
              value={mkaForm.nip}
              onChange={(value) =>
                setMkaForm((prev) => ({
                  ...prev,
                  nip: value,
                }))
              }
            />

            <FormField
              label="Jabatan"
              value={mkaForm.jabatan}
              onChange={(value) =>
                setMkaForm((prev) => ({
                  ...prev,
                  jabatan: value,
                }))
              }
              required
            />

            <ToggleField
              label="Status MKA"
              value={mkaForm.aktif}
              onChange={(value) =>
                setMkaForm((prev) => ({
                  ...prev,
                  aktif: value,
                }))
              }
            />

            <ModalActions
              onCancel={() => setShowMkaModal(false)}
              onSave={handleSaveMka}
              saving={saving}
            />
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

/* ================================================================
   COMPONENTS
================================================================ */

function ResponsiveTable({ headers, desktopRows, mobileCards }) {
  return (
    <>
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                {headers.map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>{desktopRows}</tbody>
          </table>
        </div>
      </div>

      <div className="divide-y divide-gray-100 md:hidden">{mobileCards}</div>
    </>
  );
}

function CompactMobileCard({ title, subtitle, status, actions, children }) {
  return (
    <div className="space-y-2.5 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">
            {showValue(title)}
          </div>

          <div className="mt-0.5 truncate text-xs text-gray-500">
            {showValue(subtitle)}
          </div>
        </div>

        <StatusBadge aktif={status} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">{children}</div>

      <div className="flex justify-end gap-1 pt-0.5">{actions}</div>
    </div>
  );
}

function CompactInfo({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </div>

      <div className="truncate text-xs text-gray-700">{showValue(value)}</div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </div>

      <div className="mt-0.5 truncate text-xs font-medium text-gray-800 sm:text-sm">
        {showValue(value)}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}

        <span className="truncate text-[10px] font-medium uppercase tracking-wide sm:text-xs">
          {label}
        </span>
      </div>

      <div className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
        {value}
      </div>
    </div>
  );
}

function SectionCard({ icon, title, description, action, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 shrink-0 text-gray-600">{icon}</div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
              {title}
            </h2>

            {description && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500 sm:text-xs">
                {description}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function EmptyTable({ text }) {
  return (
    <div className="px-4 py-8 text-center text-sm text-gray-400">{text}</div>
  );
}

function Td({ children, strong = false }) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2.5 ${
        strong ? "font-medium text-gray-900" : "text-gray-600"
      }`}
    >
      {children}
    </td>
  );
}

function StatusBadge({ aktif }) {
  return aktif ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
      Nonaktif
    </span>
  );
}

function IconActionButton({ icon, title, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
        danger
          ? "border-red-100 bg-white text-red-500 hover:bg-red-50"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {icon}
    </button>
  );
}

function FormField({ label, value, onChange, required = false }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      />
    </div>
  );
}

function ToggleField({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>

      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition ${
          value ? "bg-emerald-500" : "bg-gray-300"
        }`}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3.5">
          <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSave, saving }) {
  return (
    <div className="flex gap-2 border-t border-gray-100 pt-4">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Batal
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
  );
}
