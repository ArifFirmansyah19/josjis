import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  APP_SESSION_COOKIE,
  APP_SESSION_TTL_SECONDS,
  createAppSessionToken,
  hashAppSessionToken,
} from "@/lib/app-session";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["ADMIN", "MKS", "PENGAWAS"] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function getDashboardPath(role: AllowedRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "MKS":
      return "/mks/dashboard";
    case "PENGAWAS":
      return "/pengawas/dashboard";
  }
}

export async function POST(request: Request) {
  try {
    // 1. Validasi origin.
    const origin = request.headers.get("origin");
    const requestUrl = new URL(request.url);

    if (origin && origin !== requestUrl.origin) {
      return NextResponse.json(
        { success: false, error: "Permintaan tidak diizinkan." },
        { status: 403 },
      );
    }

    // 2. Validasi input.
    let body: { nip?: unknown; password?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Format permintaan tidak valid." },
        { status: 400 },
      );
    }

    const nip = typeof body.nip === "string" ? body.nip.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!/^\d{5,20}$/.test(nip) || !password || password.length > 256) {
      return NextResponse.json(
        { success: false, error: "NIP atau password tidak valid." },
        { status: 400 },
      );
    }

    // 3. Cari profil berdasarkan NIP.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, nip, email_utama, role, status, wajib_ganti_password")
      .eq("nip", nip)
      .maybeSingle();

    if (profileError) {
      console.error("Gagal membaca profil login:", profileError.message);

      return NextResponse.json(
        {
          success: false,
          error: "Login belum dapat diproses. Silakan coba lagi.",
        },
        { status: 500 },
      );
    }

    if (
      !profile ||
      profile.status !== "AKTIF" ||
      !ALLOWED_ROLES.includes(profile.role as AllowedRole) ||
      !profile.email_utama
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "NIP atau password salah, atau akun tidak aktif.",
        },
        { status: 401 },
      );
    }

    // 4. Siapkan Supabase Auth yang menggunakan cookie pengguna.
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Cookie akan ditangani sesuai konteks Next.js.
            }
          },
        },
      },
    );

    // 5. Verifikasi password melalui Supabase Auth.
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: profile.email_utama,
        password,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: "NIP atau password salah, atau akun tidak aktif.",
        },
        { status: 401 },
      );
    }

    if (authData.user.id !== profile.user_id) {
      await supabase.auth.signOut({ scope: "local" });

      return NextResponse.json(
        { success: false, error: "Akun tidak memiliki akses." },
        { status: 403 },
      );
    }

    // 6. Verifikasi ulang profil dari database.
    const { data: verifiedProfile, error: verifyError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, role, status, wajib_ganti_password, email_utama")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (
      verifyError ||
      !verifiedProfile ||
      verifiedProfile.user_id !== authData.user.id ||
      verifiedProfile.status !== "AKTIF" ||
      !ALLOWED_ROLES.includes(verifiedProfile.role as AllowedRole) ||
      verifiedProfile.email_utama !== profile.email_utama
    ) {
      await supabase.auth.signOut({ scope: "local" });

      return NextResponse.json(
        {
          success: false,
          error: "Akun tidak memiliki akses atau sudah tidak aktif.",
        },
        { status: 403 },
      );
    }

    const role = verifiedProfile.role as AllowedRole;

    // 7. Verifikasi akun aplikasi dan penugasan unit.
    // Admin tetap menggunakan profil sebagai sumber akses.
    let penggunaId: string | null = null;

    if (role !== "ADMIN") {
      const { data: pengguna, error: penggunaError } = await supabaseAdmin
        .from("pengguna")
        .select("id, auth_user_id, aktif, role, unit_id")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      if (
        penggunaError ||
        !pengguna ||
        pengguna.auth_user_id !== authData.user.id ||
        pengguna.aktif !== true ||
        pengguna.role !== role ||
        !pengguna.unit_id
      ) {
        await supabase.auth.signOut({ scope: "local" });

        return NextResponse.json(
          {
            success: false,
            error:
              "Akun tidak aktif atau belum memiliki penugasan unit yang valid.",
          },
          { status: 403 },
        );
      }

      // Pastikan akun hanya terhubung ke satu unit.
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
        await supabase.auth.signOut({ scope: "local" });

        return NextResponse.json(
          {
            success: false,
            error: "Penugasan unit akun belum valid. Hubungi administrator.",
          },
          { status: 403 },
        );
      }

      penggunaId = pengguna.id;
    }

    // 8. Buat sesi aplikasi dengan masa berlaku yang dikonfigurasi.
    const sessionToken = createAppSessionToken();
    const sessionTokenHash = hashAppSessionToken(sessionToken);
    const now = Date.now();

    const expiresAt = new Date(
      now + APP_SESSION_TTL_SECONDS * 1000,
    ).toISOString();

    const { error: sessionError } = await supabaseAdmin
      .from("user_sessions")
      .upsert(
        {
          user_id: authData.user.id,
          session_token_hash: sessionTokenHash,
          created_at: new Date(now).toISOString(),
          expires_at: expiresAt,
          revoked_at: null,
        },
        { onConflict: "user_id" },
      );

    if (sessionError) {
      console.error("Gagal membuat sesi aplikasi:", sessionError.message);

      await supabase.auth.signOut({ scope: "local" });

      return NextResponse.json(
        {
          success: false,
          error: "Sesi login gagal dibuat. Silakan coba lagi.",
        },
        { status: 500 },
      );
    }

    // 9. Simpan cookie sesi aplikasi.
    cookieStore.set(APP_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: APP_SESSION_TTL_SECONDS,
      expires: new Date(expiresAt),
    });

    // 10. Catat waktu login. Kegagalan pencatatan tidak membatalkan login.
    if (penggunaId) {
      const { error: updateLoginError } = await supabaseAdmin
        .from("pengguna")
        .update({ last_login_at: new Date(now).toISOString() })
        .eq("id", penggunaId);

      if (updateLoginError) {
        console.error("Gagal mencatat waktu login:", updateLoginError.message);
      }
    }

    // 11. Tentukan tujuan berdasarkan role dan status password.
    const wajibGantiPassword =
      role !== "ADMIN" && verifiedProfile.wajib_ganti_password === true;

    const redirectTo = wajibGantiPassword
      ? "/ganti-password"
      : getDashboardPath(role);

    return NextResponse.json({
      success: true,
      redirectTo,
    });
  } catch (error) {
    console.error("Kesalahan API login:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 },
    );
  }
}
