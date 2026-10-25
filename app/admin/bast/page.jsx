"use client";

import { useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Eye,
  Printer,
  FileDown,
  X,
  ArrowLeft,
  UserRound,
  FileText,
  ChevronDown,
  Loader2,
} from "lucide-react";

const RELATION_OPTIONS = ["ISTRI", "AYAH KANDUNG", "IBU KANDUNG", "LAINNYA"];

const COLLATERAL_OPTIONS = ["SHM", "SHBG", "SHM ELEKTRONIK / SHM E", "BPKB"];

const today = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};

const createRelatedParty = () => ({
  id: crypto.randomUUID(),
  hubungan: "ISTRI",
  hubunganLainnya: "",
  nama: "",
  nik: "",
  jalan: "",
  rt: "",
  rw: "",
  desa: "",
  kecamatan: "",
  kabupaten: "",
});

const createCollateral = () => ({
  id: crypto.randomUUID(),
  jenis: "SHM",
  nomor: "",
  desa: "",
  namaPemilik: "",
  tanggalPembukuan: "",
  luas: "",
});

const initialDebtor = {
  nama: "",
  nik: "",
  jalan: "",
  rt: "",
  rw: "",
  desa: "",
  kecamatan: "",
  kabupaten: "",
};

function formatNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function addressText(person) {
  if (!person) return "-";

  const parts = [];

  if (person.jalan?.trim()) parts.push(person.jalan.trim());

  const rtRw = [
    person.rt?.trim() ? `RT ${person.rt.trim()}` : "",
    person.rw?.trim() ? `RW ${person.rw.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" / ");

  if (rtRw) parts.push(rtRw);
  if (person.desa?.trim()) parts.push(`Desa ${person.desa.trim()}`);
  if (person.kecamatan?.trim()) {
    parts.push(`Kecamatan ${person.kecamatan.trim()}`);
  }
  if (person.kabupaten?.trim()) {
    parts.push(`Kabupaten ${person.kabupaten.trim()}`);
  }

  return parts.length ? parts.join(", ") : "-";
}

function relationLabel(person) {
  if (person.hubungan === "LAINNYA") {
    return person.hubunganLainnya.trim() || "Lainnya";
  }

  return person.hubungan;
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
  className = "",
  maxLength,
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SectionHeading({ number, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-800">
        {number}
      </div>

      <div className="min-w-0">
        <h2 className="text-base font-bold text-zinc-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function AddressFields({ value, onChange, prefix = "" }) {
  const update = (key, nextValue) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        label="Alamat jalan (opsional)"
        value={value.jalan}
        onChange={(v) => update("jalan", v)}
        placeholder="Nama jalan / dusun"
        className="sm:col-span-2"
      />
      <Field
        label="RT"
        value={value.rt}
        onChange={(v) => update("rt", v)}
        placeholder="Contoh: 006"
      />
      <Field
        label="RW"
        value={value.rw}
        onChange={(v) => update("rw", v)}
        placeholder="Contoh: 002"
      />
      <Field
        label="Desa / Kelurahan"
        value={value.desa}
        onChange={(v) => update("desa", v)}
        placeholder="Nama desa"
        required
      />
      <Field
        label="Kecamatan"
        value={value.kecamatan}
        onChange={(v) => update("kecamatan", v)}
        placeholder="Nama kecamatan"
        required
      />
      <Field
        label="Kabupaten / Kota"
        value={value.kabupaten}
        onChange={(v) => update("kabupaten", v)}
        placeholder="Nama kabupaten"
        required
      />
    </div>
  );
}

function IdentityFields({ value, onChange, prefix = "" }) {
  const update = (key, nextValue) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Nama lengkap"
          value={value.nama}
          onChange={(v) => update("nama", v)}
          placeholder="Nama sesuai identitas"
          required
        />
        <Field
          label="NIK"
          value={value.nik}
          onChange={(v) => update("nik", v.replace(/\D/g, "").slice(0, 16))}
          placeholder="16 digit NIK"
          required
          maxLength={16}
        />
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <p className="mb-3 text-sm font-semibold text-zinc-700">
          Alamat lengkap
        </p>
        <AddressFields value={value} onChange={onChange} prefix={prefix} />
      </div>
    </div>
  );
}

function CollateralCard({ item, index, onChange, onRemove, canRemove }) {
  const update = (key, value) => {
    onChange({ ...item, [key]: value });
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-sm font-bold text-amber-800">
            {index + 1}
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              Agunan {index + 1}
            </h3>
            <p className="text-xs text-zinc-500">Isi sesuai dokumen agunan</p>
          </div>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Hapus
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            Jenis agunan <span className="text-red-500">*</span>
          </span>
          <div className="relative">
            <select
              value={item.jenis}
              onChange={(e) => update("jenis", e.target.value)}
              className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              {COLLATERAL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
          </div>
        </label>

        <Field
          label="Nomor dokumen agunan"
          value={item.nomor}
          onChange={(v) => update("nomor", v)}
          placeholder="Nomor SHM / SHBG / BPKB"
          required
        />

        <Field
          label="Desa lokasi agunan"
          value={item.desa}
          onChange={(v) => update("desa", v)}
          placeholder="Nama desa saja"
          required
        />

        <Field
          label="Nama pemilik agunan"
          value={item.namaPemilik}
          onChange={(v) => update("namaPemilik", v)}
          placeholder="Nama sesuai dokumen"
          required
        />

        <Field
          label="Tanggal pembukuan"
          type="date"
          value={item.tanggalPembukuan}
          onChange={(v) => update("tanggalPembukuan", v)}
        />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            Luas agunan
          </span>
          <div className="flex overflow-hidden rounded-lg border border-zinc-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(item.luas)}
              onChange={(e) =>
                update("luas", e.target.value.replace(/\D/g, ""))
              }
              placeholder="Contoh: 2.000"
              className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none"
            />
            <span className="flex items-center border-l border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-600">
              M²
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}

function BASTDocument({
  nomorBast,
  tanggalBast,
  debtor,
  relatedParties,
  collaterals,
}) {
  return (
    <article className="bast-page">
      <header className="bast-letterhead">
        <div className="bast-logo-wrap">
          <img
            src="/images/mandiri-logo.png"
            alt="Bank Mandiri"
            className="bast-logo"
          />
        </div>

        <div className="bast-bank-heading">
          <div className="bast-bank-name">PT BANK MANDIRI (PERSERO) Tbk.</div>
          <div>Kantor Cabang Mikro / Mandiri Mitra Usaha</div>
          <div>Jambi Kuamang Kuning</div>
          <div>Jl. Batanghari RT.06/02</div>
          <div>Desa Purwasari, Kecamatan Pelepat Ilir</div>
          <div>Bungo - Jambi</div>
          <div>Telp.: 07477326156 / Fax.: 07477326157</div>
        </div>
      </header>

      <div className="bast-header-rule" />

      <div className="bast-number-date">
        <div>
          <span>Nomor BAST</span>
          <span>:</span>
          <strong>{nomorBast || "................................"}</strong>
        </div>
        <div>
          <span>Tanggal</span>
          <span>:</span>
          <strong>{formatDate(tanggalBast)}</strong>
        </div>
      </div>

      <h1 className="bast-title">
        BERITA ACARA SERAH TERIMA
        <br />
        AGUNAN KREDIT LUNAS
      </h1>

      <p className="bast-intro">
        Pada hari ini, tanggal <strong>{formatDate(tanggalBast)}</strong>,
        dibuat Berita Acara Serah Terima Agunan Kredit Lunas dengan identitas
        debitur dan rincian agunan sebagai berikut.
      </p>

      <section className="bast-doc-section">
        <h2>A. IDENTITAS DEBITUR</h2>
        <table className="bast-identity-table">
          <tbody>
            <tr>
              <td>Nama debitur</td>
              <td>:</td>
              <td>{debtor.nama || "-"}</td>
            </tr>
            <tr>
              <td>NIK</td>
              <td>:</td>
              <td>{debtor.nik || "-"}</td>
            </tr>
            <tr>
              <td>Alamat</td>
              <td>:</td>
              <td>{addressText(debtor)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="bast-doc-section">
        <h2>B. DATA PIHAK TERKAIT</h2>

        {relatedParties.length === 0 ? (
          <p className="bast-empty-note">Tidak ada pihak terkait.</p>
        ) : (
          <table className="bast-table">
            <thead>
              <tr>
                <th className="bast-col-no">No.</th>
                <th className="bast-col-relation">Hubungan</th>
                <th className="bast-col-person">Nama / NIK</th>
                <th>Alamat</th>
              </tr>
            </thead>
            <tbody>
              {relatedParties.map((person, index) => (
                <tr key={person.id}>
                  <td className="bast-center">{index + 1}</td>
                  <td>{relationLabel(person)}</td>
                  <td>
                    <strong>{person.nama || "-"}</strong>
                    <div className="bast-subtext">NIK: {person.nik || "-"}</div>
                  </td>
                  <td>{addressText(person)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bast-doc-section">
        <h2>C. RINCIAN AGUNAN</h2>

        <table className="bast-table bast-collateral-table">
          <thead>
            <tr>
              <th className="bast-col-no">No.</th>
              <th>Jenis / Nomor Agunan</th>
              <th>Desa Lokasi</th>
              <th>Nama Pemilik</th>
              <th>Tanggal Pembukuan</th>
              <th>Luas</th>
            </tr>
          </thead>
          <tbody>
            {collaterals.map((item, index) => (
              <tr key={item.id}>
                <td className="bast-center">{index + 1}</td>
                <td>
                  <strong>{item.jenis || "-"}</strong>
                  <div className="bast-subtext">Nomor: {item.nomor || "-"}</div>
                </td>
                <td>{item.desa || "-"}</td>
                <td>{item.namaPemilik || "-"}</td>
                <td>{formatDate(item.tanggalPembukuan)}</td>
                <td className="bast-center">
                  {item.luas ? `${formatNumber(item.luas)} M²` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="bast-closing">
        Demikian Berita Acara Serah Terima Agunan Kredit Lunas ini dibuat dengan
        sebenarnya untuk dipergunakan sebagaimana mestinya.
      </p>

      <div className="bast-signature-grid">
        <div className="bast-signature">
          <div>PIHAK YANG MENYERAHKAN</div>
          <div className="bast-signature-space" />
          <div className="bast-signature-line" />
          <div className="bast-signature-caption">Nama dan tanda tangan</div>
        </div>

        <div className="bast-signature">
          <div>PIHAK YANG MENERIMA</div>
          <div className="bast-signature-space" />
          <div className="bast-signature-line" />
          <div className="bast-signature-caption">Nama dan tanda tangan</div>
        </div>
      </div>

      <footer className="bast-document-footer">
        Dokumen BAST Penyerahan Agunan Lunas
      </footer>
    </article>
  );
}

export default function BastPage() {
  const [nomorBast, setNomorBast] = useState("");
  const [tanggalBast, setTanggalBast] = useState(today);
  const [debtor, setDebtor] = useState(initialDebtor);
  const [relatedParties, setRelatedParties] = useState([]);
  const [collaterals, setCollaterals] = useState([createCollateral()]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printAreaRef = useRef(null);

  const completeCollaterals = useMemo(
    () => collaterals.filter((item) => item.jenis || item.nomor),
    [collaterals],
  );

  const updateRelated = (id, nextValue) => {
    setRelatedParties((current) =>
      current.map((item) => (item.id === id ? nextValue : item)),
    );
  };

  const updateCollateral = (id, nextValue) => {
    setCollaterals((current) =>
      current.map((item) => (item.id === id ? nextValue : item)),
    );
  };

  const validateForm = () => {
    if (!nomorBast.trim()) {
      alert("Nomor BAST harus diisi.");
      return false;
    }

    if (!tanggalBast) {
      alert("Tanggal BAST harus diisi.");
      return false;
    }

    if (!debtor.nama.trim()) {
      alert("Nama debitur harus diisi.");
      return false;
    }

    if (!/^\d{16}$/.test(debtor.nik)) {
      alert("NIK debitur harus terdiri dari 16 digit.");
      return false;
    }

    if (
      !debtor.desa.trim() ||
      !debtor.kecamatan.trim() ||
      !debtor.kabupaten.trim()
    ) {
      alert("Desa, kecamatan, dan kabupaten debitur harus diisi.");
      return false;
    }

    if (relatedParties.some((person) => !person.nama.trim())) {
      alert("Lengkapi nama setiap pihak terkait atau hapus barisnya.");
      return false;
    }

    if (relatedParties.some((person) => !/^\d{16}$/.test(person.nik))) {
      alert("NIK setiap pihak terkait harus terdiri dari 16 digit.");
      return false;
    }

    if (collaterals.length === 0) {
      alert("Tambahkan setidaknya satu agunan.");
      return false;
    }

    for (let index = 0; index < collaterals.length; index += 1) {
      const item = collaterals[index];

      if (
        !item.jenis ||
        !item.nomor.trim() ||
        !item.desa.trim() ||
        !item.namaPemilik.trim()
      ) {
        alert(
          `Lengkapi jenis, nomor, desa, dan pemilik pada Agunan ${index + 1}.`,
        );
        return false;
      }
    }

    return true;
  };

  const openPreview = () => {
    if (!validateForm()) return;
    setPreviewOpen(true);
  };

  const downloadPdf = async () => {
    if (!validateForm()) return;

    setDownloading(true);

    try {
      const module = await import("jspdf-html2canvas");
      const html2PDF = module.default || module;
      const area = printAreaRef.current;

      if (!area) throw new Error("Area dokumen belum tersedia.");

      await html2PDF(area, {
        jsPDF: {
          format: "a4",
          orientation: "portrait",
          unit: "mm",
          margin: 0,
        },
        imageType: "image/jpeg",
        imageQuality: 0.98,
        output: `BAST-Agunan-Lunas-${nomorBast.trim().replace(/[^\w-]/g, "-")}.pdf`,
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
        },
      });
    } catch (error) {
      console.error("Gagal membuat PDF BAST:", error);
      alert(
        "PDF belum berhasil dibuat. Gunakan tombol Cetak, lalu pilih Simpan sebagai PDF.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const printDocument = () => {
    if (!validateForm()) return;

    setPreviewOpen(false);

    window.setTimeout(() => {
      window.print();
    }, 150);
  };

  const documentProps = {
    nomorBast,
    tanggalBast,
    debtor,
    relatedParties,
    collaterals,
  };

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              <FileText size={22} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  BAST Penyerahan Agunan Lunas
                </h1>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Input manual
                </span>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                Isi data, periksa preview, kemudian unduh atau cetak dokumen.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPreview}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              <Eye size={16} />
              Preview BAST
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              number="01"
              title="Informasi BAST"
              description="Nomor dan tanggal yang akan ditampilkan pada dokumen."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Nomor BAST"
                value={nomorBast}
                onChange={setNomorBast}
                placeholder="Masukkan nomor BAST"
                required
              />
              <Field
                label="Tanggal BAST"
                type="date"
                value={tanggalBast}
                onChange={setTanggalBast}
                required
              />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              number="02"
              title="Identitas Debitur"
              description="Identitas dan alamat lengkap debitur."
            />

            <IdentityFields value={debtor} onChange={setDebtor} />
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              number="03"
              title="Data Pihak Terkait"
              description="Tambahkan istri, ayah kandung, ibu kandung, atau pihak lainnya. Bagian ini boleh dikosongkan."
            />

            <div className="space-y-4">
              {relatedParties.map((person, index) => (
                <div
                  key={person.id}
                  className="rounded-xl border border-zinc-200 p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <UserRound size={17} className="text-blue-700" />
                      <h3 className="text-sm font-bold">
                        Pihak Terkait {index + 1}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setRelatedParties((current) =>
                          current.filter((item) => item.id !== person.id),
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  </div>

                  <label className="mb-4 block">
                    <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                      Hubungan dengan debitur
                    </span>

                    <select
                      value={person.hubungan}
                      onChange={(e) =>
                        updateRelated(person.id, {
                          ...person,
                          hubungan: e.target.value,
                          hubunganLainnya:
                            e.target.value === "LAINNYA"
                              ? person.hubunganLainnya
                              : "",
                        })
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    >
                      {RELATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option === "LAINNYA"
                            ? "Lainnya (isi sendiri)"
                            : option}
                        </option>
                      ))}
                    </select>
                  </label>

                  {person.hubungan === "LAINNYA" && (
                    <div className="mb-4">
                      <Field
                        label="Hubungan lainnya"
                        value={person.hubunganLainnya}
                        onChange={(v) =>
                          updateRelated(person.id, {
                            ...person,
                            hubunganLainnya: v,
                          })
                        }
                        placeholder="Contoh: anak kandung"
                        required
                      />
                    </div>
                  )}

                  <IdentityFields
                    value={person}
                    onChange={(nextValue) =>
                      updateRelated(person.id, nextValue)
                    }
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setRelatedParties((current) => [
                    ...current,
                    createRelatedParty(),
                  ])
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-4 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-50"
              >
                <Plus size={17} />
                Tambah Pihak Terkait
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              number="04"
              title="Data Agunan"
              description="Tambahkan seluruh dokumen agunan yang diserahkan. Setiap agunan dapat memiliki jenis dan luas yang berbeda."
            />

            <div className="space-y-4">
              {collaterals.map((item, index) => (
                <CollateralCard
                  key={item.id}
                  item={item}
                  index={index}
                  onChange={(nextValue) => updateCollateral(item.id, nextValue)}
                  onRemove={() =>
                    setCollaterals((current) =>
                      current.filter((row) => row.id !== item.id),
                    )
                  }
                  canRemove={collaterals.length > 1}
                />
              ))}

              <button
                type="button"
                onClick={() =>
                  setCollaterals((current) => [...current, createCollateral()])
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-50"
              >
                <Plus size={17} />
                Tambah Agunan
              </button>
            </div>
          </section>

          <div className="flex flex-col justify-end gap-3 pb-8 sm:flex-row">
            <button
              type="button"
              onClick={openPreview}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
            >
              <Eye size={17} />
              Preview Dokumen
            </button>

            <button
              type="button"
              onClick={downloadPdf}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <FileDown size={17} />
              )}
              {downloading ? "Membuat PDF..." : "Unduh PDF"}
            </button>

            <button
              type="button"
              onClick={printDocument}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-100"
            >
              <Printer size={17} />
              Cetak
            </button>
          </div>
        </div>
      </div>

      {/* Area dokumen untuk proses unduh PDF dan cetak */}
      <div className="bast-export-area" ref={printAreaRef}>
        <BASTDocument
          {...documentProps}
          relatedParties={relatedParties}
          collaterals={completeCollaterals}
        />
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-zinc-950/80">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-zinc-950 px-4 py-3 text-white sm:px-6">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold sm:text-base">
                Preview BAST Penyerahan Agunan Lunas
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                A4 portrait · Periksa dokumen sebelum dicetak
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={downloadPdf}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60 sm:text-sm"
              >
                {downloading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileDown size={15} />
                )}
                <span className="hidden sm:inline">
                  {downloading ? "Membuat PDF..." : "Unduh PDF"}
                </span>
                <span className="sm:hidden">PDF</span>
              </button>

              <button
                type="button"
                onClick={printDocument}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 sm:text-sm"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">Cetak</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Tutup preview"
                className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 sm:p-6">
            <div className="mx-auto w-full max-w-[794px]">
              <BASTDocument
                {...documentProps}
                relatedParties={relatedParties}
                collaterals={completeCollaterals}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .bast-page {
          position: relative;
          box-sizing: border-box;
          width: 794px;
          min-height: 1123px;
          margin: 0 auto;
          padding: 44px 52px 40px;
          background: #ffffff;
          color: #171717;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          line-height: 1.45;
        }

        .bast-letterhead {
          display: grid;
          grid-template-columns: 125px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .bast-logo-wrap {
          padding-top: 6px;
        }

        .bast-logo {
          display: block;
          width: 120px;
          height: auto;
          object-fit: contain;
        }

        .bast-bank-heading {
          font-size: 12px;
          line-height: 1.45;
        }

        .bast-bank-name {
          margin-bottom: 2px;
          font-size: 14px;
          font-weight: 700;
        }

        .bast-header-rule {
          height: 3px;
          margin-top: 14px;
          border-top: 2px solid #222;
          border-bottom: 1px solid #222;
        }

        .bast-number-date {
          display: grid;
          gap: 3px;
          margin-top: 19px;
          font-size: 12.5px;
        }

        .bast-number-date > div {
          display: grid;
          grid-template-columns: 105px 12px minmax(0, 1fr);
          gap: 2px;
        }

        .bast-title {
          margin: 24px 0 17px;
          text-align: center;
          font-size: 17px;
          font-weight: 700;
          line-height: 1.4;
          letter-spacing: 0.15px;
        }

        .bast-intro {
          margin: 0 0 17px;
          text-align: justify;
          font-size: 12.5px;
          line-height: 1.65;
        }

        .bast-doc-section {
          margin-top: 16px;
          break-inside: auto;
        }

        .bast-doc-section h2 {
          margin: 0 0 7px;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.1px;
        }

        .bast-identity-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
        }

        .bast-identity-table td {
          padding: 3px 2px;
          vertical-align: top;
          overflow-wrap: anywhere;
        }

        .bast-identity-table td:first-child {
          width: 125px;
        }

        .bast-identity-table td:nth-child(2) {
          width: 14px;
        }

        .bast-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 10.5px;
          line-height: 1.4;
        }

        .bast-table th,
        .bast-table td {
          border: 1px solid #333;
          padding: 7px 6px;
          vertical-align: top;
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .bast-table th {
          background: #f4f4f4;
          font-size: 10px;
          font-weight: 700;
          text-align: center;
          vertical-align: middle;
        }

        .bast-table thead {
          display: table-header-group;
        }

        .bast-table tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .bast-col-no {
          width: 36px;
        }

        .bast-col-relation {
          width: 100px;
        }

        .bast-col-person {
          width: 145px;
        }

        .bast-collateral-table {
          font-size: 10.5px;
        }

        .bast-collateral-table th:nth-child(1) {
          width: 35px;
        }

        .bast-collateral-table th:nth-child(2) {
          width: 155px;
        }

        .bast-collateral-table th:nth-child(3) {
          width: 83px;
        }

        .bast-collateral-table th:nth-child(4) {
          width: 105px;
        }

        .bast-collateral-table th:nth-child(5) {
          width: 105px;
        }

        .bast-collateral-table th:nth-child(6) {
          width: 65px;
        }

        .bast-center {
          text-align: center;
          vertical-align: middle !important;
        }

        .bast-subtext {
          margin-top: 3px;
          font-size: 9.5px;
          line-height: 1.35;
        }

        .bast-empty-note {
          padding: 7px 0;
          font-size: 11.5px;
          font-style: italic;
        }

        .bast-closing {
          margin-top: 23px;
          text-align: justify;
          font-size: 12px;
          line-height: 1.6;
        }

        .bast-signature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 45px;
          margin-top: 28px;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .bast-signature {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
        }

        .bast-signature-space {
          height: 82px;
        }

        .bast-signature-line {
          width: 85%;
          margin: 0 auto;
          border-bottom: 1px solid #333;
        }

        .bast-signature-caption {
          margin-top: 5px;
          font-size: 10px;
          font-weight: 400;
        }

        .bast-document-footer {
          margin-top: 34px;
          border-top: 1px solid #ddd;
          padding-top: 7px;
          color: #777;
          font-size: 9px;
          text-align: center;
        }

        .bast-export-area {
          position: fixed;
          top: 0;
          left: -20000px;
          width: 794px;
          background: white;
          z-index: -1;
        }

        .bast-export-area .bast-page {
          margin: 0;
        }

        @media (max-width: 820px) {
          .bast-page {
            transform-origin: top left;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            width: 210mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .bast-export-area,
          .bast-export-area * {
            visibility: visible !important;
          }

          .bast-export-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            z-index: 999999 !important;
          }

          .bast-export-area .bast-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 12mm 14mm 10mm !important;
            box-shadow: none !important;
            transform: none !important;
            overflow: visible !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .bast-table th {
            background: #f4f4f4 !important;
          }

          .bast-doc-section {
            break-inside: auto;
          }

          .bast-table tr,
          .bast-signature-grid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .bast-export-area .bast-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
    </main>
  );
}
