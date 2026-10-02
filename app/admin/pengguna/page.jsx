"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";

import {
  Search,
  Pencil,
  Smartphone,
  ShieldCheck,
  UserRound,
  X,
  Power,
  RefreshCw,
  Wifi,
  Trash2,
} from "lucide-react";

const DISPLAY_ROLES = ["MKS", "PENGAWAS"];

export default function PenggunaPage() {
  const { activeUnit } = useUnit();

  const [users, setUsers] = useState([]);
  const [unitData, setUnitData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [viewingUser, setViewingUser] = useState(null);

  async function loadData(showRefresh = false) {
    if (!activeUnit?.value) {
      setUsers([]);
      setLoading(false);
      return;
    }

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      // =========================================================
      // 1. UNIT AKTIF DARI TOPBAR
      // =========================================================
      const { data: currentUnit, error: unitError } = await supabase
        .from("unit")
        .select(
          "id, nama_unit, kode_unit, kode_legacy, kode_kawasan, cabang_id",
        )
        .eq("kode_unit", activeUnit.value)
        .maybeSingle();

      if (unitError) throw unitError;

      if (!currentUnit) {
        setUnitData(null);
        setUsers([]);
        setError("Unit aktif tidak ditemukan.");
        return;
      }

      setUnitData(currentUnit);

      // =========================================================
      // 2. AMBIL PEGAWAI UNIT AKTIF
      //
      // Hanya MKS dan PENGAWAS.
      // BM dan MKA sengaja tidak diambil.
      // =========================================================
      const { data: pegawaiUnit, error: pegawaiError } = await supabase
        .from("pegawai")
        .select(
          `
            id,
            nama,
            nip,
            jabatan,
            jenis_pegawai,
            unit_id,
            aktif
          `,
        )
        .eq("unit_id", currentUnit.id)
        .in("jenis_pegawai", DISPLAY_ROLES)
        .order("jenis_pegawai", { ascending: true })
        .order("nama", { ascending: true });

      if (pegawaiError) throw pegawaiError;

      // =========================================================
      // 3. AMBIL DATA MKS
      //
      // Dipakai untuk memastikan pegawai MKS memang punya
      // record di tabel public.mks.
      // =========================================================
      const pegawaiIds = (pegawaiUnit || []).map((pegawai) => pegawai.id);

      let mksData = [];

      if (pegawaiIds.length > 0) {
        const { data, error: mksError } = await supabase
          .from("mks")
          .select(
            `
              id,
              pegawai_id,
              pengawas_id,
              kode_agen
            `,
          )
          .in("pegawai_id", pegawaiIds);

        if (mksError) throw mksError;

        mksData = data || [];
      }

      // =========================================================
      // 4. AMBIL SUPERADMIN
      //
      // Superadmin bersifat global, jadi selalu tampil.
      // =========================================================
      const { data: superadminData, error: superadminError } = await supabase
        .from("pengguna")
        .select(
          `
              id,
              auth_user_id,
              pegawai_id,
              role,
              unit_id,
              username,
              aktif,
              last_login_at,
              last_seen_at,
              created_at,
              updated_at,
              pegawai:pegawai_id (
                id,
                nama,
                nip,
                jabatan,
                jenis_pegawai,
                aktif
              )
            `,
        )
        .eq("role", "SUPERADMIN")
        .order("username", { ascending: true });

      if (superadminError) throw superadminError;

      // =========================================================
      // 5. AMBIL AKUN PENGGUNA UNTUK MKS/PENGAWAS UNIT INI
      //
      // Tidak masalah kalau belum ada akun.
      // Pegawainya tetap akan ditampilkan.
      // =========================================================
      let penggunaData = [];

      if (pegawaiIds.length > 0) {
        const { data, error: penggunaError } = await supabase
          .from("pengguna")
          .select(
            `
              id,
              auth_user_id,
              pegawai_id,
              role,
              unit_id,
              username,
              aktif,
              last_login_at,
              last_seen_at,
              created_at,
              updated_at
            `,
          )
          .in("pegawai_id", pegawaiIds);

        if (penggunaError) throw penggunaError;

        penggunaData = data || [];
      }

      // =========================================================
      // 6. AMBIL PERANGKAT
      // =========================================================
      const penggunaIds = [
        ...penggunaData.map((user) => user.id),
        ...(superadminData || []).map((user) => user.id),
      ];

      let perangkatData = [];

      if (penggunaIds.length > 0) {
        const { data, error: perangkatError } = await supabase
          .from("perangkat")
          .select(
            `
              id,
              pengguna_id,
              nama_perangkat,
              jenis_perangkat,
              platform,
              browser,
              aktif,
              terdaftar_at,
              last_seen_at,
              last_ip,
              revoked_at,
              revoked_reason,
              created_at,
              updated_at
            `,
          )
          .in("pengguna_id", penggunaIds)
          .order("last_seen_at", {
            ascending: false,
            nullsFirst: false,
          });

        if (perangkatError) throw perangkatError;

        perangkatData = data || [];
      }

      // =========================================================
      // 7. GABUNG PEGAWAI + PENGGUNA + MKS + PERANGKAT
      // =========================================================
      const mappedUnitUsers = (pegawaiUnit || [])
        .map((pegawai) => {
          const account = penggunaData.find(
            (user) => user.pegawai_id === pegawai.id,
          );

          const mks = mksData.find((item) => item.pegawai_id === pegawai.id);

          // Kalau jenis pegawai MKS tetapi belum ada record mks,
          // tetap ditampilkan agar master data terlihat.
          const devices = account
            ? perangkatData.filter(
                (device) => device.pengguna_id === account.id,
              )
            : [];

          return {
            id: account?.id || `pegawai-${pegawai.id}`,
            pegawai_id: pegawai.id,

            auth_user_id: account?.auth_user_id || null,

            role: account?.role || normalizeRole(pegawai.jenis_pegawai),

            unit_id: currentUnit.id,

            username: account?.username || "",

            aktif: account ? account.aktif : pegawai.aktif,

            account_exists: Boolean(account),

            last_login_at: account?.last_login_at || null,
            last_seen_at: account?.last_seen_at || null,

            created_at: account?.created_at || null,
            updated_at: account?.updated_at || null,

            pegawai,

            mks: mks || null,

            devices,
          };
        })
        .filter(Boolean);

      // =========================================================
      // 8. SUPERADMIN
      // =========================================================
      const mappedSuperadmins = (superadminData || []).map((user) => {
        const devices = perangkatData.filter(
          (device) => device.pengguna_id === user.id,
        );

        return {
          ...user,

          account_exists: true,

          pegawai: user.pegawai || null,

          mks: null,

          devices,
        };
      });

      // =========================================================
      // 9. HASIL AKHIR
      //
      // MKS/PENGAWAS UNIT AKTIF
      // +
      // SUPERADMIN GLOBAL
      // =========================================================
      setUsers([...mappedUnitUsers, ...mappedSuperadmins]);
    } catch (err) {
      console.error("Gagal mengambil data pengguna:", err);

      setError(err?.message || "Gagal mengambil data pengguna dari database.");

      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeUnit?.value]);

  // ===========================================================
  // FILTER PENCARIAN
  // ===========================================================
  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((user) => {
      const values = [
        user.pegawai?.nama,
        user.pegawai?.nip,
        user.pegawai?.jabatan,
        user.role,
        user.username,
        user.mks?.kode_agen,
      ];

      return values
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [users, search]);

  const unitUsers = filteredUsers.filter((user) => user.role !== "SUPERADMIN");

  const superadmins = filteredUsers.filter(
    (user) => user.role === "SUPERADMIN",
  );

  const activeUsers = users.filter((user) => user.aktif).length;

  const accountUsers = users.filter((user) => user.account_exists).length;

  const activeDevices = users.reduce(
    (total, user) =>
      total + user.devices.filter((device) => device.aktif).length,
    0,
  );

  const onlineUsers = users.filter((user) =>
    isOnline(user.last_seen_at),
  ).length;

  // ===========================================================
  // AKTIF / NONAKTIF
  // ===========================================================
  async function handleToggleUser(user) {
    if (!user.account_exists) {
      setError(
        "Akun pengguna belum dibuat. Data pegawai sudah tampil, tetapi akun login belum tersedia.",
      );
      return;
    }

    const nextStatus = !user.aktif;

    const confirmed = window.confirm(
      `${nextStatus ? "Aktifkan" : "Nonaktifkan"} akun "${getUserName(user)}"?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      const { error: updateError } = await supabase
        .from("pengguna")
        .update({
          aktif: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await loadData(true);

      setViewingUser(null);
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal mengubah status pengguna.");
    }
  }

  // ===========================================================
  // CABUT PERANGKAT
  // ===========================================================
  async function handleRevokeDevice(device) {
    const confirmed = window.confirm(
      `Cabut perangkat "${device.nama_perangkat || "Perangkat"}"?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      const { error: updateError } = await supabase
        .from("perangkat")
        .update({
          aktif: false,
          revoked_at: new Date().toISOString(),
          revoked_reason: "Dicabut oleh administrator",
          updated_at: new Date().toISOString(),
        })
        .eq("id", device.id);

      if (updateError) throw updateError;

      await loadData(true);

      setViewingUser(null);
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal mencabut perangkat.");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Pengguna
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Akun dan perangkat pengguna JOSJIS.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs">
              <span className="text-zinc-400">Unit aktif</span>

              <div className="mt-0.5 font-semibold text-zinc-800">
                {unitData?.nama_unit ||
                  activeUnit?.label ||
                  activeUnit?.value ||
                  "-"}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            TOOLBAR
        ====================================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NIP, username..."
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            SUMMARY
        ====================================================== */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            icon={<UserRound size={17} />}
            label="Pengguna"
            value={users.length}
          />

          <SummaryCard
            icon={<ShieldCheck size={17} />}
            label="Akun dibuat"
            value={accountUsers}
          />

          <SummaryCard
            icon={<Smartphone size={17} />}
            label="Perangkat"
            value={activeDevices}
          />

          <SummaryCard
            icon={<Wifi size={17} />}
            label="Online"
            value={onlineUsers}
          />
        </div>

        {/* =====================================================
            LOADING
        ====================================================== */}
        {loading ? (
          <LoadingCards />
        ) : (
          <>
            {/* =================================================
                MKS + PENGAWAS
            ================================================== */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Pengguna {unitData?.kode_unit || ""}
                  </h2>

                  <p className="mt-0.5 text-xs text-zinc-500">
                    MKS dan Pengawas pada unit aktif.
                  </p>
                </div>

                <span className="text-xs text-zinc-400">
                  {unitUsers.length} orang
                </span>
              </div>

              {unitUsers.length === 0 ? (
                <EmptyState text="Belum ada MKS atau Pengawas pada unit ini." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {unitUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onView={() => setViewingUser(user)}
                      onToggle={() => handleToggleUser(user)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* =================================================
                SUPERADMIN
            ================================================== */}
            {superadmins.length > 0 && (
              <section>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Administrator Sistem
                  </h2>

                  <p className="mt-0.5 text-xs text-zinc-500">
                    Akun global yang tidak mengikuti unit aktif.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {superadmins.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onView={() => setViewingUser(user)}
                      onToggle={() => handleToggleUser(user)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* =====================================================
            DETAIL
        ====================================================== */}
        <UserDetailModal
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onToggle={() => {
            if (!viewingUser) return;
            handleToggleUser(viewingUser);
          }}
          onRevokeDevice={handleRevokeDevice}
        />
      </div>
    </DashboardLayout>
  );
}

/* =============================================================
   USER CARD
============================================================= */

function UserCard({ user, onView, onToggle }) {
  const activeDevices = user.devices.filter((device) => device.aktif);

  const online = isOnline(user.last_seen_at);

  const roleLabel = user.role === "SUPERADMIN" ? "Superadmin" : user.role;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
            user.role === "SUPERADMIN"
              ? "bg-violet-50 text-violet-700"
              : user.role === "MKS"
                ? "bg-cyan-50 text-cyan-700"
                : "bg-indigo-50 text-indigo-700",
          ].join(" ")}
        >
          {getInitials(getUserName(user))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-zinc-900">
                {getUserName(user)}
              </h3>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {roleLabel}
                {user.pegawai?.nip ? ` • ${user.pegawai.nip}` : ""}
              </p>
            </div>

            <StatusBadge
              aktif={user.aktif}
              accountExists={user.account_exists}
            />
          </div>
        </div>
      </div>

      {/* INFO */}
      <div className="mt-4 space-y-2.5">
        <InfoRow
          label="Username"
          value={
            user.account_exists
              ? user.username || "Belum diisi"
              : "Belum dibuat"
          }
        />

        {user.role === "MKS" && (
          <InfoRow label="Kode Agen" value={user.mks?.kode_agen || "—"} />
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">Perangkat</span>

          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900"
          >
            <Smartphone size={14} />

            {activeDevices.length}

            {getDeviceLimit(user.role) ? `/${getDeviceLimit(user.role)}` : ""}
          </button>
        </div>

        {user.account_exists && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-400">Koneksi</span>

            <OnlineBadge online={online} />
          </div>
        )}
      </div>

      {/* ACTION */}
      <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={onView}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          <Smartphone size={14} />
          Detail
        </button>

        <button
          type="button"
          onClick={onToggle}
          disabled={!user.account_exists}
          className="flex h-9 items-center justify-center rounded-lg border border-zinc-200 px-3 text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-30"
          title={
            user.account_exists
              ? user.aktif
                ? "Nonaktifkan"
                : "Aktifkan"
              : "Akun belum dibuat"
          }
        >
          <Power size={15} />
        </button>
      </div>
    </div>
  );
}

/* =============================================================
   DETAIL MODAL
============================================================= */

function UserDetailModal({ user, onClose, onToggle, onRevokeDevice }) {
  if (!user) return null;

  const activeDevices = user.devices.filter((device) => device.aktif);

  const limit = getDeviceLimit(user.role);

  return (
    <Modal open={!!user} onClose={onClose}>
      <div className="border-b border-zinc-200 px-4 py-4">
        <div className="flex items-start gap-3">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
              user.role === "SUPERADMIN"
                ? "bg-violet-50 text-violet-700"
                : user.role === "MKS"
                  ? "bg-cyan-50 text-cyan-700"
                  : "bg-indigo-50 text-indigo-700",
            ].join(" ")}
          >
            {getInitials(getUserName(user))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold text-zinc-900">
              {getUserName(user)}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <RoleBadge role={user.role} />

              <span>•</span>

              <span>
                {user.role === "SUPERADMIN"
                  ? "Global"
                  : user.pegawai?.jabatan || unitLabel(user)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {/* AKUN */}
        <section>
          <SectionTitle icon={<UserRound size={16} />} title="Informasi Akun" />

          <div className="mt-3 grid grid-cols-2 gap-4">
            <DetailItem label="Nama" value={getUserName(user)} />

            <DetailItem label="NIP" value={user.pegawai?.nip} />

            <DetailItem label="Role" value={<RoleBadge role={user.role} />} />

            <DetailItem
              label="Username"
              value={user.account_exists ? user.username : "Belum dibuat"}
            />

            <DetailItem
              label="Status"
              value={
                <StatusBadge
                  aktif={user.aktif}
                  accountExists={user.account_exists}
                />
              }
            />

            <DetailItem
              label="Terakhir aktif"
              value={formatDateTime(user.last_seen_at)}
            />
          </div>
        </section>

        {/* MKS */}
        {user.role === "MKS" && (
          <section className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            <SectionTitle icon={<ShieldCheck size={16} />} title="Data MKS" />

            <div className="mt-3 grid grid-cols-2 gap-4">
              <DetailItem label="Kode Agen" value={user.mks?.kode_agen} />

              <DetailItem
                label="Pengawas"
                value={user.mks?.pengawas_id ? "Terhubung" : "Belum diatur"}
              />
            </div>
          </section>
        )}

        {/* PERANGKAT */}
        <section>
          <div className="flex items-center justify-between">
            <SectionTitle icon={<Smartphone size={16} />} title="Perangkat" />

            <span className="text-xs text-zinc-500">
              {activeDevices.length}
              {limit ? ` / ${limit}` : ""}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {user.devices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-7 text-center">
                <Smartphone size={26} className="mx-auto text-zinc-300" />

                <p className="mt-2 text-xs font-medium text-zinc-600">
                  Belum ada perangkat
                </p>
              </div>
            ) : (
              user.devices.map((device) => (
                <DeviceItem
                  key={device.id}
                  device={device}
                  onRevoke={() => onRevokeDevice(device)}
                />
              ))
            )}
          </div>
        </section>

        {/* AKSI */}
        {user.account_exists && (
          <div className="flex gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => {
                alert(
                  "Form edit pengguna akan kita sambungkan setelah tampilan data dasar ini selesai.",
                );
              }}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Pencil size={15} />
              Edit
            </button>

            <button
              type="button"
              onClick={onToggle}
              className={[
                "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium",
                user.aktif
                  ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "bg-zinc-900 text-white hover:bg-zinc-800",
              ].join(" ")}
            >
              <Power size={15} />

              {user.aktif ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* =============================================================
   DEVICE
============================================================= */

function DeviceItem({ device, onRevoke }) {
  const online = isOnline(device.last_seen_at);

  return (
    <div
      className={[
        "rounded-xl border p-3",
        device.aktif
          ? "border-zinc-200 bg-white"
          : "border-zinc-100 bg-zinc-50 opacity-70",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          <Smartphone size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-zinc-900">
                {device.nama_perangkat || "Perangkat tanpa nama"}
              </div>

              <div className="mt-0.5 truncate text-[11px] text-zinc-500">
                {[device.jenis_perangkat, device.platform, device.browser]
                  .filter(Boolean)
                  .join(" • ") || "Informasi perangkat"}
              </div>
            </div>

            <OnlineBadge online={online} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <DetailItem
              label="Terdaftar"
              value={formatDateTime(device.terdaftar_at)}
            />

            <DetailItem
              label="Terakhir aktif"
              value={formatDateTime(device.last_seen_at)}
            />
          </div>

          {device.aktif && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onRevoke}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={13} />
                Cabut
              </button>
            </div>
          )}

          {!device.aktif && device.revoked_reason && (
            <div className="mt-2 text-[11px] text-zinc-400">
              {device.revoked_reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   SUMMARY
============================================================= */

function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}

        <span className="text-xs font-medium sm:text-sm">{label}</span>
      </div>

      <div className="mt-2 text-xl font-bold text-zinc-900 sm:text-2xl">
        {value}
      </div>
    </div>
  );
}

/* =============================================================
   INFO ROW
============================================================= */

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-zinc-400">{label}</span>

      <span className="max-w-[65%] truncate text-right text-xs font-medium text-zinc-700">
        {value || "—"}
      </span>
    </div>
  );
}

/* =============================================================
   BADGES
============================================================= */

function StatusBadge({ aktif, accountExists = true }) {
  if (!accountExists) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        Belum dibuat
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        aktif ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500",
      ].join(" ")}
    >
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function OnlineBadge({ online }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
        online ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          online ? "bg-emerald-500" : "bg-zinc-400",
        ].join(" ")}
      />

      {online ? "Online" : "Offline"}
    </span>
  );
}

function RoleBadge({ role }) {
  const classes = {
    SUPERADMIN: "bg-violet-50 text-violet-700",
    MKS: "bg-cyan-50 text-cyan-700",
    PENGAWAS: "bg-indigo-50 text-indigo-700",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
        classes[role] || "bg-zinc-100 text-zinc-700",
      ].join(" ")}
    >
      {role}
    </span>
  );
}

/* =============================================================
   DETAIL
============================================================= */

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
      {icon}
      {title}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[9px] uppercase tracking-wide text-zinc-400">
        {label}
      </div>

      <div className="truncate text-xs text-zinc-700">{value || "—"}</div>
    </div>
  );
}

/* =============================================================
   MODAL
============================================================= */

function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        {children}
      </div>
    </div>
  );
}

/* =============================================================
   LOADING
============================================================= */

function LoadingCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-zinc-200 bg-white p-4"
        >
          <div className="flex gap-3">
            <div className="h-11 w-11 animate-pulse rounded-xl bg-zinc-100" />

            <div className="flex-1">
              <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />

              <div className="mt-2 h-3 w-28 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="h-3 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =============================================================
   EMPTY
============================================================= */

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center">
      <UserRound size={28} className="mx-auto text-zinc-300" />

      <p className="mt-2 text-sm font-medium text-zinc-600">{text}</p>
    </div>
  );
}

/* =============================================================
   HELPERS
============================================================= */

function normalizeRole(jenisPegawai) {
  const value = String(jenisPegawai || "").toUpperCase();

  if (value === "PENGAWAS") {
    return "PENGAWAS";
  }

  if (value === "MKS") {
    return "MKS";
  }

  return value;
}

function getUserName(user) {
  return user?.pegawai?.nama || user?.username || "Pengguna";
}

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "P";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function unitLabel(user) {
  return (
    user?.unit?.nama_unit ||
    user?.unit?.kode_unit ||
    user?.pegawai?.unit_id ||
    "—"
  );
}

function getDeviceLimit(role) {
  if (
    role === "MKS" ||
    role === "PENGAWAS" ||
    role === "MBM" ||
    role === "SGP"
  ) {
    return 2;
  }

  return null;
}

function isOnline(lastSeen) {
  if (!lastSeen) return false;

  const timestamp = new Date(lastSeen).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= 5 * 60 * 1000;
}

function formatDateTime(value) {
  if (!value) return "Belum ada";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
