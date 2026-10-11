"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Plus,
  Search,
  RefreshCw,
  LockKeyhole,
  UnlockKeyhole,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  AlertTriangle,
  Globe,
  UserRound,
  Check,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

const TABLE = "account_vault";

const EMPTY_FORM = {
  nama_aplikasi: "",
  url_aplikasi: "",
  username: "",
  password: "",
};

function toBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function deriveKey(masterPassword, salt) {
  const encoder = new TextEncoder();

  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPassword(password, masterPassword) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(masterPassword, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(password),
  );

  return {
    secret_ciphertext: toBase64(new Uint8Array(encrypted)),
    secret_salt: toBase64(salt),
    secret_iv: toBase64(iv),
  };
}

async function decryptPassword(record, masterPassword) {
  const salt = fromBase64(record.secret_salt);
  const iv = fromBase64(record.secret_iv);
  const ciphertext = fromBase64(record.secret_ciphertext);
  const key = await deriveKey(masterPassword, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

function normalizeUrl(value) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Protokol URL tidak valid.");
    }

    return parsed.href;
  } catch {
    throw new Error("URL aplikasi tidak valid.");
  }
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AccountPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [masterInput, setMasterInput] = useState("");
  const [vaultOpen, setVaultOpen] = useState(false);
  const [showMasterInput, setShowMasterInput] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [revealed, setRevealed] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const notify = useCallback((message) => {
    setNotice(message);
    setError("");
  }, []);

  const reportError = useCallback((message) => {
    setError(message);
    setNotice("");
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from(TABLE)
      .select(
        "id, nama_aplikasi, url_aplikasi, username, secret_ciphertext, secret_salt, secret_iv, created_at, updated_at",
      )
      .order("updated_at", { ascending: false });

    if (queryError) {
      reportError(`Gagal mengambil data brankas: ${queryError.message}`);
      setAccounts([]);
    } else {
      setAccounts(data || []);
    }

    setLoading(false);
  }, [reportError]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const filteredAccounts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) return accounts;

    return accounts.filter((item) =>
      [item.nama_aplikasi, item.url_aplikasi, item.username].some((value) =>
        (value || "").toLowerCase().includes(keyword),
      ),
    );
  }, [accounts, query]);

  function openAddForm() {
    if (!vaultOpen) {
      reportError("Buka brankas terlebih dahulu.");
      return;
    }

    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
    setError("");
  }

  async function openEditForm(item) {
    if (!vaultOpen) {
      reportError("Buka brankas terlebih dahulu.");
      return;
    }

    try {
      const password = await decryptPassword(item, masterPassword);

      setEditing(item);
      setForm({
        nama_aplikasi: item.nama_aplikasi || "",
        url_aplikasi: item.url_aplikasi || "",
        username: item.username || "",
        password,
      });
      setFormOpen(true);
      setError("");
    } catch {
      reportError(
        "Password tidak dapat dibuka. Master password mungkin salah atau data enkripsi tidak valid.",
      );
    }
  }

  async function saveAccount(event) {
    event.preventDefault();

    if (!vaultOpen || !masterPassword) {
      reportError("Buka brankas terlebih dahulu.");
      return;
    }

    if (!form.nama_aplikasi.trim() || !form.username.trim() || !form.password) {
      reportError("Nama aplikasi, username, dan password wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = normalizeUrl(form.url_aplikasi);

      const encrypted = await encryptPassword(form.password, masterPassword);

      const payload = {
        nama_aplikasi: form.nama_aplikasi.trim(),
        url_aplikasi: url,
        username: form.username.trim(),
        ...encrypted,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (editing) {
        result = await supabase
          .from(TABLE)
          .update(payload)
          .eq("id", editing.id);
      } else {
        // user_id sengaja tidak diisi karena autentikasi belum diterapkan.
        result = await supabase.from(TABLE).insert(payload);
      }

      if (result.error) {
        throw result.error;
      }

      setFormOpen(false);
      setEditing(null);
      setForm({ ...EMPTY_FORM });
      await loadAccounts();
      notify(
        editing
          ? "Data aplikasi berhasil diperbarui."
          : "Aplikasi berhasil ditambahkan.",
      );
    } catch (err) {
      reportError(err.message || "Gagal menyimpan data aplikasi.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAccount(item) {
    if (!vaultOpen) {
      reportError("Buka brankas terlebih dahulu.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus data aplikasi "${item.nama_aplikasi}"? Tindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      reportError(`Gagal menghapus data: ${deleteError.message}`);
      return;
    }

    setRevealed((previous) => {
      const next = { ...previous };
      delete next[item.id];
      return next;
    });

    await loadAccounts();
    notify("Data aplikasi berhasil dihapus.");
  }

  async function revealPassword(item) {
    if (!vaultOpen) {
      reportError("Buka brankas terlebih dahulu.");
      return;
    }

    if (revealed[item.id] !== undefined) {
      setVisiblePasswords((previous) => ({
        ...previous,
        [item.id]: !previous[item.id],
      }));
      return;
    }

    try {
      const password = await decryptPassword(item, masterPassword);

      setRevealed((previous) => ({
        ...previous,
        [item.id]: password,
      }));

      setVisiblePasswords((previous) => ({
        ...previous,
        [item.id]: true,
      }));

      setError("");
    } catch {
      reportError(
        "Gagal mendekripsi password. Periksa master password atau integritas data.",
      );
    }
  }

  async function copyText(value, label) {
    try {
      await navigator.clipboard.writeText(value || "");
      notify(`${label} berhasil disalin.`);
    } catch {
      reportError(
        "Gagal menyalin. Pastikan halaman dibuka melalui HTTPS atau localhost.",
      );
    }
  }

  function unlockVault(event) {
    event.preventDefault();

    if (!masterInput.trim()) {
      reportError("Masukkan master password terlebih dahulu.");
      return;
    }

    setMasterPassword(masterInput);
    setMasterInput("");
    setVaultOpen(true);
    setShowMasterInput(false);
    setRevealed({});
    setVisiblePasswords({});
    setError("");
    notify("Brankas dibuka. Password akan diverifikasi saat kamu membukanya.");
  }

  function lockVault() {
    setVaultOpen(false);
    setMasterPassword("");
    setMasterInput("");
    setRevealed({});
    setVisiblePasswords({});
    setFormOpen(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    notify(
      "Brankas dikunci. Password yang dibuka telah dihapus dari tampilan.",
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <KeyRound size={17} />
              OPERASIONAL / ACCOUNT
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Account Vault
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Simpan dan kelola informasi akun aplikasi dalam satu tempat.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAccounts}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Notice */}
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={21} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="text-sm leading-6 text-amber-900">
            <p className="font-semibold">
              Mode pengembangan — akses belum dibatasi
            </p>
            <p className="mt-1">
              Jangan simpan kredensial kantor yang asli sebelum autentikasi dan
              kebijakan keamanan database diterapkan. Username masih tersimpan
              sebagai teks biasa; password dienkripsi di browser. Enkripsi
              browser tidak menggantikan pembatasan akses database.
            </p>
          </div>
        </div>

        {/* Feedback */}
        {notice && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <Check size={18} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="ml-auto"
              aria-label="Tutup pesan"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto"
              aria-label="Tutup pesan"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Vault status */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total aplikasi
              </p>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <Globe size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {accounts.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Data di tabel account_vault
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Hasil pencarian
              </p>
              <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
                <Search size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {filteredAccounts.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Aplikasi yang cocok dengan pencarian
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Status brankas
              </p>
              <div
                className={`rounded-xl p-2.5 ${
                  vaultOpen
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {vaultOpen ? (
                  <UnlockKeyhole size={20} />
                ) : (
                  <LockKeyhole size={20} />
                )}
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {vaultOpen ? "Terbuka" : "Terkunci"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {vaultOpen
                ? "Password dapat didekripsi"
                : "Master password diperlukan"}
            </p>
          </div>
        </div>

        {/* Vault control */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {vaultOpen ? (
                  <ShieldCheck size={23} />
                ) : (
                  <LockKeyhole size={23} />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  {vaultOpen ? "Brankas sedang terbuka" : "Buka brankas"}
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {vaultOpen
                    ? "Kamu dapat membuka, menambah, dan mengubah data aplikasi."
                    : "Masukkan master password untuk mengenkripsi atau membuka password aplikasi."}
                </p>
              </div>
            </div>

            {vaultOpen ? (
              <button
                type="button"
                onClick={lockVault}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <LockKeyhole size={17} />
                Kunci brankas
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowMasterInput((previous) => !previous);
                  setError("");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <UnlockKeyhole size={17} />
                Buka brankas
              </button>
            )}
          </div>

          {!vaultOpen && showMasterInput && (
            <form
              onSubmit={unlockVault}
              className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row"
            >
              <input
                type="password"
                autoComplete="new-password"
                value={masterInput}
                onChange={(event) => setMasterInput(event.target.value)}
                placeholder="Masukkan master password"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Lanjutkan
              </button>
            </form>
          )}

          {!vaultOpen && accounts.length === 0 && (
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              Jika ini pertama kali digunakan, buat master password yang kuat
              dan simpan dengan aman. Master password tidak disimpan oleh
              halaman ini. Jika lupa, password terenkripsi tidak dapat
              dipulihkan melalui fitur ini.
            </p>
          )}
        </div>

        {/* Table toolbar */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Daftar akun aplikasi
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Username dan password hanya ditampilkan saat diperlukan.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddForm}
              disabled={!vaultOpen}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={17} />
              Tambah aplikasi
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <div className="relative mb-5">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama aplikasi, URL, atau username..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <RefreshCw size={18} className="animate-spin" />
                Memuat data aplikasi...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <KeyRound size={26} />
                </div>
                <h3 className="font-semibold text-slate-800">
                  {query ? "Data tidak ditemukan" : "Belum ada aplikasi"}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {query
                    ? "Coba gunakan kata kunci lain."
                    : "Buka brankas terlebih dahulu, kemudian tambahkan akun aplikasi yang ingin kamu kelola."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 font-semibold">Aplikasi</th>
                        <th className="px-4 py-3 font-semibold">Username</th>
                        <th className="px-4 py-3 font-semibold">Password</th>
                        <th className="px-4 py-3 font-semibold">
                          Terakhir diubah
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-800">
                              {item.nama_aplikasi}
                            </div>
                            {item.url_aplikasi && (
                              <a
                                href={item.url_aplikasi}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex max-w-[250px] items-center gap-1 truncate text-xs text-blue-700 hover:underline"
                              >
                                <span className="truncate">
                                  {item.url_aplikasi}
                                </span>
                                <ExternalLink size={12} className="shrink-0" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="max-w-[180px] truncate text-slate-700">
                                {item.username || "-"}
                              </span>
                              {item.username && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyText(item.username, "Username")
                                  }
                                  title="Salin username"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-700"
                                >
                                  <Copy size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {vaultOpen ? (
                              <div className="flex items-center gap-2">
                                <span className="max-w-[130px] truncate font-mono text-slate-600">
                                  {revealed[item.id] !== undefined &&
                                  visiblePasswords[item.id]
                                    ? revealed[item.id]
                                    : "••••••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => revealPassword(item)}
                                  title={
                                    visiblePasswords[item.id]
                                      ? "Sembunyikan password"
                                      : "Lihat password"
                                  }
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-700"
                                >
                                  {visiblePasswords[item.id] ? (
                                    <EyeOff size={15} />
                                  ) : (
                                    <Eye size={15} />
                                  )}
                                </button>
                                {revealed[item.id] !== undefined && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyText(revealed[item.id], "Password")
                                    }
                                    title="Salin password"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-700"
                                  >
                                    <Copy size={14} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Brankas terkunci
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                            {formatDate(item.updated_at)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-1">
                              {item.url_aplikasi && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      item.url_aplikasi,
                                      "_blank",
                                      "noopener,noreferrer",
                                    )
                                  }
                                  title="Buka aplikasi"
                                  className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <ExternalLink size={16} />
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={!vaultOpen}
                                onClick={() => openEditForm(item)}
                                title="Edit"
                                className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-30"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={!vaultOpen}
                                onClick={() => removeAccount(item)}
                                title="Hapus"
                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {filteredAccounts.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold text-slate-900">
                            {item.nama_aplikasi}
                          </h3>
                          {item.url_aplikasi && (
                            <a
                              href={item.url_aplikasi}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-blue-700"
                            >
                              <span className="truncate">
                                {item.url_aplikasi}
                              </span>
                              <ExternalLink size={12} className="shrink-0" />
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(item.username || "", "Username")
                          }
                          title="Salin username"
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        >
                          <Copy size={16} />
                        </button>
                      </div>

                      <div className="mt-4 space-y-3 text-sm">
                        <div>
                          <p className="mb-1 text-xs text-slate-500">
                            Username
                          </p>
                          <p className="break-all font-medium">
                            {item.username || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="mb-1 text-xs text-slate-500">
                            Password
                          </p>
                          {vaultOpen ? (
                            <div className="flex items-center gap-2">
                              <span className="min-w-0 break-all font-mono">
                                {revealed[item.id] !== undefined &&
                                visiblePasswords[item.id]
                                  ? revealed[item.id]
                                  : "••••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => revealPassword(item)}
                                className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                aria-label="Lihat atau sembunyikan password"
                              >
                                {visiblePasswords[item.id] ? (
                                  <EyeOff size={16} />
                                ) : (
                                  <Eye size={16} />
                                )}
                              </button>
                              {revealed[item.id] !== undefined && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyText(revealed[item.id], "Password")
                                  }
                                  className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                  aria-label="Salin password"
                                >
                                  <Copy size={16} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">
                              Brankas terkunci
                            </p>
                          )}
                        </div>

                        <p className="text-xs text-slate-400">
                          Diubah: {formatDate(item.updated_at)}
                        </p>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          disabled={!vaultOpen}
                          onClick={() => openEditForm(item)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-40"
                        >
                          <Pencil size={15} /> Edit
                        </button>
                        <button
                          type="button"
                          disabled={!vaultOpen}
                          onClick={() => removeAccount(item)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
                        >
                          <Trash2 size={15} /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs leading-5 text-slate-400">
          Account Vault · Password dienkripsi menggunakan AES-GCM dan kunci
          diturunkan dengan PBKDF2 di browser.
        </p>
      </div>

      {/* Add / Edit modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setFormOpen(false);
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? "Edit aplikasi" : "Tambah aplikasi"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Password akan dienkripsi sebelum dikirim ke Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveAccount} className="space-y-4 p-5 sm:p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nama aplikasi <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={form.nama_aplikasi}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      nama_aplikasi: event.target.value,
                    }))
                  }
                  placeholder="Contoh: Portal Kerja"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  URL aplikasi
                </label>
                <input
                  type="text"
                  value={form.url_aplikasi}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      url_aplikasi: event.target.value,
                    }))
                  }
                  placeholder="https://contoh.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Boleh memasukkan domain tanpa https://.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserRound
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    autoComplete="off"
                    value={form.username}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        username: event.target.value,
                      }))
                    }
                    placeholder="Username akun aplikasi"
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Password aplikasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Password akun aplikasi"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {editing
                    ? "Password yang lama telah dibuka untuk diedit. Kosongkan tidak diperbolehkan."
                    : "Password dienkripsi memakai master password yang sedang aktif."}
                </p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
                Pastikan master password tidak terlupa. Master password tidak
                disimpan di database dan tidak dapat dipulihkan oleh halaman
                ini.
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving && <RefreshCw size={16} className="animate-spin" />}
                  {saving
                    ? "Menyimpan..."
                    : editing
                      ? "Simpan perubahan"
                      : "Simpan aplikasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
