/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  UserRound,
  ShieldCheck,
} from "lucide-react";

const STORAGE_KEY = "josjis_pegawai_unit";

const EMPTY_MASTER = {
  JKK1: {
    supervisor: {
      name: "",
      nip: "",
      position: "",
    },
    mka: [],
  },
  JKK2: {
    supervisor: {
      name: "",
      nip: "",
      position: "",
    },
    mka: [],
  },
};

function loadMaster() {
  if (typeof window === "undefined") return EMPTY_MASTER;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return EMPTY_MASTER;

    const parsed = JSON.parse(saved);

    return {
      JKK1: {
        supervisor: {
          ...EMPTY_MASTER.JKK1.supervisor,
          ...(parsed.JKK1?.supervisor || {}),
        },
        mka: parsed.JKK1?.mka || [],
      },
      JKK2: {
        supervisor: {
          ...EMPTY_MASTER.JKK2.supervisor,
          ...(parsed.JKK2?.supervisor || {}),
        },
        mka: parsed.JKK2?.mka || [],
      },
    };
  } catch {
    return EMPTY_MASTER;
  }
}

export default function PegawaiUnitPage() {
  const { activeUnit, units } = useUnit();

  const [master, setMaster] = useState(EMPTY_MASTER);
  const [showMkaModal, setShowMkaModal] = useState(false);
  const [editingMka, setEditingMka] = useState(null);

  const [mkaForm, setMkaForm] = useState({
    name: "",
    nip: "",
    position: "MKA",
  });

  const [supervisorForm, setSupervisorForm] = useState({
    name: "",
    nip: "",
    position: "",
  });

  useEffect(() => {
    const data = loadMaster();
    setMaster(data);

    const unitData = data[activeUnit.value];

    if (unitData) {
      setSupervisorForm({
        name: unitData.supervisor?.name || "",
        nip: unitData.supervisor?.nip || "",
        position: unitData.supervisor?.position || "",
      });
    }
  }, [activeUnit.value]);

  const currentUnit =
    master[activeUnit.value] || EMPTY_MASTER[activeUnit.value];

  const mkaList = useMemo(() => {
    return currentUnit?.mka || [];
  }, [currentUnit]);

  function saveMaster(nextMaster) {
    setMaster(nextMaster);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMaster));
  }

  function handleSupervisorSave(e) {
    e.preventDefault();

    const nextMaster = {
      ...master,
      [activeUnit.value]: {
        ...master[activeUnit.value],
        supervisor: {
          ...supervisorForm,
        },
      },
    };

    saveMaster(nextMaster);

    alert("Data pengawas berhasil disimpan.");
  }

  function openAddMka() {
    setEditingMka(null);
    setMkaForm({
      name: "",
      nip: "",
      position: "MKA",
    });
    setShowMkaModal(true);
  }

  function openEditMka(item) {
    setEditingMka(item);

    setMkaForm({
      name: item.name || "",
      nip: item.nip || "",
      position: item.position || "MKA",
    });

    setShowMkaModal(true);
  }

  function closeMkaModal() {
    setShowMkaModal(false);
    setEditingMka(null);
  }

  function handleMkaSave(e) {
    e.preventDefault();

    if (!mkaForm.name.trim()) {
      alert("Nama MKA wajib diisi.");
      return;
    }

    if (!mkaForm.nip.trim()) {
      alert("NIP wajib diisi.");
      return;
    }

    let nextMka;

    if (editingMka) {
      nextMka = mkaList.map((item) =>
        item.id === editingMka.id
          ? {
              ...item,
              ...mkaForm,
            }
          : item,
      );
    } else {
      nextMka = [
        ...mkaList,
        {
          id: `MKA-${Date.now()}`,
          ...mkaForm,
        },
      ];
    }

    const nextMaster = {
      ...master,
      [activeUnit.value]: {
        ...master[activeUnit.value],
        mka: nextMka,
      },
    };

    saveMaster(nextMaster);
    closeMkaModal();
  }

  function handleDeleteMka(item) {
    const confirmed = window.confirm(
      `Hapus MKA "${item.name}" dari master ${activeUnit.code}?`,
    );

    if (!confirmed) return;

    const nextMaster = {
      ...master,
      [activeUnit.value]: {
        ...master[activeUnit.value],
        mka: mkaList.filter((mka) => mka.id !== item.id),
      },
    };

    saveMaster(nextMaster);
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Master Pegawai Unit
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Kelola data Pengawas dan MKA berdasarkan unit kerja.
          </p>
        </div>

        {/* UNIT */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Unit Aktif
              </p>

              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {activeUnit.code}
              </p>

              <p className="text-sm text-zinc-500">{activeUnit.name}</p>
            </div>

            <div className="flex gap-2">
              {units.map((unit) => (
                <button
                  key={unit.value}
                  type="button"
                  onClick={() => {
                    const unitData = master[unit.value];

                    setSupervisorForm({
                      name: unitData?.supervisor?.name || "",
                      nip: unitData?.supervisor?.nip || "",
                      position: unitData?.supervisor?.position || "",
                    });
                  }}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    activeUnit.value === unit.value
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {unit.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PENGAWAS */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <ShieldCheck className="h-5 w-5 text-zinc-700" />
            </div>

            <div>
              <h2 className="font-semibold">Pengawas</h2>
              <p className="text-sm text-zinc-500">
                Data pengawas untuk {activeUnit.code}
              </p>
            </div>
          </div>

          <form onSubmit={handleSupervisorSave} className="p-5">
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Nama</label>

                <input
                  value={supervisorForm.name}
                  onChange={(e) =>
                    setSupervisorForm({
                      ...supervisorForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="Nama pengawas"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">NIP</label>

                <input
                  value={supervisorForm.nip}
                  onChange={(e) =>
                    setSupervisorForm({
                      ...supervisorForm,
                      nip: e.target.value,
                    })
                  }
                  placeholder="NIP"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Jabatan
                </label>

                <input
                  value={supervisorForm.position}
                  onChange={(e) =>
                    setSupervisorForm({
                      ...supervisorForm,
                      position: e.target.value,
                    })
                  }
                  placeholder="Jabatan"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                <Save className="h-4 w-4" />
                Simpan Pengawas
              </button>
            </div>
          </form>
        </section>

        {/* MKA */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <UserRound className="h-5 w-5 text-zinc-700" />
              </div>

              <div>
                <h2 className="font-semibold">MKA</h2>
                <p className="text-sm text-zinc-500">
                  Daftar MKA {activeUnit.code}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAddMka}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              Tambah MKA
            </button>
          </div>

          <div className="overflow-x-auto">
            {mkaList.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <UserRound className="mx-auto h-10 w-10 text-zinc-300" />

                <p className="mt-3 text-sm font-medium text-zinc-700">
                  Belum ada data MKA
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                  Tambahkan MKA untuk unit {activeUnit.code}.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                    <th className="px-5 py-3 font-medium text-zinc-500">No</th>
                    <th className="px-5 py-3 font-medium text-zinc-500">
                      Nama
                    </th>
                    <th className="px-5 py-3 font-medium text-zinc-500">NIP</th>
                    <th className="px-5 py-3 font-medium text-zinc-500">
                      Jabatan
                    </th>
                    <th className="px-5 py-3 text-right font-medium text-zinc-500">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {mkaList.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-5 py-4 text-zinc-500">{index + 1}</td>

                      <td className="px-5 py-4 font-medium text-zinc-900">
                        {item.name}
                      </td>

                      <td className="px-5 py-4 text-zinc-600">{item.nip}</td>

                      <td className="px-5 py-4 text-zinc-600">
                        {item.position}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditMka(item)}
                            className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteMka(item)}
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* MODAL MKA */}
      {showMkaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h3 className="font-semibold">
                  {editingMka ? "Edit MKA" : "Tambah MKA"}
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  Unit {activeUnit.code}
                </p>
              </div>

              <button
                type="button"
                onClick={closeMkaModal}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMkaSave} className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nama MKA
                </label>

                <input
                  autoFocus
                  value={mkaForm.name}
                  onChange={(e) =>
                    setMkaForm({
                      ...mkaForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="Nama lengkap"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">NIP</label>

                <input
                  value={mkaForm.nip}
                  onChange={(e) =>
                    setMkaForm({
                      ...mkaForm,
                      nip: e.target.value,
                    })
                  }
                  placeholder="NIP"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Jabatan
                </label>

                <input
                  value={mkaForm.position}
                  onChange={(e) =>
                    setMkaForm({
                      ...mkaForm,
                      position: e.target.value,
                    })
                  }
                  placeholder="MKA"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeMkaModal}
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  <Save className="h-4 w-4" />
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
