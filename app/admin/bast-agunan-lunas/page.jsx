"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  FileText,
  Plus,
  Trash2,
  Download,
  Loader2,
  ChevronDown,
  X,
  Users,
  Save,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";

const TEMPLATE_PREFIX = "NRF.R02.JBI.JKK/";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const emptyAddress = () => ({
  jalan: "",
  rt: "",
  rw: "",
  desa: "",
  kecamatan: "",
  kabupaten: "",
});

const emptyParty = () => ({
  id: uid(),
  hubungan: "",
  nama: "",
  nik: "",
  samaDenganDebitur: false,
  ...emptyAddress(),
});

const emptyCollateral = (jenis = "SHM") => ({
  id: uid(),
  jenis,
  nomor: "",
  namaDokumen: "",
  luas: "",
  desa: "",
  tanggalPembukuan: "",
  uraian: "",
});

const emptyForm = () => ({
  tanggal: today(),
  nomorMode: "TEMPLATE",
  nomorUrut: "532",
  tahun: String(new Date().getFullYear()),
  nomorManual: "",
  debtor: null,
  nikDebitur: "",
  nomorPk: "",
  alamatDebitur: emptyAddress(),
  pihakKedua: [],
  pihakPertamaId: "",
  pihakPertamaNama: "",
  pihakPertamaJabatan: "Penyelia Unit",
  pihakPertamaManual: false,
  unitKerja: "",
  modeAgunan: "TEXT",
  jenisAgunanTeks: "SHM",
  keteranganAgunan: "",
  daftarAgunan: [],
});

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function titleCase(value) {
  return String(value || "")
    .toLocaleLowerCase("id-ID")
    .replace(
      /(^|[\s'-])([a-zà-ÿ])/g,
      (_, before, letter) => before + letter.toLocaleUpperCase("id-ID"),
    );
}

function formatThousands(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
  readOnly = false,
  className = "",
  maxLength,
  inputMode,
  title = false,
  numberFormat = false,
}) {
  return (
    <label className={cx("block min-w-0", className)}>
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(
            numberFormat ? formatThousands(v) : title ? titleCase(v) : v,
          );
        }}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        maxLength={maxLength}
        inputMode={numberFormat ? "numeric" : inputMode}
        className={cx(
          "min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition",
          "placeholder:text-zinc-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10",
          readOnly
            ? "cursor-default border-zinc-200 bg-zinc-50 text-zinc-600"
            : "border-zinc-300 bg-white text-zinc-900",
        )}
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
  disabled = false,
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="min-h-11 w-full appearance-none rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 pr-9 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 disabled:bg-zinc-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
      </div>
    </label>
  );
}

function Section({ number, title, description, children }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3 border-b border-zinc-100 pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-800">
          {number}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-zinc-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-5 text-zinc-500">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function AddressFields({ value, onChange }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field
        label="Jalan / Dusun"
        value={value.jalan}
        onChange={(v) => update("jalan", v)}
        placeholder="Opsional"
        title
        className="sm:col-span-2"
      />
      <Field
        label="RT"
        value={value.rt}
        onChange={(v) => update("rt", v)}
        placeholder="Nomor RT"
      />
      <Field
        label="RW"
        value={value.rw}
        onChange={(v) => update("rw", v)}
        placeholder="Nomor RW"
      />
      <Field
        label="Desa / Kelurahan"
        value={value.desa}
        onChange={(v) => update("desa", v)}
        required
        title
      />
      <Field
        label="Kecamatan"
        value={value.kecamatan}
        onChange={(v) => update("kecamatan", v)}
        required
        title
      />
      <Field
        label="Kabupaten / Kota"
        value={value.kabupaten}
        onChange={(v) => update("kabupaten", v)}
        required
        title
      />
    </div>
  );
}

