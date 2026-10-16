import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireActiveAdmin } from "@/lib/migrasi-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getString(...values: unknown[]): string {
  const value = values.find(
    (item) => typeof item === "string" && item.trim().length > 0,
  );

  return typeof value === "string" ? value.trim() : "";
}

type StorageDocRow = {
  id: string;
  migrasi_debitur_id: string;
  jenis_dokumen?: string | null;
  nama_file?: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  status?: string | null;
  dihapus_at: string | null;
};

async function getEditableBatch(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from("migrasi_batch")
    .select("id, unit_id, status, dihapus_at")
    .eq("id", batchId)
    .maybeSingle();

  if (error) {
    throw new ApiError("Gagal memeriksa batch migrasi.", 500);
  }

  if (!data || data.dihapus_at) {
    throw new ApiError(
      "Batch migrasi tidak ditemukan atau sudah dihapus.",
      404,
    );
  }

  if (String(data.status).toUpperCase() !== "PERSIAPAN") {
    throw new ApiError(
      "Perubahan hanya diizinkan untuk batch berstatus PERSIAPAN.",
      409,
    );
  }

  return data;
}

async function checkPK(pkId: string, unitId: string) {
  const { data, error } = await supabaseAdmin
    .from("pk")
    .select("id, unit_id")
    .eq("id", pkId)
    .maybeSingle();

  if (error) throw new ApiError("Gagal memeriksa PK.", 500);
  if (!data) throw new ApiError("PK sumber tidak ditemukan.", 404);

  if (data.unit_id !== unitId) {
    throw new ApiError("PK berasal dari unit yang berbeda.", 400);
  }

  return data;
}

/**
 * Menghapus file Storage yang tidak lagi direferensikan dokumen aktif lain.
 *
 * - Tidak menghapus baris database.
 * - Tidak mengubah tabel PK.
 * - Mempertahankan file jika masih direferensikan dokumen aktif lain.
 * - Jika Storage gagal, proses akan dihentikan sebelum metadata ditandai
 *   terhapus. Jika terjadi kegagalan sebagian, jalankan ulang setelah
 *   memeriksa kondisi file.
 */
