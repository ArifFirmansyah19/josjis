import { supabase } from "@/lib/supabase";

export async function getNotarisData() {
  const { data, error } = await supabase
    .from("notaris")
    .select(
      `
      id,
      nama_notaris,
      provinsi,
      kabupaten,
      nomor_rekening,
      jenis_rekanan,
      created_at,
      updated_at
    `,
    )
    .order("nama_notaris", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createNotaris({
  namaNotaris,
  provinsi,
  kabupaten,
  nomorRekening,
  jenisRekanan,
}) {
  const { data, error } = await supabase
    .from("notaris")
    .insert({
      nama_notaris: namaNotaris.trim(),
      provinsi: provinsi.trim(),
      kabupaten: kabupaten.trim(),
      nomor_rekening: nomorRekening?.trim() || null,
      jenis_rekanan: Boolean(jenisRekanan),
    })
    .select(
      `
      id,
      nama_notaris,
      provinsi,
      kabupaten,
      nomor_rekening,
      jenis_rekanan,
      created_at,
      updated_at
    `,
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateNotaris({
  id,
  namaNotaris,
  provinsi,
  kabupaten,
  nomorRekening,
  jenisRekanan,
}) {
  const { data, error } = await supabase
    .from("notaris")
    .update({
      nama_notaris: namaNotaris.trim(),
      provinsi: provinsi.trim(),
      kabupaten: kabupaten.trim(),
      nomor_rekening: nomorRekening?.trim() || null,
      jenis_rekanan: Boolean(jenisRekanan),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      `
      id,
      nama_notaris,
      provinsi,
      kabupaten,
      nomor_rekening,
      jenis_rekanan,
      created_at,
      updated_at
    `,
    )
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
