import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

import InputPKForm from "@/components/mks/InputPKForm";

export const dynamic = "force-dynamic";

export default async function InputPKPage() {
  const cookieStore = await cookies();

  // 1. Validasi konfigurasi Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Konfigurasi Supabase belum lengkap.");
  }

  // 2. Buat Supabase client untuk memvalidasi pengguna login
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Tidak mengubah cookie pada halaman server ini.
      },
    },
  });

  // 3. Validasi autentikasi Supabase
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 4. Validasi sesi aplikasi JOSJIS
  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (!sessionToken || !(await hasValidAppSession(user.id, sessionToken))) {
    redirect("/login");
  }

  // 5. Validasi profil pengguna
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, nip, role, status, wajib_ganti_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.user_id !== user.id ||
    profile.status !== "AKTIF"
  ) {
    redirect("/login");
  }

  if (profile.wajib_ganti_password) {
    redirect("/ganti-password");
  }

  // 6. Halaman ini hanya untuk role MKS
  if (profile.role !== "MKS") {
    redirect(
      profile.role === "ADMIN"
        ? "/admin/dashboard"
        : profile.role === "PENGAWAS"
          ? "/pengawas/dashboard"
          : "/login",
    );
  }

  // 7. Ambil akun aplikasi milik pengguna yang sedang login
  const { data: pengguna, error: penggunaError } = await supabaseAdmin
    .from("pengguna")
    .select("id, pegawai_id, role, unit_id, aktif")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    penggunaError ||
    !pengguna ||
    pengguna.aktif !== true ||
    pengguna.role !== "MKS" ||
    !pengguna.unit_id ||
    !pengguna.pegawai_id
  ) {
    redirect("/login");
  }

  // 8. Pastikan penugasan unit akun konsisten
  const { data: penugasan, error: penugasanError } = await supabaseAdmin
    .from("pengguna_unit")
    .select("unit_id")
    .eq("pengguna_id", pengguna.id);

  if (
    penugasanError ||
    !penugasan ||
    penugasan.length !== 1 ||
    penugasan[0].unit_id !== pengguna.unit_id
  ) {
    redirect("/login");
  }

  // 9. Ambil data unit, pegawai, notaris, dan MKS
  //    Kode agen dicari berdasarkan pegawai_id akun aktif,
  //    bukan berdasarkan MKS lain dalam unit yang sama.
  const [
    { data: unit, error: unitError },
    { data: pegawai, error: pegawaiError },
    { data: notaries, error: notariesError },
    { data: mks, error: mksError },
  ] = await Promise.all([
    supabaseAdmin
      .from("unit")
      .select("id, nama_unit, kode_unit")
      .eq("id", pengguna.unit_id)
      .eq("status", "AKTIF")
      .maybeSingle(),

    supabaseAdmin
      .from("pegawai")
      .select("id, nama, nip, unit_id, jenis_pegawai, aktif")
      .eq("id", pengguna.pegawai_id)
      .maybeSingle(),

    supabaseAdmin
      .from("notaris")
      .select(
        "id, nama_notaris, provinsi, kabupaten, nomor_rekening, jenis_rekanan",
      )
      .order("nama_notaris", { ascending: true }),

    supabaseAdmin
      .from("mks")
      .select("id, pegawai_id, kode_agen")
      .eq("pegawai_id", pengguna.pegawai_id)
      .maybeSingle(),
  ]);

  // 10. Validasi data unit dan pegawai
  if (
    unitError ||
    !unit ||
    pegawaiError ||
    !pegawai ||
    pegawai.aktif !== true ||
    pegawai.unit_id !== pengguna.unit_id ||
    pegawai.jenis_pegawai !== "MKS"
  ) {
    redirect("/login");
  }

  // 11. Pastikan data MKS terhubung dengan pegawai yang benar
  if (mksError || !mks || mks.pegawai_id !== pegawai.id) {
    throw new Error(
      "Data MKS tidak ditemukan atau tidak sesuai dengan pegawai yang login. Periksa master MKS.",
    );
  }

  // 12. Siapkan informasi notaris untuk form
  const daftarNotaris = notariesError ? [] : notaries || [];

  const pesanNotaris = notariesError
    ? "Master notaris gagal dimuat. Periksa akses database."
    : "";

  // 13. Tampilkan form Input PK
  return (
    <InputPKForm
      nama={pegawai.nama || "Pengguna MKS"}
      unit={unit.nama_unit}
      kodeUnit={unit.kode_unit}
      kodeAgen={mks.kode_agen || ""}
      notaries={daftarNotaris}
      notariesLoadError={pesanNotaris}
    />
  );
}