async function removeUnsharedStorageFiles(
  documents: StorageDocRow[],
): Promise<{ removedCount: number; sharedCount: number }> {
  const targetIds = new Set(documents.map((doc) => doc.id));

  const objects = new Map<
    string,
    { bucket: string; path: string; documentIds: Set<string> }
  >();

  for (const doc of documents) {
    const bucket = doc.storage_bucket?.trim();
    const path = doc.storage_path?.trim();

    // Dokumen yang sudah tersimpan seharusnya memiliki lokasi Storage.
    if (
      String(doc.status ?? "").toUpperCase() === "TERSIMPAN" &&
      (!bucket || !path)
    ) {
      throw new ApiError(
        `Dokumen "${doc.nama_file || doc.jenis_dokumen || doc.id}" berstatus TERSIMPAN tetapi metadata Storage tidak lengkap. Data belum ditandai terhapus. Periksa storage_bucket dan storage_path.`,
        409,
      );
    }

    // Dokumen tanpa objek Storage, misalnya yang belum diunggah, dilewati.
    if (!bucket || !path) continue;

    const key = JSON.stringify([bucket, path]);
    const existing = objects.get(key);

    if (existing) {
      existing.documentIds.add(doc.id);
    } else {
      objects.set(key, {
        bucket,
        path,
        documentIds: new Set([doc.id]),
      });
    }
  }

  if (objects.size === 0) {
    return { removedCount: 0, sharedCount: 0 };
  }

  // Kelompokkan objek berdasarkan bucket.
  const objectsByBucket = new Map<
    string,
    Array<{ key: string; path: string; documentIds: Set<string> }>
  >();

  for (const [key, object] of objects) {
    const list = objectsByBucket.get(object.bucket) ?? [];

    list.push({
      key,
      path: object.path,
      documentIds: object.documentIds,
    });

    objectsByBucket.set(object.bucket, list);
  }

  const safeObjects: Array<{ bucket: string; path: string }> = [];
  let sharedCount = 0;

  // Periksa apakah ada dokumen aktif DI LUAR daftar yang akan dihapus
  // yang masih menggunakan objek Storage yang sama.
  for (const [bucket, bucketObjects] of objectsByBucket) {
    const uniquePaths = [...new Set(bucketObjects.map((item) => item.path))];

    for (let i = 0; i < uniquePaths.length; i += 100) {
      const pathChunk = uniquePaths.slice(i, i + 100);

      const { data: references, error } = await supabaseAdmin
        .from("migrasi_dokumen")
        .select(
          "id, migrasi_debitur_id, storage_bucket, storage_path, dihapus_at",
        )
        .eq("storage_bucket", bucket)
        .in("storage_path", pathChunk)
        .is("dihapus_at", null);

      if (error) {
        throw new ApiError(
          "Gagal memeriksa penggunaan file oleh dokumen lain. Tidak ada metadata yang diubah.",
          500,
        );
      }

      const activeReferences = references ?? [];

      for (const object of bucketObjects.filter((item) =>
        pathChunk.includes(item.path),
      )) {
        const hasOtherActiveReference = activeReferences.some(
          (reference) =>
            reference.storage_bucket === bucket &&
            reference.storage_path === object.path &&
            !targetIds.has(reference.id),
        );

        if (hasOtherActiveReference) {
          sharedCount++;
        } else {
          safeObjects.push({ bucket, path: object.path });
        }
      }
    }
  }

  // Supabase Storage menerima daftar path dalam satu bucket.
  // Gunakan batch kecil supaya permintaan tidak terlalu besar.
  const pathsByBucket = new Map<string, Set<string>>();

  for (const object of safeObjects) {
    const paths = pathsByBucket.get(object.bucket) ?? new Set<string>();

    paths.add(object.path);
    pathsByBucket.set(object.bucket, paths);
  }

  let removedCount = 0;

  for (const [bucket, pathSet] of pathsByBucket) {
    const paths = [...pathSet];

    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);

      const { error } = await supabaseAdmin.storage.from(bucket).remove(chunk);

      if (error) {
        console.error("Gagal menghapus objek Storage:", {
          bucket,
          jumlahPath: chunk.length,
          error,
        });

        throw new ApiError(
          "Gagal menghapus sebagian file dari Supabase Storage. Metadata dokumen belum seluruhnya ditandai terhapus. Periksa Storage, lalu ulangi penghapusan.",
          502,
        );
      }

      removedCount += chunk.length;
    }
  }

  return { removedCount, sharedCount };
}

/**
 * Soft delete relasi debitur dan dokumen migrasinya.
 * File fisik yang tidak digunakan dokumen aktif lain ikut dihapus.
 * Tabel pk sumber tidak pernah dihapus atau diubah.
 */
