"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUnit } from "@/components/UnitContext";
import {
  Archive,
  AlertCircle,
  ChevronRight,
  FileSpreadsheet,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
  Download,
  MessageCircle,
  ClipboardList,
} from "lucide-react";
import * as XLSX from "xlsx";

const EMPTY_FORM = {
  nama_debitur: "",
  jaminan_utama: "",
  moral_obligasi: "",
  nama_mks: "",
  nomor_pk: "",
  nomor_rekening_pinjaman: "",
  nik_debitur: "",
  nama_pasangan: "",
  nik_pasangan: "",
  nomor_bast: "",
  jenis_pinjaman: "",
  limit_pinjaman: "",
  keterangan_warning: "",
  bundel_agunan: "",
  pihak_lain: [],
  pengambil_agunan: [],
};
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const LABEL = "mb-1.5 block text-xs font-semibold text-slate-600";

function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <input
        className={INPUT}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <select
        className={INPUT}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
function formatLimit(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })} juta`;
}
function formatValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function PeopleEditor({ title, people, onChange, addLabel }) {
  function update(index, key, value) {
    onChange(
      people.map((person, i) =>
        i === index ? { ...person, [key]: value } : person,
      ),
    );
  }
  function remove(index) {
    onChange(people.filter((_, i) => i !== index));
  }
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Bisa ditambahkan lebih dari satu orang.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...people, { nama: "", nik: "" }])}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
        >
          <Plus size={14} />
          {addLabel}
        </button>
      </div>
      {people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
          Belum ada data.
        </div>
      ) : (
        <div className="space-y-2">
          {people.map((person, index) => (
            <div key={index} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  Orang ke-{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-xs font-semibold text-red-600"
                >
                  Hapus
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field
                  label="Nama lengkap"
                  value={person.nama}
                  onChange={(v) => update(index, "nama", v)}
                  placeholder="Nama lengkap"
                />
                <Field
                  label="NIK"
                  value={person.nik}
                  onChange={(v) => update(index, "nik", v)}
                  placeholder="NIK (opsional)"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FormModal({ item, unit, mksOptions, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(item || {}),
    limit_pinjaman:
      item?.limit_pinjaman == null ? "" : String(item.limit_pinjaman),
    bundel_agunan:
      item?.bundel_agunan == null ? "" : String(item.bundel_agunan),
    pihak_lain: (item?.pihak_lain || []).map((p) => ({
      nama: p.nama || "",
      nik: p.nik || "",
    })),
    pengambil_agunan: (item?.pengambil_agunan || []).map((p) => ({
      nama: p.nama || "",
      nik: p.nik || "",
    })),
  }));
  const change = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  function submit(event) {
    event.preventDefault();
    if (!form.nama_debitur.trim()) return alert("Nama Debitur wajib diisi.");
    if (form.pihak_lain.some((p) => !p.nama.trim()))
      return alert("Lengkapi nama pihak lain atau hapus baris kosong.");
    if (form.pengambil_agunan.some((p) => !p.nama.trim()))
      return alert("Lengkapi nama pengambil agunan atau hapus baris kosong.");
    onSave({
      ...form,
      unit_excel: unit,
      limit_pinjaman: form.limit_pinjaman.trim(),
      bundel_agunan: form.bundel_agunan,
      pihak_lain: form.pihak_lain.filter((p) => p.nama.trim()),
      pengambil_agunan: form.pengambil_agunan.filter((p) => p.nama.trim()),
    });
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-bold text-slate-900">
              {item ? "Edit Data Agunan Lunas" : "Tambah Data Agunan Lunas"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Unit: {unit}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>
        <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-5">
            <section>
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                Informasi Utama
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Nama Debitur *"
                  value={form.nama_debitur}
                  onChange={(v) => change("nama_debitur", v)}
                />
                <Field
                  label="Jaminan Utama"
                  value={form.jaminan_utama}
                  onChange={(v) => change("jaminan_utama", v)}
                />
                <Field
                  label="Moral Obligasi"
                  value={form.moral_obligasi}
                  onChange={(v) => change("moral_obligasi", v)}
                />
                <SelectField
                  label="Nama MKS"
                  value={form.nama_mks}
                  onChange={(v) => change("nama_mks", v)}
                >
                  <option value="">Pilih MKS</option>
                  {mksOptions.map((mks) => (
                    <option key={mks.id} value={mks.nama}>
                      {mks.nama}
                    </option>
                  ))}
                  {form.nama_mks &&
                    !mksOptions.some((mks) => mks.nama === form.nama_mks) && (
                      <option value={form.nama_mks}>
                        {form.nama_mks} (tidak aktif / tidak ada di master)
                      </option>
                    )}
                </SelectField>
                <SelectField
                  label="Bundel Agunan"
                  value={form.bundel_agunan}
                  onChange={(v) => change("bundel_agunan", v)}
                >
                  <option value="">Pilih Bundel</option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </SelectField>
                <Field
                  label="Nomor PK"
                  value={form.nomor_pk}
                  onChange={(v) => change("nomor_pk", v)}
                />
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                Data Pinjaman
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectField
                  label="Jenis Pinjaman"
                  value={form.jenis_pinjaman}
                  onChange={(v) => change("jenis_pinjaman", v)}
                >
                  <option value="">Pilih jenis pinjaman</option>
                  <option value="KUR">KUR</option>
                  <option value="KUM">KUM</option>
                </SelectField>
                <Field
                  label="Limit Pinjaman (juta rupiah)"
                  value={form.limit_pinjaman}
                  onChange={(v) => change("limit_pinjaman", v)}
                  placeholder="Contoh: 200 atau 150,6"
                />
                <Field
                  label="Nomor Rekening Pinjaman"
                  value={form.nomor_rekening_pinjaman}
                  onChange={(v) => change("nomor_rekening_pinjaman", v)}
                  placeholder="Input nomor rekening pinjaman"
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                200 berarti Rp200.000.000; 150,6 berarti Rp150.600.000.
              </p>
            </section>
            <section>
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                Identitas Debitur
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="NIK Debitur"
                  value={form.nik_debitur}
                  onChange={(v) => change("nik_debitur", v)}
                />
                <Field
                  label="Nama Pasangan"
                  value={form.nama_pasangan}
                  onChange={(v) => change("nama_pasangan", v)}
                />
                <Field
                  label="NIK Pasangan"
                  value={form.nik_pasangan}
                  onChange={(v) => change("nik_pasangan", v)}
                />
                <Field
                  label="Nomor BAST"
                  value={form.nomor_bast}
                  onChange={(v) => change("nomor_bast", v)}
                />
              </div>
            </section>
            <PeopleEditor
              title="Pihak Lain"
              people={form.pihak_lain}
              onChange={(v) => change("pihak_lain", v)}
              addLabel="Tambah Pihak"
            />
            <PeopleEditor
              title="Nama yang Bisa Mengambil Agunan"
              people={form.pengambil_agunan}
              onChange={(v) => change("pengambil_agunan", v)}
              addLabel="Tambah Orang"
            />
            <section>
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                Keterangan / Warning
              </h3>
              <label className="block">
                <span className={LABEL}>
                  Catatan yang akan terlihat pada daftar/detail
                </span>
                <textarea
                  rows={3}
                  className={INPUT}
                  value={form.keterangan_warning || ""}
                  onChange={(e) => change("keterangan_warning", e.target.value)}
                  placeholder="Isi catatan atau warning jika ada..."
                />
              </label>
            </section>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailModal({ item, isAdmin, onClose, onEdit, onDelete }) {
  const rows = [
    ["Unit", item.unit_excel],
    ...(item.jaminan_utama?.trim()
      ? [["Jaminan Utama", item.jaminan_utama]]
      : []),
    ...(item.moral_obligasi?.trim()
      ? [["Moral Obligasi", item.moral_obligasi]]
      : []),
    ["Nama MKS", item.nama_mks],
    ["Bundel Agunan", item.bundel_agunan],
    ["Nomor PK", item.nomor_pk],
    ["Jenis Pinjaman", item.jenis_pinjaman],
    ["Limit Pinjaman", formatLimit(item.limit_pinjaman)],
    ["NIK Debitur", item.nik_debitur],
    ["Nama Pasangan", item.nama_pasangan],
    ["NIK Pasangan", item.nik_pasangan],
    ["Nomor BAST", item.nomor_bast],
  ];
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-semibold text-slate-400">
              DETAIL AGUNAN LUNAS
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {item.nama_debitur}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Rekening Pinjaman: {formatValue(item.nomor_rekening_pinjaman)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>
        <div className="space-y-5 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-medium text-slate-400">
                  {label}
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                  {formatValue(value)}
                </p>
              </div>
            ))}
          </div>
          {item.keterangan_warning && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="mb-1 flex items-center gap-2 font-bold">
                <AlertCircle size={15} />
                Keterangan
              </div>
              <p className="whitespace-pre-wrap">{item.keterangan_warning}</p>
            </div>
          )}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Users size={16} />
              Pihak Lain
            </h3>
            {item.pihak_lain?.length ? (
              <div className="space-y-2">
                {item.pihak_lain.map((p, i) => (
                  <div
                    key={p.id || i}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <p className="text-sm font-semibold">{p.nama}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      NIK: {formatValue(p.nik)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Belum ada pihak lain.</p>
            )}
          </section>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <UserRound size={16} />
              Nama yang Bisa Mengambil Agunan
            </h3>
            {item.pengambil_agunan?.length ? (
              <div className="space-y-2">
                {item.pengambil_agunan.map((p, i) => (
                  <div
                    key={p.id || i}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <p className="text-sm font-semibold">
                      {i + 1}. {p.nama}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      NIK: {formatValue(p.nik)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Belum ditentukan.</p>
            )}
          </section>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          {isAdmin && (
            <>
              <button
                onClick={() => onDelete(item)}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600"
              >
                <Trash2 size={15} />
                Hapus
              </button>
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              >
                <Pencil size={15} />
                Edit Data
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareModal({ unit, options, data, onClose, onShare }) {
  const [mks, setMks] = useState("");
  const count = data.filter((item) => item.nama_mks === mks).length;
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Kirim Daftar Agunan via WhatsApp
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Pilih MKS. Gambar hanya berisi nama debitur, jaminan utama, dan
              moral obligasi.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">
          <label className={LABEL}>Nama MKS</label>
          <select
            className={INPUT}
            value={mks}
            onChange={(e) => setMks(e.target.value)}
          >
            <option value="">Pilih MKS</option>
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">
            {mks ? `${count} data akan dimasukkan ke gambar.` : `Unit ${unit}`}
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
          >
            Batal
          </button>
          <button
            disabled={!mks || count === 0}
            onClick={() => onShare(mks)}
            className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <MessageCircle size={16} />
            Buat Gambar & Kirim
          </button>
        </div>
      </div>
    </div>
  );
}

function OpnameModal({ unit, staffOptions, onClose, onPrint }) {
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [pemeriksa, setPemeriksa] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [petugasId, setPetugasId] = useState("");
  const [tanggal, setTanggal] = useState(localToday);

  const unitLabel = ["JKK2", "11081B"].includes(unit)
    ? "KCP JAMBI KUAMANG KUNING UNIT 2"
    : "KCP JAMBI KUAMANG KUNING UNIT 1";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-xl rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Proses Opname Agunan Lunas
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {unitLabel}. PDF A4 mengikuti format laporan Stock Opname Agunan
              Kredit Mikro. Setelah dibuka, pilih Save as PDF / Simpan sebagai
              PDF.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Unit yang dicetak
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">{unitLabel}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Mengikuti unit aktif pada pilihan unit JOSJIS.
            </p>
          </div>
          <Field
            label="Hari / Tanggal Stock Opname"
            value={tanggal}
            onChange={setTanggal}
            type="date"
          />
          <Field
            label="Nama Pemeriksa"
            value={pemeriksa}
            onChange={setPemeriksa}
            placeholder="Nama pemeriksa"
          />
          <div className="sm:col-span-2">
            <Field
              label="Jabatan Pemeriksa"
              value={jabatan}
              onChange={setJabatan}
              placeholder="Contoh: BM JUJUHAN"
            />
          </div>
          <div className="sm:col-span-2">
            <SelectField
              label="Nama MKA / Admin Unit"
              value={petugasId}
              onChange={setPetugasId}
            >
              <option value="">Pilih MKA / Admin {unit}</option>
              {staffOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.nama}
                  {person.jabatan ? ` — ${person.jabatan}` : ""} ({person.tipe})
                </option>
              ))}
            </SelectField>
            {staffOptions.length === 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Master MKA/Admin untuk unit ini belum tersedia. Periksa data
                pegawai dan akun admin di master data.
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
          >
            Batal
          </button>
          <button
            onClick={() => onPrint({ pemeriksa, jabatan, petugasId, tanggal })}
            disabled={!staffOptions.length || !tanggal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Download size={16} />
            Unduh PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgunanLunasPage() {
  const { activeUnit } = useUnit();
  const unitCode = activeUnit?.value || "JKK1";
  const [data, setData] = useState([]);
  const [role, setRole] = useState(null);
  const [mksOptions, setMksOptions] = useState([]);
  const [opnameOptions, setOpnameOptions] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [modalItem, setModalItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showOpname, setShowOpname] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [importMessage, setImportMessage] = useState("");
  const isAdmin = role === "ADMIN";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/agunan-lunas?unit=${encodeURIComponent(unitCode)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Data gagal dimuat.");
      setData(result.data || []);
      setRole(result.role || null);
      setMksOptions(
        Array.isArray(result.mks_options) ? result.mks_options : [],
      );
      setOpnameOptions(
        Array.isArray(result.opname_options) ? result.opname_options : [],
      );
    } catch (err) {
      setData([]);
      setMksOptions([]);
      setOpnameOptions([]);
      setError(err.message || "Terjadi kesalahan saat mengambil data.");
    } finally {
      setLoading(false);
    }
  }, [unitCode]);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("id");
    const matched = keyword
      ? data.filter((item) =>
          String(item.nama_debitur || "")
            .toLocaleLowerCase("id")
            .includes(keyword),
        )
      : data;
    return [...matched].sort((a, b) => {
      const aNo = Number(a.nomor_urut);
      const bNo = Number(b.nomor_urut);
      const aValid = Number.isFinite(aNo);
      const bValid = Number.isFinite(bNo);
      if (aValid && bValid && aNo !== bNo) return aNo - bNo;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return String(a.nama_debitur || "").localeCompare(
        String(b.nama_debitur || ""),
        "id",
      );
    });
  }, [data, search]);

  function submitNameSearch(event) {
    event?.preventDefault?.();
    setSearch(searchInput.trim());
  }

  function clearNameSearch() {
    setSearchInput("");
    setSearch("");
  }
  const summary = useMemo(
    () => ({
      total: data.length,
      kur: data.filter((i) => i.jenis_pinjaman === "KUR").length,
      kum: data.filter((i) => i.jenis_pinjaman === "KUM").length,
    }),
    [data],
  );
  const shareMksOptions = useMemo(
    () =>
      [
        ...new Set([
          ...mksOptions.map((m) => m.nama),
          ...data.map((d) => d.nama_mks).filter(Boolean),
        ]),
      ].sort((a, b) => a.localeCompare(b, "id")),
    [mksOptions, data],
  );

  async function saveData(form) {
    setSaving(true);
    try {
      const editing = Boolean(modalItem?.id);
      const response = await fetch("/api/admin/agunan-lunas", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...form, id: modalItem.id } : form),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Data gagal disimpan.");
      setShowForm(false);
      setModalItem(null);
      setSelected(null);
      await loadData();
      alert(result.message || "Data berhasil disimpan.");
    } catch (err) {
      alert(err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setSaving(false);
    }
  }
  async function deleteData(item) {
    if (
      !window.confirm(
        `Hapus data ${item.nama_debitur} dari daftar Agunan Lunas?`,
      )
    )
      return;
    try {
      const response = await fetch(
        `/api/admin/agunan-lunas?id=${encodeURIComponent(item.id)}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Data gagal dihapus.");
      setSelected(null);
      await loadData();
      alert("Data berhasil dihapus.");
    } catch (err) {
      alert(err.message || "Terjadi kesalahan saat menghapus data.");
    }
  }
  async function importExcel(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !window.confirm(
        `Impor data dari file "${file.name}" ke unit sesuai kolom Excel?`,
      )
    )
      return;
    setImporting(true);
    setImportErrors([]);
    setImportMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/agunan-lunas/import", {
        method: "POST",
        body,
      });
      const result = await response.json();
      setImportErrors(result.errors || []);
      if (!response.ok || !result.success)
        throw new Error(result.message || "Impor Excel gagal.");
      setImportMessage(result.message || "Impor berhasil.");
      await loadData();
    } catch (err) {
      setImportMessage(err.message || "Impor Excel gagal.");
    } finally {
      setImporting(false);
    }
  }
  function exportExcel() {
    if (!data.length) return alert("Tidak ada data untuk diunduh.");
    const sortedData = [...data].sort((a, b) => {
      const aNo = Number(a.nomor_urut);
      const bNo = Number(b.nomor_urut);
      if (Number.isFinite(aNo) && Number.isFinite(bNo) && aNo !== bNo)
        return aNo - bNo;
      if (Number.isFinite(aNo) !== Number.isFinite(bNo))
        return Number.isFinite(aNo) ? -1 : 1;
      return String(a.nama_debitur || "").localeCompare(
        String(b.nama_debitur || ""),
        "id",
      );
    });
    const mainRows = sortedData.map((item) => ({
      "Nomor Urut": item.nomor_urut,
      Unit: item.unit_excel,
      "Nama Debitur": item.nama_debitur,
      "Jaminan Utama": item.jaminan_utama,
      "Moral Obligasi": item.moral_obligasi,
      "Nama MKS": item.nama_mks,
      "Bundel Agunan": item.bundel_agunan,
      "Nomor PK": item.nomor_pk,
      "Nomor Rekening Pinjaman": item.nomor_rekening_pinjaman,
      "NIK Debitur": item.nik_debitur,
      "Nama Pasangan": item.nama_pasangan,
      "NIK Pasangan": item.nik_pasangan,
      "Nomor BAST": item.nomor_bast,
      "Jenis Pinjaman": item.jenis_pinjaman,
      "Limit Pinjaman (Juta)": item.limit_pinjaman,
      "Keterangan / Warning": item.keterangan_warning,
      "Sumber Input": item.sumber_input,
      "Tanggal Dibuat": item.created_at,
      "Terakhir Diperbarui": item.updated_at,
    }));
    const otherRows = sortedData.flatMap((item) =>
      (item.pihak_lain || []).map((person, i) => ({
        "Nomor Urut Debitur": item.nomor_urut,
        "Nama Debitur": item.nama_debitur,
        Urutan: i + 1,
        "Nama Pihak Lain": person.nama,
        NIK: person.nik,
      })),
    );
    const pickupRows = sortedData.flatMap((item) =>
      (item.pengambil_agunan || []).map((person, i) => ({
        "Nomor Urut Debitur": item.nomor_urut,
        "Nama Debitur": item.nama_debitur,
        Urutan: i + 1,
        "Nama yang Bisa Mengambil": person.nama,
        NIK: person.nik,
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(mainRows),
      "Data Agunan",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(otherRows),
      "Pihak Lain",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(pickupRows),
      "Pengambil Agunan",
    );
    XLSX.writeFile(
      workbook,
      `Agunan-Lunas-${unitCode}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  async function createMksImage(mksName) {
    const rows = data
      .filter((item) => item.nama_mks === mksName)
      .sort((a, b) => {
        const aNo = Number(a.nomor_urut);
        const bNo = Number(b.nomor_urut);
        const aValid = Number.isFinite(aNo);
        const bValid = Number.isFinite(bNo);
        if (aValid && bValid && aNo !== bNo) return aNo - bNo;
        if (aValid !== bValid) return aValid ? -1 : 1;
        return String(a.nama_debitur || "").localeCompare(
          String(b.nama_debitur || ""),
          "id",
        );
      });
    if (!rows.length) throw new Error("Tidak ada data untuk MKS yang dipilih.");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const width = 1400,
      margin = 64,
      colWidths = [390, 470, 410];
    const wrap = (text, maxWidth, font) => {
      ctx.font = font;
      const words = String(text || "-").split(/\s+/);
      const lines = [];
      let line = "";
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
      return lines;
    };
    const prepared = rows.map((item) => {
      const cells = [
        item.nama_debitur,
        item.jaminan_utama || "-",
        item.moral_obligasi || "-",
      ];
      const lines = cells.map((v, i) =>
        wrap(v, colWidths[i] - 36, "24px Arial"),
      );
      return {
        cells,
        lines,
        height: Math.max(82, ...lines.map((v) => v.length * 31 + 34)),
      };
    });
    const headerHeight = 230,
      tableHead = 76,
      totalHeight =
        headerHeight +
        tableHead +
        prepared.reduce((sum, row) => sum + row.height, 0) +
        70;
    canvas.width = width;
    canvas.height = totalHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, totalHeight);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 42px Arial";
    ctx.fillText("DAFTAR AGUNAN LUNAS", margin, 82);
    ctx.fillStyle = "#475569";
    ctx.font = "26px Arial";
    ctx.fillText(`${unitCode}  •  MKS: ${mksName}`, margin, 132);
    ctx.font = "22px Arial";
    ctx.fillText(
      `Tanggal: ${new Date().toLocaleDateString("id-ID")}`,
      margin,
      174,
    );
    let y = headerHeight;
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(margin, y, width - margin * 2, tableHead);
    const headers = ["NAMA DEBITUR", "JAMINAN UTAMA", "MORAL OBLIGASI"];
    let x = margin;
    headers.forEach((header, i) => {
      ctx.fillStyle = "#334155";
      ctx.font = "bold 21px Arial";
      ctx.fillText(header, x + 18, y + 46);
      x += colWidths[i];
    });
    y += tableHead;
    for (const row of prepared) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(margin, y, width - margin * 2, row.height);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(margin, y + row.height);
      ctx.lineTo(width - margin, y + row.height);
      ctx.stroke();
      let cx = margin;
      row.lines.forEach((lines, i) => {
        ctx.fillStyle = "#0f172a";
        ctx.font = "24px Arial";
        lines.forEach((line, li) =>
          ctx.fillText(line, cx + 18, y + 42 + li * 31),
        );
        cx += colWidths[i];
      });
      y += row.height;
    }
    ctx.fillStyle = "#64748b";
    ctx.font = "18px Arial";
    ctx.fillText(`Jumlah data: ${rows.length}`, margin, totalHeight - 28);
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Gagal membuat gambar.")),
        "image/png",
      ),
    );
  }

  async function shareByMks(mksName) {
    try {
      const blob = await createMksImage(mksName);
      const file = new File(
        [blob],
        `Agunan-Lunas-${unitCode}-${mksName.replace(/[^a-z0-9]+/gi, "-")}.png`,
        { type: "image/png" },
      );
      const caption = `Daftar Agunan Lunas ${unitCode} - MKS ${mksName}`;
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: caption, text: caption });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${caption}. Gambar sudah diunduh, silakan lampirkan di WhatsApp.`)}`,
          "_blank",
          "noopener,noreferrer",
        );
        alert(
          "Gambar daftar berhasil diunduh. Lampirkan gambar tersebut pada WhatsApp.",
        );
      }
      setShowShare(false);
    } catch (err) {
      if (err?.name !== "AbortError")
        alert(err.message || "Gagal menyiapkan gambar WhatsApp.");
    }
  }

  function printOpname({ pemeriksa, jabatan, petugasId, tanggal }) {
    const selectedStaff = opnameOptions.find(
      (person) => person.id === petugasId,
    );
    if (!pemeriksa.trim() || !jabatan.trim() || !selectedStaff || !tanggal) {
      return alert(
        "Lengkapi tanggal, nama dan jabatan pemeriksa serta pilih MKA/Admin.",
      );
    }

    const escapeHtml = (value) =>
      String(value ?? "-").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      );

    const isJkk2 = ["JKK2", "11081B"].includes(unitCode);
    const unitLabel = isJkk2
      ? "KCP JAMBI KUAMANG KUNING UNIT 2"
      : "KCP JAMBI KUAMANG KUNING UNIT 1";
    const dateObject = new Date(`${tanggal}T00:00:00`);
    const formattedDate = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
      .format(dateObject)
      .toUpperCase();

    const sortedRows = [...data].sort((a, b) => {
      const aNo = Number(a.nomor_urut);
      const bNo = Number(b.nomor_urut);
      if (Number.isFinite(aNo) && Number.isFinite(bNo) && aNo !== bNo)
        return aNo - bNo;
      return String(a.nama_debitur || "").localeCompare(
        String(b.nama_debitur || ""),
        "id",
      );
    });

    const rows = sortedRows
      .map((item, index) => {
        const documentText = [item.jaminan_utama, item.moral_obligasi]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join(" / ");
        return `<tr>
        <td class="number">${index + 1}</td>
        <td>${escapeHtml(item.nama_debitur)}</td>
        <td class="account">${escapeHtml(item.nomor_rekening_pinjaman)}</td>
        <td class="document">${escapeHtml(documentText || "-")}</td>
      </tr>`;
      })
      .join("");

    const mkaTitle =
      selectedStaff.tipe === "MKA"
        ? `MKA ${isJkk2 ? "KUAMANG KUNING 2" : "KUAMANG KUNING 1"}`
        : "ADMIN UNIT";

    const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Laporan Stock Opname Agunan Kredit Mikro - ${unitCode}</title>
<style>
  @page { size: A4 portrait; margin: 13mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 9pt; }
  .heading { text-align: center; line-height: 1.25; margin-bottom: 16px; }
  .heading h1 { font-size: 14pt; margin: 0 0 4px; font-weight: 700; }
  .heading .unit-mikro { font-size: 11pt; font-weight: 700; }
  .heading .branch, .heading .area, .heading .date { font-size: 10pt; margin-top: 2px; }
  .section-title { font-weight: 700; font-size: 10pt; margin: 13px 0 5px; }
  .section-dash { margin: 0 0 5px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.5pt; }
  th, td { border: 1px solid #333; padding: 5px 6px; vertical-align: top; overflow-wrap: anywhere; }
  th { text-align: center; font-weight: 700; }
  .number { width: 6%; text-align: center; }
  .debtor { width: 25%; }
  .account { width: 22%; text-align: center; font-variant-numeric: tabular-nums; }
  .document { width: 47%; }
  .signature-title { font-weight: 700; margin-top: 22px; margin-bottom: 3px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; text-align: center; margin-top: 10px; page-break-inside: avoid; }
  .signature { min-height: 105px; }
  .signature .role { font-weight: 700; margin-top: 2px; }
  .signature .name { margin-top: 68px; font-weight: 700; text-decoration: underline; }
  .signature .position { margin-top: 3px; font-size: 8.5pt; }
  @media print { thead { display: table-header-group; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
  <header class="heading">
    <h1>LAPORAN STOCK OPNAME AGUNAN KREDIT MIKRO</h1>
    <div class="unit-mikro">UNIT MIKRO</div>
    <div class="branch">${escapeHtml(unitLabel)}</div>
    <div class="area">AREA JAMBI</div>
    <div class="date">${escapeHtml(formattedDate)}</div>
  </header>

  <div class="section-title">AGUNAN DI CABANG</div>
  <div class="section-dash">-</div>
  <div class="section-title">AGUNAN LUNAS</div>

  <table>
    <thead>
      <tr>
        <th class="number">NO</th>
        <th class="debtor">NAMA DEBITUR</th>
        <th class="account">NO REKENING</th>
        <th class="document">DOKUMEN</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="signature-title">DIPERIKSA OLEH:</div>
  <div class="signatures">
    <div class="signature">
      <div class="role">PETUGAS PEMERIKSA</div>
      <div class="name">${escapeHtml(pemeriksa)}</div>
      <div class="position">${escapeHtml(jabatan)}</div>
    </div>
    <div class="signature">
      <div class="role">${escapeHtml(mkaTitle)}</div>
      <div class="name">${escapeHtml(selectedStaff.nama)}</div>
      <div class="position">${escapeHtml(selectedStaff.jabatan || selectedStaff.tipe)}</div>
    </div>
  </div>
  <script>window.onload = () => setTimeout(() => { window.focus(); window.print(); }, 500);</script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow)
      return alert("Izinkan pop-up browser untuk mencetak form opname.");
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setShowOpname(false);
  }

  function editSelected() {
    setModalItem(selected);
    setSelected(null);
    setShowForm(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Archive size={19} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Agunan Lunas</h1>
              <p className="text-xs text-slate-500">
                {activeUnit?.name || unitCode}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="/admin/agunan-lunas/history"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 sm:flex-none sm:text-sm"
            >
              <History size={15} />
              History Penyerahan
            </a>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 sm:text-sm"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Data belum dapat dimuat</p>
              <p>{error}</p>
              <button
                onClick={loadData}
                className="mt-1 font-semibold underline"
              >
                Coba lagi
              </button>
            </div>
          </div>
        )}
        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            ["Total Debitur", summary.total],
            ["KUR", summary.kur],
            ["KUM", summary.kum],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4"
            >
              <p className="text-[11px] text-slate-500 sm:text-xs">{label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {value}
              </p>
            </div>
          ))}
        </section>
        {isAdmin && (
          <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Kelola Data
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Tambah data manual atau impor Excel. Satu file dapat berisi
                  JKK1 dan JKK2.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-700 sm:px-4 sm:text-sm">
                  {importing ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Upload size={15} />
                  )}
                  <span>{importing ? "Mengimpor..." : "Impor Excel"}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    disabled={importing}
                    onChange={importExcel}
                  />
                </label>
                <button
                  onClick={() => {
                    setModalItem(null);
                    setShowForm(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-3 text-xs font-semibold text-white sm:px-4 sm:text-sm"
                >
                  <Plus size={15} />
                  Tambah Manual
                </button>
                <button
                  onClick={exportExcel}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-700 sm:px-4 sm:text-sm"
                >
                  <Download size={15} />
                  Unduh Excel Lengkap
                </button>
                <button
                  onClick={() => setShowShare(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 px-3 py-3 text-xs font-semibold text-green-700 sm:px-4 sm:text-sm"
                >
                  <MessageCircle size={15} />
                  Kirim WA per MKS
                </button>
                <button
                  onClick={() => setShowOpname(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-700 sm:px-4 sm:text-sm"
                >
                  <ClipboardList size={15} />
                  Proses Opname
                </button>
              </div>
            </div>
            {importMessage && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p className="font-semibold">{importMessage}</p>
                {importErrors.length > 0 && (
                  <div className="mt-2 max-h-36 space-y-1 overflow-y-auto text-amber-700">
                    {importErrors.map((e, i) => (
                      <p key={`${e.baris}-${i}`}>
                        Baris {e.baris}: {e.pesan}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Daftar Agunan Lunas
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Ketuk data untuk melihat detail lengkap.
              </p>
            </div>
            <form
              onSubmit={submitNameSearch}
              className="flex w-full gap-2 sm:max-w-md"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari berdasarkan nama debitur..."
                  aria-label="Cari berdasarkan nama debitur"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white sm:text-sm"
              >
                <Search size={15} />
                Cari Nama
              </button>
              {search && (
                <button
                  type="button"
                  onClick={clearNameSearch}
                  className="rounded-xl border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-600"
                >
                  Reset
                </button>
              )}
            </form>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Memuat data...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <FileSpreadsheet size={30} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {search ? "Nama debitur tidak ditemukan" : "Tidak ada data"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {search
                  ? "Coba periksa ejaan nama atau gunakan kata kunci lain."
                  : "Belum ada data Agunan Lunas untuk unit ini."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-2">
                {filteredData.map((item) => {
                  const hasJaminanUtama = Boolean(
                    String(item.jaminan_utama || "").trim(),
                  );
                  const hasMoralObligasi = Boolean(
                    String(item.moral_obligasi || "").trim(),
                  );
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-bold text-slate-900">
                            {item.nama_debitur}
                          </h3>
                          <p className="mt-1 break-all text-xs text-slate-500">
                            Rekening Pinjaman:{" "}
                            {formatValue(item.nomor_rekening_pinjaman)}
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          className="mt-1 shrink-0 text-slate-400"
                        />
                      </div>
                      {(hasJaminanUtama || hasMoralObligasi) && (
                        <div
                          className={`mt-4 grid grid-cols-1 gap-3 ${hasJaminanUtama && hasMoralObligasi ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}
                        >
                          {hasJaminanUtama && (
                            <div className="min-w-0 rounded-lg bg-slate-50 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Jaminan Utama
                              </p>
                              <p className="mt-1 break-words text-xs font-medium leading-relaxed text-slate-700">
                                {item.jaminan_utama}
                              </p>
                            </div>
                          )}
                          {hasMoralObligasi && (
                            <div className="min-w-0 rounded-lg bg-slate-50 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Moral Obligasi
                              </p>
                              <p className="mt-1 break-words text-xs font-medium leading-relaxed text-slate-700">
                                {item.moral_obligasi}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600">
                          MKS: {formatValue(item.nama_mks)}
                        </span>
                        <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600">
                          Bundel: {formatValue(item.bundel_agunan)}
                        </span>
                      </div>
                      {item.keterangan_warning && (
                        <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-left text-xs text-amber-800">
                          <AlertCircle size={14} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-2">
                            {item.keterangan_warning}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Menampilkan {filteredData.length} dari {data.length} data
          </div>
        </section>
      </main>
      {selected && (
        <DetailModal
          item={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onEdit={editSelected}
          onDelete={deleteData}
        />
      )}
      {showForm && isAdmin && (
        <FormModal
          item={modalItem}
          unit={unitCode}
          mksOptions={mksOptions}
          onClose={() => {
            setShowForm(false);
            setModalItem(null);
          }}
          onSave={saveData}
          saving={saving}
        />
      )}
      {showShare && (
        <ShareModal
          unit={unitCode}
          options={shareMksOptions}
          data={data}
          onClose={() => setShowShare(false)}
          onShare={shareByMks}
        />
      )}
      {showOpname && (
        <OpnameModal
          unit={unitCode}
          staffOptions={opnameOptions}
          onClose={() => setShowOpname(false)}
          onPrint={printOpname}
        />
      )}
    </div>
  );
}
