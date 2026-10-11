import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";
import RoleDashboardMks from "@/components/RoleDashboardMks";

export const dynamic = "force-dynamic";

export default async function PengawasDashboardPage() {
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
          // Cookie diperbarui melalui alur autentikasi aplikasi.
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

  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (!sessionToken || !(await hasValidAppSession(user.id, sessionToken))) {
    redirect("/login");
  }

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

  if (profile.role !== "PENGAWAS") {
    if (profile.role === "ADMIN") {
      redirect("/admin/dashboard");
    }

    if (profile.role === "MKS") {
      redirect("/mks/dashboard");
    }

    redirect("/login");
  }

  const { data: pengguna, error: penggunaError } = await supabaseAdmin
    .from("pengguna")
    .select("id, pegawai_id, role, unit_id, aktif")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    penggunaError ||
    !pengguna ||
    pengguna.aktif !== true ||
    pengguna.role !== "PENGAWAS" ||
    !pengguna.unit_id
  ) {
    redirect("/login");
  }

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

  const { data: unit, error: unitError } = await supabaseAdmin
    .from("unit")
    .select("id, nama_unit")
    .eq("id", pengguna.unit_id)
    .eq("status", "AKTIF")
    .maybeSingle();

  if (unitError || !unit) {
    redirect("/login");
  }

  let nama = "Pengguna Pengawas";

  if (pengguna.pegawai_id) {
    const { data: pegawai } = await supabaseAdmin
      .from("pegawai")
      .select("nama")
      .eq("id", pengguna.pegawai_id)
      .maybeSingle();

    if (pegawai?.nama) {
      nama = pegawai.nama;
    }
  }

  return <RoleDashboardMks role="PENGAWAS" nama={nama} unit={unit.nama_unit} />;
}
