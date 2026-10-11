import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { APP_SESSION_COOKIE, hashAppSessionToken } from "@/lib/app-session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Cabut hanya sesi yang tokennya cocok dengan cookie perangkat ini.
    // Logout dari perangkat lama tidak boleh mencabut sesi perangkat baru.
    if (user && sessionToken) {
      const tokenHash = hashAppSessionToken(sessionToken);

      const { error } = await supabaseAdmin
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("session_token_hash", tokenHash)
        .is("revoked_at", null);

      if (error) {
        console.error("Gagal mencabut sesi aplikasi:", error.message);

        return NextResponse.json(
          { error: "Logout belum berhasil. Silakan coba lagi." },
          { status: 500 },
        );
      }
    }

    const { error: signOutError } = await supabase.auth.signOut({
      scope: "local",
    });

    if (signOutError) {
      console.error("Gagal mengakhiri sesi Supabase:", signOutError.message);
    }

    cookieStore.set(APP_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Kesalahan API logout:", error);

    return NextResponse.json(
      { error: "Logout gagal. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
