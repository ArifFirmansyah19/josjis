import { supabase } from "@/lib/supabase";

/**
 * Ambil UUID unit berdasarkan kode JKK1 / JKK2
 */
export async function getUnitIdByCode(kodeUnit) {
  const { data, error } = await supabase
    .from("unit")
    .select("id, nama_unit, kode_unit, kode_legacy")
    .eq("kode_unit", kodeUnit)
    .single();

  if (error) throw error;

  return data;
}

/**
 * Ambil daftar surat berdasarkan unit + tahun
 */
export async function getSuratKeluarData(kodeUnit, tahun) {
  const unit = await getUnitIdByCode(kodeUnit);

  const { data, error } = await supabase
    .from("surat_keluar")
    .select(
      `
      id,
      unit_id,
      tahun,
      nomor_urut,
      tanggal,
      hari,
      keterangan,
      tujuan,
      sumber,
      sumber_id,
      created_at,
      updated_at
    `,
    )
    .eq("unit_id", unit.id)
    .eq("tahun", tahun)
    .order("nomor_urut", { ascending: true });

  if (error) throw error;

  return data || [];
}

/**
 * Ambil counter unit + tahun.
 *
 * Jika belum ada, otomatis dibuat dengan:
 * nomor awal     = 1
 * nomor terakhir = 0
 */
export async function getSuratKeluarCounter(kodeUnit, tahun) {
  const unit = await getUnitIdByCode(kodeUnit);

  const { data, error } = await supabase
    .from("surat_keluar_counter")
    .select(
      `
      id,
      unit_id,
      tahun,
      nomor_awal,
      nomor_terakhir,
      created_at,
      updated_at
    `,
    )
    .eq("unit_id", unit.id)
    .eq("tahun", tahun)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return data;
  }

  const { data: created, error: createError } = await supabase
    .from("surat_keluar_counter")
    .insert({
      unit_id: unit.id,
      tahun,
      nomor_awal: 1,
      nomor_terakhir: 0,
    })
    .select(
      `
      id,
      unit_id,
      tahun,
      nomor_awal,
      nomor_terakhir,
      created_at,
      updated_at
    `,
    )
    .single();

  if (createError) throw createError;

  return created;
}

/**
 * Ubah nomor berikutnya melalui UI.
 *
 * Contoh:
 * nomor berikutnya = 128
 *
 * Maka:
 * nomor_awal     = 128
 * nomor_terakhir = 127
 *
 * Jika sudah pernah mencapai nomor tertentu,
 * sistem tidak boleh mundur.
 */
export async function setSuratKeluarNextNumber(
  kodeUnit,
  tahun,
  nomorBerikutnya,
) {
  const unit = await getUnitIdByCode(kodeUnit);

  const nomor = Number(nomorBerikutnya);

  if (!Number.isInteger(nomor) || nomor < 1) {
    throw new Error("Nomor berikutnya harus berupa angka minimal 1.");
  }

  const counter = await getSuratKeluarCounter(kodeUnit, tahun);

  const nomorTerakhir = Number(counter.nomor_terakhir || 0);

  if (nomor <= nomorTerakhir) {
    throw new Error(
      `Nomor tidak boleh lebih kecil atau sama dengan nomor terakhir yang sudah digunakan (${String(
        nomorTerakhir,
      ).padStart(3, "0")}).`,
    );
  }

  const { data, error } = await supabase
    .from("surat_keluar_counter")
    .update({
      nomor_awal: nomor,
      nomor_terakhir: nomor - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", counter.id)
    .select(
      `
      id,
      unit_id,
      tahun,
      nomor_awal,
      nomor_terakhir,
      created_at,
      updated_at
    `,
    )
    .single();

  if (error) throw error;

  return data;
}

/**
 * Ambil nomor berikutnya secara atomic
 * melalui PostgreSQL function.
 */
export async function getNextSuratKeluarNumber(kodeUnit, tahun) {
  const unit = await getUnitIdByCode(kodeUnit);

  const { data, error } = await supabase.rpc("get_next_surat_keluar_number", {
    p_unit_id: unit.id,
    p_tahun: tahun,
  });

  if (error) throw error;

  return Number(data);
}

/**
 * Tambah surat keluar.
 */
export async function createSuratKeluar({
  kodeUnit,
  tanggal,
  keterangan,
  tujuan,
  sumber = "MANUAL",
  sumberId = null,
}) {
  const unit = await getUnitIdByCode(kodeUnit);

  const date = new Date(`${tanggal}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal surat tidak valid.");
  }

  const tahun = date.getFullYear();

  const hariList = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];

  const hari = hariList[date.getDay()];

  const nomorUrut = await getNextSuratKeluarNumber(kodeUnit, tahun);

  const { data, error } = await supabase
    .from("surat_keluar")
    .insert({
      unit_id: unit.id,
      tahun,
      nomor_urut: nomorUrut,
      tanggal,
      hari,
      keterangan,
      tujuan,
      sumber,
      sumber_id: sumberId,
    })
    .select(
      `
      id,
      unit_id,
      tahun,
      nomor_urut,
      tanggal,
      hari,
      keterangan,
      tujuan,
      sumber,
      sumber_id,
      created_at,
      updated_at
    `,
    )
    .single();

  if (error) throw error;

  return data;
}

/**
 * Edit surat.
 *
 * Nomor surat TIDAK disentuh.
 */
export async function updateSuratKeluar({ id, tanggal, keterangan, tujuan }) {
  const date = new Date(`${tanggal}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal surat tidak valid.");
  }

  const hariList = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];

  const hari = hariList[date.getDay()];
  const tahun = date.getFullYear();

  const { data: existing, error: existingError } = await supabase
    .from("surat_keluar")
    .select("id, tahun, nomor_urut, unit_id")
    .eq("id", id)
    .single();

  if (existingError) throw existingError;

  /*
   * Kalau tanggal diedit sampai pindah tahun,
   * kita cegah dulu karena nomor register sudah
   * melekat pada tahun asal.
   */
  if (existing.tahun !== tahun) {
    throw new Error(
      "Tanggal tidak boleh dipindahkan ke tahun berbeda karena nomor surat sudah terdaftar pada tahun asal.",
    );
  }

  const { data, error } = await supabase
    .from("surat_keluar")
    .update({
      tanggal,
      hari,
      keterangan,
      tujuan,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      `
      id,
      unit_id,
      tahun,
      nomor_urut,
      tanggal,
      hari,
      keterangan,
      tujuan,
      sumber,
      sumber_id,
      created_at,
      updated_at
    `,
    )
    .single();

  if (error) throw error;

  return data;
}

/**
 * Hapus surat.
 *
 * Counter TIDAK dikurangi.
 */
export async function deleteSuratKeluar(id) {
  const { error } = await supabase.from("surat_keluar").delete().eq("id", id);

  if (error) throw error;
}
