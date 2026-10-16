"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Search,
  Users,
  Phone,
  Mail,
  IdCard,
  Building2,
  Eye,
  UserRound,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  LayoutGrid,
  Filter,
  Sparkles,
  BadgeCheck,
  AtSign,
} from "lucide-react";

// ============================================================
// UTILITAS
// ============================================================

const showValue = (value) =>
  value === null || value === undefined || value === "" ? "-" : value;

const formatJenis = (jenis) => {
  const map = {
    BRANCH_MANAGER: "Branch Manager",
    MKS: "MKS",
    PENGAWAS: "Pengawas",
    MKA: "MKA",
    MBCM: "MBCM",
  };

  return map[jenis] || jenis || "-";
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const CATEGORIES = [
  { id: "SEMUA", label: "Semua Pegawai", icon: LayoutGrid },
  { id: "BRANCH_MANAGER", label: "Branch Manager", icon: ShieldCheck },
  { id: "MBCM", label: "MBCM", icon: UserCog },
  { id: "PENGAWAS", label: "Pengawas", icon: Users },
  { id: "MKA", label: "MKA", icon: BriefcaseBusiness },
  { id: "MKS", label: "MKS", icon: KeyRound },
];

const categoryTheme = {
  BRANCH_MANAGER: {
    icon: ShieldCheck,
    color: "blue",
    badge: "bg-blue-50 text-blue-700",
    iconBox: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
    top: "from-blue-500 to-indigo-600",
  },
  MBCM: {
    icon: UserCog,
    color: "violet",
    badge: "bg-violet-50 text-violet-700",
    iconBox: "bg-gradient-to-br from-violet-500 to-purple-600 text-white",
    top: "from-violet-500 to-purple-600",
  },
  PENGAWAS: {
    icon: Users,
    color: "teal",
    badge: "bg-teal-50 text-teal-700",
    iconBox: "bg-gradient-to-br from-teal-400 to-emerald-600 text-white",
    top: "from-teal-400 to-emerald-600",
  },
  MKA: {
    icon: BriefcaseBusiness,
    color: "amber",
    badge: "bg-amber-50 text-amber-700",
    iconBox: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
    top: "from-amber-400 to-orange-500",
  },
  MKS: {
    icon: KeyRound,
    color: "rose",
    badge: "bg-rose-50 text-rose-700",
    iconBox: "bg-gradient-to-br from-rose-400 to-pink-600 text-white",
    top: "from-rose-400 to-pink-600",
  },
};

// ============================================================
// HALAMAN UTAMA
// ============================================================

export default function MasterPegawaiPage() {
  const { activeUnit } = useUnit();

  const [unitData, setUnitData] = useState(null);
  const [pegawai, setPegawai] = useState([]);
  const [mks, setMks] = useState([]);
  const [mbcm, setMbcm] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("SEMUA");
  const [statusFilter, setStatusFilter] = useState("SEMUA");

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showPegawaiModal, setShowPegawaiModal] = useState(false);
  const [showMksModal, setShowMksModal] = useState(false);
  const [showMkaModal, setShowMkaModal] = useState(false);
  const [showMbcmModal, setShowMbcmModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [editingPegawai, setEditingPegawai] = useState(null);
  const [editingMks, setEditingMks] = useState(null);
  const [editingMbcm, setEditingMbcm] = useState(null);
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

  const [mbcmForm, setMbcmForm] = useState({
    nama: "",
    nip: "",
    jabatan: "MBCM",
    no_hp: "",
    status: "Aktif",
  });

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // MBCM adalah data global, tidak menggunakan unit_id.
      // Jika akun tidak memiliki akses MBCM, bagian ini tidak
      // boleh menghentikan pemuatan data pegawai unit.
      const { data: mbcmData, error: mbcmError } = await supabase
        .from("josjis_pegawai_pengawas")
        .select("*")
        .order("nama", { ascending: true });

      if (mbcmError) {
        console.warn("Data MBCM tidak dapat dimuat:", mbcmError.message);
        setMbcm([]);
      } else {
        setMbcm(mbcmData || []);
      }

      if (!activeUnit?.value) {
        setUnitData(null);
        setPegawai([]);
        setMks([]);
        return;
      }

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

      const [
        { data: unitPegawai, error: pegawaiError },
        { data: branchManagers, error: bmError },
        { data: mksData, error: mksError },
      ] = await Promise.all([
        supabase
          .from("pegawai")
          .select("*")
          .eq("unit_id", unit.id)
          .order("nama", { ascending: true }),

        supabase
          .from("pegawai")
          .select("*")
          .eq("jenis_pegawai", "BRANCH_MANAGER")
          .order("nama", { ascending: true }),

        supabase.from("mks").select("*").order("id", { ascending: true }),
      ]);

      if (pegawaiError) throw pegawaiError;
      if (bmError) throw bmError;
      if (mksError) throw mksError;

      const combined = [
        ...(branchManagers || []),
        ...(unitPegawai || []).filter(
          (p) => p.jenis_pegawai !== "BRANCH_MANAGER",
        ),
      ];

      const uniquePegawai = [
        ...new Map(combined.map((p) => [p.id, p])).values(),
      ];

      setPegawai(uniquePegawai);
      setMks(mksData || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal mengambil data pegawai.");
    } finally {
      setLoading(false);
    }
  }, [activeUnit?.value]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================================
  // DATA TURUNAN
  // ==========================================================

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

  const pegawaiById = useMemo(
    () => Object.fromEntries(pegawai.map((p) => [p.id, p])),
    [pegawai],
  );

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

  const mbcmList = useMemo(
    () =>
      mbcm.map((item) => ({
        ...item,
        jenis_pegawai: "MBCM",
        aktif: item.status === "Aktif",
        email: null,
        _isMbcm: true,
      })),
    [mbcm],
  );

  const allEmployees = useMemo(() => {
    const mksCards = mksList.map((item) => ({
      ...item.pegawai,
      _mksRecord: item,
    }));

    return [
      ...branchManagers,
      ...mbcmList,
      ...pengawasList,
      ...mkaList,
      ...mksCards,
    ];
  }, [branchManagers, mbcmList, pengawasList, mkaList, mksList]);

  const categoryCounts = useMemo(
    () => ({
      SEMUA: allEmployees.length,
      BRANCH_MANAGER: branchManagers.length,
      MBCM: mbcmList.length,
      PENGAWAS: pengawasList.length,
      MKA: mkaList.length,
      MKS: mksPegawaiList.length,
    }),
    [
      allEmployees.length,
      branchManagers.length,
      mbcmList.length,
      pengawasList.length,
      mkaList.length,
      mksPegawaiList.length,
    ],
  );

  const activeCount = allEmployees.filter((item) =>
    item._isMbcm ? item.status === "Aktif" : item.aktif !== false,
  ).length;

  const inactiveCount = allEmployees.length - activeCount;

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return allEmployees.filter((item) => {
      const category = item.jenis_pegawai || "";
      const aktif = item._isMbcm
        ? item.status === "Aktif"
        : item.aktif !== false;

      const matchCategory =
        categoryFilter === "SEMUA" || category === categoryFilter;

      const matchStatus =
        statusFilter === "SEMUA" ||
        (statusFilter === "AKTIF" && aktif) ||
        (statusFilter === "NONAKTIF" && !aktif);

      const matchSearch =
        !keyword ||
        [item.nama, item.nip, item.jabatan, item.no_hp, item.email].some(
          (value) =>
            String(value || "")
              .toLowerCase()
              .includes(keyword),
        );

      return matchCategory && matchStatus && matchSearch;
    });
  }, [allEmployees, search, categoryFilter, statusFilter]);

  // ==========================================================
  // UNIT
  // ==========================================================

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

      setShowUnitModal(false);
      setSuccess("Data unit berhasil diperbarui.");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan data unit.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // PEGAWAI UMUM
  // ==========================================================

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

      setShowPegawaiModal(false);
      setEditingPegawai(null);
      setSuccess("Data pegawai berhasil diperbarui.");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan data pegawai.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // MKS
  // ==========================================================

  function openMksEdit(item) {
    const p = item?.pegawai;
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
      const { error: updateError } = await supabase
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

      if (updateError) throw updateError;

      setShowMksModal(false);
      setEditingMks(null);
      setSuccess("Data MKS berhasil diperbarui.");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan data MKS.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // MKA
  // ==========================================================

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
      const payload = {
        nama: mkaForm.nama.trim(),
        nip: mkaForm.nip.trim() || null,
        jabatan: mkaForm.jabatan.trim() || "MKA",
        jenis_pegawai: "MKA",
        no_hp: mkaForm.no_hp.trim() || null,
        email: mkaForm.email.trim() || null,
        aktif: mkaForm.aktif,
      };

      if (editingPegawai?.id) {
        const { error: updateError } = await supabase
          .from("pegawai")
          .update(payload)
          .eq("id", editingPegawai.id);

        if (updateError) throw updateError;
        setSuccess("Data MKA berhasil diperbarui.");
      } else {
        const { error: insertError } = await supabase.from("pegawai").insert({
          ...payload,
          cabang_id: unitData.cabang_id,
          unit_id: unitData.id,
        });

        if (insertError) throw insertError;
        setSuccess("MKA berhasil ditambahkan.");
      }

      setShowMkaModal(false);
      setEditingPegawai(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan MKA.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // MBCM GLOBAL
  // ==========================================================

  function openMbcmAdd() {
    setEditingMbcm(null);

    setMbcmForm({
      nama: "",
      nip: "",
      jabatan: "MBCM",
      no_hp: "",
      status: "Aktif",
    });

    setShowMbcmModal(true);
  }

  function openMbcmEdit(item) {
    setEditingMbcm(item);

    setMbcmForm({
      nama: item.nama || "",
      nip: item.nip || "",
      jabatan: item.jabatan || "MBCM",
      no_hp: item.no_hp || "",
      status: item.status || "Aktif",
    });

    setShowMbcmModal(true);
  }

  async function saveMbcm() {
    if (!mbcmForm.nama.trim()) {
      setError("Nama MBCM wajib diisi.");
      return;
    }

    if (!mbcmForm.nip.trim()) {
      setError("NIP MBCM wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        nama: mbcmForm.nama.trim(),
        nip: mbcmForm.nip.trim(),
        jabatan: mbcmForm.jabatan.trim() || "MBCM",
        no_hp: mbcmForm.no_hp.trim() || null,
        status: mbcmForm.status,
        updated_at: new Date().toISOString(),
      };

      if (editingMbcm?.id) {
        const { error: updateError } = await supabase
          .from("josjis_pegawai_pengawas")
          .update(payload)
          .eq("id", editingMbcm.id);

        if (updateError) throw updateError;
        setSuccess("Data MBCM berhasil diperbarui.");
      } else {
        const { error: insertError } = await supabase
          .from("josjis_pegawai_pengawas")
          .insert(payload);

        if (insertError) throw insertError;
        setSuccess("Data MBCM berhasil ditambahkan.");
      }

      setShowMbcmModal(false);
      setEditingMbcm(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menyimpan data MBCM.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMbcm(item) {
    if (!item?.id) return;

    const statusBaru = item.status === "Aktif" ? "Tidak Aktif" : "Aktif";

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("josjis_pegawai_pengawas")
        .update({
          status: statusBaru,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      setShowDetailModal(false);
      setSuccess(`Status MBCM diubah menjadi ${statusBaru}.`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal mengubah status MBCM.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMbcm(item) {
    if (!item?.id) return;

    const ok = window.confirm(
      `Hapus data MBCM "${item.nama}" secara permanen?`,
    );

    if (!ok) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("josjis_pegawai_pengawas")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

      setSuccess(`Data MBCM ${item.nama} berhasil dihapus.`);
      setShowDetailModal(false);
      setShowMbcmModal(false);
      setEditingMbcm(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menghapus data MBCM.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // DETAIL, STATUS, DAN HAPUS
  // ==========================================================

  function openDetail(item) {
    setDetailPegawai(item);
    setShowDetailModal(true);
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

      setShowDetailModal(false);
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

      setShowDetailModal(false);
      setSuccess(`Pegawai ${item.nama} berhasil dihapus.`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal menghapus pegawai.");
    } finally {
      setSaving(false);
    }
  }

  function handleEditDetail(item) {
    setShowDetailModal(false);

    if (item._isMbcm) {
      openMbcmEdit(item);
      return;
    }

    if (item.jenis_pegawai === "MKA") {
      openMkaEdit(item);
      return;
    }

    if (item.jenis_pegawai === "MKS") {
      const found =
        item._mksRecord || mksList.find((x) => x.pegawai_id === item.id);

      if (found) {
        openMksEdit(found);
      } else {
        openPegawaiEdit(item);
      }

      return;
    }

    openPegawaiEdit(item);
  }

  function handleCardEdit(item) {
    if (item._isMbcm) {
      openMbcmEdit(item);
    } else if (item.jenis_pegawai === "MKA") {
      openMkaEdit(item);
    } else if (item.jenis_pegawai === "MKS") {
      const found =
        item._mksRecord || mksList.find((x) => x.pegawai_id === item.id);

      if (found) openMksEdit(found);
      else openPegawaiEdit(item);
    } else {
      openPegawaiEdit(item);
    }
  }

  function handleToggle(item) {
    if (item._isMbcm) return toggleMbcm(item);
    return toggleAktif(item);
  }

  function handleDelete(item) {
    if (item._isMbcm) return deleteMbcm(item);
    return deletePegawai(item);
  }

  function handleAddByCategory() {
    if (categoryFilter === "MBCM") {
      openMbcmAdd();
    } else if (categoryFilter === "MKA") {
      openMkaAdd();
    } else if (categoryFilter === "MKS") {
      setError(
        "Penambahan MKS belum tersedia dari halaman ini. Gunakan alur pendaftaran MKS yang sudah berlaku.",
      );
    } else if (categoryFilter === "BRANCH_MANAGER") {
      setError("Branch Manager tidak ditambahkan dari halaman unit ini.");
    } else {
      openPegawaiEdit({
        nama: "",
        nip: "",
        jabatan: "",
        jenis_pegawai: "PENGAWAS",
        no_hp: "",
        email: "",
        aktif: true,
      });
      setError(
        "Penambahan pegawai umum belum tersedia. Form edit hanya untuk pegawai yang sudah terdaftar.",
      );
    }
  }

  // ==========================================================
  // RENDER HALAMAN
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-5 p-3 sm:space-y-6 sm:p-5 lg:p-7">
        {/* HERO */}
        <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-700 p-5 text-white shadow-xl shadow-indigo-950/10 sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 right-1/3 -z-10 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-inner backdrop-blur sm:h-14 sm:w-14">
                <Users size={27} />
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-100 sm:text-xs">
                  <Sparkles size={12} />
                  Administrasi JOSJIS
                </div>

                <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  Master Pegawai
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/80">
                  Kelola data tim, jabatan, dan status pegawai dalam satu
                  tampilan yang lebih ringkas.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                    <Building2 size={14} className="shrink-0 text-sky-200" />
                    <span className="truncate">
                      {unitData?.nama_unit ||
                        activeUnit?.label ||
                        activeUnit?.value ||
                        "Unit belum dipilih"}
                    </span>
                  </span>

                  {unitData?.kode_unit && (
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100">
                      {unitData.kode_unit}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              {unitData && (
                <button
                  type="button"
                  onClick={openUnitEdit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  <MapPin size={16} />
                  Edit Unit
                </button>
              )}

              <button
                type="button"
                onClick={loadData}
                disabled={loading || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-800 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh Data
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/15 pt-5 sm:max-w-xl sm:gap-4">
            <HeroMetric label="Total Pegawai" value={allEmployees.length} />
            <HeroMetric label="Aktif" value={activeCount} />
            <HeroMetric label="Tidak Aktif" value={inactiveCount} />
          </div>
        </section>

        {/* NOTIFIKASI */}
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

        {/* INFORMASI UNIT RINGKAS */}
        {unitData && (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Building2 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Informasi Unit
                  </h2>
                  <p className="text-xs text-slate-500">Identitas unit aktif</p>
                </div>
              </div>
              <button
                type="button"
                onClick={openUnitEdit}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50"
              >
                <Pencil size={14} />
                Edit
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <InfoBox label="Nama Unit" value={unitData.nama_unit} highlight />
              <InfoBox label="Kode Unit" value={unitData.kode_unit} />
              <InfoBox label="Kode Kawasan" value={unitData.kode_kawasan} />
              <InfoBox label="Kode Legacy" value={unitData.kode_legacy} />
            </div>
          </section>
        )}

        {!unitData && !loading && (
          <EmptyState
            title="Unit belum tersedia"
            description="Pilih JKK 1 atau JKK 2 untuk mengelola pegawai unit. Data MBCM mengikuti hak akses akun."
          />
        )}

        {/* RINGKASAN KATEGORI */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 sm:text-lg">
                Ringkasan Tim
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Pilih kategori untuk melihat pegawainya.
              </p>
            </div>
            <span className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm sm:inline-flex">
              {CATEGORIES.length - 1} kategori
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {CATEGORIES.filter((item) => item.id !== "SEMUA").map(
              (category) => {
                const Icon = category.icon;
                const selected = categoryFilter === category.id;
                const theme = categoryTheme[category.id];

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setCategoryFilter(selected ? "SEMUA" : category.id)
                    }
                    className={`group relative overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
                      selected
                        ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100"
                        : "border-slate-200/80 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${theme.top} text-white shadow-sm`}
                    >
                      <Icon size={20} />
                    </div>

                    <div className="mt-4 text-2xl font-bold tracking-tight text-slate-800">
                      {categoryCounts[category.id]}
                    </div>
                    <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      {category.label}
                    </div>

                    {selected && (
                      <div className="absolute right-3 top-3">
                        <BadgeCheck size={17} className="text-indigo-600" />
                      </div>
                    )}
                  </button>
                );
              },
            )}
          </div>
        </section>

        {/* FILTER DAN PENCARIAN */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, NIP, jabatan, nomor HP..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <Filter size={16} className="shrink-0 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 sm:min-w-[180px]"
              >
                {CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 sm:min-w-[150px]"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="AKTIF">Aktif</option>
                <option value="NONAKTIF">Tidak Aktif</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="text-xs text-slate-500">
              Menampilkan{" "}
              <span className="font-bold text-slate-800">
                {filteredEmployees.length}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-slate-800">
                {allEmployees.length}
              </span>{" "}
              pegawai
            </div>

            {(search ||
              categoryFilter !== "SEMUA" ||
              statusFilter !== "SEMUA") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("SEMUA");
                  setStatusFilter("SEMUA");
                }}
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
              >
                Reset filter
              </button>
            )}
          </div>
        </section>

        {/* GRID PEGAWAI */}
        {loading ? (
          <Loading />
        ) : (
          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {categoryFilter === "SEMUA"
                    ? "Daftar Pegawai"
                    : CATEGORIES.find((x) => x.id === categoryFilter)?.label}
                </h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Pilih kartu untuk melihat informasi lengkap.
                </p>
              </div>

              {categoryFilter === "MBCM" && (
                <button
                  type="button"
                  onClick={openMbcmAdd}
                  className={primaryButton}
                >
                  <Plus size={16} />
                  Tambah MBCM
                </button>
              )}

              {categoryFilter === "MKA" && unitData && (
                <button
                  type="button"
                  onClick={openMkaAdd}
                  className={primaryButton}
                >
                  <Plus size={16} />
                  Tambah MKA
                </button>
              )}
            </div>

            {filteredEmployees.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredEmployees.map((item, index) => (
                  <EmployeeCard
                    key={`${item.jenis_pegawai}-${item.id}-${index}`}
                    item={item}
                    onDetail={openDetail}
                    onEdit={handleCardEdit}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                    saving={saving}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Pegawai tidak ditemukan"
                description={
                  search
                    ? "Coba kata kunci lain atau hapus filter pencarian."
                    : "Belum ada pegawai pada kategori atau status yang dipilih."
                }
              />
            )}
          </section>
        )}

        {/* ====================================================
            MODAL UNIT
        ==================================================== */}
        {showUnitModal && (
          <Modal
            title="Edit Informasi Unit"
            subtitle="Perbarui informasi unit aktif"
            onClose={() => setShowUnitModal(false)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Nama Unit"
                value={unitForm.nama_unit}
                onChange={(v) => setUnitForm({ ...unitForm, nama_unit: v })}
                required
              />
              <FormField
                label="Kode Unit"
                value={unitForm.kode_unit}
                onChange={(v) => setUnitForm({ ...unitForm, kode_unit: v })}
                required
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

        {/* MODAL PEGAWAI */}
        {showPegawaiModal && (
          <Modal
            title="Edit Pegawai"
            subtitle="Perbarui informasi pegawai"
            onClose={() => setShowPegawaiModal(false)}
          >
            <PegawaiForm form={pegawaiForm} setForm={setPegawaiForm} />
            <ModalActions
              saving={saving}
              onCancel={() => setShowPegawaiModal(false)}
              onSave={savePegawai}
            />
          </Modal>
        )}

        {/* MODAL MKS */}
        {showMksModal && (
          <Modal
            title="Edit MKS"
            subtitle="Perbarui informasi MKS"
            onClose={() => setShowMksModal(false)}
          >
            <PegawaiContactForm form={mksForm} setForm={setMksForm} />
            <ModalActions
              saving={saving}
              onCancel={() => setShowMksModal(false)}
              onSave={saveMks}
            />
          </Modal>
        )}

        {/* MODAL MKA */}
        {showMkaModal && (
          <Modal
            title={editingPegawai ? "Edit MKA" : "Tambah MKA"}
            subtitle="Informasi pegawai MKA"
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

        {/* MODAL MBCM */}
        {showMbcmModal && (
          <Modal
            title={editingMbcm ? "Edit Data MBCM" : "Tambah MBCM"}
            subtitle="Pengawas wilayah yang berlaku untuk semua unit"
            onClose={() => setShowMbcmModal(false)}
          >
            <div className="mb-4 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <div className="text-sm font-bold text-violet-900">
                    Data MBCM Global
                  </div>
                  <p className="mt-1 text-xs leading-5 text-violet-700">
                    Data ini tidak terikat unit_id. Perubahan akan berlaku untuk
                    JKK 1 dan JKK 2 sesuai hak akses database.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Nama Lengkap"
                value={mbcmForm.nama}
                onChange={(v) => setMbcmForm({ ...mbcmForm, nama: v })}
                required
              />
              <FormField
                label="NIP"
                value={mbcmForm.nip}
                onChange={(v) => setMbcmForm({ ...mbcmForm, nip: v })}
                required
              />
              <FormField
                label="Jabatan"
                value={mbcmForm.jabatan}
                onChange={(v) => setMbcmForm({ ...mbcmForm, jabatan: v })}
                required
              />
              <FormField
                label="Nomor HP / WhatsApp"
                value={mbcmForm.no_hp}
                onChange={(v) => setMbcmForm({ ...mbcmForm, no_hp: v })}
                type="tel"
              />
              <SelectField
                label="Status"
                value={mbcmForm.status}
                onChange={(v) => setMbcmForm({ ...mbcmForm, status: v })}
                options={[
                  { label: "Aktif", value: "Aktif" },
                  { label: "Tidak Aktif", value: "Tidak Aktif" },
                ]}
              />
            </div>

            <ModalActions
              saving={saving}
              onCancel={() => setShowMbcmModal(false)}
              onSave={saveMbcm}
            />
          </Modal>
        )}

        {/* MODAL DETAIL */}
        {showDetailModal && detailPegawai && (
          <Modal
            title="Detail Pegawai"
            subtitle="Informasi lengkap pegawai"
            onClose={() => setShowDetailModal(false)}
          >
            <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200">
              <div
                className={`h-2 bg-gradient-to-r ${
                  categoryTheme[detailPegawai.jenis_pegawai]?.top ||
                  "from-indigo-500 to-sky-500"
                }`}
              />

              <div className="flex items-start gap-3 p-4 sm:p-5">
                <Avatar item={detailPegawai} size="large" />

                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-base font-bold text-slate-800 sm:text-lg">
                    {showValue(detailPegawai.nama)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatJenis(detailPegawai.jenis_pegawai)}
                    {detailPegawai._isMbcm ? " · Global" : ""}
                  </p>
                  <div className="mt-3">
                    <StatusBadge
                      aktif={
                        detailPegawai._isMbcm
                          ? detailPegawai.status === "Aktif"
                          : detailPegawai.aktif !== false
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Nama" value={detailPegawai.nama} />
              <DetailItem label="NIP" value={detailPegawai.nip} />
              <DetailItem label="Jabatan" value={detailPegawai.jabatan} />
              <DetailItem
                label="Nomor HP / WhatsApp"
                value={detailPegawai.no_hp}
              />

              {!detailPegawai._isMbcm && (
                <>
                  <DetailItem label="Email" value={detailPegawai.email} />
                  <DetailItem
                    label="Jenis Pegawai"
                    value={formatJenis(detailPegawai.jenis_pegawai)}
                  />
                  <DetailItem label="Unit ID" value={detailPegawai.unit_id} />
                </>
              )}

              <DetailItem
                label="Status"
                value={
                  detailPegawai._isMbcm
                    ? detailPegawai.status
                    : detailPegawai.aktif !== false
                      ? "Aktif"
                      : "Tidak Aktif"
                }
              />
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => handleDelete(detailPegawai)}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Hapus
              </button>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleToggle(detailPegawai)}
                  disabled={saving}
                  className={secondaryButton}
                >
                  <Power size={16} />
                  {(
                    detailPegawai._isMbcm
                      ? detailPegawai.status === "Aktif"
                      : detailPegawai.aktif !== false
                  )
                    ? "Nonaktifkan"
                    : "Aktifkan"}
                </button>

                <button
                  type="button"
                  onClick={() => handleEditDetail(detailPegawai)}
                  className={primaryButton}
                >
                  <Pencil size={16} />
                  Edit Data
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

// ============================================================
// KARTU PEGAWAI
// ============================================================

function EmployeeCard({ item, onDetail, onEdit, onDelete, onToggle, saving }) {
  const jenis = item.jenis_pegawai || "PENGAWAS";
  const theme = categoryTheme[jenis] || categoryTheme.PENGAWAS;
  const Icon = theme.icon;
  const aktif = item._isMbcm ? item.status === "Aktif" : item.aktif !== false;

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-950/5">
      <div className={`h-1.5 bg-gradient-to-r ${theme.top}`} />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${theme.iconBox}`}
          >
            <Icon size={23} />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="break-words text-sm font-bold leading-5 text-slate-800 sm:text-base">
              {showValue(item.nama)}
            </h3>

            <p className="mt-1 break-words text-xs leading-5 text-slate-500">
              {showValue(item.jabatan)}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${theme.badge}`}
              >
                {formatJenis(jenis)}
              </span>

              {item._isMbcm && (
                <span className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-600">
                  GLOBAL
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="my-4 space-y-3 border-y border-slate-100 py-3.5">
          <CardInfo icon={<IdCard size={15} />} label="NIP" value={item.nip} />
          <CardInfo
            icon={<Phone size={15} />}
            label="Nomor HP"
            value={item.no_hp}
          />

          {!item._isMbcm && (
            <CardInfo
              icon={<AtSign size={15} />}
              label="Email"
              value={item.email}
            />
          )}
        </div>

        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            Status pegawai
          </span>
          <StatusBadge aktif={aktif} />
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onDetail(item)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Eye size={15} />
            Detail
          </button>

          <button
            type="button"
            onClick={() => onEdit(item)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
          >
            <Pencil size={15} />
            Edit
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onToggle(item)}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Power size={14} />
            {aktif ? "Nonaktifkan" : "Aktifkan"}
          </button>

          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-100 px-3 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 size={14} />
            Hapus
          </button>
        </div>
      </div>
    </article>
  );
}

function CardInfo({ icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </div>
        <div className="mt-0.5 break-all text-xs font-medium leading-5 text-slate-700">
          {showValue(value)}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FORM
// ============================================================

function PegawaiForm({ form, setForm }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
        label="Pegawai aktif"
        checked={form.aktif}
        onChange={(v) => setForm({ ...form, aktif: v })}
      />
    </div>
  );
}

function PegawaiContactForm({ form, setForm }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
        label="Pegawai aktif"
        checked={form.aktif}
        onChange={(v) => setForm({ ...form, aktif: v })}
      />
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
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

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        value={value}
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

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-indigo-600"
      />
    </label>
  );
}

// ============================================================
// KOMPONEN UI
// ============================================================

function HeroMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
      <div className="text-xl font-bold text-white sm:text-2xl">{value}</div>
      <div className="mt-1 break-words text-[10px] font-medium leading-4 text-indigo-100/75 sm:text-xs">
        {label}
      </div>
    </div>
  );
}

function Avatar({ item, size = "normal" }) {
  const theme = categoryTheme[item.jenis_pegawai] || categoryTheme.PENGAWAS;
  const Icon = item._isMbcm ? ShieldCheck : theme.icon;

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl ${
        size === "large" ? "h-14 w-14" : "h-10 w-10"
      } ${theme.iconBox}`}
    >
      <Icon size={size === "large" ? 25 : 19} />
    </div>
  );
}

function StatusBadge({ aktif }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold sm:text-[11px] ${
        aktif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          aktif ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {aktif ? "Aktif" : "Tidak Aktif"}
    </span>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1.5 break-words text-sm font-semibold leading-5 text-slate-700">
        {showValue(value)}
      </div>
    </div>
  );
}

function InfoBox({ label, value, highlight = false }) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-3 sm:p-4 ${
        highlight
          ? "border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50"
          : "border-slate-100 bg-slate-50/60"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-bold leading-5 text-slate-800">
        {showValue(value)}
      </div>
    </div>
  );
}

function ModalActions({ saving, onCancel, onSave }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className={secondaryButton}
      >
        Batal
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={primaryButton}
      >
        {saving ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        {saving ? "Menyimpan..." : "Simpan Perubahan"}
      </button>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl border border-white/80 bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function Alert({ type, message, onClose }) {
  const isSuccess = type === "success";

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl border p-4 ${
        isSuccess
          ? "border-emerald-100 bg-emerald-50 text-emerald-800"
          : "border-rose-100 bg-rose-50 text-rose-800"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={19} className="mt-0.5 shrink-0" />
      )}

      <p className="flex-1 break-words text-sm leading-5">{message}</p>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100"
        aria-label="Tutup notifikasi"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <RefreshCw size={22} className="animate-spin" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-700">
        Memuat data pegawai...
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Menghubungkan ke database JOSJIS
      </p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Users size={22} />
      </div>
      <div className="mt-3 text-sm font-bold text-slate-700">{title}</div>
      <div className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </div>
    </div>
  );
}
