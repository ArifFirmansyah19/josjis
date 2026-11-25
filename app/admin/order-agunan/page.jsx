"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  Plus,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  FileSpreadsheet,
  UserCheck,
  Shield,
  X,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Copy,
  Printer,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useUnit } from "@/components/UnitContext";

const PAGE_SIZE = 20;

const JKK_TABS = ["JKK 1", "JKK 2"];

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeKey = (value) => normalizeText(value).toUpperCase();

const normalizeUnitCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const detectJkkCategory = (value) => {
  const text = normalizeText(value)
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");

  const jkk1 =
    /\bkuamang kuning\s*(1|i)\b/.test(text) ||
    /\bjkk\s*1\b/.test(text) ||
    /\b11081a\b/.test(text);

  const jkk2 =
    /\bkuamang kuning\s*(2|ii)\b/.test(text) ||
    /\bjkk\s*2\b/.test(text) ||
    /\b11081b\b/.test(text);

  if (jkk1 === jkk2) return null;

  return jkk1 ? "JKK 1" : "JKK 2";
};

const resolveJkkFromUnitRow = (unitRow) => {
  const code = normalizeUnitCode(unitRow?.kode_unit);
  const nama = normalizeText(unitRow?.nama_unit);

  if (["11081A", "JKK1", "JKK_1"].includes(code)) return "JKK 1";
  if (["11081B", "JKK2", "JKK_2"].includes(code)) return "JKK 2";

  return detectJkkCategory(nama) || detectJkkCategory(code);
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const mapRow = (row, unitName = "") => ({
  id: row.id,
  noUrut: row.no_urut,
  sumber: row.sumber || "-",
  unitId: row.unit_id,
  jkk: unitName,
  debitur: row.debitur || "",
  rekeningPinjaman: row.rekening_pinjaman || "",
  label: row.label || "-",
  statusDokumen: row.status_dokumen || "-",
  agunanUtama: row.agunan_utama || "-",
  moralObligation: row.moral_obligation || "-",
  mbu: row.mbu || "-",
  status: row.status || "AVAILABLE",
  lockedByUserId: row.locked_by_user_id || null,
  lockedByPegawaiId: row.locked_by_pegawai_id || null,
  lockedByName: row.locked_by_name || null,
  lockedByRole: row.locked_by_role || null,
  lockedAt: row.locked_at || null,
});

export default function OrderAgunanPage() {
  const fileInputRef = useRef(null);
  const { activeUnit } = useUnit();

  const [identity, setIdentity] = useState(null);
  const [unitList, setUnitList] = useState([]);
  const [agunanList, setAgunanList] = useState([]);

  const [activeJkk, setActiveJkk] = useState("JKK 1");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const [manualForm, setManualForm] = useState({
    jkk: "JKK 1",
    debitur: "",
    rekeningPinjaman: "",
    label: "",
    statusDokumen: "",
    agunanUtama: "",
    moralObligation: "",
    mbu: "KCP MMU Kuamang Kuning 1",
    langsungOrder: true,
  });

  const [bastPenerima, setBastPenerima] = useState("");
  const [bastCatatan, setBastCatatan] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const role = String(identity?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isMks = role === "MKS";
  const isPengawas = role === "PENGAWAS";
  const canManage = isAdmin || isMks;

  const currentUnit = useMemo(
    () => unitList.find((unit) => unit.nama === activeJkk) || null,
    [unitList, activeJkk],
  );

  const selectedUnit = useMemo(() => {
    if (!identity) return null;
    if (isAdmin) return currentUnit;
    return unitList.find((unit) => unit.id === identity.unitId) || null;
  }, [identity, isAdmin, currentUnit, unitList]);

  const visibleJkk = useMemo(() => {
    if (isAdmin) return JKK_TABS;
    if (identity?.unitJkk) return [identity.unitJkk];
    if (identity?.unitCode === "11081A") return ["JKK 1"];
    if (identity?.unitCode === "11081B") return ["JKK 2"];
    return [];
  }, [isAdmin, identity]);

  const effectiveJkk = isAdmin ? activeJkk : visibleJkk[0] || activeJkk;

  useEffect(() => {
    if (!isAdmin && visibleJkk.length === 1) {
      setActiveJkk(visibleJkk[0]);
    }
  }, [isAdmin, visibleJkk]);

  const loadIdentity = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
    }

    const { data: pengguna, error: penggunaError } = await supabase
      .from("pengguna")
      .select("id, auth_user_id, pegawai_id, unit_id, role, aktif")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (penggunaError) throw penggunaError;

    if (!pengguna || pengguna.aktif !== true) {
      throw new Error("Akun pengguna tidak aktif atau tidak ditemukan.");
    }

    const userRole = String(pengguna.role || "")
      .trim()
      .toUpperCase();

    if (!["ADMIN", "MKS", "PENGAWAS"].includes(userRole)) {
      throw new Error("Role akun tidak memiliki akses ke Order Agunan.");
    }

    let pegawai = null;

    if (pengguna.pegawai_id) {
      const { data, error } = await supabase
        .from("pegawai")
        .select("id, nama, unit_id")
        .eq("id", pengguna.pegawai_id)
        .maybeSingle();

      if (error) throw error;
      pegawai = data;
    }

    const unitId = pengguna.unit_id || pegawai?.unit_id || null;

    const { data: units, error: unitError } = await supabase
      .from("unit")
      .select("id, nama_unit, kode_unit");

    if (unitError) throw unitError;

    const mappedUnits = (units || [])
      .map((item) => {
        const jkk = resolveJkkFromUnitRow(item);
        if (!jkk) return null;

        return {
          id: item.id,
          nama: jkk,
          kode: normalizeUnitCode(item.kode_unit),
          namaUnit: item.nama_unit,
        };
      })
      .filter(Boolean);

    // Pastikan JKK 1 dan JKK 2 masing-masing memiliki entri unit agar tombol independen dari topbar.
    const uniqueUnits = JKK_TABS.map((jkk) => {
      const matched = mappedUnits.find((unit) => unit.nama === jkk);
      if (matched) return matched;

      if (userRole === "ADMIN") {
        return {
          id: `fallback-${jkk.toLowerCase().replace(/\s+/g, "-")}`,
          nama: jkk,
          kode: jkk === "JKK 1" ? "11081A" : "11081B",
          namaUnit:
            jkk === "JKK 1"
              ? "KCP MMU Kuamang Kuning 1"
              : "MBU Kuamang Kuning 2",
          isFallback: true,
        };
      }

      return null;
    }).filter(Boolean);

    const assignedUnit = uniqueUnits.find((unit) => unit.id === unitId) || null;

    const result = {
      userId: user.id,
      penggunaId: pengguna.id,
      pegawaiId: pengguna.pegawai_id || null,
      unitId,
      unitCode: assignedUnit?.kode || null,
      unitJkk: assignedUnit?.nama || null,
      name: pegawai?.nama || user.email || "Pengguna",
      role: userRole,
    };

    if (userRole !== "ADMIN" && !assignedUnit) {
      throw new Error(
        "Unit akun Anda belum terpetakan sebagai JKK 1 atau JKK 2. Periksa kode_unit dan nama_unit pada tabel unit.",
      );
    }

    setIdentity(result);
    setUnitList(uniqueUnits);

    return {
      identity: result,
      units: uniqueUnits,
    };
  }, []);

  const loadRows = useCallback(
    async (identityOverride, unitsOverride, targetJkkFilter = null) => {
      const currentIdentity = identityOverride || identity;
      const currentUnits = unitsOverride || unitList;

      if (!currentIdentity) {
        setAgunanList([]);
        return;
      }

      let targetUnits = [];

      if (currentIdentity.role === "ADMIN") {
        targetUnits = currentUnits.filter((unit) => {
          if (!JKK_TABS.includes(unit.nama)) return false;
          if (targetJkkFilter) return unit.nama === targetJkkFilter;
          return true;
        });
      } else {
        const ownUnit = currentUnits.find(
          (unit) => unit.id === currentIdentity.unitId,
        );
        if (ownUnit) {
          targetUnits = [ownUnit];
        }
      }

      if (!targetUnits.length) {
        if (!targetJkkFilter) setAgunanList([]);
        return;
      }

      const validDbUnits = targetUnits.filter((u) => !u.isFallback);

      const results = await Promise.all(
        validDbUnits.map(async (targetUnit) => {
          const { data, error } = await supabase
            .from("siatomic_data")
            .select(
              `
            id,
            no_urut,
            unit_id,
            sumber,
            debitur,
            rekening_pinjaman,
            label,
            status_dokumen,
            agunan_utama,
            moral_obligation,
            mbu,
            status,
            locked_by_user_id,
            locked_by_pegawai_id,
            locked_by_name,
            locked_by_role,
            locked_at,
            created_at
          `,
            )
            .eq("unit_id", targetUnit.id)
            .order("created_at", { ascending: false });

          if (error) {
            throw new Error(
              `Gagal memuat ${targetUnit.nama}: ${error.message}`,
            );
          }

          return (data || []).map((row) => mapRow(row, targetUnit.nama));
        }),
      );

      const fetchedFlat = results.flat();

      if (targetJkkFilter) {
        setAgunanList((prev) => [
          ...prev.filter((item) => item.jkk !== targetJkkFilter),
          ...fetchedFlat,
        ]);
      } else {
        setAgunanList(fetchedFlat);
      }
    },
    [identity, unitList],
  );

  const initialize = useCallback(async () => {
    setLoading(true);

    try {
      const result = await loadIdentity();

      const topbarHint = String(
        activeUnit?.value || activeUnit?.kode || activeUnit?.nama || "",
      ).toLowerCase();

      const initialJkk =
        result.identity.role === "ADMIN"
          ? topbarHint.includes("2") || topbarHint.includes("11081b")
            ? "JKK 2"
            : "JKK 1"
          : result.units.find((unit) => unit.id === result.identity.unitId)
              ?.nama || "JKK 1";

      setActiveJkk(initialJkk);

      await loadRows(result.identity, result.units);
    } catch (error) {
      showToast(error.message || "Gagal memuat data Order Agunan.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadIdentity, loadRows, showToast]);

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectJkkButton = async (jkk) => {
    setActiveJkk(jkk);
    setExpandedRowId(null);

    if (!identity) return;

    try {
      await loadRows(identity, unitList, jkk);
    } catch (error) {
      showToast(error.message || `Gagal memuat data ${jkk}.`, "error");
    }
  };

  const refreshData = async () => {
    setLoading(true);

    try {
      await loadRows(identity, unitList);
      showToast("Data berhasil diperbarui.");
    } catch (error) {
      showToast(error.message || "Gagal memperbarui data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setExpandedRowId(null);
  }, [effectiveJkk, statusFilter, searchQuery]);

  const jkkData = useMemo(
    () => agunanList.filter((item) => item.jkk === effectiveJkk),
    [agunanList, effectiveJkk],
  );

  const availableJkkItems = useMemo(
    () => jkkData.filter((item) => item.status === "AVAILABLE"),
    [jkkData],
  );

  const lockedJkkItems = useMemo(
    () => jkkData.filter((item) => item.status === "LOCKED"),
    [jkkData],
  );

  const canCancelOrder = useCallback(
    (item) => {
      if (item.status !== "LOCKED") return false;
      if (isAdmin) return true;
      return item.lockedByUserId === identity?.userId;
    },
    [isAdmin, identity],
  );

  const handleSelectOrder = async (item) => {
    if (!canManage) {
      showToast("Akses hanya untuk Admin dan MKS.", "error");
      return;
    }

    if (item.status === "LOCKED") {
      showToast(
        `Data sudah dikunci oleh ${item.lockedByName || "pengguna lain"}.`,
        "error",
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("siatomic_data")
        .update({ status: "LOCKED" })
        .eq("id", item.id)
        .eq("status", "AVAILABLE");

      if (error) throw error;

      await loadRows(identity, unitList, item.jkk);
      showToast(`"${item.debitur}" berhasil dikunci.`);
    } catch (error) {
      showToast(error.message || "Gagal mengunci data.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelOrder = async (item) => {
    if (!canCancelOrder(item)) {
      showToast(
        "Hanya MKS yang melakukan order atau Admin yang dapat membatalkan.",
        "error",
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("siatomic_data")
        .update({ status: "AVAILABLE" })
        .eq("id", item.id)
        .eq("status", "LOCKED");

      if (error) throw error;

      await loadRows(identity, unitList, item.jkk);
      showToast(`Order "${item.debitur}" berhasil dibatalkan.`);
    } catch (error) {
      showToast(error.message || "Gagal membatalkan order.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!isAdmin) {
      showToast("Hapus data hanya dapat dilakukan Admin.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Hapus data ${item.debitur} dengan rekening ${item.rekeningPinjaman}?`,
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("siatomic_data")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      setAgunanList((prev) => prev.filter((row) => row.id !== item.id));

      if (expandedRowId === item.id) setExpandedRowId(null);

      showToast(`Data "${item.debitur}" berhasil dihapus.`);
    } catch (error) {
      showToast(error.message || "Gagal menghapus data.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !identity) return;

    if (!canManage) {
      showToast("Pengawas hanya dapat melihat data.", "error");
      event.target.value = "";
      return;
    }

    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const matrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });

      if (matrix.length <= 1) {
        throw new Error("File Excel kosong atau tidak memiliki baris data.");
      }

      const COL_A = 0;
      const COL_B = 1;
      const COL_C = 2;
      const COL_D = 3;
      const COL_U = 20;
      const COL_X = 23;
      const COL_AC = 28;

      const targetUnits = unitList.filter((unit) =>
        identity.role === "ADMIN"
          ? !unit.isFallback
          : unit.id === identity.unitId,
      );

      const unitByJkk = new Map(targetUnits.map((unit) => [unit.nama, unit]));

      let skippedDiambil = 0;
      let skippedDuplicate = 0;
      let skippedUnknownUnit = 0;
      let skippedMissingData = 0;
      let insertedCount = 0;

      const groupedRows = {
        "JKK 1": [],
        "JKK 2": [],
      };

      for (let index = 1; index < matrix.length; index++) {
        const row = matrix[index] || [];

        const debitur = String(row[COL_A] ?? "").trim();
        const rekening = String(row[COL_B] ?? "").trim();

        if (!debitur && !rekening) continue;

        if (!debitur || !rekening) {
          skippedMissingData++;
          continue;
        }

        const label = String(row[COL_C] ?? "").trim();
        const statusDokumen = String(row[COL_D] ?? "").trim();

        if (normalizeText(statusDokumen).includes("diambil")) {
          skippedDiambil++;
          continue;
        }

        const agunanUtama = String(row[COL_U] ?? "").trim();
        const moralObligation = String(row[COL_X] ?? "").trim();
        const mbu = String(row[COL_AC] ?? "").trim();

        const detectedJkk = detectJkkCategory(mbu);

        if (!detectedJkk || !unitByJkk.has(detectedJkk)) {
          skippedUnknownUnit++;
          continue;
        }

        groupedRows[detectedJkk].push({
          unit_id: unitByJkk.get(detectedJkk).id,
          sumber: "Excel SIATOMIC",
          debitur: debitur.toUpperCase(),
          rekening_pinjaman: rekening,
          label: label || "-",
          status_dokumen: statusDokumen || "-",
          agunan_utama: agunanUtama || "-",
          moral_obligation: moralObligation || "-",
          mbu: mbu || "-",
          status: "AVAILABLE",
        });
      }

      for (const jkk of JKK_TABS) {
        const rows = groupedRows[jkk];
        if (!rows.length) continue;

        const unitId = unitByJkk.get(jkk)?.id;
        if (!unitId) continue;

        const { data: existingRows, error: existingError } = await supabase
          .from("siatomic_data")
          .select("debitur, rekening_pinjaman")
          .eq("unit_id", unitId);

        if (existingError) throw existingError;

        const existingKeys = new Set(
          (existingRows || []).map(
            (item) =>
              `${normalizeKey(item.debitur)}__${normalizeKey(item.rekening_pinjaman)}`,
          ),
        );

        const uniqueRows = [];

        for (const row of rows) {
          const key = `${normalizeKey(row.debitur)}__${normalizeKey(
            row.rekening_pinjaman,
          )}`;

          if (existingKeys.has(key)) {
            skippedDuplicate++;
            continue;
          }

          existingKeys.add(key);
          uniqueRows.push(row);
        }

        if (!uniqueRows.length) continue;

        const { data, error } = await supabase
          .from("siatomic_data")
          .upsert(uniqueRows, {
            onConflict: "unit_id,debitur_key,rekening_key",
            ignoreDuplicates: true,
          })
          .select("id");

        if (error) throw error;

        insertedCount += data?.length || 0;
      }

      await loadRows(identity, unitList);

      showToast(
        `Import selesai: ${insertedCount} data masuk. Dilewati: ${skippedDiambil} Diambil, ${skippedDuplicate} duplikat, ${skippedUnknownUnit} unit tidak valid/di luar akses, ${skippedMissingData} data tidak lengkap.`,
        insertedCount > 0 ? "success" : "error",
      );
    } catch (error) {
      showToast(error.message || "Gagal mengimpor Excel.", "error");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const resetManualForm = (jkk = effectiveJkk) => {
    setManualForm({
      jkk,
      debitur: "",
      rekeningPinjaman: "",
      label: "",
      statusDokumen: "",
      agunanUtama: "",
      moralObligation: "",
      mbu:
        jkk === "JKK 1" ? "KCP MMU Kuamang Kuning 1" : "MBU Kuamang Kuning 2",
      langsungOrder: true,
    });
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();

    if (!canManage) {
      showToast("Pengawas tidak dapat menambah data.", "error");
      return;
    }

    if (!manualForm.debitur.trim() || !manualForm.rekeningPinjaman.trim()) {
      showToast("Debitur dan Rekening Pinjaman wajib diisi.", "error");
      return;
    }

    const targetUnit = unitList.find((unit) => unit.nama === manualForm.jkk);

    if (!targetUnit || targetUnit.isFallback) {
      showToast("Unit tujuan belum terdaftar di database.", "error");
      return;
    }

    if (!isAdmin && targetUnit.id !== identity?.unitId) {
      showToast("Anda hanya dapat menambah data untuk unit sendiri.", "error");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        unit_id: targetUnit.id,
        sumber: "Input Manual",
        debitur: manualForm.debitur.trim().toUpperCase(),
        rekening_pinjaman: manualForm.rekeningPinjaman.trim(),
        label: manualForm.label.trim() || "-",
        status_dokumen: manualForm.statusDokumen.trim() || "-",
        agunan_utama: manualForm.agunanUtama.trim() || "-",
        moral_obligation: manualForm.moralObligation.trim() || "-",
        mbu: manualForm.mbu.trim() || "-",
        status: manualForm.langsungOrder ? "LOCKED" : "AVAILABLE",
      };

      const { error } = await supabase.from("siatomic_data").insert(payload);

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "Debitur dan rekening tersebut sudah terdaftar pada unit ini.",
          );
        }
        throw error;
      }

      setActiveJkk(manualForm.jkk);
      setIsManualModalOpen(false);
      resetManualForm(manualForm.jkk);

      await loadRows(identity, unitList, manualForm.jkk);

      showToast(
        `Data manual "${payload.debitur}" berhasil ditambahkan${
          manualForm.langsungOrder ? " dan dikunci" : ""
        }.`,
      );
    } catch (error) {
      showToast(error.message || "Gagal menyimpan data manual.", "error");
    } finally {
      setSaving(false);
    }
  };

  const isSearchActive = searchQuery.trim().length > 0;

  const filteredData = useMemo(() => {
    const baseList =
      statusFilter === "LOCKED" ? lockedJkkItems : availableJkkItems;

    const query = normalizeText(searchQuery);

    return baseList.filter((item) => {
      if (!query) return true;

      return [
        item.debitur,
        item.rekeningPinjaman,
        item.label,
        item.statusDokumen,
        item.agunanUtama,
        item.moralObligation,
        item.mbu,
        item.lockedByName,
      ].some((value) => normalizeText(value).includes(query));
    });
  }, [statusFilter, lockedJkkItems, availableJkkItems, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const displayedData = useMemo(() => {
    if (isSearchActive) return filteredData;
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, isSearchActive, safeCurrentPage]);

  const startRowNumber = isSearchActive
    ? 1
    : (safeCurrentPage - 1) * PAGE_SIZE + 1;

  const endRowNumber = isSearchActive
    ? filteredData.length
    : Math.min(safeCurrentPage * PAGE_SIZE, filteredData.length);

  const countJkk1 = agunanList.filter((item) => item.jkk === "JKK 1").length;
  const countJkk2 = agunanList.filter((item) => item.jkk === "JKK 2").length;

  const buildBastText = () => {
    if (!lockedJkkItems.length) return "";

    const lines = lockedJkkItems.map(
      (item, index) =>
        `${index + 1}. ${item.debitur} | Rek: ${item.rekeningPinjaman} | Label: ${item.label} | Status Dokumen: ${item.statusDokumen} | Agunan: ${item.agunanUtama} | Moral Obl.: ${item.moralObligation} | MBU: ${item.mbu} | Order: ${item.lockedByName || "-"}`,
    );

    return [
      "BERITA ACARA SERAH TERIMA (BAST) ORDER AGUNAN",
      `Kategori: ${effectiveJkk} (${lockedJkkItems.length} Data Terkunci)`,
      `Penerima BAST: ${bastPenerima || "-"}`,
      bastCatatan ? `Catatan: ${bastCatatan}` : "",
      "--- DAFTAR DATA ORDER AGUNAN ---",
      ...lines,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleCopyBast = async () => {
    try {
      await navigator.clipboard.writeText(buildBastText());
      showToast("Teks BAST berhasil disalin.");
    } catch {
      showToast("Gagal menyalin teks BAST.", "error");
    }
  };

  const openManualModal = () => {
    resetManualForm(effectiveJkk);
    setIsManualModalOpen(true);
  };

  if (loading && !identity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin text-[#003d79]" />
          Memuat data Order Agunan...
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-red-200 p-5 max-w-md w-full">
          <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
          <h2 className="font-bold text-slate-900">
            Tidak dapat membuka Order Agunan
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Periksa sesi login, status akun, dan role pengguna.
          </p>
          <button
            type="button"
            onClick={initialize}
            className="mt-4 px-4 py-2 rounded-lg bg-[#003d79] text-white text-sm font-bold"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const showBastAtLockedSection =
    statusFilter === "LOCKED" && lockedJkkItems.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 pb-24 md:pb-12 font-sans text-slate-800">
      {toast && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-[440px] z-[80] print:hidden">
          <div
            className={`p-3.5 rounded-xl shadow-lg border flex items-start gap-2.5 text-xs font-semibold ${
              toast.type === "error"
                ? "bg-red-50 border-red-300 text-red-900"
                : "bg-emerald-50 border-emerald-300 text-emerald-900"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 shadow-sm print:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-[#003d79] uppercase">
                SIATOMIC &amp; ORDER AGUNAN MANUAL
              </h1>
              <p className="text-[11px] text-slate-500 mt-1">
                Data terhubung langsung dengan database SIATOMIC
              </p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              disabled={loading}
              title="Muat ulang data"
              className="shrink-0 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 print:hidden">
          {/* TOMBOL JKK 1 & JKK 2 INDEPENDEN DARI TOPBAR */}
          <div
            className={`grid ${visibleJkk.length > 1 ? "grid-cols-2" : "grid-cols-1"} bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-80`}
          >
            {visibleJkk.map((jkk) => {
              const count = jkk === "JKK 1" ? countJkk1 : countJkk2;

              return (
                <button
                  key={jkk}
                  type="button"
                  onClick={() => handleSelectJkkButton(jkk)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    effectiveJkk === jkk
                      ? "bg-[#003d79] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{jkk}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      effectiveJkk === jkk
                        ? "bg-amber-400 text-slate-900"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex-1 sm:flex-initial">
              {isAdmin ? (
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <div className="text-xs">
                <div className="font-bold text-slate-800">{identity.name}</div>
                <div className="text-[10px] text-slate-500">
                  {identity.role} ·{" "}
                  {isAdmin
                    ? "Akses seluruh unit"
                    : selectedUnit?.namaUnit || "Unit pengguna"}
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelUpload}
              className="hidden"
            />

            {canManage && (
              <div className="hidden md:flex items-center gap-2">
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition disabled:opacity-60"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  {importing ? "Mengimpor..." : "Import Excel"}
                </button>

                <button
                  type="button"
                  onClick={openManualModal}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> Input Manual
                </button>
              </div>
            )}
          </div>
        </div>

        {isPengawas && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 print:hidden">
            Anda masuk sebagai Pengawas. Data hanya dapat dilihat dan tidak
            dapat diubah.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 print:hidden">
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3">
            <p className="text-[11px] text-slate-500 font-medium">
              Total {effectiveJkk}
            </p>
            <p className="text-base sm:text-lg font-extrabold text-slate-900">
              {jkkData.length}
            </p>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 sm:p-3">
            <p className="text-[11px] text-emerald-800 font-medium">
              Bisa Di-order
            </p>
            <p className="text-base sm:text-lg font-extrabold text-emerald-700">
              {availableJkkItems.length}
            </p>
          </div>
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 sm:p-3">
            <p className="text-[11px] text-amber-900 font-medium">Terkunci</p>
            <p className="text-base sm:text-lg font-extrabold text-amber-700">
              {lockedJkkItems.length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-sm flex flex-col sm:flex-row gap-2 print:hidden">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Debitur, Rekening, Label, Agunan, Status Dokumen, atau MBU..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#003d79] focus:outline-none text-base sm:text-sm"
            />
            {isSearchActive && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Hapus pencarian"
                className="text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                statusFilter === "ALL"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Semua ({availableJkkItems.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("LOCKED")}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                statusFilter === "LOCKED"
                  ? "bg-amber-500 text-slate-900 border-amber-500 font-bold"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Terkunci ({lockedJkkItems.length})
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 print:hidden">
          {filteredData.length === 0 ? (
            <span>
              {statusFilter === "LOCKED"
                ? `Belum ada data terkunci pada ${effectiveJkk}.`
                : `Belum ada data tersedia pada ${effectiveJkk}.`}
            </span>
          ) : isSearchActive ? (
            <span>
              Mode Pencarian: menampilkan{" "}
              <b>semua {filteredData.length} hasil</b>
            </span>
          ) : (
            <span>
              Menampilkan data ke-<b>{startRowNumber}</b> s.d.{" "}
              <b>{endRowNumber}</b> dari <b>{filteredData.length}</b> data
              (maks. {PAGE_SIZE} / halaman)
            </span>
          )}
          {!isSearchActive && totalPages > 1 && (
            <span>
              Halaman <b>{safeCurrentPage}</b> / <b>{totalPages}</b>
            </span>
          )}
        </div>

        {/* MOBILE DATA LIST */}
        <div className="md:hidden bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden print:hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Memuat data...
            </div>
          ) : displayedData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Tidak ada data yang sesuai.
            </div>
          ) : (
            displayedData.map((item, index) => {
              const isLocked = item.status === "LOCKED";
              const isExpanded = expandedRowId === item.id;
              const allowableCancel = canCancelOrder(item);
              const rowNum = startRowNumber + index;

              return (
                <div
                  key={item.id}
                  className={isLocked ? "bg-amber-50/25" : "bg-white"}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRowId(isExpanded ? null : item.id)
                    }
                    className="w-full px-3.5 py-3 text-left flex items-center justify-between gap-2.5 active:bg-slate-50 transition"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-slate-400 mt-0.5 shrink-0 w-6">
                        {rowNum}.
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {item.debitur}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          Rek:{" "}
                          <span className="font-medium text-slate-700">
                            {item.rekeningPinjaman}
                          </span>{" "}
                          · Label:{" "}
                          <span className="font-semibold text-[#003d79]">
                            {item.label}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 truncate">
                          Status dokumen: {item.statusDokumen}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                          <Lock className="w-2.5 h-2.5" /> Terkunci
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <Unlock className="w-2.5 h-2.5" /> Tersedia
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3.5 pt-1 bg-slate-50/80 border-t border-slate-100 space-y-2.5 text-xs">
                      <div className="grid grid-cols-1 gap-2 bg-white p-3 rounded-xl border border-slate-200/80">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">
                            Status Dokumen (D)
                          </span>
                          <span className="font-semibold text-slate-800">
                            {item.statusDokumen}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">
                            Agunan Utama (U)
                          </span>
                          <span className="font-semibold text-slate-800">
                            {item.agunanUtama}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block">
                              Moral Obligation (X)
                            </span>
                            <span className="font-medium text-slate-800">
                              {item.moralObligation}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block">
                              MBU (AC)
                            </span>
                            <span className="font-medium text-slate-800">
                              {item.mbu}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isLocked && (
                        <div className="text-[11px] bg-amber-100/80 text-amber-950 px-3 py-2 rounded-lg">
                          Dikunci oleh: <b>{item.lockedByName || "-"}</b>
                          <br />
                          {formatDate(item.lockedAt)}
                        </div>
                      )}

                      {canManage && (
                        <div className="flex flex-wrap gap-2">
                          {isLocked ? (
                            allowableCancel ? (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleCancelOrder(item)}
                                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 active:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <Unlock className="w-3.5 h-3.5" /> Batalkan
                                Order
                              </button>
                            ) : (
                              <div className="flex-1 py-2.5 px-3 rounded-xl bg-slate-200 text-slate-500 font-semibold text-xs flex items-center justify-center gap-1.5">
                                <Lock className="w-3.5 h-3.5" /> Dikunci MKS
                                Lain
                              </div>
                            )
                          ) : (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleSelectOrder(item)}
                              className="flex-1 py-2.5 rounded-xl bg-[#003d79] active:bg-[#002b57] text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Check className="w-4 h-4 text-amber-400" /> Pilih
                              &amp; Order
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleDeleteItem(item)}
                              className="py-2.5 px-3 rounded-xl bg-red-600 active:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto print:hidden">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10.5px]">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 min-w-[190px]">
                  Debitur &amp; Rekening
                </th>
                <th className="py-3 px-3">Label</th>
                <th className="py-3 px-3 min-w-[140px]">Status Dokumen</th>
                <th className="py-3 px-3 min-w-[220px]">Agunan Utama</th>
                <th className="py-3 px-3 min-w-[170px]">Moral Obligation</th>
                <th className="py-3 px-3 min-w-[170px]">MBU</th>
                <th className="py-3 px-3 min-w-[130px]">Status Order</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : displayedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    Tidak ada data yang sesuai.
                  </td>
                </tr>
              ) : (
                displayedData.map((item, index) => {
                  const isLocked = item.status === "LOCKED";
                  const allowableCancel = canCancelOrder(item);

                  return (
                    <tr
                      key={item.id}
                      className={
                        isLocked ? "bg-amber-50/30" : "hover:bg-slate-50/80"
                      }
                    >
                      <td className="py-3 px-3 text-center font-semibold text-slate-500 align-top">
                        {startRowNumber + index}
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-slate-900">
                          {item.debitur}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                          {item.rekeningPinjaman}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <span className="inline-block font-bold text-[#003d79] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                          {item.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top text-slate-700">
                        {item.statusDokumen}
                      </td>
                      <td className="py-3 px-3 align-top font-semibold text-slate-800">
                        {item.agunanUtama}
                      </td>
                      <td className="py-3 px-3 align-top text-slate-700">
                        {item.moralObligation}
                      </td>
                      <td className="py-3 px-3 align-top font-semibold text-slate-800">
                        {item.mbu}
                      </td>
                      <td className="py-3 px-3 align-top">
                        {isLocked ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-900">
                              <Lock className="w-3 h-3" /> Terkunci
                            </span>
                            <div className="text-[11px] font-semibold text-slate-800 mt-1">
                              {item.lockedByName || "-"}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatDate(item.lockedAt)}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800">
                            <Unlock className="w-3 h-3" /> Tersedia
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {canManage &&
                            (isLocked ? (
                              allowableCancel ? (
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleCancelOrder(item)}
                                  className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs transition whitespace-nowrap disabled:opacity-50"
                                >
                                  <Unlock className="w-3.5 h-3.5" /> Batalkan
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  title="Hanya MKS pemesan atau Admin yang dapat membatalkan"
                                  className="inline-flex items-center gap-1 bg-slate-200 text-slate-500 font-semibold px-2.5 py-1.5 rounded-lg text-xs cursor-not-allowed whitespace-nowrap"
                                >
                                  <Lock className="w-3.5 h-3.5" /> Terkunci
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleSelectOrder(item)}
                                className="inline-flex items-center gap-1 bg-[#003d79] hover:bg-[#002b57] text-white font-bold px-3 py-1.5 rounded-lg text-xs transition disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5 text-amber-400" />{" "}
                                Pilih
                              </button>
                            ))}

                          {isAdmin && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleDeleteItem(item)}
                              title="Hapus data (khusus Admin)"
                              className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs transition whitespace-nowrap"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isSearchActive && totalPages > 1 && (
          <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between gap-2 text-xs print:hidden">
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" /> Sebelumnya
            </button>

            <div className="flex items-center gap-1 overflow-x-auto max-w-[180px] sm:max-w-none">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs shrink-0 transition ${
                      safeCurrentPage === page
                        ? "bg-[#003d79] text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
            >
              Berikutnya <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {showBastAtLockedSection && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3 print:hidden">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#003d79]" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Preview BAST Order Agunan ({effectiveJkk})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menampilkan <b>{lockedJkkItems.length} data terkunci</b>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyBast}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin BAST
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#003d79] hover:bg-[#002b57] text-white font-bold text-xs shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" /> Cetak / PDF
                  BAST
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Penerima BAST
                </label>
                <input
                  type="text"
                  value={bastPenerima}
                  onChange={(e) => setBastPenerima(e.target.value)}
                  placeholder="Nama petugas / unit penerima BAST"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Catatan BAST (Opsional)
                </label>
                <input
                  type="text"
                  value={bastCatatan}
                  onChange={(e) => setBastCatatan(e.target.value)}
                  placeholder="Tambahkan catatan serah terima..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl p-4 sm:p-5 bg-white text-black text-xs space-y-4 overflow-x-auto">
              <div className="text-center border-b border-black pb-2">
                <h3 className="font-bold underline uppercase text-sm">
                  BERITA ACARA SERAH TERIMA (BAST) ORDER AGUNAN
                </h3>
                <p className="text-[11px] text-slate-700 mt-0.5">
                  Kelompok: <b>{effectiveJkk}</b> · Total Data Terkunci:{" "}
                  <b>{lockedJkkItems.length}</b>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                <div>
                  <span className="text-slate-600">Petugas / User Aktif:</span>{" "}
                  <b>{identity.name}</b>
                </div>
                <div>
                  <span className="text-slate-600">Penerima BAST:</span>{" "}
                  <b>
                    {bastPenerima || "........................................"}
                  </b>
                </div>
                {bastCatatan && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-600">Catatan:</span>{" "}
                    <b>{bastCatatan}</b>
                  </div>
                )}
              </div>

              <table className="w-full border-collapse border border-black text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1.5 text-center">
                      No
                    </th>
                    <th className="border border-black px-2.5 py-1.5">
                      Debitur
                    </th>
                    <th className="border border-black px-2.5 py-1.5">
                      Rekening
                    </th>
                    <th className="border border-black px-2 py-1.5">Label</th>
                    <th className="border border-black px-2.5 py-1.5">
                      Status Dokumen
                    </th>
                    <th className="border border-black px-2.5 py-1.5">
                      Agunan Utama
                    </th>
                    <th className="border border-black px-2.5 py-1.5">
                      Moral Obligation
                    </th>
                    <th className="border border-black px-2.5 py-1.5">MBU</th>
                    <th className="border border-black px-2.5 py-1.5">
                      Di-order Oleh
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lockedJkkItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-black px-2 py-1.5 text-center font-semibold">
                        {index + 1}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 font-bold">
                        {item.debitur}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 font-mono">
                        {item.rekeningPinjaman}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 text-center">
                        {item.label}
                      </td>
                      <td className="border border-black px-2.5 py-1.5">
                        {item.statusDokumen}
                      </td>
                      <td className="border border-black px-2.5 py-1.5">
                        {item.agunanUtama}
                      </td>
                      <td className="border border-black px-2.5 py-1.5">
                        {item.moralObligation}
                      </td>
                      <td className="border border-black px-2.5 py-1.5">
                        {item.mbu}
                      </td>
                      <td className="border border-black px-2.5 py-1.5">
                        <div className="font-semibold">
                          {item.lockedByName || "-"}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {formatDate(item.lockedAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-8 pt-4 text-center text-[11.5px]">
                <div>
                  <p className="font-semibold">Yang Menyerahkan Order</p>
                  <div className="h-14" />
                  <p className="underline font-bold">
                    ({lockedJkkItems[0]?.lockedByName || identity.name})
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Yang Menerima BAST</p>
                  <div className="h-14" />
                  <p className="underline font-bold">
                    (
                    {bastPenerima || "........................................"}
                    )
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* BOTTOM FLOATING BAR MOBILE */}
      {canManage && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 p-3 flex gap-2.5 md:hidden shadow-lg print:hidden">
          <button
            type="button"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-sm disabled:opacity-60"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {importing ? "Mengimpor..." : "Import Excel"}
          </button>
          <button
            type="button"
            onClick={openManualModal}
            className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 active:bg-amber-600 text-slate-900 font-bold text-xs py-3 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" /> Input Manual
          </button>
        </div>
      )}

      {/* MODAL INPUT MANUAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 print:hidden">
          <form
            onSubmit={handleManualSubmit}
            className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Input Manual Order Agunan
                </h3>
                <p className="text-xs text-slate-500">
                  Tambahkan baris baru ke {manualForm.jkk}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pilih JKK
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {JKK_TABS.map((ver) => (
                      <button
                        type="button"
                        key={ver}
                        onClick={() =>
                          setManualForm((prev) => ({
                            ...prev,
                            jkk: ver,
                            mbu:
                              ver === "JKK 1"
                                ? "KCP MMU Kuamang Kuning 1"
                                : "MBU Kuamang Kuning 2",
                          }))
                        }
                        className={`py-2.5 rounded-xl border font-bold text-xs transition ${
                          manualForm.jkk === ver
                            ? "bg-[#003d79] text-white border-[#003d79]"
                            : "bg-white text-slate-700 border-slate-300"
                        }`}
                      >
                        {ver}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Debitur (Kolom A) *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.debitur}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      debitur: e.target.value,
                    }))
                  }
                  placeholder="Nama lengkap debitur"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Rekening Pinjaman (B) *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={manualForm.rekeningPinjaman}
                    onChange={(e) =>
                      setManualForm((prev) => ({
                        ...prev,
                        rekeningPinjaman: e.target.value,
                      }))
                    }
                    placeholder="1100100..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Label (Kolom C)
                  </label>
                  <input
                    type="text"
                    value={manualForm.label}
                    onChange={(e) =>
                      setManualForm((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                    placeholder="1689"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status Dokumen (Kolom D)
                </label>
                <input
                  type="text"
                  value={manualForm.statusDokumen}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      statusDokumen: e.target.value,
                    }))
                  }
                  placeholder="Contoh: Tersedia / #N/A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Agunan Utama (Kolom U)
                </label>
                <input
                  type="text"
                  value={manualForm.agunanUtama}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      agunanUtama: e.target.value,
                    }))
                  }
                  placeholder="SHM NO. ... A/N ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Moral Obligation (Kolom X)
                  </label>
                  <input
                    type="text"
                    value={manualForm.moralObligation}
                    onChange={(e) =>
                      setManualForm((prev) => ({
                        ...prev,
                        moralObligation: e.target.value,
                      }))
                    }
                    placeholder="SHT I / SKMHT..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    MBU (Kolom AC)
                  </label>
                  <input
                    type="text"
                    value={manualForm.mbu}
                    onChange={(e) =>
                      setManualForm((prev) => ({
                        ...prev,
                        mbu: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualForm.langsungOrder}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      langsungOrder: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 rounded text-[#003d79]"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">
                    Langsung Order &amp; Kunci atas nama saya
                  </div>
                  <div className="text-slate-500">
                    Dikunci atas nama <b>{identity.name}</b>
                  </div>
                </div>
              </label>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-[#003d79] hover:bg-[#002b57] text-white font-bold py-3 rounded-xl text-sm shadow disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saving ? "Menyimpan..." : "Simpan Data Agunan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
