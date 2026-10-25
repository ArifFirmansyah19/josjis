import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const UNIT_ID = "0baec32b-1845-45f3-bcc0-d2202b0b5976";

const ACCOUNTS = [
  {
    nip: "2597491876",
    nama: "Aris Setiawan",
    role: "MKS",
    password: "Jkk2-Aris-2026!",
  },
  {
    nip: "1992170728",
    nama: "Fadilah Jismi Yusuf",
    role: "MKS",
    password: "Jkk2-Fadilah-2026!",
  },
  {
    nip: "2397490443",
    nama: "M Andri Saputra",
    role: "MKS",
    password: "Jkk2-Andri-2026!",
  },
  {
    nip: "1693011332",
    nama: "Syeh Maulana Akbar",
    role: "MKS",
    password: "Jkk2-Syeh-2026!",
  },
  {
    nip: "1887688596",
    nama: "Novi Hendri",
    role: "PENGAWAS",
    password: "Jkk2-Novi-2026!",
  },
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan.",
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function checkError(error, context) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

async function getPegawaiData() {
  const nips = ACCOUNTS.map((account) => account.nip);

  const { data: unit, error: unitError } = await supabase
    .from("unit")
    .select("id,nama_unit,kode_unit,status")
    .eq("id", UNIT_ID)
    .maybeSingle();

  checkError(unitError, "Memeriksa unit");

  if (!unit || unit.kode_unit !== "JKK2" || unit.status !== "AKTIF") {
    throw new Error("Unit JKK2 tidak ditemukan atau tidak aktif.");
  }

  const { data: pegawai, error: pegawaiError } = await supabase
    .from("pegawai")
    .select("id,nip,nama,jabatan,aktif,unit_id")
    .in("nip", nips);

  checkError(pegawaiError, "Memeriksa data pegawai");

  const byNip = new Map((pegawai ?? []).map((item) => [item.nip, item]));

  for (const account of ACCOUNTS) {
    const person = byNip.get(account.nip);

    if (!person) {
      throw new Error(
        `Pegawai NIP ${account.nip} tidak ditemukan. Tidak ada akun dibuat.`,
      );
    }

    if (!person.aktif || person.unit_id !== UNIT_ID) {
      throw new Error(
        `Pegawai ${account.nip} tidak aktif atau bukan pegawai JKK2.`,
      );
    }

    if (person.nama.trim().toLowerCase() !== account.nama.toLowerCase()) {
      throw new Error(
        `Nama pegawai untuk NIP ${account.nip} tidak cocok. Periksa data dahulu.`,
      );
    }
  }

  return byNip;
}

async function preflight(pegawaiByNip) {
  const nips = ACCOUNTS.map((account) => account.nip);
  const pegawaiIds = ACCOUNTS.map(
    (account) => pegawaiByNip.get(account.nip).id,
  );

  const [
    { data: profiles, error: profileError },
    { data: users, error: userError },
  ] = await Promise.all([
    supabase.from("user_profiles").select("nip").in("nip", nips),
    supabase
      .from("pengguna")
      .select("id,username,pegawai_id,auth_user_id")
      .or(
        `username.in.(${nips.join(",")}),pegawai_id.in.(${pegawaiIds.join(",")})`,
      ),
  ]);

  checkError(profileError, "Memeriksa profil login");
  checkError(userError, "Memeriksa akun aplikasi");

  if ((profiles ?? []).length > 0 || (users ?? []).length > 0) {
    throw new Error(
      "Ditemukan akun/profil yang sudah ada untuk salah satu pegawai. " +
        "Proses dibatalkan agar tidak membuat duplikat. Periksa tabel user_profiles dan pengguna.",
    );
  }
}

async function createAccounts(pegawaiByNip) {
  const created = [];

  try {
    for (const account of ACCOUNTS) {
      const email = `${account.nip}@login.josjis.local`;
      const person = pegawaiByNip.get(account.nip);

      console.log(`Membuat akun ${account.nama} (${account.role})...`);

      const { data: authResult, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password: account.password,
          email_confirm: true,
        });

      checkError(authError, `Membuat autentikasi ${account.nip}`);

      const authUser = authResult.user;

      if (!authUser?.id) {
        throw new Error(
          `Supabase tidak mengembalikan user ID untuk ${account.nip}.`,
        );
      }

      const record = {
        authUserId: authUser.id,
        penggunaId: null,
        nip: account.nip,
      };

      created.push(record);

      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: authUser.id,
          nip: account.nip,
          email_utama: email,
          role: account.role,
          status: "AKTIF",
          wajib_ganti_password: true,
        });

      checkError(profileError, `Menyimpan profil ${account.nip}`);

      const { data: appUser, error: appUserError } = await supabase
        .from("pengguna")
        .insert({
          auth_user_id: authUser.id,
          pegawai_id: person.id,
          role: account.role,
          unit_id: UNIT_ID,
          username: account.nip,
          aktif: true,
        })
        .select("id")
        .single();

      checkError(appUserError, `Menyimpan pengguna ${account.nip}`);

      record.penggunaId = appUser.id;

      const { error: unitLinkError } = await supabase
        .from("pengguna_unit")
        .insert({
          pengguna_id: appUser.id,
          unit_id: UNIT_ID,
        });

      checkError(unitLinkError, `Menghubungkan unit ${account.nip}`);

      console.log(`  OK: ${account.nama}`);
    }

    console.log("\nSemua akun berhasil dibuat.");
    console.log("Periksa hasilnya sebelum mencoba login.");
    console.log("Kata sandi awal ditampilkan di konfigurasi file ini.");
    console.log("Jangan membagikan file ini atau service role key.");
  } catch (error) {
    console.error("\nPembuatan akun gagal:", error.message);
    console.error("Mencoba membersihkan akun yang dibuat oleh proses ini...");

    for (const record of [...created].reverse()) {
      if (record.penggunaId) {
        const { error } = await supabase
          .from("pengguna_unit")
          .delete()
          .eq("pengguna_id", record.penggunaId);

        if (error)
          console.error("Gagal membersihkan pengguna_unit:", error.message);

        const { error: penggunaError } = await supabase
          .from("pengguna")
          .delete()
          .eq("id", record.penggunaId);

        if (penggunaError) {
          console.error("Gagal membersihkan pengguna:", penggunaError.message);
        }
      }

      const { error: profileDeleteError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("user_id", record.authUserId);

      if (profileDeleteError) {
        console.error(
          "Gagal membersihkan user_profiles:",
          profileDeleteError.message,
        );
      }

      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        record.authUserId,
      );

      if (authDeleteError) {
        console.error("Gagal menghapus user Auth:", authDeleteError.message);
      }
    }

    throw error;
  }
}

async function main() {
  console.log("Memeriksa data pegawai dan unit JKK2...");

  const pegawaiByNip = await getPegawaiData();

  console.log("Memeriksa duplikasi akun...");
  await preflight(pegawaiByNip);

  console.log("Pemeriksaan awal lolos. Memulai pembuatan akun...");
  await createAccounts(pegawaiByNip);
}

main().catch((error) => {
  console.error("\nPROSES BERHENTI:", error.message);
  process.exitCode = 1;
});
