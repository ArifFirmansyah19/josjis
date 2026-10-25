import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_SESSION_COOKIE, hasValidAppSession } from "@/lib/app-session";
import DataPKTable from "@/components/mks/DataPKTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MksDataPKPage() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <main className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Konfigurasi Supabase belum lengkap.
        </div>
      </main>
    );
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
  if (authError || !user) redirect("/login");

  const sessionToken = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (!sessionToken || !(await hasValidAppSession(user.id, sessionToken)))
    redirect("/login");

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, role, status, wajib_ganti_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.user_id !== user.id ||
    profile.status !== "AKTIF"
  )
    redirect("/login");
  if (profile.wajib_ganti_password) redirect("/ganti-password");
  if (profile.role !== "MKS") {
    redirect(
      profile.role === "ADMIN"
        ? "/admin/dashboard"
        : profile.role === "PENGAWAS"
          ? "/pengawas/dashboard"
          : "/login",
    );
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
  )
    redirect("/login");

  const { data: penugasan, error: penugasanError } = await supabaseAdmin
    .from("pengguna_unit")
    .select("unit_id")
    .eq("pengguna_id", pengguna.id);
  if (
    penugasanError ||
    !penugasan ||
    penugasan.length !== 1 ||
    penugasan[0].unit_id !== pengguna.unit_id
  )
    redirect("/login");

  const [
    { data: unit, error: unitError },
    { data: pegawai, error: pegawaiError },
    { data: mks, error: mksError },
  ] = await Promise.all([
    supabaseAdmin
      .from("unit")
      .select("id, nama_unit, kode_unit")
      .eq("id", pengguna.unit_id)
      .eq("status", "AKTIF")
      .maybeSingle(),
    supabaseAdmin
      .from("pegawai")
      .select("id, nama, unit_id, aktif")
      .eq("id", pengguna.pegawai_id)
      .maybeSingle(),
    supabaseAdmin
      .from("mks")
      .select("id")
      .eq("pegawai_id", pengguna.pegawai_id)
      .maybeSingle(),
  ]);

  if (
    unitError ||
    !unit ||
    pegawaiError ||
    !pegawai ||
    pegawai.aktif !== true ||
    pegawai.unit_id !== pengguna.unit_id ||
    mksError ||
    !mks
  )
    redirect("/login");

  // Ownership is enforced on the server: the browser never chooses mks_id or unit_id.
  const { data: rows, error } = await supabaseAdmin
    .from("pk")
    .select(
      "id, created_at, unit_id, mks_id, status_pk, nama_debitur, nomor_pk, nomor_aplikasi, cif, nomor_ktp, rekening_kredit, jenis_pengajuan_kredit, limit_kredit, jangka_waktu, bunga_per_tahun, bunga_per_bulan, tanggal_aplikasi, tanggal_pk",
    )
    .eq("mks_id", mks.id)
    .eq("unit_id", unit.id)
    .order("created_at", { ascending: false });

  return (
    <DataPKTable
      rows={rows || []}
      error={error?.message || ""}
      namaMks={pegawai.nama || "MKS"}
      namaUnit={unit.nama_unit}
      kodeUnit={unit.kode_unit}
    />
  );
}
