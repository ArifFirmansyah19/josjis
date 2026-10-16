import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  canAccessSerahTerimaUnit,
  requireSerahTerimaAuth,
} from "@/lib/serah-terima-agunan-lunas-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "dokumen-penyerahan-agunan-lunas";
const MAX_SELECTED = 100;

interface SerahTerimaRecord {
  id: string;
  unit_id: string | null;
  nama_debitur: string | null;
  tahun_surat: number | null;
  nomor_urut_surat: number | null;
  dokumen_path: string | null;
}

function fail(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

/**
 * Membersihkan nama folder/file agar aman di dalam ZIP.
 */
function sanitizeName(value: string, fallback = "Tanpa Nama"): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 100);

  return cleaned || fallback;
}

function buildPdfName(
  namaDebitur: string,
  nomorUrut: number | null,
  tahun: number | null,
): string {
  const nama = sanitizeName(namaDebitur);
  const nomor = String(nomorUrut ?? 0).padStart(3, "0");
  const tahunSurat = tahun ?? "tanpa-tahun";

  return `Serah Terima Agunan - ${nama} - ${nomor}-${tahunSurat}.pdf`;
}

export async function POST(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  try {
    const body = await request.json().catch(() => null);
    const ids: unknown = body?.ids;

    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > MAX_SELECTED ||
      ids.some((id: unknown) => typeof id !== "string" || !id.trim())
    ) {
      return fail(
        `Pilih antara 1 sampai ${MAX_SELECTED} data untuk diunduh.`,
        400,
      );
    }

    const uniqueIds = [...new Set(ids as string[])];

    if (uniqueIds.length !== ids.length) {
      return fail("Daftar pilihan berisi ID duplikat.", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("serah_terima_agunan_lunas")
      .select(
        [
          "id",
          "unit_id",
          "nama_debitur",
          "tahun_surat",
          "nomor_urut_surat",
          "dokumen_path",
        ].join(","),
      )
      .in("id", uniqueIds);

    if (error) {
      console.error("Gagal membaca data untuk ZIP:", error.message);
      return fail("Gagal menyiapkan dokumen ZIP.", 500);
    }

    /*
     * Supabase bisa menghasilkan GenericStringError jika
     * tipe tabel/kolom belum tercantum dalam Database type.
     * Validasi runtime tetap dilakukan melalui pemeriksaan error
     * dan jumlah data sebelum data dipakai.
     */
    const records = (data ?? []) as unknown as SerahTerimaRecord[];

    if (records.length !== uniqueIds.length) {
      return fail("Sebagian data tidak ditemukan.", 404);
    }

    const inaccessible = records.some(
      (record) =>
        !record.unit_id || !canAccessSerahTerimaUnit(auth, record.unit_id),
    );

    if (inaccessible) {
      return fail("Anda tidak memiliki akses ke salah satu dokumen.", 403);
    }

    // Semua PDF dimasukkan ke dalam satu folder utama ZIP.
    const zip = new JSZip();
    const rootFolder = zip.folder("Kumpulan Penyerahan Agunan Debitur");

    if (!rootFolder) {
      return fail("Folder ZIP gagal dibuat.", 500);
    }

    // Urutkan secara konsisten berdasarkan nama debitur.
    const sortedRecords = [...records].sort((a, b) =>
      String(a.nama_debitur ?? "").localeCompare(
        String(b.nama_debitur ?? ""),
        "id",
      ),
    );

    for (const record of sortedRecords) {
      const dokumenPath = record.dokumen_path;

      if (!dokumenPath) {
        return fail(
          `Lokasi dokumen ${record.nama_debitur || "debitur"} tidak ditemukan.`,
          500,
        );
      }

      const { data: file, error: downloadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(dokumenPath);

      if (downloadError || !file) {
        console.error(
          "Gagal mengambil dokumen untuk ZIP:",
          record.id,
          downloadError?.message,
        );

        return fail(
          `Dokumen ${record.nama_debitur || "debitur"} gagal diambil.`,
          500,
        );
      }

      const namaDebitur = sanitizeName(record.nama_debitur || "Tanpa Nama");

      // Folder terpisah untuk setiap debitur.
      const debtorFolder = rootFolder.folder(namaDebitur);

      if (!debtorFolder) {
        return fail(`Folder debitur ${namaDebitur} gagal dibuat.`, 500);
      }

      const filename = buildPdfName(
        record.nama_debitur || "Tanpa Nama",
        record.nomor_urut_surat,
        record.tahun_surat,
      );

      debtorFolder.file(filename, await file.arrayBuffer());
    }

    const zipBuffer = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const date = new Date().toISOString().slice(0, 10);
    const zipFilename = `Kumpulan-Penyerahan-Agunan-Debitur-${date}.zip`;

    return new NextResponse(Buffer.from(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Pembuatan ZIP gagal:", error);
    return fail("Terjadi kesalahan saat membuat ZIP.", 500);
  }
}
