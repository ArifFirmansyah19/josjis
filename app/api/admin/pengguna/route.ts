import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

export const runtime = "nodejs";

type AccountRole = "MKS" | "PENGAWAS";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // GET tidak perlu mengubah cookie.
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

    if (
      authError ||
      !user ||
      !sessionToken ||
      !(await hasValidAppSession(user.id, sessionToken))
    ) {
      return NextResponse.json(
        { error: "Sesi tidak valid. Silakan login kembali." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !== "ADMIN" ||
      profile.status !== "AKTIF"
    ) {
      return NextResponse.json(
        { error: "Akses hanya untuk Admin aktif." },
        { status: 403 },
      );
    }

    const [
      pegawaiResult,
      unitResult,
      penggunaResult,
      profilResult,
      perangkatResult,
      penggunaUnitResult,
      mksResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("pegawai")
        .select("id, nama, nip, jabatan, jenis_pegawai, unit_id, aktif")
        .order("nama"),

      supabaseAdmin
        .from("unit")
        .select("id, nama_unit, kode_unit, kode_legacy, status, archived_at")
        .order("nama_unit"),

      supabaseAdmin
        .from("pengguna")
        .select(
          "id, auth_user_id, pegawai_id, role, unit_id, username, aktif, last_login_at, last_seen_at, created_at",
        )
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("user_profiles")
        .select(
          "user_id, nip, email_utama, role, status, wajib_ganti_password",
        ),

      supabaseAdmin
        .from("perangkat")
        .select(
          "id, pengguna_id, nama_perangkat, jenis_perangkat, platform, browser, aktif, terdaftar_at, last_seen_at, revoked_at, revoked_reason",
        ),

      supabaseAdmin.from("pengguna_unit").select("pengguna_id, unit_id"),

      supabaseAdmin
        .from("mks")
        .select("id, pegawai_id, pengawas_id, kode_agen"),
    ]);

    const results = [
      pegawaiResult,
      unitResult,
      penggunaResult,
      profilResult,
      perangkatResult,
      penggunaUnitResult,
      mksResult,
    ];

    const failed = results.find((result) => result.error);

    if (failed?.error) {
      console.error(
        "Gagal memuat data halaman Pengguna:",
        failed.error.message,
      );

      return NextResponse.json(
        { error: "Data pengguna gagal dimuat." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      pegawai: pegawaiResult.data ?? [],
      units: unitResult.data ?? [],
      pengguna: penggunaResult.data ?? [],
      profiles: profilResult.data ?? [],
      perangkat: perangkatResult.data ?? [],
      pengguna_unit: penggunaUnitResult.data ?? [],
      mks: mksResult.data ?? [],
    });
  } catch (error) {
    console.error("Kesalahan API daftar pengguna:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat memuat data pengguna." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;
  let createdProfile = false;
  let createdPenggunaId: string | null = null;

  try {
    // 1. Validasi origin jika header Origin dikirim browser.
    const origin = request.headers.get("origin");

    if (origin && origin !== request.nextUrl.origin) {
      return jsonError("Permintaan tidak diizinkan.", 403);
    }

    // 2. Validasi sesi Supabase dan sesi aplikasi.
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
              // Cookie mungkin tidak dapat diubah pada konteks tertentu.
            }
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

    if (
      authError ||
      !user ||
      !sessionToken ||
      !(await hasValidAppSession(user.id, sessionToken))
    ) {
      return jsonError("Sesi login tidak valid atau sudah berakhir.", 401);
    }

    // 3. Hanya Admin aktif yang boleh membuat akun.
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("user_profiles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      adminError ||
      !adminProfile ||
      adminProfile.role !== "ADMIN" ||
      adminProfile.status !== "AKTIF"
    ) {
      return jsonError("Hanya Admin aktif yang dapat membuat akun.", 403);
    }

    // 4. Validasi input.
    const body = await request.json();

    const pegawaiId =
      typeof body.pegawai_id === "string" ? body.pegawai_id.trim() : "";

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const password =
      typeof body.password_awal === "string" ? body.password_awal : "";

    const requestedUnitIds: unknown = body.unit_ids;

    if (
      !pegawaiId ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 12 ||
      password.length > 256
    ) {
      return jsonError(
        "Pegawai, email valid, dan password awal minimal 12 karakter wajib diisi.",
        400,
      );
    }

    if (
      requestedUnitIds !== undefined &&
      (!Array.isArray(requestedUnitIds) ||
        requestedUnitIds.some((id) => typeof id !== "string" || !id.trim()))
    ) {
      return jsonError("Daftar unit tidak valid.", 400);
    }

    // 5. Ambil data pegawai dari database, bukan dari browser.
    const { data: pegawai, error: pegawaiError } = await supabaseAdmin
      .from("pegawai")
      .select("id, nama, nip, jenis_pegawai, jabatan, unit_id, aktif")
      .eq("id", pegawaiId)
      .maybeSingle();

    if (pegawaiError) {
      console.error("Gagal membaca data pegawai:", pegawaiError.message);
      return jsonError("Data pegawai belum dapat diperiksa.", 500);
    }

    if (!pegawai || !pegawai.aktif) {
      return jsonError("Pegawai tidak ditemukan atau tidak aktif.", 404);
    }

    if (!pegawai.nip?.trim()) {
      return jsonError("Pegawai belum memiliki NIP.", 400);
    }

    // MKA dan Branch Manager tidak dibuat melalui formulir akun biasa.
    let role: AccountRole;

    if (pegawai.jenis_pegawai === "MKS") {
      role = "MKS";
    } else if (pegawai.jenis_pegawai === "PENGAWAS") {
      role = "PENGAWAS";
    } else {
      return jsonError(
        "Hanya pegawai MKS dan PENGAWAS yang dapat dibuatkan akun biasa.",
        400,
      );
    }

    // 6. Akun pegawai tidak boleh dibuat dua kali, termasuk akun nonaktif.
    const { data: existingAccount, error: existingAccountError } =
      await supabaseAdmin
        .from("pengguna")
        .select("id, aktif")
        .eq("pegawai_id", pegawai.id)
        .maybeSingle();

    if (existingAccountError) {
      console.error(
        "Gagal memeriksa akun pegawai:",
        existingAccountError.message,
      );
      return jsonError("Akun pegawai belum dapat diperiksa.", 500);
    }

    if (existingAccount) {
      return jsonError(
        existingAccount.aktif
          ? "Pegawai sudah memiliki akun."
          : "Pegawai memiliki akun nonaktif. Aktifkan kembali akun lama.",
        409,
      );
    }

    // Mencegah profil yatim untuk NIP yang sama.
    const { data: existingProfile, error: existingProfileError } =
      await supabaseAdmin
        .from("user_profiles")
        .select("user_id")
        .eq("nip", pegawai.nip.trim())
        .maybeSingle();

    if (existingProfileError) {
      console.error(
        "Gagal memeriksa profil NIP:",
        existingProfileError.message,
      );
      return jsonError("Profil pegawai belum dapat diperiksa.", 500);
    }

    if (existingProfile) {
      return jsonError(
        "NIP sudah terdaftar pada profil login. Periksa atau pulihkan akun lama.",
        409,
      );
    }

    // 7. Validasi unit penugasan.
    const rawUnitIds =
      requestedUnitIds === undefined
        ? pegawai.unit_id
          ? [pegawai.unit_id]
          : []
        : (requestedUnitIds as string[]);

    const unitIds = [...new Set(rawUnitIds.map((id) => id.trim()))];

    if (unitIds.length === 0) {
      return jsonError("Pilih minimal satu unit penugasan.", 400);
    }

    // MKS dan PENGAWAS masing-masing hanya boleh memiliki satu unit.
    if (unitIds.length !== 1) {
      return jsonError(
        `Akun ${role} hanya boleh ditugaskan ke satu unit.`,
        400,
      );
    }

    const { data: units, error: unitsError } = await supabaseAdmin
      .from("unit")
      .select("id, status, archived_at")
      .in("id", unitIds);

    if (unitsError) {
      console.error("Gagal memeriksa unit:", unitsError.message);
      return jsonError("Unit belum dapat diperiksa.", 500);
    }

    if (
      !units ||
      units.length !== unitIds.length ||
      units.some((unit) => unit.status !== "AKTIF" || unit.archived_at !== null)
    ) {
      return jsonError(
        "Salah satu unit tidak aktif atau tidak ditemukan.",
        400,
      );
    }

    // 8. Buat identitas Supabase Auth di server.
    const { data: authData, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createAuthError || !authData.user) {
      console.error("Gagal membuat identitas login:", createAuthError?.message);
      return jsonError(
        "Identitas login gagal dibuat. Periksa email dan konfigurasi Auth.",
        400,
      );
    }

    createdAuthUserId = authData.user.id;

    // 9. Buat profil. Password tidak disimpan ke tabel aplikasi.
    const { error: profileInsertError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        user_id: createdAuthUserId,
        nip: pegawai.nip.trim(),
        email_utama: email,
        role,
        status: "AKTIF",
        wajib_ganti_password: true,
      });

    if (profileInsertError) {
      console.error(
        "Gagal membuat profil pengguna:",
        profileInsertError.message,
      );
      throw new Error("PROFILE_INSERT_FAILED");
    }

    createdProfile = true;

    // 10. Buat akun aplikasi.
    const { data: pengguna, error: penggunaInsertError } = await supabaseAdmin
      .from("pengguna")
      .insert({
        auth_user_id: createdAuthUserId,
        pegawai_id: pegawai.id,
        role,
        unit_id: unitIds[0],
        username: pegawai.nip.trim(),
        aktif: true,
      })
      .select("id")
      .single();

    if (penggunaInsertError || !pengguna) {
      console.error(
        "Gagal membuat akun aplikasi:",
        penggunaInsertError?.message,
      );
      throw new Error("PENGGUNA_INSERT_FAILED");
    }

    createdPenggunaId = pengguna.id;

    // 11. Simpan seluruh unit penugasan.
    const { error: penggunaUnitError } = await supabaseAdmin
      .from("pengguna_unit")
      .insert(
        unitIds.map((unitId) => ({
          pengguna_id: pengguna.id,
          unit_id: unitId,
        })),
      );

    if (penggunaUnitError) {
      console.error(
        "Gagal menyimpan unit pengguna:",
        penggunaUnitError.message,
      );
      throw new Error("PENGGUNA_UNIT_INSERT_FAILED");
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Akun berhasil dibuat. Pengguna wajib mengganti password saat login pertama.",
        pengguna: {
          id: pengguna.id,
          pegawai_id: pegawai.id,
          nama: pegawai.nama,
          nip: pegawai.nip,
          role,
          unit_ids: unitIds,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // Pembersihan kompensasi jika salah satu tahap setelah createUser gagal.
    // Urutannya mengikuti foreign key dan hanya menghapus data yang dibuat di sini.
    try {
      if (createdPenggunaId) {
        await supabaseAdmin
          .from("pengguna_unit")
          .delete()
          .eq("pengguna_id", createdPenggunaId);

        await supabaseAdmin
          .from("pengguna")
          .delete()
          .eq("id", createdPenggunaId);
      }

      if (createdProfile && createdAuthUserId) {
        await supabaseAdmin
          .from("user_profiles")
          .delete()
          .eq("user_id", createdAuthUserId);
      }

      if (createdAuthUserId) {
        const { error: cleanupError } =
          await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);

        if (cleanupError) {
          console.error(
            "Pembersihan identitas Auth gagal:",
            cleanupError.message,
          );
        }
      }
    } catch (cleanupError) {
      console.error("Pembersihan akun gagal:", cleanupError);
    }

    if (
      error instanceof Error &&
      [
        "PROFILE_INSERT_FAILED",
        "PENGGUNA_INSERT_FAILED",
        "PENGGUNA_UNIT_INSERT_FAILED",
      ].includes(error.message)
    ) {
      return jsonError(
        "Pembuatan akun gagal. Sistem telah mencoba membersihkan data yang sempat dibuat; periksa database jika masalah berlanjut.",
        500,
      );
    }

    console.error("Kesalahan API pembuatan akun:", error);
    return jsonError("Terjadi kesalahan pada server.", 500);
  }
}
