"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Save, ShieldCheck, X } from "lucide-react";

const DEFAULT_USERS = {
  JKK1: {
    maker: { nip: "2501838353", password: "MakerJKK1@2026" },
    checker: { nip: "2501838354", password: "CheckerJKK1@2026" },
  },
  JKK2: {
    maker: { nip: "2501838355", password: "MakerJKK2@2026" },
    checker: { nip: "2501838356", password: "CheckerJKK2@2026" },
  },
};
const STORAGE_KEY = "josjis_migrasi_users_demo";

export default function MigrasiCredentialEditor({ unitCode = "JKK1" }) {
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [editing, setEditing] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setUsers({
          ...DEFAULT_USERS,
          ...saved,
          JKK1: { ...DEFAULT_USERS.JKK1, ...(saved.JKK1 || {}) },
          JKK2: { ...DEFAULT_USERS.JKK2, ...(saved.JKK2 || {}) },
        });
      }
    } catch {
      // Jika penyimpanan demo rusak, gunakan nilai awal.
    } finally {
      setLoaded(true);
    }
  }, []);

  const beginEdit = (role) => {
    const current = users[unitCode]?.[role] || { nip: "", password: "" };
    setEditing({ role, nip: current.nip, password: current.password });
    setNotice("");
  };

  const save = (event) => {
    event.preventDefault();
    if (!editing?.nip.trim() || !editing?.password) {
      setNotice("NIP dan password wajib diisi.");
      return;
    }
    const next = {
      ...users,
      [unitCode]: {
        ...(users[unitCode] || {}),
        [editing.role]: { nip: editing.nip.trim(), password: editing.password },
      },
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setUsers(next);
      setEditing(null);
      setNotice(`Akun ${editing.role === "maker" ? "Maker" : "Checker"} untuk ${unitCode} disimpan di browser ini.`);
    } catch {
      setNotice("Tidak dapat menyimpan perubahan di browser.");
    }
  };

  if (!loaded) return <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">Memuat akun demo...</div>;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-slate-900">Akun Maker / Checker</h2>
          <p className="text-xs text-slate-500">Unit aktif: {unitCode}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800"><ShieldCheck size={13} /> Demo lokal</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {["maker", "checker"].map((role) => {
          const account = users[unitCode]?.[role] || { nip: "", password: "" };
          const visible = !!showPassword[role];
          return (
            <div key={role} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold capitalize text-slate-800">{role}</p>
                <button type="button" onClick={() => beginEdit(role)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil size={13} /> Edit</button>
              </div>
              <p className="mb-1 text-xs text-slate-500">NIP</p>
              <p className="break-all rounded-md bg-slate-50 px-2 py-2 text-sm text-slate-800">{account.nip || "Belum diisi"}</p>
              <div className="mb-1 mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">Password demo</p>
                <button type="button" onClick={() => setShowPassword((prev) => ({ ...prev, [role]: !prev[role] }))} className="text-slate-500 hover:text-slate-800" aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
              <p className="break-all rounded-md bg-slate-50 px-2 py-2 text-sm text-slate-800">{visible ? account.password : "••••••••••••"}</p>
            </div>
          );
        })}
      </div>
      {notice && <p className="mt-3 text-xs text-slate-600">{notice}</p>}
      <p className="mt-3 text-xs leading-5 text-amber-800">Penyimpanan ini hanya di browser lokal untuk prototipe. Jangan gunakan untuk password produksi atau kredensial asli.</p>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Edit akun Maker Checker">
          <form onSubmit={save} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div><h3 className="text-lg font-bold text-slate-900">Edit {editing.role === "maker" ? "Maker" : "Checker"}</h3><p className="text-sm text-slate-500">Unit {unitCode}</p></div>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup"><X size={18} /></button>
            </div>
            <label className="mb-1 block text-sm font-medium text-slate-700">NIP</label>
            <input autoComplete="off" value={editing.nip} onChange={(event) => setEditing((prev) => ({ ...prev, nip: event.target.value }))} className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" required />
            <label className="mb-1 block text-sm font-medium text-slate-700">Password demo</label>
            <input autoComplete="new-password" type="password" value={editing.password} onChange={(event) => setEditing((prev) => ({ ...prev, password: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" required />
            {notice && <p className="mt-2 text-xs text-red-700">{notice}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"><Save size={15} /> Simpan</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
