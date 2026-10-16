import "server-only";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

export type SerahTerimaRole = "ADMIN" | "MKS" | "PENGAWAS";

export type SerahTerimaAuth = {
  ok: true;
  userId: string;
  role: SerahTerimaRole;
  unitIds: string[];
};

export type SerahTerimaAuthError = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export type SerahTerimaAuthResult = SerahTerimaAuth | SerahTerimaAuthError;

export async function requireSerahTerimaAuth(): Promise<SerahTerimaAuthResult> {
  try {
    // 1. Periksa sesi aplikasi JOSJIS.
    const cookieStore = await cookies();
    const token = cookieStore.get(APP_SESSION_COOKIE)?.value;

    if (!token) {
      return {
        ok: false,
        status: 401,
        error: "Sesi aplikasi tidak ditemukan. Silakan login kembali.",
      };
    }

    // 2. Verifikasi identitas Supabase Auth.
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

    // 3. Pastikan sesi aplikasi masih berlaku.
    const validSession = await hasValidAppSession(user.id, token);

    if (!validSession) {
      return {
        ok: false,
        status: 401,
        error: "Sesi aplikasi sudah tidak aktif atau kedaluwarsa.",
      };
    }

    // 4. Periksa profil dan role terkini.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Gagal memeriksa profil serah terima:", profileError);
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

    const role = String(profile.role ?? "").toUpperCase();

    if (!["ADMIN", "MKS", "PENGAWAS"].includes(role)) {
      return {
        ok: false,
        status: 403,
        error: "Role Anda tidak memiliki akses ke modul ini.",
      };
    }

    // 5. Admin aktif dapat mengakses semua unit.
    if (role === "ADMIN") {
      return {
        ok: true,
        userId: user.id,
        role: "ADMIN",
        unitIds: [],
      };
    }

    // 6. Untuk MKS/Pengawas, cocokkan profil dengan akun pengguna aktif.
    const { data: pengguna, error: penggunaError } = await supabaseAdmin
      .from("pengguna")
      .select("id, auth_user_id, role, unit_id, aktif")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (penggunaError) {
      console.error("Gagal memeriksa pengguna serah terima:", penggunaError);
      return {
        ok: false,
        status: 403,
        error: "Data pengguna tidak dapat diverifikasi.",
      };
    }

    if (
      !pengguna ||
      pengguna.aktif !== true ||
      String(pengguna.role ?? "").toUpperCase() !== role ||
      !pengguna.unit_id
    ) {
      return {
        ok: false,
        status: 403,
        error: "Akun pengguna tidak aktif atau konfigurasi unit tidak valid.",
      };
    }

    // 7. Ambil unit yang memang terdaftar untuk akun tersebut.
    const { data: relasiUnit, error: unitError } = await supabaseAdmin
      .from("pengguna_unit")
      .select("unit_id")
      .eq("pengguna_id", pengguna.id);

    if (unitError) {
      console.error("Gagal memeriksa unit pengguna:", unitError);
      return {
        ok: false,
        status: 403,
        error: "Hak akses unit tidak dapat diverifikasi.",
      };
    }

    const unitIds = [
      ...new Set(
        (relasiUnit ?? [])
          .map((item) => item.unit_id)
          .filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          ),
      ),
    ];

    // Unit utama juga harus terdaftar dalam relasi pengguna_unit.
    if (!unitIds.includes(pengguna.unit_id)) {
      return {
        ok: false,
        status: 403,
        error: "Unit utama akun tidak terdaftar dalam hak akses unit.",
      };
    }

    return {
      ok: true,
      userId: user.id,
      role: role as "MKS" | "PENGAWAS",
      unitIds,
    };
  } catch (error) {
    console.error("Kesalahan autentikasi serah terima:", error);

    return {
      ok: false,
      status: 401,
      error: "Autentikasi gagal. Silakan login kembali.",
    };
  }
}

export async function requireSerahTerimaAdmin(): Promise<SerahTerimaAuthResult> {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) return auth;

  if (auth.role !== "ADMIN") {
    return {
      ok: false,
      status: 403,
      error: "Aksi ini hanya dapat dilakukan ADMIN aktif.",
    };
  }

  return auth;
}

export function canAccessSerahTerimaUnit(
  auth: SerahTerimaAuth,
  unitId: string,
): boolean {
  return auth.role === "ADMIN" || auth.unitIds.includes(unitId);
}
