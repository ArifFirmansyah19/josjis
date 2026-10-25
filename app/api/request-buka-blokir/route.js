import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

export const dynamic = "force-dynamic";

const TABLE = "request_buka_blokir";

function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseAmount(value, label) {
  if (value === "" || value === null || value === undefined) {
    return { value: 0 };
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0 || number > 9999999999999999) {
    return { error: `${label} harus berupa angka nol atau lebih.` };
  }

  return { value: number };
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function getJakartaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getCurrentMonth() {
  return getJakartaDate().slice(0, 7);
}

function getMonthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);

  return {
    start: `${month}-01`,
    end: new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10),
  };
}

/* =========================================================
   AUTH DAN VALIDASI AKTOR
========================================================= */

async function getActor() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: "Sesi login tidak valid. Silakan login kembali.",
      status: 401,
    };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (!sessionToken || !(await hasValidAppSession(user.id, sessionToken))) {
    return {
      error: "Sesi aplikasi tidak valid. Silakan login kembali.",
      status: 401,
    };
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
    profile.status !== "AKTIF"
  ) {
    return {
      error: "Profil pengguna tidak valid atau tidak aktif.",
      status: 403,
    };
  }

  if (profile.wajib_ganti_password) {
    return {
      error: "Silakan ganti password terlebih dahulu.",
      status: 403,
    };
  }

  if (!["ADMIN", "MKS"].includes(profile.role)) {
    return {
      error: "Anda tidak memiliki akses ke Request Buka Blokir.",
      status: 403,
    };
  }

  if (profile.role === "ADMIN") {
    return { user, profile, role: "ADMIN" };
  }

  const { data: pengguna, error: penggunaError } = await supabaseAdmin
    .from("pengguna")
    .select("id, pegawai_id, role, unit_id, aktif")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    penggunaError ||
    !pengguna ||
    !pengguna.aktif ||
    pengguna.role !== "MKS" ||
    !pengguna.unit_id ||
    !pengguna.pegawai_id
  ) {
    return {
      error: "Penugasan MKS tidak valid.",
      status: 403,
    };
  }

  const { data: penugasanUnit, error: penugasanError } = await supabaseAdmin
    .from("pengguna_unit")
    .select("unit_id")
    .eq("pengguna_id", pengguna.id);

  if (
    penugasanError ||
    !penugasanUnit ||
    penugasanUnit.length !== 1 ||
    penugasanUnit[0].unit_id !== pengguna.unit_id
  ) {
    return {
      error: "Penugasan unit MKS tidak valid.",
      status: 403,
    };
  }

  const { data: pegawai, error: pegawaiError } = await supabaseAdmin
    .from("pegawai")
    .select("id, nama, unit_id, aktif")
    .eq("id", pengguna.pegawai_id)
    .maybeSingle();

  if (
    pegawaiError ||
    !pegawai ||
    !pegawai.aktif ||
    pegawai.unit_id !== pengguna.unit_id
  ) {
    return {
      error: "Data pegawai MKS tidak valid.",
      status: 403,
    };
  }

  const { data: mks, error: mksError } = await supabaseAdmin
    .from("mks")
    .select("id")
    .eq("pegawai_id", pegawai.id)
    .maybeSingle();

  if (mksError || !mks) {
    return {
      error: "Data MKS tidak ditemukan.",
      status: 403,
    };
  }

  return {
    user,
    profile,
    role: "MKS",
    pengguna,
    pegawai,
    mks,
  };
}

/* =========================================================
   UNIT AKTIF
   Admin: berdasarkan unit_kode dari Topbar.
   MKS: selalu berdasarkan penugasan server.
========================================================= */

/* =========================================================
   UNIT AKTIF
   Admin: berdasarkan unit aktif Topbar.
   Mendukung kode_unit (JKK1/JKK2) dan kode_legacy
   (11081A/11081B).
   MKS: selalu berdasarkan penugasan server.
========================================================= */

