import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

export const dynamic = "force-dynamic";

export default async function AdvisMksLayout({ children }) {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Konfigurasi Supabase belum lengkap.");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  // 1. Validasi autentikasi Supabase
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. Validasi sesi aplikasi JOSJIS
  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (!sessionToken || !(await hasValidAppSession(user.id, sessionToken))) {
    redirect("/login");
  }

  // 3. Validasi profil
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, role, status, wajib_ganti_password")
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

  if (profile.role !== "MKS") {
    if (profile.role === "ADMIN") {
      redirect("/admin/dashboard");
    }

    if (profile.role === "PENGAWAS") {
      redirect("/pengawas/dashboard");
    }

    redirect("/login");
  }

  // 4. Validasi akun pengguna MKS
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

  // 5. Pastikan hanya memiliki satu penugasan unit
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

  // 6. Validasi unit aktif
  const { data: unit, error: unitError } = await supabaseAdmin
    .from("unit")
    .select("id")
    .eq("id", pengguna.unit_id)
    .eq("status", "AKTIF")
    .maybeSingle();

  if (unitError || !unit) {
    redirect("/login");
  }

  // 7. Validasi pegawai
  const { data: pegawai, error: pegawaiError } = await supabaseAdmin
    .from("pegawai")
    .select("id, unit_id, aktif")
    .eq("id", pengguna.pegawai_id)
    .maybeSingle();

  if (
    pegawaiError ||
    !pegawai ||
    pegawai.aktif !== true ||
    pegawai.unit_id !== pengguna.unit_id
  ) {
    redirect("/login");
  }

  return children;
}
