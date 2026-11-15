"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Download,
  RotateCcw,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Copy,
} from "lucide-react";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const uid = () => crypto.randomUUID();

const buatAgunan = () => ({
  id: uid(),
  jenis: "SHM",
  nomor: "",
  namaPemilik: "",
});

const buatDebitur = () => ({
  id: uid(),
  nama: "",
  tanggalOrder: "",
  order: "APHT",
  agunan: [buatAgunan()],
});

const toTitleCase = (value) =>
  String(value ?? "")
    .toLocaleLowerCase("id-ID")
    .replace(
      /(^|[\s'-])(\p{L})/gu,
      (_, separator, letter) => separator + letter.toLocaleUpperCase("id-ID"),
    );

const formatTanggal = (value) => {
  if (!value) return "";

  const [tahun, bulan, hari] = value.split("-");
  return `${hari}/${bulan}/${tahun}`;
};

const hariTanggal = (value) => {
  if (!value) return { hari: "", tanggal: "" };

  const date = new Date(`${value}T00:00:00`);

  return {
    hari: date.toLocaleDateString("id-ID", { weekday: "long" }),
    tanggal: date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  };
};

const buatUraianAgunan = (agunan = []) =>
  agunan
    .map((a) => {
      const jenis = (a.jenis || "").trim().toUpperCase();
      const nomor = (a.nomor || "").trim();
      const pemilik = toTitleCase(a.namaPemilik || "").trim();

      return `${jenis} No. ${nomor} An. ${pemilik}`;
    })
    .join("\n");

const inputClass =
  "min-h-11 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const Field = ({ label, children }) => (
  <label className="block min-w-0 space-y-1.5">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    {children}
  </label>
);

export default function BastNotarisPage() {
  const paperRef = useRef(null);

  const [units, setUnits] = useState([]);
  const [pegawai, setPegawai] = useState([]);
  const [notarisList, setNotarisList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const [unitId, setUnitId] = useState("");
  const [tanggal, setTanggal] = useState(today());

  // Nomor surat
  const [nomorMode, setNomorMode] = useState("template");
  const [nomor, setNomor] = useState("500");
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [nomorManual, setNomorManual] = useState("");

  // MKA
  const [mkaId, setMkaId] = useState("");

  // Notaris
  const [notarisId, setNotarisId] = useState("");
  const [namaNotaris, setNamaNotaris] = useState("");
  const [ktpNotaris, setKtpNotaris] = useState("");
  const [jabatanNotaris, setJabatanNotaris] = useState("Notaris/PPAT");
  const [alamatNotaris, setAlamatNotaris] = useState("");

  // Debitur dan agunan
  const [debitur, setDebitur] = useState([buatDebitur()]);

  // Memuat master data
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      const [unitRes, pegawaiRes, notarisRes] = await Promise.all([
        supabase
          .from("unit")
          .select("id,nama_unit,kode_unit")
          .in("kode_unit", ["JKK1", "JKK2"])
          .eq("status", "AKTIF")
          .order("kode_unit"),

        supabase
          .from("pegawai")
          .select("id,nama,nip,jabatan,jenis_pegawai,unit_id")
          .eq("aktif", true),

        supabase
          .from("notaris")
          .select("id,nama_notaris,nik,jabatan,kabupaten,provinsi")
          .order("nama_notaris"),
      ]);

      if (!active) return;

      const failure = unitRes.error || pegawaiRes.error || notarisRes.error;

      if (failure) {
        setError(failure.message);
      } else {
        setUnits(unitRes.data || []);
        setPegawai(pegawaiRes.data || []);
        setNotarisList(notarisRes.data || []);

        if (unitRes.data?.length) {
          setUnitId(unitRes.data[0].id);
        }
      }

      setLoading(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const unit = units.find((u) => u.id === unitId);

  const pegawaiUnit = pegawai.filter((p) => p.unit_id === unitId);

  const mkaList = pegawaiUnit.filter((p) => p.jenis_pegawai === "MKA");

  const mka = mkaList.find((p) => p.id === mkaId) || mkaList[0];

  const notaris = notarisList.find((n) => n.id === notarisId);

  const namaPihakKedua = notaris?.nama_notaris || namaNotaris;

  const jabatanPihakKedua =
    notaris?.jabatan || jabatanNotaris || "Notaris/PPAT";

  const { hari, tanggal: tanggalPanjang } = hariTanggal(tanggal);

  const lokasiUnit =
    unit?.kode_unit === "JKK2"
      ? "Jambi Kuamang Kuning 2"
      : "Jambi Kuamang Kuning 1";

  const namaUnitTandaTangan =
    unit?.kode_unit === "JKK2"
      ? "MKA KUAMANG KUNING 2"
      : "MKA KUAMANG KUNING 1";

  const nomorSurat =
    nomorMode === "manual"
      ? nomorManual.trim()
      : `CSB.R02.JBI.JKK/${nomor || "___"}/${tahun || "____"}`;

  // Otomatis memilih MKA berdasarkan unit aktif
  useEffect(() => {
    if (!mkaList.length) {
      setMkaId("");
      return;
    }

    if (!mkaList.some((p) => p.id === mkaId)) {
      setMkaId(mkaList[0].id);
    }
  }, [unitId, pegawai, mkaId]);

  // Mengisi data Notaris dari master
  useEffect(() => {
    if (!notaris) return;

    setNamaNotaris(notaris.nama_notaris || "");
    setKtpNotaris(notaris.nik || "");
    setJabatanNotaris(notaris.jabatan || "Notaris/PPAT");
    setAlamatNotaris(
      [notaris.kabupaten, notaris.provinsi].filter(Boolean).join(", "),
    );
  }, [notarisId, notaris]);

  const updateDebitur = (id, field, value) => {
    setDebitur((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const updateAgunan = (debiturId, agunanId, field, value) => {
    setDebitur((items) =>
      items.map((item) =>
        item.id === debiturId
          ? {
              ...item,
              agunan: item.agunan.map((a) =>
                a.id === agunanId ? { ...a, [field]: value } : a,
              ),
            }
          : item,
      ),
    );
  };

  const tambahDebitur = () => {
    setDebitur((items) => [...items, buatDebitur()]);
  };

  const hapusDebitur = (id) => {
    setDebitur((items) => items.filter((item) => item.id !== id));
  };

  const tambahAgunan = (debiturId) => {
    setDebitur((items) =>
      items.map((item) =>
        item.id === debiturId
          ? { ...item, agunan: [...item.agunan, buatAgunan()] }
          : item,
      ),
    );
  };

  const hapusAgunan = (debiturId, agunanId) => {
    setDebitur((items) =>
      items.map((item) =>
        item.id === debiturId
          ? {
              ...item,
              agunan: item.agunan.filter((a) => a.id !== agunanId),
            }
          : item,
      ),
    );
  };

  const resetForm = () => {
    setTanggal(today());

    setNomorMode("template");
    setNomor("500");
    setTahun(String(new Date().getFullYear()));
    setNomorManual("");

    setMkaId(mkaList[0]?.id || "");

    setNotarisId("");
    setNamaNotaris("");
    setKtpNotaris("");
    setJabatanNotaris("Notaris/PPAT");
    setAlamatNotaris("");

    setDebitur([buatDebitur()]);
    setError("");
  };

  // Membuat PDF
  const downloadPDF = async () => {
    if (!paperRef.current) {
      setError("Dokumen belum siap dibuat.");
      return;
    }

    if (!unitId || !tanggal) {
      setError("Unit dan tanggal serah terima harus diisi.");
      return;
    }

    if (!nomorSurat.trim()) {
      setError("Nomor surat harus diisi.");
      return;
    }

    if (nomorMode === "template" && (!nomor.trim() || !tahun.trim())) {
      setError("Nomor urut dan tahun surat harus diisi.");
      return;
    }

    if (!mka) {
      setError("Data MKA belum tersedia untuk unit ini.");
      return;
    }

    if (!namaPihakKedua.trim()) {
      setError("Nama Notaris/PPAT harus diisi.");
      return;
    }

    if (!debitur.length || debitur.some((item) => !item.nama.trim())) {
      setError("Nama seluruh debitur harus diisi.");
      return;
    }

    if (
      debitur.some(
        (item) =>
          !item.tanggalOrder ||
          !item.order ||
          !item.agunan.length ||
          item.agunan.some(
            (a) => !a.jenis || !a.nomor.trim() || !a.namaPemilik.trim(),
          ),
      )
    ) {
      setError(
        "Lengkapi tanggal order, jenis order, serta jenis, nomor, dan nama pada setiap agunan.",
      );
      return;
    }

    setDownloading(true);
    setError("");

    try {
      const logo = paperRef.current.querySelector(".bast-logo");

      if (logo && !logo.complete) {
        await new Promise((resolve, reject) => {
          logo.onload = resolve;
          logo.onerror = () => reject(new Error("Logo Mandiri gagal dimuat."));
        });
      }

      if (logo && logo.complete && logo.naturalWidth === 0) {
        throw new Error(
          "Logo Mandiri tidak ditemukan. Periksa public/images/mandiri-logo.png.",
        );
      }

      const module = await import("jspdf-html2canvas");

      const html2PDF =
        module.html2PDF || module.default?.html2PDF || module.default;

      if (typeof html2PDF !== "function") {
        throw new Error("Fungsi pembuat PDF tidak ditemukan.");
      }

      const safeNomor = nomorSurat.replace(/[^\w.-]/g, "_");

      await html2PDF(paperRef.current, {
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        html2canvas: {
          scale: 3,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
          windowHeight: 1123,
        },
        imageType: "image/jpeg",
        imageQuality: 0.98,
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
        output: `BAST_Notaris_${safeNomor}.pdf`,
        filename: `BAST_Notaris_${safeNomor}.pdf`,
        pagebreak: {
          mode: ["css", "legacy"],
        },
      });
    } catch (err) {
      console.error("Gagal membuat PDF:", err);
      setError(err?.message || "Gagal membuat PDF.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-gray-500">
        <Loader2 className="animate-spin" size={20} />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-3 sm:space-y-5 sm:p-5 lg:p-6">
      {/* HEADER HALAMAN */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">BAST Notaris</h1>
          <p className="mt-1 text-sm text-gray-500">
            Berita acara serah terima dokumen kepada Notaris/PPAT.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={resetForm}
            disabled={downloading}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <button
            type="button"
            onClick={downloadPDF}
            disabled={downloading}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {downloading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Membuat PDF...
              </>
            ) : (
              <>
                <Download size={16} />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* DATA SURAT */}
      <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Data Berita Acara</h2>
            <p className="text-xs text-gray-500">
              Informasi surat dan pegawai.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Unit">
            <select
              className={inputClass}
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nama_unit}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tanggal serah terima">
            <input
              type="date"
              className={inputClass}
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </Field>

          <Field label="Pegawai PIHAK PERTAMA (MKA)">
            <select
              className={inputClass}
              value={mkaId}
              onChange={(e) => setMkaId(e.target.value)}
            >
              {mkaList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} — {p.nip || "-"}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* NOMOR SURAT */}
        <div className="mt-5 border-t border-gray-200 pt-4">
          <p className="mb-3 text-sm font-semibold text-gray-800">
            Nomor Surat
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNomorMode("template")}
              className={`min-h-10 rounded-lg border px-4 text-sm font-medium ${
                nomorMode === "template"
                  ? "border-blue-700 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-600"
              }`}
            >
              Gunakan Template
            </button>

            <button
              type="button"
              onClick={() => setNomorMode("manual")}
              className={`min-h-10 rounded-lg border px-4 text-sm font-medium ${
                nomorMode === "manual"
                  ? "border-blue-700 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-600"
              }`}
            >
              Input Manual
            </button>
          </div>

          {nomorMode === "template" ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nomor urut">
                  <input
                    className={inputClass}
                    value={nomor}
                    onChange={(e) => setNomor(e.target.value)}
                    placeholder="Contoh: 500"
                  />
                </Field>

                <Field label="Tahun">
                  <input
                    className={inputClass}
                    value={tahun}
                    onChange={(e) => setTahun(e.target.value)}
                    placeholder="Contoh: 2026"
                  />
                </Field>
              </div>

              <div className="mt-3 rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">
                  Nomor surat yang digunakan
                </p>
                <p className="mt-1 break-all font-semibold text-gray-800">
                  {nomorSurat}
                </p>
              </div>
            </>
          ) : (
            <>
              <Field label="Nomor surat lengkap">
                <input
                  className={inputClass}
                  value={nomorManual}
                  onChange={(e) => setNomorManual(e.target.value)}
                  placeholder="Ketik nomor surat lengkap sesuai format terbaru"
                />
              </Field>

              <div className="mt-3 rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">
                  Nomor surat yang digunakan
                </p>
                <p className="mt-1 break-all font-semibold text-gray-800">
                  {nomorSurat || "Belum diisi"}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* DATA NOTARIS */}
      <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
        <h2 className="mb-1 font-semibold text-gray-900">
          Data Notaris / PPAT
        </h2>
        <p className="mb-4 text-xs text-gray-500">
          Pilih dari master atau isi secara manual.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Pilih dari Master Notaris">
            <select
              className={inputClass}
              value={notarisId}
              onChange={(e) => setNotarisId(e.target.value)}
            >
              <option value="">Input manual</option>
              {notarisList.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nama_notaris} — {n.kabupaten || ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nama Notaris">
            <input
              className={inputClass}
              value={namaNotaris}
              onChange={(e) => {
                setNotarisId("");
                setNamaNotaris(e.target.value);
              }}
              placeholder="Nama lengkap Notaris"
            />
          </Field>

          <Field label="NIK / Nomor KTP">
            <input
              className={inputClass}
              value={ktpNotaris}
              onChange={(e) => setKtpNotaris(e.target.value)}
              placeholder="Nomor NIK"
            />
          </Field>

          <Field label="Jabatan">
            <input
              className={inputClass}
              value={jabatanNotaris}
              onChange={(e) => setJabatanNotaris(e.target.value)}
              placeholder="Notaris/PPAT"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Alamat Notaris">
              <textarea
                className={inputClass}
                rows={2}
                value={alamatNotaris}
                onChange={(e) => setAlamatNotaris(e.target.value)}
                placeholder="Alamat lengkap Notaris"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* DEBITUR DAN AGUNAN */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Debitur dan Agunan</h2>
            <p className="text-xs text-gray-500">
              Setiap debitur dapat memiliki lebih dari satu agunan.
            </p>
          </div>

          <button
            type="button"
            onClick={tambahDebitur}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white"
          >
            <Plus size={17} />
            Tambah Debitur
          </button>
        </div>

        {debitur.map((item, index) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 border-b bg-gray-50 px-3 py-3 sm:px-4">
              <div>
                <p className="font-semibold text-gray-900">
                  Debitur {index + 1}
                </p>
                <p className="text-xs text-gray-500">
                  {item.agunan.length} agunan
                </p>
              </div>

              {debitur.length > 1 && (
                <button
                  type="button"
                  onClick={() => hapusDebitur(item.id)}
                  className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                  Hapus
                </button>
              )}
            </div>

            <div className="space-y-4 p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nama debitur">
                  <input
                    className={inputClass}
                    value={item.nama}
                    onChange={(e) =>
                      updateDebitur(
                        item.id,
                        "nama",
                        toTitleCase(e.target.value),
                      )
                    }
                    placeholder="Nama lengkap debitur"
                  />
                </Field>

                <Field label="Tanggal order">
                  <input
                    type="date"
                    className={inputClass}
                    value={item.tanggalOrder}
                    onChange={(e) =>
                      updateDebitur(item.id, "tanggalOrder", e.target.value)
                    }
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Jenis order">
                    <select
                      className={inputClass}
                      value={item.order}
                      onChange={(e) =>
                        updateDebitur(item.id, "order", e.target.value)
                      }
                    >
                      {[
                        "APHT",
                        "SKMHT",
                        "ROYA",
                        "BALIK NAMA",
                        "APHT + ROYA",
                        "LAINNYA",
                      ].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {/* AGUNAN */}
              <div className="border-t pt-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      Agunan
                    </h3>
                    <p className="text-xs text-gray-500">
                      Isi data sertifikat yang akan diserahkan.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => tambahAgunan(item.id)}
                    className="flex min-h-9 items-center gap-1 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <Plus size={15} />
                    Tambah
                  </button>
                </div>

                <div className="space-y-3">
                  {item.agunan.map((a, agunanIndex) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">
                          Agunan {agunanIndex + 1}
                        </span>

                        {item.agunan.length > 1 && (
                          <button
                            type="button"
                            onClick={() => hapusAgunan(item.id, a.id)}
                            className="flex items-center gap-1 text-xs font-medium text-red-600"
                          >
                            <Trash2 size={14} />
                            Hapus
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Field label="Jenis sertifikat">
                          <select
                            className={inputClass}
                            value={a.jenis}
                            onChange={(e) =>
                              updateAgunan(
                                item.id,
                                a.id,
                                "jenis",
                                e.target.value,
                              )
                            }
                          >
                            {[
                              "SHM",
                              "SHGB",
                              "SHGU",
                              "SHP",
                              "NIB",
                              "BPKB",
                              "LAINNYA",
                            ].map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Nomor sertifikat">
                          <input
                            className={inputClass}
                            value={a.nomor}
                            onChange={(e) =>
                              updateAgunan(
                                item.id,
                                a.id,
                                "nomor",
                                e.target.value,
                              )
                            }
                            placeholder="Contoh: 112"
                          />
                        </Field>

                        <Field label="Atas nama">
                          <div className="space-y-2">
                            <input
                              className={inputClass}
                              value={a.namaPemilik}
                              onChange={(e) =>
                                updateAgunan(
                                  item.id,
                                  a.id,
                                  "namaPemilik",
                                  toTitleCase(e.target.value),
                                )
                              }
                              placeholder="Nama pada sertifikat"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                updateAgunan(
                                  item.id,
                                  a.id,
                                  "namaPemilik",
                                  item.nama,
                                )
                              }
                              disabled={!item.nama.trim()}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Copy size={13} />
                              Samakan dengan Nama Debitur
                            </button>
                          </div>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* DOKUMEN CETAK */}
      <div ref={paperRef} className="bast-paper">
        {/* JUDUL DAN LOGO */}
        <div className="bast-header">
          <div className="bast-title-area">
            <div className="bast-title">BERITA ACARA</div>
            <div className="bast-title bast-title-bold">
              SERAH TERIMA DOKUMEN
            </div>
            <div className="bast-nomor">Nomor: {nomorSurat}</div>
          </div>

          <div className="bast-company">
            <img
              src="/images/mandiri-logo.png"
              alt="Logo Bank Mandiri"
              crossOrigin="anonymous"
              className="bast-logo"
            />

            <div className="bast-company-name">
              PT BANK MANDIRI (Persero) Tbk.
            </div>
            <div>Mandiri Mitra Usaha</div>
            <div>{lokasiUnit}</div>
            <div>Jl. Batanghari RT.06/02</div>
            <div>Ds. Purwasari Kec. Pelepat Ilir</div>
            <div>Bungo - Jambi</div>
            <div>Telp.: 07477326156 / Fax.:</div>
          </div>
        </div>

        {/* PEMBUKAAN */}
        <p className="bast-paragraph bast-opening">
          Pada hari ini {hari} tanggal {tanggalPanjang} bertempat di PT Bank
          Mandiri (Persero) Tbk. Kantor Cabang Mikro / Mandiri Mitra Usaha Jambi
          Kuamang Kuning beralamat di Jalan Batang Hari RT/TW 006/002, Desa
          Purwasari, Kec. Pelepat Ilir, Kab. Bungo - Jambi, telah dilakukan
          serah terima dokumen antara:
        </p>

        {/* PIHAK PERTAMA */}
        <div className="bast-identity bast-party-one">
          <div className="bast-identity-row">
            <span>I.</span>
            <span>Nama</span>
            <span>:</span>
            <span>{mka?.nama || "................................"}</span>
          </div>

          <div className="bast-identity-row">
            <span></span>
            <span>NIP</span>
            <span>:</span>
            <span>{mka?.nip || "................................"}</span>
          </div>

          <div className="bast-identity-row">
            <span></span>
            <span>Unit Kerja</span>
            <span>:</span>
            <span>{unit?.nama_unit || "................................"}</span>
          </div>

          <div className="bast-identity-closing">
            Selanjutnya disebut “PIHAK PERTAMA”
          </div>
        </div>

        {/* PIHAK KEDUA */}
        <div className="bast-identity bast-party-two">
          <div className="bast-identity-row">
            <span>II.</span>
            <span>Nama</span>
            <span>:</span>
            <span>{namaPihakKedua || "................................"}</span>
          </div>

          <div className="bast-identity-row">
            <span></span>
            <span>KTP</span>
            <span>:</span>
            <span>{ktpNotaris || "................................"}</span>
          </div>

          <div className="bast-identity-row">
            <span></span>
            <span>Jabatan</span>
            <span>:</span>
            <span>{jabatanPihakKedua}</span>
          </div>

          <div className="bast-identity-row">
            <span></span>
            <span>Alamat</span>
            <span>:</span>
            <span>{alamatNotaris || "................................"}</span>
          </div>

          <div className="bast-identity-closing">
            Selanjutnya disebut “PIHAK KEDUA”
          </div>
        </div>

        <div className="bast-intro-table">
          Atas Dokumen dengan Keterangan sebagai berikut:
        </div>

        {/* KETENTUAN */}
        <div className="bast-clauses">
          <div className="bast-clause">
            <span>1.</span>
            <span>
              Bahwa PIHAK PERTAMA telah menyerahkan kepada PIHAK KEDUA dokumen
              asli milik {debitur.length} debitur.
            </span>
          </div>

          <div className="bast-clause">
            <span>2.</span>
            <span>
              Bahwa mulai sejak tanggal serah terima ini maka PIHAK KEDUA
              bertanggung jawab untuk menyelesaikan proses Roya, Balik Nama,
              SKMHT dan APHT tersebut.
            </span>
          </div>

          <div className="bast-clause">
            <span>3.</span>
            <span>
              PIHAK KEDUA akan menyerahkan kembali sertifikat tersebut kepada
              pihak pertama setelah selesainya proses Roya, Balik Nama, SKMHT
              dan APHT tersebut sesuai penjelasan jangka waktu yang tertera di
              Cover Note.
            </span>
          </div>
        </div>

        {/* TABEL DOKUMEN */}
        <table className="bast-table">
          <colgroup>
            <col className="col-no" />
            <col className="col-nama" />
            <col className="col-tanggal" />
            <col className="col-order" />
            <col className="col-uraian" />
          </colgroup>

          <thead>
            <tr>
              <th>NO</th>
              <th>NAMA</th>
              <th>TGL ORDER</th>
              <th>ORDER</th>
              <th>URAIAN SERTIPIKAT</th>
            </tr>
          </thead>

          <tbody>
            {debitur.map((item, index) => (
              <tr key={item.id}>
                <td className="bast-center">{index + 1}</td>
                <td className="bast-center">{item.nama}</td>
                <td className="bast-center">
                  {formatTanggal(item.tanggalOrder)}
                </td>
                <td className="bast-center">{item.order}</td>
                <td className="bast-uraian">{buatUraianAgunan(item.agunan)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PENUTUP */}
        <p className="bast-closing">
          Demikian Berita Acara Serah Terima Agunan ini dibuat dengan sebenarnya
          dan ditandatangani di tempat pada hari dan tanggal tersebut di atas.
        </p>

        {/* TANDA TANGAN */}
        <div className="bast-signatures">
          <div className="bast-signature-party">
            <div className="bast-signature-heading">PIHAK PERTAMA</div>

            <div className="bast-signature-space" />

            <div className="bast-signature-name">{mka?.nama || ""}</div>

            <div className="bast-signature-unit">{namaUnitTandaTangan}</div>
          </div>

          <div className="bast-signature-party bast-signature-second">
            <div className="bast-signature-heading">PIHAK KEDUA</div>

            <div className="bast-signature-space" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .bast-paper {
          position: fixed;
          top: 0;
          left: -20000px;
          display: block;
          width: 210mm;
          min-height: 297mm;
          padding: 12mm 13mm 12mm;
          box-sizing: border-box;
          background: #ffffff;
          color: #000000;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10.5pt;
          line-height: 1.3;
          z-index: -1;
        }

        .bast-paper * {
          box-sizing: border-box;
        }

        /* HEADER */
        .bast-header {
          position: relative;
          width: 100%;
          min-height: 43mm;
          margin-bottom: 2mm;
          padding-top: 0;
        }

        /* JUDUL DITURUNKAN, TETAP DI TENGAH */
        .bast-title-area {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          padding-top: 14mm;
        }

        .bast-title {
          width: 100%;
          text-align: center;
          font-size: 12pt;
          line-height: 1.35;
          font-weight: normal;
        }

        .bast-title-bold {
          font-weight: bold;
          text-decoration: underline;
          text-underline-offset: 1px;
        }

        .bast-nomor {
          margin-top: 2mm;
          text-align: center;
          font-size: 10pt;
          line-height: 1.3;
        }

        /* LOGO MANDIRI DIPERBESAR */
        .bast-company {
          position: absolute;
          top: -8mm;
          right: 0;
          width: 65mm;
          text-align: right;
          font-size: 6.5pt;
          line-height: 1.22;
          font-weight: bold;
          z-index: 10;
        }

        .bast-logo {
          display: block;
          width: 65mm;
          height: 25mm;
          object-fit: contain;
          object-position: right center;
          margin: 0 -20mm 1mm auto;
        }

        .bast-company-name {
          font-weight: bold;
          font-size: 6.5pt;
        }

        /* PEMBUKAAN */
        .bast-paragraph {
          text-align: justify;
          line-height: 1.4;
          margin: 0;
          font-size: 10.5pt;
        }

        .bast-opening {
          margin-top: 0;
          margin-bottom: 4mm;
        }

        /* IDENTITAS PIHAK */
        .bast-identity {
          font-size: 10.5pt;
          line-height: 1.35;
        }

        .bast-party-one {
          margin-top: 2mm;
        }

        .bast-party-two {
          margin-top: 3mm;
        }

        .bast-identity-row {
          display: grid;
          grid-template-columns: 8mm 25mm 4mm minmax(0, 1fr);
          align-items: start;
          min-height: 5mm;
        }

        .bast-identity-row > span:last-child {
          overflow-wrap: anywhere;
        }

        .bast-identity-closing {
          margin-top: 1mm;
        }

        .bast-intro-table {
          margin-top: 4mm;
          margin-bottom: 2mm;
          font-size: 10.5pt;
        }

        /* KETENTUAN */
        .bast-clauses {
          margin-top: 1mm;
          margin-bottom: 3mm;
          font-size: 10.5pt;
          text-align: justify;
          line-height: 1.35;
        }

        .bast-clause {
          display: grid;
          grid-template-columns: 7mm minmax(0, 1fr);
          align-items: start;
          margin-bottom: 1.5mm;
        }

        .bast-clause > span:first-child {
          text-align: left;
        }

        .bast-clause > span:last-child {
          text-align: justify;
        }

        /* TABEL */
        .bast-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-family: "Times New Roman", serif;
          font-size: 9pt;
          margin-top: 3mm;
          color: #000000;
          border: 0.35px solid #777777;
        }

        .bast-table th,
        .bast-table td {
          border: 0.35px solid #777777;
          padding: 1.8mm 1.3mm;
          vertical-align: top;
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .bast-table th {
          background: #92d050;
          text-align: center;
          vertical-align: middle;
          font-weight: bold;
          font-size: 9pt;
          padding: 2mm 1mm;
        }

        .bast-table .col-no {
          width: 6%;
        }

        .bast-table .col-nama {
          width: 21%;
        }

        .bast-table .col-tanggal {
          width: 13%;
        }

        .bast-table .col-order {
          width: 25%;
        }

        .bast-table .col-uraian {
          width: 35%;
        }

        .bast-table td {
          line-height: 1.3;
        }

        .bast-center {
          text-align: center;
          vertical-align: top !important;
        }

        .bast-uraian {
          white-space: pre-line;
          text-align: left;
          vertical-align: top !important;
          line-height: 1.4;
        }

        /* PENUTUP */
        .bast-closing {
          margin-top: 4mm;
          margin-bottom: 0;
          font-size: 10.5pt;
          text-align: justify;
          line-height: 1.4;
        }

        /* TANDA TANGAN */
        .bast-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 22mm;
          width: 100%;
          margin-top: 11mm;
          text-align: center;
          font-size: 10pt;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .bast-signature-party {
          min-width: 0;
          text-align: center;
        }

        .bast-signature-heading {
          font-weight: normal;
          margin-bottom: 1mm;
        }

        .bast-signature-unit {
          font-size: 9pt;
          font-weight: normal;
        }

        .bast-signature-space {
          height: 23mm;
        }

        .bast-signature-name {
          display: inline-block;
          min-width: 35mm;
          border-bottom: 0.5px solid #000000;
          font-weight: bold;
          text-decoration: none;
          padding-bottom: 1px;
        }

        @media print {
          .bast-paper {
            position: static;
            left: auto;
            top: auto;
            z-index: auto;
          }
        }
      `}</style>
    </div>
  );
}
