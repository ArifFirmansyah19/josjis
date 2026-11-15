import { supabase } from "@/lib/supabase";

const NOTARIS_COLUMNS = `
  id,
  nama_notaris,
  nik,
  jabatan,
  provinsi,
  kabupaten,
  nomor_rekening,
  jenis_rekanan,
  created_at,
  updated_at
`;

export async function getNotarisData() {
  const { data, error } = await supabase
    .from("notaris")
    .select(NOTARIS_COLUMNS)
    .order("nama_notaris", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createNotaris({
  namaNotaris,
  nik,
  jabatan,
  provinsi,
  kabupaten,
  nomorRekening,
  jenisRekanan,
}) {
  const { data, error } = await supabase
    .from("notaris")
    .insert({
      nama_notaris: namaNotaris.trim(),
      nik: nik?.trim() || null,
      jabatan: "Notaris/PPAT",
      provinsi: provinsi.trim(),
      kabupaten: kabupaten.trim(),
      nomor_rekening: nomorRekening?.trim() || null,
      jenis_rekanan: Boolean(jenisRekanan),
    })
    .select(NOTARIS_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateNotaris({
  id,
  namaNotaris,
  nik,
  jabatan,
  provinsi,
  kabupaten,
  nomorRekening,
  jenisRekanan,
}) {
  const { data, error } = await supabase
    .from("notaris")
    .update({
      nama_notaris: namaNotaris.trim(),
      nik: nik?.trim() || null,
      jabatan: "Notaris/PPAT",
      provinsi: provinsi.trim(),
      kabupaten: kabupaten.trim(),
      nomor_rekening: nomorRekening?.trim() || null,
      jenis_rekanan: Boolean(jenisRekanan),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(NOTARIS_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteNotaris(id) {
  const { error } = await supabase.from("notaris").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
