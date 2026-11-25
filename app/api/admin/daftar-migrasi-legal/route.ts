import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireActiveAdmin } from "@/lib/migrasi-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = [
  "BELUM_LENGKAP",
  "PENDING_NOTARIS",
  "PENGORDERAN_MIGRASI_ULANG",
  "SELESAI",
];

const COLLATERAL_TYPES = ["SHM", "SHM_NIB", "LAINNYA"];
const UNIT_CODES = ["JKK1", "JKK2"];

type AnyRecord = Record<string, any>;

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

function clean(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function nullableText(value: unknown) {
  return clean(value) || null;
}

function upperText(value: unknown) {
  return nullableText(value)?.toLocaleUpperCase("id-ID") || null;
}

function titleText(value: unknown) {
  const text = nullableText(value);

  if (!text) return null;

  return text
    .toLocaleLowerCase("id-ID")
    .replace(
      /(^|[\s-])([\p{L}])/gu,
      (_, separator, letter) => separator + letter.toLocaleUpperCase("id-ID"),
    );
}

function numeric(value: unknown, label: string, integer = false) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    (integer && !Number.isInteger(parsed))
  ) {
    throw new Error(`${label} harus berupa angka yang valid.`);
  }

  return parsed;
}

function dateValue(value: unknown) {
  const text = clean(value);

  if (!text) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error("Format tanggal tidak valid.");
  }

  const date = new Date(`${text}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== text
  ) {
    throw new Error("Tanggal tidak valid.");
  }

  return text;
}

/**
 * Detail agunan utama.
 *
 * PENTING:
 * Untuk PENGORDERAN, detail agunan tetap disimpan di kolom utama.
 * Kolom order_* tidak lagi digunakan untuk menyimpan detail sertifikat.
 */
function collateral(body: AnyRecord) {
  const type = clean(body?.jenis_agunan).toUpperCase();

  if (!COLLATERAL_TYPES.includes(type)) {
    throw new Error("Jenis agunan harus SHM, SHM NIB, atau Lainnya.");
  }

  const other = nullableText(body?.jenis_agunan_lainnya);

  if (type === "LAINNYA" && !other) {
    throw new Error("Jenis agunan lainnya wajib diisi.");
  }

  return {
    jenis_agunan: type,

    jenis_agunan_lainnya: type === "LAINNYA" ? other : null,

    nomor_sertifikat:
      type === "LAINNYA" ? null : nullableText(body?.nomor_sertifikat),

    nama_pemilik: type === "LAINNYA" ? null : upperText(body?.nama_pemilik),

    desa: type === "LAINNYA" ? null : titleText(body?.desa),

    luas_m2: type === "LAINNYA" ? null : numeric(body?.luas_m2, "Luas"),

    tanggal_terbit: type === "LAINNYA" ? null : dateValue(body?.tanggal_terbit),
  };
}

/**
 * Membuat payload data migrasi legal.
 *
 * PENGORDERAN hanya menggunakan:
 * - nama_debitur_order
 * - tanggal_order
 *
 * Nomor rekening menggunakan rekening_pinjaman.
 *
 * Kolom lama order_* sengaja tidak dimasukkan ke payload,
 * sehingga data lama di kolom tersebut tidak tertimpa saat PATCH.
 */
function makePayload(body: AnyRecord) {
  const nama = clean(body?.nama_debitur).toLocaleUpperCase("id-ID");
  const rekening = clean(body?.rekening_pinjaman);
  const jenisPinjaman = clean(body?.jenis_pinjaman).toUpperCase();
  const jenisMigrasi = clean(body?.jenis_migrasi).toUpperCase();
  const status = clean(body?.status_migrasi).toUpperCase();
  const alasan = clean(body?.alasan_belum_migrasi).toUpperCase();

  if (!nama) {
    throw new Error("Nama debitur wajib diisi.");
  }

  if (!rekening) {
    throw new Error("Nomor rekening pinjaman wajib diisi.");
  }

  if (!["KUR", "KUM"].includes(jenisPinjaman)) {
    throw new Error("Jenis pinjaman harus KUR atau KUM.");
  }

  if (!["DMS", "NON_DMS"].includes(jenisMigrasi)) {
    throw new Error("Jenis migrasi harus DMS atau Non-DMS.");
  }

  if (!STATUSES.includes(status)) {
    throw new Error("Status migrasi tidak valid.");
  }

  if (alasan && !["NOTARIS", "PENGORDERAN"].includes(alasan)) {
    throw new Error("Alasan belum migrasi tidak valid.");
  }

  const mainCollateral = collateral(body);

  let notarisId: string | null = null;
  let namaDebiturOrder: string | null = null;
  let tanggalOrder: string | null = null;

  if (alasan === "NOTARIS") {
    notarisId = clean(body?.notaris_id) || null;

    if (!notarisId) {
      throw new Error("Notaris wajib dipilih.");
    }
  }

  if (alasan === "PENGORDERAN") {
    namaDebiturOrder = upperText(body?.nama_debitur_order);
    tanggalOrder = dateValue(body?.tanggal_order);

    if (!namaDebiturOrder || !tanggalOrder) {
      throw new Error(
        "Nama debitur yang diorder dan tanggal order wajib diisi.",
      );
    }
  }

  return {
    nama_debitur: upperText(nama),
    rekening_pinjaman: rekening,
    jenis_pinjaman: jenisPinjaman,

    limit_kredit: numeric(body?.limit_kredit, "Limit kredit"),
    tenor_bulan: numeric(body?.tenor_bulan, "Tenor", true),

    tanggal_migrasi: dateValue(body?.tanggal_migrasi),
    jenis_migrasi: jenisMigrasi,
    nomor_folder: nullableText(body?.nomor_folder),

    ...mainCollateral,

    status_legal: nullableText(body?.status_legal)?.toUpperCase() || null,

    alasan_belum_migrasi: alasan || null,
    notaris_id: alasan === "NOTARIS" ? notarisId : null,

    nama_debitur_order: alasan === "PENGORDERAN" ? namaDebiturOrder : null,

    tanggal_order: alasan === "PENGORDERAN" ? tanggalOrder : null,

    status_migrasi: status,
    catatan: nullableText(body?.catatan),

    mks_penanggung_jawab_id: nullableText(body?.mks_penanggung_jawab_id),
  };
}

async function getUnit(unitCode: string) {
  if (!UNIT_CODES.includes(unitCode)) {
    return {
      data: null,
      error: "Unit tidak valid.",
    };
  }

  const { data, error } = await supabaseAdmin
    .from("unit")
    .select("id,kode_unit")
    .eq("kode_unit", unitCode)
    .maybeSingle();

  if (error || !data) {
    return {
      data: null,
      error: "Unit tidak ditemukan.",
    };
  }

  return { data, error: null };
}

async function validateMksForUnit(mksId: string | null, unitId: string) {
  if (!mksId) {
    throw new Error("MKS penanggung jawab wajib dipilih.");
  }

  const { data: mks, error: mksError } = await supabaseAdmin
    .from("mks")
    .select("id,pegawai_id")
    .eq("id", mksId)
    .maybeSingle();

  if (mksError || !mks?.pegawai_id) {
    throw new Error("MKS yang dipilih tidak ditemukan.");
  }

  const { data: pegawai, error: pegawaiError } = await supabaseAdmin
    .from("pegawai")
    .select("id,aktif,unit_id")
    .eq("id", mks.pegawai_id)
    .eq("aktif", true)
    .eq("unit_id", unitId)
    .maybeSingle();

  if (pegawaiError || !pegawai) {
    throw new Error(
      "MKS tidak aktif atau bukan bagian dari unit yang dipilih.",
    );
  }
}

async function validateNotaris(notarisId: string | null) {
  if (!notarisId) return;

  const { data, error } = await supabaseAdmin
    .from("notaris")
    .select("id")
    .eq("id", notarisId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Notaris yang dipilih tidak ditemukan.");
  }
}

/**
 * GET kandidat SHM yang belum dimasukkan ke daftar migrasi legal.
 *
 * Dipanggil oleh page.jsx dengan:
 * ?unit=JKK1&rekening=...&agunan=1
 *
 * Sumber:
 * pk.rekening_kredit
 * pk_agunan.pk_id
 */
async function getAgunanCandidates(unitId: string, rekening: string) {
  if (!rekening) {
    return {
      success: true,
      agunanBelumMigrasi: [],
    };
  }

  const { data: pkRows, error: pkError } = await supabaseAdmin
    .from("pk")
    .select("id,rekening_kredit,nama_debitur,unit_id")
    .eq("unit_id", unitId)
    .eq("rekening_kredit", rekening);

  if (pkError) {
    throw new Error(`Gagal mencari data PK: ${pkError.message}`);
  }

  if (!pkRows?.length) {
    return {
      success: true,
      agunanBelumMigrasi: [],
    };
  }

  const pkIds = pkRows.map((row: AnyRecord) => row.id);

  const { data: agunanRows, error: agunanError } = await supabaseAdmin
    .from("pk_agunan")
    .select("*")
    .in("pk_id", pkIds);

  if (agunanError) {
    throw new Error(`Gagal mengambil data agunan PK: ${agunanError.message}`);
  }

  const certificates = (agunanRows || []).filter((row: AnyRecord) => {
    const nomor = clean(row.nomor_sertifikat);

    if (!nomor) return false;

    // Jika sumber mempunyai kolom jenis agunan,
    // hanya kandidat SHM yang ditampilkan.
    const jenis = clean(
      row.jenis_agunan ?? row.jenis_sertifikat ?? row.tipe_agunan,
    ).toUpperCase();

    if (jenis && !jenis.includes("SHM")) {
      return false;
    }

    return true;
  });

  if (!certificates.length) {
    return {
      success: true,
      agunanBelumMigrasi: [],
    };
  }

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("daftar_migrasi_legal")
    .select("nomor_sertifikat")
    .eq("unit_id", unitId)
    .not("nomor_sertifikat", "is", null);

  if (existingError) {
    throw new Error(
      `Gagal memeriksa agunan yang sudah terdaftar: ${existingError.message}`,
    );
  }

  const registered = new Set(
    (existingRows || []).map((row: AnyRecord) =>
      clean(row.nomor_sertifikat).toUpperCase(),
    ),
  );

  const pkById = new Map(pkRows.map((row: AnyRecord) => [row.id, row]));

  const result = certificates
    .filter((row: AnyRecord) => {
      const nomor = clean(row.nomor_sertifikat).toUpperCase();
      return nomor && !registered.has(nomor);
    })
    .map((row: AnyRecord) => {
      const pk = pkById.get(row.pk_id) as AnyRecord | undefined;

      return {
        id: row.id,
        pk_id: row.pk_id,

        nama_debitur: clean(pk?.nama_debitur) || "",

        rekening_pinjaman: clean(pk?.rekening_kredit) || rekening,

        jenis_agunan: "SHM",
        jenis_agunan_lainnya: null,

        nomor_sertifikat: clean(row.nomor_sertifikat),

        nama_pemilik: clean(row.nama_pemilik).toLocaleUpperCase("id-ID"),

        desa: titleText(row.desa_kelurahan),

        luas_m2: row.luas_tanah ?? null,

        tanggal_terbit: row.tanggal_terbit_sertifikat ?? null,
      };
    });

  return {
    success: true,
    agunanBelumMigrasi: result,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  try {
    const params = request.nextUrl.searchParams;

    const unitCode = clean(params.get("unit")).toUpperCase();
    const rekening = clean(params.get("rekening"));
    const isAgunanRequest = params.get("agunan") === "1";

    const { data: unit, error: unitError } = await getUnit(unitCode);

    if (unitError || !unit) {
      return fail(unitError || "Unit tidak ditemukan.", 404);
    }

    // Permintaan khusus untuk kandidat agunan.
    if (isAgunanRequest) {
      const candidates = await getAgunanCandidates(unit.id, rekening);

      return NextResponse.json(candidates);
    }

    const [rowsResult, notarisResult, mksResult] = await Promise.all([
      supabaseAdmin
        .from("daftar_migrasi_legal")
        .select("*")
        .eq("unit_id", unit.id)
        .order("updated_at", { ascending: false })
        .limit(1000),

      supabaseAdmin
        .from("notaris")
        .select("id,nama_notaris,kabupaten,provinsi")
        .order("nama_notaris", { ascending: true }),

      supabaseAdmin.from("mks").select("id,pegawai_id"),
    ]);

    if (rowsResult.error) {
      return fail(
        `Gagal memuat daftar migrasi legal: ${rowsResult.error.message}`,
        500,
      );
    }

    if (notarisResult.error) {
      return fail(
        `Gagal memuat master notaris: ${notarisResult.error.message}`,
        500,
      );
    }

    if (mksResult.error) {
      return fail(`Gagal memuat master MKS: ${mksResult.error.message}`, 500);
    }

    const mksRows = mksResult.data || [];

    const pegawaiIds = [
      ...new Set(
        mksRows.map((row: AnyRecord) => row.pegawai_id).filter(Boolean),
      ),
    ];

    let mksList: { id: string; nama: string }[] = [];

    if (pegawaiIds.length) {
      const { data: pegawaiRows, error: pegawaiError } = await supabaseAdmin
        .from("pegawai")
        .select("id,nama")
        .in("id", pegawaiIds)
        .eq("unit_id", unit.id)
        .eq("aktif", true);

      if (pegawaiError) {
        return fail(
          `Gagal memuat master pegawai MKS: ${pegawaiError.message}`,
          500,
        );
      }

      const namaByPegawaiId = new Map(
        (pegawaiRows || []).map((pegawai: AnyRecord) => [
          pegawai.id,
          pegawai.nama,
        ]),
      );

      mksList = mksRows
        .filter((row: AnyRecord) => namaByPegawaiId.has(row.pegawai_id))
        .map((row: AnyRecord) => ({
          id: row.id,
          nama: namaByPegawaiId.get(row.pegawai_id) || "MKS",
        }))
        .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    }

    return NextResponse.json({
      success: true,
      data: rowsResult.data || [],
      notaris: notarisResult.data || [],
      mks: mksList,
    });
  } catch (error: any) {
    return fail(error?.message || "Gagal memuat data migrasi legal.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  try {
    const body = await request.json();

    const unitCode = clean(body?.kode_unit).toUpperCase();

    const { data: unit, error: unitError } = await getUnit(unitCode);

    if (unitError || !unit) {
      return fail(unitError || "Unit tidak ditemukan.", 404);
    }

    const payload = makePayload(body);

    await validateMksForUnit(payload.mks_penanggung_jawab_id, unit.id);

    await validateNotaris(payload.notaris_id);

    // Satu request POST menghasilkan satu baris agunan.
    // Jika satu debitur mempunyai beberapa SHM,
    // page.jsx mengirim POST terpisah untuk setiap SHM.
    const { data, error } = await supabaseAdmin
      .from("daftar_migrasi_legal")
      .insert({
        ...payload,
        unit_id: unit.id,
        kode_unit: unitCode,
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select("id")
      .single();

    if (error) {
      return fail(`Gagal menyimpan data: ${error.message}`, 500);
    }

    return NextResponse.json(
      {
        success: true,
        id: data.id,
        message: "Data migrasi legal berhasil ditambahkan.",
      },
      { status: 201 },
    );
  } catch (error: any) {
    return fail(error?.message || "Data gagal disimpan.", 400);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  try {
    const body = await request.json();

    const id = clean(body?.id);

    if (!id) {
      return fail("ID data tidak ditemukan.");
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("daftar_migrasi_legal")
      .select("id,unit_id,kode_unit")
      .eq("id", id)
      .maybeSingle();

    if (findError || !existing) {
      return fail("Data tidak ditemukan.", 404);
    }

    const payload = makePayload(body);

    await validateMksForUnit(payload.mks_penanggung_jawab_id, existing.unit_id);

    await validateNotaris(payload.notaris_id);

    // PATCH hanya memperbarui baris yang dipilih.
    // Detail agunan utama tetap disimpan dari form edit.
    // Kolom order_* lama tidak disentuh.
    const { error } = await supabaseAdmin
      .from("daftar_migrasi_legal")
      .update({
        ...payload,
        updated_by: auth.userId,
      })
      .eq("id", id)
      .eq("unit_id", existing.unit_id);

    if (error) {
      return fail(`Gagal memperbarui data: ${error.message}`, 500);
    }

    return NextResponse.json({
      success: true,
      message: "Data migrasi legal berhasil diperbarui.",
    });
  } catch (error: any) {
    return fail(error?.message || "Data gagal diperbarui.", 400);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireActiveAdmin();

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  const id = clean(request.nextUrl.searchParams.get("id"));

  if (!id) {
    return fail("ID data tidak ditemukan.");
  }

  const { data: existing, error: findError } = await supabaseAdmin
    .from("daftar_migrasi_legal")
    .select("id,unit_id")
    .eq("id", id)
    .maybeSingle();

  if (findError || !existing) {
    return fail("Data tidak ditemukan.", 404);
  }

  const { error } = await supabaseAdmin
    .from("daftar_migrasi_legal")
    .delete()
    .eq("id", id)
    .eq("unit_id", existing.unit_id);

  if (error) {
    return fail(`Gagal menghapus data: ${error.message}`, 500);
  }

  return NextResponse.json({
    success: true,
    message: "Data migrasi legal berhasil dihapus.",
  });
}
