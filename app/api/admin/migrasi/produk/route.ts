import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireActiveAdmin } from "@/lib/migrasi-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  let body: { migrasi_debitur_id?: unknown; produk?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  const relationId = String(body.migrasi_debitur_id ?? "").trim();
  const produk = String(body.produk ?? "")
    .trim()
    .toUpperCase();

  if (!relationId) {
    return NextResponse.json(
      { success: false, error: "ID debitur migrasi wajib diisi." },
      { status: 400 },
    );
  }

  if (!["KUR", "KUM"].includes(produk)) {
    return NextResponse.json(
      { success: false, error: "Produk harus KUR atau KUM." },
      { status: 400 },
    );
  }

  const { data: relation, error: relationError } = await supabaseAdmin
    .from("migrasi_debitur")
    .select("id, batch_id, batch:migrasi_batch!inner(status)")
    .eq("id", relationId)
    .maybeSingle();

  if (relationError) {
    console.error("Gagal memeriksa debitur migrasi:", relationError.message);
    return NextResponse.json(
      { success: false, error: "Data debitur gagal diperiksa." },
      { status: 500 },
    );
  }

  if (!relation) {
    return NextResponse.json(
      { success: false, error: "Debitur migrasi tidak ditemukan." },
      { status: 404 },
    );
  }

  const batch = Array.isArray(relation.batch)
    ? relation.batch[0]
    : relation.batch;

  if (batch?.status !== "PERSIAPAN") {
    return NextResponse.json(
      {
        success: false,
        error: "Produk hanya bisa diubah selama batch berstatus PERSIAPAN.",
      },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("migrasi_debitur")
    .update({ produk })
    .eq("id", relationId);

  if (updateError) {
    console.error("Gagal menyimpan produk:", updateError.message);
    return NextResponse.json(
      { success: false, error: "Produk gagal disimpan." },
      { status: 500 },
    );
  }

  const { error: historyError } = await supabaseAdmin
    .from("migrasi_riwayat")
    .insert({
      batch_id: relation.batch_id,
      pelaku_id: auth.userId,
      aksi: "PRODUK_MIGRASI_DIPERBARUI",
      detail: {
        migrasi_debitur_id: relationId,
        produk,
      },
    });

  if (historyError) {
    console.error("Gagal mencatat riwayat produk:", historyError.message);
  }

  return NextResponse.json({
    success: true,
    produk,
    warning: historyError
      ? "Produk tersimpan, tetapi pencatatan riwayat gagal."
      : null,
  });
}
