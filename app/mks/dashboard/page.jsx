import { cookies } from "next/headers";

import { redirect } from "next/navigation";

import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabase-admin";

import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";

import RoleDashboardMks from "@/components/RoleDashboardMks";

export const dynamic = "force-dynamic";

function getJakartaMonth() {

  const parts = new Intl.DateTimeFormat("en-CA", {

    timeZone: "Asia/Jakarta",

    year: "numeric",

    month: "2-digit",

  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;

  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;

}

function isValidMonth(value) {

  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

}

function getMonthLabel(value) {

  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("id-ID", {

    month: "long",

    year: "numeric",

    timeZone: "Asia/Jakarta",

  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));

}

function getDebtorKey(row) {

  const cif = String(row.cif ?? "").trim();

  const nik = String(row.nomor_ktp ?? "").trim();

  const nama = String(row.nama_debitur ?? "")

    .trim()

    .replace(/\s+/g, " ")

    .toUpperCase();

  if (cif) return `CIF:${cif}`;

  if (nik) return `NIK:${nik}`;

  if (nama) return `NAMA:${nama}`;

  return null;

}

export default async function MKSDashboardPage({ searchParams }) {

  // 1. Ambil cookie dan konfigurasi Supabase.

  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {

    throw new Error("Konfigurasi Supabase belum lengkap.");

  }

  // File ini JSX, jadi tidak menggunakan tanda ! TypeScript.

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {

    cookies: {

      getAll() {

        return cookieStore.getAll();

      },

      setAll() {

        // Cookie dikelola melalui alur autentikasi aplikasi.

      },

    },

  });

  // 2. Validasi autentikasi Supabase.

  const {

    data: { user },

    error: authError,

  } = await supabase.auth.getUser();

  if (authError || !user) {

    redirect("/login");

  }

  // 3. Validasi sesi aplikasi JOSJIS.

  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (!sessionToken || !(await hasValidAppSession(user.id, sessionToken))) {

    redirect("/login");

  }

  // 4. Ambil profil pengguna.

  const { data: profile, error: profileError } = await supabaseAdmin

    .from("user_profiles")

    .select("user_id, nip, role, status, wajib_ganti_password")

    .eq("user_id", user.id)

    .maybeSingle();

  if (

    profileError ||

    !profile ||

    profile.user_id !== user.id ||

    profile.status !== "AKTIF"

  ) {

    redirect("/login");

  }

  if (profile.wajib_ganti_password) {

    redirect("/ganti-password");

  }

  if (profile.role !== "MKS") {

    if (profile.role === "ADMIN") {

      redirect("/admin/dashboard");

    }

    if (profile.role === "PENGAWAS") {

      redirect("/pengawas/dashboard");

    }

    redirect("/login");

  }

  // 5. Pastikan akun MKS aktif dan mempunyai penugasan unit.

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

    redirect("/login");

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

    redirect("/login");

  }

  // 6. Ambil unit aktif.

  const { data: unit, error: unitError } = await supabaseAdmin

    .from("unit")

    .select("id, nama_unit, kode_unit")

    .eq("id", pengguna.unit_id)

    .eq("status", "AKTIF")

    .maybeSingle();

  if (unitError || !unit) {

    redirect("/login");

  }

  // 7. Ambil identitas pegawai yang sedang login.

  const { data: pegawai, error: pegawaiError } = await supabaseAdmin

    .from("pegawai")

    .select("id, nama, nip, unit_id, aktif")

    .eq("id", pengguna.pegawai_id)

    .maybeSingle();

  if (

    pegawaiError ||

    !pegawai ||

    pegawai.aktif !== true ||

    pegawai.unit_id !== pengguna.unit_id

  ) {

    redirect("/login");

  }

  // 8. Cari ID MKS untuk mengikat statistik ke MKS yang login.

  const { data: mks, error: mksError } = await supabaseAdmin

    .from("mks")

    .select("id")

    .eq("pegawai_id", pegawai.id)

    .maybeSingle();

  if (mksError) {

    throw new Error("Gagal memuat data penugasan MKS.");

  }

  // 9. Filter bulan. Format URL: ?bulan=2026-10

  const params = await searchParams;

  const requestedMonth = Array.isArray(params?.bulan)

    ? params.bulan[0]

    : params?.bulan;

  const bulan = isValidMonth(requestedMonth)

    ? requestedMonth

    : getJakartaMonth();

  const [year, month] = bulan.split("-").map(Number);

  const tanggalMulai = `${year}-${String(month).padStart(2, "0")}-01`;

  const nextMonthDate = new Date(Date.UTC(year, month, 1));

  const tanggalAkhir = nextMonthDate.toISOString().slice(0, 10);

  // 10. Statistik awal. Tetap nol jika data MKS belum tersedia.

  let jumlahPKBulan = 0;

  let jumlahKUR = 0;

  let jumlahKUM = 0;

  let totalKUR = 0;

  let totalKUM = 0;

  let jumlahDebitur = 0;
  let jumlahPKTotal = 0;

  if (mks?.id) {

    // Seluruh query statistik dibatasi ke MKS dan unit yang sama.

    const { count, error: countError } = await supabaseAdmin

      .from("pk")

      .select("id", { count: "exact", head: true })

      .eq("unit_id", pengguna.unit_id)

      .eq("mks_id", mks.id)

      .gte("tanggal_pk", tanggalMulai)

      .lt("tanggal_pk", tanggalAkhir);

    if (countError) {

      throw new Error("Gagal menghitung PK pada bulan terpilih.");

    }

    jumlahPKBulan = count ?? 0;

    // Ambil kolom yang dibutuhkan untuk ringkasan sepanjang waktu.

    const { data: daftarPK, error: pkError } = await supabaseAdmin

      .from("pk")

      .select(

        "id, cif, nomor_ktp, nama_debitur, jenis_pengajuan_kredit, limit_kredit",

      )

      .eq("unit_id", pengguna.unit_id)

      .eq("mks_id", mks.id);

    if (pkError) {

      throw new Error("Gagal memuat statistik KUM, KUR, dan debitur.");

    }

    jumlahPKTotal = (daftarPK ?? []).length;

    const identitasDebitur = new Set();

    for (const row of daftarPK ?? []) {

      const jenis = String(row.jenis_pengajuan_kredit ?? "")

        .trim()

        .toUpperCase();

      const limit = Number(row.limit_kredit) || 0;

      if (jenis === "KUR") {

        jumlahKUR += 1;

        totalKUR += limit;

      } else if (jenis === "KUM") {

        jumlahKUM += 1;

        totalKUM += limit;

      }

      const key = getDebtorKey(row);

      if (key) {

        identitasDebitur.add(key);

      }

    }

    jumlahDebitur = identitasDebitur.size;

  }

  // 11. Siapkan pilihan 24 bulan terakhir berdasarkan waktu Jakarta.

  const currentMonth = getJakartaMonth();

  const [currentYear, currentMonthNumber] = currentMonth.split("-").map(Number);

  const pilihanBulan = Array.from({ length: 24 }, (_, index) => {

    const date = new Date(

      Date.UTC(currentYear, currentMonthNumber - 1 - index, 1),

    );

    return date.toISOString().slice(0, 7);

  });

  // Pastikan bulan pilihan tetap tersedia meski lebih lama dari 24 bulan.

  if (!pilihanBulan.includes(bulan)) {

    pilihanBulan.push(bulan);

    pilihanBulan.sort((a, b) => b.localeCompare(a));

  }

  const nama = pegawai.nama || "Pengguna MKS";
  const nip = profile.nip || pegawai.nip || "-";
  const monthOptions = pilihanBulan.map((value) => ({
    value,
    label: getMonthLabel(value),
  }));

  const stats = {
    jumlahPKBulan,
    jumlahPKTotal,
    jumlahDebitur,
    jumlahKUR,
    jumlahKUM,
    totalKUR,
    totalKUM,
  };

  return (
    <RoleDashboardMks
      role="MKS"
      nama={nama}
      nip={nip}
      unit={unit.nama_unit}
      unitCode={unit.kode_unit}
      selectedMonth={bulan}
      monthOptions={monthOptions}
      stats={stats}
    />
  );
}
