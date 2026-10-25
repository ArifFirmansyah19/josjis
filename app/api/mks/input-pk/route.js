import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = [
  "cif",
  "nama_debitur",
  "nomor_aplikasi",
  "nomor_pk",
  "nomor_bast",
  "status_debitur",
  "penyebutan_debitur",
  "nomor_ktp",
  "tempat_lahir",
  "profesi",
  "alamat_jalan",
  "alamat_desa_kelurahan",
  "alamat_kecamatan",
  "alamat_kabupaten",
  "nomor_handphone",
  "rekening_tabungan",
  "rekening_kredit",
  "tujuan_kredit",
  "pt_asuransi_jiwa",
  "rekening_asuransi_jiwa",
  "jenis_pengajuan_kredit",
  "klasifikasi_debitur",
  "addendum_ke",
  "pt_asuransi_kendaraan",
  "nomor_rekening_blokiran",
  "jenis_kelamin",
  "rt",
  "rw",
  "nama_pasangan",
  "nik_pasangan",
  "nomor_handphone_pasangan",
  "alamat_pasangan_jalan",
  "alamat_pasangan_rt",
  "alamat_pasangan_rw",
  "alamat_pasangan_desa_kelurahan",
  "alamat_pasangan_kecamatan",
  "alamat_pasangan_kabupaten",
  "rekening_notaris",
];

const DATE_FIELDS = [
  "tanggal_expired_ktp",
  "tanggal_lahir",
  "tanggal_aplikasi",
  "tanggal_pk",
  "tanggal_acuan_angsuran",
  "tanggal_pk_add_pk_sebelumnya",
];

const NUMBER_FIELDS = [
  "limit_kredit",
  "bunga_per_bulan",
  "bunga_per_tahun",
  "jangka_waktu",
  "angsuran_kredit",
  "biaya_provisi",
  "biaya_admin",
  "biaya_provisi_rupiah",
  "materai",
  "premi_asuransi_jiwa",
  "nilai_agunan_bangunan",
  "biaya_premi_kebakaran",
  "biaya_notaris",
  "nilai_pengikatan",
  "total_biaya",
  "limit_kredit_sebelumnya",
  "nominal_pelunasan_pinjaman_exist",
  "biaya_blokir_bpkb",
];

const CHILD_DATE_FIELDS = new Set([
  "tanggal_expired_ktp",
  "tanggal_terbit_sertifikat",
  "tanggal_pengikatan",
  "tanggal_ht_lama",
  "tanggal_order",
]);

const CHILD_NUMBER_FIELDS = new Set([
  "nilai_agunan",
  "luas_tanah",
  "nilai_pengikatan",
  "premi",
]);

const CHILD_INTEGER_FIELDS = new Set(["urutan", "tahun_kendaraan"]);

function cleanText(value) {
  if (value === undefined || value === null) return null;

  const result = String(value).trim();
  return result || null;
}

function cleanNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const result = Number(value);

  if (!Number.isFinite(result) || result < 0) {
    return NaN;
  }

  return result;
}

function validDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const result = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    return NaN;
  }

  const date = new Date(`${result}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== result
  ) {
    return NaN;
  }

  return result;
}

function fail(message, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function normalizeTextFields(source, fields) {
  const result = {};

  for (const field of fields) {
    if (Object.hasOwn(source, field)) {
      result[field] = cleanText(source[field]);
    }
  }

  return result;
}

function normalizeChild(
  source,
  { text = [], dates = [], numbers = [], integers = [], booleans = [] } = {},
) {
  const result = normalizeTextFields(source, text);

  for (const field of dates) {
    if (!Object.hasOwn(source, field)) continue;

    const value = validDate(source[field]);

    if (Number.isNaN(value)) {
      throw new Error(`Format tanggal ${field} tidak valid.`);
    }

    result[field] = value;
  }

  for (const field of numbers) {
    if (!Object.hasOwn(source, field)) continue;

    const value = cleanNumber(source[field]);

    if (Number.isNaN(value)) {
      throw new Error(`Nilai ${field} harus berupa angka nol atau lebih.`);
    }

    result[field] = value;
  }

  for (const field of integers) {
    if (!Object.hasOwn(source, field)) continue;

    const value = cleanNumber(source[field]);

    if (Number.isNaN(value) || (value !== null && !Number.isInteger(value))) {
      throw new Error(
        `Nilai ${field} harus berupa bilangan bulat nol atau lebih.`,
      );
    }

    result[field] = value;
  }

  for (const field of booleans) {
    if (!Object.hasOwn(source, field)) continue;

    if (typeof source[field] !== "boolean") {
      throw new Error(`Nilai ${field} harus berupa true atau false.`);
    }

    result[field] = source[field];
  }

  return result;
}

function normalizeMainRecord(body, pengguna, mks) {
  const record = {
    unit_id: pengguna.unit_id,
    mks_id: mks.id,
    nama_debitur: cleanText(body.nama_debitur),
    status_pk: "AKTIF",
  };

  for (const field of TEXT_FIELDS) {
    if (field === "nama_debitur") continue;
    if (Object.hasOwn(body, field)) {
      record[field] = cleanText(body[field]);
    }
  }

  for (const field of DATE_FIELDS) {
    if (!Object.hasOwn(body, field)) continue;

    const value = validDate(body[field]);

    if (Number.isNaN(value)) {
      throw new Error(`Format tanggal ${field} tidak valid.`);
    }

    record[field] = value;
  }

  for (const field of NUMBER_FIELDS) {
    if (!Object.hasOwn(body, field)) continue;

    const value = cleanNumber(body[field]);

    if (Number.isNaN(value)) {
      throw new Error(`Nilai ${field} harus berupa angka nol atau lebih.`);
    }

    record[field] = value;
  }

  if (Object.hasOwn(body, "alamat_pasangan_sama_debitur")) {
    if (typeof body.alamat_pasangan_sama_debitur !== "boolean") {
      throw new Error(
        "alamat_pasangan_sama_debitur harus berupa true atau false.",
      );
    }

    record.alamat_pasangan_sama_debitur = body.alamat_pasangan_sama_debitur;
  }

  const jenisKredit = cleanText(body.jenis_pengajuan_kredit)?.toUpperCase();

  if (jenisKredit === "KUR") {
    record.jenis_pengajuan_kredit = "KUR";
    record.bunga_per_tahun = 6;
    record.bunga_per_bulan = 0.5;
  } else if (jenisKredit === "KUM") {
    record.jenis_pengajuan_kredit = "KUM";

    if (
      record.bunga_per_tahun !== undefined &&
      record.bunga_per_tahun !== null
    ) {
      record.bunga_per_bulan = record.bunga_per_tahun / 12;
    }
  } else if (jenisKredit) {
    throw new Error("Jenis pengajuan kredit harus KUR atau KUM.");
  }

  return record;
}

function normalizeSpouse(body, pkId) {
  const name = cleanText(body.nama_pasangan);

  if (!name) return null;

  const sameAddress = body.alamat_pasangan_sama_debitur === true;

  return {
    pk_id: pkId,
    hubungan: "PASANGAN",
    penyebutan: cleanText(body.penyebutan_pasangan),
    nama: name,
    nomor_ktp: cleanText(body.nik_pasangan),
    tanggal_expired_ktp: validDate(body.tanggal_expired_ktp_pasangan) || null,
    profesi: cleanText(body.profesi_pasangan),
    alamat_jalan: sameAddress
      ? cleanText(body.alamat_jalan)
      : cleanText(body.alamat_pasangan_jalan),
    alamat_desa_kelurahan: sameAddress
      ? cleanText(body.alamat_desa_kelurahan)
      : cleanText(body.alamat_pasangan_desa_kelurahan),
    alamat_kecamatan: sameAddress
      ? cleanText(body.alamat_kecamatan)
      : cleanText(body.alamat_pasangan_kecamatan),
    alamat_kabupaten: sameAddress
      ? cleanText(body.alamat_kabupaten)
      : cleanText(body.alamat_pasangan_kabupaten),
  };
}

function normalizeRelatedParties(body, pkId) {
  const input = body.pihak_terkait ?? body.related_parties ?? [];

  if (!Array.isArray(input)) {
    throw new Error("pihak_terkait harus berupa array.");
  }

  return input
    .filter((item) => item && cleanText(item.nama))
    .map((item) => {
      const sameAddress = item.alamat_sama_debitur === true;

      const row = normalizeChild(item, {
        text: [
          "nama",
          "nik",
          "hubungan",
          "alamat_jalan",
          "alamat_rt",
          "alamat_rw",
          "alamat_desa_kelurahan",
          "alamat_kecamatan",
          "alamat_kabupaten",
          "phone",
          "cif",
          "savings_account_number",
        ],
        booleans: ["has_account", "alamat_sama_debitur"],
      });

      if (sameAddress) {
        row.alamat_jalan = cleanText(body.alamat_jalan);
        row.alamat_rt = cleanText(body.rt);
        row.alamat_rw = cleanText(body.rw);
        row.alamat_desa_kelurahan = cleanText(body.alamat_desa_kelurahan);
        row.alamat_kecamatan = cleanText(body.alamat_kecamatan);
        row.alamat_kabupaten = cleanText(body.alamat_kabupaten);
      }

      // Alias lama dipertahankan untuk kompatibilitas data.
      row.street = row.alamat_jalan ?? null;
      row.rt = row.alamat_rt ?? null;
      row.rw = row.alamat_rw ?? null;
      row.village = row.alamat_desa_kelurahan ?? null;
      row.district = row.alamat_kecamatan ?? null;
      row.regency = row.alamat_kabupaten ?? null;
      row.pk_id = pkId;

      return row;
    });
}

function normalizeCollateral(body, pkId) {
  const input = body.agunan ?? body.collaterals ?? [];

  if (!Array.isArray(input)) {
    throw new Error("agunan harus berupa array.");
  }

  return input
    .filter((item) => item && cleanText(item.jenis_agunan))
    .map((item, index) => {
      const row = normalizeChild(item, {
        text: [
          "jenis_agunan",
          "nama_pemilik",
          "nomor_ktp_pemilik",
          "alamat_pemilik",
          "hubungan_dengan_debitur",
          "nomor_sertifikat",
          "alamat_agunan",
          "desa_kelurahan",
          "kecamatan",
          "kabupaten",
          "objek_agunan",
          "status_pengikatan",
          "jenis_pengikatan",
          "nomor_pengikatan",
          "status_ht_lama",
          "nomor_ht_lama",
          "nomor_bpkb",
          "nomor_polisi",
          "nomor_rangka",
          "nomor_mesin",
          "merk_kendaraan",
          "tipe_kendaraan",
          "lokasi_fisik",
          "lokasi_keterangan",
          "status_order",
          "status_migrasi",
          "status_dokumen",
          "status_agunan",
          "peran_agunan",
        ],
        dates: [
          "tanggal_expired_ktp_pemilik",
          "tanggal_terbit_sertifikat",
          "tanggal_pengikatan",
          "tanggal_ht_lama",
        ],
        numbers: ["nilai_agunan", "luas_tanah", "nilai_pengikatan"],
        integers: ["tahun_kendaraan"],
        booleans: ["pernah_agunan_pinjaman_lama"],
      });

      row.pk_id = pkId;
      row.urutan =
        Number.isInteger(item.urutan) && item.urutan > 0
          ? item.urutan
          : index + 1;

      // Kolom wajib dengan default eksplisit.
      row.status_pengikatan ??= "TIDAK_DIIKAT";
      row.pernah_agunan_pinjaman_lama ??= false;
      row.lokasi_fisik ??= "CABANG";
      row.status_order ??= "BELUM_ORDER";
      row.status_migrasi ??= "BELUM_MIGRASI";
      row.status_dokumen ??= "BELUM_LENGKAP";
      row.status_agunan ??= "PROSES";

      return row;
    });
}

function normalizeInsurance(body, pkId) {
  const input = body.asuransi ?? body.insurances;

  if (input !== undefined && !Array.isArray(input)) {
    throw new Error("asuransi harus berupa array.");
  }

  if (Array.isArray(input)) {
    return input
      .filter((item) => item && cleanText(item.jenis_asuransi))
      .map((item) => {
        const row = normalizeChild(item, {
          text: [
            "jenis_asuransi",
            "provider",
            "nomor_polis",
            "payment_status",
            "order_status",
          ],
          dates: ["tanggal_order"],
          numbers: ["premi"],
        });

        row.pk_id = pkId;
        row.order_status ??= "BELUM";
        return row;
      });
  }

  // Kompatibilitas untuk formulir lama yang masih mengirim
  // ringkasan asuransi sebagai field biasa.
  const rows = [];

  if (
    cleanText(body.pt_asuransi_jiwa) ||
    body.premi_asuransi_jiwa !== undefined
  ) {
    rows.push({
      pk_id: pkId,
      jenis_asuransi: "JIWA",
      provider: cleanText(body.pt_asuransi_jiwa),
      premi: cleanNumber(body.premi_asuransi_jiwa),
      order_status: "BELUM",
    });
  }

  if (cleanText(body.pt_asuransi_kendaraan)) {
    rows.push({
      pk_id: pkId,
      jenis_asuransi: "KENDARAAN",
      provider: cleanText(body.pt_asuransi_kendaraan),
      order_status: "BELUM",
    });
  }

  if (
    body.biaya_premi_kebakaran !== undefined &&
    body.biaya_premi_kebakaran !== ""
  ) {
    rows.push({
      pk_id: pkId,
      jenis_asuransi: "KEBAKARAN",
      premi: cleanNumber(body.biaya_premi_kebakaran),
      order_status: "BELUM",
    });
  }

  return rows;
}

async function removeCreatedData(pkId) {
  // Kompensasi bila salah satu insert tabel anak gagal.
  // Operasi ini bukan pengganti transaksi PostgreSQL.
  for (const table of [
    "pk_asuransi",
    "pk_agunan",
    "pk_related_party",
    "pk_pasangan",
  ]) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("pk_id", pkId);

    if (error) {
      console.error(`Rollback ${table} gagal:`, error);
    }
  }

  const { error } = await supabaseAdmin.from("pk").delete().eq("id", pkId);

  if (error) {
    console.error("Rollback pk gagal:", error);
  }
}

export async function POST(request) {
  let createdPkId = null;

  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return fail("Konfigurasi Supabase belum lengkap.", 500);
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return fail("Sesi login tidak valid. Silakan login kembali.", 401);
    }

    const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

    if (!sessionToken || !(await hasValidAppSession(user.id, sessionToken))) {
      return fail("Sesi aplikasi tidak valid. Silakan login kembali.", 401);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, role, status, wajib_ganti_password")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.status !== "AKTIF" ||
      profile.role !== "MKS"
    ) {
      return fail("Akses Input PK hanya tersedia untuk akun MKS aktif.", 403);
    }

    if (profile.wajib_ganti_password) {
      return fail("Ganti password terlebih dahulu.", 403);
    }

    const { data: pengguna, error: penggunaError } = await supabaseAdmin
      .from("pengguna")
      .select("id, pegawai_id, role, unit_id, aktif")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (
      penggunaError ||
      !pengguna ||
      pengguna.aktif !== true ||
      pengguna.role !== "MKS" ||
      !pengguna.unit_id ||
      !pengguna.pegawai_id
    ) {
      return fail("Penugasan MKS tidak valid.", 403);
    }

    const { data: penugasan, error: penugasanError } = await supabaseAdmin
      .from("pengguna_unit")
      .select("unit_id")
      .eq("pengguna_id", pengguna.id);

    if (
      penugasanError ||
      !penugasan ||
      penugasan.length !== 1 ||
      penugasan[0].unit_id !== pengguna.unit_id
    ) {
      return fail("Penugasan unit tidak valid.", 403);
    }

    const { data: pegawai, error: pegawaiError } = await supabaseAdmin
      .from("pegawai")
      .select("id, unit_id, aktif")
      .eq("id", pengguna.pegawai_id)
      .maybeSingle();

    if (
      pegawaiError ||
      !pegawai ||
      pegawai.aktif !== true ||
      pegawai.unit_id !== pengguna.unit_id
    ) {
      return fail("Data pegawai MKS tidak valid.", 403);
    }

    const { data: mks, error: mksError } = await supabaseAdmin
      .from("mks")
      .select("id")
      .eq("pegawai_id", pegawai.id)
      .maybeSingle();

    if (mksError || !mks) {
      return fail("Data penugasan MKS tidak ditemukan.", 403);
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return fail("Format JSON permintaan tidak valid.");
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fail("Data yang dikirim harus berupa objek.");
    }

    let record;
    let spouse;
    let relatedParties;
    let collaterals;
    let insurances;

    try {
      record = normalizeMainRecord(body, pengguna, mks);

      if (!record.nama_debitur) {
        return fail("Nama debitur wajib diisi.");
      }

      spouse = normalizeSpouse(body, null);
      relatedParties = normalizeRelatedParties(body, null);
      collaterals = normalizeCollateral(body, null);
      insurances = normalizeInsurance(body, null);
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Data permintaan tidak valid.",
      );
    }

    const { data: created, error: insertError } = await supabaseAdmin
      .from("pk")
      .insert(record)
      .select("id, status_pk")
      .single();

    if (insertError) {
      console.error("Input PK insert error:", insertError);
      return fail("Database gagal menyimpan data PK. Periksa log server.", 500);
    }

    createdPkId = created.id;

    const insertChild = async (table, rows) => {
      if (!rows?.length) return;

      const payload = rows.map((row) => ({
        ...row,
        pk_id: createdPkId,
      }));

      const { error } = await supabaseAdmin.from(table).insert(payload);

      if (error) {
        console.error(`Insert ${table} gagal:`, error);
        throw new Error(`Gagal menyimpan data ${table}.`);
      }
    };

    try {
      if (spouse) {
        await insertChild("pk_pasangan", [spouse]);
      }

      await insertChild("pk_related_party", relatedParties);
      await insertChild("pk_agunan", collaterals);
      await insertChild("pk_asuransi", insurances);
    } catch (error) {
      await removeCreatedData(createdPkId);
      createdPkId = null;

      return fail(
        error instanceof Error ? error.message : "Gagal menyimpan rincian PK.",
        500,
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: created.id,
        status: created.status_pk,
        message: "Data PK berhasil disimpan.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Input PK API error:", error);

    if (createdPkId) {
      await removeCreatedData(createdPkId);
    }

    return fail("Terjadi kesalahan server saat menyimpan data PK.", 500);
  }
}
