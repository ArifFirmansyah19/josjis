"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

export default function GantiPasswordPage() {
  const router = useRouter();

  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (passwordBaru.length < 12) {
      setError("Password baru minimal 12 karakter.");
      return;
    }

    if (passwordBaru.length > 256) {
      setError("Password baru maksimal 256 karakter.");
      return;
    }

    if (passwordBaru === passwordLama) {
      setError("Password baru harus berbeda dari password lama.");
      return;
    }

    if (passwordBaru !== konfirmasi) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/ganti-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          passwordLama,
          passwordBaru,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || "Password gagal diganti.");
        return;
      }

      setSuccess("Password berhasil diganti. Mengalihkan ke dashboard...");

      const redirectTo =
        typeof result.redirectTo === "string" &&
        result.redirectTo.startsWith("/") &&
        !result.redirectTo.startsWith("//")
          ? result.redirectTo
          : "/";

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-9">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-900">
          <LockKeyhole size={27} />
        </div>

        <div className="mb-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Keamanan akun JOSJIS
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Ganti password
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Untuk keamanan akun, MKS dan Pengawas wajib mengganti password awal
            sebelum menggunakan dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="passwordLama"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Password awal saat ini
            </label>
            <input
              id="passwordLama"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={passwordLama}
              onChange={(e) => setPasswordLama(e.target.value)}
              required
              maxLength={256}
              disabled={loading}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="passwordBaru"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Password baru
            </label>
            <div className="relative">
              <input
                id="passwordBaru"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                required
                minLength={12}
                maxLength={256}
                disabled={loading}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={
                  show ? "Sembunyikan password" : "Tampilkan password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-200"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Minimal 12 karakter. Gunakan kombinasi huruf, angka, dan simbol.
            </p>
          </div>

          <div>
            <label
              htmlFor="konfirmasi"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Konfirmasi password baru
            </label>
            <input
              id="konfirmasi"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              required
              maxLength={256}
              disabled={loading}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:opacity-60"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Menyimpan password...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Simpan password baru
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
