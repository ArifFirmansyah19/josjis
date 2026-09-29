"use client";

import { Plus, Trash2 } from "lucide-react";

import PkInput from "@/components/pk/shared/PkInput";
import PkSelect from "@/components/pk/shared/PkSelect";
import PkSection from "@/components/pk/shared/PkSection";
import { getBindingType } from "@/lib/pk/pkRules";

const collateralTypes = [
  { value: "SHM", label: "SHM" },
  { value: "BPKB", label: "BPKB" },
  { value: "LAINNYA", label: "Lainnya" },
];

const certificateTypes = [
  { value: "Fisik", label: "Fisik" },
  { value: "Elektronik", label: "Elektronik" },
];

const certificateLocations = [
  {
    value: "DIBAWA_DEBITUR",
    label: "Dibawa Debitur saat PK",
  },
  {
    value: "PERLU_ORDER_CO",
    label: "Perlu di-order dari CO",
  },
  {
    value: "DI_CABANG",
    label: "Di Cabang",
  },
  {
    value: "DI_NOTARIS",
    label: "Di Notaris",
  },
];

const relationshipOptions = [
  { value: "MILIK_SENDIRI", label: "Milik Sendiri" },
  { value: "SUAMI", label: "Suami" },
  { value: "ISTRI", label: "Istri" },
  { value: "JUAL_BELI", label: "Jual Beli" },
  { value: "WARIS", label: "Waris" },
  { value: "ORANG_TUA", label: "Orang Tua" },
  { value: "SAUDARA", label: "Saudara" },
  { value: "LAINNYA", label: "Lainnya" },
];

function createOwner() {
  return {
    id: `OWNER-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    nik: "",
  };
}

function normalizeOwners(collateral) {
  if (Array.isArray(collateral?.owners) && collateral.owners.length > 0) {
    return collateral.owners;
  }

  if (collateral?.owner) {
    return [
      {
        id: `OWNER-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: collateral.owner,
        nik: "",
      },
    ];
  }

  return [];
}

