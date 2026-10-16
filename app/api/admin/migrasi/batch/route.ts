import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireActiveAdmin } from "@/lib/migrasi-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return errorResponse(auth.error, auth.status);
  }

  let body: { kode_unit?: unknown; pk_ids?: unknown };

  try {
    body = await request.json();
  } catch {
    return errorResponse("Format permintaan tidak valid.");
  }

  const kodeUnit = String(body.kode_unit ?? "")
    .trim()
    .toUpperCase();

  const pkIds = Array.isArray(body.pk_ids)
    ? [...new Set(body.pk_ids.map((id) => String(id).trim()))]
    : [];

  if (!["11081A", "11081B"].includes(kodeUnit)) {
    return errorResponse("Kode unit migrasi tidak valid.");
  }

  if (pkIds.length === 0) {
    return errorResponse("Pilih minimal satu PK untuk migrasi.");
  }

  if (pkIds.length > 500) {
    return errorResponse("Maksimal 500 PK per batch.");
  }

  if (pkIds.some((id) => !UUID_REGEX.test(id))) {
    return errorResponse(
      "ID PK tidak valid. Muat ulang data PK asli dari database.",
    );
  }

  // Cocokkan kode legacy unit dengan UUID pada tabel public.unit.
  const { data: unit, error: unitError } = await supabaseAdmin
    .from("unit")
    .select("id, kode_unit, kode_legacy")
    .eq("kode_legacy", kodeUnit)
    .maybeSingle();

  if (unitError) {
    console.error("Gagal mencari unit migrasi:", unitError.message);
    return errorResponse("Unit tidak dapat diverifikasi.", 500);
  }

  if (!unit) {
    return errorResponse(
      `Unit dengan kode ${kodeUnit} belum ditemukan di database.`,
      404,
    );
  }

  // Pastikan semua PK benar-benar berasal dari unit yang dipilih.
  const { data: pkRows, error: pkError } = await supabaseAdmin
    .from("pk")
    .select("id, unit_id")
    .in("id", pkIds);

  if (pkError) {
    console.error("Gagal memeriksa PK migrasi:", pkError.message);
    return errorResponse("Data PK gagal diverifikasi.", 500);
  }

  if (!pkRows || pkRows.length !== pkIds.length) {
    return errorResponse(
      "Sebagian PK tidak ditemukan. Muat ulang data dan pilih kembali.",
    );
  }

  const pkBedaUnit = pkRows.some((pk) => pk.unit_id !== unit.id);

  if (pkBedaUnit) {
    return errorResponse(
      "Batch dibatalkan karena terdapat PK dari unit yang berbeda.",
      403,
    );
  }

  // Buat batch baru.
  const { data: batch, error: batchError } = await supabaseAdmin
    .from("migrasi_batch")
    .insert({
      unit_id: unit.id,
      dibuat_oleh: auth.userId,
      status: "PERSIAPAN",
    })
    .select("id, unit_id, status, created_at")
    .single();

  if (batchError || !batch) {
    console.error("Gagal membuat batch migrasi:", batchError?.message);
    return errorResponse("Batch migrasi gagal dibuat.", 500);
  }

  // Hubungkan setiap PK dengan batch yang baru dibuat.
  const { data: debiturRows, error: debiturError } = await supabaseAdmin
    .from("migrasi_debitur")
    .insert(
      pkIds.map((pkId) => ({
        batch_id: batch.id,
        pk_id: pkId,
      })),
    )
    .select("id, pk_id");

  if (debiturError || !debiturRows) {
    console.error("Gagal menghubungkan PK ke batch:", debiturError?.message);

    // Batalkan pembuatan batch agar tidak meninggalkan data parsial.
    const { error: rollbackDebiturError } = await supabaseAdmin
      .from("migrasi_debitur")
      .delete()
      .eq("batch_id", batch.id);

    const { error: rollbackBatchError } = await supabaseAdmin
      .from("migrasi_batch")
      .delete()
      .eq("id", batch.id);

    if (rollbackDebiturError || rollbackBatchError) {
      console.error("Rollback batch migrasi tidak tuntas:", {
        debitur: rollbackDebiturError?.message,
        batch: rollbackBatchError?.message,
      });
    }

    return errorResponse(
      "Daftar PK gagal disimpan. Periksa database sebelum mencoba lagi.",
      500,
    );
  }

  // Catat aktivitas untuk audit.
  const { error: historyError } = await supabaseAdmin
    .from("migrasi_riwayat")
    .insert({
      batch_id: batch.id,
      pelaku_id: auth.userId,
      aksi: "BATCH_DIBUAT",
      detail: {
        kode_legacy: unit.kode_legacy,
        kode_unit: unit.kode_unit,
        jumlah_pk: debiturRows.length,
      },
    });

  if (historyError) {
    // Batch dan relasi PK sudah tersimpan. Jangan menghapusnya
    // hanya karena pencatatan riwayat gagal.
    console.error("Gagal mencatat riwayat batch:", historyError.message);
  }

  return NextResponse.json({
    success: true,
    batch: {
      id: batch.id,
      unit_id: batch.unit_id,
      status: batch.status,
      created_at: batch.created_at,
    },
    debitur: debiturRows,
    warning: historyError
      ? "Batch tersimpan, tetapi pencatatan riwayat gagal."
      : null,
  });
}
