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
  JKK2: "JKK2",
  "11081B": "JKK2",
};

const clean = (value: unknown) => (value == null ? "" : String(value).trim());

const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

const ok = (data: Record<string, unknown>, status = 200) =>
  NextResponse.json({ success: true, ...data }, { status });

async function resolveUnit(input: string) {
  const code = UNIT_MAP[input.toUpperCase()] || input.toUpperCase();

  if (!["JKK1", "JKK2"].includes(code)) return null;

  const { data, error } = await supabaseAdmin
    .from("unit")
    .select("id,kode_unit,nama_unit")
    .eq("kode_unit", code)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();
  if (!auth.ok) return fail(auth.error, auth.status);

  const requestedUnit = clean(request.nextUrl.searchParams.get("unit"));
  const unit = requestedUnit ? await resolveUnit(requestedUnit) : null;

  if (requestedUnit && !unit) {
    return fail("Unit tidak ditemukan.", 404);
  }

  if (unit && !canAccessSerahTerimaUnit(auth, unit.id)) {
    return fail("Anda tidak memiliki akses ke unit ini.", 403);
  }

  let query = supabaseAdmin
    .from("bast_agunan_lunas")
    .select("*")
    .order("tanggal_bast", { ascending: false })
    .order("created_at", { ascending: false });

  if (unit) {
    query = query.eq("unit_id", unit.id);
  } else if (auth.role !== "ADMIN") {
    query = query.in("unit_id", auth.unitIds);
  }

  const { data, error } = await query;

  if (error) return fail(error.message, 500);

  const rows = (data || []).map((row: any) => ({
    ...row,
    pihak_kedua_list: parseJsonArray(row.pihak_kedua_list),
    daftar_agunan: parseJsonArray(row.daftar_agunan),
  }));

  return ok({ data: rows, role: auth.role });
}

export async function POST(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();
  if (!auth.ok) return fail(auth.error, auth.status);

  if (auth.role !== "ADMIN") {
    return fail("Hanya ADMIN yang dapat menyimpan rekap BAST.", 403);
  }

  try {
    const body = await request.json();

    const agunanLunasId = clean(body.agunan_lunas_id);
    const unitCode = clean(body.unit_code);
    const nomorBast = clean(body.nomor_bast);
    const tanggalBast = clean(body.tanggal_bast);

    const debtor = body.debtor || {};
    const firstParty = body.pihak_pertama || {};
    const parties = Array.isArray(body.pihak_kedua_list)
      ? body.pihak_kedua_list
      : [];
    const collateral = Array.isArray(body.agunan_list) ? body.agunan_list : [];

    if (!agunanLunasId || !nomorBast || !tanggalBast || !clean(debtor.nama)) {
      return fail("Debitur, nomor BAST, dan tanggal BAST wajib diisi.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalBast)) {
      return fail("Format tanggal BAST tidak valid.");
    }

    if (!clean(firstParty.nama) || !clean(firstParty.jabatan)) {
      return fail("Nama dan jabatan pihak pertama wajib diisi.");
    }

    if (parties.length > 50 || collateral.length > 100) {
      return fail("Jumlah pihak atau dokumen agunan melebihi batas.");
    }

    const unit = await resolveUnit(unitCode);
    if (!unit) return fail("Unit tidak ditemukan.", 404);

    if (!canAccessSerahTerimaUnit(auth, unit.id)) {
      return fail("Anda tidak memiliki akses ke unit ini.", 403);
    }

    // Pastikan sumber debitur benar-benar berasal dari Agunan Lunas
    // dan masih berada pada unit yang dipilih.
    const { data: source, error: sourceError } = await supabaseAdmin
      .from("agunan_lunas_data")
      .select("id,unit_id,nama_debitur,nomor_pk,jenis_pinjaman")
      .eq("id", agunanLunasId)
      .maybeSingle();

    if (sourceError || !source) {
      return fail("Data sumber Agunan Lunas tidak ditemukan.", 404);
    }

    if (source.unit_id !== unit.id) {
      return fail("Data debitur bukan milik unit yang dipilih.", 403);
    }

    const address = [
      clean(debtor.jalan),
      debtor.rt ? `RT ${clean(debtor.rt)}` : "",
      debtor.rw ? `RW ${clean(debtor.rw)}` : "",
      debtor.desa ? `Desa ${clean(debtor.desa)}` : "",
      debtor.kecamatan ? `Kec. ${clean(debtor.kecamatan)}` : "",
      debtor.kabupaten ? `Kab. ${clean(debtor.kabupaten)}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const spouse = parties.find((person: any) =>
      /istri|suami/i.test(clean(person.hubungan)),
    );

    const payload = {
      agunan_lunas_id: agunanLunasId,
      unit_id: unit.id,
      nomor_bast: nomorBast,
      tanggal_bast: tanggalBast,

      nama_debitur: clean(debtor.nama),
      nik_debitur: clean(debtor.nik) || null,

      jalan: clean(debtor.jalan) || null,
      rt: clean(debtor.rt) || null,
      rw: clean(debtor.rw) || null,
      desa: clean(debtor.desa) || null,
      kecamatan: clean(debtor.kecamatan) || null,
      kabupaten: clean(debtor.kabupaten) || null,

      nomor_pk: clean(body.nomor_pk) || clean(source.nomor_pk) || null,
      jenis_pinjaman:
        clean(body.jenis_pinjaman) || source.jenis_pinjaman || null,

      pihak_pertama_nama: clean(firstParty.nama),
      pihak_pertama_jabatan: clean(firstParty.jabatan),

      pihak_kedua_nama: clean(parties[0]?.nama) || null,
      pihak_kedua_nik: clean(parties[0]?.nik) || null,
      pihak_kedua_alamat: parties[0]?.alamat
        ? JSON.stringify(parties[0].alamat)
        : null,

      pihak_kedua_list: parties,
      nama_pasangan: clean(spouse?.nama) || null,
      nik_pasangan: clean(spouse?.nik) || null,

      alamat_tinggal: address || null,
      daftar_agunan: JSON.stringify(collateral),

      nomor_bast_mode: clean(body.nomor_bast_mode) || "TEMPLATE",
      tanggal_penyerahan: tanggalBast,
      bulan_penyerahan: Number(tanggalBast.slice(5, 7)),
      tahun_penyerahan: Number(tanggalBast.slice(0, 4)),

      status: "FINAL",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("bast_agunan_lunas")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return fail("Nomor BAST tersebut sudah digunakan pada unit ini.", 409);
      }
      return fail(error.message, 500);
    }

    return ok(
      {
        message: "Rekap BAST berhasil disimpan.",
        data,
      },
      201,
    );
  } catch (error: any) {
    return fail(error?.message || "Gagal menyimpan rekap BAST.", 500);
  }
}
