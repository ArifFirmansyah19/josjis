import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  canAccessSerahTerimaUnit,
  requireSerahTerimaAuth,
} from "@/lib/serah-terima-agunan-lunas-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "dokumen-penyerahan-agunan-lunas";
const MAX_PDF_SIZE = 500 * 1024;

const NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

function fail(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: NO_CACHE_HEADERS },
  );
}

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function getRecord(id: string) {
  return supabaseAdmin
    .from("serah_terima_agunan_lunas")
    .select(
      [
        "id",
        "unit_id",
        "nama_debitur",
        "nomor_rekening_pinjaman",
        "tanggal_penyerahan",
        "tahun_surat",
        "nomor_urut_surat",
        "surat_keluar_id",
        "dokumen_path",
        "nama_file_asli",
        "tipe_file_asli",
        "ukuran_file_bytes",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("id", id)
    .maybeSingle();
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function sanitizeOriginalName(value: string): string {
  const cleaned = value
    .replace(/[\r\n\0]/g, "")
    .replace(/[^\w.\- (),]/g, "_")
    .trim()
    .slice(0, 200);

  return cleaned || "dokumen.pdf";
}

async function removeStorageFile(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("Gagal membersihkan file Storage:", error.message);
    return error;
  }

  return null;
}

async function readAndValidatePdf(
  file: File,
): Promise<
  { ok: true; buffer: Buffer } | { ok: false; message: string; status: number }
> {
  if (file.size === 0) {
    return {
      ok: false,
      message: "File PDF yang dipilih kosong.",
      status: 400,
    };
  }

  if (file.size > MAX_PDF_SIZE) {
    return {
      ok: false,
      message:
        "Ukuran PDF melebihi batas maksimal 500 KB. Kompres dokumen terlebih dahulu.",
      status: 413,
    };
  }

  if (file.type !== "application/pdf") {
    return {
      ok: false,
      message: "Dokumen harus berupa file PDF.",
      status: 400,
    };
  }

  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());

  if (String.fromCharCode(...signature) !== "%PDF-") {
    return {
      ok: false,
      message: "Isi dokumen bukan PDF yang valid.",
      status: 400,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length === 0 || buffer.length > MAX_PDF_SIZE) {
    return {
      ok: false,
      message: "Ukuran PDF tidak valid atau melebihi batas 500 KB.",
      status: 413,
    };
  }

  return { ok: true, buffer };
}

// GET: mengambil detail satu BAST.
export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  const { id } = await context.params;

  const { data, error } = await getRecord(id);

  if (error) {
    console.error("Gagal mengambil detail BAST:", error.message);
    return fail("Gagal mengambil detail data.", 500);
  }

  if (!data) {
    return fail("Data serah terima tidak ditemukan.", 404);
  }

  if (!canAccessSerahTerimaUnit(auth, data.unit_id)) {
    return fail("Anda tidak memiliki akses ke data ini.", 403);
  }

  // Jangan mengirim path Storage privat ke browser.
  const { dokumen_path: _privatePath, ...safeData } = data;

  return NextResponse.json(
    { success: true, data: safeData },
    { headers: NO_CACHE_HEADERS },
  );
}

// PATCH: mengedit BAST tanpa membuat nomor Surat Keluar baru.
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  if (auth.role !== "ADMIN") {
    return fail("Hanya Admin aktif yang dapat mengedit data.", 403);
  }

  const { id } = await context.params;

  let uploadedPath: string | null = null;

  try {
    const { data: record, error: readError } = await getRecord(id);

    if (readError) {
      console.error("Gagal membaca BAST sebelum edit:", readError.message);
      return fail("Gagal memeriksa data yang akan diedit.", 500);
    }

    if (!record) {
      return fail("Data serah terima tidak ditemukan.", 404);
    }

    if (!canAccessSerahTerimaUnit(auth, record.unit_id)) {
      return fail("Anda tidak memiliki akses ke data ini.", 403);
    }

    const formData = await request.formData();

    const namaDebitur = String(formData.get("namaDebitur") ?? "").trim();

    const nomorRekening = String(
      formData.get("nomorRekeningPinjaman") ?? "",
    ).trim();

    const tanggal = String(formData.get("tanggalPenyerahan") ?? "").trim();

    if (!namaDebitur || namaDebitur.length > 200) {
      return fail("Nama debitur wajib diisi, maksimal 200 karakter.", 400);
    }

    if (!nomorRekening || nomorRekening.length > 100) {
      return fail(
        "Nomor rekening pinjaman wajib diisi, maksimal 100 karakter.",
        400,
      );
    }

    if (!isValidDate(tanggal)) {
      return fail("Tanggal penyerahan tidak valid.", 400);
    }

    // File tidak wajib. Tanpa file baru, dokumen lama dipertahankan.
    const fileEntry = formData.get("dokumen");

    if (
      fileEntry !== null &&
      typeof fileEntry !== "string" &&
      !(fileEntry instanceof File)
    ) {
      return fail("Format dokumen tidak valid.", 400);
    }

    if (typeof fileEntry === "string" && fileEntry.trim()) {
      return fail("Format dokumen tidak valid.", 400);
    }

    const replacementFile =
      fileEntry instanceof File && fileEntry.name.trim() ? fileEntry : null;

    let replacementBuffer: Buffer | null = null;
    let safeOriginalName: string | null = null;

    if (replacementFile) {
      const validation = await readAndValidatePdf(replacementFile);

      if (!validation.ok) {
        return fail(validation.message, validation.status);
      }

      replacementBuffer = validation.buffer;

      const originalNameInput = String(
        formData.get("namaFileAsli") ?? replacementFile.name,
      );

      safeOriginalName = sanitizeOriginalName(originalNameInput);

      // Upload file baru dengan nama unik ke folder unit yang sama.
      uploadedPath = `${record.unit_id}/${crypto.randomUUID()}.pdf`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(uploadedPath, replacementBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload PDF pengganti gagal:", uploadError.message);

        uploadedPath = null;

        return fail("Dokumen pengganti gagal diunggah.", 500);
      }
    }

    // Nomor surat, unit, dan relasi surat tidak boleh berubah.
    const updatePayload: Record<string, string | number> = {
      nama_debitur: namaDebitur,
      nomor_rekening_pinjaman: nomorRekening,
      tanggal_penyerahan: tanggal,
      updated_at: new Date().toISOString(),
    };

    if (replacementFile && uploadedPath && replacementBuffer) {
      updatePayload.dokumen_path = uploadedPath;
      updatePayload.nama_file_asli = safeOriginalName ?? "dokumen.pdf";
      updatePayload.tipe_file_asli = "application/pdf";
      updatePayload.ukuran_file_bytes = replacementBuffer.length;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("serah_terima_agunan_lunas")
      .update(updatePayload)
      .eq("id", id)
      .eq("unit_id", record.unit_id)
      .select(
        [
          "id",
          "unit_id",
          "nama_debitur",
          "nomor_rekening_pinjaman",
          "tanggal_penyerahan",
          "tahun_surat",
          "nomor_urut_surat",
          "surat_keluar_id",
          "nama_file_asli",
          "tipe_file_asli",
          "ukuran_file_bytes",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .maybeSingle();

    if (updateError || !updated) {
      if (uploadedPath) {
        await removeStorageFile(uploadedPath);
        uploadedPath = null;
      }

      if (updateError) {
        console.error("Update BAST gagal:", updateError.message);
        return fail("Data BAST gagal diperbarui.", 500);
      }

      return fail(
        "Data tidak berhasil diperbarui. Muat ulang halaman lalu coba lagi.",
        409,
      );
    }

    // Update database berhasil. File baru menjadi file aktif.
    const oldPath = record.dokumen_path;
    uploadedPath = null;

    // Hapus file lama hanya setelah update database sukses.
    if (replacementFile && oldPath) {
      const cleanupError = await removeStorageFile(oldPath);

      if (cleanupError) {
        return NextResponse.json(
          {
            success: true,
            message:
              "Data berhasil diperbarui, tetapi file PDF lama belum berhasil dibersihkan.",
            data: updated,
            storageCleanupWarning: true,
          },
          { headers: NO_CACHE_HEADERS },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: replacementFile
          ? "Data BAST dan dokumen berhasil diperbarui."
          : "Data BAST berhasil diperbarui.",
        data: updated,
      },
      { headers: NO_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("PATCH serah terima gagal:", error);

    if (uploadedPath) {
      await removeStorageFile(uploadedPath);
    }

    return fail("Terjadi kesalahan saat memperbarui data.", 500);
  }
}

// DELETE: menghapus BAST tanpa menghapus riwayat nomor Surat Keluar.
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  if (auth.role !== "ADMIN") {
    return fail("Hanya Admin aktif yang dapat menghapus data.", 403);
  }

  const { id } = await context.params;

  const { data: record, error: readError } = await getRecord(id);

  if (readError) {
    console.error("Gagal membaca data sebelum hapus:", readError.message);
    return fail("Gagal memeriksa data yang akan dihapus.", 500);
  }

  if (!record) {
    return fail("Data serah terima tidak ditemukan.", 404);
  }

  if (!canAccessSerahTerimaUnit(auth, record.unit_id)) {
    return fail("Anda tidak memiliki akses ke data ini.", 403);
  }

  const { data: deleted, error: deleteError } = await supabaseAdmin.rpc(
    "delete_serah_terima_agunan_lunas",
    {
      p_user_id: auth.userId,
      p_record_id: id,
    },
  );

  if (deleteError) {
    console.error("Penghapusan BAST gagal:", deleteError.message);
    return fail(deleteError.message || "Data gagal dihapus.", 400);
  }

  const path = deleted?.dokumen_path;

  // Record database sudah terhapus. Bersihkan file privat sesudahnya.
  if (path) {
    const storageError = await removeStorageFile(path);

    if (storageError) {
      return NextResponse.json(
        {
          success: true,
          message:
            "Data berhasil dihapus, tetapi file Storage belum berhasil dibersihkan. Hubungi administrator.",
          storageCleanupWarning: true,
        },
        { headers: NO_CACHE_HEADERS },
      );
    }
  }

  return NextResponse.json(
    {
      success: true,
      message: "Data dan dokumen berhasil dihapus.",
    },
    { headers: NO_CACHE_HEADERS },
  );
}