async function resolveUnit(actor, unitKode) {
  // MKS tidak boleh mengganti unit melalui parameter browser.
  if (actor.role === "MKS") {
    const { data: unit, error } = await supabaseAdmin
      .from("unit")
      .select("id, nama_unit, kode_unit, kode_legacy")
      .eq("id", actor.pengguna.unit_id)
      .eq("status", "AKTIF")
      .maybeSingle();

    if (error) {
      console.error("Resolve unit MKS:", error);
      return {
        error: "Gagal memeriksa unit penugasan MKS.",
        status: 500,
      };
    }

    if (!unit) {
      return {
        error: "Unit penugasan MKS tidak ditemukan atau tidak aktif.",
        status: 403,
      };
    }

    return { unit };
  }

  const requestedCode = String(unitKode || "")
    .trim()
    .toUpperCase();

  if (!requestedCode) {
    return {
      error: "Unit aktif Topbar belum tersedia. Pilih unit terlebih dahulu.",
      status: 400,
    };
  }

  // Cari berdasarkan kode utama terlebih dahulu.
  let { data: unit, error } = await supabaseAdmin
    .from("unit")
    .select("id, nama_unit, kode_unit, kode_legacy")
    .eq("kode_unit", requestedCode)
    .eq("status", "AKTIF")
    .maybeSingle();

  if (error) {
    console.error("Resolve unit berdasarkan kode_unit:", error);
    return {
      error: "Gagal memeriksa unit aktif.",
      status: 500,
    };
  }

  // Jika Topbar mengirim 11081A/11081B,
  // cari berdasarkan kode_legacy.
  if (!unit) {
    const legacyResult = await supabaseAdmin
      .from("unit")
      .select("id, nama_unit, kode_unit, kode_legacy")
      .eq("kode_legacy", requestedCode)
      .eq("status", "AKTIF")
      .maybeSingle();

    if (legacyResult.error) {
      console.error(
        "Resolve unit berdasarkan kode_legacy:",
        legacyResult.error,
      );
      return {
        error: "Gagal memeriksa kode unit aktif.",
        status: 500,
      };
    }

    unit = legacyResult.data;
  }

  if (!unit) {
    return {
      error: `Unit "${requestedCode}" tidak ditemukan atau tidak aktif.`,
      status: 404,
    };
  }

  return { unit };
}

async function resolveMksNames(rows) {
  const mksIds = [
    ...new Set((rows || []).map((row) => row.mks_id).filter(Boolean)),
  ];

  if (mksIds.length === 0) return {};

  const { data: mksRows, error: mksError } = await supabaseAdmin
    .from("mks")
    .select("id, pegawai_id")
    .in("id", mksIds);

  if (mksError) throw mksError;

  const pegawaiIds = [
    ...new Set((mksRows || []).map((row) => row.pegawai_id).filter(Boolean)),
  ];

  let pegawaiRows = [];

  if (pegawaiIds.length) {
    const { data, error } = await supabaseAdmin
      .from("pegawai")
      .select("id, nama")
      .in("id", pegawaiIds);

    if (error) throw error;
    pegawaiRows = data || [];
  }

  const namesByPegawai = Object.fromEntries(
    pegawaiRows.map((row) => [row.id, row.nama]),
  );

  return Object.fromEntries(
    (mksRows || []).map((row) => [
      row.id,
      namesByPegawai[row.pegawai_id] || "MKS",
    ]),
  );
}

function validateForm(body) {
  const nama = String(body.nama_debitur || "").trim();
  const rekeningPinjaman = String(body.nomor_rekening_pinjaman || "").trim();
  const rekeningTabungan = String(body.nomor_rekening_tabungan || "").trim();
  const tujuan = String(body.tujuan_bb || "").trim();

  if (!nama || !rekeningPinjaman || !rekeningTabungan || !tujuan) {
    return {
      error:
        "Nama debitur, rekening pinjaman, rekening tabungan, dan Tujuan BB wajib diisi.",
    };
  }

  if (
    nama.length > 200 ||
    rekeningPinjaman.length > 100 ||
    rekeningTabungan.length > 100 ||
    tujuan.length > 2000
  ) {
    return { error: "Ada isian yang melebihi batas karakter." };
  }

  const awal = parseAmount(body.blokiran_awal, "Blokiran Awal");
  const dibuka = parseAmount(body.blokiran_dibuka, "Blokiran Dibuka");
  const kembali = parseAmount(body.dikembalikan, "Dikembalikan");

  if (awal.error || dibuka.error || kembali.error) {
    return {
      error: awal.error || dibuka.error || kembali.error,
    };
  }

  if (body.tanggal && !validDate(body.tanggal)) {
    return { error: "Tanggal pengajuan tidak valid." };
  }

  return {
    data: {
      tanggal: body.tanggal || getJakartaDate(),
      nama_debitur: nama,
      nomor_rekening_pinjaman: rekeningPinjaman,
      nomor_rekening_tabungan: rekeningTabungan,
      blokiran_awal: awal.value,
      blokiran_dibuka: dibuka.value,
      dikembalikan: kembali.value,
      tujuan_bb: tujuan,
    },
  };
}

