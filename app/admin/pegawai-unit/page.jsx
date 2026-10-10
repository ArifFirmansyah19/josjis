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
const showValue = (value) =>
  value === null || value === undefined || value === "" ? "-" : value;
const formatJenis = (jenis) => {
  const map = {
    BRANCH_MANAGER: "Branch Manager",
    MKS: "MKS",
    PENGAWAS: "Pengawas",
    MKA: "MKA",
  };
  return map[jenis] || jenis || "-";
};
export default function MasterPegawaiPage() {
  const { activeUnit } = useUnit();
  const [unitData, setUnitData] = useState(null);
  const [pegawai, setPegawai] = useState([]);
  const [mks, setMks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showPegawaiModal, setShowPegawaiModal] = useState(false);
  const [showMksModal, setShowMksModal] = useState(false);
  const [showMkaModal, setShowMkaModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingPegawai, setEditingPegawai] = useState(null);
  const [editingMks, setEditingMks] = useState(null);
  const [detailPegawai, setDetailPegawai] = useState(null);
  const [unitForm, setUnitForm] = useState({
    nama_unit: "",
    kode_unit: "",
    kode_kawasan: "",
    kode_legacy: "",
  });
  const [pegawaiForm, setPegawaiForm] = useState({
    nama: "",
    nip: "",
    jabatan: "",
    jenis_pegawai: "PENGAWAS",
    no_hp: "",
    email: "",
    aktif: true,
  });
  const [mksForm, setMksForm] = useState({
    nama: "",
    nip: "",
    jabatan: "MKS",
    no_hp: "",
    email: "",
    aktif: true,
  });
  const [mkaForm, setMkaForm] = useState({
    nama: "",
    nip: "",
    jabatan: "MKA",
    no_hp: "",
    email: "",
    aktif: true,
  });
  useEffect(() => {
    loadData();
  }, [activeUnit?.value]);
  async function loadData() {
    if (!activeUnit?.value) {
      setUnitData(null);
      setPegawai([]);
      setMks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: unit, error: unitError } = await supabase
        .from("unit")
        .select("*")
        .eq("kode_unit", activeUnit.value)
        .maybeSingle();
      if (unitError) throw unitError;
      if (!unit) {
        setUnitData(null);
        setPegawai([]);
        setMks([]);
        setError(`Unit ${activeUnit.value} tidak ditemukan.`);
        return;
      }
      setUnitData(unit);
      const { data: unitPegawai, error: pegawaiError } = await supabase
        .from("pegawai")
        .select("*")
        .eq("unit_id", unit.id)
        .order("nama", { ascending: true });
      if (pegawaiError) throw pegawaiError;
      const { data: branchManagers, error: bmError } = await supabase
        .from("pegawai")
        .select("*")
        .eq("jenis_pegawai", "BRANCH_MANAGER")
        .order("nama", { ascending: true });
      if (bmError) throw bmError;
      const { data: mksData, error: mksError } = await supabase
        .from("mks")
        .select("*")
        .order("id", { ascending: true });
      if (mksError) throw mksError;
      setPegawai([...(branchManagers || []), ...(unitPegawai || [])]);
      setMks(mksData || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal mengambil data pegawai.");
    } finally {
      setLoading(false);
    }
  }
  const branchManagers = useMemo(
    () => pegawai.filter((p) => p.jenis_pegawai === "BRANCH_MANAGER"),
    [pegawai],
  );
  const currentUnitPegawai = useMemo(
    () => pegawai.filter((p) => p.jenis_pegawai !== "BRANCH_MANAGER"),
    [pegawai],
  );
  const pengawasList = useMemo(
    () => currentUnitPegawai.filter((p) => p.jenis_pegawai === "PENGAWAS"),
    [currentUnitPegawai],
  );
  const mkaList = useMemo(
    () => currentUnitPegawai.filter((p) => p.jenis_pegawai === "MKA"),
    [currentUnitPegawai],
  );
  const mksPegawaiList = useMemo(
    () => currentUnitPegawai.filter((p) => p.jenis_pegawai === "MKS"),
    [currentUnitPegawai],
  );
  const pegawaiById = useMemo(() => {
    const map = {};
    pegawai.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [pegawai]);
  const mksList = useMemo(
    () =>
      mks
        .map((item) => ({
          ...item,
          pegawai: pegawaiById[item.pegawai_id] || null,
        }))
        .filter((item) => item.pegawai),
    [mks, pegawaiById],
  );
  function openUnitEdit() {
    if (!unitData) return;
    setUnitForm({
      nama_unit: unitData.nama_unit || "",
      kode_unit: unitData.kode_unit || "",
      kode_kawasan: unitData.kode_kawasan || "",
      kode_legacy: unitData.kode_legacy || "",
    });
    setShowUnitModal(true);
  }
  function openPegawaiEdit(item) {
    setEditingPegawai(item);
    setPegawaiForm({
      nama: item.nama || "",
      nip: item.nip || "",
      jabatan: item.jabatan || "",
      jenis_pegawai: item.jenis_pegawai || "PENGAWAS",
      no_hp: item.no_hp || "",
      email: item.email || "",
      aktif: item.aktif !== false,
    });
    setShowPegawaiModal(true);
  }
  function openMksEdit(item) {
    const p = item.pegawai;
    if (!p) return;
    setEditingMks(item);
    setMksForm({
      nama: p.nama || "",
      nip: p.nip || "",
      jabatan: p.jabatan || "MKS",
      no_hp: p.no_hp || "",
      email: p.email || "",
      aktif: p.aktif !== false,
    });
    setShowMksModal(true);
  }
  function openMkaAdd() {
    setEditingPegawai(null);
    setMkaForm({
      nama: "",
      nip: "",
      jabatan: "MKA",
      no_hp: "",
      email: "",
      aktif: true,
    });
    setShowMkaModal(true);
  }
  function openMkaEdit(item) {
    setEditingPegawai(item);
    setMkaForm({
      nama: item.nama || "",
      nip: item.nip || "",
      jabatan: item.jabatan || "MKA",
      no_hp: item.no_hp || "",
      email: item.email || "",
      aktif: item.aktif !== false,
    });
    setShowMkaModal(true);
  }
  function openDetail(item) {
    setDetailPegawai(item);
    setShowDetailModal(true);
  }
  async function saveUnit() {
    if (!unitData?.id) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await supabase
        .from("unit")
        .update({
          nama_unit: unitForm.nama_unit.trim(),
          kode_unit: unitForm.kode_unit.trim(),
          kode_kawasan: unitForm.kode_kawasan.trim(),
          kode_legacy: unitForm.kode_legacy.trim() || null,
        })
        .eq("id", unitData.id);
      if (updateError) throw updateError;
      setSuccess("Data unit berhasil diperbarui.");
      setShowUnitModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan data unit.");
    } finally {
      setSaving(false);
    }
  }
  async function savePegawai() {
    if (!editingPegawai?.id) return;
    if (!pegawaiForm.nama.trim()) {
      setError("Nama pegawai wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await supabase
        .from("pegawai")
        .update({
          nama: pegawaiForm.nama.trim(),
          nip: pegawaiForm.nip.trim() || null,
          jabatan: pegawaiForm.jabatan.trim() || null,
          jenis_pegawai: pegawaiForm.jenis_pegawai,
          no_hp: pegawaiForm.no_hp.trim() || null,
          email: pegawaiForm.email.trim() || null,
          aktif: pegawaiForm.aktif,
        })
        .eq("id", editingPegawai.id);
      if (updateError) throw updateError;
      setSuccess("Data pegawai berhasil diperbarui.");
      setShowPegawaiModal(false);
      setEditingPegawai(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan data pegawai.");
    } finally {
      setSaving(false);
    }
  }
  async function saveMks() {
    if (!editingMks?.pegawai?.id) return;
    if (!mksForm.nama.trim()) {
      setError("Nama MKS wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { error: pegawaiError } = await supabase
        .from("pegawai")
        .update({
          nama: mksForm.nama.trim(),
          nip: mksForm.nip.trim() || null,
          jabatan: mksForm.jabatan.trim() || "MKS",
          jenis_pegawai: "MKS",
          no_hp: mksForm.no_hp.trim() || null,
          email: mksForm.email.trim() || null,
          aktif: mksForm.aktif,
        })
        .eq("id", editingMks.pegawai.id);
      if (pegawaiError) throw pegawaiError;
      const { error: mksError } = await supabase
        .from("mks")
        .update({
          pegawai_id: editingMks.pegawai.id,
        })
        .eq("id", editingMks.id);
      if (mksError) throw mksError;
      setSuccess("Data MKS berhasil diperbarui.");
      setShowMksModal(false);
      setEditingMks(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan data MKS.");
    } finally {
      setSaving(false);
    }
  }
  async function saveMka() {
    if (!unitData?.id) {
      setError("Unit aktif tidak ditemukan.");
      return;
    }
    if (!mkaForm.nama.trim()) {
      setError("Nama MKA wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (editingPegawai?.id) {
        const { error: updateError } = await supabase
          .from("pegawai")
          .update({
            nama: mkaForm.nama.trim(),
            nip: mkaForm.nip.trim() || null,
            jabatan: mkaForm.jabatan.trim() || "MKA",
            jenis_pegawai: "MKA",
            no_hp: mkaForm.no_hp.trim() || null,
            email: mkaForm.email.trim() || null,
            aktif: mkaForm.aktif,
          })
          .eq("id", editingPegawai.id);
        if (updateError) throw updateError;
        setSuccess("Data MKA berhasil diperbarui.");
      } else {
        const { error: insertError } = await supabase.from("pegawai").insert({
          nama: mkaForm.nama.trim(),
          nip: mkaForm.nip.trim() || null,
          jabatan: mkaForm.jabatan.trim() || "MKA",
          jenis_pegawai: "MKA",
          no_hp: mkaForm.no_hp.trim() || null,
          email: mkaForm.email.trim() || null,
          cabang_id: unitData.cabang_id,
          unit_id: unitData.id,
          aktif: mkaForm.aktif,
        });
        if (insertError) throw insertError;
        setSuccess("MKA berhasil ditambahkan.");
      }
      setShowMkaModal(false);
      setEditingPegawai(null);
      setMkaForm({
        nama: "",
        nip: "",
        jabatan: "MKA",
        no_hp: "",
        email: "",
        aktif: true,
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan MKA.");
    } finally {
      setSaving(false);
    }
  }
  async function toggleAktif(item) {
    if (!item?.id) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await supabase
        .from("pegawai")
        .update({ aktif: !item.aktif })
        .eq("id", item.id);
      if (updateError) throw updateError;
      setSuccess(`Status ${item.nama} berhasil diubah.`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal mengubah status pegawai.");
    } finally {
      setSaving(false);
    }
  }
  async function deletePegawai(item) {
    if (!item?.id) return;
    const ok = window.confirm(`Hapus pegawai "${item.nama}"?`);
    if (!ok) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
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
      setSuccess(`Pegawai ${item.nama} berhasil dihapus.`);
      setShowDetailModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menghapus pegawai.");
    } finally {
      setSaving(false);
    }
  }
  if (loading) {
    return (
      <DashboardLayout>
        <Loading />
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Master Pegawai</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola data pegawai berdasarkan unit aktif.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading || saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
        {error && (
          <Alert type="error" message={error} onClose={() => setError("")} />
        )}
        {success && (
          <Alert
            type="success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}
        {!unitData ? (
          <EmptyState
            title="Unit tidak ditemukan"
            description="Pilih unit JKK1 atau JKK2 terlebih dahulu."
          />
        ) : (
          <>
            <SectionCard
              title="Informasi Unit"
              icon={<MapPin size={18} />}
              action={
                <button
                  type="button"
                  onClick={openUnitEdit}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil size={15} />
                  Edit Unit
                </button>
              }
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <InfoBox
                  label="Kode Kawasan"
                  value={unitData.kode_kawasan}
                  highlight
                />
                <InfoBox label="Nama Unit" value={unitData.nama_unit} />
                <InfoBox label="Kode Unit" value={unitData.kode_unit} />
                <InfoBox label="Kode Legacy" value={unitData.kode_legacy} />
              </div>
            </SectionCard>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <SummaryCard
                icon={<ShieldCheck size={19} />}
                label="Branch Manager"
                value={branchManagers.length}
              />
              <SummaryCard
                icon={<UserCog size={19} />}
                label="Pengawas"
                value={pengawasList.length}
              />
              <SummaryCard
                icon={<BriefcaseBusiness size={19} />}
                label="MKA"
                value={mkaList.length}
              />
              <SummaryCard
                icon={<KeyRound size={19} />}
                label="MKS"
                value={mksPegawaiList.length}
              />
            </div>
            <EmployeeSection
              title="Branch Manager"
              icon={<ShieldCheck size={18} />}
              data={branchManagers}
              onDetail={openDetail}
              onEdit={openPegawaiEdit}
              onDelete={deletePegawai}
              onToggle={toggleAktif}
              showUnit={false}
            />
            <EmployeeSection
              title="Pengawas"
              icon={<UserCog size={18} />}
              data={pengawasList}
              onDetail={openDetail}
              onEdit={openPegawaiEdit}
              onDelete={deletePegawai}
              onToggle={toggleAktif}
              showUnit={false}
            />
            <EmployeeSection
              title="MKA"
              icon={<BriefcaseBusiness size={18} />}
              data={mkaList}
              onAdd={openMkaAdd}
              onDetail={openDetail}
              onEdit={openMkaEdit}
              onDelete={deletePegawai}
              onToggle={toggleAktif}
              showUnit={false}
            />
            <MksSection
              data={mksList}
              onDetail={openDetail}
              onEdit={openMksEdit}
              onDelete={deletePegawai}
              onToggle={toggleAktif}
            />
          </>
        )}
      </div>
      {showUnitModal && (
        <Modal title="Edit Unit" onClose={() => setShowUnitModal(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Nama Unit"
              value={unitForm.nama_unit}
              onChange={(v) => setUnitForm({ ...unitForm, nama_unit: v })}
            />
            <FormField
              label="Kode Unit"
              value={unitForm.kode_unit}
              onChange={(v) => setUnitForm({ ...unitForm, kode_unit: v })}
            />
            <FormField
              label="Kode Kawasan"
              value={unitForm.kode_kawasan}
              onChange={(v) => setUnitForm({ ...unitForm, kode_kawasan: v })}
            />
            <FormField
              label="Kode Legacy"
              value={unitForm.kode_legacy}
              onChange={(v) => setUnitForm({ ...unitForm, kode_legacy: v })}
            />
          </div>
          <ModalActions
            saving={saving}
            onCancel={() => setShowUnitModal(false)}
            onSave={saveUnit}
          />
        </Modal>
      )}
      {showPegawaiModal && (
        <Modal title="Edit Pegawai" onClose={() => setShowPegawaiModal(false)}>
          <PegawaiForm form={pegawaiForm} setForm={setPegawaiForm} />
          <ModalActions
            saving={saving}
            onCancel={() => setShowPegawaiModal(false)}
            onSave={savePegawai}
          />
        </Modal>
      )}
      {showMksModal && (
        <Modal title="Edit MKS" onClose={() => setShowMksModal(false)}>
          <PegawaiContactForm form={mksForm} setForm={setMksForm} />
          <ModalActions
            saving={saving}
            onCancel={() => setShowMksModal(false)}
            onSave={saveMks}
          />
        </Modal>
      )}
      {showMkaModal && (
        <Modal
          title={editingPegawai ? "Edit MKA" : "Tambah MKA"}
          onClose={() => setShowMkaModal(false)}
        >
          <PegawaiContactForm form={mkaForm} setForm={setMkaForm} />
          <ModalActions
            saving={saving}
            onCancel={() => setShowMkaModal(false)}
            onSave={saveMka}
          />
        </Modal>
      )}
      {showDetailModal && detailPegawai && (
        <Modal title="Detail Pegawai" onClose={() => setShowDetailModal(false)}>
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-col gap-1">
                <div className="text-lg font-bold text-slate-900">
                  {showValue(detailPegawai.nama)}
                </div>
                <div className="text-sm text-slate-500">
                  {formatJenis(detailPegawai.jenis_pegawai)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Nama" value={detailPegawai.nama} />
              <DetailItem label="NIP" value={detailPegawai.nip} />
              <DetailItem label="Jabatan" value={detailPegawai.jabatan} />
              <DetailItem
                label="Jenis Pegawai"
                value={formatJenis(detailPegawai.jenis_pegawai)}
              />
              <DetailItem
                label="Nomor HP / WhatsApp"
                value={detailPegawai.no_hp}
              />
              <DetailItem label="Email" value={detailPegawai.email} />
              <DetailItem
                label="Status"
                value={detailPegawai.aktif ? "Aktif" : "Nonaktif"}
              />
              <DetailItem label="Unit ID" value={detailPegawai.unit_id} />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => deletePegawai(detailPegawai)}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Hapus
              </button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => toggleAktif(detailPegawai)}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Power size={16} />
                  {detailPegawai.aktif ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    if (detailPegawai.jenis_pegawai === "MKA")
                      openMkaEdit(detailPegawai);
                    else if (detailPegawai.jenis_pegawai === "MKS") {
                      const found = mksList.find(
                        (x) => x.pegawai_id === detailPegawai.id,
                      );
                      if (found) openMksEdit(found);
                      else openPegawaiEdit(detailPegawai);
                    } else openPegawaiEdit(detailPegawai);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
function EmployeeSection({
  title,
  icon,
  data,
  onAdd,
  onDetail,
  onEdit,
  onDelete,
  onToggle,
  showUnit,
}) {
  return (
    <SectionCard
      title={title}
      icon={icon}
      action={
        onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus size={16} />
            Tambah
          </button>
        ) : null
      }
    >
      <ResponsiveTable
        data={data}
        showUnit={showUnit}
        onDetail={onDetail}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggle={onToggle}
      />
    </SectionCard>
  );
}
function MksSection({ data, onDetail, onEdit, onDelete, onToggle }) {
  const rows = data.map((item) => item.pegawai).filter(Boolean);
  return (
    <SectionCard title="MKS" icon={<KeyRound size={18} />}>
      <ResponsiveTable
        data={rows}
        onDetail={onDetail}
        onEdit={(item) => {
          const found = data.find((x) => x.pegawai_id === item.id);
          if (found) onEdit(found);
        }}
        onDelete={onDelete}
        onToggle={onToggle}
      />
    </SectionCard>
  );
}
function ResponsiveTable({ data, onDetail, onEdit, onDelete, onToggle }) {
  if (!data.length) {
    return (
      <EmptyState
        title="Belum ada data"
        description="Belum ada pegawai pada bagian ini."
        compact
      />
    );
  }
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">NIP</th>
              <th className="px-4 py-3">Jabatan</th>
              <th className="px-4 py-3">No. HP</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onDetail(item)}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <Td>{showValue(item.nama)}</Td>
                <Td>{showValue(item.nip)}</Td>
                <Td>{showValue(item.jabatan)}</Td>
                <Td>{showValue(item.no_hp)}</Td>
                <Td>{showValue(item.email)}</Td>
                <Td>
                  <StatusBadge aktif={item.aktif} />
                </Td>
                <Td align="right">
                  <ActionButtons
                    item={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {data.map((item) => (
          <CompactMobileCard
            key={item.id}
            item={item}
            onDetail={onDetail}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
          />
        ))}
      </div>
    </>
  );
}
function CompactMobileCard({ item, onDetail, onEdit, onDelete, onToggle }) {
  return (
    <div
      onClick={() => onDetail(item)}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-bold text-slate-900">
            {showValue(item.nama)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {showValue(item.jabatan)}
          </div>
        </div>
        <StatusBadge aktif={item.aktif} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
        <div>
          <span className="text-slate-400">No. HP: </span>
          <span className="font-medium text-slate-700">
            {showValue(item.no_hp)}
          </span>
        </div>
        <div className="truncate">
          <span className="text-slate-400">Email: </span>
          <span className="font-medium text-slate-700">
            {showValue(item.email)}
          </span>
        </div>
      </div>
      <div
        className="mt-3 border-t border-slate-100 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <ActionButtons
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}
function ActionButtons({ item, onEdit, onDelete, onToggle }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(item);
        }}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        title={item.aktif ? "Nonaktifkan" : "Aktifkan"}
      >
        <Power size={16} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(item);
        }}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        title="Edit"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item);
        }}
        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
        title="Hapus"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
function PegawaiForm({ form, setForm }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        label="Nama"
        value={form.nama}
        onChange={(v) => setForm({ ...form, nama: v })}
        required
      />
      <FormField
        label="NIP"
        value={form.nip}
        onChange={(v) => setForm({ ...form, nip: v })}
      />
      <FormField
        label="Jabatan"
        value={form.jabatan}
        onChange={(v) => setForm({ ...form, jabatan: v })}
      />
      <FormField
        label="Nomor HP / WhatsApp"
        value={form.no_hp}
        onChange={(v) => setForm({ ...form, no_hp: v })}
        type="tel"
      />
      <FormField
        label="Email"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
        type="email"
      />
      <ToggleField
        label="Aktif"
        checked={form.aktif}
        onChange={(v) => setForm({ ...form, aktif: v })}
      />
    </div>
  );
}
function PegawaiContactForm({ form, setForm }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        label="Nama"
        value={form.nama}
        onChange={(v) => setForm({ ...form, nama: v })}
        required
      />
      <FormField
        label="NIP"
        value={form.nip}
        onChange={(v) => setForm({ ...form, nip: v })}
      />
      <FormField
        label="Jabatan"
        value={form.jabatan}
        onChange={(v) => setForm({ ...form, jabatan: v })}
      />
      <FormField
        label="Nomor HP / WhatsApp"
        value={form.no_hp}
        onChange={(v) => setForm({ ...form, no_hp: v })}
        type="tel"
      />
      <FormField
        label="Email"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
        type="email"
      />
      <ToggleField
        label="Aktif"
        checked={form.aktif}
        onChange={(v) => setForm({ ...form, aktif: v })}
      />
    </div>
  );
}
function DetailItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium text-slate-800">
        {showValue(value)}
      </div>
    </div>
  );
}
function InfoBox({ label, value, highlight }) {
  return (
    <div
      className={`rounded-xl border p-4 ${highlight ? "border-slate-300 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}
    >
      <div
        className={`text-xs font-semibold uppercase tracking-wide ${highlight ? "text-slate-300" : "text-slate-400"}`}
      >
        {label}
      </div>
      <div
        className={`mt-1 break-words text-sm font-bold ${highlight ? "text-white" : "text-slate-900"}`}
      >
        {showValue(value)}
      </div>
    </div>
  );
}
function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
function SectionCard({ title, icon, action, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          {icon}
          {title}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}
function Td({ children, align }) {
  return (
    <td
      className={`px-4 py-3 text-slate-700 ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </td>
  );
}
function StatusBadge({ aktif }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${aktif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
    >
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  );
}
function FormField({ label, value, onChange, type = "text", required }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}
function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </label>
  );
}
function ModalActions({ saving, onCancel, onSave }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Batal
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        <Save size={16} />
        {saving ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function Alert({ type, message, onClose }) {
  const success = type === "success";
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
    >
      <div>{message}</div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 opacity-70 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}
function Loading() {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <RefreshCw size={17} className="animate-spin" />
        Memuat data pegawai...
      </div>
    </div>
  );
}
function EmptyState({ title, description, compact }) {
  return (
    <div
      className={`text-center ${compact ? "px-4 py-8" : "rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12"}`}
    >
      <div className="font-semibold text-slate-700">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>
    </div>
  );
}
