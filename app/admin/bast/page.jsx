"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import {
  Search,
  FileText,
  ShieldCheck,
  Landmark,
  Scale,
  Building2,
  ChevronRight,
  X,
  CheckCircle2,
  Clock3,
  Printer,
  Plus,
  AlertCircle,
  CalendarDays,
  WalletCards,
  UserRound,
  MapPin,
  FolderOpen,
} from "lucide-react";

/* =========================================================
   MASTER JENIS DOKUMEN
========================================================= */

const BAST_TYPES = [
  {
    id: "AGUNAN_LUNAS",
    title: "BAST Agunan Lunas",
    shortTitle: "Agunan Lunas",
    description: "Serah terima agunan dari fasilitas yang telah lunas.",
    icon: ShieldCheck,
  },
  {
    id: "PINJAMAN_LUNAS",
    title: "BAST Pinjaman Lunas",
    shortTitle: "Pinjaman Lunas",
    description: "Berita acara penyelesaian fasilitas pinjaman lunas.",
    icon: Landmark,
  },
  {
    id: "ROYA",
    title: "Surat Roya",
    shortTitle: "Roya",
    description: "Dokumen roya untuk fasilitas dengan pengikatan APHT.",
    icon: Scale,
  },
  {
    id: "MORAL_OBLIGASI",
    title: "BAST Moral Obligasi",
    shortTitle: "Moral Obligasi",
    description: "Berita acara untuk dokumen moral obligasi.",
    icon: FileText,
  },
  {
    id: "NOTARIS",
    title: "BAST Notaris",
    shortTitle: "Notaris",
    description: "Berita acara serah terima dokumen/agunan dengan notaris.",
    icon: Building2,
  },
];

/* =========================================================
   DUMMY DATA SEMENTARA
   NANTI DIGANTI QUERY SUPABASE
========================================================= */