async function softDeleteDebiturRows(
  rows: Array<{
    id: string;
    batch_id: string;
    dihapus_at: string | null;
  }>,
  userId: string,
) {
  const activeRows = rows.filter((row) => !row.dihapus_at);
  const allIds = [...new Set(rows.map((row) => row.id))];

  if (allIds.length === 0) {
    return {
      deletedCount: 0,
      deletedDocumentCount: 0,
      storageDeletedCount: 0,
      storageSharedCount: 0,
    };
  }

  // Ambil dokumen aktif maupun yang pernah ditandai terhapus agar file
  // yang tertinggal akibat proses sebelumnya juga dapat diperiksa.
  const { data: documents, error: documentsError } = await supabaseAdmin
    .from("migrasi_dokumen")
    .select(
      "id, migrasi_debitur_id, jenis_dokumen, nama_file, storage_bucket, storage_path, status, dihapus_at",
    )
    .in("migrasi_debitur_id", allIds);

  if (documentsError) {
    throw new ApiError("Gagal mengambil dokumen untuk dihapus.", 500);
  }

  const allDocuments = (documents ?? []) as StorageDocRow[];
  const activeDocuments = allDocuments.filter((doc) => !doc.dihapus_at);

  // Hapus file fisik terlebih dahulu. Jika Storage gagal, jangan
  // menandai relasi dan dokumen sebagai berhasil dihapus.
  const storageResult = await removeUnsharedStorageFiles(allDocuments);

  const now = new Date().toISOString();

  if (activeDocuments.length > 0) {
    const { error: docError } = await supabaseAdmin
      .from("migrasi_dokumen")
      .update({
        dihapus_at: now,
        dihapus_oleh: userId,
      })
      .in(
        "id",
        activeDocuments.map((doc) => doc.id),
      )
      .is("dihapus_at", null);

    if (docError) {
      throw new ApiError(
        "File Storage telah diproses, tetapi metadata dokumen gagal diperbarui. Periksa kembali sebelum mengulangi proses.",
        500,
      );
    }
  }

  if (activeRows.length > 0) {
    const { error: relationError } = await supabaseAdmin
      .from("migrasi_debitur")
      .update({
        dihapus_at: now,
        dihapus_oleh: userId,
      })
      .in(
        "id",
        activeRows.map((row) => row.id),
      )
      .is("dihapus_at", null);

    if (relationError) {
      throw new ApiError(
        "Dokumen telah diproses, tetapi relasi debitur gagal diperbarui. Periksa kembali data sebelum mengulangi proses.",
        500,
      );
    }
  }

  // Simpan riwayat untuk setiap relasi yang baru dihapus.
  for (const row of activeRows) {
    const { error: auditError } = await supabaseAdmin
      .from("migrasi_riwayat")
      .insert({
        batch_id: row.batch_id,
        pelaku_id: userId,
        aksi: "DEBITUR_SOFT_DELETE",
        detail: {
          migrasi_debitur_id: row.id,
          dihapus_at: now,
        },
      });

    if (auditError) {
      console.error("Audit penghapusan debitur gagal:", auditError);
    }
  }

  return {
    deletedCount: activeRows.length,
    deletedDocumentCount: activeDocuments.length,
    storageDeletedCount: storageResult.removedCount,
    storageSharedCount: storageResult.sharedCount,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return fail(auth.error || "Akses ditolak.", auth.status || 403);
  }

  try {
    const body = await request.json();
    const action = String(body.action || "");

    // =====================================================
    // 1. HAPUS SATU DOKUMEN
    // =====================================================
    if (action === "soft_delete_document") {
      const documentId = getString(body.documentId, body.dokumen_id);

      if (!UUID_REGEX.test(documentId)) {
        return fail("ID dokumen tidak valid.");
      }

      const { data: doc, error: docError } = await supabaseAdmin
        .from("migrasi_dokumen")
        .select(
          "id, migrasi_debitur_id, jenis_dokumen, nama_file, storage_bucket, storage_path, status, dihapus_at",
        )
        .eq("id", documentId)
        .maybeSingle();

      if (docError) throw new ApiError("Gagal memeriksa dokumen.", 500);

      if (!doc || doc.dihapus_at) {
        return fail("Dokumen tidak ditemukan atau sudah dihapus.", 404);
      }

      const { data: relation, error: relationError } = await supabaseAdmin
        .from("migrasi_debitur")
        .select("id, batch_id, dihapus_at")
        .eq("id", doc.migrasi_debitur_id)
        .maybeSingle();

      if (relationError) {
        throw new ApiError("Gagal memeriksa debitur.", 500);
      }

      if (!relation || relation.dihapus_at) {
        return fail("Debitur tidak ditemukan atau sudah dihapus.", 404);
      }

      await getEditableBatch(relation.batch_id);

      const storageResult = await removeUnsharedStorageFiles([
        doc as StorageDocRow,
      ]);

      const now = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from("migrasi_dokumen")
        .update({
          dihapus_at: now,
          dihapus_oleh: auth.userId,
        })
        .eq("id", documentId)
        .is("dihapus_at", null);

      if (updateError) {
        throw new ApiError(
          "File Storage telah diproses, tetapi metadata dokumen gagal diperbarui. Periksa kembali dokumen.",
          500,
        );
      }

      const { error: auditError } = await supabaseAdmin
        .from("migrasi_riwayat")
        .insert({
          batch_id: relation.batch_id,
          dokumen_id: documentId,
          pelaku_id: auth.userId,
          aksi: "DOKUMEN_SOFT_DELETE",
          detail: {
            dokumen_id: documentId,
            dihapus_at: now,
          },
        });

      if (auditError) {
        console.error("Audit penghapusan dokumen gagal:", auditError);
      }

      return NextResponse.json({
        success: true,
        message: storageResult.sharedCount
          ? "Dokumen ditandai terhapus. File fisik dipertahankan karena masih digunakan dokumen aktif lain."
          : "Dokumen ditandai terhapus dan file Storage terkait telah diproses.",
        storageDeletedCount: storageResult.removedCount,
        storageSharedCount: storageResult.sharedCount,
      });
    }

    // =====================================================
    // 2. HAPUS SATU DEBITUR ATAU PILIHAN DEBITUR
    // =====================================================
    if (
      action === "soft_delete_debitur" ||
      action === "bulk_soft_delete_debitur"
    ) {
      const singleId = getString(body.debiturId, body.migrasi_debitur_id);

      const rawIds: unknown[] =
        action === "soft_delete_debitur"
          ? [singleId]
          : Array.isArray(body.debiturIds)
            ? body.debiturIds
            : Array.isArray(body.migrasi_debitur_ids)
              ? body.migrasi_debitur_ids
              : [];

      const ids = rawIds.map((id) => (typeof id === "string" ? id.trim() : ""));

      if (
        ids.length === 0 ||
        ids.length > 200 ||
        ids.some((id) => !UUID_REGEX.test(id))
      ) {
        return fail("Daftar ID debitur tidak valid.");
      }

      const uniqueIds = [...new Set(ids)];

      if (uniqueIds.length !== ids.length) {
        return fail("Daftar ID debitur mengandung ID duplikat.");
      }

      const { data: rows, error } = await supabaseAdmin
        .from("migrasi_debitur")
        .select("id, batch_id, dihapus_at")
        .in("id", uniqueIds);

      if (error) {
        throw new ApiError("Gagal memeriksa debitur yang dipilih.", 500);
      }

      if ((rows || []).length !== uniqueIds.length) {
        return fail("Sebagian debitur tidak ditemukan.", 404);
      }

      const batchId = getString(body.batch_id, body.batchId);

      if (batchId && rows?.some((row) => row.batch_id !== batchId)) {
        return fail("Ada debitur yang bukan milik batch tersebut.");
      }

      const activeRows = (rows || []).filter((row) => !row.dihapus_at);

      if (activeRows.length === 0) {
        return fail("Semua debitur yang dipilih sudah dihapus.", 404);
      }

      const batchIds = [...new Set(activeRows.map((row) => row.batch_id))];

      for (const id of batchIds) {
        await getEditableBatch(id);
      }

      const result = await softDeleteDebiturRows(activeRows, auth.userId);

      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} debitur berhasil ditandai terhapus beserta dokumennya.`,
        deletedCount: result.deletedCount,
        deletedDocumentCount: result.deletedDocumentCount,
        storageDeletedCount: result.storageDeletedCount,
        storageSharedCount: result.storageSharedCount,
      });
    }

    // =====================================================
    // 3. HAPUS BATCH BESERTA DEBITUR DAN DOKUMEN
    // =====================================================
    if (action === "soft_delete_batch" || action === "delete_batch") {
      const batchId = getString(body.batch_id, body.batchId);

      if (!UUID_REGEX.test(batchId)) {
        return fail("ID batch tidak valid.");
      }

      await getEditableBatch(batchId);

      const { data: rows, error: rowsError } = await supabaseAdmin
        .from("migrasi_debitur")
        .select("id, batch_id, dihapus_at")
        .eq("batch_id", batchId);

      if (rowsError) {
        throw new ApiError("Gagal mengambil daftar debitur dalam batch.", 500);
      }

      const result = await softDeleteDebiturRows(rows || [], auth.userId);

      const now = new Date().toISOString();

      const { error: batchError } = await supabaseAdmin
        .from("migrasi_batch")
        .update({
          dihapus_at: now,
          dihapus_oleh: auth.userId,
        })
        .eq("id", batchId)
        .is("dihapus_at", null);

      if (batchError) {
        throw new ApiError(
          "Debitur dan file telah diproses, tetapi batch gagal ditandai terhapus. Periksa kembali batch sebelum mencoba ulang.",
          500,
        );
      }

      const { error: auditError } = await supabaseAdmin
        .from("migrasi_riwayat")
        .insert({
          batch_id: batchId,
          pelaku_id: auth.userId,
          aksi: "BATCH_SOFT_DELETE",
          detail: {
            batch_id: batchId,
            jumlah_debitur: result.deletedCount,
            jumlah_dokumen: result.deletedDocumentCount,
            jumlah_file_storage_diproses: result.storageDeletedCount,
            jumlah_file_dipertahankan: result.storageSharedCount,
            dihapus_at: now,
          },
        });

      if (auditError) {
        console.error("Audit penghapusan batch gagal:", auditError);
      }

      return NextResponse.json({
        success: true,
        message: `Batch berhasil ditandai terhapus. ${result.deletedCount} debitur dan ${result.deletedDocumentCount} dokumen diproses.`,
        deletedCount: result.deletedCount,
        deletedDocumentCount: result.deletedDocumentCount,
        storageDeletedCount: result.storageDeletedCount,
        storageSharedCount: result.storageSharedCount,
      });
    }

    // =====================================================
    // 4. GANTI NAMA BATCH
    // Nama wajib diisi, tidak boleh dikosongkan.
    // Batch yang sudah soft delete tidak dapat diubah.
    // =====================================================
    if (action === "rename_batch") {
      const batchId = getString(body.batch_id, body.batchId);
      const namaBatch = getString(body.nama_batch, body.namaBatch);

      if (!UUID_REGEX.test(batchId)) {
        return fail("ID batch tidak valid.");
      }

      if (!namaBatch) {
        return fail("Nama batch wajib diisi dan tidak boleh dikosongkan.");
      }

      if (namaBatch.length > 100) {
        return fail("Nama batch maksimal 100 karakter.");
      }

      // Cegah karakter kontrol yang tidak diperlukan dalam nama.
      if (/[\u0000-\u001F\u007F]/.test(namaBatch)) {
        return fail("Nama batch mengandung karakter yang tidak valid.");
      }

      const { data: batch, error: batchError } = await supabaseAdmin
        .from("migrasi_batch")
        .select("id, nama_batch, dihapus_at")
        .eq("id", batchId)
        .maybeSingle();

      if (batchError) {
        throw new ApiError("Gagal memeriksa batch migrasi.", 500);
      }

      if (!batch || batch.dihapus_at) {
        return fail(
          "Batch tidak ditemukan atau sudah dihapus. Nama tidak dapat diubah.",
          404,
        );
      }

      const namaLama = batch.nama_batch || null;

      // Hindari update dan catatan audit yang tidak perlu.
      if (namaLama === namaBatch) {
        return NextResponse.json({
          success: true,
          message: "Nama batch tidak berubah.",
          nama_batch: namaBatch,
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from("migrasi_batch")
        .update({ nama_batch: namaBatch })
        .eq("id", batchId)
        .is("dihapus_at", null);

      if (updateError) {
        console.error("Gagal memperbarui nama batch:", updateError);

        if (updateError.code === "23505") {
          return fail(
            "Nama batch sudah digunakan. Gunakan nama yang berbeda.",
            409,
          );
        }

        throw new ApiError("Gagal menyimpan nama batch.", 500);
      }

      // Catat perubahan nama untuk audit.
      const { error: auditError } = await supabaseAdmin
        .from("migrasi_riwayat")
        .insert({
          batch_id: batchId,
          pelaku_id: auth.userId,
          aksi: "BATCH_RENAME",
          detail: {
            batch_id: batchId,
            nama_lama: namaLama,
            nama_baru: namaBatch,
          },
        });

      if (auditError) {
        console.error("Audit perubahan nama batch gagal:", auditError);

        return NextResponse.json({
          success: true,
          message:
            "Nama batch berhasil diperbarui, tetapi pencatatan riwayat gagal.",
          nama_batch: namaBatch,
          warning: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Nama batch berhasil diperbarui.",
        nama_batch: namaBatch,
      });
    }

    // =====================================================
    // 4. TAMBAH DEBITUR KE BATCH
    // =====================================================
    if (action === "add_debitur") {
      const batchId = getString(body.batchId, body.batch_id);
      const pkId = getString(body.pkId, body.pk_id);

      if (!UUID_REGEX.test(batchId) || !UUID_REGEX.test(pkId)) {
        return fail("Batch ID atau PK ID tidak valid.");
      }

      const batch = await getEditableBatch(batchId);

      await checkPK(pkId, batch.unit_id);

      const { data: existingRows, error: existingError } = await supabaseAdmin
        .from("migrasi_debitur")
        .select("id, dihapus_at")
        .eq("batch_id", batchId)
        .eq("pk_id", pkId);

      if (existingError) {
        throw new ApiError("Gagal memeriksa PK dalam batch.", 500);
      }

      const existing = existingRows || [];
      const activeExisting = existing.find((row) => !row.dihapus_at);

      if (activeExisting) {
        return fail("PK tersebut sudah ada dalam batch.", 409);
      }

      const deletedExisting = existing.find((row) => row.dihapus_at);

      if (deletedExisting) {
        const { error } = await supabaseAdmin
          .from("migrasi_debitur")
          .update({
            dihapus_at: null,
            dihapus_oleh: null,
          })
          .eq("id", deletedExisting.id);

        if (error) {
          throw new ApiError("Gagal memulihkan relasi debitur.", 500);
        }

        return NextResponse.json({
          success: true,
          message:
            "Relasi debitur sebelumnya berhasil dipulihkan. Dokumen lama tetap berstatus terhapus dan perlu diunggah kembali jika diperlukan.",
        });
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("migrasi_debitur")
        .insert({ batch_id: batchId, pk_id: pkId })
        .select("id")
        .single();

      if (insertError || !inserted) {
        throw new ApiError("Gagal menambahkan debitur ke batch.", 500);
      }

      return NextResponse.json(
        {
          success: true,
          message: "Debitur berhasil ditambahkan.",
          debiturId: inserted.id,
        },
        { status: 201 },
      );
    }

    // =====================================================
    // 5. GANTI RELASI PK PADA DEBITUR MIGRASI
    // Tidak mengubah data PK sumber.
    // =====================================================
    if (action === "replace_pk") {
      const debiturId = getString(body.debiturId, body.migrasi_debitur_id);
      const pkId = getString(body.pkId, body.pk_id);

      if (!UUID_REGEX.test(debiturId) || !UUID_REGEX.test(pkId)) {
        return fail("ID debitur atau PK tidak valid.");
      }

      const { data: relation, error } = await supabaseAdmin
        .from("migrasi_debitur")
        .select("id, batch_id, dihapus_at")
        .eq("id", debiturId)
        .maybeSingle();

      if (error) {
        throw new ApiError("Gagal memeriksa relasi debitur.", 500);
      }

      if (!relation || relation.dihapus_at) {
        return fail("Debitur tidak ditemukan atau sudah dihapus.", 404);
      }

      const batch = await getEditableBatch(relation.batch_id);

      await checkPK(pkId, batch.unit_id);

      const { data: duplicates, error: duplicateError } = await supabaseAdmin
        .from("migrasi_debitur")
        .select("id")
        .eq("batch_id", relation.batch_id)
        .eq("pk_id", pkId)
        .is("dihapus_at", null)
        .neq("id", debiturId)
        .limit(1);

      if (duplicateError) {
        throw new ApiError("Gagal memeriksa PK duplikat.", 500);
      }

      if (duplicates && duplicates.length > 0) {
        return fail("PK tersebut sudah ada dalam batch.", 409);
      }

      const { error: updateError } = await supabaseAdmin
        .from("migrasi_debitur")
        .update({ pk_id: pkId })
        .eq("id", debiturId);

      if (updateError) {
        throw new ApiError("Gagal mengganti PK debitur.", 500);
      }

      return NextResponse.json({
        success: true,
        message: "Relasi PK debitur berhasil diperbarui.",
      });
    }

    return fail("Aksi tidak dikenal.");
  } catch (error) {
    console.error("API pengelolaan monitoring migrasi:", error);

    if (error instanceof ApiError) {
      return fail(error.message, error.status);
    }

    return fail(
      error instanceof Error ? error.message : "Terjadi kesalahan server.",
      500,
    );
  }
}
