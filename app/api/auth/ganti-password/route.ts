import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["MKS", "PENGAWAS"] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function getDashboardPath(role: AllowedRole): string {
  return role === "MKS" ? "/mks/dashboard" : "/pengawas/dashboard";
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validasi origin.
    const origin = request.headers.get("origin");

    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json(
        { success: false, error: "Permintaan tidak diizinkan." },
        { status: 403 },
      );
    }

    // 2. Baca dan validasi input.
    let body: { passwordLama?: unknown; passwordBaru?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Format permintaan tidak valid." },
        { status: 400 },
      );
    }

    const passwordLama =
      typeof body.passwordLama === "string" ? body.passwordLama : "";

    const passwordBaru =
      typeof body.passwordBaru === "string" ? body.passwordBaru : "";

    if (
      !passwordLama ||
      passwordLama.length > 256 ||
      passwordBaru.length < 12 ||
      passwordBaru.length > 256
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Password baru minimal 12 dan maksimal 256 karakter.",
        },
        { status: 400 },
      );
    }

    if (passwordBaru === passwordLama) {
      return NextResponse.json(
        {
          success: false,
          error: "Password baru harus berbeda dari password lama.",
        },
        { status: 400 },
      );
    }

    // 3. Siapkan Supabase Auth berbasis cookie.
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
              // Penanganan cookie mengikuti konteks Next.js.
            }
          },
        },
      },
    );

    // 4. Pastikan sesi Supabase valid.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Sesi login tidak valid. Silakan login kembali.",
        },
        { status: 401 },
      );
    }

    // 5. Validasi sesi aplikasi JOSJIS.
    const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

    if (!sessionToken || !(await hasValidAppSession(user.id, sessionToken))) {
      return NextResponse.json(
        {
          success: false,
          error: "Sesi JOSJIS tidak valid. Silakan login kembali.",
        },
        { status: 401 },
      );
    }

    // 6. Baca profil pengguna dari database.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, email_utama, role, status, wajib_ganti_password")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.user_id !== user.id ||
      profile.status !== "AKTIF" ||
      !ALLOWED_ROLES.includes(profile.role as AllowedRole) ||
      profile.wajib_ganti_password !== true ||
      !profile.email_utama
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Akun tidak memenuhi syarat penggantian password awal.",
        },
        { status: 403 },
      );
    }

    const role = profile.role as AllowedRole;

    // 7. Pastikan akun aplikasi masih aktif dan role-nya sesuai.
    const { data: pengguna, error: penggunaError } = await supabaseAdmin
      .from("pengguna")
      .select("id, auth_user_id, aktif, role, unit_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (
      penggunaError ||
      !pengguna ||
      pengguna.auth_user_id !== user.id ||
      pengguna.aktif !== true ||
      pengguna.role !== role ||
      !pengguna.unit_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akun tidak aktif atau belum memiliki penugasan unit yang valid.",
        },
        { status: 403 },
      );
    }

    // 8. Pastikan akun memiliki tepat satu penugasan unit.
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
      return NextResponse.json(
        {
          success: false,
          error: "Penugasan unit akun belum valid. Hubungi administrator.",
        },
        { status: 403 },
      );
    }

    // 9. Verifikasi password lama.
    const { data: verified, error: verifyError } =
      await supabase.auth.signInWithPassword({
        email: profile.email_utama,
        password: passwordLama,
      });

    if (verifyError || !verified.user || verified.user.id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Password lama tidak benar.",
        },
        { status: 400 },
      );
    }

    // 10. Periksa kembali status profil sebelum mengganti password.
    const { data: currentProfile, error: currentProfileError } =
      await supabaseAdmin
        .from("user_profiles")
        .select("role, status, wajib_ganti_password, email_utama")
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      currentProfileError ||
      !currentProfile ||
      currentProfile.status !== "AKTIF" ||
      currentProfile.role !== role ||
      currentProfile.wajib_ganti_password !== true ||
      currentProfile.email_utama !== profile.email_utama
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Status akun berubah. Silakan login kembali.",
        },
        { status: 403 },
      );
    }

    // 11. Perbarui password Supabase Auth.
    const { error: updatePasswordError } = await supabase.auth.updateUser({
      password: passwordBaru,
    });

    if (updatePasswordError) {
      return NextResponse.json(
        {
          success: false,
          error: "Password gagal diperbarui. Silakan coba lagi.",
        },
        { status: 400 },
      );
    }

    // 12. Tandai password awal sudah diganti.
    const { data: updatedProfile, error: flagError } = await supabaseAdmin
      .from("user_profiles")
      .update({ wajib_ganti_password: false })
      .eq("user_id", user.id)
      .eq("status", "AKTIF")
      .eq("role", role)
      .eq("wajib_ganti_password", true)
      .select("user_id")
      .maybeSingle();

    if (flagError || !updatedProfile) {
      console.error(
        "Password berubah, tetapi wajib_ganti_password gagal diperbarui:",
        flagError?.message,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Password sudah berubah, tetapi status aktivasi belum tersimpan. Hubungi Admin untuk menyelesaikannya.",
        },
        { status: 500 },
      );
    }

    // 13. Tentukan dashboard berdasarkan role terverifikasi.
    return NextResponse.json({
      success: true,
      redirectTo: getDashboardPath(role),
    });
  } catch (error) {
    console.error("Ganti password error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 },
    );
  }
}