export default function PkCollateralSection({ pk, setPk, canEdit, locked }) {
  const collaterals = pk.collaterals || [];

  const updateCollateral = (collateralId, field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((collateral) =>
        collateral.id === collateralId
          ? {
              ...collateral,
              [field]: value,
            }
          : collateral,
      ),
    }));
  };

  const updateCollateralAddress = (collateralId, field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((collateral) =>
        collateral.id === collateralId
          ? {
              ...collateral,
              address: {
                ...(collateral.address || {}),
                [field]: value,
              },
            }
          : collateral,
      ),
    }));
  };

  const updateBinding = (collateralId, field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((collateral) =>
        collateral.id === collateralId
          ? {
              ...collateral,
              binding: {
                ...(collateral.binding || {}),
                [field]: value,
              },
            }
          : collateral,
      ),
    }));
  };

  const addCollateral = () => {
    if (!canEdit || locked) return;

    const newCollateral = {
      id: `COL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

      type: "SHM",
      number: "",

      certificateType: "Fisik",
      certificateLocation: "DIBAWA_DEBITUR",

      area: "",
      bookDate: "",

      owner: "",
      owners: [],

      relationship: "",

      value: "",

      address: {
        village: "",
        district: "",
        regency: "",
      },

      note: "",

      binding: {
        type: "TIDAK ADA",
        notaryName: "",
        notaryCode: "",
        fee: "",
        outgoingLetterNumber: "",
        note: "",
        status: "BELUM DIPROSES",
      },
    };

    setPk((prev) => ({
      ...prev,
      collaterals: [...(prev.collaterals || []), newCollateral],
    }));
  };

  const removeCollateral = (collateralId) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).filter(
        (collateral) => collateral.id !== collateralId,
      ),
    }));
  };

  const handleRelationshipChange = (collateral, value) => {
    if (!canEdit || locked) return;

    const currentOwners = normalizeOwners(collateral);

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) => {
        if (item.id !== collateral.id) {
          return item;
        }

        if (value === "WARIS") {
          const owners =
            currentOwners.length > 0 ? currentOwners : [createOwner()];

          return {
            ...item,
            relationship: value,
            owners,
            owner: owners[0]?.name || "",
          };
        }

        const firstOwner = currentOwners[0];

        return {
          ...item,
          relationship: value,
          owners: firstOwner ? [firstOwner] : [],
          owner: firstOwner?.name || item.owner || "",
        };
      }),
    }));
  };

  const updateOwner = (collateralId, ownerId, field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((collateral) => {
        if (collateral.id !== collateralId) {
          return collateral;
        }

        const owners = normalizeOwners(collateral).map((owner) =>
          owner.id === ownerId
            ? {
                ...owner,
                [field]: value,
              }
            : owner,
        );

        return {
          ...collateral,
          owners,
          owner: owners[0]?.name || "",
        };
      }),
    }));
  };

  const addOwner = (collateralId) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((collateral) =>
        collateral.id === collateralId
          ? {
              ...collateral,
              owners: [...normalizeOwners(collateral), createOwner()],
            }
          : collateral,
      ),
    }));
  };

  const removeOwner = (collateralId, ownerId) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((collateral) => {
        if (collateral.id !== collateralId) {
          return collateral;
        }

        const owners = normalizeOwners(collateral).filter(
          (owner) => owner.id !== ownerId,
        );

        return {
          ...collateral,
          owners,
          owner: owners[0]?.name || "",
        };
      }),
    }));
  };

  return (
    <PkSection
      title="Data Agunan"
      description="Data dokumen agunan, kepemilikan, lokasi, nilai, dan pengikatan."
      locked={locked}
    >
      {collaterals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-5 py-10 text-center">
          <p className="text-sm font-medium text-zinc-700">Belum ada agunan</p>

          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-zinc-500">
            Tambahkan agunan yang terkait dengan PK ini.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {collaterals.map((collateral, index) => {
            const address = collateral.address || {};

            const bindingType = getBindingType(pk.limit, [collateral]);

            const requiresBinding = bindingType !== "TIDAK ADA";

            const isWaris = collateral.relationship === "WARIS";

            const owners = normalizeOwners(collateral);

            return (
              <div
                key={collateral.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4"
              >
                {/* Header */}
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Agunan {index + 1}
                    </p>

                    <p className="mt-0.5 text-xs text-zinc-500">
                      Data dokumen dan proses pengikatan agunan.
                    </p>
                  </div>

                  {canEdit && !locked && (
                    <button
                      type="button"
                      onClick={() => removeCollateral(collateral.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Hapus Agunan
                    </button>
                  )}
                </div>

                {/* Data dokumen */}
                <div>
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Dokumen Agunan
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <PkSelect
                      label="Jenis Agunan"
                      value={collateral.type || ""}
                      onChange={(e) =>
                        updateCollateral(collateral.id, "type", e.target.value)
                      }
                      disabled={!canEdit || locked}
                      options={collateralTypes}
                    />

                    <PkInput
                      label="Nomor SHM / Agunan"
                      value={collateral.number || ""}
                      onChange={(e) =>
                        updateCollateral(
                          collateral.id,
                          "number",
                          e.target.value,
                        )
                      }
                      disabled={!canEdit || locked}
                    />

                    <PkSelect
                      label="Jenis Sertifikat"
                      value={collateral.certificateType || ""}
                      onChange={(e) =>
                        updateCollateral(
                          collateral.id,
                          "certificateType",
                          e.target.value,
                        )
                      }
                      disabled={!canEdit || locked}
                      options={certificateTypes}
                    />

                    <PkSelect
                      label="Fisik Sertifikat"
                      value={collateral.certificateLocation || ""}
                      onChange={(e) =>
                        updateCollateral(
                          collateral.id,
                          "certificateLocation",
                          e.target.value,
                        )
                      }
                      disabled={!canEdit || locked}
                      options={certificateLocations}
                    />

                    <PkInput
                      label="Luas"
                      value={collateral.area || ""}
                      onChange={(e) =>
                        updateCollateral(collateral.id, "area", e.target.value)
                      }
                      disabled={!canEdit || locked}
                      suffix="m²"
                    />

                    <PkInput
                      label="Tanggal Buku"
                      type="date"
                      value={collateral.bookDate || ""}
                      onChange={(e) =>
                        updateCollateral(
                          collateral.id,
                          "bookDate",
                          e.target.value,
                        )
                      }
                      disabled={!canEdit || locked}
                    />
                  </div>
                </div>

                {/* Kepemilikan */}
                <div className="mt-6 border-t border-zinc-200 pt-5">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Kepemilikan
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <PkSelect
                      label="Hubungan dengan Debitur"
                      value={collateral.relationship || ""}
                      onChange={(e) =>
                        handleRelationshipChange(collateral, e.target.value)
                      }
                      disabled={!canEdit || locked}
                      options={relationshipOptions}
                    />
                  </div>

                  {isWaris ? (
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            Daftar Pemilik
                          </p>

                          <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                            Satu dokumen waris dapat memiliki beberapa nama
                            pemilik.
                          </p>
                        </div>

                        {canEdit && !locked && (
                          <button
                            type="button"
                            onClick={() => addOwner(collateral.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                          >
                            <Plus size={14} />
                            Tambah Pemilik
                          </button>
                        )}
                      </div>

                      <div className="mt-4 space-y-3">
                        {owners.map((owner, ownerIndex) => (
                          <div
                            key={owner.id}
                            className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-xs font-semibold text-zinc-700">
                                Pemilik {ownerIndex + 1}
                              </p>

                              {canEdit && !locked && owners.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeOwner(collateral.id, owner.id)
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={13} />
                                  Hapus
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <PkInput
                                label="Nama Pemilik"
                                value={owner.name || ""}
                                onChange={(e) =>
                                  updateOwner(
                                    collateral.id,
                                    owner.id,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                disabled={!canEdit || locked}
                              />

                              <PkInput
                                label="NIK Pemilik"
                                value={owner.nik || ""}
                                onChange={(e) =>
                                  updateOwner(
                                    collateral.id,
                                    owner.id,
                                    "nik",
                                    e.target.value,
                                  )
                                }
                                disabled={!canEdit || locked}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <PkInput
                        label="Atas Nama"
                        value={collateral.owner || ""}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (!canEdit || locked) {
                            return;
                          }

                          setPk((prev) => ({
                            ...prev,
                            collaterals: (prev.collaterals || []).map((item) =>
                              item.id === collateral.id
                                ? {
                                    ...item,
                                    owner: value,
                                    owners: value
                                      ? [
                                          {
                                            id:
                                              normalizeOwners(item)[0]?.id ||
                                              `OWNER-${Date.now()}`,
                                            name: value,
                                            nik:
                                              normalizeOwners(item)[0]?.nik ||
                                              "",
                                          },
                                        ]
                                      : [],
                                  }
                                : item,
                            ),
                          }));
                        }}
                        disabled={!canEdit || locked}
                      />

                      {collateral.relationship === "JUAL_BELI" && (
                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          Nama kepemilikan dokumen tetap dicatat pada kolom Atas
                          Nama. Hubungan dengan debitur dicatat sebagai Jual
                          Beli.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Alamat agunan */}
                <div className="mt-6 border-t border-zinc-200 pt-5">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Alamat Agunan
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <PkInput
                      label="Desa / Kelurahan"
                      value={address.village || ""}
                      onChange={(e) =>
                        updateCollateralAddress(
                          collateral.id,
                          "village",
                          e.target.value,
                        )
                      }
                      disabled={!canEdit || locked}
                    />

                    <PkInput
                      label="Kecamatan"
                      value={address.district || ""}
                      onChange={(e) =>
                        updateCollateralAddress(
                          collateral.id,
                          "district",
                          e.target.value,
                        )
                      }
                      disabled={!canEdit || locked}
                    />

                    <PkInput
                      label="Kabupaten"
                      value={address.regency || ""}
                      onChange={(e) =>
                        updateCollateralAddress(
                          collateral.id,
                          "regency",
                          e.target.value,
                        )
                      }
                      disabled={!canEdit || locked}
                    />
                  </div>
                </div>

                {/* Nilai & catatan */}
                <div className="mt-6 border-t border-zinc-200 pt-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <PkInput
                      label="Nilai Agunan"
                      type="number"
                      value={collateral.value ?? ""}
                      onChange={(e) =>
                        updateCollateral(collateral.id, "value", e.target.value)
                      }
                      disabled={!canEdit || locked}
                    />

                    <PkInput
                      label="Catatan Agunan"
                      value={collateral.note || ""}
                      onChange={(e) =>
                        updateCollateral(collateral.id, "note", e.target.value)
                      }
                      disabled={!canEdit || locked}
                      placeholder="Catatan tambahan agunan"
                    />
                  </div>
                </div>

                {/* Pengikatan */}
                {requiresBinding && (
                  <div className="mt-6 border-t border-zinc-200 pt-5">
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Pengikatan
                      </p>

                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Jenis pengikatan ditentukan otomatis berdasarkan limit
                        pinjaman dan jenis sertifikat.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <PkInput
                        label="Jenis Pengikatan"
                        value={bindingType}
                        disabled
                      />

                      <PkInput
                        label="Notaris"
                        value={collateral.binding?.notaryName || ""}
                        onChange={(e) =>
                          updateBinding(
                            collateral.id,
                            "notaryName",
                            e.target.value,
                          )
                        }
                        disabled={!canEdit || locked}
                        placeholder="Nama notaris"
                      />

                      <PkInput
                        label="Kode Notaris"
                        value={collateral.binding?.notaryCode || ""}
                        onChange={(e) =>
                          updateBinding(
                            collateral.id,
                            "notaryCode",
                            e.target.value,
                          )
                        }
                        disabled={!canEdit || locked}
                        placeholder="Kode notaris"
                      />

                      <div>
                        <PkInput
                          label="Biaya Pengikatan"
                          type="number"
                          value={collateral.binding?.fee ?? ""}
                          onChange={(e) =>
                            updateBinding(collateral.id, "fee", e.target.value)
                          }
                          disabled={!canEdit || locked}
                          suffix="Rp"
                        />

                        {collateral.binding?.fee !== "" &&
                          collateral.binding?.fee != null && (
                            <p className="mt-1.5 text-[11px] text-zinc-400">
                              Rp{" "}
                              {Number(collateral.binding.fee).toLocaleString(
                                "id-ID",
                              )}
                            </p>
                          )}
                      </div>

                      <PkInput
                        label="Nomor Surat Keluar Order Notaris"
                        value={collateral.binding?.outgoingLetterNumber || ""}
                        onChange={(e) =>
                          updateBinding(
                            collateral.id,
                            "outgoingLetterNumber",
                            e.target.value,
                          )
                        }
                        disabled={!canEdit || locked}
                        placeholder="Contoh: 056"
                      />

                      <PkInput
                        label="Status Pengikatan"
                        value={collateral.binding?.status || "BELUM DIPROSES"}
                        disabled
                      />

                      <div className="md:col-span-2 xl:col-span-3">
                        <PkInput
                          label="Catatan Pengikatan"
                          value={collateral.binding?.note || ""}
                          onChange={(e) =>
                            updateBinding(collateral.id, "note", e.target.value)
                          }
                          disabled={!canEdit || locked}
                          placeholder="Catatan proses pengikatan"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Informasi tanpa binding */}
                {!requiresBinding && (
                  <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                    <p className="text-xs font-medium text-zinc-700">
                      Tidak ada pengikatan
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Berdasarkan limit pinjaman saat ini, agunan ini tidak
                      memerlukan SKMHT atau APHT.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && !locked && (
        <button
          type="button"
          onClick={addCollateral}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          <Plus size={16} />
          Tambah Agunan
        </button>
      )}
    </PkSection>
  );
}
