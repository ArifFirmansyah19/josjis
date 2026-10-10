export async function fetchNotaries({ supabase }) {
  const result = await supabase
    .from("notaris")
    .select(
      "id, nama_notaris, provinsi, kabupaten, nomor_rekening, jenis_rekanan",
    )
    .order("nama_notaris", {
      ascending: true,
    });

  if (result.error) {
    throw result.error;
  }

  return result.data || [];
}
