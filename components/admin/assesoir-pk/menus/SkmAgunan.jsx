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
  UserRound,
  CalendarDays,
  Wallet,
  FolderOpen,
  FileDown,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";

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

const todayLocal = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const EMPTY_FORM = {
  tanggalDokumen: todayLocal(),
  unitCode: "",
  pejabatNama: "",
  pejabatJabatan: "",

  debiturNama: "",
  debiturGender: "L",
  debiturTglLahir: "",
  debiturNik: "",
  debiturJalan: "",
  debiturRt: "",
  debiturRw: "",
  debiturDesa: "",
  debiturKecamatan: "",
  debiturKabupaten: "",

  debiturPasanganNama: "",
  debiturPasanganGender: "P",
  debiturPasanganNik: "",

  pemilikNama: "",
  pemilikGender: "L",
  pemilikTglLahir: "",
  pemilikNik: "",
  pemilikJalan: "",
  pemilikRt: "",
  pemilikRw: "",
  pemilikDesa: "",
  pemilikKecamatan: "",
  pemilikKabupaten: "",

  pemilikPasanganNama: "",
  pemilikPasanganGender: "P",
  pemilikPasanganNik: "",
  pemilikSamaAlamatDebitur: false,

  nomorPk: "",
  tanggalPk: "",
  jenisFasilitas: "KUR",
  limitKredit: "",

  jenisDokumen: "SHM",
  jenisDokumenLainnya: "",
  nomorDokumen: "",
  jenisAgunan: "Tanah dan Bangunan Rumah",
  jenisAgunanLainnya: "",
  desaAgunan: "",
  atasNamaDokumen: "",
  luasAgunan: "",
};

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
  return (pk?.pk_agunan || []).some((item) => {
    const objectName = String(item?.objek_agunan || "").toLowerCase();
    const isMain = !item?.peran_agunan || item.peran_agunan === "UTAMA";
    const isBound = ["APHT", "SKMHT"].includes(item?.status_pengikatan);

    return (
      isMain && isBound && /rumah|bangunan|ruko|tempat tinggal/.test(objectName)
    );
  });
}

function isDocumentAvailable(document, pk) {
  const product = getProduct(pk);

  if (!document.products.includes(product)) return false;

  if (
    document.id === "surat-asn-polri" &&
    !/ASN|PNS|POLRI|POLISI/i.test(pk?.profesi || "")
  )
    return false;

  if (document.id === "order-asuransi-kebakaran" && !isHouseCollateral(pk))
    return false;

  return true;
}

function titleCase(value) {
  return String(value || "")
    .toLocaleLowerCase("id-ID")
    .replace(
      /(^|[\s'-])([a-zà-ÿ])/g,
      (m, p, c) => p + c.toLocaleUpperCase("id-ID"),
    )
    .replace(/\b(shm|shgb|nib|kur|kum|kpp|ksm)\b/gi, (word) =>
      word.toLocaleUpperCase("id-ID"),
    );
}

const OWNER_ADDRESS_PARTS = [
  "Jalan",
  "Rt",
  "Rw",
  "Desa",
  "Kecamatan",
  "Kabupaten",
];

const DEBTOR_ADDRESS_KEYS = OWNER_ADDRESS_PARTS.map((part) => `debitur${part}`);

function ageAt(dob, dateValue) {
  if (!dob || !dateValue) return "";

  const birth = new Date(`${dob}T00:00:00`);
  const at = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime()) || birth > at)
    return "";

  let age = at.getFullYear() - birth.getFullYear();

  if (
    at.getMonth() < birth.getMonth() ||
    (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate())
  )
    age -= 1;

  return String(age);
}

