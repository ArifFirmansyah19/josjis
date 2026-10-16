import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  canAccessSerahTerimaUnit,
  requireSerahTerimaAuth,
} from "@/lib/serah-terima-agunan-lunas-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "dokumen-penyerahan-agunan-lunas";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function fail(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireSerahTerimaAuth();
  if (!auth.ok) return fail(auth.error, auth.status);

  const { id } = await context.params;

  const { data: record, error } = await supabaseAdmin
    .from("serah_terima_agunan_lunas")
    .select("id, unit_id, dokumen_path, nama_file_asli")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Gagal membaca metadata dokumen:", error.message);
    return fail("Gagal membaca dokumen.", 500);
  }

  if (!record) return fail("Dokumen tidak ditemukan.", 404);

  if (!canAccessSerahTerimaUnit(auth, record.unit_id)) {
    return fail("Anda tidak memiliki akses ke dokumen ini.", 403);
  }

  const { data: file, error: downloadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(record.dokumen_path);

  if (downloadError || !file) {
    console.error("Gagal mengambil PDF:", downloadError?.message);
    return fail("File PDF tidak ditemukan di penyimpanan.", 404);
  }

  const filename = (record.nama_file_asli || "dokumen.pdf")
    .replace(/[\r\n"]/g, "_")
    .slice(0, 180);

  const inline = request.nextUrl.searchParams.get("inline") === "1";

  return new NextResponse(await file.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename.endsWith(".pdf") ? filename : `${filename}.pdf`}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
