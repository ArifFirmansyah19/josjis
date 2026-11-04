import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  canAccessSerahTerimaUnit,
  requireSerahTerimaAuth,
} from "@/lib/serah-terima-agunan-lunas-auth";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UNIT_MAP: Record<string, string> = {
  JKK1: "JKK1",
  "11081A": "JKK1",
  "JAMBI KUAMANG KUNING 1": "JKK1",
  JKK2: "JKK2",
  "11081B": "JKK2",
  "JAMBI KUAMANG KUNING 2": "JKK2",
};
function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}
function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();
  if (!auth.ok) return fail(auth.error, auth.status);
  if (auth.role !== "ADMIN")
    return fail("Hanya ADMIN yang dapat mengimpor Excel.", 403);

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("File Excel tidak ditemukan.");
    if (!/\.(xlsx|xls)$/i.test(file.name))
      return fail("Format file harus .xlsx atau .xls.");
    if (file.size <= 0 || file.size > MAX_FILE_SIZE)
      return fail("Ukuran file maksimal 10 MB.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return fail("Workbook tidak memiliki sheet.");
    const sheet = workbook.Sheets[firstSheet];
    // header:1 mempertahankan posisi baris fisik; baris kedua adalah header.
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true,
    });
    if (rows.length < 3)
      return fail(
        "Data Excel harus memiliki header pada baris 2 dan data mulai baris 3.",
      );

    const errors: Array<{ baris: number; pesan: string }> = [];
    const valid: any[] = [];
    const unitCache = new Map<string, string>();
    const batchId = randomUUID();

    for (let index = 2; index < rows.length; index++) {
      const row = rows[index] || [];
      const unitValue = normalize(row[1]); // Kolom B
      const nama = String(row[2] ?? "").trim(); // Kolom C
      const jaminan = String(row[3] ?? "").trim(); // Kolom D
      const moral = String(row[4] ?? "").trim(); // Kolom E
      if (!unitValue && !nama && !jaminan && !moral) continue;
      const code = UNIT_MAP[unitValue];
      if (!code) {
        errors.push({
          baris: index + 1,
          pesan: `Unit pada kolom B tidak dikenal: ${unitValue || "kosong"}.`,
        });
        continue;
      }
      if (!nama) {
        errors.push({
          baris: index + 1,
          pesan: "Nama Debitur pada kolom C wajib diisi.",
        });
        continue;
      }

      // Selalu tetapkan unitId sebagai string yang sudah tervalidasi.
      let unitId: string;
      const cachedUnitId = unitCache.get(code);
      if (cachedUnitId) {
        unitId = cachedUnitId;
      } else {
        const { data: unit, error } = await supabaseAdmin
          .from("unit")
          .select("id,kode_unit")
          .eq("kode_unit", code)
          .maybeSingle();
        const resolvedUnitId = unit?.id;
        if (error || typeof resolvedUnitId !== "string" || !resolvedUnitId) {
          errors.push({
            baris: index + 1,
            pesan: `Unit ${code} tidak ditemukan di database.`,
          });
          continue;
        }
        unitId = resolvedUnitId;
        unitCache.set(code, resolvedUnitId);
      }

      // Periksa juga akses untuk unit yang berasal dari cache.
      if (!canAccessSerahTerimaUnit(auth, unitId)) {
        errors.push({
          baris: index + 1,
          pesan: `Akun tidak memiliki akses ke unit ${code}.`,
        });
        continue;
      }

      valid.push({
        unit_id: unitId,
        unit_excel: code,
        nama_debitur: nama,
        jaminan_utama: jaminan || null,
        moral_obligasi: moral || null,
        sumber_input: "EXCEL",
        import_batch_id: batchId,
        created_by: auth.userId,
        updated_by: auth.userId,
      });
    }

    if (!valid.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada baris valid untuk diimpor.",
          imported: 0,
          skipped: errors.length,
          errors,
        },
        { status: 400 },
      );
    }
    const { error } = await supabaseAdmin
      .from("agunan_lunas_data")
      .insert(valid);
    if (error) return fail(error.message, 500);
    return NextResponse.json({
      success: true,
      message: `${valid.length} data berhasil diimpor${errors.length ? `; ${errors.length} baris dilewati` : ""}.`,
      imported: valid.length,
      skipped: errors.length,
      import_batch_id: batchId,
      errors,
    });
  } catch (error: any) {
    return fail(
      error?.message || "Terjadi kesalahan saat membaca file Excel.",
      500,
    );
  }
}
