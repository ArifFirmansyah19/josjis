import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireActiveAdmin } from "@/lib/migrasi-admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "josjis-migrasi";
const MAX_PDF_BYTES = 2 * 1024 * 1024;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function safeFileName(name: string) {
  const baseName = name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(-120);

  return baseName.toLowerCase().endsWith(".pdf")
    ? baseName
    : `${baseName || "dokumen"}.pdf`;
}

/**
 * GET /api/admin/migrasi/dokumen
 *
 * Query opsional:
 * ?batch_id=<UUID>
 * ?migrasi_debitur_id=<UUID>
 */
export async function GET(request: NextRequest) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batch_id");
    const migrasiDebiturId = searchParams.get("migrasi_debitur_id");

    if (batchId && !UUID_REGEX.test(batchId)) {
      return jsonError("Format batch_id tidak valid.");
    }

    if (migrasiDebiturId && !UUID_REGEX.test(migrasiDebiturId)) {
      return jsonError("Format migrasi_debitur_id tidak valid.");
    }

    let debiturIds: string[] | null = null;

    if (migrasiDebiturId) {
      const { data: debitur, error } = await supabaseAdmin
        .from("migrasi_debitur")
        .select("id")
        .eq("id", migrasiDebiturId)
        .maybeSingle();

      if (error) {
        console.error("Gagal memeriksa debitur migrasi:", error.message);
        return jsonError("Gagal memeriksa data migrasi.", 500);
      }

      if (!debitur) {
        return jsonError("Data debitur migrasi tidak ditemukan.", 404);
      }

      debiturIds = [debitur.id];
    } else if (batchId) {
      const { data: batch, error: batchError } = await supabaseAdmin
        .from("migrasi_batch")
        .select("id")
        .eq("id", batchId)
        .maybeSingle();

      if (batchError) {
        console.error("Gagal memeriksa batch:", batchError.message);
        return jsonError("Gagal memeriksa batch migrasi.", 500);
      }

      if (!batch) {
        return jsonError("Batch migrasi tidak ditemukan.", 404);
      }

      const { data: debiturRows, error: debiturError } = await supabaseAdmin
        .from("migrasi_debitur")
        .select("id")
        .eq("batch_id", batchId);

      if (debiturError) {
        console.error("Gagal membaca debitur batch:", debiturError.message);
        return jsonError("Gagal membaca data migrasi.", 500);
      }

      debiturIds = (debiturRows ?? []).map((row) => row.id);
    }

    let query = supabaseAdmin
      .from("migrasi_dokumen")
      .select(
        [
          "id",
          "migrasi_debitur_id",
          "jenis_dokumen",
          "nama_file",
          "storage_bucket",
          "ukuran_bytes",
          "mime_type",
          "status",
          "diunggah_oleh",
          "created_at",
          "dihapus_at",
          "dihapus_oleh",
        ].join(","),
      )
      .order("created_at", { ascending: false });

    if (debiturIds !== null) {
      if (debiturIds.length === 0) {
        return NextResponse.json({
          success: true,
          documents: [],
        });
      }

      query = query.in("migrasi_debitur_id", debiturIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Gagal membaca dokumen migrasi:", error.message);
      return jsonError("Gagal membaca daftar dokumen.", 500);
    }

    return NextResponse.json({
      success: true,
      documents: data ?? [],
    });
  } catch (error) {
    console.error("Kesalahan GET dokumen migrasi:", error);
    return jsonError("Terjadi kesalahan saat membaca dokumen.", 500);
  }
}

/**
 * POST /api/admin/migrasi/dokumen
 *
 * Content-Type: multipart/form-data
 *
 * Fields:
 * - file
 * - migrasi_debitur_id
 * - jenis_dokumen
 */
