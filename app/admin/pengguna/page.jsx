"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  UserRound,
  ShieldCheck,
  Smartphone,
  Power,
  Mail,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useUnit } from "@/components/UnitContext";

const EMPLOYEE_ROLES = ["MKS", "PENGAWAS"];

export default function PenggunaPage() {
  const { activeUnit } = useUnit();

  const [users, setUsers] = useState([]);
  const [unitData, setUnitData] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  const [editingUser, setEditingUser] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [detailUser, setDetailUser] = useState(null);

  const loadData = useCallback(
    async (refresh = false) => {
      if (!activeUnit?.value) {
        setUsers([]);
        setUnitData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      refresh ? setRefreshing(true) : setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/pengguna", {
          method: "GET",
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Gagal memuat pengguna.");
        }

        const employeeList = result.pegawai || [];
        const accountList = result.pengguna || [];
        const profileList = result.profiles || [];
        const deviceList = result.perangkat || [];
        const mksList = result.mks || [];
        const unitList = result.units || [];

        setUnits(
          unitList.filter(
            (unit) =>
              !unit.archived_at &&
              String(unit.status || "").toUpperCase() === "AKTIF",
          ),
        );

        const currentUnit = unitList.find(
          (unit) => unit.kode_unit === activeUnit.value,
        );

        if (!currentUnit) {
          setUnitData(null);
          setUsers([]);
          throw new Error("Unit aktif tidak ditemukan.");
        }

        setUnitData(currentUnit);

        const employeeUsers = employeeList
          .filter(
            (employee) =>
              employee.unit_id === currentUnit.id &&
              EMPLOYEE_ROLES.includes(
                String(employee.jenis_pegawai || "").toUpperCase(),
              ),
          )
          .map((employee) => {
            const account = accountList.find(
              (item) => item.pegawai_id === employee.id,
            );
            const profile = account
              ? profileList.find(
                  (item) => item.user_id === account.auth_user_id,
                )
              : null;
            const mks = mksList.find((item) => item.pegawai_id === employee.id);

            return {
              id: account?.id || `employee-${employee.id}`,
              pegawai_id: employee.id,
              auth_user_id: account?.auth_user_id || null,
              role: String(
                account?.role || employee.jenis_pegawai || "",
              ).toUpperCase(),
              username: account?.username || employee.nip || "",
              email: profile?.email_utama || "",
              aktif: account ? account.aktif : employee.aktif,
              account_exists: Boolean(account),
              wajib_ganti_password: Boolean(profile?.wajib_ganti_password),
              pegawai: employee,
              unit: currentUnit,
              mks: mks || null,
              last_login_at: account?.last_login_at || null,
              last_seen_at: account?.last_seen_at || null,
              created_at: account?.created_at || null,
              devices: account
                ? deviceList.filter(
                    (device) => device.pengguna_id === account.id,
                  )
                : [],
            };
          });

        const superadmins = accountList
          .filter(
            (account) =>
              String(account.role || "").toUpperCase() === "SUPERADMIN",
          )
          .map((account) => {
            const profile = profileList.find(
              (item) => item.user_id === account.auth_user_id,
            );
            const employee = employeeList.find(
              (item) => item.id === account.pegawai_id,
            );

            return {
              ...account,
              role: "SUPERADMIN",
              pegawai: employee || null,
              email: profile?.email_utama || "",
              account_exists: true,
              wajib_ganti_password: Boolean(profile?.wajib_ganti_password),
              devices: deviceList.filter(
                (device) => device.pengguna_id === account.id,
              ),
            };
          });

        setUsers([...employeeUsers, ...superadmins]);
      } catch (err) {
        console.error(err);
        setError(err?.message || "Gagal memuat data pengguna.");
        setUsers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeUnit?.value],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((user) =>
      [
        user.pegawai?.nama,
        user.pegawai?.nip,
        user.pegawai?.jabatan,
        user.role,
        user.username,
        user.email,
        user.mks?.kode_agen,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [users, search]);

  const stats = useMemo(() => {
    const accounts = users.filter((user) => user.account_exists);
    const devices = accounts.flatMap((user) => user.devices || []);

    return {
      employees: users.filter((user) => user.role !== "SUPERADMIN").length,
      accounts: accounts.length,
      active: accounts.filter((user) => user.aktif).length,
      devices: devices.filter((device) => device.aktif).length,
    };
  }, [users]);

  function notify(message, type = "success") {
    setNotice({ message, type });
  }

  async function handleSave(form) {
    setSaving(true);
    setError("");

    try {
      if (form.mode === "create") {
        const response = await fetch("/api/admin/pengguna", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pegawai_id: form.pegawai_id,
            email: form.email.trim(),
            password_awal: form.password_awal,
            unit_ids: [unitData.id],
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Gagal membuat akun.");
        }

        setCreatingUser(false);
        await loadData(true);
        notify(result.message || "Akun berhasil dibuat.");
        return;
      }

      const response = await fetch(`/api/admin/pengguna/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama,
          nip: form.nip,
          jabatan: form.jabatan,
          jenis_pegawai: form.jenis_pegawai,
          email: form.email.trim(),
          unit_id: form.unit_id,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal menyimpan perubahan.");
      }

      setEditingUser(null);
      setDetailUser(null);
      await loadData(true);
      notify(result.message || "Data berhasil diperbarui.");
    } catch (err) {
      notify(err?.message || "Terjadi kesalahan.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user) {
    if (!user?.id || !user.account_exists) return;

    if (user.role === "SUPERADMIN" || user.role === "ADMIN") {
      notify("Akun Admin dan SUPERADMIN tidak dapat dihapus di sini.", "error");
      return;
    }

    setActionId(user.id);

    try {
      const response = await fetch(`/api/admin/pengguna/${user.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Penghapusan akun gagal.");
      }

      setDeletingUser(null);
      setDetailUser(null);
      await loadData(true);
      notify(
        result.message || "Akun login dihapus. Data pegawai tetap disimpan.",
      );
    } catch (err) {
      notify(err?.message || "Gagal menghapus akun.", "error");
    } finally {
      setActionId("");
    }
  }

  async function handleToggle(user) {
    if (!user?.account_exists || user.role === "SUPERADMIN") return;

    const confirmed = window.confirm(
      `${user.aktif ? "Nonaktifkan" : "Aktifkan"} akun ${user.pegawai?.nama || user.username}?`,
    );
    if (!confirmed) return;

    setActionId(user.id);

    try {
      const response = await fetch(`/api/admin/pengguna/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !user.aktif }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengubah status akun.");
      }

      await loadData(true);
      notify(result.message || "Status akun diperbarui.");
    } catch (err) {
      notify(err?.message || "Gagal mengubah status.", "error");
    } finally {
      setActionId("");
    }
  }

  const availableEmployees = users.filter(
    (user) =>
      user.role !== "SUPERADMIN" && !user.account_exists && user.pegawai_id,
  );

  const unitUsers = filteredUsers.filter((user) => user.role !== "SUPERADMIN");
  const superadmins = filteredUsers.filter(
    (user) => user.role === "SUPERADMIN",
  );

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-4 md:p-6">
      {notice && (
        <div
          className={`fixed right-4 top-4 z-[100] flex max-w-md items-start gap-3 rounded-xl border bg-white p-4 shadow-xl ${
            notice.type === "error"
              ? "border-red-200 text-red-700"
              : "border-emerald-200 text-emerald-700"
          }`}
        >
          {notice.type === "error" ? (
            <AlertCircle size={19} />
          ) : (
            <CheckCircle2 size={19} />
          )}
          <p className="flex-1 text-sm">{notice.message}</p>
          <button onClick={() => setNotice(null)} aria-label="Tutup">
            <X size={16} />
          </button>
        </div>
      )}

      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-sm text-slate-500">
            Administrasi Sistem / Pengguna
          </p>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Kelola Pengguna
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola data pegawai, akun login, dan status pengguna.
          </p>
          <p className="mt-3 inline-flex rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
            {unitData?.nama_unit || activeUnit?.label || "Memuat unit..."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCreatingUser(true)}
            disabled={!unitData || availableEmployees.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={17} />
            Tambah Akun
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          title="Total Pegawai"
          value={stats.employees}
          icon={<UserRound size={20} />}
        />
        <Stat
          title="Akun Terdaftar"
          value={stats.accounts}
          icon={<ShieldCheck size={20} />}
        />
        <Stat
          title="Akun Aktif"
          value={stats.active}
          icon={<Power size={20} />}
        />
        <Stat
          title="Perangkat Aktif"
          value={stats.devices}
          icon={<Smartphone size={20} />}
        />
      </section>

      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama, NIP, username, email, atau kode agen..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pengguna Unit</h2>
            <p className="text-sm text-slate-500">
              Data pegawai pada unit aktif.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
            {unitUsers.length} data
          </span>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">
            Memuat data...
          </p>
        ) : unitUsers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Tidak ada pengguna yang cocok dengan pencarian.
          </p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {unitUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                busy={actionId === user.id}
                onView={() => setDetailUser(user)}
                onEdit={() => setEditingUser(user)}
                onDelete={() => setDeletingUser(user)}
                onToggle={() => handleToggle(user)}
              />
            ))}
          </div>
        )}
      </section>

      {superadmins.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Administrator Utama
          </h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {superadmins.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                busy={false}
                onView={() => setDetailUser(user)}
                onEdit={() =>
                  notify(
                    "SUPERADMIN tidak dapat diedit di halaman ini.",
                    "error",
                  )
                }
                onDelete={() =>
                  notify(
                    "SUPERADMIN tidak dapat dihapus di halaman ini.",
                    "error",
                  )
                }
                onToggle={() =>
                  notify(
                    "SUPERADMIN dilindungi dari perubahan status.",
                    "error",
                  )
                }
              />
            ))}
          </div>
        </section>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          units={units}
          currentUnitId={unitData?.id}
          saving={saving}
          onClose={() => setEditingUser(null)}
          onSave={handleSave}
        />
      )}

      {creatingUser && (
        <CreateAccountModal
          employees={availableEmployees}
          unitName={unitData?.nama_unit || ""}
          saving={saving}
          onClose={() => setCreatingUser(false)}
          onSave={handleSave}
        />
      )}

      {deletingUser && (
        <DeleteAccountModal
          user={deletingUser}
          busy={actionId === deletingUser.id}
          onClose={() => setDeletingUser(null)}
          onConfirm={() => handleDelete(deletingUser)}
        />
      )}

      {detailUser && (
        <DetailModal
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onEdit={() => {
            setEditingUser(detailUser);
            setDetailUser(null);
          }}
          onDelete={() => {
            setDeletingUser(detailUser);
            setDetailUser(null);
          }}
        />
      )}
    </main>
  );
}

function UserCard({ user, busy, onView, onEdit, onDelete, onToggle }) {
  const isAdmin = ["ADMIN", "SUPERADMIN"].includes(user.role);
  const devices = (user.devices || []).filter((device) => device.aktif);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
            {initials(user.pegawai?.nama || user.username)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="break-words font-bold text-slate-900">
              {user.pegawai?.nama || user.username || "Pengguna"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {user.pegawai?.nip || user.username || "-"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {user.role}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  user.account_exists
                    ? user.aktif
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {!user.account_exists
                  ? "Belum ada akun"
                  : user.aktif
                    ? "Aktif"
                    : "Nonaktif"}
              </span>
            </div>
          </div>
        </div>

        {user.wajib_ganti_password && user.account_exists && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Wajib ganti password
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniInfo label="Username" value={user.username || "-"} />
          <MiniInfo label="Email" value={user.email || "-"} />
          <MiniInfo label="Kode Agen" value={user.mks?.kode_agen || "-"} />
          <MiniInfo label="Perangkat Aktif" value={`${devices.length}`} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50 p-3">
        <ActionButton onClick={onView} icon={<Eye size={15} />}>
          Detail
        </ActionButton>

        {!isAdmin && (
          <>
            <ActionButton onClick={onEdit} icon={<Pencil size={15} />}>
              Edit
            </ActionButton>

            {user.account_exists && (
              <>
                <ActionButton
                  onClick={onToggle}
                  disabled={busy}
                  icon={<Power size={15} />}
                >
                  {user.aktif ? "Nonaktifkan" : "Aktifkan"}
                </ActionButton>

                <ActionButton
                  onClick={onDelete}
                  disabled={busy}
                  danger
                  icon={<Trash2 size={15} />}
                >
                  Hapus Akun
                </ActionButton>
              </>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function EditUserModal({
  user,
  units,
  currentUnitId,
  saving,
  onClose,
  onSave,
}) {
  const [nama, setNama] = useState(user.pegawai?.nama || "");
  const [nip, setNip] = useState(user.pegawai?.nip || "");
  const [jabatan, setJabatan] = useState(user.pegawai?.jabatan || "");
  const [role, setRole] = useState(user.pegawai?.jenis_pegawai || user.role);
  const [email, setEmail] = useState(user.email || "");
  const [unitId, setUnitId] = useState(user.unit?.id || currentUnitId || "");

  async function submit(event) {
    event.preventDefault();

    if (!user.account_exists) {
      window.alert(
        "Pegawai ini belum memiliki akun. Buat akun terlebih dahulu.",
      );
      return;
    }

    await onSave({
      mode: "edit",
      id: user.id,
      nama,
      nip,
      jabatan,
      jenis_pegawai: role,
      email,
      unit_id: unitId,
    });
  }

  return (
    <Modal title="Edit Data Pegawai dan Akun" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nama lengkap">
          <input
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </Field>
        <Field label="NIP">
          <input
            required
            value={nip}
            onChange={(e) => setNip(e.target.value)}
          />
        </Field>
        <Field label="Jabatan">
          <input
            required
            value={jabatan}
            onChange={(e) => setJabatan(e.target.value)}
          />
        </Field>
        <Field label="Jenis pegawai">
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="MKS">MKS</option>
            <option value="PENGAWAS">PENGAWAS</option>
          </select>
        </Field>
        <Field label="Email login">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Unit penugasan">
          <select
            required
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
          >
            <option value="">Pilih unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.nama_unit}
              </option>
            ))}
          </select>
        </Field>

        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Perubahan NIP dan jenis pegawai dapat berdampak pada relasi data lain.
          Pastikan data sudah benar sebelum menyimpan.
        </p>

        <ModalActions saving={saving} onClose={onClose} />
      </form>
    </Modal>
  );
}

function CreateAccountModal({ employees, unitName, saving, onClose, onSave }) {
  const [pegawaiId, setPegawaiId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event) {
    event.preventDefault();

    if (!pegawaiId || password.length < 12) {
      window.alert("Pilih pegawai dan gunakan password minimal 12 karakter.");
      return;
    }

    await onSave({
      mode: "create",
      pegawai_id: pegawaiId,
      email,
      password_awal: password,
    });
  }

  return (
    <Modal title="Tambah Akun" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          Unit: {unitName}
        </p>

        <Field label="Pegawai">
          <select
            required
            value={pegawaiId}
            onChange={(e) => setPegawaiId(e.target.value)}
          >
            <option value="">Pilih pegawai</option>
            {employees.map((user) => (
              <option key={user.pegawai_id} value={user.pegawai_id}>
                {user.pegawai?.nama} — {user.pegawai?.nip} ({user.role})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Email utama">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password awal (minimal 12 karakter)">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={12}
              maxLength={256}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-500"
              aria-label="Tampilkan atau sembunyikan password"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>

        <ModalActions
          saving={saving}
          onClose={onClose}
          submitLabel="Buat Akun"
        />
      </form>
    </Modal>
  );
}

function DeleteAccountModal({ user, busy, onClose, onConfirm }) {
  const [confirmation, setConfirmation] = useState("");

  const expected = "HAPUS";

  return (
    <Modal title="Hapus Akun Permanen" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertTriangle size={22} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">
              Tindakan ini tidak dapat dibatalkan dengan mudah.
            </p>
            <p className="mt-1 text-sm">
              Akun login {user.pegawai?.nama || user.username} akan dihapus.
              Data pegawai tetap disimpan, tetapi identitas Auth yang dihapus
              tidak otomatis dapat dipulihkan.
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          Ketik <strong>HAPUS</strong> untuk mengonfirmasi.
        </p>

        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Ketik HAPUS"
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-400"
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmation !== expected}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Hapus Permanen
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DetailModal({ user, onClose, onEdit, onDelete }) {
  return (
    <Modal title="Detail Pengguna" onClose={onClose}>
      <div className="space-y-3">
        <MiniInfo label="Nama" value={user.pegawai?.nama || "-"} />
        <MiniInfo label="NIP" value={user.pegawai?.nip || "-"} />
        <MiniInfo label="Jabatan" value={user.pegawai?.jabatan || "-"} />
        <MiniInfo label="Role" value={user.role || "-"} />
        <MiniInfo label="Username" value={user.username || "-"} />
        <MiniInfo label="Email" value={user.email || "-"} />
        <MiniInfo label="Kode Agen" value={user.mks?.kode_agen || "-"} />
        <MiniInfo
          label="Perangkat aktif"
          value={(user.devices || []).filter((device) => device.aktif).length}
        />

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <ActionButton onClick={onClose}>Tutup</ActionButton>
          {user.account_exists &&
            user.role !== "SUPERADMIN" &&
            user.role !== "ADMIN" && (
              <>
                <ActionButton onClick={onEdit} icon={<Pencil size={15} />}>
                  Edit
                </ActionButton>
                <ActionButton
                  onClick={onDelete}
                  danger
                  icon={<Trash2 size={15} />}
                >
                  Hapus Akun
                </ActionButton>
              </>
            )}
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <div className="[&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:px-3 [&_input]:py-3 [&_input]:text-sm [&_input]:outline-none [&_input:focus]:border-blue-400 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_select]:py-3 [&_select]:text-sm">
        {children}
      </div>
    </label>
  );
}

function ModalActions({ saving, onClose, submitLabel = "Simpan Perubahan" }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving && <RefreshCw size={16} className="animate-spin" />}
        {saving ? "Menyimpan..." : submitLabel}
      </button>
    </div>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-blue-700">{icon}</div>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  icon,
  danger = false,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
        danger
          ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function initials(value) {
  return String(value || "P")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
