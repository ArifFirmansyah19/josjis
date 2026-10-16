import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  canAccessSerahTerimaUnit,
  requireSerahTerimaAuth,
} from "@/lib/serah-terima-agunan-lunas-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PDF_SIZE = 500 * 1024;

const STORAGE_BUCKET = "dokumen-penyerahan-agunan-lunas";

function fail(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}

const UNIT_CODE_MAP: Record<string, string> = {
  "11081A": "JKK1",
  "11081B": "JKK2",
  JKK1: "JKK1",
  JKK2: "JKK2",
};

async function resolveUnitId(
  requestedUnitId: string,
  requestedUnitCode: string,
): Promise<
  | { ok: true; unitId: string | null }
  | { ok: false; message: string; status: number }
> {
  if (requestedUnitId) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(requestedUnitId)) {
      return {
        ok: false,
        message: "Format UUID unit tidak valid.",
        status: 400,
      };
    }

    return { ok: true, unitId: requestedUnitId };
  }

  if (!requestedUnitCode) {
    return { ok: true, unitId: null };
  }

  const internalCode = UNIT_CODE_MAP[requestedUnitCode.toUpperCase()];

  if (!internalCode) {
    return {
      ok: false,
      message: "Kode unit tidak dikenal.",
      status: 400,
    };
  }

  const candidates = [
    ...new Set([requestedUnitCode.toUpperCase(), internalCode]),
  ];

  for (const code of candidates) {
    const { data, error } = await supabaseAdmin
      .from("unit")
      .select("id, kode_unit")
      .eq("kode_unit", code)
      .maybeSingle();

    if (error) {
      console.error("Gagal mencari unit:", error.message);

      return {
        ok: false,
        message: "Gagal memeriksa unit kerja.",
        status: 500,
      };
    }

    if (data) {
      return { ok: true, unitId: data.id };
    }
  }

  return {
    ok: false,
    message:
      `Unit ${requestedUnitCode} tidak ditemukan. ` +
      "Periksa kode_unit pada tabel public.unit.",
    status: 404,
  };
}

