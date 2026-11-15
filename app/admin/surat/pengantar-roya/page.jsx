"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  RotateCcw,
  Loader2,
  FileText,
  Plus,
  Trash2,
  Download,
  Copy,
} from "lucide-react";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const titleCase = (value) =>
  value
    .toLocaleLowerCase("id-ID")
    .replace(
      /(^|[\s'-])([a-zà-öø-ÿ])/g,
      (_, separator, letter) => separator + letter.toLocaleUpperCase("id-ID"),
    );

const formatLuas = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
};

const formatTanggal = (value) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatTanggalSingkat = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const buatAgunan = () => ({
  id:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  jenisSertifikat: "SHM",
  nomorSertifikat: "",
  namaPemilik: "",
  luas: "",
  desa: "",
  kecamatan: "",
  kabupaten: "",
  provinsi: "Jambi",
  tanggalTerbit: "",
  peringkat: "I",
  nomorHakTanggungan: "",
  tanggalApht: "",
});

const inputClass =
  "w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 space-y-1.5 ${className}`}>
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

export default function PengantarRoyaPage() {
  const paperRef = useRef(null);

  const [units, setUnits] = useState([]);
  const [pegawai, setPegawai] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const [unitId, setUnitId] = useState("");
  const [tanggal, setTanggal] = useState(today());
  const [nomor, setNomor] = useState("541");
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [kabupatenTujuan, setKabupatenTujuan] = useState("Bangko");
  const [agunan, setAgunan] = useState([buatAgunan()]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      const [unitRes, pegawaiRes] = await Promise.all([
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
      ]);

      if (!active) return;

      if (unitRes.error || pegawaiRes.error) {
        setError(unitRes.error?.message || pegawaiRes.error?.message);
      } else {
        const daftarUnit = unitRes.data || [];
        setUnits(daftarUnit);
        setPegawai(pegawaiRes.data || []);

        if (daftarUnit.length > 0) {
          setUnitId(daftarUnit[0].id);
        }
      }

      setLoading(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const unit = units.find((item) => item.id === unitId);

  const penyelia = useMemo(
    () =>
      pegawai.find(
        (p) => p.unit_id === unitId && p.jenis_pegawai === "PENGAWAS",
      ),
    [pegawai, unitId],
  );

  const namaUnit =
    unit?.kode_unit === "JKK2" ? "Kuamang Kuning 2" : "Kuamang Kuning 1";

  const nomorSurat = `CSB.R02.JBI.JKK/${nomor || "........"}/${tahun || "........"}`;

  function updateAgunan(id, field, value) {
    setAgunan((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  function sesuaikanDenganAgunanPertama(id) {
    setAgunan((current) => {
      if (current.length < 2) return current;

      const sumber = current[0];

      return current.map((item) => {
        if (item.id !== id) return item;

        return {
          ...item,
          jenisSertifikat: sumber.jenisSertifikat,
          nomorSertifikat: sumber.nomorSertifikat,
          namaPemilik: sumber.namaPemilik,
          luas: sumber.luas,
          desa: sumber.desa,
          kecamatan: sumber.kecamatan,
          kabupaten: sumber.kabupaten,
          provinsi: sumber.provinsi,
          tanggalTerbit: sumber.tanggalTerbit,
          peringkat: item.peringkat,
          nomorHakTanggungan: item.nomorHakTanggungan,
          tanggalApht: item.tanggalApht,
        };
      });
    });
  }

  function tambahAgunan() {
    setAgunan((current) => [...current, buatAgunan()]);
  }

  function hapusAgunan(id) {
    setAgunan((current) =>
      current.length > 1 ? current.filter((item) => item.id !== id) : current,
    );
  }

  function getLokasi(item) {
    return [
      item.desa && `Desa ${item.desa}`,
      item.kecamatan && `Kec. ${item.kecamatan}`,
      item.kabupaten && `Kab. ${item.kabupaten}`,
      item.provinsi && `Prov. ${item.provinsi}`,
    ]
      .filter(Boolean)
      .join(", ");
  }

  function resetForm() {
    setTanggal(today());
    setNomor("541");
    setTahun(String(new Date().getFullYear()));
    setKabupatenTujuan("Bangko");
    setAgunan([buatAgunan()]);
  }

  // DOWNLOAD PDF LANGSUNG, MENGGUNAKAN METODE YANG SAMA DENGAN BAST.
  async function downloadPDF() {
    if (downloading) return;

    if (!paperRef.current) {
      alert("Dokumen Pengantar Roya belum siap.");
      return;
    }

    if (!unitId) {
      alert("Pilih unit penerbit terlebih dahulu.");
      return;
    }

    if (!penyelia?.nama) {
      alert(
        "Data Penyelia untuk unit ini belum tersedia. Lengkapi data pegawai terlebih dahulu.",
      );
      return;
    }

    if (!tanggal) {
      alert("Tanggal surat harus diisi.");
      return;
    }

    if (!nomor.trim() || !tahun.trim()) {
      alert("Nomor urut dan tahun surat harus diisi.");
      return;
    }

    if (!kabupatenTujuan.trim()) {
      alert("Kabupaten tujuan harus diisi.");
      return;
    }

    if (
      agunan.some(
        (item) =>
          !item.namaPemilik.trim() ||
          !item.nomorSertifikat.trim() ||
          !item.nomorHakTanggungan.trim(),
      )
    ) {
      alert(
        "Lengkapi nama pemilik, nomor sertifikat, dan nomor Hak Tanggungan pada setiap agunan.",
      );
      return;
    }

    setDownloading(true);

    try {
      const paper = paperRef.current;

      // Pastikan font siap sebelum dokumen diproses.
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      // Pastikan logo Mandiri sudah selesai dimuat.
      const logo = paper.querySelector(".roya-logo");

      if (logo) {
        if (!logo.complete) {
          await new Promise((resolve) => {
            logo.onload = resolve;
            logo.onerror = resolve;
          });
        }

        if (logo.decode && logo.complete && logo.naturalWidth > 0) {
          await logo.decode();
        }

        if (!logo.naturalWidth) {
          console.warn("Logo Mandiri tidak berhasil dimuat.");
        }
      }

      // Beri kesempatan browser menyelesaikan render dokumen.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );

      // Gunakan library yang sama seperti halaman BAST.
      const module = await import("jspdf-html2canvas");
      const html2PDF = module.default || module;

      if (typeof html2PDF !== "function") {
        throw new Error("Library PDF tidak dapat dijalankan.");
      }

      const nomorAman = nomorSurat.replace(/[^\w.-]/g, "-");
      const tanggalAman = tanggal || today();
      const kodeUnik =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 8)
          : `${Date.now()}`;

      await html2PDF(paper, {
        jsPDF: {
          format: "a4",
          orientation: "portrait",
          unit: "mm",
          margin: 0,
        },
        imageType: "image/jpeg",
        imageQuality: 0.98,
        output: `Pengantar-Roya-${nomorAman}-${tanggalAman}-${kodeUnik}.pdf`,
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
        },
      });
    } catch (err) {
      console.error("PDF Pengantar Roya:", err);

      alert(
        `Unduhan PDF otomatis gagal: ${err?.message || "Terjadi kesalahan."}\n\nPastikan library jspdf-html2canvas sudah terpasang.`,
      );
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-gray-500">
        <Loader2 className="animate-spin" size={20} />
        Memuat data unit dan Penyelia...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Pengantar Roya
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Pembuatan surat permohonan roya sertifikat.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={resetForm}
            disabled={downloading}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <button
            type="button"
            onClick={downloadPDF}
            disabled={downloading}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? (
              <>
                <Loader2 className="animate-spin" size={17} />
                Membuat PDF...
              </>
            ) : (
              <>
                <Download size={17} />
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

      <div className="space-y-5">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Informasi Surat</h2>
              <p className="text-xs text-gray-500">
                Identitas surat dan unit penerbit.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Unit penerbit">
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

            <Field label="Nomor urut surat">
              <input
                className={inputClass}
                value={nomor}
                onChange={(e) => setNomor(e.target.value)}
                placeholder="541"
              />
            </Field>

            <Field label="Tahun surat">
              <input
                className={inputClass}
                inputMode="numeric"
                value={tahun}
                onChange={(e) =>
                  setTahun(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="2026"
              />
            </Field>

            <Field label="Tanggal surat">
              <input
                type="date"
                className={inputClass}
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>

            <Field label="Kabupaten tujuan Kantor Pertanahan">
              <input
                className={inputClass}
                value={kabupatenTujuan}
                onChange={(e) => setKabupatenTujuan(titleCase(e.target.value))}
                placeholder="Contoh: Bangko"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Data Sertifikat dan Pengikatan
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Tambahkan beberapa agunan. Semua data akan masuk ke satu tabel
                yang sama pada surat.
              </p>
            </div>

            <button
              type="button"
              onClick={tambahAgunan}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Plus size={17} />
              Tambah Agunan
            </button>
          </div>

          {agunan.map((item, index) => (
            <section
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Agunan {index + 1}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Data sertifikat dan pengikatan agunan ini.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => sesuaikanDenganAgunanPertama(item.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <Copy size={14} />
                      Sesuaikan dengan Data Agunan Pertama
                    </button>
                  )}

                  {agunan.length > 1 && (
                    <button
                      type="button"
                      onClick={() => hapusAgunan(item.id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Jenis sertifikat">
                  <select
                    className={inputClass}
                    value={item.jenisSertifikat}
                    onChange={(e) =>
                      updateAgunan(item.id, "jenisSertifikat", e.target.value)
                    }
                  >
                    <option value="SHM">SHM</option>
                    <option value="SHM NIB">SHM NIB</option>
                  </select>
                </Field>

                <Field label="Nomor sertifikat">
                  <input
                    className={inputClass}
                    value={item.nomorSertifikat}
                    onChange={(e) =>
                      updateAgunan(item.id, "nomorSertifikat", e.target.value)
                    }
                    placeholder="Contoh: 534"
                  />
                </Field>

                <Field label="Nama pada sertifikat">
                  <input
                    className={inputClass}
                    value={item.namaPemilik}
                    onChange={(e) =>
                      updateAgunan(
                        item.id,
                        "namaPemilik",
                        titleCase(e.target.value),
                      )
                    }
                    placeholder="Nama pemilik sertifikat"
                  />
                </Field>

                <Field label="Luas tanah">
                  <div className="flex">
                    <input
                      className={`${inputClass} rounded-r-none`}
                      inputMode="numeric"
                      value={item.luas}
                      onChange={(e) =>
                        updateAgunan(
                          item.id,
                          "luas",
                          formatLuas(e.target.value),
                        )
                      }
                      placeholder="Contoh: 20.000"
                    />
                    <div className="flex shrink-0 items-center rounded-r-xl border border-l-0 border-gray-300 bg-gray-100 px-4 text-sm font-semibold text-gray-600">
                      M2
                    </div>
                  </div>
                </Field>

                <Field label="Tanggal terbit sertifikat">
                  <input
                    type="date"
                    className={inputClass}
                    value={item.tanggalTerbit}
                    onChange={(e) =>
                      updateAgunan(item.id, "tanggalTerbit", e.target.value)
                    }
                  />
                </Field>
              </div>

              <div className="my-5 border-t border-gray-100" />

              <h4 className="mb-3 text-sm font-semibold text-gray-800">
                Lokasi Tanah
              </h4>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Desa">
                  <input
                    className={inputClass}
                    value={item.desa}
                    onChange={(e) =>
                      updateAgunan(item.id, "desa", titleCase(e.target.value))
                    }
                    placeholder="Contoh: Batang Hari"
                  />
                </Field>

                <Field label="Kecamatan">
                  <input
                    className={inputClass}
                    value={item.kecamatan}
                    onChange={(e) =>
                      updateAgunan(
                        item.id,
                        "kecamatan",
                        titleCase(e.target.value),
                      )
                    }
                    placeholder="Nama kecamatan"
                  />
                </Field>

                <Field label="Kabupaten sertifikat">
                  <input
                    className={inputClass}
                    value={item.kabupaten}
                    onChange={(e) =>
                      updateAgunan(
                        item.id,
                        "kabupaten",
                        titleCase(e.target.value),
                      )
                    }
                    placeholder="Nama kabupaten"
                  />
                </Field>

                <Field label="Provinsi">
                  <input
                    className={inputClass}
                    value={item.provinsi}
                    onChange={(e) =>
                      updateAgunan(
                        item.id,
                        "provinsi",
                        titleCase(e.target.value),
                      )
                    }
                    placeholder="Nama provinsi"
                  />
                </Field>
              </div>

              <div className="my-5 border-t border-gray-100" />

              <h4 className="mb-3 text-sm font-semibold text-gray-800">
                Data Pengikatan Hak Tanggungan
              </h4>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Jenis pengikatan">
                  <input
                    className={`${inputClass} bg-gray-50`}
                    value="APHT"
                    readOnly
                  />
                </Field>

                <Field label="Peringkat Hak Tanggungan">
                  <select
                    className={inputClass}
                    value={item.peringkat}
                    onChange={(e) =>
                      updateAgunan(item.id, "peringkat", e.target.value)
                    }
                  >
                    {["I", "II", "III", "IV", "V", "VI"].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Nomor Hak Tanggungan">
                  <input
                    className={inputClass}
                    value={item.nomorHakTanggungan}
                    onChange={(e) =>
                      updateAgunan(
                        item.id,
                        "nomorHakTanggungan",
                        e.target.value,
                      )
                    }
                    placeholder="Contoh: 00755/2026"
                  />
                </Field>

                <Field label="Tanggal APHT">
                  <input
                    type="date"
                    className={inputClass}
                    value={item.tanggalApht}
                    onChange={(e) =>
                      updateAgunan(item.id, "tanggalApht", e.target.value)
                    }
                  />
                </Field>
              </div>
            </section>
          ))}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="font-semibold text-gray-900">Penandatangan Surat</h2>
          <p className="mt-1 text-xs text-gray-500">
            Nama Penyelia mengikuti unit yang dipilih.
          </p>

          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Penyelia Unit
            </div>
            <div className="mt-1 text-base font-semibold text-gray-900">
              {penyelia?.nama || "Data Penyelia belum tersedia"}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {penyelia?.jabatan || "Penyelia Unit"}
            </div>
          </div>
        </section>
      </div>

      {/* DOKUMEN ROYA */}
      <div ref={paperRef} className="roya-paper">
        <div className="roya-header">
          <div className="roya-header-left">
            <div>
              Nomor&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {nomorSurat}
            </div>
            <div>
              Tanggal&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {formatTanggal(tanggal)}
            </div>
            <div>Lampiran&nbsp;&nbsp;&nbsp;:-</div>
          </div>

          <div className="roya-header-right">
            <img
              src="/images/mandiri-logo.png"
              alt="Logo Bank Mandiri"
              className="roya-logo"
            />
            <div>PT. Bank Mandiri (Persero) Tbk</div>
            <div>Jl. Batang Hari {namaUnit} SP.A</div>
            <div>Desa Purwosari – Pelepat Ilir</div>
            <div>Telp. (0747) 7326157</div>
            <div>Fax. (0747) 7326156</div>
            <div>Kab Bungo</div>
          </div>
        </div>

        <div className="roya-destination">
          <div>Kepada Yth,</div>
          <div>Kepala Kantor Pertanahan</div>
          <div>Kabupaten {kabupatenTujuan || "................"}</div>
        </div>

        <div className="roya-subject">
          <b>Perihal</b>
          <span>:</span>
          <strong className="roya-subject-text">
            Permohonan Roya Sertifikat atas nama{" "}
            {agunan[0]?.namaPemilik || "................"}
          </strong>
        </div>

        <p className="roya-paragraph roya-opening">
          Dengan ini kami beritahukan bahwa hak atas tanah beserta segala
          sesuatu yang berada di atasnya sebagaimana tersebut pada Tabel di
          bawah ini :
        </p>

        <div className="roya-table-wrap">
          <table className="roya-table">
            <colgroup>
              <col style={{ width: "3%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>

            <thead>
              <tr>
                <th rowSpan="2">No</th>
                <th colSpan="6">Agunan</th>
                <th colSpan="4">Pengikatan</th>
              </tr>
              <tr>
                <th>Jenis</th>
                <th>Luas / Unit</th>
                <th>Lokasi Tanah</th>
                <th>Bukti Kepemilikan Hak Atas Tanah</th>
                <th>Atas Nama</th>
                <th>Terbit</th>
                <th>Jth Tmp</th>
                <th>Jenis</th>
                <th>Dokumen</th>
                <th>Tgl</th>
              </tr>
            </thead>

            <tbody>
              {agunan.map((item, index) => {
                const buktiKepemilikan = `${item.jenisSertifikat} No. ${item.nomorSertifikat || "........"}`;
                const dokumenHT = `- Hak Tanggungan ${item.peringkat} No ${item.nomorHakTanggungan || "........"}`;

                return (
                  <tr key={item.id}>
                    <td className="text-center">{index + 1}</td>
                    <td>{item.jenisSertifikat}</td>
                    <td>{item.luas ? `${item.luas} M2` : ""}</td>
                    <td>{getLokasi(item)}</td>
                    <td>{buktiKepemilikan}</td>
                    <td>{item.namaPemilik}</td>
                    <td>{formatTanggalSingkat(item.tanggalTerbit)}</td>
                    <td className="text-center">-</td>
                    <td>APHT</td>
                    <td>{dokumenHT}</td>
                    <td>{formatTanggalSingkat(item.tanggalApht)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="roya-paragraph roya-closing">
          Kredit telah lunas dan tidak lagi menjadi agunan kredit dari Jaminan
          pada PT Bank Mandiri (Persero) Tbk. Sehubungan dengan hal tersebut,
          kami harapkan bantuan Saudara untuk me-roya (melepas beban) Hak
          Tanggungan yang telah melekat dan membebani bukti-bukti kepemilikan
          hak atas tanah dengan bukti pembebanan Sertifikat Hak Tanggungan
          sebagaimana tersebut dalam tabel di atas. Demikian, permohonan roya
          Hak Tanggungan terhadap hak atas tanah tersebut di atas, kami
          sampaikan.
        </p>

        <p className="roya-thanks">
          Atas perhatian dan kerjasama Saudara diucapkan terima kasih.
        </p>

        <div className="roya-signature">
          <div className="font-bold">PT BANK MANDIRI (PERSERO), Tbk</div>
          <div>{namaUnit}</div>
          <div className="roya-signature-space" />
          <div className="roya-signature-name">{penyelia?.nama || ""}</div>
          <div>{penyelia?.jabatan || "Penyelia Unit"}</div>
        </div>
      </div>

      <style jsx global>{`
        .roya-paper {
          display: block;
          position: fixed;
          left: -20000px;
          top: 0;
          z-index: -1;
          width: 210mm;
          min-height: 297mm;
          padding: 13mm 18mm 15mm;
          box-sizing: border-box;
          font-family: "Times New Roman", serif;
          font-size: 10pt;
          line-height: 1.3;
          background: #fff;
          color: #000;
        }

        .roya-header {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: start;
          min-height: 32mm;
          gap: 4mm;
        }

        .roya-header-left {
          padding-top: 13mm;
          font-size: 9.5pt;
          line-height: 1.5;
          white-space: nowrap;
        }

        .roya-header-right {
          width: 100%;
          text-align: right;
          font-size: 7.5pt;
          font-weight: bold;
          line-height: 1.25;
        }

        .roya-logo {
          display: block;
          width: auto !important;
          height: auto !important;
          max-width: 55mm !important;
          max-height: 17mm !important;
          object-fit: contain !important;
          object-position: right center;
          margin: 0 0 2mm auto;
        }

        .roya-destination {
          margin-top: 1;
          font-weight: bold;
          line-height: 1.35;
        }

        .roya-subject {
          display: grid;
          grid-template-columns: 17mm 4mm 1fr;
          gap: 1mm;
          margin-top: 6mm;
          line-height: 1.4;
        }

        .roya-paragraph {
          text-align: justify;
          line-height: 1.4;
        }

        .roya-opening {
          margin-top: 6mm;
          margin-bottom: 3mm;
        }

        .roya-table-wrap {
          width: 100%;
          margin-top: 2mm;
        }

        .roya-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 7.5pt;
          line-height: 1.3;
        }

        .roya-table th,
        .roya-table td {
          border: 0.5px solid #777;
          padding: 4px 4px;
          vertical-align: middle;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: normal;
        }

        .roya-table th {
          text-align: center;
          font-weight: bold;
          vertical-align: middle;
          padding: 5px 3px;
        }

        .roya-table thead {
          display: table-header-group;
        }

        .roya-table tbody tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .roya-closing {
          margin-top: 6mm;
        }

        .roya-thanks {
          margin-top: 3mm;
        }

        .roya-signature {
          width: 90mm;
          margin-top: 7mm;
          text-align: left;
          line-height: 1.35;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .roya-signature-space {
          height: 20mm;
        }

        .roya-signature-name {
          font-weight: bold;
          text-decoration: underline;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .roya-paper,
          .roya-paper * {
            visibility: visible !important;
          }

          .roya-paper {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 13mm 18mm 15mm !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .roya-logo {
            width: auto !important;
            height: auto !important;
            max-width: 55mm !important;
            max-height: 17mm !important;
            object-fit: contain !important;
          }

          .roya-table {
            width: 100% !important;
            table-layout: fixed !important;
            break-inside: auto;
            page-break-inside: auto;
          }

          .roya-table thead {
            display: table-header-group;
          }

          .roya-table tbody tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .roya-signature {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .roya-subject-text {
            font-weight: bold;
            position: relative;
            top: -3px;
          }
        }
      `}</style>
    </div>
  );
}
