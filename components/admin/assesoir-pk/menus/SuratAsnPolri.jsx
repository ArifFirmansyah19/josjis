"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  FileText,
  FileDown,
  Building2,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import { jsPDF } from "jspdf";

import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";
import { UNIT_UUID } from "@/app/admin/pk/constants/pkConstants";

const todayLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const EMPTY_FORM = {
  nama: "",
  tempatLahir: "",
  tanggalLahir: "",
  nik: "",
  pekerjaan: "",
  hp: "",
  jalan: "",
  rt: "",
  rw: "",
  desa: "",
  kecamatan: "",
  kabupaten: "",
  bidangUsaha: "Perkebunan Kelapa Sawit",
  bidangUsahaLainnya: "",
  sejakTahun: "",
  tempatSurat: "Kuamang Kuning",
  tanggalSurat: todayLocal(),
};

function titleCase(value) {
  return String(value || "")
    .toLocaleLowerCase("id-ID")
    .replace(
      /(^|[\s'-])([a-zà-ÿ])/g,
      (match, prefix, letter) => prefix + letter.toLocaleUpperCase("id-ID"),
    );
}

function formatTanggal(value) {
  if (!value) return "";

  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getAddress(form) {
  const parts = [];

  if (form.jalan.trim()) {
    const jalan = titleCase(form.jalan)
      .replace(/^(jalan|jl\.?)[\s.]*/i, "")
      .trim();

    if (jalan) parts.push(`Jalan ${jalan}`);
  }

  if (form.rt || form.rw) {
    parts.push(`RT ${form.rt || "-"}/RW ${form.rw || "-"}`);
  }

  if (form.desa) parts.push(`Desa ${titleCase(form.desa)}`);
  if (form.kecamatan) parts.push(`Kecamatan ${titleCase(form.kecamatan)}`);
  if (form.kabupaten) parts.push(`Kabupaten ${titleCase(form.kabupaten)}`);

  return parts.join(", ");
}

function getBusiness(form) {
  return form.bidangUsaha === "Lainnya"
    ? titleCase(form.bidangUsahaLainnya)
    : form.bidangUsaha;
}

function getLetterData(form) {
  return {
    nama: titleCase(form.nama),
    tempatLahir: titleCase(form.tempatLahir),
    tanggalLahir: formatTanggal(form.tanggalLahir),
    nik: form.nik,
    pekerjaan: titleCase(form.pekerjaan),
    hp: form.hp,
    alamat: getAddress(form),
    usaha: getBusiness(form),
    tahun: form.sejakTahun,
    tempatSurat: titleCase(form.tempatSurat),
    tanggalSurat: formatTanggal(form.tanggalSurat),
  };
}

function createPdf(form) {
  const data = getLetterData(form);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const left = 25;
  const right = 25;
  const width = pageWidth - left - right;
  let y = 28;

  const addPageIfNeeded = (height = 8) => {
    if (y + height > 270) {
      doc.addPage();
      y = 25;
    }
  };

  const paragraph = (
    text,
    {
      bold = false,
      size = 11,
      align = "justify",
      indent = 0,
      gap = 3,
      lineHeight = 1.35,
    } = {},
  ) => {
    doc.setFont("times", bold ? "bold" : "normal");
    doc.setFontSize(size);

    const lines = doc.splitTextToSize(String(text || ""), width - indent);
    const lineStep = size * 0.3528 * lineHeight;

    addPageIfNeeded(lines.length * lineStep + gap);

    doc.text(lines, left + indent, y, {
      align,
      maxWidth: width - indent,
      lineHeightFactor: lineHeight,
    });

    y += lines.length * lineStep + gap;
  };

  // JUDUL SURAT
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text("SURAT PERNYATAAN", pageWidth / 2, y, {
    align: "center",
  });

  y += 5;
  doc.setLineWidth(0.9);
  doc.line(left, y, pageWidth - right, y);
  y += 13;

  paragraph("Saya yang bertanda tangan di bawah ini:", {
    size: 11,
    gap: 5,
  });

  // IDENTITAS DEBITUR
  const identity = [
    ["Nama", data.nama],
    ["Tempat/Tanggal Lahir", `${data.tempatLahir}, ${data.tanggalLahir}`],
    ["Alamat", data.alamat],
    ["NIK", data.nik],
    ["Pekerjaan", data.pekerjaan],
    ["Nomor Handphone", data.hp],
  ];

  identity.forEach(([label, value]) => {
    doc.setFont("times", "normal");
    doc.setFontSize(11);

    const labelX = left + 3;
    const colonX = left + 43;
    const valueX = left + 48;

    const lines = doc.splitTextToSize(value || "-", width - 51);
    const lineHeight = 5.2;

    addPageIfNeeded(lines.length * lineHeight + 1);

    doc.text(label, labelX, y);
    doc.text(":", colonX, y);
    doc.text(lines, valueX, y, {
      lineHeightFactor: 1.2,
    });

    y += Math.max(6, lines.length * lineHeight);
  });

  y += 5;

  // ISI PERNYATAAN
  paragraph("Dengan ini menyatakan bahwa saya :", {
    gap: 4,
  });

  paragraph(
    `1. Saat ini memiliki usaha di bidang ${data.usaha || "........................"} sejak tahun ${data.tahun || "........"}.`,
    {
      indent: 4,
      gap: 4,
    },
  );

  // Pernyataan ASN/TNI/POLRI
  // Menggunakan Times agar font konsisten dengan bagian surat lainnya.
  doc.setFont("times", "normal");
  doc.setFontSize(11);

  const statementPrefix = "2. Tidak berstatus sebagai ";
  doc.text(statementPrefix, left + 4, y);

  const prefixWidth = doc.getTextWidth(statementPrefix);

  doc.setFont("times", "bold");
  doc.text("ASN/TNI/POLRI.", left + 4 + prefixWidth, y);

  y += 8;

  paragraph(
    "3. Apabila dikemudian hari terbukti sebaliknya, saya bersedia menerima konsekuensi sesuai dengan ketentuan PT. Bank Mandiri (Persero) terhadap fasilitas kredit yang telah saya dapatkan.",
    {
      indent: 4,
      gap: 5,
    },
  );

  paragraph(
    "Demikian surat pernyataan ini dibuat dengan sebenarnya dan tanpa ada paksaan dari pihak manapun untuk dapat digunakan sebagai bukti pemenuhan syarat pemberian fasilitas kredit.",
    {
      gap: 8,
    },
  );

  // TANDA TANGAN
  addPageIfNeeded(75);

  const signatureX = 125;

  doc.setFont("times", "normal");
  doc.setFontSize(11);

  doc.text(`${data.tempatSurat}, ${data.tanggalSurat}`, signatureX, y, {
    align: "left",
  });

  y += 7;

  doc.text("Yang membuat pernyataan,", signatureX, y);

  y += 7;

  // AREA MATERAI
  const stampX = signatureX + 13;
  const stampY = y;

  doc.setLineWidth(0.35);
  doc.rect(stampX, stampY, 24, 17);

  doc.setFont("times", "normal");
  doc.setFontSize(8);

  doc.text("MATERAI", stampX + 12, stampY + 7, {
    align: "center",
  });

  doc.text("Rp10.000", stampX + 12, stampY + 12, {
    align: "center",
  });

  // NAMA DEBITUR
  y = stampY + 31;

  doc.setFont("times", "bold");
  doc.setFontSize(11);

  doc.text(data.nama || "Nama Debitur", signatureX + 24, y, {
    align: "center",
  });

  const filename = (data.nama || "Debitur")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");

  return {
    doc,
    filename: `Surat-Pernyataan-${filename || "Debitur"}.pdf`,
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  numeric = false,
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>

      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => {
          const next = e.target.value;
          onChange(numeric ? next.replace(/[^0-9]/g, "") : next);
        }}
        placeholder={placeholder}
        required={required}
        className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </label>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 border-b border-zinc-100 pb-3">
        <h3 className="font-semibold text-zinc-900">{title}</h3>
        {note && <p className="mt-1 text-sm text-zinc-500">{note}</p>}
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export default function SuratAsnPolri({ onBack }) {
  const { activeUnit } = useUnit();

  const [entryMode, setEntryMode] = useState("choose");
  const [form, setForm] = useState(EMPTY_FORM);
  const [pkRows, setPkRows] = useState([]);
  const [selectedPk, setSelectedPk] = useState(null);
  const [pkSearch, setPkSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeUnitUuid = UNIT_UUID[activeUnit?.value];

  const setValue = (key, value) => {
    setForm((old) => ({
      ...old,
      [key]: value,
    }));
  };

  // MEMUAT DATA PK KUR
  const loadPk = useCallback(async () => {
    if (!activeUnitUuid) {
      setError("UUID unit aktif tidak ditemukan. Periksa UNIT_UUID.");
      setPkRows([]);
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
          tempat_lahir,
          tanggal_lahir,
          profesi,
          alamat_jalan,
          rt,
          rw,
          alamat_desa_kelurahan,
          alamat_kecamatan,
          alamat_kabupaten,
          nomor_handphone,
          nomor_pk,
          tanggal_pk,
          jenis_pengajuan_kredit,
          rekening_kredit
        `,
        )
        .eq("unit_id", activeUnitUuid)
        .eq("jenis_pengajuan_kredit", "KUR")
        .order("tanggal_pk", {
          ascending: false,
        })
        .limit(200);

      if (queryError) throw queryError;

      setPkRows(data || []);
    } catch (err) {
      console.error("Gagal memuat PK KUR:", err);
      setError(err.message || "Data PK gagal dimuat.");
      setPkRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeUnitUuid]);

  useEffect(() => {
    if (entryMode === "database") {
      setSelectedPk(null);
      setPkRows([]);
      loadPk();
    }
  }, [activeUnitUuid, entryMode, loadPk]);

  // PENCARIAN DATA PK
  const visiblePk = useMemo(() => {
    const keyword = pkSearch.trim().toLowerCase();

    return pkRows.filter((pk) => {
      if (!keyword) return true;

      return [
        pk.nama_debitur,
        pk.cif,
        pk.nomor_ktp,
        pk.nomor_pk,
        pk.rekening_kredit,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      );
    });
  }, [pkRows, pkSearch]);

  // MEMILIH DEBITUR DARI DATABASE
  function choosePk(pk) {
    setSelectedPk(pk);

    setForm((old) => ({
      ...old,
      ...EMPTY_FORM,
      tanggalSurat: todayLocal(),
      nama: titleCase(pk.nama_debitur || ""),
      tempatLahir: titleCase(pk.tempat_lahir || ""),
      tanggalLahir: pk.tanggal_lahir || "",
      nik: pk.nomor_ktp || "",
      pekerjaan: titleCase(pk.profesi || ""),
      hp: pk.nomor_handphone || "",
      jalan: titleCase(pk.alamat_jalan || ""),
      rt: pk.rt || "",
      rw: pk.rw || "",
      desa: titleCase(pk.alamat_desa_kelurahan || ""),
      kecamatan: titleCase(pk.alamat_kecamatan || ""),
      kabupaten: titleCase(pk.alamat_kabupaten || ""),
    }));

    setEntryMode("form");
  }

  // VALIDASI FORM
  function validateForm() {
    const required = [
      ["nama", "Nama debitur"],
      ["tempatLahir", "Tempat lahir"],
      ["tanggalLahir", "Tanggal lahir"],
      ["nik", "NIK"],
      ["pekerjaan", "Pekerjaan"],
      ["hp", "Nomor handphone"],
      ["rt", "RT"],
      ["rw", "RW"],
      ["desa", "Desa"],
      ["kecamatan", "Kecamatan"],
      ["kabupaten", "Kabupaten"],
      ["sejakTahun", "Tahun mulai usaha"],
      ["tempatSurat", "Tempat surat"],
      ["tanggalSurat", "Tanggal surat"],
    ];

    const missing = required
      .filter(([key]) => !String(form[key] || "").trim())
      .map(([, label]) => label);

    if (form.bidangUsaha === "Lainnya" && !form.bidangUsahaLainnya.trim()) {
      missing.push("Bidang usaha lainnya");
    }

    if (!/^\d{16}$/.test(form.nik)) {
      missing.push("NIK harus terdiri dari 16 digit");
    }

    if (!/^\d{4}$/.test(form.sejakTahun)) {
      missing.push("Tahun mulai usaha harus 4 digit");
    }

    return missing;
  }

  // UNDUH PDF LANGSUNG
  function downloadPdf() {
    try {
      const { doc, filename } = createPdf(form);
      doc.save(filename);
    } catch (err) {
      console.error("Gagal membuat PDF:", err);
      alert("PDF gagal dibuat. Silakan periksa data kembali.");
    }
  }

  function handleDownload(event) {
    event.preventDefault();

    const missing = validateForm();

    if (missing.length) {
      alert(`Periksa kembali data berikut:\n- ${missing.join("\n- ")}`);
      return;
    }

    downloadPdf();
  }

  function backToCatalog() {
    onBack?.();
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-24">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <FolderOpen size={16} />
            <span>Administrasi</span>
            <ChevronRight size={14} />

            <button type="button" onClick={backToCatalog}>
              Assesoir PK
            </button>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
            Surat Pernyataan ASN/POLRI
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Surat pernyataan bahwa debitur bukan anggota ASN, TNI, maupun POLRI.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
          <Building2 size={16} className="text-zinc-500" />
          <span className="font-medium">{activeUnit?.name || "-"}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={backToCatalog}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft size={17} />
        Kembali ke menu
      </button>

      {/* PILIH METODE INPUT */}
      {entryMode === "choose" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setSelectedPk(null);
              setForm({
                ...EMPTY_FORM,
                tanggalSurat: todayLocal(),
              });
              setEntryMode("form");
            }}
            className="min-h-36 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-zinc-100">
              <FileText size={21} />
            </div>

            <div className="font-semibold text-zinc-900">Input Manual</div>

            <p className="mt-1 text-sm text-zinc-500">
              Isi sendiri seluruh informasi debitur dan usaha.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setEntryMode("database")}
            className="min-h-36 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-zinc-100">
              <Building2 size={21} />
            </div>

            <div className="font-semibold text-zinc-900">
              Pilih dari Database PK
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              Ambil data debitur KUR dari unit aktif.
            </p>
          </button>
        </div>
      )}

      {/* DAFTAR DATABASE PK */}
      {entryMode === "database" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  value={pkSearch}
                  onChange={(e) => setPkSearch(e.target.value)}
                  placeholder="Cari nama, CIF, NIK, nomor PK, rekening..."
                  className="min-h-12 w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <button
                type="button"
                onClick={loadPk}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Perbarui
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900">Daftar PK KUR</h3>

            <span className="text-sm text-zinc-500">
              {loading ? "Memuat..." : `${visiblePk.length} data`}
            </span>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-white p-10 text-center text-sm text-zinc-500">
              Memuat data PK...
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {visiblePk.map((pk) => (
                <div
                  key={pk.id}
                  className="flex flex-col gap-3 border-b border-zinc-100 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900">
                      {titleCase(pk.nama_debitur)}
                    </div>

                    <div className="mt-1 text-xs text-zinc-500">
                      CIF: {pk.cif || "-"} · NIK: {pk.nomor_ktp || "-"}
                    </div>

                    <div className="mt-1 text-xs text-zinc-500">
                      PK: {pk.nomor_pk || "-"} · Rekening:{" "}
                      {pk.rekening_kredit || "-"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => choosePk(pk)}
                    className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    Pilih Debitur
                  </button>
                </div>
              ))}

              {!visiblePk.length && (
                <div className="p-8 text-center text-sm text-zinc-500">
                  Tidak ada data PK KUR yang sesuai pada unit ini.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FORM INPUT */}
      {entryMode === "form" && (
        <form onSubmit={handleDownload} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4">
            <div>
              <div className="text-xs text-zinc-500">Metode pengisian</div>

              <div className="font-semibold text-zinc-900">
                {selectedPk ? "Database PK KUR" : "Input Manual"}
              </div>

              {selectedPk && (
                <div className="mt-1 text-xs text-zinc-500">
                  {selectedPk.nomor_pk || "Nomor PK tidak tersedia"}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setEntryMode("choose");
                setSelectedPk(null);
              }}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Ganti metode input
            </button>
          </div>

          <Section
            title="Informasi Debitur"
            note="Data dapat diambil dari Database PK atau diisi secara manual."
          >
            <Field
              label="Nama lengkap"
              value={form.nama}
              onChange={(v) => setValue("nama", titleCase(v))}
              required
            />

            <Field
              label="Tempat lahir"
              value={form.tempatLahir}
              onChange={(v) => setValue("tempatLahir", titleCase(v))}
              required
            />

            <Field
              label="Tanggal lahir"
              type="date"
              value={form.tanggalLahir}
              onChange={(v) => setValue("tanggalLahir", v)}
              required
            />

            <Field
              label="NIK"
              value={form.nik}
              onChange={(v) => setValue("nik", v)}
              numeric
              required
            />

            <Field
              label="Pekerjaan"
              value={form.pekerjaan}
              onChange={(v) => setValue("pekerjaan", titleCase(v))}
              required
            />

            <Field
              label="Nomor handphone"
              value={form.hp}
              onChange={(v) => setValue("hp", v)}
              numeric
              required
            />
          </Section>

          <Section
            title="Informasi Alamat"
            note="Alamat jalan boleh dikosongkan. Bagian alamat lainnya wajib dilengkapi."
          >
            <Field
              label="Jalan"
              value={form.jalan}
              onChange={(v) => setValue("jalan", titleCase(v))}
              placeholder="Opsional"
            />

            <Field
              label="RT"
              value={form.rt}
              onChange={(v) => setValue("rt", v)}
              numeric
              required
            />

            <Field
              label="RW"
              value={form.rw}
              onChange={(v) => setValue("rw", v)}
              numeric
              required
            />

            <Field
              label="Desa/Kelurahan"
              value={form.desa}
              onChange={(v) => setValue("desa", titleCase(v))}
              required
            />

            <Field
              label="Kecamatan"
              value={form.kecamatan}
              onChange={(v) => setValue("kecamatan", titleCase(v))}
              required
            />

            <Field
              label="Kabupaten"
              value={form.kabupaten}
              onChange={(v) => setValue("kabupaten", titleCase(v))}
              required
            />
          </Section>

          <Section
            title="Informasi Usaha"
            note="Bidang usaha dan tahun mulai usaha diisi sesuai keterangan debitur."
          >
            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-medium text-zinc-700">
                Bidang usaha <span className="text-rose-500">*</span>
              </span>

              <select
                value={form.bidangUsaha}
                onChange={(e) => setValue("bidangUsaha", e.target.value)}
                required
                className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="Perkebunan Kelapa Sawit">
                  Perkebunan Kelapa Sawit
                </option>

                <option value="Perdagangan dan Toko">
                  Perdagangan dan Toko
                </option>

                <option value="Lainnya">Lainnya</option>
              </select>
            </label>

            {form.bidangUsaha === "Lainnya" && (
              <Field
                label="Bidang usaha lainnya"
                value={form.bidangUsahaLainnya}
                onChange={(v) => setValue("bidangUsahaLainnya", titleCase(v))}
                placeholder="Contoh: Peternakan Ayam"
                required
              />
            )}

            <Field
              label="Sejak tahun"
              value={form.sejakTahun}
              onChange={(v) =>
                setValue("sejakTahun", v.replace(/[^0-9]/g, "").slice(0, 4))
              }
              placeholder="Contoh: 2018"
              numeric
              required
            />
          </Section>

          <Section title="Tempat dan Tanggal Surat">
            <Field
              label="Tempat surat"
              value={form.tempatSurat}
              onChange={(v) => setValue("tempatSurat", titleCase(v))}
              required
            />

            <Field
              label="Tanggal surat"
              type="date"
              value={form.tanggalSurat}
              onChange={(v) => setValue("tanggalSurat", v)}
              required
            />
          </Section>

          {/* TOMBOL UNDUH LANGSUNG */}
          <div className="sticky bottom-2 z-10 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-zinc-900">
                Surat Pernyataan ASN/POLRI
              </div>

              <p className="mt-1 text-xs text-zinc-500">
                Pastikan seluruh data sudah benar sebelum mengunduh PDF.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              <FileDown size={17} />
              Unduh PDF
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
