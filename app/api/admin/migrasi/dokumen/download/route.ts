import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireActiveAdmin } from "@/lib/migrasi-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireActiveAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status },
      );
    }

    const documentId = request.nextUrl.searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "ID dokumen wajib diisi." },
        { status: 400 },
      );
    }

    const { data: documentRow, error: documentError } = await supabaseAdmin
      .from("migrasi_dokumen")
      .select("id, nama_file, storage_bucket, storage_path, mime_type, status")
      .eq("id", documentId)
      .maybeSingle();

    if (documentError) {
      console.error("Gagal membaca metadata dokumen:", documentError);

      return NextResponse.json(
        { success: false, error: "Gagal membaca data dokumen." },
        { status: 500 },
      );
    }

    if (!documentRow) {
      return NextResponse.json(
        { success: false, error: "Dokumen tidak ditemukan." },
        { status: 404 },
      );
    }

    if (
      String(documentRow.status || "").toUpperCase() !== "TERSIMPAN" ||
      !documentRow.storage_bucket ||
      !documentRow.storage_path
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Dokumen tidak tersedia untuk diunduh.",
        },
        { status: 404 },
      );
    }

    const { data: file, error: storageError } = await supabaseAdmin.storage
      .from(documentRow.storage_bucket)
      .download(documentRow.storage_path);

    if (storageError || !file) {
      console.error("Gagal mengunduh file dari Storage:", storageError);

      return NextResponse.json(
        {
          success: false,
          error: "File tidak ditemukan di penyimpanan dokumen.",
        },
        { status: 404 },
      );
    }

    const filename = String(documentRow.nama_file || "dokumen.pdf")
      .replace(/[\r\n"]/g, "_")
      .slice(0, 180);

    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": documentRow.mime_type || "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          filename,
        )}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Kesalahan endpoint unduh migrasi:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan saat mengunduh dokumen.",
      },
      { status: 500 },
    );
  }
}