function sanitizeOriginalName(value: string): string {
  const cleaned = value
    .replace(/[\r\n\0]/g, "")
    .replace(/[^\w.\- (),]/g, "_")
    .trim()
    .slice(0, 200);

  return cleaned || "dokumen.pdf";
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

export async function POST(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  if (auth.role !== "ADMIN") {
    return fail("Hanya ADMIN aktif yang dapat menambah data.", 403);
  }

  let uploadedPath: string | null = null;

  try {
    const formData = await request.formData();

    const unitCodeRaw = String(formData.get("unitCode") ?? "")
      .trim()
      .toUpperCase();

    const unitCode = UNIT_CODE_MAP[unitCodeRaw];

    const namaDebitur = String(formData.get("namaDebitur") ?? "").trim();

    const nomorRekening = String(
      formData.get("nomorRekeningPinjaman") ?? "",
    ).trim();

    const tanggal = String(formData.get("tanggalPenyerahan") ?? "").trim();

    const file = formData.get("dokumen");

    // Validasi data formulir.
    if (!unitCode) {
      return fail("Unit harus JKK1 atau JKK2.", 400);
    }

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

    // Halaman klien wajib mengubah foto/PDF menjadi PDF terlebih dahulu.
    if (!(file instanceof File) || file.size === 0) {
      return fail("Silakan pilih dokumen PDF.", 400);
    }

    // Pertahanan utama: file lebih dari 500 KB tidak pernah disimpan.
    if (file.size > MAX_PDF_SIZE) {
      return fail(
        "Ukuran PDF melebihi batas maksimal 500 KB. " +
          "Kompres dokumen terlebih dahulu.",
        413,
      );
    }

    // Periksa MIME dan tanda tangan file.
    if (file.type !== "application/pdf") {
      return fail("Dokumen harus berupa file PDF.", 400);
    }

    const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());

    const pdfSignature = String.fromCharCode(...signature);

    if (pdfSignature !== "%PDF-") {
      return fail("Isi dokumen bukan PDF yang valid.", 400);
    }

    // Pastikan unit tersedia di database.
    const { data: unit, error: unitError } = await supabaseAdmin
      .from("unit")
      .select("id, kode_unit")
      .eq("kode_unit", unitCode)
      .maybeSingle();

    if (unitError) {
      console.error("Gagal memeriksa unit:", unitError.message);
      return fail("Gagal memeriksa unit kerja.", 500);
    }

    if (!unit) {
      return fail(
        `Unit ${unitCode} tidak ditemukan. Periksa kode_unit pada tabel public.unit.`,
        404,
      );
    }

    if (!canAccessSerahTerimaUnit(auth, unit.id)) {
      return fail("Anda tidak memiliki akses ke unit tersebut.", 403);
    }

    // Simpan nama dokumen sumber untuk metadata.
    // Halaman dapat mengirim nama foto sumber melalui namaFileAsli.
    const originalNameInput = String(
      formData.get("namaFileAsli") ?? file.name ?? "",
    );

    const safeOriginalName = sanitizeOriginalName(originalNameInput);

    // File tersimpan selalu menggunakan nama unik berakhiran .pdf.
    const uploadedFileName = `${crypto.randomUUID()}.pdf`;
    uploadedPath = `${unit.id}/${uploadedFileName}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Validasi ulang ukuran buffer yang benar-benar akan diunggah.
    if (fileBuffer.length === 0 || fileBuffer.length > MAX_PDF_SIZE) {
      return fail("Ukuran PDF tidak valid atau melebihi batas 500 KB.", 413);
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(uploadedPath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload dokumen serah terima gagal:", uploadError.message);

      uploadedPath = null;

      return fail("Dokumen gagal diunggah ke penyimpanan.", 500);
    }

    // Panggilan RPC menggunakan identitas Admin yang sudah
    // diverifikasi oleh requireSerahTerimaAuth().
    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      "create_serah_terima_agunan_lunas",
      {
        p_user_id: auth.userId,
        p_kode_unit: unitCode,
        p_nama_debitur: namaDebitur,
        p_nomor_rekening_pinjaman: nomorRekening,
        p_tanggal_penyerahan: tanggal,
        p_dokumen_path: uploadedPath,
        p_nama_file_asli: safeOriginalName,
        p_tipe_file_asli: "application/pdf",
        p_ukuran_file_bytes: fileBuffer.length,
      },
    );

    if (rpcError) {
      console.error("Pembuatan BAST gagal:", rpcError);

      const { error: removeError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([uploadedPath]);

      if (removeError) {
        console.error(
          "Pembersihan file setelah RPC gagal:",
          removeError.message,
        );
      }

      uploadedPath = null;

      return fail(rpcError.message || "Data serah terima gagal disimpan.", 400);
    }

    // Upload dan penyimpanan database berhasil.
    uploadedPath = null;

    return NextResponse.json(
      {
        success: true,
        message: "Data serah terima berhasil ditambahkan.",
        data: result,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("POST serah terima gagal:", error);

    if (uploadedPath) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([uploadedPath]);

      if (removeError) {
        console.error(
          "Gagal membersihkan file setelah error:",
          removeError.message,
        );
      }
    }

    return fail("Terjadi kesalahan saat menyimpan data.", 500);
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  try {
    const params = request.nextUrl.searchParams;

    const requestedUnitId = params.get("unitId")?.trim() || "";
    const requestedUnitCode = params.get("unitCode")?.trim() || "";

    const search = (params.get("q") ?? "")
      .trim()
      .replace(/[,%()"]/g, "")
      .slice(0, 100);

    const rawPage = Number(params.get("page") ?? 1);
    const rawLimit = Number(params.get("limit") ?? 20);

    const page =
      Number.isSafeInteger(rawPage) && rawPage > 0
        ? Math.min(rawPage, 100000)
        : 1;

    const limit =
      Number.isSafeInteger(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, 100)
        : 20;

    const resolution = await resolveUnitId(requestedUnitId, requestedUnitCode);

    if (!resolution.ok) {
      return fail(resolution.message, resolution.status);
    }

    const resolvedUnitId = resolution.unitId;

    if (resolvedUnitId) {
      if (!canAccessSerahTerimaUnit(auth, resolvedUnitId)) {
        return fail("Anda tidak memiliki akses ke unit tersebut.", 403);
      }
    } else if (auth.role !== "ADMIN" && auth.unitIds.length === 0) {
      return fail("Akun belum memiliki unit kerja yang diizinkan.", 403);
    }

    let query = supabaseAdmin
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
          "nama_file_asli",
          "tipe_file_asli",
          "ukuran_file_bytes",
          "created_at",
          "updated_at",
        ].join(","),
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (resolvedUnitId) {
      query = query.eq("unit_id", resolvedUnitId);
    } else if (auth.role !== "ADMIN") {
      query = query.in("unit_id", auth.unitIds);
    }

    if (search) {
      query = query.or(
        [
          `nama_debitur.ilike.%${search}%`,
          `nomor_rekening_pinjaman.ilike.%${search}%`,
        ].join(","),
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Gagal mengambil daftar serah terima:", error.message);

      return fail("Data serah terima gagal dimuat.", 500);
    }

    const total = count ?? 0;

    return NextResponse.json(
      {
        success: true,
        role: auth.role,
        data: data ?? [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Kesalahan API daftar serah terima:", error);

    return fail("Terjadi kesalahan saat mengambil data.", 500);
  }
}
