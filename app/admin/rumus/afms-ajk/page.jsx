"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import {
  Calculator,
  Search,
  UserRound,
  CreditCard,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  X,
  Database,
  Info,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================================================
   HELPERS
========================================================= */

function formatRupiah(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "Rp0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatNumber(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID").format(number);
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const birth = new Date(dateOfBirth);

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function getCurrentDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================================
   FIELD HELPERS
========================================================= */

function getFirstValue(object, keys) {
  for (const key of keys) {
    if (
      object &&
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ""
    ) {
      return object[key];
    }
  }

  return null;
}

/* =========================================================
   PAGE
========================================================= */

export default function KalkulatorAfmsAjkPage() {
  const { activeUnit } = useUnit();

  const [loading, setLoading] = useState(false);
  const [loadingPk, setLoadingPk] = useState(false);

  const [pkList, setPkList] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedPk, setSelectedPk] = useState(null);

  const [showPkPicker, setShowPkPicker] = useState(false);

  const [jenisPerhitungan, setJenisPerhitungan] = useState("AFMS_AJK");

  const [result, setResult] = useState(null);

  const [error, setError] = useState("");

  /* =======================================================
     LOAD PK
  ======================================================= */

  async function loadPk() {
    setLoadingPk(true);
    setError("");

    try {
      let query = supabase
        .from("pk")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (activeUnit?.id) {
        query = query.eq("unit_id", activeUnit.id);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        throw supabaseError;
      }

      setPkList(data || []);
    } catch (err) {
      console.error("Gagal mengambil data PK:", err);

      setError(
        err?.message ||
          "Data PK belum dapat diambil. Periksa koneksi Supabase dan RLS.",
      );

      setPkList([]);
    } finally {
      setLoadingPk(false);
    }
  }

  useEffect(() => {
    loadPk();
    setSelectedPk(null);
    setResult(null);
  }, [activeUnit?.id]);

  /* =======================================================
     FILTER PK
  ======================================================= */

  const filteredPk = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return pkList;
    }

    return pkList.filter((pk) => {
      const values = [
        pk.nama_debitur,
        pk.nama,
        pk.nik,
        pk.cif,
        pk.no_rekening,
        pk.nomor_rekening,
        pk.no_pk,
        pk.nomor_pk,
        pk.application_number,
        pk.nomor_aplikasi,
      ];

      return values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      );
    });
  }, [pkList, search]);

  /* =======================================================
     NORMALIZE DATA PK
  ======================================================= */

  const normalizedPk = useMemo(() => {
    if (!selectedPk) return null;

    const tanggalLahir = getFirstValue(selectedPk, [
      "tgl_lahir",
      "tanggal_lahir",
      "tanggal_lahir_debitur",
      "birth_date",
      "date_of_birth",
    ]);

    const limit = getFirstValue(selectedPk, [
      "limit",
      "limit_pinjaman",
      "plafond",
      "plafon",
      "jumlah_pinjaman",
    ]);

    const tenor = getFirstValue(selectedPk, [
      "tenor",
      "jangka_waktu",
      "jangka_waktu_bulan",
    ]);

    return {
      id: selectedPk.id,

      namaDebitur: getFirstValue(selectedPk, [
        "nama_debitur",
        "nama",
        "debitur",
      ]),

      nik: getFirstValue(selectedPk, ["nik", "nik_debitur"]),

      cif: getFirstValue(selectedPk, ["cif", "nomor_cif", "no_cif"]),

      jenisKelamin: getFirstValue(selectedPk, [
        "jenis_kelamin",
        "gender",
        "jk",
      ]),

      tempatLahir: getFirstValue(selectedPk, ["tempat_lahir", "birth_place"]),

      tanggalLahir,

      umur: calculateAge(tanggalLahir),

      noRekening: getFirstValue(selectedPk, [
        "no_rekening",
        "nomor_rekening",
        "rekening",
        "no_rek",
      ]),

      noPk: getFirstValue(selectedPk, [
        "no_pk",
        "nomor_pk",
        "nomor_perjanjian",
      ]),

      tanggalPk: getFirstValue(selectedPk, [
        "tgl_pk",
        "tanggal_pk",
        "tgl_perjanjian",
      ]),

      nomorAplikasi: getFirstValue(selectedPk, [
        "application_number",
        "nomor_aplikasi",
        "no_aplikasi",
        "nomor_application",
      ]),

      tanggalAplikasi: getFirstValue(selectedPk, [
        "application_date",
        "tanggal_aplikasi",
        "tgl_aplikasi",
      ]),

      limit,

      tenor,

      jenisPinjaman: getFirstValue(selectedPk, [
        "jenis_pinjaman",
        "jenis_kredit",
        "produk",
        "produk_pinjaman",
      ]),

      statusPerkawinan: getFirstValue(selectedPk, [
        "status_perkawinan",
        "status_kawin",
        "status_istri_suami",
      ]),

      mksId: selectedPk.mks_id,
      unitId: selectedPk.unit_id,

      raw: selectedPk,
    };
  }, [selectedPk]);

  /* =======================================================
     SELECT PK
  ======================================================= */

  function handleSelectPk(pk) {
    setSelectedPk(pk);
    setResult(null);
    setShowPkPicker(false);
    setSearch("");
  }

  /* =======================================================
     PROSES
     
     BELUM MENGHITUNG RUMUS.
     Hanya menyiapkan payload yang nanti dikirim
     ke Excel Engine.
  ======================================================= */

  async function handleProcess() {
    if (!normalizedPk) {
      setError("Pilih data PK terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * Nanti payload ini dikirim ke:
       *
       * D:\APLIKASI\josjis\excel-engine\server.py
       *
       * Contoh:
       *
       * POST /afms-ajk
       *
       * body:
       * {
       *   pk_id,
       *   nama_debitur,
       *   umur,
       *   limit,
       *   tenor,
       *   ...
       * }
       *
       * Excel Engine kemudian mengisi template Excel
       * milik user dan menghasilkan PDF.
       */

      const payload = {
        pk_id: normalizedPk.id,
        unit_id: normalizedPk.unitId,

        tanggal_proses: getCurrentDate(),

        nama_debitur: normalizedPk.namaDebitur,
        nik: normalizedPk.nik,
        cif: normalizedPk.cif,

        tempat_lahir: normalizedPk.tempatLahir,
        tanggal_lahir: normalizedPk.tanggalLahir,
        umur: normalizedPk.umur,

        jenis_kelamin: normalizedPk.jenisKelamin,
        status_perkawinan: normalizedPk.statusPerkawinan,

        no_rekening: normalizedPk.noRekening,
        no_pk: normalizedPk.noPk,
        tanggal_pk: normalizedPk.tanggalPk,

        nomor_aplikasi: normalizedPk.nomorAplikasi,
        tanggal_aplikasi: normalizedPk.tanggalAplikasi,

        limit: normalizedPk.limit,
        tenor: normalizedPk.tenor,
        jenis_pinjaman: normalizedPk.jenisPinjaman,

        jenis_perhitungan: jenisPerhitungan,
      };

      console.log("Payload AFMS/AJK:", payload);

      /*
       * TEMPORARY
       *
       * Untuk sekarang kita tampilkan status bahwa data
       * sudah siap dikirim ke Excel Engine.
       */

      await new Promise((resolve) => setTimeout(resolve, 500));

      setResult({
        status: "READY",
        payload,
        message:
          "Data PK sudah siap untuk diproses oleh Excel Engine dan template AFMS/AJK.",
      });
    } catch (err) {
      console.error(err);

      setError(
        err?.message || "Terjadi kesalahan saat menyiapkan perhitungan.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     RESET
  ======================================================= */

  function handleReset() {
    setSelectedPk(null);
    setResult(null);
    setSearch("");
    setError("");
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <DashboardLayout>
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-6">
          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                  <Calculator className="h-5 w-5" />
                </div>

                <div>
                  <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                    Kalkulator AFMS / AJK
                  </h1>

                  <p className="text-xs text-slate-500 sm:text-sm">
                    Perhitungan berdasarkan data PK dan template Excel
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeUnit && (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
                  {activeUnit.nama_unit ||
                    activeUnit.nama ||
                    activeUnit.kode_unit ||
                    "-"}
                </div>
              )}

              <button
                type="button"
                onClick={loadPk}
                disabled={loadingPk}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingPk ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh PK</span>
              </button>
            </div>
          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />

              <div className="flex-1">{error}</div>

              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* =================================================
              STEP 1 - PILIH PK
          ================================================= */}

          <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Database className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                    1. Pilih Data PK
                  </h2>

                  <p className="text-xs text-slate-500">
                    Data debitur dan pinjaman akan diambil dari database PK.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {!normalizedPk ? (
                <button
                  type="button"
                  onClick={() => setShowPkPicker(true)}
                  className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-400 hover:bg-blue-50/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                      <Search className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800">
                        Cari dan pilih debitur
                      </div>

                      <div className="mt-0.5 text-xs text-slate-500">
                        Nama, NIK, CIF, nomor rekening, atau nomor PK
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                </button>
              ) : (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-base font-bold text-slate-900">
                            {normalizedPk.namaDebitur || "-"}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            {normalizedPk.nik && (
                              <span>NIK: {normalizedPk.nik}</span>
                            )}

                            {normalizedPk.cif && (
                              <span>CIF: {normalizedPk.cif}</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowPkPicker(true)}
                          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <Search className="h-3.5 w-3.5" />
                          Ganti PK
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <MiniInfo
                          label="No. Rekening"
                          value={normalizedPk.noRekening}
                        />

                        <MiniInfo
                          label="Limit"
                          value={
                            normalizedPk.limit != null
                              ? formatRupiah(normalizedPk.limit)
                              : "-"
                          }
                        />

                        <MiniInfo
                          label="Tenor"
                          value={
                            normalizedPk.tenor
                              ? `${formatNumber(normalizedPk.tenor)} bulan`
                              : "-"
                          }
                        />

                        <MiniInfo
                          label="Jenis"
                          value={normalizedPk.jenisPinjaman}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              DATA PK
          ================================================= */}

          {normalizedPk && (
            <>
              <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <UserRound className="h-4 w-4" />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                        2. Data Debitur
                      </h2>

                      <p className="text-xs text-slate-500">
                        Data berasal dari PK dan tidak diedit dari halaman ini.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 sm:grid-cols-3 sm:px-5 lg:grid-cols-4">
                  <DataField
                    label="Nama Debitur"
                    value={normalizedPk.namaDebitur}
                    full
                  />

                  <DataField label="NIK" value={normalizedPk.nik} />

                  <DataField label="CIF" value={normalizedPk.cif} />

                  <DataField
                    label="Tempat Lahir"
                    value={normalizedPk.tempatLahir}
                  />

                  <DataField
                    label="Tanggal Lahir"
                    value={formatDate(normalizedPk.tanggalLahir)}
                  />

                  <DataField
                    label="Umur"
                    value={
                      normalizedPk.umur !== null
                        ? `${normalizedPk.umur} tahun`
                        : "-"
                    }
                    highlight
                  />

                  <DataField
                    label="Jenis Kelamin"
                    value={normalizedPk.jenisKelamin}
                  />

                  <DataField
                    label="Status Perkawinan"
                    value={normalizedPk.statusPerkawinan}
                  />
                </div>
              </section>

              {/* =================================================
                  DATA PINJAMAN
              ================================================= */}

              <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <CreditCard className="h-4 w-4" />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                        3. Data Pinjaman
                      </h2>

                      <p className="text-xs text-slate-500">
                        Informasi pinjaman diambil langsung dari PK.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 sm:grid-cols-3 sm:px-5 lg:grid-cols-4">
                  <DataField
                    label="No. Rekening"
                    value={normalizedPk.noRekening}
                  />

                  <DataField label="No. PK" value={normalizedPk.noPk} />

                  <DataField
                    label="Tanggal PK"
                    value={formatDate(normalizedPk.tanggalPk)}
                  />

                  <DataField
                    label="No. Aplikasi"
                    value={normalizedPk.nomorAplikasi}
                  />

                  <DataField
                    label="Tanggal Aplikasi"
                    value={formatDate(normalizedPk.tanggalAplikasi)}
                  />

                  <DataField
                    label="Limit Pinjaman"
                    value={
                      normalizedPk.limit != null
                        ? formatRupiah(normalizedPk.limit)
                        : "-"
                    }
                    highlight
                  />

                  <DataField
                    label="Tenor"
                    value={
                      normalizedPk.tenor
                        ? `${formatNumber(normalizedPk.tenor)} bulan`
                        : "-"
                    }
                  />

                  <DataField
                    label="Jenis Pinjaman"
                    value={normalizedPk.jenisPinjaman}
                  />
                </div>
              </section>

              {/* =================================================
                  RUMUS
              ================================================= */}

              <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                        4. Tabel Rumus AFMS / AJK
                      </h2>

                      <p className="text-xs text-slate-500">
                        Template Excel akan menjadi sumber perhitungan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setJenisPerhitungan("AFMS_AJK")}
                      className={`rounded-xl border p-4 text-left transition ${
                        jenisPerhitungan === "AFMS_AJK"
                          ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                          <Calculator className="h-4 w-4" />
                        </div>

                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            AFMS / AJK
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            Menggunakan template rumus Excel
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                        <div className="text-xs leading-5 text-slate-500">
                          Perhitungan belum dilakukan di browser. Setelah
                          template Excel tersedia, data PK akan dikirim ke Excel
                          Engine untuk mengisi tabel dan menjalankan rumus yang
                          sudah ada di file tersebut.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TEMPLATE PREVIEW */}

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />

                        <span className="text-xs font-bold text-slate-700">
                          Template AFMS / AJK
                        </span>
                      </div>

                      <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">
                        EXCEL ENGINE
                      </span>
                    </div>

                    <div className="min-h-[180px] bg-white p-4">
                      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
                        <TablePlaceholder title="Parameter" />
                        <TablePlaceholder title="Nilai" />
                        <TablePlaceholder title="Hasil" />

                        <TablePlaceholder value="Nama Debitur" />
                        <TablePlaceholder
                          value={normalizedPk.namaDebitur || "-"}
                        />
                        <TablePlaceholder value="—" />

                        <TablePlaceholder value="Umur" />
                        <TablePlaceholder
                          value={
                            normalizedPk.umur !== null
                              ? `${normalizedPk.umur} tahun`
                              : "-"
                          }
                        />
                        <TablePlaceholder value="—" />

                        <TablePlaceholder value="Limit" />
                        <TablePlaceholder
                          value={
                            normalizedPk.limit != null
                              ? formatRupiah(normalizedPk.limit)
                              : "-"
                          }
                        />
                        <TablePlaceholder value="—" />

                        <TablePlaceholder value="Tenor" />
                        <TablePlaceholder
                          value={
                            normalizedPk.tenor
                              ? `${normalizedPk.tenor} bulan`
                              : "-"
                          }
                        />
                        <TablePlaceholder value="—" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  ACTION
              ================================================= */}

              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Siap diproses
                    </div>

                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Data PK akan digunakan untuk mengisi template Excel
                      AFMS/AJK. Hasil akhirnya akan menjadi dokumen PDF.
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={handleProcess}
                      disabled={loading}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Menyiapkan...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4" />
                          Proses AFMS / AJK
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              {/* =================================================
                  RESULT
              ================================================= */}

              {result && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-emerald-900">
                        Data siap diproses
                      </div>

                      <p className="mt-1 text-xs leading-5 text-emerald-800">
                        {result.message}
                      </p>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          disabled
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-xs font-semibold text-emerald-700 opacity-60"
                        >
                          <FileText className="h-4 w-4" />
                          Lihat PDF
                        </button>

                        <button
                          type="button"
                          disabled
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-xs font-semibold text-emerald-700 opacity-60"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Buka Excel
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* =======================================================
          PK PICKER MODAL
      ======================================================= */}

      {showPkPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            {/* Header */}

            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pilih Data PK
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Pilih debitur yang akan digunakan untuk AFMS/AJK.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPkPicker(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}

            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIK, CIF, no rekening, no PK..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {loadingPk ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Mengambil data PK...
                  </div>
                </div>
              ) : filteredPk.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Search className="h-5 w-5" />
                  </div>

                  <div className="mt-3 text-sm font-semibold text-slate-700">
                    Data PK tidak ditemukan
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Coba gunakan nama, NIK, CIF, nomor rekening, atau nomor PK.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPk.map((pk) => {
                    const nama = getFirstValue(pk, [
                      "nama_debitur",
                      "nama",
                      "debitur",
                    ]);

                    const nik = getFirstValue(pk, ["nik", "nik_debitur"]);

                    const rekening = getFirstValue(pk, [
                      "no_rekening",
                      "nomor_rekening",
                      "rekening",
                      "no_rek",
                    ]);

                    const limit = getFirstValue(pk, [
                      "limit",
                      "limit_pinjaman",
                      "plafond",
                      "plafon",
                    ]);

                    const tenor = getFirstValue(pk, [
                      "tenor",
                      "jangka_waktu",
                      "jangka_waktu_bulan",
                    ]);

                    const jenis = getFirstValue(pk, [
                      "jenis_pinjaman",
                      "jenis_kredit",
                      "produk",
                    ]);

                    const tanggalLahir = getFirstValue(pk, [
                      "tgl_lahir",
                      "tanggal_lahir",
                      "tanggal_lahir_debitur",
                      "birth_date",
                      "date_of_birth",
                    ]);

                    return (
                      <button
                        key={pk.id}
                        type="button"
                        onClick={() => handleSelectPk(pk)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/30 sm:p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <UserRound className="h-5 w-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-slate-900">
                                  {nama || "-"}
                                </div>

                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                  {nik && <span>NIK: {nik}</span>}

                                  {rekening && <span>No. Rek: {rekening}</span>}
                                </div>
                              </div>

                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <PickerInfo
                                label="Limit"
                                value={
                                  limit != null ? formatRupiah(limit) : "-"
                                }
                              />

                              <PickerInfo
                                label="Tenor"
                                value={
                                  tenor ? `${formatNumber(tenor)} bln` : "-"
                                }
                              />

                              <PickerInfo label="Jenis" value={jenis} />

                              <PickerInfo
                                label="Umur"
                                value={
                                  calculateAge(tanggalLahir) !== null
                                    ? `${calculateAge(tanggalLahir)} tahun`
                                    : "-"
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs text-slate-500">
                {filteredPk.length} data ditampilkan
              </div>

              <button
                type="button"
                onClick={() => setShowPkPicker(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 truncate text-xs font-semibold text-slate-700">
        {value || "-"}
      </div>
    </div>
  );
}

function DataField({ label, value, full = false, highlight = false }) {
  return (
    <div className={full ? "col-span-2 sm:col-span-3 lg:col-span-4" : ""}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div
        className={`min-h-[38px] rounded-lg border px-3 py-2 text-sm ${
          highlight
            ? "border-blue-100 bg-blue-50 font-bold text-blue-800"
            : "border-slate-200 bg-slate-50 font-medium text-slate-700"
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function TablePlaceholder({ title, value }) {
  return (
    <div className="min-h-[38px] bg-white px-3 py-2">
      {title ? (
        <div className="text-[10px] font-bold uppercase text-slate-500">
          {title}
        </div>
      ) : (
        <div className="text-xs text-slate-600">{value || "-"}</div>
      )}
    </div>
  );
}

function PickerInfo({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">
        {value || "-"}
      </div>
    </div>
  );
}