/* =========================================================
   GET: DAFTAR REQUEST DALAM UNIT AKTIF
========================================================= */

export async function GET(request) {
  try {
    const actor = await getActor();

    if (actor.error) {
      return jsonError(actor.error, actor.status);
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("bulan") || getCurrentMonth();
    const range = getMonthRange(month);

    if (!range) {
      return jsonError("Format bulan tidak valid.", 400);
    }

    const resolved = await resolveUnit(actor, searchParams.get("unit_kode"));

    if (resolved.error) {
      return jsonError(resolved.error, resolved.status);
    }

    const { unit } = resolved;

    let query = supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("unit_id", unit.id)
      .gte("tanggal", range.start)
      .lt("tanggal", range.end)
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });

    if (actor.role === "MKS") {
      query = query
        .eq("mks_id", actor.mks.id)
        .eq("pemohon_user_id", actor.user.id);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("GET request rows:", error);
      return jsonError("Gagal mengambil data request.", 500);
    }

    const mksNames = await resolveMksNames(rows || []);

    let units = [];

    if (actor.role === "ADMIN") {
      const { data: unitRows, error: unitsError } = await supabaseAdmin
        .from("unit")
        .select("id, nama_unit, kode_unit")
        .eq("status", "AKTIF")
        .order("nama_unit");

      if (unitsError) throw unitsError;
      units = unitRows || [];
    }

    return NextResponse.json({
      success: true,
      role: actor.role,
      unit,
      units,
      rows: (rows || []).map((row) => ({
        ...row,
        is_locked: row.is_locked === true,
        nama_mks: mksNames[row.mks_id] || row.pemohon_nama || "MKS",
      })),
    });
  } catch (error) {
    console.error("GET Request Buka Blokir:", error);
    return jsonError("Terjadi kesalahan saat memuat Request Buka Blokir.", 500);
  }
}

/* =========================================================
   POST: MKS MEMBUAT REQUEST
========================================================= */

