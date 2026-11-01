"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  FileImage,
  Printer,
  FileText,
  Landmark,
  Loader2,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { useUnit } from "@/components/UnitContext";
import { createAdvisPelunasanPdf } from "@/lib/advis-pdf";

const STATUS_OPTIONS = [
  { value: "AKTIF", label: "Aktif" },
  { value: "LUNAS", label: "Lunas" },
  { value: "SEMUA", label: "Semua" },
];

const PAID_OFF_OPTIONS = [
  { value: "PELUNASAN", label: "Pelunasan" },
  { value: "JATUH_TEMPO_TENOR", label: "Jatuh Tempo Tenor" },
];

function formatRupiah(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNominalInput(value) {
  const raw = String(value ?? "").replace(/[^0-9,]/g, "");
  const commaIndex = raw.indexOf(",");
  const hasComma = commaIndex >= 0;
  const integerRaw = (hasComma ? raw.slice(0, commaIndex) : raw).replace(
    /,/g,
    "",
  );
  const decimalRaw = hasComma
    ? raw
        .slice(commaIndex + 1)
        .replace(/,/g, "")
        .slice(0, 3)
    : "";
  const groupedInteger = integerRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${groupedInteger}${hasComma ? `,${decimalRaw}` : ""}`;
}

function terbilangSampai999(value) {
  const angka = [
    "nol",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ];
  const n = Number(value);
  if (n < 12) return angka[n];
  if (n < 20) return `${terbilangSampai999(n - 10)} belas`;
  if (n < 100) {
    const puluhan = Math.floor(n / 10);
    const satuan = n % 10;
    return `${angka[puluhan]} puluh${satuan ? ` ${terbilangSampai999(satuan)}` : ""}`;
  }
  if (n < 200)
    return `seratus${n > 100 ? ` ${terbilangSampai999(n - 100)}` : ""}`;
  const ratusan = Math.floor(n / 100);
  const sisa = n % 100;
  return `${angka[ratusan]} ratus${sisa ? ` ${terbilangSampai999(sisa)}` : ""}`;
}

function terbilangInteger(value) {
  const normalized = String(value || "0").replace(/^0+(?=\d)/, "");
  if (!/^\d+$/.test(normalized)) return "";
  if (normalized === "0") return "nol";
  const scales = ["", "ribu", "juta", "miliar", "triliun", "kuadriliun"];
  const padded = normalized.padStart(Math.ceil(normalized.length / 3) * 3, "0");
  const groups = padded.match(/\d{3}/g) || [];
  const parts = [];
  for (let i = 0; i < groups.length; i += 1) {
    const group = Number(groups[i]);
    if (!group) continue;
    const scaleIndex = groups.length - i - 1;
    if (scaleIndex >= scales.length) return "";
    if (scaleIndex === 1 && group === 1) {
      parts.push("seribu");
    } else {
      const words = terbilangSampai999(group);
      parts.push(scaleIndex === 0 ? words : `${words} ${scales[scaleIndex]}`);
    }
  }
  return parts.join(" ");
}

function terbilangNominal(value) {
  const formatted = String(value || "").trim();
  if (!formatted) return "";
  const [integerPart = "", decimalPart] = formatted.split(",");
  const integerDigits = integerPart.replace(/\D/g, "");
  if (!integerDigits) return "";
  let result = terbilangInteger(integerDigits);
  if (decimalPart && /[1-9]/.test(decimalPart)) {
    // Baca nilai pecahan sebagai angka, abaikan nol di depan.
    // Contoh: ,05 dibaca "koma lima", ,30 dibaca "koma tiga puluh".
    const significantDigits = decimalPart.replace(/^0+/, "");
    result += ` koma ${terbilangSampai999(significantDigits)}`;
  }
  return `${result} rupiah`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

async function generateAdvisPelunasanPdf(
  item,
  nominalInput,
  unitCode,
  tanggalPaidOff,
) {
  const nama = String(item.nama || item.nama_debitur || "").trim();

  const norekPinjaman = String(
    item.norek || item.rekening_kredit || item.nomor_rekening_pinjaman || "",
  ).trim();

  const norekTabungan = String(
    item.rekeningTabungan ||
      item.rekening_tabungan ||
      item.nomor_rekening_tabungan ||
      item.noRekeningTabungan ||
      "",
  ).trim();

  const nominal = String(nominalInput || "").trim();

  if (!nama || !norekPinjaman || !nominal) {
    throw new Error(
      "Data nama debitur, rekening pinjaman, atau nominal pelunasan belum lengkap.",
    );
  }

  if (!norekTabungan) {
    throw new Error(
      "Nomor rekening tabungan debitur tidak ditemukan pada data PK.",
    );
  }

  const terbilang = terbilangNominal(nominal);

  if (!terbilang) {
    throw new Error("Nominal tidak dapat dikonversi menjadi terbilang.");
  }

  const pdfBase64 = await createAdvisPelunasanPdf({
    nama,
    norekPinjaman,
    norekTabungan,
    tanggal: formatDate(tanggalPaidOff),
    nominal,
    terbilang,
    detailTransaksi: "PEMBAYARAN PELUNASAN PINJAMAN",
    unitCode,
  });

  return {
    pdfBase64,
    fileName: `Advis_Pelunasan_${norekPinjaman}.pdf`,
  };
}

function StatusBadge({ status }) {
  if (status === "LUNAS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Lunas
      </span>
    );
  }

  if (status === "AKTIF") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Aktif
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
      {status || "Tidak diketahui"}
    </span>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-zinc-800">
        {value || "-"}
      </div>
    </div>
  );
}

export default function PelunasanPinjamanPage() {
  const { activeUnit } = useUnit();
  const unitCode = activeUnit?.value || "";
  const unitName =
    activeUnit?.name || activeUnit?.value || "Unit belum dipilih";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("AKTIF");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    totalAktif: 0,
    totalLunas: 0,
  });
  const [selected, setSelected] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(
    async (signal) => {
      if (!unitCode) {
        setRows([]);
        setSummary({ totalAktif: 0, totalLunas: 0 });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          unitCode,
          status: statusFilter,
          q: search.trim(),
        });

        const response = await fetch(
          `/api/admin/pelunasan-pinjaman?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal,
          },
        );

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Data pelunasan gagal dimuat.");
        }

        setRows(Array.isArray(result.data) ? result.data : []);
        setSummary(result.summary || { totalAktif: 0, totalLunas: 0 });
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Terjadi kesalahan saat mengambil data.");
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [unitCode, statusFilter, search],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => loadData(controller.signal), 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadData, refreshKey]);

  const filteredData = useMemo(() => rows, [rows]);

  const handleCompleted = () => {
    setShowProcessModal(false);
    setSelected(null);
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-zinc-400">
            <Landmark className="h-4 w-4" />
            PROSES
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Pelunasan Pinjaman
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Kelola pinjaman aktif, bukti Paid Off, dan perubahan status
            pinjaman.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Unit Aktif
          </div>
          <div className="mt-0.5 text-sm font-semibold text-zinc-900">
            {unitName}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Pinjaman Aktif"
          value={summary.totalAktif}
          icon={WalletCards}
          tone="emerald"
        />
        <SummaryCard
          label="Sudah Lunas"
          value={summary.totalLunas}
          icon={CheckCircle2}
          tone="blue"
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, rekening, CIF, atau nomor PK..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none focus:border-zinc-400 focus:bg-white"
            />
          </div>
          <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                  statusFilter === option.value
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              Daftar Pinjaman
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              Data diambil langsung dari database PK untuk unit aktif.
            </div>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
            {filteredData.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat data pinjaman...
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left">
                    {[
                      "Debitur",
                      "Norek Pinjaman",
                      "CIF",
                      "Produk",
                      "Limit",
                      "Status",
                      "Aksi",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-zinc-900">
                          {item.nama}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-400">
                          MKS: {item.mks || "-"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {item.norek || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {item.cif || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {item.produk || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-zinc-800">
                        {formatRupiah(item.limit)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(item);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                        >
                          Detail <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-100 md:hidden">
              {filteredData.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-zinc-900">
                      {item.nama}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {item.norek || "-"}
                    </div>
                    <div className="mt-2">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                  <ChevronRight className="ml-3 h-5 w-5 shrink-0 text-zinc-400" />
                </button>
              ))}
            </div>

            {filteredData.length === 0 && (
              <div className="px-5 py-14 text-center">
                <Search className="mx-auto h-8 w-8 text-zinc-300" />
                <div className="mt-3 text-sm font-semibold text-zinc-700">
                  Data tidak ditemukan
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  Tidak ada pinjaman dengan pencarian atau filter tersebut.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <DetailModal
          item={selected}
          unitCode={unitCode}
          onClose={() => setSelected(null)}
          onProcess={() => setShowProcessModal(true)}
        />
      )}

      {showProcessModal && selected && (
        <PaidOffModal
          item={selected}
          unitCode={unitCode}
          onClose={() => setShowProcessModal(false)}
          onCompleted={handleCompleted}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-zinc-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-zinc-900">
            {value ?? 0}
          </div>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DetailModal({ item, unitCode, onClose, onProcess }) {
  const paidOff = item.pelunasan;
  const [advisLoading, setAdvisLoading] = useState(false);
  const [advisError, setAdvisError] = useState("");
  const [advisPdf, setAdvisPdf] = useState("");
  const [advisFileName, setAdvisFileName] = useState("Advis_Pelunasan.pdf");

  async function handleCetakAdvisPelunasan() {
    setAdvisError("");
    setAdvisPdf("");

    if (!paidOff || paidOff.jenis_paid_off !== "PELUNASAN") {
      setAdvisError("Advis hanya tersedia untuk jenis Paid Off Pelunasan.");
      return;
    }

    setAdvisLoading(true);
    try {
      const result = await generateAdvisPelunasanPdf(
        item,
        paidOff.nominal_pelunasan,
        unitCode,
        paidOff.tanggal_paid_off,
      );
      setAdvisFileName(result.fileName);
      setAdvisPdf(result.pdfBase64);
    } catch (error) {
      setAdvisError(error?.message || "Gagal memproses Advis Pelunasan.");
    } finally {
      setAdvisLoading(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-100 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">{item.nama}</h2>
            <div className="mt-0.5 text-xs text-zinc-500">
              {item.noPk || "Nomor PK belum tersedia"} · {item.norek || "-"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Tutup detail"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-500" />
              <h3 className="text-sm font-bold text-zinc-900">
                Informasi Pinjaman
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InfoItem label="Nama Debitur" value={item.nama} />
              <InfoItem label="MKS" value={item.mks} />
              <InfoItem label="Norek Pinjaman" value={item.norek} />
              <InfoItem label="CIF" value={item.cif} />
              <InfoItem label="Nomor PK" value={item.noPk} />
              <InfoItem label="Tanggal PK" value={formatDate(item.tanggalPk)} />
              <InfoItem label="Produk" value={item.produk} />
              <InfoItem label="Limit" value={formatRupiah(item.limit)} />
              <InfoItem
                label="Tenor"
                value={item.tenor ? `${item.tenor} Bulan` : "-"}
              />
              <InfoItem label="Status PK" value={item.status} />
            </div>
          </section>

          {item.status === "LUNAS" && paidOff && (
            <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700" />
                <h3 className="text-sm font-bold text-zinc-900">
                  Bukti Paid Off
                </h3>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <InfoItem
                  label="Jenis Paid Off"
                  value={
                    paidOff.jenis_paid_off === "PELUNASAN"
                      ? "Pelunasan"
                      : "Jatuh Tempo Tenor"
                  }
                />
                <InfoItem
                  label="Tanggal Paid Off"
                  value={formatDate(paidOff.tanggal_paid_off)}
                />
                {paidOff.jenis_paid_off === "PELUNASAN" && (
                  <InfoItem
                    label="Nominal Pelunasan"
                    value={
                      paidOff.nominal_pelunasan
                        ? `Rp ${paidOff.nominal_pelunasan}`
                        : "-"
                    }
                  />
                )}
                <InfoItem
                  label="Bukti diterima"
                  value={formatDate(paidOff.tanggal_bukti_diterima)}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-3">
                <div className="flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-semibold text-zinc-800">
                      {paidOff.nama_file_asli || "Foto BDS"}
                    </div>
                    <div className="text-xs text-zinc-400">
                      Dokumen tersimpan secara privat
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {paidOff.bdsUrl && (
                    <a
                      href={paidOff.bdsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      <Download className="h-4 w-4" /> Lihat / Unduh BDS
                    </a>
                  )}
                  {paidOff.jenis_paid_off === "PELUNASAN" && (
                    <button
                      type="button"
                      onClick={handleCetakAdvisPelunasan}
                      disabled={advisLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {advisLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Memproses
                          Template...
                        </>
                      ) : (
                        <>
                          <Printer className="h-4 w-4" /> Cetak Advis Pelunasan
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {advisError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {advisError}
                </div>
              )}
            </section>
          )}

          <div className="flex flex-col-reverse justify-between gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center">
            <div className="text-xs text-zinc-400">
              Perubahan status hanya dilakukan melalui konfirmasi pelunasan.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Tutup
              </button>
              {item.status === "AKTIF" && (
                <button
                  type="button"
                  onClick={onProcess}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" /> Proses Paid Off
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {advisPdf && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-2 sm:p-5">
          <div className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-blue-700" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-zinc-900">
                    Preview Advis Pelunasan
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {advisFileName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`data:application/pdf;base64,${advisPdf}`}
                  download={advisFileName}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  <Download className="h-4 w-4" /> Unduh PDF
                </a>
                <button
                  type="button"
                  onClick={() => setAdvisPdf("")}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
                  aria-label="Tutup preview PDF"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <iframe
              title="Preview PDF Advis Pelunasan"
              src={`data:application/pdf;base64,${advisPdf}`}
              className="min-h-0 w-full flex-1 bg-zinc-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaidOffModal({ item, unitCode, onClose, onCompleted }) {
  const [advisLoading, setAdvisLoading] = useState(false);
  const [advisError, setAdvisError] = useState("");
  const [advisPdf, setAdvisPdf] = useState("");
  const [advisFileName, setAdvisFileName] = useState("Advis_Pelunasan.pdf");
  const [jenis, setJenis] = useState("PELUNASAN");
  const [tanggal, setTanggal] = useState(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
      new Date(),
    ),
  );
  const [nominal, setNominal] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCetakAdvisPelunasan() {
    setAdvisError("");
    setAdvisPdf("");
    if (jenis !== "PELUNASAN") return;

    setAdvisLoading(true);
    try {
      const result = await generateAdvisPelunasanPdf(
        item,
        nominal,
        unitCode,
        tanggal,
      );
      setAdvisFileName(result.fileName);
      setAdvisPdf(result.pdfBase64);
    } catch (err) {
      setAdvisError(err?.message || "Gagal memproses Advis Pelunasan.");
    } finally {
      setAdvisLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!tanggal) {
      setError("Tanggal Paid Off wajib diisi.");
      return;
    }
    if (jenis === "PELUNASAN") {
      const nominalPattern = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,3})?$/;
      if (!nominalPattern.test(nominal.trim())) {
        setError(
          "Nominal pelunasan wajib diisi. Maksimal 3 angka di belakang koma.",
        );
        return;
      }
    }
    if (!file) {
      setError("Foto BDS wajib diunggah.");
      return;
    }

    const formData = new FormData();
    formData.append("pkId", item.id);
    formData.append("jenisPaidOff", jenis);
    formData.append("tanggalPaidOff", tanggal);
    if (jenis === "PELUNASAN")
      formData.append("nominalPelunasan", nominal.trim());
    formData.append("bds", file);

    setBusy(true);
    try {
      const response = await fetch("/api/admin/pelunasan-pinjaman", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Proses Paid Off gagal disimpan.");
      }
      onCompleted?.();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan Paid Off.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              Konfirmasi Paid Off
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {item.nama} · {item.norek || "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Jenis Paid Off
            </label>
            <select
              value={jenis}
              onChange={(event) => setJenis(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
            >
              {PAID_OFF_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-zinc-500">
              {jenis === "PELUNASAN"
                ? "Foto BDS umumnya diterima H+1 setelah tanggal pelunasan."
                : "Foto BDS untuk jatuh tempo tenor dicatat pada Hari H jatuh tempo."}
            </p>
          </div>

          {jenis === "PELUNASAN" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Nominal Pelunasan
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={nominal}
                  onChange={(event) =>
                    setNominal(formatNominalInput(event.target.value))
                  }
                  placeholder="Contoh: 5.500.000,30"
                  required
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-zinc-400"
                />
              </div>
              <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Terbilang
                </div>
                <p className="mt-0.5 text-xs font-medium leading-5 text-emerald-900">
                  {nominal.trim()
                    ? terbilangNominal(nominal)
                    : "Terbilang akan muncul otomatis saat nominal diisi."}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Titik ribuan ditambahkan otomatis. Ketik koma (,) sendiri untuk
                desimal, maksimal 3 angka.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCetakAdvisPelunasan}
                  disabled={advisLoading || !nominal.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {advisLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Memproses
                      Template...
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4" /> Cetak Advis Pelunasan
                    </>
                  )}
                </button>
                <span className="text-[11px] text-zinc-400">
                  Template diproses dan PDF langsung ditampilkan.
                </span>
              </div>
              {advisError && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {advisError}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Tanggal Paid Off
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="date"
                value={tanggal}
                onChange={(event) => setTanggal(event.target.value)}
                required
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-zinc-400"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Tanggal transaksi pelunasan atau tanggal jatuh tempo sebenarnya,
              bukan tanggal upload foto.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Foto BDS (Bukti Paid Off)
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-7 text-center hover:bg-zinc-100">
              <FileImage className="h-7 w-7 text-zinc-400" />
              <span className="mt-2 text-sm font-semibold text-zinc-700">
                {file ? file.name : "Pilih foto bukti Paid Off"}
              </span>
              <span className="mt-1 text-xs text-zinc-400">
                JPG, PNG, atau WEBP · Maksimal 5 MB
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <div className="flex gap-2">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-5 text-amber-800">
                Setelah disimpan, sistem akan mencatat bukti BDS dan mengubah
                status PK dari AKTIF menjadi LUNAS. Data ini akan menjadi sumber
                untuk modul Agunan Lunas.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                busy || !file || (jenis === "PELUNASAN" && !nominal.trim())
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Konfirmasi Paid Off
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      {advisPdf && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-2 sm:p-5">
          <div className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-blue-700" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-zinc-900">
                    Preview Advis Pelunasan
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {advisFileName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`data:application/pdf;base64,${advisPdf}`}
                  download={advisFileName}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  <Download className="h-4 w-4" /> Unduh PDF
                </a>
                <button
                  type="button"
                  onClick={() => setAdvisPdf("")}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
                  aria-label="Tutup preview PDF"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <iframe
              title="Preview PDF Advis Pelunasan"
              src={`data:application/pdf;base64,${advisPdf}`}
              className="min-h-0 w-full flex-1 bg-zinc-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
