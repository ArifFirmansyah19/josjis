import "server-only";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

type AdminAuthResult =
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
    };

export async function requireActiveAdmin(): Promise<AdminAuthResult> {
  try {
    // 1. Periksa cookie sesi aplikasi JOSJIS.
    const cookieStore = await cookies();
    const appSessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

    if (!appSessionToken) {
      return {
        ok: false,
        status: 401,
        error: "Sesi aplikasi tidak ditemukan. Silakan login kembali.",
      };
    }

    // 2. Ambil identitas pengguna dari Supabase Auth.
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        status: 401,
        error: "Sesi autentikasi tidak valid. Silakan login kembali.",
      };
    }

    // 3. Pastikan token aplikasi masih aktif di user_sessions.
    const validSession = await hasValidAppSession(user.id, appSessionToken);

    if (!validSession) {
      return {
        ok: false,
        status: 401,
        error: "Sesi aplikasi sudah tidak aktif atau kedaluwarsa.",
      };
    }

    // 4. Ambil role dan status terkini dari database.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Gagal memeriksa profil admin migrasi:",
        profileError.message,
      );

      return {
        ok: false,
        status: 403,
        error: "Profil pengguna tidak dapat diverifikasi.",
      };
    }

    if (!profile || profile.user_id !== user.id) {
      return {
        ok: false,
        status: 403,
        error: "Profil pengguna tidak ditemukan atau tidak valid.",
      };
    }

    if (String(profile.status ?? "").toUpperCase() !== "AKTIF") {
      return {
        ok: false,
        status: 403,
        error: "Akun pengguna tidak aktif.",
      };
    }

    if (String(profile.role ?? "").toUpperCase() !== "ADMIN") {
      return {
        ok: false,
        status: 403,
        error: "Fitur dokumen migrasi hanya dapat diakses ADMIN.",
      };
    }

    return {
      ok: true,
      userId: user.id,
    };
  } catch (error) {
    console.error("Kesalahan autentikasi admin migrasi:", error);

    return {
      ok: false,
      status: 401,
      error: "Autentikasi gagal. Silakan login kembali.",
    };
  }
}
