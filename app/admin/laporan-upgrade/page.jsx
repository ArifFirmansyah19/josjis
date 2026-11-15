"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Check,
  ClipboardList,
  Users,
  Wallet,
  ChevronDown,
  AlertTriangle,
  FileSpreadsheet,
  X,
  MessageCircle,
  ExternalLink,
  Eye,
  Save,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useUnit } from "@/components/UnitContext";

const CATEGORY_GROUPS = [
  {
    label: "UPDATE KUALITAS",
    options: [
      { value: "UP_TO_1", label: "Up to 01" },
      { value: "RESTRU", label: "Restru" },
      { value: "DEBET_AGF", label: "Pendebetan AGF" },
      { value: "EASYCALL", label: "Easy Call 2A" },
      { value: "LUNAS", label: "Lunas" },
    ],
  },
  {
    label: "UPGRADE NPL - KUM",
    options: [
      { value: "NPL_DOWN_TO_03", label: "Down to 03" },
      { value: "NPL_UP_TO_2", label: "Up to 2" },
      { value: "NPL_LUNAS_SUBRO", label: "Lunas/Subro" },
      { value: "NPL_RESTRU", label: "Restru" },
    ],
  },
  {
    label: "UPGRADE NPL - KUR",
    options: [
      { value: "NPL_UP_TO_1", label: "Up to 01" },
      { value: "NPL_RESTRU", label: "Restru" },
      { value: "NPL_DEBET_AGF", label: "Pendebetan AGF" },
      { value: "NPL_EASYCALL", label: "Easy Call 2A" },
      { value: "NPL_LUNAS", label: "Lunas" },
    ],
  },
];

const CATEGORY_LABEL = Object.fromEntries(
  CATEGORY_GROUPS.flatMap((group) =>
    group.options.map((option) => [option.value, option.label]),
  ),
);

const PRODUCT_INDEX = 14;
const ACCOUNT_INDEX = 5;
const NAME_INDEX = 6;
const BADE_INDEX = 8;
const TOTAL_TAGIHAN_INDEX = 24;
const AGF_INDEX = 25;
const MKS_INDEX = 30;

const QUALITY_CATEGORIES = [
  ["UP_TO_1", "Up to 01"],
  ["RESTRU", "Restru"],
  ["DEBET_AGF", "Pendebetan AGF"],
  ["EASYCALL", "Easy Call 2A"],
  ["LUNAS", "Lunas"],
];

const NPL_KUM_CATEGORIES = [
  ["NPL_DOWN_TO_03", "Down to 03"],
  ["NPL_UP_TO_2", "Up to 2"],
  ["NPL_LUNAS_SUBRO", "Lunas/Subro"],
  ["NPL_RESTRU", "Restru"],
];

const NPL_KUR_CATEGORIES = [
  ["NPL_UP_TO_1", "Up to 01"],
  ["NPL_RESTRU", "Restru"],
  ["NPL_DEBET_AGF", "Pendebetan AGF"],
  ["NPL_EASYCALL", "Easy Call 2A"],
  ["NPL_LUNAS", "Lunas"],
];

function getJakartaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value === null || value === undefined || value === "") return 0;

  const cleaned = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

// BADE dari Excel/Supabase sudah dalam satuan Juta.
function formatJuta(value) {
  return `Rp ${formatNumber(value)} Juta`;
}

function clean(value) {
  return String(value ?? "").trim();
}

function getProduct(row) {
  const product = clean(row?.[PRODUCT_INDEX]).toUpperCase();

  if (product.includes("KUM")) return "KUM";
  if (product.includes("KUR")) return "KUR";

  return "LAINNYA";
}

function getRowKey(recordId, index) {
  return `${recordId}:${index}`;
}

function getRowData(record, index, row) {
  return {
    key: getRowKey(record.id, index),
    record_id: record.id,
    row_index: index,
    unit_id: record.unit_id,
    tanggal_data: record.tanggal_data,
    sumber_data: record.jenis_data,
    nama: clean(row?.[NAME_INDEX]) || "Nama tidak tersedia",
    rekening: clean(row?.[ACCOUNT_INDEX]),
    rekening_agf: clean(row?.[AGF_INDEX]),
    bade: toNumber(row?.[BADE_INDEX]),
    total_tagihan: toNumber(row?.[TOTAL_TAGIHAN_INDEX]),
    produk: getProduct(row),
    mks: clean(row?.[MKS_INDEX]) || "MKS tidak diketahui",
  };
}

