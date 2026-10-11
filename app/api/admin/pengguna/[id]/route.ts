import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

const ALLOWED_EMPLOYEE_TYPES = ["MKS", "PENGAWAS"];
const PROTECTED_ROLES = ["SUPERADMIN", "ADMIN"];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function normalizedRole(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function validOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Origin boleh tidak dikirim oleh sebagian klien.
  // Autentikasi dan sesi tetap harus valid.
  if (!origin) return true;

  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

async function getServerSupabase() {
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
          // Route ini hanya memeriksa sesi.
          // Tidak mengubah cookie autentikasi dari sini.
        },
      },
    },
  );

  return { cookieStore, supabase };
}

async function requireAdmin() {
  const { cookieStore, supabase } = await getServerSupabase();

  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return {
      error: jsonError("Sesi aplikasi tidak ditemukan.", 401),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: jsonError("Sesi login tidak valid.", 401),
    };
  }

  const validSession = await hasValidAppSession(user.id, sessionToken);

  if (!validSession) {
    return {
      error: jsonError("Sesi aplikasi sudah tidak valid.", 401),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Pemeriksaan profil Admin gagal:", profileError);

    return {
      error: jsonError("Gagal memverifikasi hak akses Admin.", 500),
    };
  }

  if (
    !profile ||
    normalizedRole(profile.role) !== "ADMIN" ||
    normalizedRole(profile.status) !== "AKTIF"
  ) {
    return {
      error: jsonError(
        "Hanya Admin aktif yang boleh melakukan tindakan ini.",
        403,
      ),
    };
  }

  return { user };
}

async function getRouteId(context: RouteContext) {
  const { id } = await context.params;

  if (!id || id.length > 100) {
    return null;
  }

  return id;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AccountRecord = {
  id: string;
  auth_user_id: string | null;
  pegawai_id: string | null;
  role: string | null;
  unit_id: string | null;
  username?: string | null;
  aktif?: boolean | null;
};

async function getAccount(id: string) {
  const { data, error } = await supabaseAdmin
    .from("pengguna")
    .select("id, auth_user_id, pegawai_id, role, unit_id, username, aktif")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Gagal membaca akun:", error);

    return {
      account: null as AccountRecord | null,
      error: jsonError("Gagal membaca data akun.", 500),
    };
  }

  if (!data) {
    return {
      account: null as AccountRecord | null,
      error: jsonError("Akun tidak ditemukan.", 404),
    };
  }

  return {
    account: data as AccountRecord,
    error: null,
  };
}

async function revokeAccountSessions(account: AccountRecord, reason: string) {
  if (!account.auth_user_id) {
    return {
      error: jsonError("Akun tidak memiliki ID Supabase Auth.", 409),
    };
  }

  const { error: sessionError } = await supabaseAdmin
    .from("user_sessions")
    .delete()
    .eq("user_id", account.auth_user_id);

  if (sessionError) {
    console.error("Gagal mencabut sesi akun:", sessionError);

    return {
      error: jsonError(
        "Status akun sudah diperbarui, tetapi sesi gagal dicabut. Periksa sesi akun.",
        500,
      ),
    };
  }

  const now = new Date().toISOString();

  const { error: deviceError } = await supabaseAdmin
    .from("perangkat")
    .update({
      aktif: false,
      revoked_at: now,
      revoked_reason: reason,
      updated_at: now,
    })
    .eq("pengguna_id", account.id)
    .eq("aktif", true);

  if (deviceError) {
    console.error("Gagal mencabut perangkat:", deviceError);

    return {
      error: jsonError(
        "Status akun sudah diperbarui, tetapi perangkat gagal dicabut. Periksa perangkat akun.",
        500,
      ),
    };
  }

  return { error: null };
}

