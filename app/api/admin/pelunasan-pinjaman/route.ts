import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  canAccessSerahTerimaUnit,
  requireSerahTerimaAuth,
} from "@/lib/serah-terima-agunan-lunas-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STORAGE_BUCKET = "dokumen-paid-off";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function fail(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
}

function safeFileName(value: string) {
  return (
    value
      .replace(/[\r\n\0]/g, "")
      .replace(/[^\w.\- ()]/g, "_")
      .trim()
      .slice(0, 180) || "bukti-paid-off"
  );
}

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (file.type === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (file.type === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

async function resolveUnit(unitCode: string) {
  if (!/^[A-Z0-9_-]{2,20}$/.test(unitCode)) return null;

  const { data, error } = await supabaseAdmin
    .from("unit")
    .select("id, nama_unit, kode_unit")
    .eq("kode_unit", unitCode)
    .eq("status", "AKTIF")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();
  if (!auth.ok) return fail(auth.error, auth.status);

  try {
    const params = request.nextUrl.searchParams;
    const unitCode = (params.get("unitCode") || "").trim().toUpperCase();
    const status = (params.get("status") || "AKTIF").toUpperCase();
    const keyword = (params.get("q") || "")
      .trim()
      .replace(/[,%()"]/g, "")
      .slice(0, 80);

    if (!["AKTIF", "LUNAS", "SEMUA"].includes(status)) {
      return fail("Filter status tidak valid.");
    }

    const unit = await resolveUnit(unitCode);
    if (!unit) return fail("Unit aktif tidak ditemukan.", 404);
    if (!canAccessSerahTerimaUnit(auth, unit.id)) {
      return fail("Anda tidak memiliki akses ke unit tersebut.", 403);
    }

    let query = supabaseAdmin
      .from("pk")
      .select(
        "id, unit_id, mks_id, cif, nama_debitur, nomor_pk, tanggal_pk, rekening_kredit, rekening_tabungan, limit_kredit, jangka_waktu, jenis_pengajuan_kredit, status_pk, tanggal_acuan_angsuran",
      )
      .eq("unit_id", unit.id)
      .order("nama_debitur", { ascending: true })
      .limit(300);

    if (status !== "SEMUA") query = query.eq("status_pk", status);

    if (keyword) {
      query = query.or(
        [
          `nama_debitur.ilike.%${keyword}%`,
          `rekening_kredit.ilike.%${keyword}%`,
          `cif.ilike.%${keyword}%`,
          `nomor_pk.ilike.%${keyword}%`,
        ].join(","),
      );
    }

    const { data: pkRows, error: pkError } = await query;
    if (pkError) {
      console.error("GET pelunasan PK:", pkError.message);
      return fail("Data pinjaman gagal dimuat.", 500);
    }

    const allActiveResult = await supabaseAdmin
      .from("pk")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", unit.id)
      .eq("status_pk", "AKTIF");

    const allLunasResult = await supabaseAdmin
      .from("pk")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", unit.id)
      .eq("status_pk", "LUNAS");

    if (allActiveResult.error || allLunasResult.error) {
      console.error(
        "Summary pelunasan:",
        allActiveResult.error || allLunasResult.error,
      );
      return fail("Ringkasan pelunasan gagal dimuat.", 500);
    }

    const pkIds = (pkRows || []).map((row) => row.id);
    const mksIds = [
      ...new Set((pkRows || []).map((row) => row.mks_id).filter(Boolean)),
    ];

    let mksNameById = new Map();
    if (mksIds.length) {
      const { data: mksRows, error: mksError } = await supabaseAdmin
        .from("mks")
        .select("id, pegawai_id")
        .in("id", mksIds);

      if (mksError) throw mksError;

      const pegawaiIds = [
        ...new Set(
          (mksRows || []).map((row) => row.pegawai_id).filter(Boolean),
        ),
      ];
      let pegawaiNameById = new Map();

      if (pegawaiIds.length) {
        const { data: pegawaiRows, error: pegawaiError } = await supabaseAdmin
          .from("pegawai")
          .select("id, nama")
          .in("id", pegawaiIds);

        if (pegawaiError) throw pegawaiError;
        pegawaiNameById = new Map(
          (pegawaiRows || []).map((row) => [row.id, row.nama]),
        );
      }

      mksNameById = new Map(
        (mksRows || []).map((row) => [
          row.id,
          pegawaiNameById.get(row.pegawai_id) || "-",
        ]),
      );
    }

    let paidOffByPk = new Map();

    if (pkIds.length) {
      const { data: paidOffRows, error: paidOffError } = await supabaseAdmin
        .from("pk_pelunasan")
        .select(
          "id, pk_id, jenis_paid_off, nominal_pelunasan, tanggal_paid_off, tanggal_bukti_diterima, bds_path, nama_file_asli, tipe_file, ukuran_file_bytes, created_at",
        )
        .in("pk_id", pkIds);

      if (paidOffError) throw paidOffError;

      for (const row of paidOffRows || []) {
        const { data: signed, error: signedError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(row.bds_path, 600);

        if (signedError) {
          console.error("Signed URL BDS:", signedError.message);
        }

        paidOffByPk.set(row.pk_id, {
          ...row,
          bdsUrl: signed?.signedUrl || null,
        });
      }
    }

    const data = (pkRows || []).map((row) => ({
      id: row.id,
      unitId: row.unit_id,
      nama: row.nama_debitur,
      mks: mksNameById.get(row.mks_id) || "-",

      // Rekening pinjaman
      norek: row.rekening_kredit,
      rekening_kredit: row.rekening_kredit,
      rekeningKredit: row.rekening_kredit,

      // Rekening tabungan untuk Advis Pelunasan
      rekening_tabungan: row.rekening_tabungan,
      rekeningTabungan: row.rekening_tabungan,
      nomor_rekening_tabungan: row.rekening_tabungan,

      cif: row.cif,
      noPk: row.nomor_pk,
      tanggalPk: row.tanggal_pk,
      produk: row.jenis_pengajuan_kredit,
      limit: row.limit_kredit,
      tenor: row.jangka_waktu,
      tanggalAcuanAngsuran: row.tanggal_acuan_angsuran,
      status: row.status_pk,
      pelunasan: paidOffByPk.get(row.id) || null,
    }));

    return NextResponse.json(
      {
        success: true,
        unit: { id: unit.id, name: unit.nama_unit, code: unit.kode_unit },
        data,
        summary: {
          totalAktif: allActiveResult.count || 0,
          totalLunas: allLunasResult.count || 0,
        },
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("GET pelunasan gagal:", error);
    return fail("Terjadi kesalahan saat mengambil data pelunasan.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSerahTerimaAuth();
  if (!auth.ok) return fail(auth.error, auth.status);

  if (auth.role !== "ADMIN") {
    return fail("Hanya ADMIN aktif yang dapat memproses Paid Off.", 403);
  }

  let uploadedPath: string | null = null;

  try {
    const formData = await request.formData();
    const pkId = String(formData.get("pkId") || "").trim();
    const jenisPaidOff = String(formData.get("jenisPaidOff") || "")
      .trim()
      .toUpperCase();
    const tanggalPaidOff = String(formData.get("tanggalPaidOff") || "").trim();
    const nominalRaw = String(formData.get("nominalPelunasan") || "").trim();
    const nominalPelunasan = jenisPaidOff === "PELUNASAN" ? nominalRaw : null;
    const file = formData.get("bds");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        pkId,
      )
    ) {
      return fail("ID pinjaman tidak valid.");
    }

    if (!["PELUNASAN", "JATUH_TEMPO_TENOR"].includes(jenisPaidOff)) {
      return fail("Jenis Paid Off tidak valid.");
    }

    if (!validDate(tanggalPaidOff)) {
      return fail("Tanggal Paid Off tidak valid.");
    }

    // Simpan nominal sebagai teks agar koma desimal dan jumlah digit aslinya
    // (tanpa desimal, 1, 2, atau 3 digit) tidak dibulatkan atau dinormalisasi.
    const nominalPattern = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,3})?$/;
    if (
      jenisPaidOff === "PELUNASAN" &&
      !nominalPattern.test(nominalPelunasan || "")
    ) {
      return fail(
        "Nominal pelunasan wajib diisi. Gunakan format angka Indonesia dan maksimal 3 angka di belakang koma.",
      );
    }

    if (!(file instanceof File) || file.size < 1) {
      return fail("Foto BDS wajib diunggah.");
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail("Ukuran foto BDS maksimal 5 MB.", 413);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return fail("Format foto harus JPG, PNG, atau WEBP.");
    }

    if (!(await hasValidImageSignature(file))) {
      return fail("Isi file tidak sesuai dengan format gambar yang dipilih.");
    }

    const { data: pk, error: pkError } = await supabaseAdmin
      .from("pk")
      .select("id, unit_id, status_pk")
      .eq("id", pkId)
      .maybeSingle();

    if (pkError) throw pkError;
    if (!pk) return fail("Data PK tidak ditemukan.", 404);
    if (pk.status_pk !== "AKTIF") {
      return fail("Hanya pinjaman berstatus AKTIF yang dapat diproses.", 409);
    }

    if (!canAccessSerahTerimaUnit(auth, pk.unit_id)) {
      return fail("Anda tidak memiliki akses ke unit pinjaman tersebut.", 403);
    }

    const extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";
    uploadedPath = `${pk.unit_id}/${pk.id}/${crypto.randomUUID()}.${extension}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(uploadedPath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload BDS gagal:", uploadError.message);
      uploadedPath = null;
      return fail("Foto BDS gagal diunggah ke penyimpanan.", 500);
    }

    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      "confirm_pk_pelunasan",
      {
        p_admin_user_id: auth.userId,
        p_pk_id: pk.id,
        p_jenis_paid_off: jenisPaidOff,
        p_nominal_pelunasan: nominalPelunasan,
        p_tanggal_paid_off: tanggalPaidOff,
        p_tanggal_bukti_diterima: jakartaToday(),
        p_bds_path: uploadedPath,
        p_nama_file_asli: safeFileName(file.name),
        p_tipe_file: file.type,
        p_ukuran_file_bytes: fileBuffer.length,
      },
    );

    if (rpcError) {
      console.error("Konfirmasi Paid Off gagal:", rpcError.message);
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
      uploadedPath = null;
      return fail(
        rpcError.message || "Konfirmasi Paid Off gagal disimpan.",
        409,
      );
    }

    uploadedPath = null;
    return NextResponse.json(
      {
        success: true,
        message: "Bukti Paid Off tersimpan dan status PK telah menjadi LUNAS.",
        data: result,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("POST pelunasan gagal:", error);

    if (uploadedPath) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([uploadedPath]);
      if (removeError)
        console.error("Pembersihan file BDS gagal:", removeError.message);
    }

    return fail("Terjadi kesalahan saat memproses Paid Off.", 500);
  }
}