export async function POST(request) {
  try {
    const actor = await getActor();

    if (actor.error) {
      return jsonError(actor.error, actor.status);
    }

    if (actor.role !== "MKS") {
      return jsonError("Hanya MKS yang dapat membuat request.", 403);
    }

    const body = await request.json();
    const validated = validateForm(body);

    if (validated.error) {
      return jsonError(validated.error, 400);
    }

    const insertData = {
      ...validated.data,
      unit_id: actor.pengguna.unit_id,
      mks_id: actor.mks.id,
      pemohon_user_id: actor.user.id,
      pemohon_pegawai_id: actor.pegawai.id,
      pemohon_nama: actor.pegawai.nama,
      status_dibuka: "BELUM",
      status_pengembalian: "BELUM",
      is_locked: false,
    };

    const { data: created, error } = await supabaseAdmin
      .from(TABLE)
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      console.error("POST request insert:", error);
      return jsonError("Gagal menyimpan request ke database.", 500);
    }

    return NextResponse.json(
      {
        success: true,
        row: { ...created, nama_mks: actor.pegawai.nama },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST Request Buka Blokir:", error);
    return jsonError("Terjadi kesalahan saat menyimpan request.", 500);
  }
}

/* =========================================================
   PUT: MKS MENGEDIT REQUEST MILIKNYA YANG BELUM TERKUNCI
========================================================= */

export async function PUT(request) {
  try {
    const actor = await getActor();

    if (actor.error) {
      return jsonError(actor.error, actor.status);
    }

    if (actor.role !== "MKS") {
      return jsonError("Hanya MKS yang dapat mengedit data pengajuan.", 403);
    }

    const body = await request.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return jsonError("ID pengajuan tidak tersedia.", 400);
    }

    const validated = validateForm(body);

    if (validated.error) {
      return jsonError(validated.error, 400);
    }

    const { data: current, error: readError } = await supabaseAdmin
      .from(TABLE)
      .select(
        "id, unit_id, mks_id, pemohon_user_id, is_locked, status_dibuka, status_pengembalian",
      )
      .eq("id", id)
      .eq("unit_id", actor.pengguna.unit_id)
      .eq("mks_id", actor.mks.id)
      .eq("pemohon_user_id", actor.user.id)
      .maybeSingle();

    if (readError) throw readError;

    if (!current) {
      return jsonError("Pengajuan tidak ditemukan atau bukan milik Anda.", 404);
    }

    if (current.is_locked) {
      return jsonError(
        "Pengajuan sudah dikunci Admin dan tidak dapat diedit.",
        409,
      );
    }

    if (
      current.status_dibuka === "DONE" ||
      current.status_pengembalian === "DONE"
    ) {
      return jsonError(
        "Pengajuan yang sudah diproses tidak dapat diedit.",
        409,
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from(TABLE)
      .update({
        ...validated.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("unit_id", actor.pengguna.unit_id)
      .eq("mks_id", actor.mks.id)
      .eq("pemohon_user_id", actor.user.id)
      .eq("is_locked", false)
      .select("*")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      return jsonError(
        "Data tidak berhasil diubah. Mungkin pengajuan sudah dikunci Admin.",
        409,
      );
    }

    return NextResponse.json({ success: true, row: updated });
  } catch (error) {
    console.error("PUT Request Buka Blokir:", error);
    return jsonError("Terjadi kesalahan saat mengedit pengajuan.", 500);
  }
}

/* =========================================================
   PATCH: ADMIN MENGUNCI DAN MEMPROSES REQUEST
========================================================= */

export async function PATCH(request) {
  try {
    const actor = await getActor();

    if (actor.error) {
      return jsonError(actor.error, actor.status);
    }

    if (actor.role !== "ADMIN") {
      return jsonError("Hanya Admin yang dapat memproses pengajuan.", 403);
    }

    const body = await request.json();
    const id = String(body.id || "").trim();
    const action = String(body.action || "");
    const unitKode = String(body.unit_kode || "");

    if (!id || !unitKode) {
      return jsonError("ID pengajuan atau unit aktif tidak tersedia.", 400);
    }

    const resolved = await resolveUnit(actor, unitKode);

    if (resolved.error) {
      return jsonError(resolved.error, resolved.status);
    }

    const unitId = resolved.unit.id;

    const { data: current, error: readError } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("unit_id", unitId)
      .maybeSingle();

    if (readError) throw readError;

    if (!current) {
      return jsonError(
        "Pengajuan tidak ditemukan pada unit aktif Topbar.",
        404,
      );
    }

    const now = new Date().toISOString();
    let updateData = {};

    if (action === "lock") {
      if (current.is_locked) {
        return jsonError("Pengajuan sudah terkunci.", 409);
      }

      updateData = {
        is_locked: true,
        locked_at: now,
        locked_by: actor.user.id,
        updated_at: now,
      };
    } else if (action === "unlock") {
      updateData = {
        is_locked: false,
        locked_at: null,
        locked_by: null,
        updated_at: now,
      };
    } else {
      const field = body.field;
      const value = body.value;

      if (
        !["status_dibuka", "status_pengembalian"].includes(field) ||
        !["BELUM", "DONE"].includes(value)
      ) {
        return jsonError("Data perubahan status tidak valid.", 400);
      }

      if (field === "status_dibuka") {
        updateData = {
          status_dibuka: value,
          status_dibuka_oleh: value === "DONE" ? actor.user.id : null,
          status_dibuka_at: value === "DONE" ? now : null,
          updated_at: now,
        };

        if (value === "BELUM") {
          updateData.status_pengembalian = "BELUM";
          updateData.status_pengembalian_oleh = null;
          updateData.status_pengembalian_at = null;
        }
      }

      if (field === "status_pengembalian") {
        if (value === "DONE" && current.status_dibuka !== "DONE") {
          return jsonError(
            "Status Pengembalian hanya dapat DONE jika Status Dibuka sudah DONE.",
            409,
          );
        }

        updateData = {
          status_pengembalian: value,
          status_pengembalian_oleh: value === "DONE" ? actor.user.id : null,
          status_pengembalian_at: value === "DONE" ? now : null,
          updated_at: now,
        };
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from(TABLE)
      .update(updateData)
      .eq("id", id)
      .eq("unit_id", unitId)
      .select("*")
      .single();

    if (updateError) {
      console.error("PATCH request update:", updateError);
      return jsonError("Gagal memperbarui pengajuan.", 500);
    }

    return NextResponse.json({
      success: true,
      row: updated,
      unit: resolved.unit,
    });
  } catch (error) {
    console.error("PATCH Request Buka Blokir:", error);
    return jsonError("Terjadi kesalahan saat memproses pengajuan.", 500);
  }
}