/**
 * PATCH
 *
 * Mendukung:
 * 1. Mengaktifkan atau menonaktifkan akun.
 * 2. Mengubah data pegawai.
 * 3. Mengubah email login.
 * 4. Memindahkan penugasan ke unit lain.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!validOrigin(request)) {
    return jsonError("Origin permintaan tidak valid.", 403);
  }

  const admin = await requireAdmin();

  if (admin.error) {
    return admin.error;
  }

  const id = await getRouteId(context);

  if (!id) {
    return jsonError("ID pengguna tidak valid.");
  }

  let body: Record<string, unknown>;

  try {
    const parsed = await request.json();

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonError("Isi permintaan harus berupa objek JSON.");
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError("Format JSON tidak valid.");
  }

  const { account, error: accountReadError } = await getAccount(id);

  if (accountReadError || !account) {
    return accountReadError ?? jsonError("Akun tidak ditemukan.", 404);
  }

  // STATUS AKUN
  // Harus diperiksa sebelum validasi data edit pegawai.
  if (typeof body.aktif === "boolean") {
    if (PROTECTED_ROLES.includes(normalizedRole(account.role))) {
      return jsonError(
        "Status akun Admin dan SUPERADMIN tidak dapat diubah di sini.",
        403,
      );
    }

    // Jika hanya meminta perubahan status, jangan memproses
    // kolom edit lain yang mungkin tidak dikirim.
    const { error: statusError } = await supabaseAdmin
      .from("pengguna")
      .update({
        aktif: body.aktif,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (statusError) {
      console.error("Gagal mengubah status akun:", statusError);

      return jsonError("Gagal mengubah status akun.", 500);
    }

    if (!body.aktif) {
      const revokeResult = await revokeAccountSessions(
        account,
        "Akun dinonaktifkan oleh Admin",
      );

      if (revokeResult.error) {
        return revokeResult.error;
      }
    }

    return NextResponse.json({
      success: true,
      message: body.aktif
        ? "Akun berhasil diaktifkan."
        : "Akun berhasil dinonaktifkan.",
    });
  }

  // EDIT DATA AKUN
  if (PROTECTED_ROLES.includes(normalizedRole(account.role))) {
    return jsonError(
      "Akun Admin dan SUPERADMIN tidak dapat diedit melalui fitur ini.",
      403,
    );
  }

  if (!account.pegawai_id || !account.auth_user_id) {
    return jsonError("Relasi akun dengan pegawai tidak lengkap.", 409);
  }

  const employeeFields = ["nama", "nip", "jabatan", "jenis_pegawai"] as const;

  const employeeUpdate: Record<string, string> = {};

  for (const field of employeeFields) {
    if (body[field] === undefined) continue;

    if (typeof body[field] !== "string") {
      return jsonError(`Kolom ${field} harus berupa teks.`);
    }

    const value = body[field].trim();

    if (!value || value.length > 200) {
      return jsonError(
        `Kolom ${field} tidak boleh kosong atau terlalu panjang.`,
      );
    }

    employeeUpdate[field] = value;
  }

  if (employeeUpdate.jenis_pegawai) {
    employeeUpdate.jenis_pegawai = employeeUpdate.jenis_pegawai.toUpperCase();

    if (!ALLOWED_EMPLOYEE_TYPES.includes(employeeUpdate.jenis_pegawai)) {
      return jsonError("Jenis pegawai harus MKS atau PENGAWAS.");
    }

    // Jenis pegawai harus tetap sesuai dengan role akun.
    if (normalizedRole(account.role) !== employeeUpdate.jenis_pegawai) {
      return jsonError(
        "Jenis pegawai harus sesuai dengan role akun. Perubahan role akun tidak dilakukan melalui fitur edit ini.",
      );
    }
  }

  let newEmail: string | undefined;

  if (body.email !== undefined) {
    if (typeof body.email !== "string") {
      return jsonError("Email tidak valid.");
    }

    newEmail = body.email.trim().toLowerCase();

    if (newEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return jsonError("Format email tidak valid.");
    }

    const { data: duplicate, error: duplicateError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("email_utama", newEmail)
      .neq("user_id", account.auth_user_id)
      .limit(1)
      .maybeSingle();

    if (duplicateError) {
      console.error("Pemeriksaan email gagal:", duplicateError);

      return jsonError("Gagal memeriksa email.", 500);
    }

    if (duplicate) {
      return jsonError("Email tersebut sudah digunakan akun lain.", 409);
    }
  }

  let newUnitId: string | undefined;

  if (body.unit_id !== undefined) {
    if (typeof body.unit_id !== "string" || !body.unit_id.trim()) {
      return jsonError("Unit penugasan tidak valid.");
    }

    newUnitId = body.unit_id.trim();

    const { data: unit, error: unitError } = await supabaseAdmin
      .from("unit")
      .select("id, status, archived_at")
      .eq("id", newUnitId)
      .maybeSingle();

    if (unitError) {
      console.error("Pemeriksaan unit gagal:", unitError);

      return jsonError("Gagal memeriksa unit.", 500);
    }

    if (!unit || unit.archived_at || normalizedRole(unit.status) !== "AKTIF") {
      return jsonError("Unit tidak ditemukan atau tidak aktif.");
    }
  }

  // Validasi NIP sebelum melakukan perubahan.
  if (employeeUpdate.nip) {
    const { data: duplicateEmployee, error: nipError } = await supabaseAdmin
      .from("pegawai")
      .select("id")
      .eq("nip", employeeUpdate.nip)
      .neq("id", account.pegawai_id)
      .limit(1)
      .maybeSingle();

    if (nipError) {
      console.error("Pemeriksaan NIP gagal:", nipError);

      return jsonError("Gagal memeriksa NIP.", 500);
    }

    if (duplicateEmployee) {
      return jsonError("NIP sudah digunakan pegawai lain.", 409);
    }
  }

  // Ubah email pada Supabase Auth dan profil.
  // Kedua operasi bukan transaksi atomik.
  if (newEmail) {
    const { error: authEmailError } =
      await supabaseAdmin.auth.admin.updateUserById(account.auth_user_id, {
        email: newEmail,
      });

    if (authEmailError) {
      console.error("Update email Auth gagal:", authEmailError);

      return jsonError(
        "Gagal mengubah email login. Periksa konfigurasi verifikasi email Supabase.",
        400,
      );
    }

    const { error: profileEmailError } = await supabaseAdmin
      .from("user_profiles")
      .update({ email_utama: newEmail })
      .eq("user_id", account.auth_user_id);

    if (profileEmailError) {
      console.error("Update email profil gagal:", profileEmailError);

      return jsonError(
        "Email login sudah diproses, tetapi profil gagal diperbarui. Periksa data akun sebelum mencoba kembali.",
        500,
      );
    }
  }

  if (Object.keys(employeeUpdate).length > 0) {
    const { error: employeeError } = await supabaseAdmin
      .from("pegawai")
      .update(employeeUpdate)
      .eq("id", account.pegawai_id);

    if (employeeError) {
      console.error("Update pegawai gagal:", employeeError);

      return jsonError(
        "Gagal memperbarui data pegawai. Periksa kembali data akun.",
        500,
      );
    }
  }

  if (newUnitId && newUnitId !== account.unit_id) {
    // MKS/PENGAWAS hanya memiliki satu unit penugasan.
    // Urutan ini belum atomik; kegagalan sebagian perlu diperiksa.
    const now = new Date().toISOString();

    const { error: accountUnitError } = await supabaseAdmin
      .from("pengguna")
      .update({
        unit_id: newUnitId,
        updated_at: now,
      })
      .eq("id", account.id);

    if (accountUnitError) {
      console.error("Update unit akun gagal:", accountUnitError);

      return jsonError(
        "Unit akun gagal diubah. Periksa data sebelum mencoba kembali.",
        500,
      );
    }

    const { error: employeeUnitError } = await supabaseAdmin
      .from("pegawai")
      .update({ unit_id: newUnitId })
      .eq("id", account.pegawai_id);

    if (employeeUnitError) {
      console.error("Update unit pegawai gagal:", employeeUnitError);

      return jsonError(
        "Unit akun sudah diperbarui, tetapi unit pegawai gagal diperbarui. Periksa konsistensi data.",
        500,
      );
    }

    const { error: deleteMappingError } = await supabaseAdmin
      .from("pengguna_unit")
      .delete()
      .eq("pengguna_id", account.id);

    if (deleteMappingError) {
      console.error("Hapus mapping unit gagal:", deleteMappingError);

      return jsonError(
        "Unit akun sudah diperbarui, tetapi pemetaan unit lama gagal dibersihkan.",
        500,
      );
    }

    const { error: insertMappingError } = await supabaseAdmin
      .from("pengguna_unit")
      .insert({
        pengguna_id: account.id,
        unit_id: newUnitId,
      });

    if (insertMappingError) {
      console.error("Simpan mapping unit gagal:", insertMappingError);

      return jsonError(
        "Unit akun sudah diperbarui, tetapi pemetaan unit baru gagal disimpan.",
        500,
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: "Data pegawai dan akun berhasil diperbarui.",
  });
}

/**
 * DELETE
 *
 * Menghapus akun login secara permanen,
 * tetapi mempertahankan data pegawai.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!validOrigin(request)) {
    return jsonError("Origin permintaan tidak valid.", 403);
  }

  const admin = await requireAdmin();

  if (admin.error) {
    return admin.error;
  }

  const id = await getRouteId(context);

  if (!id) {
    return jsonError("ID pengguna tidak valid.");
  }

  const { account, error: accountReadError } = await getAccount(id);

  if (accountReadError || !account) {
    return accountReadError ?? jsonError("Akun tidak ditemukan.", 404);
  }

  if (PROTECTED_ROLES.includes(normalizedRole(account.role))) {
    return jsonError(
      "Akun Admin dan SUPERADMIN tidak boleh dihapus dari halaman ini.",
      403,
    );
  }

  if (!account.auth_user_id) {
    return jsonError("Akun tidak memiliki ID Supabase Auth.", 409);
  }

  // Jangan menghapus akun yang sedang dipakai Admin.
  const { supabase } = await getServerSupabase();

  const {
    data: { user: currentUser },
    error: currentUserError,
  } = await supabase.auth.getUser();

  if (currentUserError || !currentUser) {
    return jsonError("Sesi login tidak valid.", 401);
  }

  if (currentUser.id === account.auth_user_id) {
    return jsonError("Akun yang sedang digunakan tidak boleh dihapus.", 409);
  }

  const now = new Date().toISOString();

  // Cabut sesi terlebih dahulu.
  const { error: sessionDeleteError } = await supabaseAdmin
    .from("user_sessions")
    .delete()
    .eq("user_id", account.auth_user_id);

  if (sessionDeleteError) {
    console.error("Pencabutan sesi gagal:", sessionDeleteError);

    return jsonError("Gagal mencabut sesi akun.", 500);
  }

  // Nonaktifkan perangkat yang masih terdaftar.
  const { error: deviceUpdateError } = await supabaseAdmin
    .from("perangkat")
    .update({
      aktif: false,
      revoked_at: now,
      revoked_reason: "Akun dihapus permanen oleh Admin",
      updated_at: now,
    })
    .eq("pengguna_id", account.id)
    .eq("aktif", true);

  if (deviceUpdateError) {
    console.error("Pencabutan perangkat gagal:", deviceUpdateError);

    return jsonError("Gagal mencabut perangkat. Akun belum dihapus.", 500);
  }

  // Hapus identitas login dari Supabase Auth.
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
    account.auth_user_id,
  );

  if (authDeleteError) {
    console.error("Hapus Supabase Auth gagal:", authDeleteError);

    return jsonError(
      "Supabase Auth menolak penghapusan akun. Data pegawai tetap disimpan.",
      500,
    );
  }

  // Bersihkan relasi aplikasi.
  // Data pegawai tidak ikut dihapus.
  const cleanupResults = await Promise.all([
    supabaseAdmin.from("pengguna_unit").delete().eq("pengguna_id", account.id),

    supabaseAdmin.from("perangkat").delete().eq("pengguna_id", account.id),

    supabaseAdmin.from("pengguna").delete().eq("id", account.id),
  ]);

  const cleanupFailed = cleanupResults.some((result) => Boolean(result.error));

  if (cleanupFailed) {
    console.error(
      "Sebagian pembersihan akun gagal:",
      cleanupResults.map((result) => result.error),
    );

    return jsonError(
      "Identitas login sudah dihapus, tetapi sebagian data akun gagal dibersihkan. Jangan ulangi penghapusan sebelum memeriksa tabel pengguna, pengguna_unit, perangkat, dan user_profiles.",
      500,
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "Akun login berhasil dihapus permanen. Data pegawai tetap disimpan.",
  });
}
