import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireActiveAdmin } from "@/lib/migrasi-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BatchRow = {
  id: string;
  unit_id: string;
  nama_batch: string | null;
  status: string;
  dihapus_at: string | null;
};

type DebiturRow = {
  id: string;
  batch_id: string;
  pk_id: string;
  created_at: string;
};

type PKRow = {
  id: string;
  unit_id: string;
  nama_debitur: string | null;
  nomor_pk: string | null;
  cif: string | null;
};

type DokumenRow = {
  id: string;
  migrasi_debitur_id: string;
  jenis_dokumen: string;
  nama_file: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  status: string;
  dihapus_at: string | null;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// Membersihkan nama untuk folder dan file ZIP.
function safeName(value: unknown, fallback = "Debitur") {
  return (
    String(value ?? "")
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 100) || fallback
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return errorResponse(auth.error || "Akses ditolak.", auth.status || 403);
  }

  try {
    const params = request.nextUrl.searchParams;
    const debiturId = params.get("migrasi_debitur_id")?.trim();
    const batchId = params.get("batch_id")?.trim();

    if ((!debiturId && !batchId) || (debiturId && batchId)) {
      return errorResponse(
        "Isi salah satu parameter: migrasi_debitur_id atau batch_id.",
      );
    }

    // 1. Ambil relasi debitur yang belum dihapus.
    let relationQuery = supabaseAdmin
      .from("migrasi_debitur")
      .select("id, batch_id, pk_id, created_at")
      .is("dihapus_at", null);

    if (debiturId) {
      relationQuery = relationQuery.eq("id", debiturId);
    }

    if (batchId) {
      relationQuery = relationQuery.eq("batch_id", batchId);
    }

    const { data: relationData, error: relationError } = await relationQuery;

    if (relationError) {
      console.error("ZIP: gagal membaca debitur:", relationError);
      return errorResponse("Gagal membaca daftar debitur.", 500);
    }

    if (!relationData?.length) {
      return errorResponse("Tidak ada debitur aktif untuk diunduh.", 404);
    }

    const relations = relationData as DebiturRow[];
    const batchIds = [...new Set(relations.map((row) => row.batch_id))];

    // 2. Pastikan batch tersedia dan belum dihapus.
    const { data: batchData, error: batchError } = await supabaseAdmin
      .from("migrasi_batch")
      .select("id, unit_id, nama_batch, status, dihapus_at")
      .in("id", batchIds);

    if (batchError) {
      console.error("ZIP: gagal membaca batch:", batchError);
      return errorResponse("Gagal memeriksa batch migrasi.", 500);
    }

    const batchMap = new Map(
      ((batchData ?? []) as BatchRow[]).map((row) => [row.id, row]),
    );

    for (const id of batchIds) {
      const batch = batchMap.get(id);

      if (!batch || batch.dihapus_at) {
        return errorResponse("Batch tidak ditemukan atau sudah dihapus.", 404);
      }
    }

    // Unduhan batch harus benar-benar merujuk pada satu batch.
    const batch = batchMap.get(batchIds[0]);

    if (!batch) {
      return errorResponse("Batch migrasi tidak ditemukan.", 404);
    }

    if (batchId && !batch.nama_batch?.trim()) {
      return errorResponse(
        "Batch belum memiliki nama. Isi nama batch terlebih dahulu sebelum mengunduh ZIP.",
        409,
      );
    }

    // 3. Ambil identitas debitur dari tabel PK asli.
    const pkIds = [...new Set(relations.map((row) => row.pk_id))];

    const { data: pkData, error: pkError } = await supabaseAdmin
      .from("pk")
      .select("id, unit_id, nama_debitur, nomor_pk, cif")
      .in("id", pkIds);

    if (pkError) {
      console.error("ZIP: gagal membaca identitas debitur:", pkError);
      return errorResponse("Gagal membaca identitas debitur.", 500);
    }

    const pkMap = new Map(
      ((pkData ?? []) as PKRow[]).map((row) => [row.id, row]),
    );

    // 4. Ambil dokumen yang aktif dan sudah tersimpan.
    const relationIds = relations.map((row) => row.id);

    const { data: docsData, error: docsError } = await supabaseAdmin
      .from("migrasi_dokumen")
      .select(
        "id, migrasi_debitur_id, jenis_dokumen, nama_file, storage_bucket, storage_path, mime_type, status, dihapus_at",
      )
      .in("migrasi_debitur_id", relationIds)
      .is("dihapus_at", null)
      .eq("status", "TERSIMPAN")
      .order("created_at", { ascending: true });

    if (docsError) {
      console.error("ZIP: gagal membaca dokumen:", docsError);
      return errorResponse("Gagal membaca dokumen.", 500);
    }

    const docs = (docsData ?? []) as DokumenRow[];

    if (docs.length === 0) {
      return errorResponse("Tidak ada dokumen aktif yang bisa diunduh.", 404);
    }

    // Batas agar pembuatan ZIP tidak membebani server.
    if (docs.length > 500) {
      return errorResponse(
        "ZIP melebihi batas 500 dokumen. Unduh per debitur atau per batch lebih kecil.",
        413,
      );
    }

    // 5. Siapkan struktur ZIP.
    const zip = new JSZip();

    // Untuk ZIP batch, seluruh isi diletakkan di folder bernama batch.
    // Untuk ZIP per debitur, file tetap berada di root ZIP.
    const rootFolder = batchId
      ? zip.folder(safeName(batch.nama_batch, "Batch_Migrasi"))
      : null;

    if (batchId && !rootFolder) {
      return errorResponse("Gagal membuat folder utama ZIP.", 500);
    }

    const usedPaths = new Set<string>();
    let filesAdded = 0;

    // 6. Unduh file dari Supabase Storage dan masukkan ke ZIP.
    for (const doc of docs) {
      if (!doc.storage_bucket || !doc.storage_path) {
        console.warn("ZIP: dokumen tidak memiliki lokasi storage:", doc.id);
        continue;
      }

      const relation = relations.find(
        (row) => row.id === doc.migrasi_debitur_id,
      );

      if (!relation) continue;

      const pk = pkMap.get(relation.pk_id);

      const folderName = safeName(
        pk?.nama_debitur || pk?.nomor_pk || relation.id,
      );

      const nomorPK = safeName(pk?.nomor_pk || relation.id);
      const debiturFolderName = `${folderName}_${nomorPK}`.slice(0, 180);

      const storage = supabaseAdmin.storage.from(doc.storage_bucket);

      const { data: file, error: fileError } = await storage.download(
        doc.storage_path,
      );

      if (fileError || !file) {
        console.error("ZIP: file gagal dibaca:", doc.id, fileError);
        continue;
      }

      const bytes = await file.arrayBuffer();

      const originalName = safeName(
        doc.nama_file || `${doc.jenis_dokumen}.pdf`,
        "Dokumen.pdf",
      );

      const fileName = originalName.toLowerCase().endsWith(".pdf")
        ? originalName
        : `${originalName}.pdf`;

      // ZIP per debitur: file langsung di root.
      // ZIP batch: folder utama batch -> folder debitur -> file.
      const folder = debiturId ? zip : rootFolder?.folder(debiturFolderName);

      if (!folder) continue;

      let finalName = fileName;
      let counter = 2;

      const basePath = debiturId ? "" : `${debiturFolderName}/`;

      while (usedPaths.has(`${basePath}${finalName}`)) {
        const dot = fileName.lastIndexOf(".");
        finalName =
          dot > 0
            ? `${fileName.slice(0, dot)}_${counter}${fileName.slice(dot)}`
            : `${fileName}_${counter}`;

        counter++;
      }

      usedPaths.add(`${basePath}${finalName}`);
      folder.file(finalName, bytes);
      filesAdded++;
    }

    if (filesAdded === 0) {
      return errorResponse(
        "Tidak ada file yang berhasil dibaca dari penyimpanan. ZIP tidak dibuat.",
        404,
      );
    }

    // 7. Buat arsip ZIP.
    const output = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 5 },
    });

    const filename = debiturId
      ? `Dokumen_Debitur_${safeName(debiturId)}.zip`
      : `${safeName(batch.nama_batch, "Batch_Migrasi")}.zip`;

    return new Response(Buffer.from(output), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("ZIP monitoring migrasi:", error);

    return errorResponse(
      error instanceof Error ? error.message : "Gagal membuat ZIP.",
      500,
    );
  }
}
