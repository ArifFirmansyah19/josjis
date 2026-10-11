"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  LoaderCircle,
  AlertCircle,
  ArrowRight,
  Landmark,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setErrorMessage("");

    const cleanNip = nip.trim();

    if (!cleanNip || !password) {
      setErrorMessage("NIP dan password wajib diisi.");
      return;
    }

    if (!/^\d{5,20}$/.test(cleanNip)) {
      setErrorMessage("Masukkan NIP yang valid.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          nip: cleanNip,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(
          result.error || "Login gagal. Periksa NIP dan password.",
        );
        return;
      }

      const redirectTo =
        typeof result.redirectTo === "string" &&
        result.redirectTo.startsWith("/") &&
        !result.redirectTo.startsWith("//")
          ? result.redirectTo
          : "/admin/dashboard";

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setErrorMessage(
        "Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8 sm:px-6">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-slate-300/50 lg:grid-cols-2">
        {/* Panel identitas */}
        <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-10 text-white lg:flex xl:p-12">
          <div className="absolute -right-24 top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -right-12 top-36 h-48 w-48 rounded-full border border-white/10" />
          <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-blue-400/10 blur-2xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <Landmark size={25} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xl font-bold tracking-[0.18em]">JOSJIS</p>
              <p className="mt-0.5 text-xs tracking-wider text-blue-200">
                SISTEM INFORMASI AGUNAN
              </p>
            </div>
          </div>

          <div className="relative z-10 my-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100">
              <ShieldCheck size={15} />
              Sistem akses terproteksi
            </div>

            <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              Kelola agunan dengan lebih{" "}
              <span className="text-blue-300">terstruktur.</span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-blue-100/80">
              Satu pintu untuk pengelolaan data, pemeriksaan dokumen,
              administrasi, dan pemantauan proses agunan JOSJIS.
            </p>

            <div className="mt-9 space-y-4">
              {[
                "Akses berdasarkan peran pengguna",
                "Data terpusat sesuai hak akses",
                "Pengelolaan proses yang lebih tertib",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <ShieldCheck size={14} />
                  </div>
                  <span className="text-sm text-blue-50/90">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 border-t border-white/15 pt-5 text-xs text-blue-200/70">
            JOSJIS · Sistem internal pengelolaan agunan
          </div>
        </section>

        {/* Form login */}
        <section className="flex min-w-0 flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-14">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-950 text-white">
              <Landmark size={23} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-widest text-slate-900">
                JOSJIS
              </p>
              <p className="text-[10px] font-medium tracking-wider text-slate-500">
                SISTEM INFORMASI AGUNAN
              </p>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800 ring-1 ring-blue-100">
              <LockKeyhole size={27} strokeWidth={1.8} />
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Admin Portal
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Selamat datang
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Masuk menggunakan NIP dan password akun kamu.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="nip"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                NIP
              </label>

              <div className="relative">
                <UserRound
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="nip"
                  name="nip"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="Masukkan NIP"
                  value={nip}
                  onChange={(event) =>
                    setNip(event.target.value.replace(/\s/g, ""))
                  }
                  disabled={loading}
                  required
                  maxLength={20}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  required
                  maxLength={256}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 disabled:opacity-60"
                />

                <button
                  type="button"
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-60"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-950/15 transition hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-900/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <LoaderCircle size={19} className="animate-spin" />
                  Memverifikasi akun...
                </>
              ) : (
                <>
                  Masuk ke JOSJIS
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-blue-800"
              />
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Akses khusus pengguna terdaftar
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Gunakan akun yang telah dibuat oleh administrator. Jangan
                  membagikan password atau kode verifikasi kepada orang lain.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} JOSJIS. Akses internal.
          </p>
        </section>
      </div>
    </main>
  );
}