function getSelection(row, selections) {
  return (
    selections[row.key] || {
      kategori: null,
      perlu_diperiksa: false,
      catatan: "",
    }
  );
}

function getDisplayDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00+07:00`));
}

function getSummary(rows, selections) {
  const result = {
    total: { count: 0, bade: 0 },
    updated: { count: 0, bade: 0 },
    review: { count: 0, bade: 0 },
  };

  rows.forEach((row) => {
    const selection = getSelection(row, selections);

    result.total.count += 1;
    result.total.bade += row.bade;

    if (selection.perlu_diperiksa) {
      result.review.count += 1;
      result.review.bade += row.bade;
      return;
    }

    if (selection.kategori) {
      result.updated.count += 1;
      result.updated.bade += row.bade;
    }
  });

  return result;
}

function getCategoryStats(rows, selections, product, categories) {
  return categories.map(([key, label]) => {
    const selected = rows.filter((row) => {
      const selection = getSelection(row, selections);

      return (
        row.produk === product &&
        selection.kategori === key &&
        !selection.perlu_diperiksa
      );
    });

    return {
      key,
      label,
      count: selected.length,
      bade: selected.reduce((sum, row) => sum + row.bade, 0),
    };
  });
}

function SummaryTile({ title, count, amount, icon: Icon, subtitle }) {
  return (
    <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-500">{title}</p>
        <div className="rounded-xl bg-zinc-100 p-2">
          <Icon className="h-4 w-4 text-zinc-600" />
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">
        {formatNumber(count)}
        <span className="ml-1 text-xs font-medium text-zinc-400">NoA</span>
      </p>

      <p className="mt-1 text-sm font-bold text-blue-700">
        {formatJuta(amount)}
      </p>

      {subtitle && <p className="mt-1 text-[11px] text-zinc-400">{subtitle}</p>}
    </div>
  );
}

function StatusBadge({ selection }) {
  if (selection.perlu_diperiksa) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
        Perlu diperiksa
      </span>
    );
  }

  if (selection.kategori) {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-800">
        {CATEGORY_LABEL[selection.kategori] || selection.kategori}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-500">
      Belum dipilih
    </span>
  );
}

function DebtorDetailModal({
  row,
  selection,
  onClose,
  onCategoryChange,
  onReviewChange,
  onNoteChange,
  saving,
}) {
  const [note, setNote] = useState(selection.catatan || "");

  useEffect(() => {
    setNote(selection.catatan || "");
  }, [row.key, selection.catatan]);

  if (!row) return null;

  const isReview = selection.perlu_diperiksa;

  const saveNote = () => {
    if (note !== (selection.catatan || "")) {
      onNoteChange(row, note);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-zinc-200 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Detail debitur
            </p>
            <h2 className="mt-1 break-words text-lg font-bold text-zinc-900">
              {row.nama}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {row.mks} · {row.produk} ·{" "}
              {row.sumber_data === "DUA_A" ? "Data 2A" : "Easycall"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            aria-label="Tutup detail"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[10px] font-semibold uppercase text-zinc-400">
                MKS
              </p>
              <p className="mt-1 text-sm font-bold text-zinc-900">{row.mks}</p>
            </div>

            <div className="min-w-0 rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] font-semibold uppercase text-zinc-400">
                Rekening Pinjaman
              </p>
              <p className="mt-1 break-all text-xs font-semibold text-zinc-800">
                {row.rekening || "-"}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] font-semibold uppercase text-zinc-400">
                Rekening AGF
              </p>
              <p className="mt-1 break-all text-xs font-semibold text-zinc-800">
                {row.rekening_agf || "-"}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[10px] font-semibold uppercase text-blue-600">
                BADE
              </p>
              <p className="mt-1 text-base font-bold text-blue-800">
                {formatJuta(row.bade)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[10px] font-semibold uppercase text-zinc-400">
                Total Tagihan
              </p>
              <p className="mt-1 text-base font-bold text-zinc-900">
                {formatRupiah(row.total_tagihan)}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-zinc-700">
              Pilih kategori update
            </label>

            <div className="relative">
              <select
                value={selection.kategori || ""}
                disabled={saving || isReview}
                onChange={(event) =>
                  onCategoryChange(row, event.target.value || null)
                }
                className="h-12 w-full appearance-none rounded-xl border border-zinc-300 bg-white px-3 pr-10 text-sm font-semibold text-zinc-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100 disabled:opacity-60"
              >
                <option value="">Belum ada kategori</option>

                {CATEGORY_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-4 h-4 w-4 text-zinc-400" />
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={Boolean(isReview)}
                disabled={saving}
                onChange={(event) => onReviewChange(row, event.target.checked)}
                className="h-5 w-5 rounded accent-amber-600"
              />
              <span className="text-sm font-bold text-amber-900">
                Tandai perlu pemeriksaan
              </span>
            </label>

            {isReview && (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-semibold text-amber-900">
                  Catatan pemeriksaan
                </label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  onBlur={saveNote}
                  disabled={saving}
                  rows={3}
                  placeholder="Tuliskan alasan atau catatan pemeriksaan..."
                  className="w-full resize-y rounded-xl border border-amber-300 bg-white p-3 text-sm text-zinc-800 outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-zinc-400">
                Status saat ini
              </p>
              <div className="mt-1">
                <StatusBadge selection={selection} />
              </div>
            </div>

            {saving && (
              <span className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-zinc-200 bg-white p-4 sm:px-6">
          <button
            type="button"
            onClick={() => {
              saveNote();
              onClose();
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 text-sm font-bold text-white hover:bg-blue-800"
          >
            <Check className="h-4 w-4" />
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LaporanUpgradePage() {
  const { activeUnit } = useUnit();

  const [unitId, setUnitId] = useState("");
  const [unitName, setUnitName] = useState("");
  const [twoARecords, setTwoARecords] = useState([]);
  const [easyCallRecords, setEasyCallRecords] = useState([]);
  const [selections, setSelections] = useState({});
  const [mksFilter, setMksFilter] = useState("SEMUA");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("DUA_A");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [detailRowKey, setDetailRowKey] = useState("");

  const today = getJakartaDate();

  const loadData = useCallback(async () => {
    if (!activeUnit?.code) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: units, error: unitError } = await supabase
        .from("unit")
        .select("id,nama_unit,kode_unit,kode_legacy");

      if (unitError) throw unitError;

      const activeCode = String(activeUnit.code).toUpperCase();

      const unit = (units || []).find(
        (item) =>
          String(item.kode_unit || "").toUpperCase() === activeCode ||
          String(item.kode_legacy || "").toUpperCase() === activeCode,
      );

      if (!unit?.id) {
        throw new Error(
          `Unit ${activeUnit.code} tidak ditemukan pada master unit.`,
        );
      }

      setUnitId(unit.id);
      setUnitName(unit.nama_unit || activeUnit.name || activeUnit.code);

      const { data: records, error: recordsError } = await supabase
        .from("raportmu_hasil")
        .select(
          "id,unit_id,mks_id,jenis_data,tanggal_data,data,total_rows,nama_file,updated_at",
        )
        .eq("unit_id", unit.id)
        .eq("tanggal_data", today)
        .in("jenis_data", ["DUA_A", "EASYCALL"])
        .order("updated_at", { ascending: false });

      if (recordsError) throw recordsError;

      const allRecords = records || [];

      setTwoARecords(allRecords.filter((item) => item.jenis_data === "DUA_A"));
      setEasyCallRecords(
        allRecords.filter((item) => item.jenis_data === "EASYCALL"),
      );

      const recordIds = allRecords.map((item) => item.id);

      if (recordIds.length) {
        const { data: savedSelections, error: selectionError } = await supabase
          .from("laporan_upgrade_pilihan")
          .select("record_id,row_index,kategori,perlu_diperiksa,catatan")
          .in("record_id", recordIds);

        if (selectionError) throw selectionError;

        const mapped = {};

        (savedSelections || []).forEach((item) => {
          mapped[getRowKey(item.record_id, item.row_index)] = {
            kategori: item.kategori,
            perlu_diperiksa: Boolean(item.perlu_diperiksa),
            catatan: item.catatan || "",
          };
        });

        setSelections(mapped);
      } else {
        setSelections({});
      }
    } catch (err) {
      console.error("Gagal memuat Laporan Upgrade:", err);
      setError(err?.message || "Gagal memuat data Laporan Upgrade.");
      setTwoARecords([]);
      setEasyCallRecords([]);
      setSelections({});
    } finally {
      setLoading(false);
    }
  }, [activeUnit?.code, activeUnit?.name, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const twoARows = useMemo(
    () =>
      twoARecords.flatMap((record) => {
        const rows = Array.isArray(record.data) ? record.data : [];
        return rows.map((row, index) => getRowData(record, index, row));
      }),
    [twoARecords],
  );

  const easyCallRows = useMemo(
    () =>
      easyCallRecords.flatMap((record) => {
        const rows = Array.isArray(record.data) ? record.data : [];
        return rows.map((row, index) => getRowData(record, index, row));
      }),
    [easyCallRecords],
  );

  const allRows = useMemo(
    () => [...twoARows, ...easyCallRows],
    [twoARows, easyCallRows],
  );

  const mksOptions = useMemo(
    () =>
      [...new Set(twoARows.map((row) => row.mks))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "id")),
    [twoARows],
  );

  const filteredTwoA = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return twoARows.filter((row) => {
      const matchesMks = mksFilter === "SEMUA" || row.mks === mksFilter;

      const matchesSearch =
        !keyword ||
        row.nama.toLowerCase().includes(keyword) ||
        row.mks.toLowerCase().includes(keyword) ||
        row.rekening.toLowerCase().includes(keyword) ||
        row.rekening_agf.toLowerCase().includes(keyword);

      return matchesMks && matchesSearch;
    });
  }, [twoARows, mksFilter, search]);

  const filteredEasyCall = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return easyCallRows.filter(
      (row) =>
        !keyword ||
        row.nama.toLowerCase().includes(keyword) ||
        row.mks.toLowerCase().includes(keyword) ||
        row.rekening.toLowerCase().includes(keyword) ||
        row.rekening_agf.toLowerCase().includes(keyword),
    );
  }, [easyCallRows, search]);

  const summary = useMemo(
    () => getSummary(allRows, selections),
    [allRows, selections],
  );

  const currentRows = tab === "DUA_A" ? filteredTwoA : filteredEasyCall;

  const detailRow = useMemo(
    () => allRows.find((row) => row.key === detailRowKey) || null,
    [allRows, detailRowKey],
  );

  const updateSelection = async (row, patch) => {
    if (!unitId || savingKey) return;

    const current = getSelection(row, selections);
    const next = { ...current, ...patch };
    const key = row.key;

    setSavingKey(key);
    setError("");

    setSelections((previous) => ({
      ...previous,
      [key]: next,
    }));

    try {
      const payload = {
        unit_id: row.unit_id,
        tanggal_data: row.tanggal_data,
        sumber_data: row.sumber_data,
        record_id: row.record_id,
        row_index: row.row_index,
        kategori: next.perlu_diperiksa ? null : next.kategori,
        perlu_diperiksa: next.perlu_diperiksa,
        catatan: next.catatan || null,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from("laporan_upgrade_pilihan")
        .upsert(payload, {
          onConflict: "record_id,row_index",
        });

      if (saveError) throw saveError;
    } catch (err) {
      console.error("Gagal menyimpan pilihan:", err);
      setError(
        err?.message ||
          "Pilihan gagal disimpan. Periksa izin tabel dan koneksi.",
      );
      await loadData();
    } finally {
      setSavingKey("");
    }
  };

  const handleCategoryChange = (row, kategori) => {
    updateSelection(row, {
      kategori,
      perlu_diperiksa: false,
    });
  };

  const handleReviewChange = (row, checked) => {
    updateSelection(row, {
      perlu_diperiksa: checked,
      kategori: null,
    });
  };

  const handleNoteChange = (row, catatan) => {
    updateSelection(row, { catatan });
  };

  const reportRows = useMemo(
    () => allRows.filter((row) => ["KUM", "KUR"].includes(row.produk)),
    [allRows],
  );

  const reportText = useMemo(() => {
    const lines = [
      "Update Kualitas hari ini",
      `Tanggal : ${getDisplayDate(today)}`,
      "",
      `Unit : ${unitName || activeUnit?.name || "-"}`,
      "",
      "*KUM*",
    ];

    const addCategories = (product, categories) => {
      const items = getCategoryStats(
        reportRows,
        selections,
        product,
        categories,
      );

      items.forEach((item) => {
        lines.push(
          `${item.label} : ${formatNumber(item.count)} NoA / ${formatJuta(item.bade)}`,
        );
      });
    };

    addCategories("KUM", QUALITY_CATEGORIES);

    lines.push("");
    lines.push("*KUR*");

    addCategories("KUR", QUALITY_CATEGORIES);

    lines.push("");
    lines.push("*Upgrade NPL*");
    lines.push("");
    lines.push("*KUM*");

    addCategories("KUM", NPL_KUM_CATEGORIES);

    lines.push("");
    lines.push("*KUR*");

    addCategories("KUR", NPL_KUR_CATEGORIES);

    lines.push("");
    lines.push("Demikian kami sampaikan, terima kasih.");

    return lines.join("\n");
  }, [today, unitName, activeUnit?.name, reportRows, selections]);

  const handleSendWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const selectedCount = currentRows.filter((row) => {
    const selection = getSelection(row, selections);
    return Boolean(selection.kategori) && !selection.perlu_diperiksa;
  }).length;

  const reviewCount = currentRows.filter(
    (row) => getSelection(row, selections).perlu_diperiksa,
  ).length;

  const pendingCount = Math.max(
    0,
    currentRows.length - selectedCount - reviewCount,
  );

  return (
    <main className="mx-auto w-full max-w-[1600px] min-w-0 space-y-5 px-3 pb-24 sm:px-5 lg:px-7">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <FileSpreadsheet className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
                Laporan Upgrade
              </h1>
              <p className="mt-0.5 text-xs text-zinc-500">
                Data 2A dan Easycall · Rekap otomatis
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            {unitName || activeUnit?.name || "-"} · {getDisplayDate(today)}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Muat ulang data
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">Ringkasan</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Gabungan seluruh data 2A dan Easycall pada unit aktif.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryTile
            title="Total data tersedia"
            count={summary.total.count}
            amount={summary.total.bade}
            icon={Users}
            subtitle="Seluruh data 2A dan Easycall"
          />

          <SummaryTile
            title="Sudah di-update"
            count={summary.updated.count}
            amount={summary.updated.bade}
            icon={Check}
            subtitle="Data yang sudah memiliki kategori"
          />

          <SummaryTile
            title="Belum di-update"
            count={Math.max(
              0,
              summary.total.count -
                summary.updated.count -
                summary.review.count,
            )}
            amount={Math.max(
              0,
              summary.total.bade - summary.updated.bade - summary.review.bade,
            )}
            icon={AlertTriangle}
            subtitle={`${formatNumber(summary.review.count)} data perlu diperiksa`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="relative block">
              <span className="mb-2 block text-xs font-semibold text-zinc-600">
                Cari debitur
              </span>

              <Search className="absolute left-3 top-[39px] h-4 w-4 text-zinc-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nama, rekening pinjaman, AGF, MKS..."
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            {tab === "DUA_A" && (
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-zinc-600">
                  Filter MKS
                </span>

                <div className="relative">
                  <select
                    value={mksFilter}
                    onChange={(event) => setMksFilter(event.target.value)}
                    className="h-12 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 pr-10 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="SEMUA">Semua MKS</option>
                    {mksOptions.map((mks) => (
                      <option key={mks} value={mks}>
                        {mks}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-4 h-4 w-4 text-zinc-400" />
                </div>
              </label>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTab("DUA_A")}
              className={[
                "min-h-12 rounded-xl px-3 text-sm font-bold transition",
                tab === "DUA_A"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
              ].join(" ")}
            >
              Data 2A ({formatNumber(twoARows.length)})
            </button>

            <button
              type="button"
              onClick={() => setTab("EASYCALL")}
              className={[
                "min-h-12 rounded-xl px-3 text-sm font-bold transition",
                tab === "EASYCALL"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
              ].join(" ")}
            >
              Data Easycall ({formatNumber(easyCallRows.length)})
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-xs">
            <span className="font-semibold text-zinc-700">
              {formatNumber(currentRows.length)} data ditemukan
            </span>
            <span className="text-zinc-500">
              {formatNumber(selectedCount)} di-update ·{" "}
              {formatNumber(pendingCount)} belum dipilih ·{" "}
              {formatNumber(reviewCount)} diperiksa
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat data...
          </div>
        ) : currentRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-14 text-center">
            <Users className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm font-semibold text-zinc-700">
              Data tidak ditemukan
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {tab === "DUA_A"
                ? "Pastikan data 2A unit aktif sudah tersimpan pada tanggal ini."
                : "Belum ada data Easycall tersimpan untuk unit aktif hari ini."}
            </p>
          </div>
        ) : (
          <>
            {/* Tampilan HP */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {currentRows.map((row, index) => {
                const selection = getSelection(row, selections);

                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setDetailRowKey(row.key)}
                    className={[
                      "w-full rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.99]",
                      selection.perlu_diperiksa
                        ? "border-amber-300 bg-amber-50"
                        : selection.kategori
                          ? "border-green-200 bg-green-50"
                          : "border-zinc-200 bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-zinc-400">
                          No. {index + 1} · {row.produk}
                        </p>
                        <h3 className="mt-1 break-words text-sm font-bold text-zinc-900">
                          {row.nama}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          MKS: <span className="font-semibold">{row.mks}</span>
                        </p>
                      </div>
                      <StatusBadge selection={selection} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-white/90 p-3">
                        <p className="text-[10px] font-semibold text-zinc-400">
                          BADE
                        </p>
                        <p className="mt-1 text-sm font-bold text-blue-700">
                          {formatJuta(row.bade)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/90 p-3">
                        <p className="text-[10px] font-semibold text-zinc-400">
                          Total Tagihan
                        </p>
                        <p className="mt-1 text-sm font-bold text-zinc-900">
                          {formatRupiah(row.total_tagihan)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-200/70 pt-3">
                      <span className="text-[11px] text-zinc-500">
                        {row.sumber_data === "DUA_A" ? "Data 2A" : "Easycall"}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-700">
                        <Eye className="h-4 w-4" />
                        Lihat detail & update
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tampilan desktop: tabel ringkas tanpa scroll horizontal */}
            <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-[11px] lg:text-xs">
                  <colgroup>
                    <col className="w-[4%]" />
                    <col className="w-[19%]" />
                    <col className="w-[8%]" />
                    <col className="w-[9%]" />
                    <col className="w-[12%]" />
                    <col className="w-[11%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[15%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-zinc-100">
                    <tr className="text-left font-bold text-zinc-600">
                      <th className="border-b border-zinc-200 px-2 py-3">
                        No.
                      </th>
                      <th className="border-b border-zinc-200 px-2 py-3">
                        Debitur / MKS
                      </th>
                      <th className="border-b border-zinc-200 px-2 py-3">
                        Produk
                      </th>
                      <th className="border-b border-zinc-200 px-2 py-3">
                        Rek. Pinjaman
                      </th>
                      <th className="border-b border-zinc-200 px-2 py-3">
                        Rek. AGF
                      </th>
                      <th className="border-b border-zinc-200 px-2 py-3 text-right">
                        BADE
                      </th>
                      <th className="border-b border-zinc-200 px-2 py-3 text-right">
                        Total Tagihan
                      </th>
                      <th className="border-b border-zinc-200 px-2 py-3">
                        Kategori
                      </th>
                      <th className="border-b border-zinc-200 px-2 py-3">
                        Pemeriksaan
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {currentRows.map((row, index) => {
                      const selection = getSelection(row, selections);
                      const review = selection.perlu_diperiksa;

                      return (
                        <tr
                          key={row.key}
                          onClick={() => setDetailRowKey(row.key)}
                          className={[
                            "cursor-pointer transition hover:bg-blue-50",
                            review
                              ? "bg-amber-50"
                              : selection.kategori
                                ? "bg-green-50"
                                : "bg-white",
                          ].join(" ")}
                        >
                          <td className="border-b border-zinc-100 px-2 py-3 text-zinc-400">
                            {index + 1}
                          </td>

                          <td className="border-b border-zinc-100 px-2 py-3">
                            <p className="break-words font-bold text-zinc-900">
                              {row.nama}
                            </p>
                            <p className="mt-1 break-words text-[10px] text-zinc-500">
                              {row.mks}
                            </p>
                          </td>

                          <td className="border-b border-zinc-100 px-2 py-3 font-semibold text-zinc-700">
                            {row.produk}
                          </td>

                          <td className="break-all border-b border-zinc-100 px-2 py-3 text-zinc-700">
                            {row.rekening || "-"}
                          </td>

                          <td className="break-all border-b border-zinc-100 px-2 py-3 text-zinc-700">
                            {row.rekening_agf || "-"}
                          </td>

                          <td className="border-b border-zinc-100 px-2 py-3 text-right font-bold text-blue-700">
                            {formatJuta(row.bade)}
                          </td>

                          <td className="border-b border-zinc-100 px-2 py-3 text-right font-semibold text-zinc-800">
                            {formatRupiah(row.total_tagihan)}
                          </td>

                          <td className="border-b border-zinc-100 px-2 py-3">
                            <p className="break-words font-semibold text-zinc-700">
                              {selection.kategori
                                ? CATEGORY_LABEL[selection.kategori]
                                : "Belum dipilih"}
                            </p>
                          </td>

                          <td className="border-b border-zinc-100 px-2 py-3">
                            <button
                              type="button"
                              disabled={
                                savingKey === row.key || Boolean(savingKey)
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                handleReviewChange(row, !review);
                              }}
                              className={[
                                "flex min-h-8 w-full items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition disabled:opacity-50",
                                review
                                  ? "bg-amber-200 text-amber-900 hover:bg-amber-300"
                                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800",
                              ].join(" ")}
                            >
                              {savingKey === row.key ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : review ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              {review ? "Diperiksa" : "Periksa"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-3 py-2 text-[10px] text-zinc-500">
                <span>
                  Klik baris untuk membuka detail dan memilih kategori.
                </span>
                <span>{formatNumber(currentRows.length)} data</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Rekap WhatsApp */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-xl bg-green-50 p-2.5">
            <MessageCircle className="h-5 w-5 text-green-700" />
          </div>

          <div>
            <h2 className="text-base font-bold text-zinc-900">
              Rekap WhatsApp
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Gabungan data 2A dan Easycall. Laporan mengikuti kategori yang
              dipilih.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-zinc-700">Pratinjau laporan</p>
            <span className="text-[10px] text-zinc-400">
              Diperbarui otomatis
            </span>
          </div>

          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-zinc-700">
            {reportText}
          </pre>
        </div>

        <button
          type="button"
          onClick={handleSendWhatsApp}
          disabled={loading}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 text-sm font-bold text-white transition hover:bg-green-800 disabled:opacity-50"
        >
          <MessageCircle className="h-5 w-5" />
          Kirim Laporan ke WhatsApp
          <ExternalLink className="h-4 w-4" />
        </button>

        <p className="mt-2 text-center text-[10px] text-zinc-400">
          WhatsApp akan dibuka dengan isi laporan yang sudah terisi otomatis.
        </p>
      </section>

      {detailRow && (
        <DebtorDetailModal
          key={detailRow.key}
          row={detailRow}
          selection={getSelection(detailRow, selections)}
          onClose={() => setDetailRowKey("")}
          onCategoryChange={handleCategoryChange}
          onReviewChange={handleReviewChange}
          onNoteChange={handleNoteChange}
          saving={savingKey === detailRow.key}
        />
      )}
    </main>
  );
}