export async function POST(request: NextRequest) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  let uploadedStoragePath: string | null = null;
  let insertedDocumentId: string | null = null;

  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const migrasiDebiturId = String(
      formData.get("migrasi_debitur_id") ?? "",
    ).trim();
    const jenisDokumen = String(formData.get("jenis_dokumen") ?? "").trim();

    if (!(file instanceof File)) {
      return jsonError("File PDF wajib disertakan.");
    }

    if (!UUID_REGEX.test(migrasiDebiturId)) {
      return jsonError("ID debitur migrasi tidak valid.");
    }

    if (!jenisDokumen || jenisDokumen.length > 100) {
      return jsonError("Jenis dokumen wajib diisi dengan benar.");
    }

    if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
      return jsonError("Ukuran PDF harus lebih dari 0 dan maksimal 2 MiB.");
    }

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return jsonError("Hanya file PDF yang diperbolehkan.");
    }

    // Pastikan debitur memang tercatat dalam batch migrasi.
    const { data: debitur, error: debiturError } = await supabaseAdmin
      .from("migrasi_debitur")
      .select("id, batch_id, pk_id")
      .eq("id", migrasiDebiturId)
      .maybeSingle();

    if (debiturError) {
      console.error("Gagal memeriksa debitur:", debiturError.message);
      return jsonError("Gagal memeriksa data debitur.", 500);
    }

    if (!debitur) {
      return jsonError("Debitur tidak terdaftar dalam batch migrasi.", 404);
    }

    // Batch harus masih dalam tahap persiapan.
    const { data: batch, error: batchError } = await supabaseAdmin
      .from("migrasi_batch")
      .select("id, unit_id, status")
      .eq("id", debitur.batch_id)
      .maybeSingle();

    if (batchError) {
      console.error("Gagal memeriksa batch:", batchError.message);
      return jsonError("Gagal memeriksa batch migrasi.", 500);
    }

    if (!batch) {
      return jsonError("Batch migrasi tidak ditemukan.", 404);
    }

    if (String(batch.status).toUpperCase() !== "PERSIAPAN") {
      return jsonError(
        "Dokumen hanya dapat diunggah ke batch berstatus PERSIAPAN.",
        409,
      );
    }

    // Pastikan PK asli berasal dari unit batch tersebut.
    const { data: pk, error: pkError } = await supabaseAdmin
      .from("pk")
      .select("id, unit_id")
      .eq("id", debitur.pk_id)
      .maybeSingle();

    if (pkError) {
      console.error("Gagal memeriksa PK:", pkError.message);
      return jsonError("Gagal memeriksa data PK.", 500);
    }

    if (!pk) {
      return jsonError("PK sumber tidak ditemukan.", 404);
    }

    if (pk.unit_id !== batch.unit_id) {
      return jsonError("Unit PK tidak sesuai dengan unit batch migrasi.", 409);
    }

    const originalName = safeFileName(file.name);
    const storagePath = `${batch.id}/${pk.id}/${randomUUID()}-${originalName}`;

    const bytes = Buffer.from(await file.arrayBuffer());

    // Upload ke bucket privat.
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload Storage gagal:", uploadError.message);
      return jsonError("PDF gagal disimpan ke Storage.", 500);
    }

    uploadedStoragePath = storagePath;

    // Simpan metadata setelah file berhasil diunggah.
    const { data: document, error: insertError } = await supabaseAdmin
      .from("migrasi_dokumen")
      .insert({
        migrasi_debitur_id: debitur.id,
        jenis_dokumen: jenisDokumen,
        nama_file: originalName,
        storage_bucket: BUCKET,
        storage_path: storagePath,
        ukuran_bytes: file.size,
        mime_type: "application/pdf",
        status: "TERSIMPAN",
        diunggah_oleh: auth.userId,
      })
      .select(
        "id, migrasi_debitur_id, jenis_dokumen, nama_file, ukuran_bytes, mime_type, status, created_at",
      )
      .single();

    if (insertError || !document) {
      console.error("Penyimpanan metadata gagal:", insertError?.message);

      // Kompensasi: jangan biarkan file yatim jika metadata gagal.
      const { error: cleanupError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([storagePath]);

      if (cleanupError) {
        console.error("Pembersihan file yatim gagal:", cleanupError.message);
      } else {
        uploadedStoragePath = null;
      }

      return jsonError(
        "PDF diunggah, tetapi metadata gagal disimpan. Silakan coba kembali.",
        500,
      );
    }

    insertedDocumentId = document.id;

    // Catat aktivitas upload.
    const { error: historyError } = await supabaseAdmin
      .from("migrasi_riwayat")
      .insert({
        batch_id: batch.id,
        dokumen_id: document.id,
        pelaku_id: auth.userId,
        aksi: "DOKUMEN_DIUNGGAH",
        detail: {
          nama_file: originalName,
          jenis_dokumen: jenisDokumen,
          ukuran_bytes: file.size,
          migrasi_debitur_id: debitur.id,
          pk_id: pk.id,
        },
      });

    if (historyError) {
      console.error("Audit upload gagal:", historyError.message);

      // Jangan hapus file yang sudah tercatat hanya karena audit gagal.
      // Kembalikan peringatan agar kegagalan audit dapat ditindaklanjuti.
      return NextResponse.json({
        success: true,
        document,
        warning:
          "Dokumen tersimpan, tetapi pencatatan riwayat gagal. Perlu pemeriksaan admin.",
      });
    }

    // File dan metadata sudah tersimpan.
    uploadedStoragePath = null;
    insertedDocumentId = null;

    return NextResponse.json(
      {
        success: true,
        document,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Kesalahan POST dokumen migrasi:", error);

    // Upaya pembersihan bila proses berhenti setelah upload.
    if (uploadedStoragePath && !insertedDocumentId) {
      const { error: cleanupError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([uploadedStoragePath]);

      if (cleanupError) {
        console.error("Pembersihan file gagal:", cleanupError.message);
      }
    }

    return jsonError("Terjadi kesalahan saat mengunggah PDF.", 500);
  }
}
