import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

import AssesoirPkClient from "@/components/admin/AssesoirPkClient";

export const dynamic = "force-dynamic";

export default async function AssesoirPkPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/");

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  const validSession = sessionToken
    ? await hasValidAppSession(user.id, sessionToken)
    : false;

  if (!validSession) redirect("/");

  const { data: profile, error } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, role, status, wajib_ganti_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    error ||
    !profile ||
    profile.status !== "AKTIF" ||
    profile.role !== "ADMIN"
  ) {
    redirect("/admin/dashboard");
  }

  return <AssesoirPkClient />;
}
