"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  FileDown,
  Copy,
  Check,
  UserRound,
  CalendarDays,
  Wallet,
  ArrowLeft,
  Building2,
  AlertCircle,
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
const EMPTY = {
  unitCode: "JKK1",
  nomorAplikasi: "",
  nama: "",
  nik: "",
  tempatLahir: "",
  tanggalLahir: "",
  jenisKelamin: "L",
  jenisKredit: "KUR",
  jalan: "",
  rt: "",
  rw: "",
  desa: "",
  kecamatan: "",
  kabupaten: "",
  provinsi: "Jambi",
  namaKantor: "",
  alamatKantor: "",
  telepon: "",
  handphone: "",
  email: "",
  profesi: "PNS/BUMN",
  profesiLainnya: "",
  jabatan: "",
  jabatanLainnya: "",
  tenorBulan: "60",
  tanggalMulai: todayLocal(),
  limitKredit: "",
  petugasId: "",
  petugasNama: "",
  kesehatan1: "",
  kesehatan2: "",
  kesehatan3: "",
};
const HEALTH_QUESTIONS = [
  "Apakah Anda pernah merasakan gejala apa pun, terdiagnosis, menjalani pemeriksaan, dan/atau berniat menjalani pemeriksaan gangguan jantung, paru-paru, peredaran darah, tekanan darah tinggi, stroke, diabetes, ginjal, liver, kelainan saraf, infeksi HIV atau AIDS, hepatitis B atau C, kanker, melanoma, tumor, atau pertumbuhan jaringan abnormal?",
  "Dalam 5 tahun terakhir, apakah Anda pernah mendapat pengobatan atau perawatan atau dioperasi atau dirawat inap di rumah sakit selama lebih dari 7 (tujuh) hari berturut-turut?",
  "Dalam 5 tahun terakhir, apakah Anda pernah mendapatkan hasil tes kesehatan yang tidak normal, atau Anda sedang menunggu hasil pemeriksaan tersebut? Tes kesehatan misalnya tes darah, tes urine, USG, biopsi, dll.",
];
const titleCase = (v) =>
  String(v || "")
    .toLocaleLowerCase("id-ID")
    .replace(
      /(^|[\s'-])([a-zà-ÿ])/g,
      (_, p, c) => p + c.toLocaleUpperCase("id-ID"),
    );
const digits = (v) => Number(String(v ?? "").replace(/[^0-9]/g, "")) || 0;
const rupiah = (v) => digits(v).toLocaleString("id-ID");
const dateObj = (v) => (v ? new Date(`${v}T00:00:00`) : null);
const ageAt = (dob, at = todayLocal()) => {
  const b = dateObj(dob),
    d = dateObj(at);
  if (
    !b ||
    !d ||
    Number.isNaN(b.getTime()) ||
    Number.isNaN(d.getTime()) ||
    b > d
  )
    return "";
  let age = d.getFullYear() - b.getFullYear();
  if (
    d.getMonth() < b.getMonth() ||
    (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())
  )
    age--;
  return age;
};
const dateDMY = (v) => {
  if (!v) return "";
  const d = dateObj(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const dateLong = (v) =>
  v
    ? dateObj(v).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";
const addMonths = (value, months) => {
  if (!value || !months) return "";
  const d = dateObj(value);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + Number(months));
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const unitName = (code) =>
  code === "JKK2" ? "JAMBI KUAMANG KUNING 2" : "JAMBI KUAMANG KUNING 1";
const branchCode = (code) => (code === "JKK2" ? "11081B" : "11081A");
const addressText = (f) => {
  const parts = [];
  if (f.jalan.trim())
    parts.push(
      /^jalan\b/i.test(f.jalan.trim())
        ? titleCase(f.jalan.trim())
        : `Jalan ${titleCase(f.jalan.trim())}`,
    );
  if (f.rt || f.rw) parts.push(`RT ${f.rt || "-"}/RW ${f.rw || "-"}`);
  if (f.desa) parts.push(`Desa ${titleCase(f.desa)}`);
  if (f.kecamatan) parts.push(`Kecamatan ${titleCase(f.kecamatan)}`);
  if (f.kabupaten) parts.push(`Kabupaten ${titleCase(f.kabupaten)}`);
  if (f.provinsi) parts.push(`Provinsi ${titleCase(f.provinsi)}`);
  return parts.join(", ");
};
const tenorText = (months) => {
  const n = Number(months || 0);
  if (!n) return "";
  const years = Math.floor(n / 12),
    rem = n % 12;
  return years && rem
    ? `${years} Tahun ${rem} Bulan`
    : years
      ? `${years} Tahun`
      : `${rem} Bulan`;
};
const routeStatus = (f) => {
  const age = ageAt(f.tanggalLahir, f.tanggalMulai);
  const limit = digits(f.limitKredit);
  if (age !== "" && age > 50) return "AMFS";
  if (
    age !== "" &&
    age <= 50 &&
    String(f.jenisKredit || "KUR").toUpperCase() === "KUR" &&
    String(f.limitKredit ?? "").trim() !== "" &&
    limit <= 300000000
  )
    return "MAGI";
  return "OTHER";
};
const eligible = (f) => routeStatus(f) === "MAGI";

function makeWhatsAppText(f) {
  const age = ageAt(f.tanggalLahir, f.tanggalMulai);
  const end = addMonths(f.tanggalMulai, f.tenorBulan);
  return [
    "ORDER ASURANSI JIWA",
    "",
    `MMU : ${unitName(f.unitCode)}`,
    "",
    `NAMA : ${titleCase(f.nama)}`,
    `NO APLIKASI : ${String(f.nomorAplikasi || "").toUpperCase()}`,
    "",
    `ALAMAT : ${addressText(f)}`,
    "",
    `NO KTP : ${f.nik}`,
    "",
    `TEMPAT LAHIR : ${titleCase(f.tempatLahir)}`,
    `TGL LAHIR : ${dateDMY(f.tanggalLahir)}`,
    "",
    `USIA : ${age} Tahun`,
    "",
    `JENIS KELAMIN : ${f.jenisKelamin === "P" ? "PEREMPUAN" : "LAKI-LAKI"}`,
    "",
    `PERIODE : ${dateDMY(f.tanggalMulai)} - ${dateDMY(end)}`,
    "",
    `TENOR : ${tenorText(f.tenorBulan)}`,
    "",
    `NILAI PERTANGGUNGAN : ${rupiah(f.limitKredit)}`,
  ].join("\n");
}

function drawMagiPdf(f) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const W = 210,
    L = 5,
    R = 5,
    inner = W - L - R;
  const blue = [180, 197, 231];
  let y = 9;
  const font = (size = 7.5, style = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
  };
  const txt = (value, x, yy, size = 7.5, style = "normal", opts = {}) => {
    font(size, style);
    doc.text(String(value ?? ""), x, yy, opts);
  };
  const rule = (x1, yy, x2, width = 0.18) => {
    doc.setLineWidth(width);
    doc.setDrawColor(40, 40, 40);
    doc.line(x1, yy, x2, yy);
  };
  const wrap = (
    value,
    x,
    yy,
    maxW,
    size = 7.2,
    lineH = 3.2,
    style = "normal",
  ) => {
    font(size, style);
    const lines = doc.splitTextToSize(String(value || ""), maxW);
    lines.forEach((t, i) => doc.text(t, x, yy + i * lineH));
    return yy + lines.length * lineH;
  };
  const checkbox = (x, yy, checked = false, w = 3, h = 3) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.rect(x, yy - h + 0.5, w, h);
    if (checked) {
      // Tanda centang berbentuk huruf V yang tegas, bukan simbol font.
      doc.setLineWidth(0.65);
      doc.line(x + 0.55, yy - 1.35, x + 1.25, yy - 0.55);
      doc.line(x + 1.25, yy - 0.55, x + w - 0.35, yy - h + 0.25);
    }
  };
  const section = (label) => {
    doc.setFillColor(...blue);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(L, y - 3.2, inner, 6.3, "FD");
    txt(label, L + 2, y + 0.8, 8.1, "bold");
    y += 7.3;
  };
  const field = (label, value, opts = {}) => {
    const { labelX = 7, valueX = 56, maxW = 145, size = 7.2, gap = 4.2 } = opts;
    txt(label, labelX, y, size);
    txt(":", valueX - 3, y, size);
    const end = wrap(value || "", valueX, y, maxW, size, 3.1);
    y = Math.max(y + gap, end + 1.1);
  };
  // Bingkai halaman dan kepala formulir mengikuti bentuk asli MAGI.docx.
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(4, 4, 202, 236);
  txt("CABANG KOTA :", 7, y, 7.5, "bold");
  rule(27, y + 0.7, 64, 0.25);
  txt(unitName(f.unitCode), 28, y, 7.3, "bold");
  y += 5;
  txt("KODE CABANG :", 7, y, 7.5, "bold");
  rule(27, y + 0.7, 64, 0.25);
  txt(branchCode(f.unitCode), 28, y, 7.3, "bold");
  txt(
    `NO APLIKASI : ${String(f.nomorAplikasi || "").toUpperCase()}`,
    158,
    y,
    7.1,
    "bold",
    { align: "left" },
  );
  y += 7;
  txt("SURAT PERMINTAAN DAN PERNYATAAN KESEHATAN", 7, y, 11, "bold");
  y += 4.2;
  txt("ASURANSI KUMPULAN KEMATIAN BERJANGKA", 7, y, 8.2, "bold");
  y += 5.8;

  section("I. DATA PRIBADI (Lampirkan Fotokopi KTP / Paspor)");
  field("1. Nama Lengkap (sesuai kartu identitas)", titleCase(f.nama), {
    maxW: 145,
  });
  txt("2. No. KTP / Paspor", 7, y);
  txt(":", 53, y);
  txt(f.nik, 56, y);
  txt("Jenis Kelamin", 142, y);
  checkbox(169, y + 1, f.jenisKelamin === "L", 3, 3);
  txt("L", 173, y);
  checkbox(181, y + 1, f.jenisKelamin === "P", 3, 3);
  txt("P", 185, y);
  y += 5;
  txt("3. Tempat/Tgl lahir", 7, y);
  txt(":", 53, y);
  txt(`${titleCase(f.tempatLahir)}, ${dateDMY(f.tanggalLahir)}`, 56, y);
  txt("Usia", 158, y);
  txt(":", 181, y);
  txt(`${ageAt(f.tanggalLahir, f.tanggalMulai)} tahun`, 184, y);
  y += 5;
  field("4. Alamat Rumah", addressText(f), { maxW: 145, gap: 5 });
  field(
    "5. Nama / Alamat Kantor",
    [titleCase(f.namaKantor), titleCase(f.alamatKantor)]
      .filter(Boolean)
      .join(" / "),
    { maxW: 145 },
  );
  // Baris 6 dipertahankan persis mengikuti posisi dua kolom pada template MAGI.docx.
  // Kolom kiri: No. Telp. Kolom kanan: No. handphone dan Alamat email.
  txt("6. No. Telp", 7, y);
  txt(":", 53, y);
  if (f.telepon) txt(f.telepon, 56, y, 7);
  else rule(55, y + 1.2, 95.5, 0.18);
  txt("No. handphone", 96, y, 7);
  if (f.handphone) txt(f.handphone, 124, y, 7);
  else rule(106, y + 1.2, 147, 0.18);
  txt("Alamat email :", 147, y, 7);
  if (f.email) txt(f.email, 169, y, 6.5);
  y += 5;
  txt("7. Jenis Profesi", 7, y);
  txt(":", 53, y);
  const professions = [
    "PNS/BUMN",
    "Swasta/Wiraswasta",
    "Lainnya",
    "TNI/Polri",
    "Profesional",
  ];
  const pos = [
    [58, y],
    [99, y],
    [153, y],
    [58, y + 5],
    [99, y + 5],
  ];
  professions.forEach((p, i) => {
    checkbox(pos[i][0], pos[i][1], f.profesi === p, 3, 3);
    txt(
      `${p}${p === "Lainnya" && f.profesi === p ? `: ${titleCase(f.profesiLainnya)}` : ""}`,
      pos[i][0] + 4,
      pos[i][1],
      6.8,
    );
  });
  y += 11;
  field(
    "8. Jabatan",
    titleCase(f.jabatan === "Lainnya" ? f.jabatanLainnya : f.jabatan),
    { maxW: 145 },
  );

  section("II. DATA PERTANGGUNGAN");
  field("1. Jenis Kredit", String(f.jenisKredit || "KUR").toUpperCase(), {
    maxW: 60,
  });
  txt("2. Jangka Waktu", 7, y);
  txt(":", 53, y);
  txt(tenorText(f.tenorBulan), 56, y);
  txt("Jumlah Kredit Awal : Rp.", 131, y, 7.1);
  txt(rupiah(f.limitKredit), 169, y, 7.1, "bold");
  y += 5;
  field("3. Tanggal Mulai Pertanggungan", dateDMY(f.tanggalMulai), {
    maxW: 65,
  });
  field(
    "4. Uang Pertanggungan",
    "Sesuai dengan nilai Sisa Pinjaman Pokok pada saat Tertanggung mengalami risiko meninggal dunia.",
    { maxW: 145, gap: 5 },
  );

  section("III. PERTANYAAN KESEHATAN (Wajib diisi oleh Tertanggung)");
  txt("Ya", 153, y, 7.2, "bold");
  txt("Tidak", 184, y, 7.2, "bold");
  y += 4;
  HEALTH_QUESTIONS.forEach((q, i) => {
    const end = wrap(`${i + 1}. ${q}`, 11, y, 130, 6.8, 3.0);
    checkbox(154, y + 2, f[`kesehatan${i + 1}`] === "YA", 11, 6);
    checkbox(184, y + 2, f[`kesehatan${i + 1}`] === "TIDAK", 11, 6);
    y = Math.max(end + 1.3, y + 8.5);
  });
  y += 1;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(8, y - 2.2, 130, 10);
  wrap(
    "Asuransi hanya akan memproses jika semua jawaban dari pernyataan kesehatan jawabannya adalah “TIDAK”",
    10,
    y + 1.2,
    126,
    6.8,
    3.0,
    "bold",
  );
  y += 12;

  section("IV. PERNYATAAN");
  y =
    wrap(
      "Saya telah membaca, mengerti, menjawab dan mengisi pertanyaan-pertanyaan tersebut di atas dengan sebenar-benarnya, lengkap dan sesuai dengan keadaan yang sebenarnya. Saya mengetahui bahwa jika terdapat sesuatu hal yang tidak sesuai dengan keadaan yang sebenarnya, maka PT AXA Insurance Indonesia berhak membatalkan pertanggungan atau menolak membayar uang pertanggungan.",
      7,
      y,
      194,
      6.5,
      2.8,
    ) + 4;
  txt(
    `Ditandatangani di Kuamang Kuning, ${dateLong(todayLocal())}`,
    110,
    y,
    6.8,
  );
  y += 7;
  txt("Petugas/Pegawai", 25, y, 7.1);
  txt("Calon Tertanggung", 151, y, 7.1);
  y += 24;
  txt(titleCase(f.petugasNama), 25, y, 7.1, "bold");
  txt(titleCase(f.nama), 151, y, 7.1, "bold");
  txt(
    "Catatan: Setiap koreksi penulisan atau pengisian wajib ditandatangani",
    7,
    235,
    6.2,
  );
  return doc;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  readOnly = false,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">
        {label}
        {required && <b className="text-red-500"> *</b>}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500 ${readOnly ? "bg-zinc-50 text-zinc-500" : "bg-white"}`}
      />
    </label>
  );
}
function Select({ label, value, onChange, options, required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">
        {label}
        {required && <b className="text-red-500"> *</b>}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
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
function Panel({ title, children, note }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-zinc-900">{title}</h3>
        {note && <p className="mt-1 text-xs text-zinc-500">{note}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function OrderMagi() {
  const { activeUnit } = useUnit();
  const [mode, setMode] = useState("manual");
  const [form, setForm] = useState({
    ...EMPTY,
    unitCode: activeUnit?.value || "JKK1",
  });
  const [pkRows, setPkRows] = useState([]);
  const [pkSearch, setPkSearch] = useState("");
  const [loadingPk, setLoadingPk] = useState(false);
  const [selectedPkId, setSelectedPkId] = useState("");
  const [officers, setOfficers] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  const unitId = UNIT_UUID[form.unitCode];
  const age = ageAt(form.tanggalLahir, form.tanggalMulai);
  const endDate = addMonths(form.tanggalMulai, form.tenorBulan);
  const isEligible = eligible(form);
  const whatsappText = useMemo(() => makeWhatsAppText(form), [form]);
  const visiblePk = useMemo(() => {
    const q = pkSearch.trim().toLowerCase();
    return pkRows.filter((pk) =>
      [
        pk.nama_debitur,
        pk.cif,
        pk.nomor_ktp,
        pk.nomor_aplikasi,
        pk.nomor_pk,
      ].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [pkRows, pkSearch]);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  const loadPk = useCallback(async () => {
    if (!unitId) {
      setError("Unit belum terhubung dengan UUID database.");
      return;
    }
    setLoadingPk(true);
    setError("");
    try {
      const { data, error: queryError } = await supabase
        .from("pk")
        .select("*, pk_agunan (*)")
        .eq("unit_id", unitId)
        .order("tanggal_pk", { ascending: false })
        .limit(200);
      if (queryError) throw queryError;
      setPkRows(data || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "Database PK gagal dimuat.");
    } finally {
      setLoadingPk(false);
    }
  }, [unitId]);

  useEffect(() => {
    loadPk();
  }, [loadPk]);
  useEffect(() => {
    let alive = true;
    async function loadStaff() {
      if (!unitId) {
        setOfficers([]);
        return;
      }
      const { data, error: e } = await supabase
        .from("pegawai")
        .select("id, nama, jabatan, jenis_pegawai")
        .eq("unit_id", unitId)
        .eq("jenis_pegawai", "MKS")
        .eq("aktif", true)
        .order("nama");
      if (!alive) return;
      if (e) {
        console.error("Gagal memuat pegawai unit", e);
        setOfficers([]);
        return;
      }
      setOfficers(data || []);
    }
    loadStaff();
    return () => {
      alive = false;
    };
  }, [unitId]);

  function selectPk(pk) {
    setSelectedPkId(pk.id);
    const profile = pk.data_debitur || pk.debitur || {};
    const addr = pk.alamat_debitur || profile.alamat || {};
    const dob = pk.tanggal_lahir || pk.tgl_lahir || profile.tanggal_lahir || "";
    const appNo = String(pk.nomor_aplikasi || "").toUpperCase();
    setForm((old) => ({
      ...old,
      unitCode: activeUnit?.value || old.unitCode,
      nomorAplikasi: appNo,
      nama: titleCase(pk.nama_debitur || profile.nama || old.nama),
      nik: pk.nomor_ktp || pk.nik || profile.nik || old.nik,
      tempatLahir: pk.tempat_lahir || profile.tempat_lahir || old.tempatLahir,
      tanggalLahir: dob,
      jenisKelamin: String(
        pk.jenis_kelamin || profile.jenis_kelamin || old.jenisKelamin,
      )
        .toUpperCase()
        .startsWith("P")
        ? "P"
        : "L",
      jenisKredit: String(
        pk.jenis_pengajuan_kredit || old.jenisKredit || "KUR",
      ).toUpperCase(),
      jalan: pk.alamat_jalan || addr.jalan || old.jalan,
      rt: pk.rt || addr.rt || old.rt,
      rw: pk.rw || addr.rw || old.rw,
      desa: pk.desa || addr.desa || old.desa,
      kecamatan: pk.kecamatan || addr.kecamatan || old.kecamatan,
      kabupaten: pk.kabupaten || addr.kabupaten || old.kabupaten,
      provinsi: pk.provinsi || addr.provinsi || old.provinsi,
      namaKantor: pk.nama_kantor || old.namaKantor,
      alamatKantor: pk.alamat_kantor || old.alamatKantor,
      telepon: pk.no_telepon || pk.telepon || old.telepon,
      handphone: pk.no_hp || pk.nomor_hp || old.handphone,
      email: pk.email || old.email,
      jabatan: pk.jabatan || pk.pekerjaan || pk.profesi || old.jabatan,
      tenorBulan: String(
        pk.jangka_waktu_bulan ||
          pk.tenor_bulan ||
          pk.jangka_waktu ||
          old.tenorBulan,
      ),
      tanggalMulai: pk.tanggal_pk || old.tanggalMulai,
      limitKredit: String(pk.limit_kredit || old.limitKredit),
    }));
    setSuccess(
      `Data PK ${pk.nama_debitur || "debitur"} berhasil dimuat. Periksa kembali data yang belum tersedia.`,
    );
  }

  function validate() {
    const required = [
      "nomorAplikasi",
      "nama",
      "nik",
      "tempatLahir",
      "tanggalLahir",
      "jalan",
      "desa",
      "kecamatan",
      "kabupaten",
      "provinsi",
      "jabatan",
      "tenorBulan",
      "tanggalMulai",
      "limitKredit",
      "petugasNama",
    ];
    const missing = required.filter((k) => !String(form[k] || "").trim());
    [1, 2, 3].forEach((i) => {
      if (!form[`kesehatan${i}`]) missing.push(`jawaban kesehatan ${i}`);
    });
    if (age === "") missing.push("tanggal lahir valid");
    if (Number(form.tenorBulan) <= 0) missing.push("jangka waktu");
    return missing;
  }

  function generatePdf() {
    setError("");
    setSuccess("");
    if (!isEligible) {
      setError(
        routeStatus(form) === "AMFS"
          ? "Usia calon tertanggung lebih dari 50 tahun pada tanggal mulai pertanggungan. Proses diarahkan ke AMFS, berapa pun limit pinjamannya."
          : "Tidak memenuhi kriteria MAGI. MAGI berlaku untuk fasilitas KUR dengan limit Rp0 sampai dengan Rp300.000.000 dan usia maksimal 50 tahun.",
      );
      return;
    }
    const missing = validate();
    if (missing.length) {
      setError(`Lengkapi data wajib: ${missing.join(", ")}.`);
      return;
    }
    if (
      [form.kesehatan1, form.kesehatan2, form.kesehatan3].some(
        (v) => v !== "TIDAK",
      )
    ) {
      setError(
        "Jawaban kesehatan harus ditinjau. Template MAGI menyatakan asuransi hanya memproses apabila seluruh jawaban adalah TIDAK; jangan mengubah jawaban agar memenuhi syarat.",
      );
      return;
    }
    try {
      const doc = drawMagiPdf(form);
      const filename = `MAGI-${
        String(form.nama)
          .trim()
          .replace(/[^a-z0-9]+/gi, "-") || "Debitur"
      }.pdf`;
      const pdfBlob = doc.output("blob");
      if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
        throw new Error("File PDF kosong atau gagal dibentuk oleh jsPDF.");
      }

      // Picu unduhan langsung dari interaksi tombol agar lebih kompatibel
      // dibanding mengandalkan doc.save() pada seluruh browser.
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);

      setSuccess(
        `File ${filename} sedang diunduh. Jika tidak terlihat, periksa daftar unduhan browser.`,
      );
    } catch (e) {
      console.error("Gagal membuat atau mengunduh PDF MAGI:", e);
      setError(
        `PDF gagal dibuat/diunduh: ${e?.message || "Kesalahan tidak diketahui"}`,
      );
    }
  }

  async function copyWhatsApp() {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(
        "Clipboard tidak tersedia. Silakan salin teks secara manual dari kotak WhatsApp.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Building2 size={15} />
            <span>Assesoir PK</span>
            <span>/</span>
            <span className="text-zinc-800">Order Magi</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">Order MAGI</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Formulir asuransi jiwa sesuai template MAGI.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
          {unitName(form.unitCode)} · {branchCode(form.unitCode)}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Sumber Data</h3>
            <p className="text-xs text-zinc-500">
              Pilih PK dari database unit aktif atau isi seluruh data secara
              manual.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-lg px-3 py-2 text-sm ${mode === "manual" ? "bg-zinc-900 text-white" : "border border-zinc-200"}`}
            >
              Input Manual
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("pk");
                loadPk();
              }}
              className={`rounded-lg px-3 py-2 text-sm ${mode === "pk" ? "bg-zinc-900 text-white" : "border border-zinc-200"}`}
            >
              Database PK
            </button>
          </div>
        </div>
        {mode === "pk" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  value={pkSearch}
                  onChange={(e) => setPkSearch(e.target.value)}
                  placeholder="Cari nama, CIF, NIK, nomor aplikasi, atau nomor PK"
                  className="w-full rounded-lg border border-zinc-200 py-2.5 pl-9 pr-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={loadPk}
                className="rounded-lg border border-zinc-200 px-3"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            {loadingPk ? (
              <p className="py-5 text-center text-sm text-zinc-500">
                Memuat data PK...
              </p>
            ) : (
              <div className="max-h-72 overflow-auto rounded-lg border border-zinc-100">
                {visiblePk.map((pk) => (
                  <button
                    type="button"
                    key={pk.id}
                    onClick={() => selectPk(pk)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-zinc-100 p-3 text-left last:border-0 hover:bg-zinc-50 ${selectedPkId === pk.id ? "bg-zinc-50" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {pk.nama_debitur || "Tanpa nama"}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {pk.jenis_pengajuan_kredit || "-"} ·{" "}
                        {pk.nomor_pk || pk.nomor_aplikasi || "-"} ·{" "}
                        {dateDMY(pk.tanggal_pk)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium">
                      Rp {rupiah(pk.limit_kredit)}
                    </span>
                  </button>
                ))}
                {!visiblePk.length && (
                  <p className="p-5 text-center text-sm text-zinc-500">
                    Tidak ada data PK.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {success}
        </div>
      )}
      <Panel
        title="Identitas Cabang dan Debitur"
        note="Kode cabang otomatis mengikuti unit aktif. Nama dan nomor aplikasi diformat otomatis."
      >
        <Select
          label="Cabang Kota"
          value={form.unitCode}
          onChange={(v) => set("unitCode", v)}
          options={[
            { value: "JKK1", label: "Jambi Kuamang Kuning 1" },
            { value: "JKK2", label: "Jambi Kuamang Kuning 2" },
          ]}
        />
        <Input
          label="Kode Cabang"
          value={branchCode(form.unitCode)}
          readOnly
          onChange={() => {}}
        />
        <Input
          label="No. Aplikasi"
          value={form.nomorAplikasi}
          onChange={(v) => set("nomorAplikasi", v.toUpperCase())}
          required
        />
        <Input
          label="Nama Debitur"
          value={form.nama}
          onChange={(v) => set("nama", titleCase(v))}
          required
        />
        <Input
          label="No. KTP / NIK"
          value={form.nik}
          onChange={(v) => set("nik", v.replace(/\D/g, ""))}
          required
        />
        <Input
          label="Tempat Lahir"
          value={form.tempatLahir}
          onChange={(v) => set("tempatLahir", titleCase(v))}
          required
        />
        <Input
          label="Tanggal Lahir"
          type="date"
          value={form.tanggalLahir}
          onChange={(v) => set("tanggalLahir", v)}
          required
        />
        <Select
          label="Jenis Kelamin"
          value={form.jenisKelamin}
          onChange={(v) => set("jenisKelamin", v)}
          options={[
            { value: "L", label: "Laki-laki" },
            { value: "P", label: "Perempuan" },
          ]}
        />
        <Input
          label="Usia (otomatis)"
          value={age === "" ? "" : `${age} Tahun`}
          readOnly
          onChange={() => {}}
        />
        <Input
          label="Jalan"
          value={titleCase(form.jalan)}
          onChange={(v) => set("jalan", titleCase(v))}
          required
        />
        <Input label="RT" value={form.rt} onChange={(v) => set("rt", v)} />
        <Input label="RW" value={form.rw} onChange={(v) => set("rw", v)} />
        <Input
          label="Desa"
          value={titleCase(form.desa)}
          onChange={(v) => set("desa", titleCase(v))}
          required
        />
        <Input
          label="Kecamatan"
          value={titleCase(form.kecamatan)}
          onChange={(v) => set("kecamatan", titleCase(v))}
          required
        />
        <Input
          label="Kabupaten"
          value={titleCase(form.kabupaten)}
          onChange={(v) => set("kabupaten", titleCase(v))}
          required
        />
        <Input
          label="Provinsi"
          value={titleCase(form.provinsi)}
          onChange={(v) => set("provinsi", titleCase(v))}
          required
        />
        <Input
          label="Nama Kantor (opsional)"
          value={form.namaKantor}
          onChange={(v) => set("namaKantor", v)}
        />
        <Input
          label="Alamat Kantor (opsional)"
          value={titleCase(form.alamatKantor)}
          onChange={(v) => set("alamatKantor", titleCase(v))}
        />
        <Input
          label="No. Telepon (opsional)"
          value={form.telepon}
          onChange={(v) => set("telepon", v)}
        />
        <Input
          label="Nomor HP (opsional)"
          value={form.handphone}
          onChange={(v) => set("handphone", v)}
        />
        <Input
          label="Email (opsional)"
          type="email"
          value={form.email}
          onChange={(v) => set("email", v)}
        />
      </Panel>
      <Panel title="Profesi dan Jabatan">
        <Select
          label="Jenis Profesi"
          value={form.profesi}
          onChange={(v) => set("profesi", v)}
          options={[
            "PNS/BUMN",
            "TNI/Polri",
            "Swasta/Wiraswasta",
            "Profesional",
            "Lainnya",
          ].map((v) => ({ value: v, label: v }))}
        />
        {form.profesi === "Lainnya" && (
          <Input
            label="Profesi Lainnya"
            value={form.profesiLainnya}
            onChange={(v) => set("profesiLainnya", v)}
            required
          />
        )}
        <Select
          label="Jabatan"
          value={form.jabatan === "Lainnya" ? "Lainnya" : form.jabatan}
          onChange={(v) => set("jabatan", v)}
          options={[
            { value: "", label: "Pilih jabatan" },
            { value: "Petani", label: "Petani" },
            { value: "Wiraswasta", label: "Wiraswasta" },
            { value: "Pemilik Toko", label: "Pemilik Toko" },
            { value: "Lainnya", label: "Lainnya (isi sendiri)" },
          ]}
        />
        {form.jabatan === "Lainnya" && (
          <Input
            label="Jabatan Lainnya"
            value={form.jabatanLainnya}
            onChange={(v) => set("jabatanLainnya", v)}
            required
          />
        )}
      </Panel>
      <Panel
        title="Data Pertanggungan"
        note="Tenor disarankan diisi dalam bulan. Periode akhir dihitung otomatis dari tanggal mulai dan tenor."
      >
        <Select
          label="Jenis Kredit"
          value={form.jenisKredit}
          onChange={(v) => set("jenisKredit", v)}
          options={[
            { value: "KUR", label: "KUR" },
            { value: "KUM", label: "KUM" },
            { value: "KPP", label: "KPP" },
            { value: "KSM", label: "KSM" },
          ]}
        />
        <Input
          label="Jangka Waktu (bulan)"
          type="number"
          value={form.tenorBulan}
          onChange={(v) => set("tenorBulan", v)}
          required
        />
        <Input
          label="Tanggal Mulai Pertanggungan (tanggal PK)"
          type="date"
          value={form.tanggalMulai}
          onChange={(v) => set("tanggalMulai", v)}
          required
        />
        <Input
          label="Jumlah Kredit Awal / Limit Kredit (Rp)"
          value={rupiah(form.limitKredit)}
          onChange={(v) => set("limitKredit", v.replace(/\D/g, ""))}
          required
        />
        <div className="rounded-lg bg-zinc-50 p-3 text-sm">
          <div className="text-xs text-zinc-500">Periode pertanggungan</div>
          <div className="mt-1 font-semibold">
            {dateDMY(form.tanggalMulai)} – {dateDMY(endDate)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Tenor: {tenorText(form.tenorBulan)} · Nilai: Rp{" "}
            {rupiah(form.limitKredit)}
          </div>
        </div>
      </Panel>
      <Panel title="Petugas / Pegawai">
        <Select
          label="Nama MKS"
          value={form.petugasId}
          onChange={(v) => {
            const p = officers.find((x) => x.id === v);
            setForm((old) => ({
              ...old,
              petugasId: v,
              petugasNama: p?.nama || "",
            }));
          }}
          options={[
            {
              value: "",
              label: officers.length
                ? "Pilih pegawai unit"
                : "Tidak ada data pegawai",
            },
            ...officers.map((p) => ({
              value: p.id,
              label: `${p.nama}${p.jabatan ? ` — ${p.jabatan}` : ""}`,
            })),
          ]}
        />
      </Panel>
      <Panel
        title="Pertanyaan Kesehatan"
        note="Pilih jawaban yang benar sesuai keadaan calon tertanggung. Jangan mengisi jawaban yang tidak sesuai kondisi sebenarnya."
      >
        {HEALTH_QUESTIONS.map((q, i) => (
          <div
            key={i}
            className="sm:col-span-2 rounded-lg border border-zinc-100 p-3"
          >
            <p className="text-sm leading-6 text-zinc-700">
              {i + 1}. {q}
            </p>
            <div className="mt-2 flex gap-5">
              {["YA", "TIDAK"].map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`health-${i}`}
                    checked={form[`kesehatan${i + 1}`] === v}
                    onChange={() => set(`kesehatan${i + 1}`, v)}
                  />
                  {v === "YA" ? "Ya" : "Tidak"}
                </label>
              ))}
            </div>
          </div>
        ))}
      </Panel>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Kelayakan MAGI</h3>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${isEligible ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
          >
            {isEligible ? "Memenuhi kriteria" : "Tidak memenuhi kriteria"}
          </span>
        </div>
        <p className="text-sm text-zinc-600">
          MAGI: fasilitas KUR, limit Rp0 sampai dengan Rp300.000.000, dan usia
          maksimal 50 tahun pada tanggal mulai pertanggungan.
        </p>
        {!isEligible && (
          <p className="mt-2 text-sm font-medium text-amber-800">
            {routeStatus(form) === "AMFS"
              ? "Arah proses: AMFS (usia di atas 50 tahun, tanpa melihat limit pinjaman)."
              : "Belum memenuhi kriteria MAGI. Periksa jenis fasilitas dan limit kredit."}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generatePdf}
            disabled={!isEligible}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown size={16} />
            Unduh PDF MAGI
          </button>
          <button
            type="button"
            onClick={copyWhatsApp}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
          >
            <Copy size={16} />
            {copied ? "Tersalin" : "Salin Teks WhatsApp"}
          </button>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Pratinjau teks WhatsApp
          </label>
          <textarea
            readOnly
            value={whatsappText}
            rows={15}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-5"
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Data formulir hanya digunakan untuk membuat dokumen di browser dan
          tidak disimpan ke database. Pembacaan Database PK dan daftar pegawai
          hanya mengambil data yang sudah tersimpan.
        </p>
      </div>
    </div>
  );
}
