import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";
import RoleDashboardMks from "@/components/RoleDashboardMks";

export const dynamic = "force-dynamic";

export default async function MKSDashboardPage() {
  // =====================================================
  // 1. AMBIL COOKIE DAN VALIDASI AUTENTIKASI SUPABASE
  // =====================================================
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Pembaruan cookie mengikuti alur autentikasi aplikasi.
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // =====================================================
  // 2. VALIDASI SESI APLIKASI DAN PERANGKAT JOSJIS
  // =====================================================
  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (!sessionToken || !(await hasValidAppSession(user.id, sessionToken))) {
    redirect("/login");
  }

  // =====================================================
  // 3. VALIDASI PROFIL DAN STATUS AKUN
  // =====================================================
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, role, status, wajib_ganti_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== "AKTIF") {
    redirect("/login");
  }

  if (profile.wajib_ganti_password) {
    redirect("/ganti-password");
  }

  // =====================================================
  // 4. PASTIKAN PENGGUNA MEMILIKI ROLE MKS
  // =====================================================
  if (profile.role !== "MKS") {
    if (profile.role === "ADMIN") {
      redirect("/admin/dashboard");
    }

    if (profile.role === "PENGAWAS") {
      redirect("/pengawas/dashboard");
    }

    redirect("/login");
  }

  // =====================================================
  // 5. VALIDASI DATA PENGGUNA MKS
  // =====================================================
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
    !pengguna.unit_id
  ) {
    redirect("/login");
  }

  // =====================================================
  // 6. VALIDASI PENUGASAN UNIT
  // MKS harus memiliki tepat satu penugasan unit.
  // Unit penugasan harus sama dengan pengguna.unit_id.
  // =====================================================
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

  // =====================================================
  // 7. AMBIL DATA UNIT AKTIF
  // =====================================================
  const { data: unit, error: unitError } = await supabaseAdmin
    .from("unit")
    .select("id, nama_unit")
    .eq("id", pengguna.unit_id)
    .eq("status", "AKTIF")
    .maybeSingle();

  if (unitError || !unit) {
    redirect("/login");
  }

  // =====================================================
  // 8. AMBIL NAMA PEGAWAI
  // =====================================================
  let nama = "Pengguna MKS";

  if (pengguna.pegawai_id) {
    const { data: pegawai, error: pegawaiError } = await supabaseAdmin
      .from("pegawai")
      .select("nama")
      .eq("id", pengguna.pegawai_id)
      .maybeSingle();

    if (!pegawaiError && pegawai?.nama) {
      nama = pegawai.nama;
    }
  }

  // =====================================================
  // 9. TAMPILKAN DASHBOARD MKS MANDIRI
  // =====================================================
  return <RoleDashboardMks role="MKS" nama={nama} unit={unit.nama_unit} />;
}
