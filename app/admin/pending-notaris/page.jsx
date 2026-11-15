"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Plus,
  Upload,
  Download,
  X,
  Pencil,
  Trash2,
  FileSpreadsheet,
  ChevronRight,
  Loader2,
  RefreshCw,
  Filter,
  AlertCircle,
  Database,
  History,
  Save,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useUnit } from "@/components/UnitContext";

const PAGE_SIZE = 20;

const PROSES = [
  { value: "CO_PROSES_ORDER", label: "CO – Proses Order" },
  { value: "CABANG_BELUM_DISERAHKAN", label: "Cabang – Belum Diserahkan" },
  { value: "NOTARIS_PROSES_PENGIKATAN", label: "Notaris – Proses Pengikatan" },
  {
    value: "CABANG_SELESAI_SIAP_MIGRASI",
    label: "Cabang – Selesai Pengikatan, Siap Migrasi",
  },
  { value: "CO_SELESAI_MIGRASI", label: "CO – Selesai Migrasi" },
];

const FISIK_AGUNAN = ["Debitur", "Cabang", "Notaris", "CO"];
const STATUS_PENGIKATAN = [
  { value: "PENDING", label: "Pending" },
  { value: "SELESAI", label: "Selesai" },
];

const KOMITMEN_BULAN = [1, 2, 3, 4, 5];

const EMPTY_FORM = {
  pk_id: "",
  limit_kredit: "",
  region: "Region 2",
  area: "Area Jambi",
  cluster: "Cluster Jambi Bungo",
  mbu: "",
  kode_mbu: "",
  cabang_reguler: "KCP Kuamang Kuning",
  kode_cabang: "11081",
  cif: "",
  norek: "",
  nama: "",
  produk: "",
  nomor_covernote: "",
  tanggal_covernote: "",
  notaris_id: "",
  nama_notaris_manual: "",
  nominal_pengikatan: "",
  komitmen_bulan: "3",
  komitmen_penyelesaian: "",
  tahun_covernote: "",
  penyebab_pending: "Proses Floating",
  penyebab_pending_detail: "",
  agunan: [],
};

const EXCEL_HEADERS = [
  "Region",
  "Area",
  "Cluster",
  "Mbu",
  "Kode Mbu",
  "Cabang Reguler",
  "Kode Cabang",
  "CIFNO",
  "NOREK",
  "Nama",
  "Produk",
  "Status Pending Pengikatan",
  "Nomor Covernote",
  "Tanggal Covernote",
  "Nama Notaris",
  "Dokumen Pengikatan",
  "Nominal Pengikatan",
  "Komitmen Penyelesaian Notaris",
  "Tahun Covernote",
  "Penyebab Belum Selesai / Masih Pending",
];

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-gray-400";

