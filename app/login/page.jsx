import Link from "next/link";
import { ArrowLeft, LockKeyhole, UserRound } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-bold text-white">
            J
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-900">
            JOSJIS
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Sistem Integrasi Pendataan Mikro Kuamang Kuning
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              Masuk ke Sistem
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Gunakan akun JOSJIS yang telah terdaftar.
            </p>
          </div>

          <form className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Email / Username
              </label>

              <div className="relative">
                <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                <input
                  type="text"
                  placeholder="Masukkan email atau username"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-700">
                  Password
                </label>

                <button
                  type="button"
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
                >
                  Lupa password?
                </button>
              </div>

              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                <input
                  type="password"
                  placeholder="Masukkan password"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
                />
              </div>
            </div>

            {/* Submit */}
            <Link
              href="/login/device"
              className="flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Masuk
            </Link>
          </form>

          <div className="mt-6 border-t border-zinc-100 pt-5 text-center">
            <p className="text-xs text-zinc-400">
              Akses hanya untuk pengguna yang telah terdaftar.
            </p>
          </div>
        </div>

        {/* Back */}
        <Link
          href="/"
          className="mx-auto mt-6 flex w-fit items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </div>
    </main>
  );
}
