import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6">
      <div className="w-full max-w-xl text-center">
        <div className="mb-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 text-2xl font-bold tracking-tight text-white">
            J
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
            JOSJIS
          </p>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Sistem Integrasi Pendataan
            <br />
            Mikro Kuamang Kuning
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-zinc-500">
            Sistem internal untuk mengintegrasikan pendataan, pengelolaan
            agunan, dokumen, migrasi, notaris, dan proses administrasi lainnya.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Masuk ke Sistem
        </Link>

        <p className="mt-8 text-xs text-zinc-400">
          Internal System · Mikro Kuamang Kuning
        </p>
      </div>
    </main>
  );
}
