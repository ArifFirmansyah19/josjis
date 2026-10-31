"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  FileText,
  Files,
  FileImage,
  ShieldCheck,
  Building2,
  ChevronRight,
  ArrowLeft,
  X,
  UserRound,
  CalendarDays,
  Wallet,
  FolderOpen,
} from "lucide-react";

import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";
import { UNIT_UUID } from "@/app/admin/pk/constants/pkConstants";

const DOCUMENTS = [
  {
    id: "surat-asn-polri",
    name: "Surat Pernyataan ASN/POLRI",
    category: "Surat Pernyataan",
    icon: FileText,
    products: ["KUR"],
  },
  {
    id: "surat-pernyataan-debitur",
    name: "Surat Pernyataan Debitur",
    category: "Surat Pernyataan",
    icon: FileText,
    products: ["KUR", "KUM"],
  },
{
  id: "skm-agunan",
  name: "SKM Agunan",
  category: "Surat Kuasa",
  icon: ShieldCheck,
  products: ["KUR", "KUM", "KPP"],
},
{
  id: "skm-persediaan",
  name: "SKM Persediaan",
  category: "Surat Kuasa",
  icon: Files,
  products: ["KUR", "KUM", "KPP"],
},
  {
    id: "gcg",
    name: "GCG",
    category: "Dokumen PK",
    icon: Files,
    products: ["KUR", "KUM", "KPP", "KSM"],
  },
  {
    id: "delegasi-ots",
    name: "Template Delegasi OTS",
    category: "Dokumen OTS",
    icon: FileText,
    products: ["KUR", "KUM", "KPP", "KSM"],
  },
  {
    id: "kolase-foto-ots",
    name: "Kolase Foto OTS",
    category: "Dokumentasi",
    icon: FileImage,
    products: ["KUR", "KUM", "KPP", "KSM"],
  },
  {
    id: "kolase-foto-pk",
    name: "Kolase Foto PK",
    category: "Dokumentasi",
    icon: FileImage,
    products: ["KUR", "KUM", "KPP", "KSM"],
  },
  {
    id: "order-magi",
    name: "Order Magi",
    category: "Order",
    icon: Building2,
    products: ["KUR"],
  },
  {
    id: "order-asuransi-kebakaran",
    name: "Order Asuransi Kebakaran",
    category: "Order",
    icon: Building2,
    products: ["KUR", "KUM", "KPP", "KSM"],
  },
];

const CATEGORIES = [
  "Semua",
  "Surat Pernyataan",
  "Surat Kuasa",
  "Dokumen PK",
  "Dokumen OTS",
  "Dokumentasi",
  "Order",
];

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatTanggal(value) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getProduct(pk) {
  return String(pk?.jenis_pengajuan_kredit || "").toUpperCase();
}

function isHouseCollateral(pk) {
  const collaterals = pk?.pk_agunan || [];

  return collaterals.some((item) => {
    const objectName = String(item?.objek_agunan || "").toLowerCase();

    const isMain = !item?.peran_agunan || item.peran_agunan === "UTAMA";
    const isBound = ["APHT", "SKMHT"].includes(item?.status_pengikatan);

    return (
      isMain && isBound && /rumah|bangunan|ruko|tempat tinggal/.test(objectName)
    );
  });
}

function isThirdPartyCollateral(pk) {
  const collaterals = pk?.pk_agunan || [];
  const debtorName = String(pk?.nama_debitur || "")
    .trim()
    .toLowerCase();

  return collaterals.some((item) => {
    const ownerName = String(item?.nama_pemilik || "")
      .trim()
      .toLowerCase();

    return ownerName && debtorName && ownerName !== debtorName;
  });
}

function isDocumentAvailable(document, pk) {
  const product = getProduct(pk);

  if (!document.products.includes(product)) return false;

  if (
    document.id === "surat-asn-polri" &&
    !/ASN|PNS|POLRI|POLISI/i.test(pk?.profesi || "")
  ) {
    return false;
  }

  if (document.id === "skm-perubahan" && !isThirdPartyCollateral(pk)) {
    return false;
  }

  if (document.id === "order-asuransi-kebakaran" && !isHouseCollateral(pk)) {
    return false;
  }

  return true;
}