function addressText(person) {
  if (!person) return "-";
  const parts = [];
  if (person.jalan?.trim()) parts.push(titleCase(person.jalan));
  const rtRw = [
    person.rt?.trim() ? `RT ${person.rt.trim()}` : "",
    person.rw?.trim() ? `RW ${person.rw.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
  if (rtRw) parts.push(rtRw);
  if (person.desa?.trim()) parts.push(`Desa ${titleCase(person.desa)}`);
  if (person.kecamatan?.trim())
    parts.push(`Kec. ${titleCase(person.kecamatan)}`);
  if (person.kabupaten?.trim())
    parts.push(`Kab. ${titleCase(person.kabupaten)}`);
  return parts.join(", ") || "-";
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatShortDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getDebtorLabel(row) {
  return [
    row.nama_debitur,
    row.nomor_urut ? `No. ${row.nomor_urut}` : "",
    row.nama_mks ? `MKS: ${row.nama_mks}` : "",
    row.bundel_agunan ? `Bundel ${row.bundel_agunan}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function getCollateralText(row) {
  return [row.jaminan_utama, row.moral_obligasi]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(", ");
}

function relationHeading(parties) {
  if (!parties.length) return "";
  const relations = [
    ...new Set(
      parties.map((p) => titleCase(p.hubungan).trim()).filter(Boolean),
    ),
  ];
  if (!relations.length) return "Bersama dengan pihak terkait, yaitu :";
  if (relations.length === 1) return `Bersama dengan ${relations[0]}, yaitu :`;
  if (relations.length === 2)
    return `Bersama dengan ${relations[0]} dan ${relations[1]}, yaitu :`;
  return `Bersama dengan ${relations.slice(0, -1).join(", ")}, dan ${relations.at(-1)}, yaitu :`;
}

/*
 * Normalisasi awalan jenis dokumen dalam uraian bebas.
 * Contoh: HM No. 324 ... , HM No. 11
 * Menjadi: SHM No. 324 ... , SHM No. 11
 *
 * Nomor, desa, nama pemegang hak, tanggal, dan luas tidak disentuh.
 */
function applyCollateralTypeToText(value, jenis) {
  const text = String(value || "").trim();
  if (!text) return "";

  const label =
    jenis === "SHM NIB"
      ? "SHM NIB"
      : jenis === "SURAT KETERANGAN"
        ? "Surat Keterangan"
        : "SHM";

  return text.replace(
    /\b(?:SHM\s*NIB|SHM|HM|NIB|SURAT\s+KETERANGAN)\b/gi,
    label,
  );
}

function collateralDescription(item) {
  if (item.jenis === "ISI_SENDIRI") return item.uraian || "-";

  const jenis =
    item.jenis === "SURAT KETERANGAN"
      ? "Surat Keterangan"
      : item.jenis === "SHM NIB"
        ? "SHM NIB"
        : "SHM";

  let description = `${jenis} No. ${item.nomor || "..."}`;
  if (item.desa) description += `/Desa ${titleCase(item.desa)}`;
  if (item.namaDokumen) description += ` an ${titleCase(item.namaDokumen)}`;
  if (item.tanggalPembukuan)
    description += ` tgl ${formatShortDate(item.tanggalPembukuan)}`;
  if (item.luas) description += ` Seluas ${formatThousands(item.luas)} M2`;
  return description;
}

function BASTDocument({ form, nomorBast }) {
  const debtor = form.debtor || {};
  const parties = form.pihakKedua || [];

  const collateralDescriptionText =
    form.modeAgunan === "STRUCTURED"
      ? form.daftarAgunan.map(collateralDescription).join(", ")
      : applyCollateralTypeToText(
          form.keteranganAgunan,
          form.jenisAgunanTeks,
        ) || "-";

  return (
    <>
      {/* HALAMAN PERTAMA */}
      <article className="bast-document bast-document-page-one">
        <header className="bast-header">
          <img src="/images/mandiri-logo.png" alt="Logo Bank Mandiri" />
          <div className="bast-heading">
            <h1 className="text-[15px] font-bold tracking-wide">
              BERITA ACARA
            </h1>
            <h2 className="text-[15px] font-bold tracking-wide">
              SERAH TERIMA AGUNAN KREDIT LUNAS
            </h2>
            <p className="mt-1 text-[13px] font-semibold">{nomorBast}</p>
          </div>
        </header>

        <p className="mt-5 text-justify">
          Pada hari ini {formatDate(form.tanggal)}, yang bertanda tangan di
          bawah ini :
        </p>

        <table className="bast-identity mt-4">
          <tbody>
            <tr>
              <td>Nama</td>
              <td>:</td>
              <td>
                {form.pihakPertamaNama || "................................"}
              </td>
            </tr>
            <tr>
              <td>Jabatan</td>
              <td>:</td>
              <td>
                {form.pihakPertamaJabatan || "................................"}
              </td>
            </tr>
            <tr>
              <td>Unit Kerja</td>
              <td>:</td>
              <td>{form.unitKerja || "................................"}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4 text-justify">
          Bertindak dalam jabatan tersebut di atas dan untuk selanjutnya dalam
          Berita Acara Serah Terima ini disebut PIHAK PERTAMA (yang
          menyerahkan).
        </p>

        <table className="bast-identity mt-4">
          <tbody>
            <tr>
              <td>Nama</td>
              <td>:</td>
              <td>{titleCase(debtor.nama_debitur) || "-"}</td>
            </tr>
            <tr>
              <td>Alamat</td>
              <td>:</td>
              <td>{addressText(form.alamatDebitur)}</td>
            </tr>
            <tr>
              <td>KTP</td>
              <td>:</td>
              <td>{form.nikDebitur || "-"}</td>
            </tr>
          </tbody>
        </table>

        {parties.length > 0 && (
          <>
            <p className="mt-4 text-justify">{relationHeading(parties)}</p>
            <div className="mt-2 space-y-3">
              {parties.map((person, index) => (
                <div key={person.id} className="bast-party">
                  <table className="bast-identity">
                    <tbody>
                      <tr>
                        <td>Nama</td>
                        <td>:</td>
                        <td>
                          {titleCase(person.nama) || `Pihak ${index + 1}`}
                        </td>
                      </tr>
                      <tr>
                        <td>Alamat</td>
                        <td>:</td>
                        <td>{addressText(person)}</td>
                      </tr>
                      <tr>
                        <td>KTP</td>
                        <td>:</td>
                        <td>{person.nik || "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-justify">
          Dalam Berita Acara Serah Terima ini disebut PIHAK KEDUA (yang
          menerima).
        </p>

        <p className="mt-4 text-justify">
          Sehubungan dengan telah lunasnya fasilitas kredit sesuai dengan
          Perjanjian Kredit {form.nomorPk || "................................"}
          , pada hari dan tanggal sebagaimana disebutkan di atas, telah
          dilakukan serah terima dokumen agunan dari PIHAK PERTAMA kepada PIHAK
          KEDUA sebagaimana PIHAK KEDUA mengakui dan menyatakan telah menerima
          asli dokumen agunan sebagaimana terinci dalam tabel di bawah ini:
        </p>

        <table className="bast-collateral mt-3">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>No</th>
              <th>Dokumen</th>
              <th style={{ width: "31%" }}>No</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-center">1.</td>
              <td className="whitespace-pre-wrap text-justify">
                {collateralDescriptionText}
              </td>
              <td>{form.nomorPk || "-"}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-5 text-justify">
          Dengan demikian, terhitung sejak hari dan tanggal sebagaimana
          disebutkan pada awal Berita Acara Serah Terima ini, maka segala hak
          dan tanggung jawab terhadap dokumen sebagaimana tercantum dalam tabel
          di atas telah beralih dari PIHAK PERTAMA kepada PIHAK KEDUA dan PIHAK
          KEDUA menyatakan bertanggung jawab sepenuhnya atas keberadaan dokumen
          agunan tersebut di atas dan membebaskan PIHAK PERTAMA dari segala
          tuntutan dan gugatan dari pihak manapun juga di kemudian hari terkait
          dengan penyerahan dokumen agunan di atas.
        </p>
      </article>

      {/* HALAMAN KEDUA: ARTIKEL TERPISAH, BUKAN BAGIAN HALAMAN PERTAMA */}
      <article className="bast-document bast-document-page-two">
        <p className="text-justify">
          Demikian Berita Acara Serah Terima ini dibuat dan ditandatangani
          rangkap 2 (dua) yang masing-masing mempunyai kekuatan hukum yang sama.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-8 text-center">
          <div className="bast-signature">
            <p className="font-semibold">PIHAK PERTAMA</p>
            <div className="h-28" />
            <p className="font-bold underline">
              {titleCase(form.pihakPertamaNama) || " "}
            </p>
            <p>{form.pihakPertamaJabatan}</p>
          </div>

          <div className="bast-signature">
            <p className="font-semibold">PIHAK KEDUA</p>
            <div className="h-28" />
            <div className="flex flex-wrap items-start justify-center gap-x-5 gap-y-3">
              <p className="font-bold underline">
                {titleCase(debtor.nama_debitur) || ""}
              </p>
              {parties.map((person) => (
                <p key={person.id} className="font-bold underline">
                  {titleCase(person.nama)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </article>
    </>
  );
}

export default function BastAgunanLunasPage() {
  const { activeUnit } = useUnit();
  const unitCode = activeUnit?.value || "JKK1";

  const [rows, setRows] = useState([]);
  const [savedRows, setSavedRows] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [officerLoading, setOfficerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState("");
  const [showDebtorList, setShowDebtorList] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [officerError, setOfficerError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const printRef = useRef(null);

  const nomorBast = useMemo(() => {
    if (form.nomorMode === "MANUAL")
      return form.nomorManual.trim().toUpperCase();
    return `${TEMPLATE_PREFIX}${form.nomorUrut || "..."}/${form.tahun || "..."}`;
  }, [form.nomorMode, form.nomorManual, form.nomorUrut, form.tahun]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("id");
    return [...rows]
      .sort((a, b) =>
        String(a.nama_debitur || "").localeCompare(
          String(b.nama_debitur || ""),
          "id",
        ),
      )
      .filter(
        (row) =>
          !q ||
          [
            row.nama_debitur,
            row.nomor_urut,
            row.nama_mks,
            row.bundel_agunan,
            row.nomor_pk,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("id")
            .includes(q),
      );
  }, [rows, search]);

  const loadDebtors = useCallback(async () => {
    setLoadingRows(true);
    setLoadError("");
    try {
      const response = await fetch(
        `/api/admin/agunan-lunas?unit=${encodeURIComponent(unitCode)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Gagal memuat Agunan Lunas.");
      setRows(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setRows([]);
      setLoadError(error.message || "Data debitur gagal dimuat.");
    } finally {
      setLoadingRows(false);
    }
  }, [unitCode]);

  const loadRecap = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/bast-agunan-lunas?unit=${encodeURIComponent(unitCode)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Gagal memuat rekap.");
      setSavedRows(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error("Rekap BAST:", error);
    }
  }, [unitCode]);

  useEffect(() => {
    loadDebtors();
  }, [loadDebtors]);
  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  useEffect(() => {
    let alive = true;

    async function loadOfficers() {
      setOfficerLoading(true);
      setOfficerError("");
      try {
        const { data: unit, error: unitError } = await supabase
          .from("unit")
          .select("id,nama_unit,kode_unit")
          .eq("kode_unit", unitCode)
          .maybeSingle();

        if (unitError) throw unitError;
        if (!unit) throw new Error("Unit kerja tidak ditemukan.");

        const { data, error } = await supabase
          .from("pegawai")
          .select("id,nama,jabatan,jenis_pegawai,aktif")
          .eq("unit_id", unit.id)
          .eq("jenis_pegawai", "PENGAWAS")
          .eq("aktif", true)
          .order("nama", { ascending: true });

        if (error) throw error;
        if (!alive) return;

        setOfficers(data || []);
        setForm((current) => {
          const selected = (data || []).find(
            (p) => String(p.id) === String(current.pihakPertamaId),
          );
          if (current.pihakPertamaManual) {
            return { ...current, unitKerja: unit.nama_unit || unit.kode_unit };
          }
          const officer = selected || data?.[0];
          return {
            ...current,
            unitKerja: unit.nama_unit || unit.kode_unit,
            pihakPertamaId: String(officer?.id || ""),
            pihakPertamaNama: officer?.nama || "",
            pihakPertamaJabatan: officer?.jabatan || "Penyelia Unit",
          };
        });
      } catch (error) {
        if (alive)
          setOfficerError(error.message || "Data Pengawas tidak dapat dimuat.");
      } finally {
        if (alive) setOfficerLoading(false);
      }
    }

    loadOfficers();
    return () => {
      alive = false;
    };
  }, [unitCode]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseOfficer(value) {
    if (value === "MANUAL") {
      setForm((current) => ({
        ...current,
        pihakPertamaId: "MANUAL",
        pihakPertamaManual: true,
        pihakPertamaNama: "",
        pihakPertamaJabatan: "",
      }));
      return;
    }
    const officer = officers.find((item) => String(item.id) === String(value));
    if (!officer) return;
    setForm((current) => ({
      ...current,
      pihakPertamaId: String(officer.id),
      pihakPertamaManual: false,
      pihakPertamaNama: titleCase(officer.nama || ""),
      pihakPertamaJabatan: officer.jabatan || "Penyelia Unit",
    }));
  }

  function chooseDebtor(row) {
    const rawCollateral = getCollateralText(row);
    const hasCollateral =
      /\b(?:HM|SHM|NIB|SHM\s*NIB|SURAT\s+KETERANGAN)\b/i.test(rawCollateral);
    const detectedType = /\bNIB\b/i.test(rawCollateral) ? "SHM NIB" : "SHM";

    setForm((current) => ({
      ...current,
      debtor: row,
      nikDebitur: row.nik_debitur || "",
      nomorPk: row.nomor_pk || "",
      keteranganAgunan: rawCollateral,
      modeAgunan: "TEXT",
      jenisAgunanTeks: detectedType,
      daftarAgunan: hasCollateral ? [] : [],
      pihakKedua: row.nama_pasangan?.trim()
        ? [
            {
              ...emptyParty(),
              hubungan: "Istri",
              nama: titleCase(row.nama_pasangan),
              nik: row.nik_pasangan || "",
            },
          ]
        : [],
    }));

    setSearch(row.nama_debitur || "");
    setShowDebtorList(false);
  }

  function updateParty(id, key, value) {
    setForm((current) => ({
      ...current,
      pihakKedua: current.pihakKedua.map((person) =>
        person.id === id ? { ...person, [key]: value } : person,
      ),
    }));
  }

  function updatePartyAddress(id, address) {
    setForm((current) => ({
      ...current,
      pihakKedua: current.pihakKedua.map((person) =>
        person.id === id ? { ...person, ...address } : person,
      ),
    }));
  }

  function toggleSameAddress(person, checked) {
    setForm((current) => ({
      ...current,
      pihakKedua: current.pihakKedua.map((item) =>
        item.id === person.id
          ? {
              ...item,
              samaDenganDebitur: checked,
              ...(checked ? { ...current.alamatDebitur } : {}),
            }
          : item,
      ),
    }));
  }

  function updateDebtorAddress(address) {
    setForm((current) => ({
      ...current,
      alamatDebitur: address,
      pihakKedua: current.pihakKedua.map((person) =>
        person.samaDenganDebitur ? { ...person, ...address } : person,
      ),
    }));
  }

  function updateCollateral(id, key, value) {
    setForm((current) => ({
      ...current,
      daftarAgunan: current.daftarAgunan.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function validate() {
    if (!form.debtor)
      return (
        alert("Pilih debitur dari data Agunan Lunas terlebih dahulu."),
        false
      );
    if (!form.tanggal) return (alert("Tanggal BAST wajib diisi."), false);
    if (!nomorBast.trim()) return (alert("Nomor BAST wajib diisi."), false);
    if (!form.nikDebitur.trim())
      return (alert("NIK debitur wajib diisi."), false);
    if (!form.nomorPk.trim()) return (alert("Nomor PK wajib diisi."), false);
    if (!form.pihakPertamaNama.trim() || !form.pihakPertamaJabatan.trim()) {
      return (alert("Nama dan jabatan pihak pertama wajib diisi."), false);
    }
    if (
      !form.alamatDebitur.desa ||
      !form.alamatDebitur.kecamatan ||
      !form.alamatDebitur.kabupaten
    ) {
      return (alert("Lengkapi desa, kecamatan, dan kabupaten debitur."), false);
    }
    if (form.pihakKedua.some((p) => !p.nama.trim())) {
      return (
        alert(
          "Lengkapi nama seluruh pihak terkait atau hapus baris yang kosong.",
        ),
        false
      );
    }
    if (form.modeAgunan === "TEXT" && !form.keteranganAgunan.trim()) {
      return (alert("Uraian dokumen agunan wajib diisi."), false);
    }
    if (form.modeAgunan === "STRUCTURED" && !form.daftarAgunan.length) {
      return (alert("Tambahkan minimal satu dokumen agunan."), false);
    }
    if (
      form.modeAgunan === "STRUCTURED" &&
      form.daftarAgunan.some(
        (a) =>
          a.jenis !== "ISI_SENDIRI" &&
          (!a.nomor.trim() || !a.namaDokumen.trim()),
      )
    ) {
      return (
        alert("Lengkapi nomor dokumen dan nama pada dokumen agunan."),
        false
      );
    }
    return true;
  }

  function getAgunanPayload() {
    if (form.modeAgunan === "TEXT") {
      return [
        {
          jenis: "TEXT",
          jenis_pilihan: form.jenisAgunanTeks,
          uraian: applyCollateralTypeToText(
            form.keteranganAgunan,
            form.jenisAgunanTeks,
          ),
          deskripsi: applyCollateralTypeToText(
            form.keteranganAgunan,
            form.jenisAgunanTeks,
          ),
        },
      ];
    }
    return form.daftarAgunan.map((item) => ({
      ...item,
      namaDokumen: titleCase(item.namaDokumen),
      desa: titleCase(item.desa),
      luas: formatThousands(item.luas),
      deskripsi: collateralDescription(item),
    }));
  }

  async function saveRecap() {
    if (!validate()) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        unit_code: unitCode,
        agunan_lunas_id: form.debtor.id,
        nomor_bast: nomorBast,
        nomor_bast_mode: form.nomorMode,
        tanggal_bast: form.tanggal,
        nomor_pk: form.nomorPk,
        jenis_pinjaman: form.debtor.jenis_pinjaman || "",
        debtor: {
          nama: titleCase(form.debtor.nama_debitur),
          nik: form.nikDebitur,
          jalan: titleCase(form.alamatDebitur.jalan),
          rt: form.alamatDebitur.rt,
          rw: form.alamatDebitur.rw,
          desa: titleCase(form.alamatDebitur.desa),
          kecamatan: titleCase(form.alamatDebitur.kecamatan),
          kabupaten: titleCase(form.alamatDebitur.kabupaten),
        },
        pihak_pertama: {
          nama: titleCase(form.pihakPertamaNama),
          jabatan: titleCase(form.pihakPertamaJabatan),
        },
        pihak_kedua_list: form.pihakKedua.map((p) => ({
          hubungan: titleCase(p.hubungan),
          nama: titleCase(p.nama),
          nik: p.nik,
          alamat: {
            jalan: titleCase(p.jalan),
            rt: p.rt,
            rw: p.rw,
            desa: titleCase(p.desa),
            kecamatan: titleCase(p.kecamatan),
            kabupaten: titleCase(p.kabupaten),
          },
        })),
        agunan_list: getAgunanPayload(),
      };

      const response = await fetch("/api/admin/bast-agunan-lunas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Gagal menyimpan rekap BAST.");
      setMessage("Rekap BAST berhasil disimpan.");
      await loadRecap();
    } catch (error) {
      alert(error.message || "Gagal menyimpan rekap BAST.");
    } finally {
      setSaving(false);
    }
  }

  async function exportExcel() {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/admin/bast-agunan-lunas?unit=${encodeURIComponent(unitCode)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Gagal mengambil rekap.");

      const data = (result.data || []).map((row, index) => {
        const parties = Array.isArray(row.pihak_kedua_list)
          ? row.pihak_kedua_list
          : [];
        let collateral = row.daftar_agunan;
        if (typeof collateral === "string") {
          try {
            collateral = JSON.parse(collateral);
          } catch {
            collateral = [];
          }
        }
        return {
          No: index + 1,
          "Nomor BAST": row.nomor_bast || "",
          "Tanggal BAST": row.tanggal_bast || "",
          "Nama Debitur": row.nama_debitur || "",
          "NIK Debitur": row.nik_debitur || "",
          "Nomor PK": row.nomor_pk || "",
          "Alamat Debitur": row.alamat_tinggal || "",
          "Pihak Pertama": row.pihak_pertama_nama || "",
          Jabatan: row.pihak_pertama_jabatan || "",
          "Pihak Terkait": parties
            .map((p) => `${p.hubungan || ""}: ${p.nama || ""}`)
            .join("; "),
          Agunan: Array.isArray(collateral)
            ? collateral.map((a) => a.deskripsi || a.uraian || "").join("; ")
            : "",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 32 },
        { wch: 15 },
        { wch: 28 },
        { wch: 20 },
        { wch: 28 },
        { wch: 55 },
        { wch: 25 },
        { wch: 20 },
        { wch: 45 },
        { wch: 65 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap BAST");
      XLSX.writeFile(
        workbook,
        `Rekap-BAST-Agunan-Lunas-${unitCode}-${today()}.xlsx`,
      );
    } catch (error) {
      alert(error.message || "Ekspor Excel gagal.");
    } finally {
      setExporting(false);
    }
  }

  async function downloadPdf() {
    if (!validate()) return;
    setDownloading(true);
    try {
      if (!printRef.current) throw new Error("Dokumen BAST belum siap.");
      const module = await import("jspdf-html2canvas");
      const html2PDF = module.default || module;
      await html2PDF(printRef.current, {
        jsPDF: { format: "a4", orientation: "portrait", unit: "mm", margin: 0 },
        imageType: "image/jpeg",
        imageQuality: 0.98,
        output: `BAST-Agunan-Lunas-${nomorBast.replace(/[^\w.-]/g, "-")}.pdf`,
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
    } catch (error) {
      console.error("PDF BAST:", error);
      alert("Unduhan PDF otomatis gagal. Gunakan Cetak / Simpan sebagai PDF.");
    } finally {
      setDownloading(false);
    }
  }

  function printPdf() {
    if (!validate()) return;
    window.print();
  }

  const collateralTypeOptions = [
    { value: "SHM", label: "SHM" },
    { value: "SHM NIB", label: "SHM NIB" },
    { value: "SURAT KETERANGAN", label: "Surat Keterangan" },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-5 text-zinc-900 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                BAST Agunan Lunas
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Berita Acara Serah Terima Agunan Kredit Lunas
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
            <span className="text-zinc-500">Unit aktif: </span>
            <strong>{unitCode}</strong>
          </div>
        </header>

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </div>
        )}

        <Section
          number="01"
          title="Pilih Debitur"
          description="Sumber data dari Agunan Lunas. Daftar diurutkan berdasarkan nama A–Z."
        >
          <div className="relative sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Cari nama, nomor, MKS, atau bundel debitur
            </label>
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDebtorList(true);
                  if (
                    form.debtor &&
                    e.target.value !== form.debtor.nama_debitur
                  )
                    updateForm("debtor", null);
                }}
                onFocus={() => setShowDebtorList(true)}
                placeholder="Ketik nama debitur..."
                className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-10 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    updateForm("debtor", null);
                    setShowDebtorList(true);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {showDebtorList && (
              <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl">
                {loadingRows ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-zinc-500">
                    <Loader2 size={16} className="animate-spin" />
                    Memuat data debitur...
                  </div>
                ) : loadError ? (
                  <div className="p-4 text-sm text-red-600">{loadError}</div>
                ) : filteredRows.length === 0 ? (
                  <div className="p-4 text-sm text-zinc-500">
                    Debitur tidak ditemukan.
                  </div>
                ) : (
                  filteredRows.map((row) => (
                    <button
                      type="button"
                      key={row.id}
                      onClick={() => chooseDebtor(row)}
                      className="block w-full border-b border-zinc-100 px-4 py-3 text-left last:border-0 hover:bg-blue-50"
                    >
                      <span className="block text-sm font-semibold text-zinc-900">
                        {row.nama_debitur}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-500">
                        {getDebtorLabel(row)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {form.debtor && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 sm:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Debitur terpilih
                  </p>
                  <p className="mt-1 font-bold text-zinc-900">
                    {titleCase(form.debtor.nama_debitur)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    {getDebtorLabel(form.debtor)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateForm("debtor", null);
                    setSearch("");
                  }}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-white"
                >
                  <X size={17} />
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section
          number="02"
          title="Informasi BAST"
          description="Atur nomor dan tanggal berita acara."
        >
          <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateForm("nomorMode", "TEMPLATE")}
              className={cx(
                "rounded-xl border p-3 text-left",
                form.nomorMode === "TEMPLATE"
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-zinc-200 bg-white",
              )}
            >
              <span className="block text-sm font-semibold">
                Nomor template
              </span>
              <span className="mt-1 block text-xs text-zinc-500">
                NRF.R02.JBI.JKK/nomor/tahun
              </span>
            </button>
            <button
              type="button"
              onClick={() => updateForm("nomorMode", "MANUAL")}
              className={cx(
                "rounded-xl border p-3 text-left",
                form.nomorMode === "MANUAL"
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-zinc-200 bg-white",
              )}
            >
              <span className="block text-sm font-semibold">Nomor manual</span>
              <span className="mt-1 block text-xs text-zinc-500">
                Isi nomor bebas
              </span>
            </button>
          </div>

          {form.nomorMode === "TEMPLATE" ? (
            <>
              <Field
                label="Nomor urut"
                value={form.nomorUrut}
                onChange={(v) => updateForm("nomorUrut", v.replace(/\D/g, ""))}
                required
                inputMode="numeric"
              />
              <Field
                label="Tahun"
                value={form.tahun}
                onChange={(v) =>
                  updateForm("tahun", v.replace(/\D/g, "").slice(0, 4))
                }
                required
                inputMode="numeric"
                maxLength={4}
              />
              <div className="rounded-xl bg-zinc-50 p-3 sm:col-span-2">
                <p className="text-xs font-medium text-zinc-500">
                  Nomor yang akan digunakan
                </p>
                <p className="mt-1 break-all text-sm font-bold">{nomorBast}</p>
              </div>
            </>
          ) : (
            <Field
              label="Nomor BAST manual"
              value={form.nomorManual}
              onChange={(v) => updateForm("nomorManual", v.toUpperCase())}
              required
              className="sm:col-span-2"
            />
          )}
          <Field
            label="Tanggal BAST"
            type="date"
            value={form.tanggal}
            onChange={(v) => updateForm("tanggal", v)}
            required
          />
        </Section>

        <Section
          number="03"
          title="Pihak Pertama"
          description="Pilih pegawai dengan status Pengawas. Pilihan terakhir dapat digunakan untuk mengisi nama sendiri."
        >
          <SelectField
            label="Nama Pengawas"
            value={form.pihakPertamaId}
            onChange={chooseOfficer}
            required
            disabled={officerLoading}
            options={[
              {
                value: "",
                label: officerLoading ? "Memuat Pengawas..." : "Pilih Pengawas",
              },
              ...officers.map((p) => ({
                value: String(p.id),
                label: `${p.nama}${p.jabatan ? ` — ${p.jabatan}` : ""}`,
              })),
              { value: "MANUAL", label: "Isi Sendiri" },
            ]}
          />
          <Field
            label="Nama pihak pertama"
            value={form.pihakPertamaNama}
            onChange={(v) => updateForm("pihakPertamaNama", v)}
            required
            readOnly={!form.pihakPertamaManual}
            title
          />
          <Field
            label="Jabatan"
            value={form.pihakPertamaJabatan}
            onChange={(v) => updateForm("pihakPertamaJabatan", v)}
            required
            title
            readOnly={!form.pihakPertamaManual}
          />
          <Field
            label="Unit Kerja"
            value={form.unitKerja}
            onChange={(v) => updateForm("unitKerja", v)}
            required
            readOnly
          />
          {officerError && (
            <p className="text-xs text-amber-700 sm:col-span-2">
              {officerError}
            </p>
          )}
        </Section>

        <Section
          number="04"
          title="Data Debitur"
          description="NIK, nomor PK, dan alamat yang dicantumkan dalam BAST."
        >
          <Field
            label="NIK Debitur"
            value={form.nikDebitur}
            onChange={(v) =>
              updateForm("nikDebitur", v.replace(/\D/g, "").slice(0, 16))
            }
            maxLength={16}
            inputMode="numeric"
            required
          />
          <Field
            label="Nomor Perjanjian Kredit (PK)"
            value={form.nomorPk}
            onChange={(v) => updateForm("nomorPk", v.toUpperCase())}
            required
          />
          <div className="sm:col-span-2">
            <AddressFields
              value={form.alamatDebitur}
              onChange={updateDebtorAddress}
            />
          </div>
        </Section>

        <Section
          number="05"
          title="Pihak Kedua / Pihak Terkait"
          description="Tambahkan istri, ayah, orang tua, atau pihak lain yang ikut menerima agunan."
        >
          {form.pihakKedua.map((person, index) => (
            <div
              key={person.id}
              className="space-y-4 rounded-xl border border-zinc-200 p-4 sm:col-span-2 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users size={17} className="text-blue-700" />
                  <h3 className="text-sm font-bold">
                    Pihak Terkait {index + 1}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((c) => ({
                      ...c,
                      pihakKedua: c.pihakKedua.filter(
                        (p) => p.id !== person.id,
                      ),
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Hapus
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Hubungan dengan debitur"
                  value={person.hubungan}
                  onChange={(v) => updateParty(person.id, "hubungan", v)}
                  placeholder="Contoh: Istri / Ayah Debitur"
                  required
                  title
                />
                <Field
                  label="Nama lengkap"
                  value={person.nama}
                  onChange={(v) => updateParty(person.id, "nama", v)}
                  required
                  title
                />
                <Field
                  label="NIK"
                  value={person.nik}
                  onChange={(v) =>
                    updateParty(
                      person.id,
                      "nik",
                      v.replace(/\D/g, "").slice(0, 16),
                    )
                  }
                  maxLength={16}
                  inputMode="numeric"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={!!person.samaDenganDebitur}
                  onChange={(e) => toggleSameAddress(person, e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-700 focus:ring-blue-500"
                />
                Sama dengan alamat debitur
              </label>
              <div className="border-t border-zinc-100 pt-4">
                <p className="mb-3 text-sm font-semibold text-zinc-700">
                  Alamat pihak terkait
                </p>
                <AddressFields
                  value={person}
                  onChange={(v) => updatePartyAddress(person.id, v)}
                />
                {person.samaDenganDebitur && (
                  <p className="mt-2 text-xs text-blue-700">
                    Alamat mengikuti perubahan alamat debitur.
                  </p>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setForm((c) => ({
                ...c,
                pihakKedua: [...c.pihakKedua, emptyParty()],
              }))
            }
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-4 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 sm:col-span-2"
          >
            <Plus size={17} />
            Tambah Pihak Terkait
          </button>
        </Section>

        <Section
          number="06"
          title="Dokumen Agunan"
          description="Uraian dari data Agunan Lunas dapat dipertahankan, lalu awalan jenis dokumen disesuaikan dengan pilihan Anda."
        >
          <div className="rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-600 sm:col-span-2">
            <strong>Sumber keterangan:</strong>{" "}
            {form.debtor
              ? getCollateralText(form.debtor) ||
                "Tidak ada uraian dari data sumber."
              : "Pilih debitur terlebih dahulu."}
          </div>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => updateForm("modeAgunan", "TEXT")}
              className={cx(
                "rounded-xl border px-4 py-2.5 text-sm font-semibold",
                form.modeAgunan === "TEXT"
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-zinc-200 bg-white",
              )}
            >
              Uraian dari data sumber
            </button>
            <button
              type="button"
              onClick={() => updateForm("modeAgunan", "STRUCTURED")}
              className={cx(
                "rounded-xl border px-4 py-2.5 text-sm font-semibold",
                form.modeAgunan === "STRUCTURED"
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-zinc-200 bg-white",
              )}
            >
              Isi dokumen satu per satu
            </button>
          </div>

          {form.modeAgunan === "TEXT" ? (
            <>
              <SelectField
                label="Jenis agunan untuk uraian"
                value={form.jenisAgunanTeks}
                onChange={(v) => updateForm("jenisAgunanTeks", v)}
                options={collateralTypeOptions}
              />
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Uraian dokumen agunan
                </span>
                <textarea
                  rows={6}
                  value={form.keteranganAgunan}
                  onChange={(e) =>
                    updateForm("keteranganAgunan", e.target.value)
                  }
                  placeholder="Uraian dokumen agunan yang diserahkan..."
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-sm leading-6 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                />
                <span className="mt-2 block text-xs text-zinc-500">
                  Pratinjau tabel:{" "}
                  {applyCollateralTypeToText(
                    form.keteranganAgunan,
                    form.jenisAgunanTeks,
                  ) || "-"}
                </span>
              </label>
            </>
          ) : (
            <>
              {form.daftarAgunan.map((item, index) => (
                <div
                  key={item.id}
                  className="space-y-3 rounded-xl border border-zinc-200 p-4 sm:col-span-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">
                      Dokumen Agunan {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        updateForm(
                          "daftarAgunan",
                          form.daftarAgunan.filter((a) => a.id !== item.id),
                        )
                      }
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <SelectField
                    label="Jenis agunan"
                    value={item.jenis}
                    onChange={(v) => updateCollateral(item.id, "jenis", v)}
                    options={[
                      ...collateralTypeOptions,
                      { value: "ISI_SENDIRI", label: "Isi Sendiri" },
                    ]}
                  />
                  {item.jenis === "ISI_SENDIRI" ? (
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                        Uraian dokumen
                      </span>
                      <textarea
                        rows={3}
                        value={item.uraian}
                        onChange={(e) =>
                          updateCollateral(item.id, "uraian", e.target.value)
                        }
                        className="w-full rounded-xl border border-zinc-300 p-3 text-sm"
                      />
                    </label>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field
                        label="Nomor dokumen"
                        value={item.nomor}
                        onChange={(v) => updateCollateral(item.id, "nomor", v)}
                        placeholder="Contoh: 120 atau 0013"
                        required
                      />
                      <Field
                        label="Nama pada dokumen"
                        value={item.namaDokumen}
                        onChange={(v) =>
                          updateCollateral(item.id, "namaDokumen", v)
                        }
                        placeholder="Boleh lebih dari satu nama"
                        title
                        required
                      />
                      <Field
                        label="Luas agunan (M²)"
                        value={item.luas}
                        onChange={(v) => updateCollateral(item.id, "luas", v)}
                        placeholder="Contoh: 10.546"
                        numberFormat
                      />
                      <Field
                        label="Desa agunan"
                        value={item.desa}
                        onChange={(v) => updateCollateral(item.id, "desa", v)}
                        title
                      />
                      <Field
                        label="Tanggal pembukuan"
                        type="date"
                        value={item.tanggalPembukuan}
                        onChange={(v) =>
                          updateCollateral(item.id, "tanggalPembukuan", v)
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateForm("daftarAgunan", [
                    ...form.daftarAgunan,
                    emptyCollateral(),
                  ])
                }
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-4 py-3 text-sm font-semibold text-blue-800 sm:col-span-2"
              >
                <Plus size={16} />
                Tambah Dokumen Agunan
              </button>
            </>
          )}
        </Section>

        <Section
          number="07"
          title="Rekap BAST"
          description="Simpan data BAST agar dapat dibuka kembali dan diekspor ke Excel."
        >
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
            <button
              type="button"
              onClick={saveRecap}
              disabled={saving}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              {saving ? "Menyimpan..." : "Simpan Rekap"}
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={exporting}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-green-300 bg-green-50 px-5 py-3 text-sm font-semibold text-green-800 hover:bg-green-100 disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={17} />
              )}
              {exporting ? "Menyiapkan Excel..." : "Ekspor Excel"}
            </button>
            <button
              type="button"
              onClick={loadRecap}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <RefreshCw size={16} />
              Muat Ulang
            </button>
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => setShowRecap((v) => !v)}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              {showRecap ? "Sembunyikan" : "Lihat"} rekap tersimpan (
              {savedRows.length})
            </button>
            {showRecap && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="p-3">Nomor BAST</th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Debitur</th>
                      <th className="p-3">Nomor PK</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedRows.map((r) => (
                      <tr key={r.id} className="border-t border-zinc-100">
                        <td className="p-3 font-medium">{r.nomor_bast}</td>
                        <td className="p-3">{r.tanggal_bast}</td>
                        <td className="p-3">{r.nama_debitur}</td>
                        <td className="p-3">{r.nomor_pk}</td>
                        <td className="p-3">{r.status}</td>
                      </tr>
                    ))}
                    {!savedRows.length && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-4 text-center text-zinc-500"
                        >
                          Belum ada rekap tersimpan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Section>

        <div className="sticky bottom-2 z-20 flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={printPdf}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            <FileText size={17} />
            Cetak / Simpan PDF
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Download size={17} />
            )}
            {downloading ? "Membuat PDF..." : "Unduh PDF"}
          </button>
        </div>
      </div>

      {/* AREA DOKUMEN UNTUK CETAK DAN PDF */}
      <div className="bast-print-area" ref={printRef}>
        <BASTDocument form={form} nomorBast={nomorBast} />
      </div>

      <style jsx global>{`
        .bast-document {
          position: relative;
          box-sizing: border-box;
          width: 794px;
          min-height: 1123px;
          margin: 0 auto;
          padding: 66px 74px 60px;
          background: #fff;
          color: #111;
          font-family: "Times New Roman", Times, serif;
          font-size: 13px;
          line-height: 1.55;
        }

        .bast-header {
          position: relative;
          min-height: 100px;
          text-align: center;
        }

        .bast-heading {
          padding-top: 8px;
        }

        /* Logo menempel pada area kertas, bukan dibatasi margin isi. */
        .bast-header img {
          position: absolute;
          z-index: 2;
          top: -64px;
          right: -74px;
          display: block;
          width: 125px;
          height: auto;
          max-width: none;
          object-fit: contain;
        }

        .bast-identity {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 13px;
        }

        .bast-identity td {
          padding: 1px 3px;
          vertical-align: top;
          overflow-wrap: anywhere;
        }

        .bast-identity td:first-child {
          width: 105px;
        }
        .bast-identity td:nth-child(2) {
          width: 14px;
        }

        .bast-collateral {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
        }

        .bast-collateral th,
        .bast-collateral td {
          border: 1px solid #222;
          padding: 7px;
          vertical-align: top;
          overflow-wrap: anywhere;
        }

        .bast-collateral th {
          text-align: center;
          font-weight: bold;
        }

        .bast-party,
        .bast-signature {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Tiap article adalah satu halaman A4 tersendiri. */
        .bast-document-page-one {
          break-after: page;
          page-break-after: always;
        }

        .bast-document-page-two {
          break-before: page;
          page-break-before: always;
          min-height: 1123px;
          padding-top: 66px;
        }

        .bast-print-area {
          position: fixed;
          left: -20000px;
          top: 0;
          width: 794px;
          background: white;
          z-index: -1;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .bast-print-area,
          .bast-print-area * {
            visibility: visible !important;
          }

          .bast-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            z-index: 999999 !important;
          }

          .bast-document {
            position: relative !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 17mm 19mm 15mm !important;
            margin: 0 !important;
            font-size: 10pt !important;
            box-shadow: none !important;
          }

          .bast-header {
            min-height: 26mm !important;
          }

          .bast-header img {
            top: -17mm !important;
            right: -19mm !important;
            width: 33mm !important;
            max-width: none !important;
          }

          .bast-document-page-one {
            break-after: page !important;
            page-break-after: always !important;
          }

          .bast-document-page-two {
            break-before: page !important;
            page-break-before: always !important;
            min-height: 297mm !important;
            padding-top: 20mm !important;
          }

          .bast-party,
          .bast-signature {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </main>
  );
}
