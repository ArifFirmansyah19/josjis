import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  canAccessSerahTerimaUnit,
  requireSerahTerimaAuth,
} from "@/lib/serah-terima-agunan-lunas-auth";

export const runtime = "nodejs";

const UNIT_MAP: Record<string, string> = {
  JKK1: "JKK1",
  "11081A": "JKK1",
  "JAMBI KUAMANG KUNING 1": "JKK1",
  JKK2: "JKK2",
  "11081B": "JKK2",
  "JAMBI KUAMANG KUNING 2": "JKK2",
};

const MAIN_FIELDS = [
  "nama_debitur",
  "jaminan_utama",
  "moral_obligasi",
  "nama_mks",
  "nomor_pk",
  "nik_debitur",
  "nama_pasangan",
  "nik_pasangan",
  "nomor_bast",
  "jenis_pinjaman",
  "limit_pinjaman",
  "keterangan_warning",
  "bundel_agunan",
] as const;

function ok(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function cleanText(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeLimit(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

function validatePeople(value: unknown) {
  if (value === undefined) return undefined;

  if (!Array.isArray(value)) {
    throw new Error("Daftar orang yang bisa mengambil agunan tidak valid.");
  }

  const people = value
    .map((person: any) => ({
      nama: cleanText(person?.nama),
      nik: cleanText(person?.nik) || null,
    }))
    .filter((person) => person.nama);

  if (people.length > 100) {
    throw new Error("Maksimal 100 orang yang bisa mengambil agunan.");
  }

  return people;
}

function validateOtherParties(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("Daftar pihak lain tidak valid.");
  }

  return value
    .map((person: any) => ({
      nama: cleanText(person?.nama),
      nik: cleanText(person?.nik) || null,
    }))
    .filter((person) => person.nama);
}

function makePayload(body: any) {
  const nama = cleanText(body?.nama_debitur);

  if (!nama) throw new Error("Nama Debitur wajib diisi.");

  const jenis = cleanText(body?.jenis_pinjaman).toUpperCase();

  if (jenis && !["KUR", "KUM"].includes(jenis)) {
    throw new Error("Jenis pinjaman harus KUR atau KUM.");
  }

  const limit = normalizeLimit(body?.limit_pinjaman);

  if (Number.isNaN(limit)) {
    throw new Error("Limit pinjaman harus berupa angka positif.");
  }

  const bundelRaw = body?.bundel_agunan;
  const bundel =
    bundelRaw === "" || bundelRaw === null || bundelRaw === undefined
      ? null
      : Number(bundelRaw);

  if (
    bundel !== null &&
    (!Number.isInteger(bundel) || bundel < 1 || bundel > 10)
  ) {
    throw new Error("Bundel Agunan harus dipilih dari 1 sampai 10.");
  }

  return {
    nama_debitur: nama,
    jaminan_utama: cleanText(body?.jaminan_utama) || null,
    moral_obligasi: cleanText(body?.moral_obligasi) || null,
    nama_mks: cleanText(body?.nama_mks) || null,
    nomor_pk: cleanText(body?.nomor_pk) || null,
    nik_debitur: cleanText(body?.nik_debitur) || null,
    nama_pasangan: cleanText(body?.nama_pasangan) || null,
    nik_pasangan: cleanText(body?.nik_pasangan) || null,
    nomor_bast: cleanText(body?.nomor_bast) || null,
    jenis_pinjaman: jenis || null,
    limit_pinjaman: limit,
    keterangan_warning: cleanText(body?.keterangan_warning) || null,
    bundel_agunan: bundel,
  };
}

async function replaceChildren(
  table: string,
  foreignKey: string,
  id: string,
  rows: any[],
) {
  const { error: deleteError } = await supabaseAdmin
    .from(table)
    .delete()
    .eq(foreignKey, id);

  if (deleteError) throw new Error(deleteError.message);
  if (!rows?.length) return;

  const { error: insertError } = await supabaseAdmin.from(table).insert(
    rows.map((row) => ({
      [foreignKey]: id,
      nama: row.nama,
      nik: row.nik,
    })),
  );

  if (insertError) throw new Error(insertError.message);
}

async function getChildren(table: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("id,nama,nik,created_at")
    .eq("agunan_lunas_id", id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function GET(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) return fail(auth.error, auth.status);

  const requested = cleanText(
    request.nextUrl.searchParams.get("unit"),
  ).toUpperCase();

  const code = UNIT_MAP[requested] || requested;

  let query = supabaseAdmin
    .from("agunan_lunas_data")
    .select(
      `
      id,nomor_urut,unit_id,unit_excel,nama_debitur,jaminan_utama,moral_obligasi,nama_mks,
      nomor_pk,nik_debitur,nama_pasangan,nik_pasangan,nomor_bast,sumber_input,
      jenis_pinjaman,limit_pinjaman,keterangan_warning,bundel_agunan,created_at,updated_at
    `,
    )
    .order("nomor_urut", { ascending: false });

  let mksOptions: Array<{
    id: string;
    nama: string;
    kode_agen: string | null;
  }> = [];

  let opnameOptions: Array<{
    id: string;
    nama: string;
    jabatan: string | null;
    tipe: string;
  }> = [];

  if (code) {
    const { data: unit, error: unitError } = await supabaseAdmin
      .from("unit")
      .select("id,kode_unit")
      .eq("kode_unit", code)
      .maybeSingle();

    if (unitError || !unit) {
      return fail("Unit tidak ditemukan.", 404);
    }

    if (!canAccessSerahTerimaUnit(auth, unit.id)) {
      return fail("Anda tidak memiliki akses ke unit ini.", 403);
    }

    query = query.eq("unit_id", unit.id);

    // Master MKS berdasarkan unit aktif.
    const { data: pegawaiMks, error: pegawaiError } = await supabaseAdmin
      .from("pegawai")
      .select("id,nama")
      .eq("unit_id", unit.id)
      .eq("jenis_pegawai", "MKS")
      .eq("aktif", true)
      .order("nama", { ascending: true });

    if (pegawaiError) {
      return fail(`Gagal memuat master MKS: ${pegawaiError.message}`, 500);
    }

    const pegawaiIds = (pegawaiMks || []).map((pegawai: any) => pegawai.id);

    if (pegawaiIds.length) {
      const { data: masterMks, error: mksError } = await supabaseAdmin
        .from("mks")
        .select("id,pegawai_id,kode_agen")
        .in("pegawai_id", pegawaiIds);

      if (mksError) {
        return fail(`Gagal memuat master MKS: ${mksError.message}`, 500);
      }

      const mksByPegawai = new Map(
        (masterMks || []).map((mks: any) => [mks.pegawai_id, mks]),
      );

      mksOptions = (pegawaiMks || [])
        .map((pegawai: any) => {
          const mks: any = mksByPegawai.get(pegawai.id);

          return mks
            ? {
                id: mks.id,
                nama: pegawai.nama,
                kode_agen: mks.kode_agen || null,
              }
            : null;
        })
        .filter(Boolean) as Array<{
        id: string;
        nama: string;
        kode_agen: string | null;
      }>;
    }

    // Master petugas opname: MKA aktif dan akun ADMIN aktif pada unit.
    const { data: mkaRows, error: mkaError } = await supabaseAdmin
      .from("pegawai")
      .select("id,nama,jabatan")
      .eq("unit_id", unit.id)
      .eq("jenis_pegawai", "MKA")
      .eq("aktif", true)
      .order("nama", { ascending: true });

    if (mkaError) {
      return fail(`Gagal memuat master MKA: ${mkaError.message}`, 500);
    }

    const { data: adminRows, error: adminError } = await supabaseAdmin
      .from("pengguna")
      .select("id,username,pegawai_id")
      .eq("unit_id", unit.id)
      .eq("role", "ADMIN")
      .eq("aktif", true)
      .order("username", { ascending: true });

    if (adminError) {
      return fail(`Gagal memuat akun Admin unit: ${adminError.message}`, 500);
    }

    const adminPegawaiIds = (adminRows || [])
      .map((row: any) => row.pegawai_id)
      .filter(Boolean);

    let adminPegawaiById = new Map<string, any>();

    if (adminPegawaiIds.length) {
      const { data: adminPegawai, error: adminPegawaiError } =
        await supabaseAdmin
          .from("pegawai")
          .select("id,nama,jabatan")
          .in("id", adminPegawaiIds);

      if (adminPegawaiError) {
        return fail(
          `Gagal memuat identitas Admin: ${adminPegawaiError.message}`,
          500,
        );
      }

      adminPegawaiById = new Map(
        (adminPegawai || []).map((row: any) => [row.id, row]),
      );
    }

    opnameOptions = [
      ...(mkaRows || []).map((row: any) => ({
        id: `MKA:${row.id}`,
        nama: row.nama,
        jabatan: row.jabatan || null,
        tipe: "MKA",
      })),

      ...(adminRows || []).map((row: any) => {
        const person: any = row.pegawai_id
          ? adminPegawaiById.get(row.pegawai_id)
          : null;

        return {
          id: `ADMIN:${row.id}`,
          nama: person?.nama || row.username,
          jabatan: person?.jabatan || null,
          tipe: "ADMIN",
        };
      }),
    ].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  } else if (auth.role !== "ADMIN") {
    if (!auth.unitIds?.length) {
      return fail("Akun ini belum memiliki unit akses.", 403);
    }

    query = query.in("unit_id", auth.unitIds);
  }

  const { data, error } = await query;

  if (error) return fail(error.message, 500);

  const rows = data || [];
  const ids = rows.map((row: any) => row.id);

  let parties: any[] = [];
  let pickupPeople: any[] = [];

  if (ids.length) {
    const [partyResult, pickupResult] = await Promise.all([
      supabaseAdmin
        .from("agunan_lunas_pihak_lain")
        .select("id,agunan_lunas_id,nama,nik,created_at")
        .in("agunan_lunas_id", ids)
        .order("created_at", { ascending: true }),

      supabaseAdmin
        .from("agunan_lunas_pengambil")
        .select("id,agunan_lunas_id,nama,nik,created_at")
        .in("agunan_lunas_id", ids)
        .order("created_at", { ascending: true }),
    ]);

    if (partyResult.error) return fail(partyResult.error.message, 500);
    if (pickupResult.error) return fail(pickupResult.error.message, 500);

    parties = partyResult.data || [];
    pickupPeople = pickupResult.data || [];
  }

  const result = rows.map((row: any) => ({
    ...row,
    pihak_lain: parties.filter((person) => person.agunan_lunas_id === row.id),
    pengambil_agunan: pickupPeople.filter(
      (person) => person.agunan_lunas_id === row.id,
    ),
  }));

  return ok({
    role: auth.role,
    data: result,
    mks_options: mksOptions,
    opname_options: opnameOptions,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) return fail(auth.error, auth.status);
  if (auth.role !== "ADMIN") {
    return fail("Hanya ADMIN yang dapat menambah data.", 403);
  }

  try {
    const body = await request.json();
    const payload = makePayload(body);

    const parties = validateOtherParties(body.pihak_lain) || [];
    const people = validatePeople(body.pengambil_agunan) || [];

    const rawUnit = cleanText(body.unit_excel).toUpperCase();
    const unitCode = UNIT_MAP[rawUnit];

    if (!unitCode) {
      return fail(
        "Kode unit tidak dikenal. Gunakan 11081A/JKK1 atau 11081B/JKK2.",
      );
    }

    const { data: unit, error: unitError } = await supabaseAdmin
      .from("unit")
      .select("id,kode_unit")
      .eq("kode_unit", unitCode)
      .single();

    if (unitError || !unit) {
      return fail("Unit tidak ditemukan di database.", 404);
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("agunan_lunas_data")
      .insert({
        ...payload,
        unit_id: unit.id,
        unit_excel: unitCode,
        sumber_input: "MANUAL",
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select("id")
      .single();

    if (error) return fail(error.message, 500);

    await replaceChildren(
      "agunan_lunas_pihak_lain",
      "agunan_lunas_id",
      inserted.id,
      parties,
    );

    await replaceChildren(
      "agunan_lunas_pengambil",
      "agunan_lunas_id",
      inserted.id,
      people,
    );

    return ok({ message: "Data berhasil ditambahkan.", id: inserted.id }, 201);
  } catch (error: any) {
    return fail(error.message || "Data gagal disimpan.");
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) return fail(auth.error, auth.status);
  if (auth.role !== "ADMIN") {
    return fail("Hanya ADMIN yang dapat mengubah data.", 403);
  }

  try {
    const body = await request.json();
    const id = cleanText(body.id);

    if (!id) return fail("ID data tidak ditemukan.");

    const { data: existing, error: findError } = await supabaseAdmin
      .from("agunan_lunas_data")
      .select("id,unit_id")
      .eq("id", id)
      .maybeSingle();

    if (findError || !existing) {
      return fail("Data tidak ditemukan.", 404);
    }

    if (!canAccessSerahTerimaUnit(auth, existing.unit_id)) {
      return fail("Anda tidak memiliki akses ke unit ini.", 403);
    }

    const payload = makePayload(body);
    const parties = validateOtherParties(body.pihak_lain);
    const people = validatePeople(body.pengambil_agunan);

    const { error } = await supabaseAdmin
      .from("agunan_lunas_data")
      .update({
        ...payload,
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return fail(error.message, 500);

    if (parties !== undefined) {
      await replaceChildren(
        "agunan_lunas_pihak_lain",
        "agunan_lunas_id",
        id,
        parties,
      );
    }

    if (people !== undefined) {
      await replaceChildren(
        "agunan_lunas_pengambil",
        "agunan_lunas_id",
        id,
        people,
      );
    }

    return ok({ message: "Data berhasil diperbarui." });
  } catch (error: any) {
    return fail(error.message || "Data gagal diperbarui.");
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) return fail(auth.error, auth.status);
  if (auth.role !== "ADMIN") {
    return fail("Hanya ADMIN yang dapat menghapus data.", 403);
  }

  const id = cleanText(request.nextUrl.searchParams.get("id"));

  if (!id) return fail("ID data tidak ditemukan.");

  const { data: existing, error: findError } = await supabaseAdmin
    .from("agunan_lunas_data")
    .select("id,unit_id")
    .eq("id", id)
    .maybeSingle();

  if (findError || !existing) {
    return fail("Data tidak ditemukan.", 404);
  }

  if (!canAccessSerahTerimaUnit(auth, existing.unit_id)) {
    return fail("Anda tidak memiliki akses ke unit ini.", 403);
  }

  const { error } = await supabaseAdmin
    .from("agunan_lunas_data")
    .delete()
    .eq("id", id);

  if (error) return fail(error.message, 500);

  return ok({ message: "Data berhasil dihapus." });
}
