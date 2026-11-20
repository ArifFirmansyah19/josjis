"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Plus,
  Trash2,
  FileText,
  UserRound,
  Users,
  Building2,
  CalendarDays,
  ClipboardList,
  Printer,
  CheckCircle2,
} from "lucide-react";
import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";

const HARI_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const tanggalHariIni = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const formatTanggalSurat = (value) => {
  if (!value) return "........, tanggal .... ........ ......";
  const date = new Date(`${value}T00:00:00`);
  return `${HARI_ID[date.getDay()]}, tanggal ${date.getDate()} ${
    BULAN_ID[date.getMonth()]
  } ${date.getFullYear()}`;
};

const formatTanggalBiasa = (value) => {
  if (!value) return ".... ........ ......";
  const date = new Date(`${value}T00:00:00`);
  return `${date.getDate()} ${BULAN_ID[date.getMonth()]} ${date.getFullYear()}`;
};

const formatDDMMYYYY = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatAlamatLengkap = (data = {}) => {
  const parts = [];

  if (data.jalan?.trim()) parts.push(data.jalan.trim());

  const rtRw = [
    data.rt?.trim() ? `RT ${data.rt.trim()}` : "",
    data.rw?.trim() ? `RW ${data.rw.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" / ");

  if (rtRw) parts.push(rtRw);
  if (data.desa?.trim()) parts.push(`Desa ${data.desa.trim()}`);
  if (data.kecamatan?.trim()) parts.push(`Kec. ${data.kecamatan.trim()}`);
  if (data.kabupaten?.trim()) parts.push(`Kab. ${data.kabupaten.trim()}`);
  if (data.provinsi?.trim()) parts.push(`Prov. ${data.provinsi.trim()}`);

  return parts.join(", ") || "-";
};

const toTitleCase = (value = "") =>
  value
    .toLocaleLowerCase("id-ID")
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_, separator, letter) =>
        `${separator}${letter.toLocaleUpperCase("id-ID")}`,
    );

const UNIT_OPTIONS = [
  { value: "JKK1", name: "Jambi Kuamang Kuning 1", code: "11081A" },
  { value: "JKK2", name: "Jambi Kuamang Kuning 2", code: "11081B" },
];

const inputClass =
  "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

const sectionClass =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";

const sectionHeadClass =
  "flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5";

const sectionBodyClass = "space-y-4 p-4 sm:p-5";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Section({ icon: Icon, title, description, children, number }) {
  return (
    <section className={sectionClass}>
      <div className={sectionHeadClass}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">
            {number ? `${number}. ` : ""}
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      <div className={sectionBodyClass}>{children}</div>
    </section>
  );
}

const alamatKosong = {
  jalan: "",
  rt: "",
  rw: "",
  desa: "",
  kecamatan: "",
  kabupaten: "",
  provinsi: "",
};

const pihakKosong = {
  nama: "",
  nik: "",
  ...alamatKosong,
};

const dokumenKosong = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  jenis: "SHM",
  jenisCustom: "",
  noDokumen: "",
  tanggalTerbit: "",
  namaKepemilikan: "",
  objek: "Tanah Kebun",
  objekCustom: "",
  hubungan: "Debitur",
  hubunganCustom: "",
});

export default function BastMoral({ onBack }) {
  const { activeUnit } = useUnit();

  const [selectedUnitCode, setSelectedUnitCode] = useState(
    activeUnit?.value || "JKK1",
  );

  const [pengawasList, setPengawasList] = useState([]);
  const [loadingPengawas, setLoadingPengawas] = useState(false);
  const [pengawasError, setPengawasError] = useState("");

  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [nomorUrut, setNomorUrut] = useState("");
  const [tahunSurat, setTahunSurat] = useState(
    String(new Date().getFullYear()),
  );
  const [customNomorSurat, setCustomNomorSurat] = useState("");
  const [tanggalSurat, setTanggalSurat] = useState(tanggalHariIni);

  const [pihak1, setPihak1] = useState({ ...pihakKosong });
  const [pihakLainnya, setPihakLainnya] = useState([]);

  const [pihak2, setPihak2] = useState({
    id: "",
    nama: "",
    nip: "",
    jabatan: "",
  });

  const [dokumenList, setDokumenList] = useState([dokumenKosong()]);

  const [kreditInfo, setKreditInfo] = useState({
    namaDebitur: "",
    nomorPK: "",
    tanggalPK: "",
  });

  const selectedUnit =
    UNIT_OPTIONS.find((unit) => unit.value === selectedUnitCode) ||
    UNIT_OPTIONS[0];

  const unitKerja = selectedUnit.name;
  const kodeUnit = selectedUnit.code;

  useEffect(() => {
    const code = activeUnit?.value;

    if (code && UNIT_OPTIONS.some((unit) => unit.value === code)) {
      setSelectedUnitCode(code);
    }
  }, [activeUnit?.value]);

  useEffect(() => {
    let cancelled = false;

    const loadPengawas = async () => {
      setLoadingPengawas(true);
      setPengawasError("");
      setPengawasList([]);
      setPihak2({ id: "", nama: "", nip: "", jabatan: "" });

      try {
        const { data: unit, error: unitError } = await supabase
          .from("unit")
          .select("id,nama_unit,kode_unit")
          .eq("kode_unit", selectedUnitCode)
          .maybeSingle();

        if (unitError) throw unitError;

        if (!unit?.id) {
          throw new Error(`Data unit ${selectedUnitCode} tidak ditemukan.`);
        }

        const { data: pegawai, error: pegawaiError } = await supabase
          .from("pegawai")
          .select("id,nama,nip,jabatan")
          .eq("unit_id", unit.id)
          .eq("jenis_pegawai", "PENGAWAS")
          .eq("aktif", true)
          .order("nama", { ascending: true });

        if (pegawaiError) throw pegawaiError;
        if (cancelled) return;

        const rows = pegawai || [];
        setPengawasList(rows);

        if (rows.length > 0) {
          const first = rows[0];

          setPihak2({
            id: first.id,
            nama: first.nama || "",
            nip: first.nip || "",
            jabatan: first.jabatan || "",
          });
        } else {
          setPengawasError(
            `Belum ada pegawai aktif berjenis PENGAWAS pada ${unit.nama_unit}.`,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPengawasError(
            error?.message || "Gagal mengambil data Pengawas dari database.",
          );
        }
      } finally {
        if (!cancelled) setLoadingPengawas(false);
      }
    };

    loadPengawas();

    return () => {
      cancelled = true;
    };
  }, [selectedUnitCode]);

  const nomorSuratFinal = useMemo(() => {
    if (useCustomTemplate) {
      return customNomorSurat.trim() || "........................";
    }

    return `NRF.R02.JBI.UM.JKK/${
      nomorUrut.trim() || "........"
    }/${tahunSurat || "........"}`;
  }, [useCustomTemplate, customNomorSurat, kodeUnit, nomorUrut, tahunSurat]);

  const updatePihak1 = (field, value) => {
    setPihak1((current) => ({ ...current, [field]: value }));

    const fieldAlamat = [
      "jalan",
      "rt",
      "rw",
      "desa",
      "kecamatan",
      "kabupaten",
      "provinsi",
    ].includes(field);

    if (fieldAlamat) {
      setPihakLainnya((current) =>
        current.map((item) =>
          item.samakanAlamat ? { ...item, [field]: value } : item,
        ),
      );
    }
  };

  const tambahPihakLainnya = () => {
    setPihakLainnya((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        status: "istri/suami",
        statusCustom: "",
        samakanAlamat: false,
        ...pihakKosong,
      },
    ]);
  };

  const updatePihakLainnya = (id, field, value) => {
    setPihakLainnya((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const hapusPihakLainnya = (id) => {
    setPihakLainnya((current) => current.filter((item) => item.id !== id));
  };

  const samakanAlamatDenganPihak1 = (id) => {
    setPihakLainnya((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              jalan: pihak1.jalan,
              rt: pihak1.rt,
              rw: pihak1.rw,
              desa: pihak1.desa,
              kecamatan: pihak1.kecamatan,
              kabupaten: pihak1.kabupaten,
              provinsi: pihak1.provinsi,
              samakanAlamat: true,
            }
          : item,
      ),
    );
  };

  const tambahDokumen = () => {
    setDokumenList((current) => [...current, dokumenKosong()]);
  };

  const hapusDokumen = (id) => {
    setDokumenList((current) =>
      current.length > 1 ? current.filter((item) => item.id !== id) : current,
    );
  };

  const updateDokumen = (id, field, value) => {
    setDokumenList((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const cetakPDF = () => {
    const judulSebelumnya = document.title;
    const namaDebitur = kreditInfo.namaDebitur.trim() || "Dokumen";

    document.title = `BAST MORAL - ${namaDebitur}`;

    const pulihkanJudul = () => {
      document.title = judulSebelumnya;
      window.removeEventListener("afterprint", pulihkanJudul);
    };

    window.addEventListener("afterprint", pulihkanJudul);
    window.print();
    window.setTimeout(pulihkanJudul, 1500);
  };

  const validasiSederhana = () => {
    if (!pihak1.nama.trim()) {
      alert("Nama Pihak Pertama harus diisi.");
      return false;
    }

    if (!pihak2.nama.trim() || !pihak2.nip.trim() || !pihak2.jabatan.trim()) {
      alert(
        "Data Pengawas Pihak Kedua belum tersedia. Periksa unit dan master pegawai.",
      );
      return false;
    }

    if (!kreditInfo.namaDebitur.trim()) {
      alert("Nama debitur harus diisi.");
      return false;
    }

    return true;
  };

  const handleDownload = async () => {
    if (!validasiSederhana()) return;

    const area = document.getElementById("bast-print-area");

    if (!area) {
      alert("Area dokumen BAST MORAL tidak ditemukan.");
      return;
    }

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const namaDebitur = kreditInfo.namaDebitur.trim() || "Dokumen";

      const namaFile = `BAST MORAL - ${namaDebitur}`
        .replace(/[<>:"/\\|?*]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(area, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: area.scrollWidth,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 5;
      const marginY = 5;

      const contentWidth = pageWidth - marginX * 2;
      const contentHeight = pageHeight - marginY * 2;

      // Skala mengikuti lebar area PDF yang digunakan.
      const pixelsPerMm = canvas.width / contentWidth;
      const maxPageHeight = Math.floor(contentHeight * pixelsPerMm);

      const areaRect = area.getBoundingClientRect();
      const scaleY = canvas.height / areaRect.height;

      const getElementBounds = (element) => {
        const rect = element.getBoundingClientRect();

        return {
          top: (rect.top - areaRect.top) * scaleY,
          bottom: (rect.bottom - areaRect.top) * scaleY,
        };
      };

      const protectedElements = Array.from(
        area.querySelectorAll(
          "p, li, tr, .signature-section, .signature-block",
        ),
      ).map((element) => ({
        element,
        ...getElementBounds(element),
      }));

      const closingParagraph = area.querySelector(".closing-paragraph");

      const closingBounds = closingParagraph
        ? getElementBounds(closingParagraph)
        : null;

      const signatureSection = area.querySelector(".signature-section");

      const signatureBounds = signatureSection
        ? getElementBounds(signatureSection)
        : null;

      const getSafePageEnd = (sourceY, targetY, pageNumber) => {
        // Halaman pertama wajib berhenti sebelum paragraf penutup.
        if (
          pageNumber === 0 &&
          closingBounds &&
          closingBounds.top > sourceY &&
          closingBounds.top < targetY
        ) {
          return Math.floor(closingBounds.top - 2);
        }

        let safeEnd = targetY;

        // Jika batas halaman mengenai bagian tanda tangan,
        // pindahkan seluruh bagian tanda tangan ke halaman berikutnya.
        if (
          signatureBounds &&
          signatureBounds.top < targetY &&
          signatureBounds.bottom > targetY &&
          signatureBounds.top > sourceY
        ) {
          safeEnd = Math.min(safeEnd, signatureBounds.top - 2);
        }

        // Hindari memotong paragraf, baris tabel, dan daftar.
        for (const item of protectedElements) {
          if (
            item.top < targetY &&
            item.bottom > targetY &&
            item.top > sourceY
          ) {
            safeEnd = Math.min(safeEnd, item.top - 2);
          }
        }

        // Cari batas akhir elemen terdekat sebelum batas halaman.
        let bestEnd = sourceY;

        for (const item of protectedElements) {
          if (
            item.bottom > sourceY + 10 &&
            item.bottom <= safeEnd &&
            item.bottom > bestEnd
          ) {
            bestEnd = item.bottom;
          }
        }

        // Jika tidak ditemukan batas aman, gunakan batas halaman.
        return bestEnd > sourceY ? Math.floor(bestEnd) : Math.floor(targetY);
      };

      let sourceY = 0;
      let pageNumber = 0;

      while (sourceY < canvas.height) {
        const targetY = Math.min(sourceY + maxPageHeight, canvas.height);

        let endY = getSafePageEnd(sourceY, targetY, pageNumber);

        if (endY <= sourceY) {
          endY = targetY;
        }

        const sliceHeight = Math.min(endY - sourceY, canvas.height - sourceY);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const context = pageCanvas.getContext("2d");

        if (!context) {
          throw new Error("Gagal membuat halaman PDF.");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        context.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight,
        );

        if (pageNumber > 0) {
          pdf.addPage();
        }

        const imageData = pageCanvas.toDataURL("image/jpeg", 0.95);
        const imageHeight = sliceHeight / pixelsPerMm;

        pdf.addImage(
          imageData,
          "JPEG",
          marginX,
          marginY,
          contentWidth,
          imageHeight,
          undefined,
          "FAST",
        );

        sourceY += sliceHeight;
        pageNumber += 1;
      }

      pdf.save(`${namaFile}.pdf`);
    } catch (error) {
      console.error("Gagal mengunduh BAST MORAL:", error);
      alert("PDF gagal dibuat. Silakan coba kembali.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 5mm;
        }

        @media print {
          html,
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

          #bast-print-area,
          #bast-print-area * {
            visibility: visible !important;
          }

          #bast-print-area {
            position: static !important;
            inset: auto !important;
            width: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 15mm 17mm !important;
            box-shadow: none !important;
            border: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 10.5pt !important;
            line-height: 1.35 !important;
          }

          #bast-print-area table {
            page-break-inside: auto;
          }

          #bast-print-area tr,
          #bast-print-area .signature-block,
          #bast-print-area .signature-section,
          #bast-print-area li {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Kembali"
              >
                <ArrowLeft size={18} />
              </button>
            ) : null}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <FileText size={17} />
                </span>
                <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                  BAST MORAL
                </h1>
              </div>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {unitKerja || "Unit aktif belum terdeteksi"} · Formulir dan
                pratinjau dokumen
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.98] sm:px-4"
          >
            <Download size={17} />
            <span className="hidden sm:inline">Unduh PDF</span>
            <span className="sm:hidden">Unduh</span>
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 items-start gap-5 px-3 py-5 sm:px-6 lg:grid-cols-[minmax(420px,0.9fr)_minmax(560px,1.1fr)] lg:gap-6">
        <div className="no-print min-w-0 space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                className="mt-0.5 shrink-0 text-blue-700"
                size={18}
              />
              <div>
                <p className="text-sm font-semibold text-blue-950">
                  Data hanya digunakan untuk dokumen ini
                </p>
                <p className="mt-1 text-xs leading-relaxed text-blue-800">
                  Isian tidak dikirim atau disimpan ke Supabase. Unduh PDF
                  sebelum meninggalkan halaman agar data formulir tidak hilang.
                </p>
              </div>
            </div>
          </div>

          <Section
            icon={CalendarDays}
            number="1"
            title="Nomor dan tanggal surat"
            description="Tentukan nomor surat dan tanggal berita acara."
          >
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={useCustomTemplate}
                onChange={(event) => setUseCustomTemplate(event.target.checked)}
                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Gunakan format nomor surat lain
            </label>

            {useCustomTemplate ? (
              <Field label="Nomor surat">
                <input
                  className={inputClass}
                  value={customNomorSurat}
                  onChange={(event) => setCustomNomorSurat(event.target.value)}
                  placeholder="Masukkan nomor surat lengkap"
                />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nomor urut keluar">
                  <input
                    className={inputClass}
                    value={nomorUrut}
                    onChange={(event) => setNomorUrut(event.target.value)}
                    placeholder="Contoh: 0463"
                  />
                </Field>

                <Field label="Tahun surat">
                  <input
                    className={inputClass}
                    value={tahunSurat}
                    onChange={(event) => setTahunSurat(event.target.value)}
                    placeholder="2026"
                  />
                </Field>

                <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Preview nomor surat
                  </p>
                  <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-800">
                    {nomorSuratFinal}
                  </p>
                </div>
              </div>
            )}

            <Field label="Tanggal surat">
              <input
                type="date"
                className={inputClass}
                value={tanggalSurat}
                onChange={(event) => setTanggalSurat(event.target.value)}
              />
            </Field>
          </Section>

          <Section
            icon={UserRound}
            number="2"
            title="Pihak Pertama"
            description="Pemilik agunan atau pihak yang menyerahkan dokumen."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nama lengkap" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={pihak1.nama}
                  onChange={(event) =>
                    updatePihak1("nama", event.target.value.toUpperCase())
                  }
                  placeholder="Nama sesuai KTP"
                />
              </Field>

              <Field label="NIK" className="sm:col-span-2">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={pihak1.nik}
                  onChange={(event) => updatePihak1("nik", event.target.value)}
                  placeholder="Masukkan NIK"
                />
              </Field>

              <Field label="Jalan / dusun" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={pihak1.jalan}
                  onChange={(event) =>
                    updatePihak1("jalan", toTitleCase(event.target.value))
                  }
                  placeholder="Jalan atau dusun"
                />
              </Field>

              <Field label="RT">
                <input
                  className={inputClass}
                  value={pihak1.rt}
                  onChange={(event) => updatePihak1("rt", event.target.value)}
                  placeholder="001"
                />
              </Field>

              <Field label="RW">
                <input
                  className={inputClass}
                  value={pihak1.rw}
                  onChange={(event) => updatePihak1("rw", event.target.value)}
                  placeholder="002"
                />
              </Field>

              <Field label="Desa / kelurahan">
                <input
                  className={inputClass}
                  value={pihak1.desa}
                  onChange={(event) =>
                    updatePihak1("desa", toTitleCase(event.target.value))
                  }
                  placeholder="Nama desa"
                />
              </Field>

              <Field label="Kecamatan">
                <input
                  className={inputClass}
                  value={pihak1.kecamatan}
                  onChange={(event) =>
                    updatePihak1("kecamatan", toTitleCase(event.target.value))
                  }
                  placeholder="Nama kecamatan"
                />
              </Field>

              <Field label="Kabupaten / kota">
                <input
                  className={inputClass}
                  value={pihak1.kabupaten}
                  onChange={(event) =>
                    updatePihak1("kabupaten", toTitleCase(event.target.value))
                  }
                  placeholder="Nama kabupaten"
                />
              </Field>

              <Field label="Provinsi" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={pihak1.provinsi}
                  onChange={(event) =>
                    updatePihak1("provinsi", toTitleCase(event.target.value))
                  }
                  placeholder="Opsional"
                />
              </Field>
            </div>
          </Section>

          <Section
            icon={Users}
            number="3"
            title="Pihak yang memberikan persetujuan"
            description="Tambahkan pasangan atau pihak lain bila diperlukan."
          >
            <button
              type="button"
              onClick={tambahPihakLainnya}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <Plus size={15} />
              Tambah pihak persetujuan
            </button>

            {pihakLainnya.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
                Belum ada pihak persetujuan tambahan.
              </p>
            ) : null}

            {pihakLainnya.map((item, index) => (
              <div
                key={item.id}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-700">
                    Pihak persetujuan {index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() => hapusPihakLainnya(item.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                    Hapus
                  </button>
                </div>

                <Field label="Status hubungan">
                  <select
                    className={inputClass}
                    value={item.status}
                    onChange={(event) =>
                      updatePihakLainnya(item.id, "status", event.target.value)
                    }
                  >
                    <option value="istri/suami">Istri / Suami</option>
                    <option value="Istri">Istri</option>
                    <option value="Suami">Suami</option>
                    <option value="Orang Tua">Orang Tua</option>
                    <option value="Lainnya">Lainnya (isi sendiri)</option>
                  </select>
                </Field>

                {item.status === "Lainnya" ? (
                  <Field label="Status hubungan lainnya">
                    <input
                      className={inputClass}
                      value={item.statusCustom}
                      onChange={(event) =>
                        updatePihakLainnya(
                          item.id,
                          "statusCustom",
                          event.target.value,
                        )
                      }
                      placeholder="Contoh: saudara kandung"
                    />
                  </Field>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Nama lengkap" className="sm:col-span-2">
                    <input
                      className={inputClass}
                      value={item.nama}
                      onChange={(event) =>
                        updatePihakLainnya(
                          item.id,
                          "nama",
                          event.target.value.toUpperCase(),
                        )
                      }
                      placeholder="Nama sesuai KTP"
                    />
                  </Field>

                  <Field label="NIK" className="sm:col-span-2">
                    <input
                      className={inputClass}
                      value={item.nik}
                      onChange={(event) =>
                        updatePihakLainnya(item.id, "nik", event.target.value)
                      }
                      placeholder="Masukkan NIK"
                    />
                  </Field>

                  <Field label="Jalan / dusun" className="sm:col-span-2">
                    <input
                      className={inputClass}
                      disabled={item.samakanAlamat}
                      value={item.samakanAlamat ? pihak1.jalan : item.jalan}
                      onChange={(event) =>
                        updatePihakLainnya(
                          item.id,
                          "jalan",
                          toTitleCase(event.target.value),
                        )
                      }
                      placeholder="Jalan atau dusun"
                    />
                  </Field>

                  <Field label="RT">
                    <input
                      className={inputClass}
                      value={item.samakanAlamat ? pihak1.rt : item.rt}
                      disabled={item.samakanAlamat}
                      onChange={(event) =>
                        updatePihakLainnya(item.id, "rt", event.target.value)
                      }
                      placeholder="001"
                    />
                  </Field>

                  <Field label="RW">
                    <input
                      className={inputClass}
                      value={item.samakanAlamat ? pihak1.rw : item.rw}
                      disabled={item.samakanAlamat}
                      onChange={(event) =>
                        updatePihakLainnya(item.id, "rw", event.target.value)
                      }
                      placeholder="002"
                    />
                  </Field>

                  <Field label="Desa / kelurahan">
                    <input
                      className={inputClass}
                      disabled={item.samakanAlamat}
                      value={item.samakanAlamat ? pihak1.desa : item.desa}
                      onChange={(event) =>
                        updatePihakLainnya(
                          item.id,
                          "desa",
                          toTitleCase(event.target.value),
                        )
                      }
                      placeholder="Nama desa"
                    />
                  </Field>

                  <Field label="Kecamatan">
                    <input
                      className={inputClass}
                      disabled={item.samakanAlamat}
                      value={
                        item.samakanAlamat ? pihak1.kecamatan : item.kecamatan
                      }
                      onChange={(event) =>
                        updatePihakLainnya(
                          item.id,
                          "kecamatan",
                          toTitleCase(event.target.value),
                        )
                      }
                      placeholder="Nama kecamatan"
                    />
                  </Field>

                  <Field label="Kabupaten / kota">
                    <input
                      className={inputClass}
                      disabled={item.samakanAlamat}
                      value={
                        item.samakanAlamat ? pihak1.kabupaten : item.kabupaten
                      }
                      onChange={(event) =>
                        updatePihakLainnya(
                          item.id,
                          "kabupaten",
                          toTitleCase(event.target.value),
                        )
                      }
                      placeholder="Nama kabupaten"
                    />
                  </Field>

                  <Field label="Provinsi" className="sm:col-span-2">
                    <input
                      className={inputClass}
                      disabled={item.samakanAlamat}
                      value={
                        item.samakanAlamat ? pihak1.provinsi : item.provinsi
                      }
                      onChange={(event) =>
                        updatePihakLainnya(
                          item.id,
                          "provinsi",
                          toTitleCase(event.target.value),
                        )
                      }
                      placeholder="Opsional"
                    />
                  </Field>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-800">
                  <input
                    type="checkbox"
                    checked={Boolean(item.samakanAlamat)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        samakanAlamatDenganPihak1(item.id);
                      } else {
                        updatePihakLainnya(item.id, "samakanAlamat", false);
                      }
                    }}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Samakan alamat dengan Pihak Pertama
                </label>
              </div>
            ))}
          </Section>

          <Section
            icon={Building2}
            number="4"
            title="Pihak Kedua"
            description="Pilih unit kerja; data Pengawas akan terisi otomatis dari master pegawai unit tersebut."
          >
            <Field label="Unit kerja Pihak Kedua">
              <select
                className={inputClass}
                value={selectedUnitCode}
                onChange={(event) => setSelectedUnitCode(event.target.value)}
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.name} ({unit.value})
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                Pengawas dari database JOSJIS
              </p>
              <p className="mt-1 text-sm font-bold text-blue-950">
                {unitKerja}
              </p>
              <p className="mt-0.5 text-xs text-blue-700">
                Kode unit: {kodeUnit}
              </p>

              {loadingPengawas ? (
                <p className="mt-2 text-xs text-blue-800">
                  Mengambil data Pengawas...
                </p>
              ) : null}

              {pengawasError ? (
                <p className="mt-2 text-xs font-medium text-amber-800">
                  {pengawasError}
                </p>
              ) : null}
            </div>

            {pengawasList.length > 1 ? (
              <Field label="Pilih Pengawas">
                <select
                  className={inputClass}
                  value={pihak2.id}
                  onChange={(event) => {
                    const selected = pengawasList.find(
                      (item) => item.id === event.target.value,
                    );

                    if (selected) {
                      setPihak2({
                        id: selected.id,
                        nama: selected.nama || "",
                        nip: selected.nip || "",
                        jabatan: selected.jabatan || "",
                      });
                    }
                  }}
                >
                  {pengawasList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama} — {item.jabatan || "Jabatan tidak diisi"}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nama Pengawas" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={pihak2.nama}
                  readOnly
                  placeholder="Otomatis dari master pegawai"
                />
              </Field>

              <Field label="NIP">
                <input
                  className={inputClass}
                  value={pihak2.nip}
                  readOnly
                  placeholder="Otomatis dari master pegawai"
                />
              </Field>

              <Field label="Jabatan">
                <input
                  className={inputClass}
                  value={pihak2.jabatan}
                  readOnly
                  placeholder="Otomatis dari master pegawai"
                />
              </Field>
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              Data Pengawas diambil dari tabel pegawai dengan status aktif dan
              jenis pegawai PENGAWAS. Mengganti unit di atas akan memperbarui
              data Pihak Kedua.
            </p>
          </Section>

          <Section
            icon={ClipboardList}
            number="5"
            title="Daftar dokumen / agunan"
            description="Tambahkan satu atau beberapa dokumen yang diserahterimakan."
          >
            <button
              type="button"
              onClick={tambahDokumen}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <Plus size={15} />
              Tambah dokumen
            </button>

            {dokumenList.map((doc, index) => (
              <div
                key={doc.id}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-700">
                    Dokumen {index + 1}
                  </p>

                  {dokumenList.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => hapusDokumen(doc.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                      Hapus
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Jenis dokumen">
                    <select
                      className={inputClass}
                      value={doc.jenis}
                      onChange={(event) =>
                        updateDokumen(doc.id, "jenis", event.target.value)
                      }
                    >
                      <option value="SHM">SHM</option>
                      <option value="SHM NIB">SHM / NIB</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </Field>

                  <Field label="Nomor dokumen">
                    <input
                      className={inputClass}
                      value={doc.noDokumen}
                      onChange={(event) =>
                        updateDokumen(doc.id, "noDokumen", event.target.value)
                      }
                      placeholder="Nomor sertifikat"
                    />
                  </Field>

                  {doc.jenis === "Lainnya" ? (
                    <Field
                      label="Jenis dokumen lainnya"
                      className="sm:col-span-2"
                    >
                      <input
                        className={inputClass}
                        value={doc.jenisCustom}
                        onChange={(event) =>
                          updateDokumen(
                            doc.id,
                            "jenisCustom",
                            event.target.value,
                          )
                        }
                        placeholder="Isi jenis dokumen"
                      />
                    </Field>
                  ) : null}

                  <Field label="Tanggal terbit">
                    <input
                      type="date"
                      className={inputClass}
                      value={doc.tanggalTerbit}
                      onChange={(event) =>
                        updateDokumen(
                          doc.id,
                          "tanggalTerbit",
                          event.target.value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Nama kepemilikan">
                    <input
                      className={inputClass}
                      value={doc.namaKepemilikan}
                      onChange={(event) =>
                        updateDokumen(
                          doc.id,
                          "namaKepemilikan",
                          event.target.value.toUpperCase(),
                        )
                      }
                      placeholder="Nama pada dokumen"
                    />
                  </Field>

                  <Field label="Objek dokumen" className="sm:col-span-2">
                    <select
                      className={inputClass}
                      value={doc.objek}
                      onChange={(event) =>
                        updateDokumen(doc.id, "objek", event.target.value)
                      }
                    >
                      <option value="Tanah Kebun">Tanah Kebun</option>
                      <option value="Tanah dan Rumah">Tanah dan Rumah</option>
                      <option value="Tanah dan Bangunan">
                        Tanah dan Bangunan
                      </option>
                      <option value="Lainnya">Lainnya (isi sendiri)</option>
                    </select>
                  </Field>

                  {doc.objek === "Lainnya" ? (
                    <Field label="Objek lainnya" className="sm:col-span-2">
                      <input
                        className={inputClass}
                        value={doc.objekCustom}
                        onChange={(event) =>
                          updateDokumen(
                            doc.id,
                            "objekCustom",
                            event.target.value,
                          )
                        }
                        placeholder="Isi objek dokumen"
                      />
                    </Field>
                  ) : null}

                  <Field
                    label="Hubungan pemilik dengan debitur"
                    className="sm:col-span-2"
                  >
                    <select
                      className={inputClass}
                      value={doc.hubungan}
                      onChange={(event) =>
                        updateDokumen(doc.id, "hubungan", event.target.value)
                      }
                    >
                      <option value="Debitur">Debitur</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Ayah Kandung Debitur">
                        Ayah Kandung Debitur
                      </option>
                      <option value="Ibu Kandung Debitur">
                        Ibu Kandung Debitur
                      </option>
                      <option value="Hibah">Hibah</option>
                      <option value="JUAL BELI">Jual Beli</option>
                      <option value="Waris">Waris</option>
                      <option value="Lainnya">Lainnya (isi sendiri)</option>
                    </select>
                  </Field>

                  {doc.hubungan === "Lainnya" ? (
                    <Field label="Hubungan lainnya" className="sm:col-span-2">
                      <input
                        className={inputClass}
                        value={doc.hubunganCustom}
                        onChange={(event) =>
                          updateDokumen(
                            doc.id,
                            "hubunganCustom",
                            event.target.value,
                          )
                        }
                        placeholder="Isi hubungan dengan debitur"
                      />
                    </Field>
                  ) : null}
                </div>
              </div>
            ))}
          </Section>

          <Section
            icon={FileText}
            number="6"
            title="Data fasilitas kredit"
            description="Data debitur dan perjanjian kredit yang terkait."
          >
            <Field label="Nama debitur">
              <input
                className={inputClass}
                value={kreditInfo.namaDebitur}
                onChange={(event) =>
                  setKreditInfo((current) => ({
                    ...current,
                    namaDebitur: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="Nama lengkap debitur"
              />
            </Field>

            <Field label="Nomor perjanjian kredit (PK)">
              <input
                className={inputClass}
                value={kreditInfo.nomorPK}
                onChange={(event) =>
                  setKreditInfo((current) => ({
                    ...current,
                    nomorPK: event.target.value,
                  }))
                }
                placeholder="Nomor PK"
              />
            </Field>

            <Field label="Tanggal PK">
              <input
                type="date"
                className={inputClass}
                value={kreditInfo.tanggalPK}
                onChange={(event) =>
                  setKreditInfo((current) => ({
                    ...current,
                    tanggalPK: event.target.value,
                  }))
                }
              />
            </Field>
          </Section>

          <button
            type="button"
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
          >
            <Download size={17} />
            Unduh BAST MORAL dalam PDF
          </button>
        </div>

        <div className="min-w-0 lg:sticky lg:top-[78px]">
          <div className="no-print mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Pratinjau dokumen
              </h2>
              <p className="text-xs text-slate-500">
                Tampilan A4 · Hasil ini yang akan dicetak / disimpan sebagai PDF
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer size={14} />
              Cetak
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl bg-slate-200 p-2 sm:p-4">
            <article
              id="bast-print-area"
              className="mx-auto min-h-[297mm] w-[210mm] max-w-none bg-white px-[17mm] py-[15mm] text-[10.5pt] leading-[1.35] text-black shadow-lg"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            >
              <header className="mb-5 text-center font-bold">
                <div className="underline">
                  BERITA ACARA SERAH TERIMA DOKUMEN TAMBAHAN
                </div>
                <div className="mt-1">{nomorSuratFinal}</div>
              </header>

              <p className="mb-1 text-justify">
                Pada hari ini {formatTanggalSurat(tanggalSurat)} telah dilakukan
                serah terima Dokumen dari:
              </p>

              <table className="mb-1 w-full">
                <tbody>
                  <tr>
                    <td className="w-[105px] pl-12 align-top">Nama</td>
                    <td className="w-[15px] align-top">:</td>
                    <td className="align-top font-bold">
                      {pihak1.nama || "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pl-12 align-top">NIK</td>
                    <td className="align-top">:</td>
                    <td className="align-top">{pihak1.nik || "-"}</td>
                  </tr>
                  <tr>
                    <td className="pl-12 align-top">Alamat</td>
                    <td className="align-top">:</td>
                    <td className="align-top">{formatAlamatLengkap(pihak1)}</td>
                  </tr>
                </tbody>
              </table>

              {pihakLainnya.map((item) => {
                const status =
                  item.status === "Lainnya"
                    ? item.statusCustom || "pihak terkait"
                    : item.status;

                return (
                  <div key={item.id} className="mb-1">
                    <p className="mb-1 text-justify">
                      Dalam hal ini telah memperoleh persetujuan dari {status},
                      yaitu:
                    </p>

                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="w-[105px] pl-12 align-top">Nama</td>
                          <td className="w-[15px] align-top">:</td>
                          <td className="align-top font-bold">
                            {item.nama || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-12 align-top">NIK</td>
                          <td className="align-top">:</td>
                          <td className="align-top">{item.nik || "-"}</td>
                        </tr>
                        <tr>
                          <td className="pl-12 align-top">Alamat</td>
                          <td className="align-top">:</td>
                          <td className="align-top">
                            {formatAlamatLengkap(
                              item.samakanAlamat
                                ? { ...item, ...pihak1 }
                                : item,
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}

              <p className="mb-1 text-justify">
                untuk selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>
                .
              </p>

              <p className="mb-1">Kepada</p>

              <table className="mb-2 w-full">
                <tbody>
                  <tr>
                    <td className="w-[105px] pl-12 align-top">Nama</td>
                    <td className="w-[15px] align-top">:</td>
                    <td className="align-top font-bold">
                      {pihak2.nama || "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pl-12 align-top">NIP</td>
                    <td className="align-top">:</td>
                    <td className="align-top">{pihak2.nip || "-"}</td>
                  </tr>
                  <tr>
                    <td className="pl-12 align-top">Jabatan</td>
                    <td className="align-top">:</td>
                    <td className="align-top">{pihak2.jabatan || "-"}</td>
                  </tr>
                  <tr>
                    <td className="pl-12 align-top">Unit Kerja</td>
                    <td className="align-top">:</td>
                    <td className="align-top">{unitKerja || "-"}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-2 text-justify">
                dalam hal ini bertindak untuk dan atas nama PT Bank Mandiri
                (Persero) Tbk, untuk selanjutnya disebut sebagai{" "}
                <strong>PIHAK KEDUA</strong>. Dokumen tersebut adalah sebagai
                berikut:
              </p>

              <table className="mb-3 w-full border-collapse border border-black text-[9pt]">
                <thead>
                  <tr className="text-center font-bold">
                    <th className="border border-black px-1.5 py-1.5">
                      Jenis Dokumen
                    </th>
                    <th className="border border-black px-1.5 py-1.5">
                      No. Dokumen
                    </th>
                    <th className="border border-black px-1.5 py-1.5">
                      Tanggal Terbit
                    </th>
                    <th className="border border-black px-1.5 py-1.5">
                      Nama Kepemilikan
                    </th>
                    <th className="border border-black px-1.5 py-1.5">
                      Objek Dokumen
                    </th>
                    <th className="border border-black px-1.5 py-1.5">
                      Hubungan Pemilik dengan Debitur
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dokumenList.map((doc) => {
                    const jenis =
                      doc.jenis === "Lainnya" ? doc.jenisCustom : doc.jenis;

                    const objek =
                      doc.objek === "Lainnya" ? doc.objekCustom : doc.objek;

                    const hubungan =
                      doc.hubungan === "Lainnya"
                        ? doc.hubunganCustom
                        : doc.hubungan;

                    return (
                      <tr key={doc.id} className="text-center">
                        <td className="border border-black px-1.5 py-1.5">
                          {jenis || "-"}
                        </td>
                        <td className="border border-black px-1.5 py-1.5">
                          {doc.noDokumen || "-"}
                        </td>
                        <td className="border border-black px-1.5 py-1.5">
                          {formatDDMMYYYY(doc.tanggalTerbit) || "-"}
                        </td>
                        <td className="border border-black px-1.5 py-1.5">
                          {doc.namaKepemilikan || "-"}
                        </td>
                        <td className="border border-black px-1.5 py-1.5">
                          {objek || "-"}
                        </td>
                        <td className="border border-black px-1.5 py-1.5">
                          {hubungan || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p className="mb-1 text-justify">
                Sehubungan dengan serah terima Dokumen PIHAK PERTAMA dan PIHAK
                KEDUA menyatakan tunduk dan setuju terhadap ketentuan di bawah
                ini:
              </p>

              <ol className="mb-3 list-decimal space-y-1 pl-6 text-justify">
                <li>
                  Bahwa PIHAK PERTAMA merupakan pemilik yang sah dari objek
                  sesuai Dokumen yang tercantum di atas.
                </li>

                <li>
                  Bahwa penyerahan Dokumen ini dilakukan sehubungan dengan
                  fasilitas kredit yang diterima oleh{" "}
                  <strong>{kreditInfo.namaDebitur || "........"}</strong> sesuai
                  Perjanjian Kredit No: {kreditInfo.nomorPK || "........"}{" "}
                  tanggal {formatTanggalBiasa(kreditInfo.tanggalPK)} dari Bank
                  Mandiri.
                </li>

                <li>
                  Bahwa sehubungan dengan penyerahan Dokumen tersebut, PIHAK
                  PERTAMA dengan ini memberikan kuasa dan kewenangan sepenuhnya
                  kepada PIHAK KEDUA untuk dan atas nama PIHAK PERTAMA melakukan
                  tindakan yang diperlukan oleh PIHAK KEDUA untuk mengamankan
                  kepentingan PIHAK KEDUA sehubungan dengan pemenuhan kewajiban
                  pelunasan fasilitas kredit yang diterima oleh Debitur.
                </li>

                <li>
                  Bahwa PIHAK PERTAMA dengan ini membebaskan PIHAK KEDUA dari
                  segala risiko ataupun kerugian yang timbul akibat dari
                  tuntutan pihak ketiga lainnya sehubungan dengan pemberian
                  kuasa dan kewenangan dari PIHAK PERTAMA kepada PIHAK KEDUA.
                </li>

                <li>
                  Bahwa pemberian kuasa sesuai butir 3 di atas diberikan dengan
                  Hak Substitusi dan tidak dapat ditarik kembali, diubah,
                  dan/atau tidak akan berakhir dikarenakan sebab-sebab yang
                  tercantum dalam pasal 1813, 1814, dan 1816 Kitab Undang-Undang
                  Hukum Perdata atau dikarenakan sebab apapun juga tanpa
                  persetujuan tertulis terlebih dahulu dari PIHAK KEDUA.
                </li>

                <li>
                  Bahwa PIHAK PERTAMA telah mengetahui dan memahami atas segala
                  risiko yang akan terkait dengan penyerahan objek sesuai
                  Dokumen tersebut di atas dan dokumen ini tidak akan ditarik
                  oleh PIHAK PERTAMA sampai dengan fasilitas kredit yang
                  diterima oleh Debitur sesuai Perjanjian Kredit telah lunas
                  atau dinyatakan lunas oleh PIHAK KEDUA.
                </li>
              </ol>

              {/* Paragraf penutup selalu dimulai di halaman 2 */}
              <p className="closing-paragraph mb-6 text-justify">
                Demikian Berita Acara Serah Terima Dokumen ini dibuat dengan
                sebenarnya dan akan berakhir setelah adanya pemberitahuan dari
                PIHAK KEDUA yang menyatakan bahwa seluruh kewajiban Debitur
                sehubungan dengan Perjanjian Kredit tersebut di atas
                berakhir/dinyatakan selesai/lunas.
              </p>

              <div className="signature-section grid grid-cols-2 gap-8 pt-2">
                <div className="signature-block">
                  <div className="mb-16 font-bold">PIHAK PERTAMA</div>

                  <div className="w-full max-w-[220px] border-t border-black pt-1 font-bold">
                    {pihak1.nama || "........................"}
                  </div>

                  {pihakLainnya.map((item) => {
                    const label =
                      item.status === "Lainnya"
                        ? item.statusCustom || "Pihak Terkait"
                        : item.status === "istri/suami"
                          ? "Pasangan PIHAK PERTAMA"
                          : `${item.status} PIHAK PERTAMA`;

                    return (
                      <div key={item.id} className="mt-5">
                        <div>Menyetujui</div>
                        <div className="mb-16 font-bold">{label}</div>
                        <div className="w-full max-w-[220px] border-t border-black pt-1 font-bold">
                          {item.nama || "........................"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="signature-block pl-4">
                  <div className="mb-16 font-bold">PIHAK KEDUA</div>

                  <div className="w-full max-w-[220px] border-t border-black pt-1 font-bold">
                    {pihak2.nama || "........................"}
                  </div>

                  <div>{pihak2.jabatan || ""}</div>
                  <div>{unitKerja}</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
