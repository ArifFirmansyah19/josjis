import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function verifyAdmin() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const token = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (error || !user || !token || !(await hasValidAppSession(user.id, token))) {
    return {
      error: jsonError("Sesi tidak valid. Silakan login kembali.", 401),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "ADMIN" ||
    profile.status !== "AKTIF"
  ) {
    return {
      error: jsonError("Akses hanya untuk Admin aktif.", 403),
    };
  }

  return { error: null };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const origin = request.headers.get("origin");

    if (origin && origin !== new URL(request.url).origin) {
      return jsonError("Origin permintaan tidak valid.", 403);
    }

    const auth = await verifyAdmin();

    if (auth.error) return auth.error;

    const { id } = await params;

    if (!id) {
      return jsonError("ID perangkat tidak valid.", 400);
    }

    const { data: device, error: deviceError } = await supabaseAdmin
      .from("perangkat")
      .select("id, pengguna_id, aktif, revoked_at")
      .eq("id", id)
      .maybeSingle();

    if (deviceError) {
      console.error(deviceError.message);
      return jsonError("Gagal memeriksa perangkat.", 500);
    }

    if (!device) {
      return jsonError("Perangkat tidak ditemukan.", 404);
    }

    if (!device.aktif) {
      return NextResponse.json({
        success: true,
        message: "Perangkat sudah nonaktif.",
      });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("perangkat")
      .update({
        aktif: false,
        revoked_at: now,
        revoked_reason: "Dicabut oleh Admin",
        updated_at: now,
      })
      .eq("id", id)
      .eq("aktif", true);

    if (updateError) {
      console.error(updateError.message);
      return jsonError("Gagal mencabut perangkat.", 500);
    }

    return NextResponse.json({
      success: true,
      message: "Perangkat berhasil dinonaktifkan.",
      perangkat_id: id,
      pengguna_id: device.pengguna_id,
    });
  } catch (error) {
    console.error("Kesalahan API cabut perangkat:", error);

    return jsonError("Terjadi kesalahan pada server.", 500);
  }
}
