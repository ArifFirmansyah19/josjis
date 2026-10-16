import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireActiveAdmin } from "@/lib/migrasi-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const kodeLegacy = (searchParams.get("kode_legacy") ?? "")
    .trim()
    .toUpperCase();

  if (!["11081A", "11081B"].includes(kodeLegacy)) {
    return NextResponse.json(
      { success: false, error: "Kode unit tidak valid." },
      { status: 400 },
    );
  }

  const { data: unit, error: unitError } = await supabaseAdmin
    .from("unit")
    .select("id, kode_unit, kode_legacy")
    .eq("kode_legacy", kodeLegacy)
    .maybeSingle();

  if (unitError) {
    console.error("Gagal mencari unit:", unitError.message);

    return NextResponse.json(
      { success: false, error: "Unit gagal diperiksa." },
      { status: 500 },
    );
  }

  if (!unit) {
    return NextResponse.json(
      { success: false, error: "Unit tidak ditemukan di database." },
      { status: 404 },
    );
  }

  const { data: pkRows, error: pkError } = await supabaseAdmin
    .from("pk")
    .select(
      [
        "id",
        "unit_id",
        "mks_id",
        "cif",
        "nama_debitur",
        "nomor_pk",
        "status_pk",
        "limit_kredit",
        "jenis_pengajuan_kredit",
      ].join(","),
    )
    .eq("unit_id", unit.id)
    .order("nama_debitur", { ascending: true })
    .limit(1000);

  if (pkError) {
    console.error("Gagal mengambil data PK:", pkError.message);

    return NextResponse.json(
      { success: false, error: "Data PK gagal dimuat." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    unit: {
      id: unit.id,
      kode_unit: unit.kode_unit,
      kode_legacy: unit.kode_legacy,
    },
    data: pkRows ?? [],
  });
}