function txt(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatTanggal(value) {
  if (!value) return "-";
  const d = new Date(`${value}`.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getProsesLabel(value) {
  return PROSES.find((x) => x.value === value)?.label || value || "-";
}

function getStatusLabel(value) {
  return value === "SELESAI" ? "Selesai" : "Pending";
}

function getProgress(agunan = []) {
  if (!agunan.length) return "PENDING";

  const selesai = agunan.filter(
    (a) => a.status_pengikatan === "SELESAI",
  ).length;

  if (selesai === agunan.length) return "SELESAI";
  if (selesai > 0) return "SEBAGIAN";
  return "PENDING";
}

function progressLabel(value) {
  if (value === "SELESAI") return "Selesai";
  if (value === "SEBAGIAN") return "Selesai Sebagian";
  return "Pending";
}

function progressClass(value) {
  if (value === "SELESAI") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (value === "SEBAGIAN") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function excelDate(value) {
  if (!value) return "";

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
      parsed.d,
    ).padStart(2, "0")}`;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(value.getDate()).padStart(2, "0")}`;
  }

  const raw = txt(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function addMonths(dateValue, months) {
  if (!dateValue || !months) return "";

  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return "";

  const targetMonth = month - 1 + Number(months);
  const targetYear = year + Math.floor(targetMonth / 12);
  const finalMonth = ((targetMonth % 12) + 12) % 12;

  const lastDay = new Date(targetYear, finalMonth + 1, 0).getDate();
  const finalDay = Math.min(day, lastDay);

  return `${targetYear}-${String(finalMonth + 1).padStart(2, "0")}-${String(
    finalDay,
  ).padStart(2, "0")}`;
}

function calculateNominal(limit) {
  if (limit === "" || limit === null || limit === undefined) return "";
  const value = Number(limit);
  if (!Number.isFinite(value) || value < 0) return "";
  return Math.ceil(value * 1.25);
}

function parseRupiah(value) {
  if (typeof value === "number") return value;
  const raw = txt(value).replace(/[^\d,.-]/g, "");
  if (!raw) return "";

  // Format Excel Indonesia: 1.234.567,50
  if (raw.includes(",")) {
    return Number(raw.replace(/\./g, "").replace(",", "."));
  }

  return Number(raw);
}

function normalizeHeader(value) {
  return txt(value).toLowerCase().replace(/\s+/g, " ");
}

function getCause(value) {
  const raw = txt(value);
  if (!raw) return { type: "Proses Floating", detail: "" };

  if (raw.toLowerCase() === "proses floating") {
    return { type: "Proses Floating", detail: "" };
  }

  if (raw.toLowerCase().startsWith("lainnya:")) {
    return { type: "Lainnya", detail: raw.slice(8).trim() };
  }

  return { type: "Lainnya", detail: raw };
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function PendingNotarisPage() {
  const { activeUnit } = useUnit();
  const [cabangFilter, setCabangFilter] = useState("");
  const [cabangList, setCabangList] = useState([]);

  const currentUnit =
    activeUnit?.value || activeUnit?.kode_unit || activeUnit?.kode || "JKK1";

  const currentUnitCode = activeUnit?.code || "";

  const unitDefaults = useMemo(() => {
    const isJKK2 = currentUnit === "JKK2" || currentUnit === "11081B";
    return {
      region: "Region 2",
      area: "Area Jambi",
      cluster: "Cluster Jambi Bungo",
      mbu: isJKK2 ? "Kuamang Kuning 2" : "Kuamang Kuning 1",
      kode_mbu: isJKK2 ? "11081B" : "11081A",
      cabang_reguler: "KCP Kuamang Kuning",
      kode_cabang: "11081",
    };
  }, [currentUnit]);

  const [unitId, setUnitId] = useState("");
  const [unitLoading, setUnitLoading] = useState(true);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [notarisFilter, setNotarisFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [fisikFilter, setFisikFilter] = useState("");
  const [processFilter, setProcessFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [notarisList, setNotarisList] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [pkSearch, setPkSearch] = useState("");
  const [pkResults, setPkResults] = useState([]);
  const [pkLoading, setPkLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);

  const [showExport, setShowExport] = useState(false);
  const [exportMode, setExportMode] = useState("FILTERED");
  const [exportMonth, setExportMonth] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let alive = true;

    async function loadCabang() {
      if (!unitId) {
        setCabangList([]);
        return;
      }

      const { data, error: err } = await supabase
        .from("pending_notaris")
        .select("cabang_reguler,kode_cabang")
        .eq("unit_id", unitId)
        .limit(2000);

      if (!alive) return;

      if (err) {
        console.error("Gagal memuat daftar cabang:", err);
        setCabangList([]);
        return;
      }

      const unique = new Map();

      (data || []).forEach((item) => {
        const nama = txt(item.cabang_reguler);
        const kode = txt(item.kode_cabang);

        if (!nama && !kode) return;

        const key = nama;
        if (!unique.has(key)) {
          unique.set(key, {
            nama,
            kode,
          });
        }
      });

      setCabangList(
        [...unique.values()].sort((a, b) => a.nama.localeCompare(b.nama, "id")),
      );
    }

    loadCabang();

    return () => {
      alive = false;
    };
  }, [unitId]);

  useEffect(() => {
    let alive = true;

    async function loadUnit() {
      setUnitLoading(true);
      setUnitId("");
      setRows([]);
      setTotal(0);
      setPage(0);

      try {
        // Utamakan kode unit JKK1 / JKK2.
        let { data, error: err } = await supabase
          .from("unit")
          .select("id,kode_unit,kode_legacy")
          .eq("kode_unit", currentUnit)
          .maybeSingle();

        // Jika tidak ditemukan, coba kode legacy 11081A / 11081B.
        if (!data?.id && currentUnitCode) {
          const fallback = await supabase
            .from("unit")
            .select("id,kode_unit,kode_legacy")
            .eq("kode_legacy", currentUnitCode)
            .maybeSingle();

          data = fallback.data;
          err = fallback.error;
        }

        if (!alive) return;

        if (err || !data?.id) {
          setError(
            err?.message ||
              `Unit ${currentUnit} (${currentUnitCode}) tidak ditemukan di tabel unit.`,
          );
          setUnitLoading(false);
          return;
        }

        setUnitId(data.id);
        setError("");
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Gagal memuat unit aktif.");
      } finally {
        if (alive) setUnitLoading(false);
      }
    }

    loadUnit();
    return () => {
      alive = false;
    };
  }, [currentUnit]);

  useEffect(() => {
    let alive = true;

    async function loadNotaris() {
      const { data, error: err } = await supabase
        .from("notaris")
        .select("id,nama_notaris,kabupaten")
        .order("nama_notaris", { ascending: true });

      if (alive && !err) setNotarisList(data || []);
    }

    loadNotaris();
    return () => {
      alive = false;
    };
  }, []);

  const activeFilterCount = [
    cabangFilter,
    notarisFilter,
    monthFilter,
    dateFrom,
    dateTo,
    fisikFilter,
    processFilter,
    statusFilter,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setNotarisFilter("");
    setMonthFilter("");
    setDateFrom("");
    setDateTo("");
    setFisikFilter("");
    setProcessFilter("");
    setStatusFilter("");
    setCabangFilter("");
    setPage(0);
  };

  const getParentIdsByChildFilter = useCallback(async () => {
    if (!fisikFilter && !processFilter && !statusFilter) return null;

    let query = supabase
      .from("pending_notaris_agunan")
      .select("pending_id,lokasi_agunan,proses,status_pengikatan")
      .limit(10000);

    if (fisikFilter) query = query.eq("lokasi_agunan", fisikFilter);
    if (processFilter) query = query.eq("proses", processFilter);
    if (statusFilter === "PENDING" || statusFilter === "SELESAI") {
      query = query.eq("status_pengikatan", statusFilter);
    }

    const { data, error: queryError } = await query;
    if (queryError) throw queryError;

    let childRows = data || [];

    // Status keseluruhan debitur dihitung dari semua agunannya.
    if (statusFilter === "SEBAGIAN" || statusFilter === "SEMUA_PENDING") {
      const { data: allChildren, error: allError } = await supabase
        .from("pending_notaris_agunan")
        .select("pending_id,status_pengikatan")
        .limit(10000);

      if (allError) throw allError;

      const grouped = new Map();
      (allChildren || []).forEach((item) => {
        const list = grouped.get(item.pending_id) || [];
        list.push(item.status_pengikatan);
        grouped.set(item.pending_id, list);
      });

      const ids = [];

      grouped.forEach((statuses, id) => {
        const done = statuses.filter((x) => x === "SELESAI").length;
        const progress =
          done === statuses.length
            ? "SELESAI"
            : done > 0
              ? "SEBAGIAN"
              : "PENDING";

        if (progress === statusFilter) ids.push(id);
      });

      const childFilteredIds = new Set(childRows.map((x) => x.pending_id));
      return fisikFilter || processFilter
        ? ids.filter((id) => childFilteredIds.has(id))
        : ids;
    }

    return [...new Set(childRows.map((x) => x.pending_id))];
  }, [fisikFilter, processFilter, statusFilter]);

  const loadData = useCallback(
    async (targetPage = 0, showRefresh = false) => {
      if (!unitId) return;

      setLoading(true);
      setRefreshing(showRefresh);
      setError("");

      try {
        const matchingIds = await getParentIdsByChildFilter();

        if (matchingIds && matchingIds.length === 0) {
          setRows([]);
          setTotal(0);
          setPage(0);
          return;
        }

        let query = supabase
          .from("pending_notaris")
          .select(
            "id,unit_id,pk_id,nama,cif,norek,produk,limit_kredit,nomor_covernote,tanggal_covernote,notaris_id,nama_notaris_manual,dokumen_pengikatan,nominal_pengikatan,komitmen_bulan,komitmen_penyelesaian,tahun_covernote,penyebab_pending,created_at,notaris(id,nama_notaris)",
            { count: "exact" },
          )
          .eq("unit_id", unitId);

        if (debouncedSearch) {
          const safe = debouncedSearch.replace(/[%,_]/g, " ").trim();
          if (safe) {
            query = query.or(
              `nama.ilike.%${safe}%,cif.ilike.%${safe}%,norek.ilike.%${safe}%,nomor_covernote.ilike.%${safe}%,nama_notaris_manual.ilike.%${safe}%`,
            );
          }
        }

        if (cabangFilter) {
          query = query.eq("cabang_reguler", cabangFilter);
        }

        if (notarisFilter) {
          query = query.eq("notaris_id", notarisFilter);
        }
        if (dateFrom) query = query.gte("tanggal_covernote", dateFrom);
        if (dateTo) query = query.lte("tanggal_covernote", dateTo);

        if (monthFilter) {
          const [year, month] = monthFilter.split("-");
          const last = new Date(Number(year), Number(month), 0).getDate();
          query = query
            .gte("tanggal_covernote", `${year}-${month}-01`)
            .lte("tanggal_covernote", `${year}-${month}-${last}`);
        }

        if (matchingIds) query = query.in("id", matchingIds);

        const from = targetPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const {
          data,
          count,
          error: queryError,
        } = await query
          .order("tanggal_covernote", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (queryError) throw queryError;

        const parentRows = data || [];
        let children = [];

        if (parentRows.length) {
          const { data: childData, error: childError } = await supabase
            .from("pending_notaris_agunan")
            .select(
              "id,pending_id,jenis_agunan,nomor_agunan,lokasi_agunan,lokasi_detail,proses,status_pengikatan,catatan,created_at",
            )
            .in(
              "pending_id",
              parentRows.map((x) => x.id),
            );

          if (childError) throw childError;
          children = childData || [];
        }

        const mapped = parentRows.map((item) => {
          const agunan = children.filter((a) => a.pending_id === item.id);
          return {
            ...item,
            agunan,
            progress: getProgress(agunan),
            notaris_nama:
              item.notaris?.nama_notaris || item.nama_notaris_manual || "-",
          };
        });

        setRows(mapped);
        setTotal(count || 0);
        setPage(targetPage);
      } catch (err) {
        console.error("Pending Notaris:", err);
        setError(err.message || "Gagal memuat data.");
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      unitId,
      debouncedSearch,
      cabangFilter,
      notarisFilter,
      dateFrom,
      dateTo,
      monthFilter,
      getParentIdsByChildFilter,
    ],
  );

  useEffect(() => {
    if (!unitId) return;
    setPage(0);
    loadData(0);
  }, [unitId, loadData]);

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      ...unitDefaults,
      agunan: [],
      nominal_pengikatan: "",
    });
    setShowForm(true);
  }

  async function openEdit(item) {
    const { data: parent, error: parentError } = await supabase
      .from("pending_notaris")
      .select("*")
      .eq("id", item.id)
      .eq("unit_id", unitId)
      .single();

    if (parentError) {
      alert(parentError.message);
      return;
    }

    const { data: children, error: childError } = await supabase
      .from("pending_notaris_agunan")
      .select("*")
      .eq("pending_id", item.id)
      .order("created_at", { ascending: true });

    if (childError) {
      alert(childError.message);
      return;
    }

    const cause = getCause(parent.penyebab_pending);

    setEditingId(item.id);
    setForm({
      ...EMPTY_FORM,
      ...unitDefaults,
      ...parent,
      tanggal_covernote: parent.tanggal_covernote || "",
      komitmen_bulan: parent.komitmen_bulan
        ? String(parent.komitmen_bulan)
        : "3",
      nominal_pengikatan: parent.nominal_pengikatan ?? "",
      limit_kredit: parent.limit_kredit ?? "",
      penyebab_pending: cause.type,
      penyebab_pending_detail: cause.detail,
      dokumen_pengikatan: "APHT",
      agunan: (children || []).map((x) => ({
        ...x,
        status_pengikatan: x.status_pengikatan || "PENDING",
        lokasi_agunan: x.lokasi_agunan || "Cabang",
        proses: x.proses || "CO_PROSES_ORDER",
      })),
    });

    setShowForm(true);
  }

  async function openDetail(item) {
    setDetailLoading(true);
    setSelected(null);
    setShowDetail(true);

    const { data: parent, error: parentError } = await supabase
      .from("pending_notaris")
      .select("*,notaris(id,nama_notaris,kabupaten)")
      .eq("id", item.id)
      .eq("unit_id", unitId)
      .single();

    if (parentError) {
      alert(parentError.message);
      setShowDetail(false);
      setDetailLoading(false);
      return;
    }

    const { data: children, error: childError } = await supabase
      .from("pending_notaris_agunan")
      .select("*")
      .eq("pending_id", item.id)
      .order("created_at", { ascending: true });

    if (childError) {
      alert(childError.message);
      setShowDetail(false);
      setDetailLoading(false);
      return;
    }

    const { data: history } = await supabase
      .from("pending_notaris_riwayat")
      .select("*")
      .eq("pending_id", item.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const agunan = children || [];
    setSelected({
      ...parent,
      agunan,
      history: history || [],
      progress: getProgress(agunan),
      notaris_nama:
        parent.notaris?.nama_notaris || parent.nama_notaris_manual || "-",
    });

    setDetailLoading(false);
  }

  function addAgunan() {
    setForm((prev) => ({
      ...prev,
      agunan: [
        ...prev.agunan,
        {
          id: null,
          pk_agunan_id: null,
          jenis_agunan: "",
          nomor_agunan: "",
          lokasi_agunan: "Cabang",
          lokasi_detail: "",
          proses: "CO_PROSES_ORDER",
          status_pengikatan: "PENDING",
          catatan: "",
        },
      ],
    }));
  }

  function updateAgunan(index, key, value) {
    setForm((prev) => ({
      ...prev,
      agunan: prev.agunan.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function removeAgunan(index) {
    setForm((prev) => ({
      ...prev,
      agunan: prev.agunan.filter((_, i) => i !== index),
    }));
  }

  async function saveForm(event) {
    event.preventDefault();

    if (!unitId) {
      alert("Unit aktif belum teridentifikasi.");
      return;
    }

    if (!txt(form.nama)) {
      alert("Nama debitur wajib diisi.");
      return;
    }

    if (!form.tanggal_covernote) {
      alert("Tanggal Covernote wajib diisi.");
      return;
    }

    if (!form.agunan.length) {
      alert("Tambahkan minimal satu detail agunan.");
      return;
    }

    if (
      form.penyebab_pending === "Lainnya" &&
      !txt(form.penyebab_pending_detail)
    ) {
      alert("Isi keterangan untuk penyebab Lainnya.");
      return;
    }

    setSaving(true);

    try {
      const nominal = calculateNominal(form.limit_kredit);
      const komitmenBulan = Number(form.komitmen_bulan || 3);
      const targetDate = addMonths(form.tanggal_covernote, komitmenBulan);
      const notaris = notarisList.find((x) => x.id === form.notaris_id);

      const cause =
        form.penyebab_pending === "Lainnya"
          ? `Lainnya: ${txt(form.penyebab_pending_detail)}`
          : "Proses Floating";

      const payload = {
        unit_id: unitId,
        pk_id: form.pk_id || null,
        region: txt(form.region) || null,
        area: txt(form.area) || null,
        cluster: txt(form.cluster) || null,
        mbu: txt(form.mbu) || null,
        kode_mbu: txt(form.kode_mbu) || null,
        cabang_reguler: txt(form.cabang_reguler) || null,
        kode_cabang: txt(form.kode_cabang) || null,
        cif: txt(form.cif) || null,
        norek: txt(form.norek) || null,
        nama: txt(form.nama),
        produk: txt(form.produk) || null,
        limit_kredit:
          form.limit_kredit === "" ? null : Number(form.limit_kredit),
        status_pending_pengikatan: "PENDING",
        nomor_covernote: txt(form.nomor_covernote) || null,
        tanggal_covernote: form.tanggal_covernote,
        notaris_id: form.notaris_id || null,
        nama_notaris_manual: notaris
          ? null
          : txt(form.nama_notaris_manual) || null,
        dokumen_pengikatan: "APHT",
        nominal_pengikatan: nominal === "" ? null : nominal,
        komitmen_bulan: komitmenBulan,
        komitmen_penyelesaian: targetDate || null,
        tahun_covernote: Number(
          form.tahun_covernote || form.tanggal_covernote.slice(0, 4),
        ),
        penyebab_pending: cause,
      };

      let parentId = editingId;

      if (editingId) {
        const { error: updateError } = await supabase
          .from("pending_notaris")
          .update(payload)
          .eq("id", editingId)
          .eq("unit_id", unitId);

        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("pending_notaris")
          .insert(payload)
          .select("id")
          .single();

        if (insertError) throw insertError;
        parentId = inserted.id;
      }

      const { data: oldChildren, error: oldError } = await supabase
        .from("pending_notaris_agunan")
        .select("*")
        .eq("pending_id", parentId);

      if (oldError) throw oldError;

      const oldList = oldChildren || [];
      const keepIds = form.agunan.map((x) => x.id).filter(Boolean);
      const removed = oldList.filter((x) => !keepIds.includes(x.id));

      if (removed.length) {
        const { error: deleteError } = await supabase
          .from("pending_notaris_agunan")
          .delete()
          .in(
            "id",
            removed.map((x) => x.id),
          )
          .eq("pending_id", parentId);

        if (deleteError) throw deleteError;
      }

      for (const a of form.agunan) {
        const childPayload = {
          pending_id: parentId,
          pk_agunan_id: a.pk_agunan_id || null,
          jenis_agunan: txt(a.jenis_agunan) || null,
          nomor_agunan: txt(a.nomor_agunan) || null,
          lokasi_agunan: a.lokasi_agunan || "Cabang",
          lokasi_detail: txt(a.lokasi_detail) || null,
          proses: a.proses || "CO_PROSES_ORDER",
          status_pengikatan: a.status_pengikatan || "PENDING",
          catatan: txt(a.catatan) || null,
        };

        if (a.id) {
          const old = oldList.find((x) => x.id === a.id);

          const { error: updateError } = await supabase
            .from("pending_notaris_agunan")
            .update(childPayload)
            .eq("id", a.id)
            .eq("pending_id", parentId);

          if (updateError) throw updateError;

          if (
            old &&
            (old.proses !== childPayload.proses ||
              old.status_pengikatan !== childPayload.status_pengikatan)
          ) {
            const historyNote = [
              old.proses !== childPayload.proses
                ? `Proses: ${getProsesLabel(old.proses)} → ${getProsesLabel(childPayload.proses)}`
                : "",
              old.status_pengikatan !== childPayload.status_pengikatan
                ? `Status Pengikatan: ${getStatusLabel(old.status_pengikatan)} → ${getStatusLabel(childPayload.status_pengikatan)}`
                : "",
            ]
              .filter(Boolean)
              .join("; ");

            const { error: historyError } = await supabase
              .from("pending_notaris_riwayat")
              .insert({
                pending_id: parentId,
                pending_agunan_id: a.id,
                proses_sebelumnya: old.proses,
                proses_baru: childPayload.proses,
                catatan: historyNote || childPayload.catatan,
              });

            if (historyError) throw historyError;
          }
        } else {
          const { data: insertedChild, error: childError } = await supabase
            .from("pending_notaris_agunan")
            .insert(childPayload)
            .select("id")
            .single();

          if (childError) throw childError;

          const { error: historyError } = await supabase
            .from("pending_notaris_riwayat")
            .insert({
              pending_id: parentId,
              pending_agunan_id: insertedChild.id,
              proses_sebelumnya: null,
              proses_baru: childPayload.proses,
              catatan: `Agunan ditambahkan. Status pengikatan: ${getStatusLabel(childPayload.status_pengikatan)}`,
            });

          if (historyError) throw historyError;
        }
      }

      setShowForm(false);
      setEditingId(null);
      await loadData(0);
    } catch (err) {
      console.error(err);
      alert(`Gagal menyimpan data: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item) {
    const yes = window.confirm(
      `Hapus monitoring Pending Notaris untuk ${item.nama}?\n\nDetail agunan dan riwayatnya juga akan dihapus.`,
    );
    if (!yes) return;

    const { error: deleteError } = await supabase
      .from("pending_notaris")
      .delete()
      .eq("id", item.id)
      .eq("unit_id", unitId);

    if (deleteError) {
      alert(`Gagal menghapus: ${deleteError.message}`);
      return;
    }

    setShowDetail(false);
    setShowForm(false);
    await loadData(0);
  }

  async function searchPK() {
    if (!unitId) return;
    setPkLoading(true);

    try {
      let query = supabase
        .from("pk")
        .select(
          "id,unit_id,cif,nama_debitur,nomor_pk,tanggal_pk,limit_kredit,rekening_kredit,jenis_pengajuan_kredit,notaris_id",
        )
        .eq("unit_id", unitId)
        .gt("limit_kredit", 200000000)
        .order("tanggal_pk", { ascending: false })
        .limit(30);

      if (pkSearch.trim()) {
        const safe = pkSearch.trim().replace(/[%,_]/g, " ");
        query = query.or(
          `nama_debitur.ilike.%${safe}%,cif.ilike.%${safe}%,rekening_kredit.ilike.%${safe}%,nomor_pk.ilike.%${safe}%`,
        );
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      setPkResults(data || []);
    } catch (err) {
      alert(`Gagal mencari PK: ${err.message}`);
    } finally {
      setPkLoading(false);
    }
  }

  async function choosePK(pk) {
    const { data: collateral, error: collateralError } = await supabase
      .from("pk_agunan")
      .select(
        "id,jenis_agunan,nomor_sertifikat,nomor_bpkb,lokasi_fisik,lokasi_keterangan,alamat_agunan,desa_kelurahan,kecamatan,kabupaten",
      )
      .eq("pk_id", pk.id)
      .order("urutan", { ascending: true });

    if (collateralError) {
      alert(collateralError.message);
      return;
    }

    const mapped = (collateral || []).map((a) => ({
      id: null,
      pk_agunan_id: a.id,
      jenis_agunan: a.jenis_agunan || "",
      nomor_agunan: a.nomor_sertifikat || a.nomor_bpkb || "",
      lokasi_agunan:
        a.lokasi_fisik === "NOTARIS"
          ? "Notaris"
          : a.lokasi_fisik === "DEBITUR"
            ? "Debitur"
            : "Cabang",
      lokasi_detail:
        a.lokasi_keterangan ||
        [a.alamat_agunan, a.desa_kelurahan, a.kecamatan, a.kabupaten]
          .filter(Boolean)
          .join(", "),
      proses: "CO_PROSES_ORDER",
      status_pengikatan: "PENDING",
      catatan: "",
    }));

    setForm((prev) => ({
      ...prev,
      pk_id: pk.id,
      cif: pk.cif || "",
      nama: pk.nama_debitur || "",
      norek: pk.rekening_kredit || "",
      produk: pk.jenis_pengajuan_kredit || "",
      limit_kredit: pk.limit_kredit ?? "",
      nominal_pengikatan: calculateNominal(pk.limit_kredit),
      notaris_id: pk.notaris_id || prev.notaris_id,
      agunan: mapped.length ? mapped : prev.agunan,
    }));

    setShowPicker(false);
    setShowForm(true);
  }

  async function handleExcelFile(file) {
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const raw = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: true,
      });

      if (!raw.length) {
        alert("File Excel tidak memiliki data.");
        return;
      }

      const parsed = raw.map((row) => {
        const normalized = {};
        Object.keys(row).forEach((key) => {
          normalized[normalizeHeader(key)] = row[key];
        });

        const get = (header) => normalized[normalizeHeader(header)] ?? "";
        const notarisName = txt(get("Nama Notaris"));
        const foundNotaris = notarisList.find(
          (x) =>
            txt(x.nama_notaris).toLowerCase() === notarisName.toLowerCase(),
        );

        const coverDate = excelDate(get("Tanggal Covernote"));
        const commitmentRaw = get("Komitmen Penyelesaian Notaris");
        const months = Number(commitmentRaw);

        const cause = getCause(get("Penyebab Belum Selesai / Masih Pending"));

        return {
          region: txt(get("Region")),
          area: txt(get("Area")),
          cluster: txt(get("Cluster")),
          mbu: txt(get("Mbu")),
          kode_mbu: txt(get("Kode Mbu")),
          cabang_reguler: txt(get("Cabang Reguler")),
          kode_cabang: txt(get("Kode Cabang")),
          cif: txt(get("CIFNO")),
          norek: txt(get("NOREK")),
          nama: txt(get("Nama")),
          produk: txt(get("Produk")),
          nomor_covernote: txt(get("Nomor Covernote")),
          tanggal_covernote: coverDate,
          notaris_id: foundNotaris?.id || "",
          nama_notaris_manual: foundNotaris ? "" : notarisName,
          nominal_pengikatan: parseRupiah(get("Nominal Pengikatan")),
          komitmen_bulan:
            months >= 1 && months <= 5 && Number.isInteger(months) ? months : 3,
          komitmen_penyelesaian: addMonths(
            coverDate,
            months >= 1 && months <= 5 ? months : 3,
          ),
          tahun_covernote:
            Number(get("Tahun Covernote")) ||
            (coverDate ? Number(coverDate.slice(0, 4)) : null),
          penyebab_pending:
            cause.type === "Lainnya"
              ? `Lainnya: ${cause.detail}`
              : "Proses Floating",
        };
      });

      const valid = parsed.filter((x) => x.nama);
      if (!valid.length) {
        alert("Kolom Nama tidak ditemukan atau seluruhnya kosong.");
        return;
      }

      setImportFile(file);
      setImportPreview(valid);
      setShowImport(true);
    } catch (err) {
      alert(`File tidak dapat dibaca: ${err.message}`);
    }
  }

  async function confirmImport() {
    if (!importPreview.length || !unitId) return;

    const yes = window.confirm(
      `Impor ${importPreview.length} baris ke unit ${currentUnit}?`,
    );
    if (!yes) return;

    setImporting(true);

    try {
      let inserted = 0;
      let skipped = 0;

      for (const item of importPreview) {
        let duplicateQuery = supabase
          .from("pending_notaris")
          .select("id")
          .eq("unit_id", unitId)
          .eq("nama", item.nama)
          .limit(1);

        if (item.norek) {
          duplicateQuery = duplicateQuery.eq("norek", item.norek);
        } else if (item.cif) {
          duplicateQuery = duplicateQuery.eq("cif", item.cif);
        }

        if (item.nomor_covernote) {
          duplicateQuery = duplicateQuery.eq(
            "nomor_covernote",
            item.nomor_covernote,
          );
        }

        const { data: duplicate, error: duplicateError } = await duplicateQuery;

        if (duplicateError) throw duplicateError;

        if (duplicate?.length) {
          skipped++;
          continue;
        }

        const parentPayload = {
          ...item,
          unit_id: unitId,
          pk_id: null,
          limit_kredit: null,
          region: item.region || unitDefaults.region,
          area: item.area || unitDefaults.area,
          cluster: item.cluster || unitDefaults.cluster,
          mbu: item.mbu || unitDefaults.mbu,
          kode_mbu: item.kode_mbu || unitDefaults.kode_mbu,
          cabang_reguler: item.cabang_reguler || unitDefaults.cabang_reguler,
          kode_cabang: item.kode_cabang || unitDefaults.kode_cabang,
          dokumen_pengikatan: "APHT",
          status_pending_pengikatan: "PENDING",
          nominal_pengikatan:
            item.nominal_pengikatan === "" ? null : item.nominal_pengikatan,
          komitmen_bulan: Number(item.komitmen_bulan || 3),
          tahun_covernote: item.tahun_covernote || null,
        };

        const { data: parent, error: parentError } = await supabase
          .from("pending_notaris")
          .insert(parentPayload)
          .select("id")
          .single();

        if (parentError) throw parentError;

        const { data: child, error: childError } = await supabase
          .from("pending_notaris_agunan")
          .insert({
            pending_id: parent.id,
            jenis_agunan: null,
            nomor_agunan: null,
            lokasi_agunan: "Cabang",
            lokasi_detail: null,
            proses: "CO_PROSES_ORDER",
            status_pengikatan: "PENDING",
            catatan: "Data hasil impor Excel. Lengkapi detail agunan.",
          })
          .select("id")
          .single();

        if (childError) throw childError;

        const { error: historyError } = await supabase
          .from("pending_notaris_riwayat")
          .insert({
            pending_id: parent.id,
            pending_agunan_id: child.id,
            proses_sebelumnya: null,
            proses_baru: "CO_PROSES_ORDER",
            catatan: "Data diimpor dari Excel",
          });

        if (historyError) throw historyError;

        inserted++;
      }

      alert(
        `Impor selesai.\nBerhasil: ${inserted}\nDilewati karena duplikat: ${skipped}`,
      );

      setShowImport(false);
      setImportPreview([]);
      setImportFile(null);
      await loadData(0);
    } catch (err) {
      console.error(err);
      alert(
        `Impor terhenti: ${err.message}\nData yang sudah berhasil dimasukkan tidak otomatis dibatalkan.`,
      );
    } finally {
      setImporting(false);
    }
  }

  async function getAllExportRows() {
    const output = [];
    let start = 0;

    while (true) {
      let query = supabase
        .from("pending_notaris")
        .select("*,notaris(nama_notaris)")
        .eq("unit_id", unitId)
        .order("tanggal_covernote", {
          ascending: false,
          nullsFirst: false,
        })
        .order("created_at", { ascending: false })
        .range(start, start + 499);

      if (notarisFilter) query = query.eq("notaris_id", notarisFilter);
      if (dateFrom) query = query.gte("tanggal_covernote", dateFrom);
      if (dateTo) query = query.lte("tanggal_covernote", dateTo);

      if (monthFilter) {
        const [year, month] = monthFilter.split("-");
        const last = new Date(Number(year), Number(month), 0).getDate();
        query = query
          .gte("tanggal_covernote", `${year}-${month}-01`)
          .lte("tanggal_covernote", `${year}-${month}-${last}`);
      }
      if (cabangFilter) {
        query = query.eq("cabang_reguler", cabangFilter);
      }

      if (debouncedSearch) {
        const safe = debouncedSearch.replace(/[%,_]/g, " ").trim();
        query = query.or(
          `nama.ilike.%${safe}%,cif.ilike.%${safe}%,norek.ilike.%${safe}%,nomor_covernote.ilike.%${safe}%,nama_notaris_manual.ilike.%${safe}%`,
        );
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      output.push(...(data || []));
      if (!data || data.length < 500) break;
      start += 500;
    }

    return output;
  }

  async function handleExport() {
    if (!unitId) return;
    setExporting(true);

    try {
      let parents = await getAllExportRows();

      if (exportMode === "MONTH") {
        if (!exportMonth) {
          alert("Pilih bulan ekspor terlebih dahulu.");
          return;
        }
        parents = parents.filter(
          (x) => x.tanggal_covernote?.slice(0, 7) === exportMonth,
        );
      }

      if (!parents.length) {
        alert("Tidak ada data untuk diekspor.");
        return;
      }

      const ids = parents.map((x) => x.id);
      const { data: children, error: childError } = await supabase
        .from("pending_notaris_agunan")
        .select("*")
        .in("pending_id", ids);

      if (childError) throw childError;

      const filteredParents = parents.filter((parent) => {
        const childList = (children || []).filter(
          (a) => a.pending_id === parent.id,
        );

        if (
          fisikFilter &&
          !childList.some((a) => a.lokasi_agunan === fisikFilter)
        )
          return false;

        if (processFilter && !childList.some((a) => a.proses === processFilter))
          return false;

        if (statusFilter && getProgress(childList) !== statusFilter) {
          return false;
        }

        return true;
      });

      if (!filteredParents.length) {
        alert("Tidak ada data sesuai filter untuk diekspor.");
        return;
      }

      const mainRows = [];
      const collateralRows = [];

      filteredParents.forEach((item) => {
        const childList = (children || []).filter(
          (a) => a.pending_id === item.id,
        );

        const progress = getProgress(childList);
        const cause = getCause(item.penyebab_pending);

        mainRows.push({
          Region: item.region,
          Area: item.area,
          Cluster: item.cluster,
          Mbu: item.mbu,
          "Kode Mbu": item.kode_mbu,
          "Cabang Reguler": item.cabang_reguler,
          "Kode Cabang": item.kode_cabang,
          CIFNO: item.cif,
          NOREK: item.norek,
          Nama: item.nama,
          Produk: item.produk,
          "Status Pending Pengikatan": progressLabel(progress),
          "Nomor Covernote": item.nomor_covernote,
          "Tanggal Covernote": item.tanggal_covernote,
          "Nama Notaris":
            item.notaris?.nama_notaris || item.nama_notaris_manual,
          "Dokumen Pengikatan": "APHT",
          "Nominal Pengikatan": item.nominal_pengikatan,
          "Komitmen Penyelesaian Notaris": item.komitmen_bulan
            ? `${item.komitmen_bulan} bulan`
            : "",
          "Tahun Covernote": item.tahun_covernote,
          "Penyebab Belum Selesai / Masih Pending":
            cause.type === "Lainnya"
              ? `Lainnya: ${cause.detail}`
              : "Proses Floating",
        });

        childList.forEach((a) => {
          collateralRows.push({
            Debitur: item.nama,
            CIF: item.cif,
            Rekening: item.norek,
            "Jenis Agunan": a.jenis_agunan,
            "Nomor Agunan": a.nomor_agunan,
            "Fisik Agunan": a.lokasi_agunan,
            "Detail Fisik Agunan": a.lokasi_detail,
            "Proses yang Harus Dilakukan": getProsesLabel(a.proses),
            "Status Pengikatan": getStatusLabel(a.status_pengikatan),
            Catatan: a.catatan,
          });
        });
      });

      const workbook = XLSX.utils.book_new();

      const mainSheet = XLSX.utils.json_to_sheet(mainRows, {
        header: EXCEL_HEADERS,
      });

      XLSX.utils.book_append_sheet(workbook, mainSheet, "Data Pending");
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(collateralRows),
        "Detail Agunan",
      );

      const suffix = exportMode === "MONTH" ? exportMonth : "Semua-Data";

      XLSX.writeFile(workbook, `Pending-Notaris-${currentUnit}-${suffix}.xlsx`);

      setShowExport(false);
    } catch (err) {
      alert(`Gagal ekspor: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, item) => {
          acc.total++;
          if (item.progress === "SELESAI") acc.selesai++;
          else if (item.progress === "SEBAGIAN") acc.sebagian++;
          else acc.pending++;
          return acc;
        },
        { total: 0, pending: 0, sebagian: 0, selesai: 0 },
      ),
    [rows],
  );

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startNumber = total ? page * PAGE_SIZE + 1 : 0;
  const endNumber = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className="w-full space-y-4 px-3 py-4 sm:px-5 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">
              Pending Notaris
            </h1>
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-600">
              {currentUnit}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Monitoring pengikatan dan fisik agunan.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700"
          >
            <Database size={15} /> Dari Database
          </button>
          <button
            onClick={openAdd}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 text-xs font-medium text-white"
          >
            <Plus size={15} /> Tambah Manual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Pending", summary.pending, "text-rose-600"],
          ["Sebagian", summary.sebagian, "text-amber-600"],
          ["Selesai", summary.selesai, "text-emerald-600"],
        ].map(([label, value, color]) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-3"
          >
            <div className="text-[10px] text-gray-500">{label}</div>
            <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Cari nama, CIF, rekening, covernote..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-gray-400 focus:bg-white"
            />
          </div>
          <button
            onClick={() => loadData(0, true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Muat ulang
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <Filter size={14} /> Filter data
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] text-white">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-[11px] text-gray-500"
            >
              Reset filter
            </button>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          <select
            value={cabangFilter}
            onChange={(e) => {
              setCabangFilter(e.target.value);
              setPage(0);
            }}
            className={selectClass}
          >
            <option value="">Semua Cabang</option>
            {cabangList.map((cabang) => (
              <option key={cabang.nama} value={cabang.nama}>
                {cabang.nama}
                {cabang.kode ? ` (${cabang.kode})` : ""}
              </option>
            ))}
          </select>
          <select
            value={notarisFilter}
            onChange={(e) => {
              setNotarisFilter(e.target.value);
              setPage(0);
            }}
            className={selectClass}
          >
            <option value="">Semua Notaris</option>
            {notarisList.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nama_notaris}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setDateFrom("");
              setDateTo("");
              setPage(0);
            }}
            className={inputClass}
            aria-label="Filter bulan covernote"
          />

          <select
            value={fisikFilter}
            onChange={(e) => {
              setFisikFilter(e.target.value);
              setPage(0);
            }}
            className={selectClass}
          >
            <option value="">Semua Fisik Agunan</option>
            {FISIK_AGUNAN.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            value={processFilter}
            onChange={(e) => {
              setProcessFilter(e.target.value);
              setPage(0);
            }}
            className={selectClass}
          >
            <option value="">Semua Proses</option>
            {PROSES.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Field label="Tanggal dari">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setMonthFilter("");
                setPage(0);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Tanggal sampai">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setMonthFilter("");
                setPage(0);
              }}
              className={inputClass}
            />
          </Field>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className={selectClass + " self-end"}
          >
            <option value="">Semua Status Pengikatan</option>
            <option value="PENDING">Pending</option>
            <option value="SEBAGIAN">Selesai Sebagian</option>
            <option value="SELESAI">Selesai</option>
          </select>
          <div className="flex items-end text-[11px] text-gray-400">
            Data unit {currentUnit}.
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* TABEL DESKTOP */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-50 text-left text-[11px] font-semibold text-gray-500">
              <tr>
                <th className="px-4 py-3">Debitur</th>
                <th className="px-4 py-3">No. Rekening</th>
                <th className="px-4 py-3">Covernote</th>
                <th className="px-4 py-3">Notaris</th>
                <th className="px-4 py-3">Agunan</th>
                <th className="px-4 py-3">Status Pengikatan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
                    Memuat data...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Belum ada data yang sesuai.
                  </td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openDetail(item)}
                    className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {item.nama}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-400">
                        CIF: {item.cif || "-"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {item.norek || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-700">
                        {item.nomor_covernote || "-"}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-400">
                        {formatTanggal(item.tanggal_covernote)}
                      </div>
                    </td>
                    <td className="max-w-[180px] px-4 py-3 text-gray-600">
                      <div className="truncate">
                        {item.notaris_nama ||
                          item.notaris?.nama_notaris ||
                          item.nama_notaris_manual ||
                          "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.agunan?.length || 0} agunan
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${progressClass(item.progress)}`}
                      >
                        {progressLabel(item.progress)}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteItem(item)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus"
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

      {/* KARTU MOBILE */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-xs text-gray-400">
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
            Memuat data...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-xs text-gray-400">
            Belum ada data yang sesuai.
          </div>
        ) : (
          rows.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => openDetail(item)}
              onKeyDown={(e) => e.key === "Enter" && openDetail(item)}
              className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm active:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900">
                    {item.nama}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    {item.norek || "Rekening belum diisi"}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${progressClass(item.progress)}`}
                >
                  {progressLabel(item.progress)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-2.5">
                <div>
                  <div className="text-[10px] text-gray-400">
                    Tanggal Covernote
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-gray-700">
                    {formatTanggal(item.tanggal_covernote)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Jumlah Agunan</div>
                  <div className="mt-0.5 text-xs font-medium text-gray-700">
                    {item.agunan?.length || 0} agunan
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-gray-400">Notaris</div>
                  <div className="mt-0.5 truncate text-xs text-gray-700">
                    {item.notaris_nama || item.nama_notaris_manual || "-"}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                  Lihat detail <ChevronRight size={13} />
                </span>
                <div
                  className="flex gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => openEdit(item)}
                    className="rounded-lg border border-gray-200 p-2 text-gray-600"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteItem(item)}
                    className="rounded-lg border border-gray-200 p-2 text-gray-600"
                    aria-label="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] text-gray-500">
          Menampilkan {startNumber}–{endNumber} dari {total} data
          <span className="ml-1 text-gray-400">(20 data per halaman)</span>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button
            disabled={page <= 0 || loading}
            onClick={() => loadData(page - 1)}
            className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="min-w-16 text-center text-xs text-gray-600">
            {page + 1} / {pageCount}
          </span>
          <button
            disabled={page + 1 >= pageCount || loading}
            onClick={() => loadData(page + 1)}
            className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      </div>

      {/* TOMBOL IMPORT EXPORT */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700">
          <Upload size={15} /> Import Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              handleExcelFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button
          onClick={() => setShowExport(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700"
        >
          <Download size={15} /> Export Excel
        </button>
      </div>

      {/* FORM TAMBAH / EDIT */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {editingId
                    ? "Edit Pending Notaris"
                    : "Tambah Pending Notaris"}
                </h2>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Unit {currentUnit}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={saveForm}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="space-y-5 p-4 sm:p-5">
                {!editingId && (
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Database size={15} /> Ambil data debitur dari database
                    JOSJIS
                  </button>
                )}

                <section>
                  <h3 className="mb-3 text-xs font-semibold text-gray-900">
                    Informasi debitur
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Nama Debitur *" className="sm:col-span-2">
                      <input
                        required
                        value={form.nama}
                        onChange={(e) => updateForm("nama", e.target.value)}
                        className={inputClass}
                        placeholder="Nama lengkap debitur"
                      />
                    </Field>
                    <Field label="CIF">
                      <input
                        value={form.cif || ""}
                        onChange={(e) => updateForm("cif", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Nomor Rekening Pinjaman">
                      <input
                        value={form.norek || ""}
                        onChange={(e) => updateForm("norek", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Produk">
                      <input
                        value={form.produk || ""}
                        onChange={(e) => updateForm("produk", e.target.value)}
                        className={inputClass}
                        placeholder="KUR / KUM / lainnya"
                      />
                    </Field>
                    <Field label="Limit Kredit">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.limit_kredit ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateForm("limit_kredit", value);
                          updateForm(
                            "nominal_pengikatan",
                            calculateNominal(value),
                          );
                        }}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </section>

                <section className="border-t border-gray-100 pt-4">
                  <h3 className="mb-3 text-xs font-semibold text-gray-900">
                    Informasi Covernote dan Notaris
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Nomor Covernote">
                      <input
                        value={form.nomor_covernote || ""}
                        onChange={(e) =>
                          updateForm("nomor_covernote", e.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Tanggal Covernote *">
                      <input
                        required
                        type="date"
                        value={form.tanggal_covernote || ""}
                        onChange={(e) => {
                          const date = e.target.value;
                          updateForm("tanggal_covernote", date);
                          updateForm("tahun_covernote", date.slice(0, 4));
                          updateForm(
                            "komitmen_penyelesaian",
                            addMonths(date, Number(form.komitmen_bulan || 3)),
                          );
                        }}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Nama Notaris">
                      <select
                        value={form.notaris_id || ""}
                        onChange={(e) => {
                          updateForm("notaris_id", e.target.value);
                          if (e.target.value)
                            updateForm("nama_notaris_manual", "");
                        }}
                        className={selectClass}
                      >
                        <option value="">Pilih notaris</option>
                        {notarisList.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.nama_notaris}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Nama Notaris Manual (jika belum terdaftar)">
                      <input
                        value={form.nama_notaris_manual || ""}
                        onChange={(e) => {
                          updateForm("nama_notaris_manual", e.target.value);
                          if (e.target.value) updateForm("notaris_id", "");
                        }}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Dokumen Pengikatan">
                      <input
                        value="APHT"
                        readOnly
                        className={`${inputClass} bg-gray-50 font-semibold`}
                      />
                    </Field>
                    <Field label="Nominal Pengikatan (otomatis)">
                      <input
                        value={
                          form.nominal_pengikatan === ""
                            ? ""
                            : formatRupiah(form.nominal_pengikatan)
                        }
                        readOnly
                        className={`${inputClass} bg-gray-50 font-semibold`}
                      />
                      <p className="mt-1 text-[10px] text-gray-400">
                        Limit kredit × 125%, dibulatkan ke atas.
                      </p>
                    </Field>
                    <Field label="Komitmen Penyelesaian Notaris">
                      <select
                        value={form.komitmen_bulan || "3"}
                        onChange={(e) => {
                          const months = Number(e.target.value);
                          updateForm("komitmen_bulan", String(months));
                          updateForm(
                            "komitmen_penyelesaian",
                            addMonths(form.tanggal_covernote, months),
                          );
                        }}
                        className={selectClass}
                      >
                        {KOMITMEN_BULAN.map((n) => (
                          <option key={n} value={n}>
                            {n} bulan
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[10px] text-gray-400">
                        Target: {formatTanggal(form.komitmen_penyelesaian)}
                      </p>
                    </Field>
                    <Field label="Tahun Covernote">
                      <input
                        type="number"
                        value={form.tahun_covernote || ""}
                        onChange={(e) =>
                          updateForm("tahun_covernote", e.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field
                      label="Penyebab Belum Selesai"
                      className="sm:col-span-2"
                    >
                      <select
                        value={form.penyebab_pending || "Proses Floating"}
                        onChange={(e) =>
                          updateForm("penyebab_pending", e.target.value)
                        }
                        className={selectClass}
                      >
                        <option value="Proses Floating">Proses Floating</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </Field>
                    {form.penyebab_pending === "Lainnya" && (
                      <Field
                        label="Keterangan Penyebab"
                        className="sm:col-span-2"
                      >
                        <textarea
                          rows={3}
                          value={form.penyebab_pending_detail || ""}
                          onChange={(e) =>
                            updateForm(
                              "penyebab_pending_detail",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                          placeholder="Tuliskan penyebab lainnya..."
                        />
                      </Field>
                    )}
                  </div>
                </section>

                <section className="border-t border-gray-100 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900">
                        Detail Agunan
                      </h3>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        Status dan proses dicatat untuk setiap agunan.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addAgunan}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700"
                    >
                      <Plus size={14} /> Tambah Agunan
                    </button>
                  </div>

                  {form.agunan.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-xs text-gray-400">
                      Belum ada detail agunan.
                    </div>
                  )}

                  <div className="space-y-3">
                    {form.agunan.map((a, index) => (
                      <div
                        key={a.id || `new-${index}`}
                        className="rounded-xl border border-gray-200 bg-gray-50/70 p-3"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">
                            Agunan {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAgunan(index)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Jenis Agunan">
                            <input
                              value={a.jenis_agunan || ""}
                              onChange={(e) =>
                                updateAgunan(
                                  index,
                                  "jenis_agunan",
                                  e.target.value,
                                )
                              }
                              className={inputClass}
                              placeholder="SHM / BPKB / lainnya"
                            />
                          </Field>
                          <Field label="Nomor Agunan">
                            <input
                              value={a.nomor_agunan || ""}
                              onChange={(e) =>
                                updateAgunan(
                                  index,
                                  "nomor_agunan",
                                  e.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>
                          <Field label="Fisik Agunan">
                            <select
                              value={a.lokasi_agunan || "Cabang"}
                              onChange={(e) =>
                                updateAgunan(
                                  index,
                                  "lokasi_agunan",
                                  e.target.value,
                                )
                              }
                              className={selectClass}
                            >
                              {FISIK_AGUNAN.map((x) => (
                                <option key={x} value={x}>
                                  {x}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Status Pengikatan">
                            <select
                              value={a.status_pengikatan || "PENDING"}
                              onChange={(e) =>
                                updateAgunan(
                                  index,
                                  "status_pengikatan",
                                  e.target.value,
                                )
                              }
                              className={selectClass}
                            >
                              {STATUS_PENGIKATAN.map((x) => (
                                <option key={x.value} value={x.value}>
                                  {x.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field
                            label="Proses yang Harus Dilakukan"
                            className="sm:col-span-2"
                          >
                            <select
                              value={a.proses || "CO_PROSES_ORDER"}
                              onChange={(e) =>
                                updateAgunan(index, "proses", e.target.value)
                              }
                              className={selectClass}
                            >
                              {PROSES.map((x) => (
                                <option key={x.value} value={x.value}>
                                  {x.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field
                            label="Detail Fisik Agunan"
                            className="sm:col-span-2"
                          >
                            <input
                              value={a.lokasi_detail || ""}
                              onChange={(e) =>
                                updateAgunan(
                                  index,
                                  "lokasi_detail",
                                  e.target.value,
                                )
                              }
                              className={inputClass}
                              placeholder="Keterangan lokasi fisik agunan"
                            />
                          </Field>
                          <Field label="Catatan" className="sm:col-span-2">
                            <textarea
                              rows={2}
                              value={a.catatan || ""}
                              onChange={(e) =>
                                updateAgunan(index, "catatan", e.target.value)
                              }
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="border-t border-gray-100 pt-4">
                  <h3 className="mb-2 text-xs font-semibold text-gray-900">
                    Informasi Wilayah
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["region", "Region"],
                      ["area", "Area"],
                      ["cluster", "Cluster"],
                      ["mbu", "Mbu"],
                      ["kode_mbu", "Kode Mbu"],
                      ["cabang_reguler", "Cabang Reguler"],
                      ["kode_cabang", "Kode Cabang"],
                    ].map(([key, label]) => (
                      <Field key={key} label={label}>
                        <input
                          value={form[key] || ""}
                          readOnly
                          className={`${inputClass} bg-gray-50 text-gray-600`}
                        />
                      </Field>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400">
                    Informasi wilayah mengikuti unit aktif dan tidak dapat
                    diubah dari form.
                  </p>
                </section>
              </div>

              <div className="sticky bottom-0 flex gap-2 border-t border-gray-200 bg-white p-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="h-10 flex-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  {saving ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Detail Pending Notaris
                </h2>
                <p className="text-[11px] text-gray-500">
                  {selected?.nama || "Memuat detail..."}
                </p>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {detailLoading || !selected ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  <Loader2 size={20} className="mx-auto mb-2 animate-spin" />{" "}
                  Memuat detail...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {selected.nama}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        CIF {selected.cif || "-"} · Rekening{" "}
                        {selected.norek || "-"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${progressClass(selected.progress)}`}
                    >
                      {progressLabel(selected.progress)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-3">
                    {[
                      ["Nomor Covernote", selected.nomor_covernote],
                      [
                        "Tanggal Covernote",
                        formatTanggal(selected.tanggal_covernote),
                      ],
                      [
                        "Notaris",
                        selected.notaris?.nama_notaris ||
                          selected.nama_notaris_manual,
                      ],
                      ["Dokumen Pengikatan", "APHT"],
                      ["Limit Kredit", formatRupiah(selected.limit_kredit)],
                      [
                        "Nominal Pengikatan",
                        formatRupiah(selected.nominal_pengikatan),
                      ],
                      [
                        "Komitmen",
                        selected.komitmen_bulan
                          ? `${selected.komitmen_bulan} bulan`
                          : "-",
                      ],
                      [
                        "Target Penyelesaian",
                        formatTanggal(selected.komitmen_penyelesaian),
                      ],
                      ["Produk", selected.produk],
                      ["Tahun", selected.tahun_covernote],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <div className="text-[10px] text-gray-400">{label}</div>
                        <div className="mt-1 break-words text-xs font-medium text-gray-700">
                          {value || "-"}
                        </div>
                      </div>
                    ))}
                  </div>

                  <section>
                    <h4 className="mb-2 text-xs font-semibold text-gray-900">
                      Detail Agunan ({selected.agunan.length})
                    </h4>
                    <div className="space-y-2">
                      {selected.agunan.map((a, i) => (
                        <div
                          key={a.id}
                          className="rounded-xl border border-gray-200 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-semibold text-gray-800">
                                {i + 1}. {a.jenis_agunan || "Agunan"}
                              </div>
                              <div className="mt-1 text-[11px] text-gray-500">
                                Nomor: {a.nomor_agunan || "-"}
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${a.status_pengikatan === "SELESAI" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                            >
                              {getStatusLabel(a.status_pengikatan)}
                            </span>
                          </div>
                          <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
                            <div>
                              <div className="text-[10px] text-gray-400">
                                Fisik Agunan
                              </div>
                              <div className="text-xs text-gray-700">
                                {a.lokasi_agunan || "-"}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-400">
                                Detail Fisik Agunan
                              </div>
                              <div className="text-xs text-gray-700">
                                {a.lokasi_detail || "-"}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-400">
                                Proses yang Harus Dilakukan
                              </div>
                              <div className="text-xs font-medium text-gray-700">
                                {getProsesLabel(a.proses)}
                              </div>
                            </div>
                            {a.catatan && (
                              <p className="text-[11px] text-gray-500">
                                {a.catatan}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="border-t border-gray-100 pt-3">
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-900">
                      <History size={14} /> Riwayat Proses
                    </h4>
                    {!selected.history?.length ? (
                      <p className="text-xs text-gray-400">
                        Belum ada riwayat perubahan.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selected.history.map((h) => (
                          <div
                            key={h.id}
                            className="border-l-2 border-gray-200 pl-3"
                          >
                            <div className="text-xs font-medium text-gray-700">
                              {getProsesLabel(h.proses_baru)}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {new Date(h.created_at).toLocaleString("id-ID")}
                            </div>
                            {h.catatan && (
                              <div className="text-[11px] text-gray-500">
                                {h.catatan}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {selected.penyebab_pending && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <div className="text-[11px] font-semibold text-amber-800">
                        Penyebab Belum Selesai
                      </div>
                      <p className="mt-1 text-xs leading-5 text-amber-900">
                        {selected.penyebab_pending}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selected && (
              <div className="flex gap-2 border-t border-gray-200 p-3">
                <button
                  onClick={() => deleteItem(selected)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-600"
                >
                  <Trash2 size={14} /> Hapus
                </button>
                <button
                  onClick={() => {
                    setShowDetail(false);
                    openEdit(selected);
                  }}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 text-xs font-semibold text-white"
                >
                  <Pencil size={14} /> Edit Data
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PILIH DATA PK */}
      {showPicker && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Pilih Data PK
                </h2>
                <p className="text-[11px] text-gray-500">
                  Hanya data unit {currentUnit}.
                </p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="rounded-lg p-2 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="border-b border-gray-100 p-3">
              <div className="flex gap-2">
                <input
                  value={pkSearch}
                  onChange={(e) => setPkSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchPK()}
                  placeholder="Cari nama / CIF / rekening / nomor PK..."
                  className={inputClass}
                />
                <button
                  onClick={searchPK}
                  className="h-10 rounded-lg bg-gray-900 px-4 text-xs font-medium text-white"
                >
                  Cari
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {pkLoading ? (
                <div className="py-10 text-center text-xs text-gray-400">
                  <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
                  Mencari data...
                </div>
              ) : pkResults.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-400">
                  Masukkan kata kunci lalu tekan Cari.
                </div>
              ) : (
                <div className="space-y-2">
                  {pkResults.map((pk) => (
                    <button
                      key={pk.id}
                      onClick={() => choosePK(pk)}
                      className="w-full rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50"
                    >
                      <div className="text-sm font-semibold text-gray-900">
                        {pk.nama_debitur}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        CIF {pk.cif || "-"} · Rekening{" "}
                        {pk.rekening_kredit || "-"}
                      </div>
                      <div className="mt-1 flex justify-between gap-2 text-[11px] text-gray-500">
                        <span>PK: {pk.nomor_pk || "-"}</span>
                        <span>{formatTanggal(pk.tanggal_pk)}</span>
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-gray-700">
                        Limit: {formatRupiah(pk.limit_kredit)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW IMPORT */}
      {showImport && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Pratinjau Import Excel
                </h2>
                <p className="text-[11px] text-gray-500">
                  {importFile?.name} · {importPreview.length} baris valid
                </p>
              </div>
              <button
                onClick={() => setShowImport(false)}
                className="rounded-lg p-2 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="mb-3 rounded-lg bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
                Setiap baris Excel dibuat menjadi satu data monitoring dengan
                satu detail agunan awal. Jenis dan nomor agunan dapat dilengkapi
                setelah impor. Dokumen pengikatan ditetapkan APHT.
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[800px] text-xs">
                  <thead className="bg-gray-50 text-left text-[10px] text-gray-500">
                    <tr>
                      {[
                        "Nama",
                        "CIF",
                        "Rekening",
                        "Covernote",
                        "Tanggal",
                        "Notaris",
                        "Nominal",
                      ].map((x) => (
                        <th key={x} className="p-2">
                          {x}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 100).map((x, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="p-2 font-medium">{x.nama}</td>
                        <td className="p-2">{x.cif || "-"}</td>
                        <td className="p-2">{x.norek || "-"}</td>
                        <td className="p-2">{x.nomor_covernote || "-"}</td>
                        <td className="p-2">
                          {formatTanggal(x.tanggal_covernote)}
                        </td>
                        <td className="p-2">
                          {x.nama_notaris_manual || "Notaris terdaftar"}
                        </td>
                        <td className="p-2">
                          {formatRupiah(x.nominal_pengikatan)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importPreview.length > 100 && (
                <p className="mt-2 text-[10px] text-gray-400">
                  Menampilkan 100 baris pertama.
                </p>
              )}
            </div>
            <div className="flex gap-2 border-t border-gray-200 p-3">
              <button
                onClick={() => setShowImport(false)}
                className="h-10 flex-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700"
              >
                Batal
              </button>
              <button
                disabled={importing}
                onClick={confirmImport}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 text-xs font-semibold text-white disabled:opacity-50"
              >
                {importing && <Loader2 size={14} className="animate-spin" />}
                {importing ? "Mengimpor..." : "Konfirmasi Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXPORT */}
      {showExport && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Ekspor Data Pending Notaris
              </h2>
              <button
                onClick={() => setShowExport(false)}
                className="rounded-lg p-2 text-gray-500"
              >
                <X size={17} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  type="radio"
                  checked={exportMode === "FILTERED"}
                  onChange={() => setExportMode("FILTERED")}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-xs font-semibold text-gray-800">
                    Semua hasil filter saat ini
                  </span>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    Mengikuti unit aktif, pencarian, dan filter.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  type="radio"
                  checked={exportMode === "MONTH"}
                  onChange={() => setExportMode("MONTH")}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-xs font-semibold text-gray-800">
                    Berdasarkan bulan covernote
                  </span>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    Ekspor seluruh data pada bulan terpilih.
                  </span>
                </span>
              </label>
              {exportMode === "MONTH" && (
                <Field label="Pilih bulan">
                  <input
                    type="month"
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowExport(false)}
                className="h-10 flex-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700"
              >
                Batal
              </button>
              <button
                disabled={exporting}
                onClick={handleExport}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 text-xs font-semibold text-white disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={14} />
                )}
                {exporting ? "Menyiapkan..." : "Ekspor Excel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