function indoDate(value) {
  if (!value) return "";

  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function salutation(gender) {
  return gender === "P" ? "Nyonya" : "Tuan";
}

function personAddress(form, prefix) {
  const road = form[`${prefix}Jalan`]?.trim();
  const rt = form[`${prefix}Rt`]?.trim();
  const rw = form[`${prefix}Rw`]?.trim();
  const desa = titleCase(form[`${prefix}Desa`]);
  const kec = titleCase(form[`${prefix}Kecamatan`]);
  const kab = titleCase(form[`${prefix}Kabupaten`]);

  const parts = [];

  if (road) parts.push(titleCase(road));
  if (rt || rw) parts.push(`RT/RW ${rt || "-"}/${rw || "-"}`);
  if (desa) parts.push(`Desa ${desa}`);
  if (kec) parts.push(`Kecamatan ${kec}`);
  if (kab) parts.push(`Kabupaten ${kab}`);

  return parts.join(", ");
}

function docType(form) {
  return form.jenisDokumen === "LAINNYA"
    ? titleCase(form.jenisDokumenLainnya)
    : form.jenisDokumen;
}

function collateralType(form) {
  return form.jenisAgunan === "LAINNYA"
    ? titleCase(form.jenisAgunanLainnya)
    : form.jenisAgunan;
}

function numeric(value) {
  return Number(String(value || "").replace(/[^0-9]/g, "")) || 0;
}

function formatNumber(value) {
  return numeric(value).toLocaleString("id-ID");
}

function createSkmPdf({ form, kind }) {
  const isInventory = kind === "persediaan";

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [148, 210],
    compress: true,
  });

  const left = 13.5;
  const right = 13.5;
  const width = 148 - left - right;

  let y = 15;

  const setBody = () => {
    doc.setFont("times", "normal");
    doc.setFontSize(10.5);
  };

  const lineHeight = 5;

  const addPageIfNeeded = (needed = lineHeight) => {
    if (y + needed > 195) {
      doc.addPage();
      y = 15;
    }
  };

  const paragraph = (text, options = {}) => {
    const {
      bold = false,
      align = "justify",
      indent = 0,
      gap = 1.5,
      fontSize = 10.5,
    } = options;

    doc.setFont("times", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);

    const lines = doc.splitTextToSize(String(text || ""), width - indent);
    const lh = fontSize * 0.46;

    addPageIfNeeded(lines.length * lh + gap);

    doc.text(lines, left + indent, y, {
      align,
      maxWidth: width - indent,
      lineHeightFactor: isInventory ? 1.35 : 1.08,
    });

    y += lines.length * lh + gap;
    setBody();
  };

  const dateText = indoDate(form.tanggalDokumen);

  const unitName =
    form.unitCode === "JKK2" ? "Kuamang Kuning 2" : "Kuamang Kuning 1";

  const officer = `${titleCase(form.pejabatNama)} selaku ${form.pejabatJabatan} Unit ${unitName}`;

  const debtor = titleCase(form.debiturNama);
  const owner = titleCase(form.pemilikNama);

  const debtorAge = ageAt(form.debiturTglLahir, form.tanggalDokumen);
  const ownerAge = ageAt(form.pemilikTglLahir, form.tanggalDokumen);

  const facility = String(form.jenisFasilitas || "").toUpperCase();
  const pkDate = formatTanggal(form.tanggalPk);

  const agreement = `akta Perjanjian Kredit No. ${form.nomorPk || "................"} tanggal ${pkDate || "................"}`;

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("SURAT KUASA MENJUAL AGUNAN", 74, y, { align: "center" });
  y += 9;

  paragraph(`Pada hari ini ${dateText}, yang bertanda tangan di bawah ini:`, {
    gap: 3,
  });

  if (isInventory) {
    const debtorLine = `${salutation(form.debiturGender)} ${debtor}, ${debtorAge} tahun, bertempat tinggal di ${personAddress(form, "debitur")}, pemegang KTP. no. ${form.debiturNik}, diterbitkan oleh Dinas Kependudukan dan Pencatatan Sipil Kabupaten ${titleCase(form.debiturKabupaten)}${
      form.debiturPasanganNama
        ? ` dan untuk melakukan perbuatan hukum telah mendapat persetujuan dari ${salutation(form.debiturPasanganGender)} ${titleCase(form.debiturPasanganNama)}, pemegang KTP no. ${form.debiturPasanganNik}, yang turut hadir dan menandatangani akta ini`
        : " dan untuk melakukan perbuatan hukum serta menandatangani akta ini"
    }, untuk selanjutnya disebut: "PEMBERI KUASA".`;

    paragraph(debtorLine, { gap: 4 });
  } else {
    const ownerLine = `${salutation(form.pemilikGender)} ${owner}, ${ownerAge} tahun, bertempat tinggal di ${personAddress(form, "pemilik")}, pemegang KTP. no. ${form.pemilikNik}, diterbitkan oleh Dinas Kependudukan dan Pencatatan Sipil Kabupaten ${titleCase(form.pemilikKabupaten)}${
      form.pemilikPasanganNama
        ? ` dan untuk melakukan perbuatan hukum telah mendapat persetujuan dari ${salutation(form.pemilikPasanganGender)} ${titleCase(form.pemilikPasanganNama)}, pemegang KTP no. ${form.pemilikPasanganNik}, yang turut hadir dan menandatangani akta ini`
        : " dan untuk melakukan perbuatan hukum serta menandatangani akta ini"
    }, untuk selanjutnya disebut: "PEMBERI KUASA".`;

    paragraph(ownerLine, { gap: 4 });
  }

  paragraph(
    "PEMBERI KUASA dengan ini menerangkan terlebih dahulu hal-hal sebagai berikut:",
    { gap: 2 },
  );

  if (isInventory) {
    const stockValue = formatRupiah(numeric(form.limitKredit));

    paragraph(
      `1. Bahwa PEMBERI KUASA adalah sebagai pemilik atas barang-barang berupa: ${collateralType(form)} senilai ${stockValue}, termasuk barang persediaan yang sekarang ada maupun yang akan ada di kemudian hari, yang selanjutnya dalam akta ini disebut "Agunan".`,
      { indent: 3, gap: 2 },
    );
  } else {
    const luas = form.luasAgunan
      ? `${formatNumber(form.luasAgunan)} M2`
      : "................ M2";

    paragraph(
      `1. Bahwa PEMBERI KUASA adalah sebagai pemilik atas barang-barang berupa: ${docType(form)} Nomor ${form.nomorDokumen}, Desa ${titleCase(form.desaAgunan)}, tercatat atas nama ${titleCase(form.atasNamaDokumen || form.pemilikNama)}, seluas ${luas}, yang selanjutnya dalam akta ini disebut "Agunan".`,
      { indent: 3, gap: 2 },
    );
  }

  paragraph(
    `2. Bahwa PEMBERI KUASA telah mengetahui pemberian fasilitas kredit ${facility} atas nama ${debtor} berdasarkan ${agreement}, selanjutnya disebut "Perjanjian Kredit".`,
    { indent: 3, gap: 2 },
  );

  paragraph(
    "3. Kuasa yang diberikan oleh PEMBERI KUASA baru dapat digunakan apabila PEMBERI KUASA telah wanprestasi/ingkar janji/lalai berdasarkan Perjanjian Kredit.",
    { indent: 3, gap: 3 },
  );

  paragraph(
    "Bahwa PEMBERI KUASA dengan ini memberikan kuasa dan kewenangan sepenuhnya kepada:",
    { gap: 2 },
  );

  paragraph(
    `PT Bank Mandiri (Persero) Tbk. berkedudukan di Jakarta Selatan dan berkantor pusat di Jl. Jend. Gatot Subroto Kav. 36-38 Jakarta 12190, didirikan berdasarkan hukum negara Republik Indonesia, dalam hal ini diwakili oleh ${officer}, oleh karena itu sah bertindak untuk dan atas nama PT Bank Mandiri (Persero) Tbk., selanjutnya disebut: "PENERIMA KUASA" KHUSUS.`,
    { gap: 3 },
  );

  paragraph(
    "Untuk dan atas nama PEMBERI KUASA melakukan tindakan-tindakan hukum sebagai berikut:",
    { gap: 2 },
  );

  const clauses = [
    "Melepaskan hak atau menjual/memindahtangankan dalam bentuk apapun juga kepada orang atau pihak siapa dan manapun atas Agunan.",
    "Menawarkan kepada siapapun juga termasuk kepada dirinya sendiri sebagai PENERIMA KUASA.",
    "Menentukan pembeli dan nilai/harga penjualan atas Agunan termasuk menerima pembayarannya dan menggunakannya untuk melunasi/mengurangi kewajiban PEMBERI KUASA berdasarkan Perjanjian Kredit.",
    "Membayar biaya-biaya dan ongkos yang timbul berkenaan dengan penjualan Agunan.",
    "Menyatakan sisa kewajiban tetap menjadi tanggung jawab PEMBERI KUASA jika hasil penjualan tidak mencukupi untuk pelunasan kewajiban PEMBERI KUASA, dan PENERIMA KUASA tetap berhak melakukan upaya-upaya penagihan sesuai Perjanjian Kredit.",
    "Menghadap pejabat-pejabat yang berwenang, memberikan keterangan-keterangan atau penjelasan-penjelasan, melakukan penolakan, menandatangani akta-akta atau dokumen-dokumen yang berhubungan dengan itu.",
    "Melakukan tindakan apapun juga yang dianggap perlu sehubungan dengan pelaksanaan pemberian kuasa ini tanpa ada yang dikecualikan.",
  ];

  clauses.forEach((clause, index) => {
    paragraph(`${index + 1}. ${clause}`, { indent: 3, gap: 1.2 });
  });

  paragraph(
    "Sehubungan dengan pemberian kuasa ini, maka PEMBERI KUASA dengan ini membebaskan PENERIMA KUASA dari segala risiko ataupun kerugian yang timbul akibat dari tuntutan pihak ketiga lainnya.",
    { gap: 2 },
  );

  paragraph(
    "Kuasa ini diberikan dengan Hak Substitusi dan tidak dapat ditarik kembali, diubah, dan atau tidak akan berakhir dikarenakan sebab-sebab yang tercantum dalam pasal 1813, 1814 dan 1816 Kitab Undang-Undang Hukum Perdata atau dikarenakan sebab apapun juga tanpa persetujuan tertulis terlebih dahulu dari PENERIMA KUASA.",
    { gap: 2 },
  );

  paragraph(
    "Demikian Surat Kuasa ini dibuat dan akan berakhir setelah adanya pemberitahuan dari PENERIMA KUASA yang menyatakan bahwa seluruh kewajiban PEMBERI KUASA sehubungan dengan Perjanjian Kredit tersebut di atas berakhir/dinyatakan selesai/lunas.",
    { gap: 5 },
  );

  addPageIfNeeded(40);

  const signatureY = Math.max(y + 3, 155);

  if (signatureY > 178) {
    doc.addPage();
    y = 18;
  }

  const sy = Math.min(Math.max(y + 2, 150), 166);

  doc.setFont("times", "normal");
  doc.setFontSize(10);

  if (isInventory) {
    doc.text("Pemberi Kuasa,", 35, sy, { align: "center" });
    doc.text("Menyetujui,", 74, sy, { align: "center" });
    doc.text("Penerima Kuasa,", 117, sy, { align: "center" });

    doc.text("PT. Bank Mandiri (Persero), Tbk", 117, sy + 5, {
      align: "center",
    });
    doc.text(
      "Kuamang Kuning " + (form.unitCode === "JKK2" ? "2" : "1"),
      117,
      sy + 9,
      { align: "center" },
    );

    doc.rect(24, sy + 17, 22, 12);
    doc.setFontSize(8);
    doc.text("Meterai 10.000", 35, sy + 24, { align: "center" });

    doc.setFontSize(10);
    doc.text(titleCase(form.debiturNama), 35, sy + 43, { align: "center" });
    doc.text(titleCase(form.debiturPasanganNama), 74, sy + 43, {
      align: "center",
    });
    doc.text(titleCase(form.pejabatNama), 117, sy + 43, { align: "center" });
  } else {
    doc.text("Pemberi Kuasa,", 42, sy, { align: "center" });

    if (form.pemilikPasanganNama) {
      doc.text("Menyetujui,", 91, sy, { align: "center" });
    }

    doc.text("Penerima Kuasa,", 125, sy, { align: "center" });
    doc.text("PT. Bank Mandiri (Persero), Tbk", 125, sy + 5, {
      align: "center",
    });

    doc.text(
      "Kuamang Kuning " + (form.unitCode === "JKK2" ? "2" : "1"),
      125,
      sy + 9,
      { align: "center" },
    );

    doc.rect(31, sy + 17, 22, 12);
    doc.setFontSize(8);
    doc.text("Meterai 10.000", 42, sy + 24, { align: "center" });

    doc.setFontSize(10);
    doc.text(owner, 42, sy + 43, { align: "center" });

    if (form.pemilikPasanganNama) {
      doc.text(titleCase(form.pemilikPasanganNama), 91, sy + 43, {
        align: "center",
      });
    }

    doc.text(titleCase(form.pejabatNama), 125, sy + 43, { align: "center" });
  }

  const suffix = isInventory ? "SKM-Persediaan" : "SKM-Pihak-Ketiga";

  doc.save(
    `${suffix}-${(isInventory ? debtor : owner).replace(/[^a-z0-9]+/gi, "-") || "Debitur"}.pdf`,
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  readOnly = false,
  formatOnBlur = true,
  className = "",
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-2 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>

      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => {
          const nextValue = e.target.value;

          onChange(
            formatOnBlur && !readOnly && type === "text"
              ? titleCase(nextValue)
              : nextValue,
          );
        }}
        onBlur={() => {
          if (
            formatOnBlur &&
            !readOnly &&
            type === "text" &&
            String(value || "").trim()
          ) {
            onChange(titleCase(value));
          }
        }}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className={`min-h-12 w-full min-w-0 rounded-xl border border-zinc-200 px-4 py-3 text-[15px] text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
          readOnly ? "cursor-default bg-zinc-50 text-zinc-600" : "bg-white"
        }`}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  className = "",
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-2 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>

      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="min-h-12 w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, children, note }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
      <div className="mb-5 border-b border-zinc-100 pb-3">
        <h3 className="text-base font-semibold tracking-tight text-zinc-900">
          {title}
        </h3>

        {note && (
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{note}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export default function SkmAgunan({ onBack }) {
  const { activeUnit } = useUnit();

  const [category, setCategory] = useState("Semua");
  const [documentSearch, setDocumentSearch] = useState("");

  const [selectedDocument, setSelectedDocument] = useState(
    DOCUMENTS.find((item) => item.id === "skm-agunan"),
  );

  const [selectedPk, setSelectedPk] = useState(null);
  const [showSkmForm, setShowSkmForm] = useState(false);
  const [entryMode, setEntryMode] = useState("choose");

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    unitCode: activeUnit?.value || "JKK1",
  });

  const [pkSearch, setPkSearch] = useState("");
  const [pkRows, setPkRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [units, setUnits] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [generating, setGenerating] = useState(false);

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
    let alive = true;

    async function loadUnits() {
      const { data, error: unitError } = await supabase
        .from("unit")
        .select("id, nama_unit, kode_unit")
        .eq("status", "AKTIF")
        .order("nama_unit");

      if (!alive) return;

      if (unitError) {
        console.error("Gagal memuat unit SKM", unitError);
        return;
      }

      setUnits(data || []);

      const current = data?.find(
        (u) => u.kode_unit === (activeUnit?.value || "JKK1"),
      );

      if (current) {
        setForm((old) => ({
          ...old,
          unitCode: current.kode_unit,
        }));
      }
    }

    loadUnits();

    return () => {
      alive = false;
    };
  }, [activeUnit?.value]);

  useEffect(() => {
    let alive = true;

    async function loadOfficer() {
      const unitId = UNIT_UUID[form.unitCode];

      if (!unitId) {
        setOfficers([]);
        return;
      }

      setLoadingOfficers(true);

      const { data, error: officerError } = await supabase
        .from("pegawai")
        .select("id, nama, jabatan, jenis_pegawai")
        .eq("unit_id", unitId)
        .eq("jenis_pegawai", "PENGAWAS")
        .eq("aktif", true)
        .order("nama");

      if (!alive) return;

      if (officerError) {
        console.error("Gagal memuat pejabat Pengawas:", officerError);
        setOfficers([]);
      } else {
        setOfficers(data || []);

        if (data?.length) {
          setForm((old) => ({
            ...old,
            pejabatNama: data[0].nama,
            pejabatJabatan: data[0].jabatan || "",
          }));
        } else {
          setForm((old) => ({
            ...old,
            pejabatNama: "",
            pejabatJabatan: "",
          }));
        }
      }

      setLoadingOfficers(false);
    }

    loadOfficer();

    return () => {
      alive = false;
    };
  }, [form.unitCode]);

  const visibleDocuments = useMemo(() => {
    const keyword = documentSearch.trim().toLowerCase();

    return DOCUMENTS.filter((item) => {
      return (
        (category === "Semua" || item.category === category) &&
        (!keyword || item.name.toLowerCase().includes(keyword))
      );
    });
  }, [category, documentSearch]);

  const visiblePk = useMemo(() => {
    const keyword = pkSearch.trim().toLowerCase();

    return pkRows.filter((pk) => {
      return (
        (!selectedDocument || isDocumentAvailable(selectedDocument, pk)) &&
        (!keyword ||
          [
            pk.nama_debitur,
            pk.cif,
            pk.nomor_ktp,
            pk.nomor_aplikasi,
            pk.nomor_pk,
          ].some((v) =>
            String(v || "")
              .toLowerCase()
              .includes(keyword),
          ))
      );
    });
  }, [pkRows, pkSearch, selectedDocument]);

  const setValue = (key, value) => {
    setForm((old) => {
      const next = { ...old, [key]: value };

      // Saat alamat pemilik disamakan, salin alamat debitur
      // dan terus sinkronkan setiap kali alamat debitur berubah.
      if (key === "pemilikSamaAlamatDebitur" && value === true) {
        for (const debtorKey of DEBTOR_ADDRESS_KEYS) {
          const ownerKey = debtorKey.replace("debitur", "pemilik");
          next[ownerKey] = old[debtorKey] || "";
        }
      } else if (
        old.pemilikSamaAlamatDebitur &&
        DEBTOR_ADDRESS_KEYS.includes(key)
      ) {
        const ownerKey = key.replace("debitur", "pemilik");
        next[ownerKey] = value;
      }

      return next;
    });
  };

  function chooseDocument(document) {
    setSelectedDocument(document);
    setSelectedPk(null);
    setShowSkmForm(false);
    setPkSearch("");
  }

  function backToCatalog() {
    onBack?.();
  }

  function choosePk(pk) {
    setSelectedPk(pk);

    const firstCollateral = pk.pk_agunan?.[0];

    setForm((old) => ({
      ...old,
      debiturNama: pk.nama_debitur || old.debiturNama,
      debiturNik: pk.nomor_ktp || old.debiturNik,
      nomorPk: pk.nomor_pk || old.nomorPk,
      tanggalPk: pk.tanggal_pk || old.tanggalPk,
      jenisFasilitas: getProduct(pk) || old.jenisFasilitas,
      limitKredit: pk.limit_kredit ? String(pk.limit_kredit) : old.limitKredit,
      pemilikNama: firstCollateral?.nama_pemilik || old.pemilikNama,
      atasNamaDokumen: firstCollateral?.nama_pemilik || old.atasNamaDokumen,
      jenisAgunan: firstCollateral?.objek_agunan || old.jenisAgunan,
    }));

    if (selectedDocument?.id === "skm-agunan") {
      setShowSkmForm(true);
      setEntryMode("manual");
    } else {
      alert(
        `PK ${pk.nama_debitur} dipilih. Formulir ${selectedDocument?.name} belum tersedia pada tahap ini.`,
      );
    }
  }

  function validateSkm() {
    const required = [
      "debiturNama",
      "debiturTglLahir",
      "debiturNik",
      "debiturRt",
      "debiturRw",
      "debiturDesa",
      "debiturKecamatan",
      "debiturKabupaten",

      "pemilikNama",
      "pemilikTglLahir",
      "pemilikNik",
      "pemilikRt",
      "pemilikRw",
      "pemilikDesa",
      "pemilikKecamatan",
      "pemilikKabupaten",

      "nomorPk",
      "tanggalPk",
      "limitKredit",
      "pejabatNama",
      "pejabatJabatan",
    ];

    const missing = required.filter((key) => !String(form[key] || "").trim());

    if (form.jenisDokumen === "LAINNYA" && !form.jenisDokumenLainnya.trim()) {
      missing.push("jenisDokumenLainnya");
    }

    if (form.jenisAgunan === "LAINNYA" && !form.jenisAgunanLainnya.trim()) {
      missing.push("jenisAgunanLainnya");
    }

    if (
      !form.nomorDokumen.trim() ||
      !form.desaAgunan.trim() ||
      !form.atasNamaDokumen.trim() ||
      !form.luasAgunan.trim()
    ) {
      missing.push("data agunan sertifikat");
    }

    if (
      !ageAt(form.debiturTglLahir, form.tanggalDokumen) ||
      !ageAt(form.pemilikTglLahir, form.tanggalDokumen)
    ) {
      missing.push("tanggal lahir tidak valid");
    }

    if (form.debiturPasanganNama.trim() && !form.debiturPasanganNik.trim()) {
      missing.push("NIK pasangan debitur");
    }

    if (numeric(form.limitKredit) <= 0) {
      missing.push("limit pinjaman");
    }

    if (form.pemilikPasanganNama.trim() && !form.pemilikPasanganNik.trim()) {
      missing.push("NIK pasangan pemilik agunan");
    }

    return [...new Set(missing)];
  }

  function generateBothPdfs(event) {
    event.preventDefault();

    const missing = validateSkm();

    if (missing.length) {
      alert(
        `Lengkapi data wajib terlebih dahulu. Periksa: ${missing.join(", ")}`,
      );
      return;
    }

    setGenerating(true);

    try {
      createSkmPdf({ form, kind: "pihak-ketiga" });
      createSkmPdf({ form, kind: "persediaan" });
    } catch (err) {
      console.error(err);
      alert("PDF gagal dibuat. Silakan periksa kembali data dan coba lagi.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-0 pb-24 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <FolderOpen size={16} />
            <span>Administrasi</span>
            <ChevronRight size={14} />
            <button
              type="button"
              onClick={backToCatalog}
              className="text-zinc-600 hover:text-zinc-900"
            >
              Assesoir PK
            </button>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
            SKM Agunan
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={backToCatalog}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft size={17} />
          Kembali ke menu
        </button>

        {entryMode !== "choose" && (
          <button
            type="button"
            onClick={() => {
              setEntryMode("choose");
              setSelectedPk(null);
              setShowSkmForm(false);
            }}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Ganti metode input
          </button>
        )}
      </div>

      {entryMode === "choose" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setSelectedPk(null);
              setShowSkmForm(true);
              setEntryMode("manual");

              setForm((old) => ({
                ...EMPTY_FORM,
                unitCode: activeUnit?.value || old.unitCode || "JKK1",
              }));
            }}
            className="min-h-36 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          >
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-zinc-100">
              <FileText size={21} />
            </div>

            <div className="font-semibold text-zinc-900">Input Manual</div>

            <p className="mt-1 text-sm text-zinc-500">
              Isi data debitur, pinjaman, dan agunan secara manual.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setEntryMode("database");
              loadPk();
            }}
            className="min-h-36 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          >
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-zinc-100">
              <Building2 size={21} />
            </div>

            <div className="font-semibold text-zinc-900">
              Pilih dari Database PK
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              Ambil data PK yang sudah tersimpan di database.
            </p>
          </button>
        </div>
      ) : null}

      {entryMode === "database" ? (
        <>
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
                  placeholder="Cari nama debitur, CIF, NIK, nomor aplikasi, atau nomor PK..."
                  className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-[15px] outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <button
                type="button"
                onClick={loadPk}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm"
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
            <h3 className="font-semibold text-zinc-900">Pilih Data PK</h3>

            <span className="text-sm text-zinc-500">
              {loading ? "Memuat..." : `${visiblePk.length} data`}
            </span>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-white p-10 text-center text-sm text-zinc-500">
              Memuat Database PK...
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {visiblePk.map((pk) => (
                <div
                  key={pk.id}
                  className="flex flex-col gap-3 border-b border-zinc-100 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-zinc-900">
                        {pk.nama_debitur}
                      </span>

                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">
                        {getProduct(pk)}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-zinc-500">
                      CIF: {pk.cif || "-"} · PK: {pk.nomor_pk || "-"} ·{" "}
                      {formatTanggal(pk.tanggal_pk)}
                    </div>

                    <div className="mt-1 text-sm text-zinc-600">
                      {formatRupiah(pk.limit_kredit)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => choosePk(pk)}
                    className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    Pilih PK
                  </button>
                </div>
              ))}

              {!visiblePk.length && (
                <div className="p-8 text-center text-sm text-zinc-500">
                  Tidak ada data PK yang sesuai.
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      {entryMode === "manual" && showSkmForm ? (
        <form onSubmit={generateBothPdfs} className="space-y-5">
          {selectedPk && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-4">
              <div>
                <div className="text-xs text-zinc-500">Data PK terpilih</div>

                <div className="font-semibold text-zinc-900">
                  {selectedPk.nama_debitur} ·{" "}
                  {selectedPk.nomor_pk || "Tanpa nomor PK"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPk(null);
                  setEntryMode("database");
                  setShowSkmForm(false);
                }}
                className="text-sm text-zinc-600"
              >
                Ganti PK
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-relaxed text-blue-950 sm:p-5">
            <div className="font-semibold">
              Dua dokumen dalam satu pengisian
            </div>

            <p className="mt-1 text-blue-900/80">
              Setelah data lengkap, sistem membuat SKM Pihak Ketiga dan SKM
              Persediaan sebagai dua file PDF terpisah. Data formulir tidak
              disimpan ke database.
            </p>
          </div>

          <Section title="Tanggal Dokumen dan Unit Kerja">
            <Field
              label="Tanggal dokumen"
              type="date"
              value={form.tanggalDokumen}
              onChange={(v) => setValue("tanggalDokumen", v)}
              required
            />

            <SelectField
              label="Unit kerja"
              value={form.unitCode}
              onChange={(v) => setValue("unitCode", v)}
              options={units.map((u) => ({
                value: u.kode_unit,
                label: u.nama_unit,
              }))}
              required
            />

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-zinc-600">
                Pejabat/Pengawas penandatangan
              </span>

              <select
                value={form.pejabatNama}
                onChange={(e) => {
                  const p = officers.find((x) => x.nama === e.target.value);

                  setForm((old) => ({
                    ...old,
                    pejabatNama: p?.nama || "",
                    pejabatJabatan: p?.jabatan || "",
                  }));
                }}
                required
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm"
              >
                {loadingOfficers ? (
                  <option value="">Memuat pejabat...</option>
                ) : officers.length ? (
                  officers.map((p) => (
                    <option key={p.id} value={p.nama}>
                      {p.nama} — {p.jabatan}
                    </option>
                  ))
                ) : (
                  <option value="">Pengawas aktif tidak ditemukan</option>
                )}
              </select>
            </label>

            <div className="text-xs text-zinc-500 sm:col-span-2">
              Nama dan jabatan diambil dari data pegawai aktif dengan jenis
              PENGAWAS pada unit yang dipilih.
            </div>
          </Section>

          <Section title="Data Debitur">
            <Field
              label="Nama debitur"
              value={form.debiturNama}
              onChange={(v) => setValue("debiturNama", v)}
              required
            />

            <SelectField
              label="Jenis kelamin"
              value={form.debiturGender}
              onChange={(v) => setValue("debiturGender", v)}
              options={[
                { value: "L", label: "Laki-laki (Tuan)" },
                { value: "P", label: "Perempuan (Nyonya)" },
              ]}
            />

            <Field
              label="Tanggal lahir (umur otomatis)"
              type="date"
              value={form.debiturTglLahir}
              onChange={(v) => setValue("debiturTglLahir", v)}
              required
            />

            <Field
              label="Umur saat tanggal dokumen"
              value={
                ageAt(form.debiturTglLahir, form.tanggalDokumen)
                  ? `${ageAt(form.debiturTglLahir, form.tanggalDokumen)} tahun`
                  : "-"
              }
              onChange={() => {}}
              readOnly
            />

            <Field
              label="NIK debitur"
              value={form.debiturNik}
              onChange={(v) => setValue("debiturNik", v)}
              formatOnBlur={false}
              required
            />

            <Field
              label="Jalan (opsional)"
              value={form.debiturJalan}
              onChange={(v) => setValue("debiturJalan", v)}
            />

            <Field
              label="RT"
              value={form.debiturRt}
              onChange={(v) => setValue("debiturRt", v)}
              required
            />

            <Field
              label="RW"
              value={form.debiturRw}
              onChange={(v) => setValue("debiturRw", v)}
              required
            />

            <Field
              label="Desa"
              value={form.debiturDesa}
              onChange={(v) => setValue("debiturDesa", v)}
              required
            />

            <Field
              label="Kecamatan"
              value={form.debiturKecamatan}
              onChange={(v) => setValue("debiturKecamatan", v)}
              required
            />

            <Field
              label="Kabupaten"
              value={form.debiturKabupaten}
              onChange={(v) => setValue("debiturKabupaten", v)}
              required
            />
          </Section>

          <Section
            title="Data Pasangan Debitur"
            note="Opsional. Jika diisi, pasangan dicantumkan sebagai pihak yang menyetujui dan ikut menandatangani SKM Persediaan."
          >
            <Field
              label="Nama pasangan"
              value={form.debiturPasanganNama}
              onChange={(v) => setValue("debiturPasanganNama", v)}
            />

            <SelectField
              label="Jenis kelamin pasangan"
              value={form.debiturPasanganGender}
              onChange={(v) => setValue("debiturPasanganGender", v)}
              options={[
                { value: "L", label: "Laki-laki (Tuan)" },
                { value: "P", label: "Perempuan (Nyonya)" },
              ]}
            />

            <Field
              label="NIK pasangan"
              value={form.debiturPasanganNik}
              onChange={(v) => setValue("debiturPasanganNik", v)}
              formatOnBlur={false}
            />
          </Section>

          <Section
            title="Data Pemilik Agunan"
            note="Centang jika alamat pemilik agunan sama dengan alamat debitur. Alamat akan mengikuti data debitur secara otomatis."
          >
            <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-950 sm:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(form.pemilikSamaAlamatDebitur)}
                onChange={(e) =>
                  setValue("pemilikSamaAlamatDebitur", e.target.checked)
                }
                className="mt-0.5 size-4 shrink-0 rounded border-zinc-300"
              />

              <span>
                <span className="block font-semibold">
                  Samakan alamat pemilik agunan dengan alamat debitur
                </span>

                <span className="mt-0.5 block text-xs text-blue-900/75">
                  Jalan, RT/RW, desa, kecamatan, dan kabupaten akan disalin dan
                  tetap tersinkron.
                </span>
              </span>
            </label>

            <Field
              label="Nama pemilik agunan"
              value={form.pemilikNama}
              onChange={(v) => setValue("pemilikNama", v)}
              required
            />

            <SelectField
              label="Jenis kelamin"
              value={form.pemilikGender}
              onChange={(v) => setValue("pemilikGender", v)}
              options={[
                { value: "L", label: "Laki-laki (Tuan)" },
                { value: "P", label: "Perempuan (Nyonya)" },
              ]}
            />

            <Field
              label="Tanggal lahir (umur otomatis)"
              type="date"
              value={form.pemilikTglLahir}
              onChange={(v) => setValue("pemilikTglLahir", v)}
              required
            />

            <Field
              label="Umur saat tanggal dokumen"
              value={
                ageAt(form.pemilikTglLahir, form.tanggalDokumen)
                  ? `${ageAt(form.pemilikTglLahir, form.tanggalDokumen)} tahun`
                  : "-"
              }
              onChange={() => {}}
              readOnly
            />

            <Field
              label="NIK pemilik agunan"
              value={form.pemilikNik}
              onChange={(v) => setValue("pemilikNik", v)}
              formatOnBlur={false}
              required
            />

            <Field
              label="Jalan (opsional)"
              value={form.pemilikJalan}
              onChange={(v) => setValue("pemilikJalan", v)}
              readOnly={form.pemilikSamaAlamatDebitur}
            />

            <Field
              label="RT"
              value={form.pemilikRt}
              onChange={(v) => setValue("pemilikRt", v)}
              required
              readOnly={form.pemilikSamaAlamatDebitur}
            />

            <Field
              label="RW"
              value={form.pemilikRw}
              onChange={(v) => setValue("pemilikRw", v)}
              required
              readOnly={form.pemilikSamaAlamatDebitur}
            />

            <Field
              label="Desa"
              value={form.pemilikDesa}
              onChange={(v) => setValue("pemilikDesa", v)}
              required
              readOnly={form.pemilikSamaAlamatDebitur}
            />

            <Field
              label="Kecamatan"
              value={form.pemilikKecamatan}
              onChange={(v) => setValue("pemilikKecamatan", v)}
              required
              readOnly={form.pemilikSamaAlamatDebitur}
            />

            <Field
              label="Kabupaten"
              value={form.pemilikKabupaten}
              onChange={(v) => setValue("pemilikKabupaten", v)}
              required
              readOnly={form.pemilikSamaAlamatDebitur}
            />
          </Section>

          <Section
            title="Data Pasangan Pemilik Agunan"
            note="Opsional. Jika diisi, pasangan menjadi pihak yang menyetujui dan ikut menandatangani SKM Pihak Ketiga."
          >
            <Field
              label="Nama pasangan"
              value={form.pemilikPasanganNama}
              onChange={(v) => setValue("pemilikPasanganNama", v)}
            />

            <SelectField
              label="Jenis kelamin pasangan"
              value={form.pemilikPasanganGender}
              onChange={(v) => setValue("pemilikPasanganGender", v)}
              options={[
                { value: "L", label: "Laki-laki (Tuan)" },
                { value: "P", label: "Perempuan (Nyonya)" },
              ]}
            />

            <Field
              label="NIK pasangan"
              value={form.pemilikPasanganNik}
              onChange={(v) => setValue("pemilikPasanganNik", v)}
              formatOnBlur={false}
            />
          </Section>

          <Section title="Data Pinjaman">
            <Field
              label="Nomor PK"
              value={form.nomorPk}
              onChange={(v) => setValue("nomorPk", v)}
              formatOnBlur={false}
              required
            />

            <Field
              label="Tanggal PK"
              type="date"
              value={form.tanggalPk}
              onChange={(v) => setValue("tanggalPk", v)}
              required
            />

            <SelectField
              label="Jenis fasilitas"
              value={form.jenisFasilitas}
              onChange={(v) => setValue("jenisFasilitas", v)}
              options={["KUR", "KUM", "KPP", "KSM"].map((v) => ({
                value: v,
                label: v,
              }))}
            />

            <Field
              label="Limit pinjaman (Rp)"
              value={form.limitKredit ? formatNumber(form.limitKredit) : ""}
              onChange={(v) =>
                setValue("limitKredit", v.replace(/[^0-9]/g, ""))
              }
            />
          </Section>

          <Section title="Data Agunan Sertifikat">
            <SelectField
              label="Jenis dokumen"
              value={form.jenisDokumen}
              onChange={(v) => setValue("jenisDokumen", v)}
              options={[
                { value: "SHM", label: "SHM" },
                { value: "SHGB", label: "SHGB" },
                { value: "SHM NIB", label: "SHM NIB" },
                { value: "LAINNYA", label: "Lainnya (isi manual)" },
              ]}
            />

            {form.jenisDokumen === "LAINNYA" && (
              <Field
                label="Jenis dokumen lainnya"
                value={form.jenisDokumenLainnya}
                onChange={(v) => setValue("jenisDokumenLainnya", v)}
                required
              />
            )}

            <Field
              label={`Nomor ${docType(form) || "dokumen"}`}
              value={form.nomorDokumen}
              onChange={(v) => setValue("nomorDokumen", v)}
              formatOnBlur={false}
              required
            />

            <SelectField
              label="Jenis agunan"
              value={form.jenisAgunan}
              onChange={(v) => setValue("jenisAgunan", v)}
              options={[
                {
                  value: "Tanah dan Bangunan Rumah",
                  label: "Tanah dan Bangunan Rumah",
                },
                {
                  value: "Tanah dan Bangunan",
                  label: "Tanah dan Bangunan",
                },
                {
                  value: "Tanah Perkebunan",
                  label: "Tanah Perkebunan",
                },
                {
                  value: "LAINNYA",
                  label: "Lainnya (isi manual)",
                },
              ]}
            />

            {form.jenisAgunan === "LAINNYA" && (
              <Field
                label="Jenis agunan lainnya"
                value={form.jenisAgunanLainnya}
                onChange={(v) => setValue("jenisAgunanLainnya", v)}
                required
              />
            )}

            <Field
              label="Desa lokasi agunan"
              value={form.desaAgunan}
              onChange={(v) => setValue("desaAgunan", v)}
              required
            />

            <Field
              label="Atas nama dokumen/sertifikat"
              value={form.atasNamaDokumen}
              onChange={(v) => setValue("atasNamaDokumen", v)}
              required
            />

            <Field
              label="Luas agunan (m²)"
              value={form.luasAgunan ? formatNumber(form.luasAgunan) : ""}
              onChange={(v) => setValue("luasAgunan", v.replace(/[^0-9]/g, ""))}
              placeholder="Contoh: 20.000"
              required
            />
          </Section>

          <Section
            title="Data Agunan Persediaan"
            note="Nilai persediaan otomatis mengikuti limit pinjaman. Tidak diperlukan input lokasi penyimpanan."
          >
            <Field
              label="Nilai persediaan (otomatis dari limit pinjaman)"
              value={
                form.limitKredit ? formatRupiah(numeric(form.limitKredit)) : "-"
              }
              onChange={() => {}}
              readOnly
            />
          </Section>

          <div className="sticky bottom-2 z-10 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:static sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <div className="font-semibold text-zinc-900">
                Buat dua dokumen PDF
              </div>

              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                SKM Pihak Ketiga dan SKM Persediaan akan diunduh sebagai dua
                file terpisah.
              </p>
            </div>

            <button
              type="submit"
              disabled={generating || loadingOfficers || !officers.length}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <FileDown size={17} />
              {generating ? "Membuat PDF..." : "Generate 2 PDF"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
