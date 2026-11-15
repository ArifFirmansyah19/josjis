import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const UNIT_JKK2_ID = "0baec32b-1845-45f3-bcc0-d2202b0b5976";
const PASSWORD_BARU = "qwe123qwe";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum tersedia di .env.local",
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log("Memeriksa akun MKS JKK2...");

  // Ambil akun MKS yang unit utamanya JKK2.
  const { data: akunUtama, error: errorUtama } = await supabase
    .from("pengguna")
    .select("id, auth_user_id, pegawai_id, username, aktif")
    .eq("role", "MKS")
    .eq("unit_id", UNIT_JKK2_ID)
    .eq("aktif", true);

  if (errorUtama) throw errorUtama;

  // Ambil juga akun yang ditugaskan ke JKK2 melalui pengguna_unit.
  const { data: penugasan, error: errorPenugasan } = await supabase
    .from("pengguna_unit")
    .select("pengguna_id")
    .eq("unit_id", UNIT_JKK2_ID);

  if (errorPenugasan) throw errorPenugasan;

  const penggunaIds = [
    ...new Set((penugasan || []).map((item) => item.pengguna_id)),
  ];

  let akunPenugasan = [];

  if (penggunaIds.length > 0) {
    const { data, error } = await supabase
      .from("pengguna")
      .select("id, auth_user_id, pegawai_id, username, aktif")
      .in("id", penggunaIds)
      .eq("role", "MKS")
      .eq("aktif", true);

    if (error) throw error;
    akunPenugasan = data || [];
  }

  // Gabungkan tanpa akun duplikat.
  const semuaAkun = [
    ...new Map(
      [...(akunUtama || []), ...akunPenugasan].map((akun) => [akun.id, akun]),
    ).values(),
  ].filter((akun) => akun.auth_user_id);

  if (semuaAkun.length === 0) {
    throw new Error("Tidak ditemukan akun MKS aktif JKK2.");
  }

  // Pastikan profil akun masih AKTIF dan ber-role MKS.
  const authIds = semuaAkun.map((akun) => akun.auth_user_id);

  const { data: profiles, error: errorProfiles } = await supabase
    .from("user_profiles")
    .select("user_id, role, status")
    .in("user_id", authIds);

  if (errorProfiles) throw errorProfiles;

  const profileAktif = new Set(
    (profiles || [])
      .filter((profile) => profile.role === "MKS" && profile.status === "AKTIF")
      .map((profile) => profile.user_id),
  );

  const targetAkun = semuaAkun.filter((akun) =>
    profileAktif.has(akun.auth_user_id),
  );

  if (targetAkun.length !== semuaAkun.length) {
    throw new Error(
      "Ada akun yang profilnya tidak berstatus AKTIF atau role-nya bukan MKS. Perubahan dibatalkan.",
    );
  }

  // Ambil nama pegawai untuk laporan hasil.
  const pegawaiIds = [
    ...new Set(targetAkun.map((akun) => akun.pegawai_id).filter(Boolean)),
  ];

  const { data: pegawai, error: errorPegawai } = await supabase
    .from("pegawai")
    .select("id, nama")
    .in("id", pegawaiIds);

  if (errorPegawai) throw errorPegawai;

  const namaMap = new Map((pegawai || []).map((item) => [item.id, item.nama]));

  console.log(`Ditemukan ${targetAkun.length} akun MKS aktif JKK2.`);
  console.log("Mulai mengubah password...\n");

  const berhasil = [];
  const gagal = [];

  for (const akun of targetAkun) {
    const { error } = await supabase.auth.admin.updateUserById(
      akun.auth_user_id,
      {
        password: PASSWORD_BARU,
      },
    );

    if (error) {
      gagal.push({
        username: akun.username,
        nama: namaMap.get(akun.pegawai_id) || "-",
        error: error.message,
      });

      console.error(`GAGAL: ${akun.username} - ${error.message}`);
      continue;
    }

    berhasil.push(akun);

    console.log(
      `BERHASIL: ${namaMap.get(akun.pegawai_id) || "-"} (${akun.username})`,
    );
  }

  console.log("\n========== HASIL ==========");
  console.log(`Berhasil: ${berhasil.length}`);
  console.log(`Gagal: ${gagal.length}`);

  if (gagal.length > 0) {
    console.table(gagal);
    process.exitCode = 1;
  } else {
    console.log("Semua password akun MKS JKK2 berhasil diperbarui.");
  }
}

main().catch((error) => {
  console.error("\nPROSES DIBATALKAN:", error.message);
  process.exitCode = 1;
});