export default function AssesoirPkClient() {
  const { activeUnit } = useUnit();

  const [category, setCategory] = useState("Semua");
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);

  const [pkSearch, setPkSearch] = useState("");
  const [pkRows, setPkRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeUnitUuid = UNIT_UUID[activeUnit?.value];

  const loadPk = useCallback(async () => {
    if (!activeUnitUuid) {
      setPkRows([]);
      setError("Unit belum terhubung dengan UUID database.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("pk")
        .select(
          `
          id,
          unit_id,
          cif,
          nama_debitur,
          nomor_ktp,
          nomor_aplikasi,
          nomor_pk,
          tanggal_pk,
          jenis_pengajuan_kredit,
          limit_kredit,
          status_pk,
          profesi,
          pk_agunan (
            id,
            jenis_agunan,
            nama_pemilik,
            objek_agunan,
            peran_agunan,
            status_pengikatan
          )
        `,
        )
        .eq("unit_id", activeUnitUuid)
        .order("tanggal_pk", { ascending: false })
        .limit(200);

      if (queryError) throw queryError;

      setPkRows(data || []);
    } catch (err) {
      console.error("Gagal memuat Database PK:", err);
      setError(err.message || "Data PK gagal dimuat.");
      setPkRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeUnitUuid]);

  useEffect(() => {
    loadPk();
  }, [loadPk]);

  const visibleDocuments = useMemo(() => {
    const keyword = documentSearch.trim().toLowerCase();

    return DOCUMENTS.filter((item) => {
      const matchCategory = category === "Semua" || item.category === category;

      const matchSearch = !keyword || item.name.toLowerCase().includes(keyword);

      return matchCategory && matchSearch;
    });
  }, [category, documentSearch]);

  const visiblePk = useMemo(() => {
    const keyword = pkSearch.trim().toLowerCase();

    return pkRows.filter((pk) => {
      if (selectedDocument && !isDocumentAvailable(selectedDocument, pk)) {
        return false;
      }

      if (!keyword) return true;

      return [
        pk.nama_debitur,
        pk.cif,
        pk.nomor_ktp,
        pk.nomor_aplikasi,
        pk.nomor_pk,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      );
    });
  }, [pkRows, pkSearch, selectedDocument]);

  function chooseDocument(document) {
    setSelectedDocument(document);
    setPkSearch("");
  }

  function backToCatalog() {
    setSelectedDocument(null);
    setPkSearch("");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <FolderOpen size={16} />
            <span>Administrasi</span>
            <ChevronRight size={14} />
            <span className="text-zinc-800">Assesoir PK</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
            Assesoir PK
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Pusat pembuatan dokumen dan dokumentasi PK.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
          <Building2 size={16} className="text-zinc-500" />
          <span className="font-medium">{activeUnit?.name || "-"}</span>
        </div>
      </div>

      {!selectedDocument ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={documentSearch}
                onChange={(event) => setDocumentSearch(event.target.value)}
                placeholder="Cari jenis dokumen..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-zinc-400"
              />
            </div>

            <button
              type="button"
              onClick={loadPk}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Perbarui Data
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  category === item
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleDocuments.map((document) => {
              const Icon = document.icon;

              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => chooseDocument(document)}
                  className="group flex min-h-36 flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 text-left transition hover:border-zinc-400 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                      <Icon size={21} />
                    </div>
                    <ChevronRight
                      size={19}
                      className="text-zinc-400 transition group-hover:translate-x-1 group-hover:text-zinc-800"
                    />
                  </div>

                  <div className="mt-5">
                    <div className="text-xs font-medium text-zinc-400">
                      {document.category}
                    </div>
                    <div className="mt-1 font-semibold text-zinc-900">
                      {document.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {visibleDocuments.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
              Dokumen tidak ditemukan.
            </div>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={backToCatalog}
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft size={17} />
            Kembali ke katalog
          </button>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100">
                <selectedDocument.icon size={21} />
              </div>
              <div>
                <div className="text-xs text-zinc-500">
                  {selectedDocument.category}
                </div>
                <h2 className="font-semibold text-zinc-900">
                  {selectedDocument.name}
                </h2>
              </div>
            </div>

            <div className="mt-5 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={pkSearch}
                onChange={(event) => setPkSearch(event.target.value)}
                placeholder="Cari nama debitur, CIF, NIK, nomor aplikasi, atau nomor PK..."
                className="w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900">Pilih Data PK</h3>
            <span className="text-sm text-zinc-500">
              {loading ? "Memuat..." : `${visiblePk.length} data`}
            </span>
          </div>

          {loading ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
              Memuat Database PK...
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {visiblePk.map((pk) => (
                <div
                  key={pk.id}
                  className="flex flex-col gap-4 border-b border-zinc-100 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <UserRound size={16} className="text-zinc-400" />
                      <span className="font-semibold text-zinc-900">
                        {pk.nama_debitur}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                        {getProduct(pk) || "-"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span>CIF: {pk.cif || "-"}</span>
                      <span>PK: {pk.nomor_pk || "-"}</span>
                      <span>
                        <CalendarDays size={12} className="mr-1 inline" />
                        {formatTanggal(pk.tanggal_pk)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-sm text-zinc-600">
                      <Wallet size={14} />
                      {formatRupiah(pk.limit_kredit)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        `PK ${pk.nama_debitur} dipilih. Tahap berikutnya adalah formulir ${selectedDocument.name}.`,
                      )
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
                  >
                    Pilih PK
                    <ChevronRight size={16} />
                  </button>
                </div>
              ))}

              {!loading && visiblePk.length === 0 && (
                <div className="p-10 text-center text-sm text-zinc-500">
                  Tidak ada data PK yang sesuai.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