const DUMMY_DATA = [
  {
    id: "pk-001",
    unit_id: "e2b50285-3bd4-4f78-bbde-c299f92ae1e8",
    unit: "JKK 1",

    debitur: "Budi Santoso",
    cif: "123456789",
    no_rekening: "123-00-123456-7",
    no_pk: "PK/JKK1/001/2026",
    tgl_pk: "2026-01-15",
    tgl_lunas: "2026-09-25",

    limit: 200000000,
    jenis_pinjaman: "KUM",

    pengikatan: "APHT",

    agunan: [
      {
        id: "ag-001",
        no_shm: "12345",
        pemilik: "Siti Aminah",
        hubungan: "Istri",
        pengikatan: "APHT",
        posisi_fisik: "CABANG",
        bundel: "BDL-JKK1-0012",
        loker: "1-A",
        surat_roya: true,
      },
    ],

    dokumen: {
      AGUNAN_LUNAS: null,
      PINJAMAN_LUNAS: null,
      ROYA: null,
      MORAL_OBLIGASI: null,
      NOTARIS: {
        nomor: "BAST-NOT/JKK1/004/2026",
        tanggal: "2026-09-20",
      },
    },
  },

  {
    id: "pk-002",
    unit_id: "e2b50285-3bd4-4f78-bbde-c299f92ae1e8",
    unit: "JKK 1",

    debitur: "Siti Aminah",
    cif: "987654321",
    no_rekening: "123-00-987654-1",
    no_pk: "PK/JKK1/002/2026",
    tgl_pk: "2026-02-10",
    tgl_lunas: "2026-09-27",

    limit: 150000000,
    jenis_pinjaman: "KUR",

    pengikatan: "SKMHT",

    agunan: [
      {
        id: "ag-002",
        no_shm: "67890",
        pemilik: "Siti Aminah",
        hubungan: "Sendiri",
        pengikatan: "SKMHT",
        posisi_fisik: "CO",
        bundel: "BDL-JKK1-0015",
        loker: null,
        surat_roya: false,
      },
    ],

    dokumen: {
      AGUNAN_LUNAS: null,
      PINJAMAN_LUNAS: null,
      ROYA: null,
      MORAL_OBLIGASI: null,
      NOTARIS: null,
    },
  },

  {
    id: "pk-003",
    unit_id: "0baec32b-1845-45f3-bcc0-d2202b0b5976",
    unit: "JKK 2",

    debitur: "Dedi Irawan",
    cif: "556677889",
    no_rekening: "123-00-556677-8",
    no_pk: "PK/JKK2/007/2026",
    tgl_pk: "2026-03-12",
    tgl_lunas: "2026-09-29",

    limit: 300000000,
    jenis_pinjaman: "KUM",

    pengikatan: "APHT",

    agunan: [
      {
        id: "ag-003",
        no_shm: "11223",
        pemilik: "Dedi Irawan",
        hubungan: "Sendiri",
        pengikatan: "APHT",
        posisi_fisik: "NOTARIS",
        bundel: "BDL-JKK2-0007",
        loker: null,
        surat_roya: false,
      },
    ],

    dokumen: {
      AGUNAN_LUNAS: null,
      PINJAMAN_LUNAS: null,
      ROYA: null,
      MORAL_OBLIGASI: null,
      NOTARIS: null,
    },
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDocumentLabel(type) {
  const item = BAST_TYPES.find((x) => x.id === type);
  return item?.title || type;
}

function isRoyaAvailable(row) {
  return row?.pengikatan === "APHT";
}

/* =========================================================
   STATUS DOKUMEN
========================================================= */

function DocumentStatus({ document, compact = false }) {
  if (document) {
    return (
      <span
        className={[
          "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 font-medium text-emerald-700",
          compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs",
        ].join(" ")}
      >
        <CheckCircle2 size={compact ? 12 : 13} />
        Sudah dibuat
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-amber-50 font-medium text-amber-700",
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs",
      ].join(" ")}
    >
      <Clock3 size={compact ? 12 : 13} />
      Belum dibuat
    </span>
  );
}

/* =========================================================
   INFO COMPONENT
========================================================= */

function Info({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[11px] text-slate-400">
        {Icon ? <Icon size={11} /> : null}
        <span>{label}</span>
      </div>

      <div className="mt-0.5 truncate text-xs font-medium text-slate-700">
        {value || "-"}
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function BastPage() {
  const { activeUnit } = useUnit();

  const [rows, setRows] = useState(DUMMY_DATA);
  const [activeType, setActiveType] = useState("AGUNAN_LUNAS");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (activeUnit?.id && row.unit_id !== activeUnit.id) {
        return false;
      }

      if (!keyword) return true;

      return [row.debitur, row.cif, row.no_rekening, row.no_pk, row.unit]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [rows, activeUnit, search]);

  /* =======================================================
     CURRENT DOCUMENT
  ======================================================= */

  const getCurrentDocument = (row) => {
    return row?.dokumen?.[activeType] || null;
  };

  /* =======================================================
     OPEN DETAIL
  ======================================================= */

  function openDetail(row) {
    setSelected(row);
    setShowDetail(true);
  }

  /* =======================================================
     CREATE DOCUMENT
  ======================================================= */

  function openCreate(row) {
    setSelected(row);
    setShowCreate(true);
  }

  function createDocument() {
    if (!selected) return;

    const today = new Date();
    const year = today.getFullYear();

    const prefixMap = {
      AGUNAN_LUNAS: "BAST-AG",
      PINJAMAN_LUNAS: "BAST-PJ",
      ROYA: "ROYA",
      MORAL_OBLIGASI: "BAST-MO",
      NOTARIS: "BAST-NOT",
    };

    const prefix = prefixMap[activeType] || "BAST";

    const unitCode = selected.unit?.replace(/\s+/g, "") || "JKK";

    const nomor = `${prefix}/${unitCode}/${String(
      Math.floor(Math.random() * 999) + 1,
    ).padStart(3, "0")}/${year}`;

    const document = {
      nomor,
      tanggal: today.toISOString().slice(0, 10),
      created_at: today.toISOString(),
      created_by: "MKA",
    };

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== selected.id) return row;

        return {
          ...row,
          dokumen: {
            ...row.dokumen,
            [activeType]: document,
          },
        };
      }),
    );

    setSelected((prev) => ({
      ...prev,
      dokumen: {
        ...prev.dokumen,
        [activeType]: document,
      },
    }));

    setShowCreate(false);
    setShowDetail(true);
  }

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    let total = filteredRows.length;
    let sudah = 0;
    let belum = 0;

    filteredRows.forEach((row) => {
      if (activeType === "ROYA" && !isRoyaAvailable(row)) {
        return;
      }

      if (row.dokumen?.[activeType]) {
        sudah++;
      } else {
        belum++;
      }
    });

    return {
      total,
      sudah,
      belum,
    };
  }, [filteredRows, activeType]);

  /* =======================================================
     ACTIVE TYPE
  ======================================================= */

  const activeTypeInfo =
    BAST_TYPES.find((item) => item.id === activeType) || BAST_TYPES[0];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <DashboardLayout>
      <div className="space-y-4 p-3 sm:p-4 md:space-y-5 md:p-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-xl">
              BAST
            </h1>

            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              Pembuatan dan pengelolaan dokumen BAST, Roya, dan dokumen serah
              terima.
            </p>

            <p className="mt-1 text-xs text-slate-500 sm:hidden">
              Dokumen BAST dan serah terima
            </p>
          </div>
        </div>

        {/* =================================================
            JENIS DOKUMEN
            DESKTOP = GRID
            MOBILE = HORIZONTAL SCROLL
        ================================================= */}

        <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 md:mx-0 md:overflow-visible md:px-0">
          <div className="flex w-max gap-2.5 md:grid md:w-auto md:grid-cols-5 md:gap-3">
            {BAST_TYPES.map((item) => {
              const Icon = item.icon;
              const active = activeType === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveType(item.id);
                    setSelected(null);
                    setShowDetail(false);
                    setShowCreate(false);
                  }}
                  className={[
                    "shrink-0 text-left transition",
                    "w-[145px] rounded-2xl border p-3",
                    "md:w-auto md:p-4",
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "mb-2 flex h-8 w-8 items-center justify-center rounded-xl md:mb-3 md:h-9 md:w-9",
                      active ? "bg-white/10" : "bg-slate-100",
                    ].join(" ")}
                  >
                    <Icon size={17} />
                  </div>

                  <div className="text-xs font-semibold leading-4 md:text-sm">
                    <span className="md:hidden">{item.shortTitle}</span>

                    <span className="hidden md:inline">{item.title}</span>
                  </div>

                  <div
                    className={[
                      "mt-1 hidden text-xs leading-5 md:block",
                      active ? "text-slate-300" : "text-slate-500",
                    ].join(" ")}
                  >
                    {item.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="grid grid-cols-3 gap-2.5 md:gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 md:p-4">
            <div className="text-[11px] text-slate-500 md:text-xs">Data</div>

            <div className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">
              {summary.total}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 md:p-4">
            <div className="text-[11px] text-emerald-700 md:text-xs">Sudah</div>

            <div className="mt-1 text-xl font-semibold text-emerald-800 md:text-2xl">
              {summary.sudah}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3 md:p-4">
            <div className="text-[11px] text-amber-700 md:text-xs">Belum</div>

            <div className="mt-1 text-xl font-semibold text-amber-800 md:text-2xl">
              {summary.belum}
            </div>
          </div>
        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-2.5 md:p-3">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari debitur, CIF, rekening, atau nomor PK..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>

        {/* =================================================
            CONTENT HEADER
        ================================================= */}

        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {activeTypeInfo.title}
            </h2>

            <p className="text-xs text-slate-500">
              {activeUnit?.nama_unit || activeUnit?.kode_unit || "Unit aktif"}
            </p>
          </div>

          <div className="hidden text-xs text-slate-400 sm:block">
            {filteredRows.length} data
          </div>
        </div>

        {/* =================================================
            DESKTOP TABLE
        ================================================= */}

        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">Debitur</th>

                  <th className="px-4 py-3">No. Rekening</th>

                  <th className="px-4 py-3">Tgl Lunas</th>

                  <th className="px-4 py-3">Pengikatan</th>

                  <th className="px-4 py-3">Status Dokumen</th>

                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => {
                  const document = getCurrentDocument(row);

                  const royaBlocked =
                    activeType === "ROYA" && !isRoyaAvailable(row);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => openDetail(row)}
                      className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {row.debitur}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          CIF {row.cif}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {row.no_rekening}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(row.tgl_lunas)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            row.pengikatan === "APHT"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600",
                          ].join(" ")}
                        >
                          {row.pengikatan}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {royaBlocked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            <AlertCircle size={13} />
                            Bukan APHT
                          </span>
                        ) : (
                          <DocumentStatus document={document} />
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <ChevronRight size={17} className="text-slate-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* =================================================
            MOBILE LIST
        ================================================= */}

        <div className="space-y-2.5 md:hidden">
          {filteredRows.map((row) => {
            const document = getCurrentDocument(row);

            const royaBlocked = activeType === "ROYA" && !isRoyaAvailable(row);

            return (
              <button
                key={row.id}
                onClick={() => openDetail(row)}
                className="group w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition active:scale-[0.99] active:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  {/* ICON */}

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <UserRound size={18} />
                  </div>

                  {/* MAIN */}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {row.debitur}
                        </div>

                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          {row.no_rekening}
                        </div>
                      </div>

                      <ChevronRight
                        size={17}
                        className="mt-0.5 shrink-0 text-slate-300 transition group-hover:text-slate-500"
                      />
                    </div>

                    {/* META */}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                        <CalendarDays size={11} />
                        {formatDate(row.tgl_lunas)}
                      </span>

                      <span
                        className={[
                          "rounded-full px-2 py-1 text-[11px] font-medium",
                          row.pengikatan === "APHT"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {row.pengikatan}
                      </span>

                      {royaBlocked ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                          Bukan APHT
                        </span>
                      ) : (
                        <DocumentStatus document={document} compact />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {filteredRows.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center">
            <FileText size={30} className="mx-auto text-slate-300" />

            <div className="mt-3 text-sm font-medium text-slate-600">
              Tidak ada data
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Belum ada data yang sesuai dengan pencarian.
            </div>
          </div>
        )}
      </div>

      {/* ===================================================
          DETAIL MODAL
          DESKTOP CENTER
          MOBILE FULL HEIGHT / BOTTOM SHEET STYLE
      =================================================== */}

      {showDetail && selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 backdrop-blur-sm md:items-center md:p-3">
          <div className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-w-3xl md:rounded-3xl">
            {/* MOBILE HANDLE */}

            <div className="flex justify-center pt-2 md:hidden">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            {/* HEADER */}

            <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-4 py-3.5 md:px-5 md:py-4">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-500 md:text-xs">
                  {getDocumentLabel(activeType)}
                </div>

                <h2 className="mt-0.5 truncate text-base font-semibold text-slate-900 md:mt-1 md:text-lg">
                  {selected.debitur}
                </h2>

                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {selected.no_rekening}
                </div>
              </div>

              <button
                onClick={() => setShowDetail(false)}
                className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            {/* CONTENT */}

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
              {/* QUICK SUMMARY MOBILE */}

              <div className="mb-3 grid grid-cols-2 gap-2 md:hidden">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-400">
                    Tanggal Lunas
                  </div>

                  <div className="mt-1 text-xs font-semibold text-slate-700">
                    {formatDate(selected.tgl_lunas)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-400">Pengikatan</div>

                  <div className="mt-1 text-xs font-semibold text-slate-700">
                    {selected.pengikatan}
                  </div>
                </div>
              </div>

              {/* DATA PINJAMAN */}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 md:p-4">
                <div className="mb-3 text-sm font-semibold text-slate-900">
                  Data Pinjaman
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
                  <Info label="Debitur" value={selected.debitur} />

                  <Info label="CIF" value={selected.cif} />

                  <Info label="No. Rekening" value={selected.no_rekening} />

                  <Info label="No. PK" value={selected.no_pk} />

                  <Info label="Tgl PK" value={formatDate(selected.tgl_pk)} />

                  <Info
                    label="Tgl Lunas"
                    value={formatDate(selected.tgl_lunas)}
                  />

                  <Info label="Limit" value={formatRupiah(selected.limit)} />

                  <Info
                    label="Jenis Pinjaman"
                    value={selected.jenis_pinjaman}
                  />

                  <Info label="Pengikatan" value={selected.pengikatan} />
                </div>
              </div>

              {/* AGUNAN */}

              {(activeType === "AGUNAN_LUNAS" ||
                activeType === "ROYA" ||
                activeType === "NOTARIS") && (
                <div className="mt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">
                      Data Agunan
                    </div>

                    <span className="text-xs text-slate-400">
                      {selected.agunan?.length || 0} agunan
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {selected.agunan?.map((agunan) => (
                      <div
                        key={agunan.id}
                        className="rounded-2xl border border-slate-200 p-3.5 md:p-4"
                      >
                        {/* AGUNAN HEADER */}

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                <FolderOpen
                                  size={15}
                                  className="text-slate-500"
                                />
                              </div>

                              <div>
                                <div className="text-sm font-semibold text-slate-900">
                                  SHM {agunan.no_shm}
                                </div>

                                <div className="text-[11px] text-slate-500">
                                  {agunan.pemilik}
                                </div>
                              </div>
                            </div>
                          </div>

                          <span
                            className={[
                              "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium",
                              agunan.pengikatan === "APHT"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-600",
                            ].join(" ")}
                          >
                            {agunan.pengikatan}
                          </span>
                        </div>

                        {/* AGUNAN DATA */}

                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                          <Info label="Pemilik" value={agunan.pemilik} />

                          <Info label="Hubungan" value={agunan.hubungan} />

                          <Info
                            label="Posisi Fisik"
                            value={agunan.posisi_fisik}
                            icon={MapPin}
                          />

                          <Info label="Bundel" value={agunan.bundel} />

                          <Info label="Loker" value={agunan.loker || "-"} />

                          <Info
                            label="Roya"
                            value={
                              agunan.pengikatan === "APHT"
                                ? agunan.surat_roya
                                  ? "Tersedia"
                                  : "Belum tersedia"
                                : "Tidak perlu"
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STATUS DOKUMEN */}

              <div className="mt-4 rounded-2xl border border-slate-200 p-3.5 md:p-4">
                <div className="mb-3 text-sm font-semibold text-slate-900">
                  Status Dokumen
                </div>

                <div className="space-y-2">
                  {BAST_TYPES.map((type) => {
                    const document = selected.dokumen?.[type.id];

                    const blocked =
                      type.id === "ROYA" && !isRoyaAvailable(selected);

                    return (
                      <div
                        key={type.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white">
                            <type.icon size={14} />
                          </div>

                          <div className="truncate text-xs font-medium text-slate-700">
                            {type.title}
                          </div>
                        </div>

                        {blocked ? (
                          <span className="shrink-0 text-[11px] text-slate-400">
                            Tidak berlaku
                          </span>
                        ) : (
                          <DocumentStatus document={document} compact />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EXISTING DOCUMENT DETAIL */}

              {getCurrentDocument(selected) && (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5 md:p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600">
                      <CheckCircle2 size={17} />
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-emerald-800">
                        Dokumen sudah dibuat
                      </div>

                      <div className="mt-1 break-all text-xs text-emerald-700">
                        Nomor:{" "}
                        <span className="font-semibold">
                          {getCurrentDocument(selected).nomor}
                        </span>
                      </div>

                      <div className="mt-0.5 text-[11px] text-emerald-600">
                        Tanggal:{" "}
                        {formatDate(getCurrentDocument(selected).tanggal)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-3.5 md:px-5 md:py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowDetail(false)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                >
                  Tutup
                </button>

                {getCurrentDocument(selected) ? (
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white">
                    <Printer size={16} />
                    Cetak Ulang
                  </button>
                ) : (
                  !(activeType === "ROYA" && !isRoyaAvailable(selected)) && (
                    <button
                      onClick={() => {
                        setShowDetail(false);
                        openCreate(selected);
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white"
                    >
                      <Plus size={16} />
                      Buat Dokumen
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          CREATE MODAL
      =================================================== */}

      {showCreate && selected && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 backdrop-blur-sm md:items-center md:p-3">
          <div className="w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-w-lg md:rounded-3xl">
            {/* MOBILE HANDLE */}

            <div className="flex justify-center pt-2 md:hidden">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            {/* HEADER */}

            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3.5 md:px-5 md:py-4">
              <div>
                <div className="text-[11px] font-medium text-slate-500">
                  Pembuatan Dokumen
                </div>

                <h2 className="mt-1 text-base font-semibold text-slate-900 md:text-lg">
                  {getDocumentLabel(activeType)}
                </h2>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            {/* BODY */}

            <div className="space-y-3.5 p-4 md:p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 md:p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600">
                    <UserRound size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {selected.debitur}
                    </div>

                    <div className="mt-0.5 truncate text-xs text-slate-500">
                      {selected.no_rekening}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Info label="No. PK" value={selected.no_pk} />

                  <Info
                    label="Tgl Lunas"
                    value={formatDate(selected.tgl_lunas)}
                  />

                  <Info label="Pengikatan" value={selected.pengikatan} />

                  <Info label="Limit" value={formatRupiah(selected.limit)} />
                </div>
              </div>

              {activeType === "ROYA" && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3.5 text-xs leading-5 text-blue-800">
                  Surat Roya hanya dibuat untuk pinjaman dengan pengikatan APHT.
                </div>
              )}

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3.5">
                <div className="flex gap-3">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div className="text-xs leading-5 text-amber-800">
                    Setelah dokumen dibuat, nomor dokumen menjadi bagian dari
                    riwayat JOSJIS. Dokumen yang sudah pernah dibuat tidak akan
                    dibuat ulang.
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className="border-t border-slate-200 bg-slate-50 p-3.5 md:px-5 md:py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>

                <button
                  onClick={createDocument}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white"
                >
                  <FileText size={16} />
                  Buat Dokumen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
