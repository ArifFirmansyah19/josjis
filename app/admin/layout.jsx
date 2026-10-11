import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hasValidAppSession, APP_SESSION_COOKIE } from "@/lib/app-session";
import DashboardLayout from "@/components/DashboardLayout";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "MKS", "PENGAWAS"];

export default async function AdminLayout({ children }) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  const validSession = sessionToken
    ? await hasValidAppSession(user.id, sessionToken)
    : false;

  if (!validSession) {
    redirect("/");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, role, status, wajib_ganti_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.user_id !== user.id ||
    profile.status !== "AKTIF" ||
    !ALLOWED_ROLES.includes(profile.role)
  ) {
    redirect("/");
  }

  // Admin tidak diwajibkan mengganti password awal.
  if (
    ["MKS", "PENGAWAS"].includes(profile.role) &&
    profile.wajib_ganti_password
  ) {
    redirect("/ganti-password");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
