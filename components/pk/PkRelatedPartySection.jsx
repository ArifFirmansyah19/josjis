"use client";

import { Plus, Trash2, UserRound } from "lucide-react";

import PkInput from "@/components/pk/shared/PkInput";
import PkSelect from "@/components/pk/shared/PkSelect";
import PkSection from "@/components/pk/shared/PkSection";

const relationshipOptions = [
  { value: "SUAMI", label: "Suami" },
  { value: "ISTRI", label: "Istri" },
  { value: "AYAH", label: "Ayah" },
  { value: "IBU", label: "Ibu" },
  { value: "ANAK", label: "Anak" },
  { value: "SAUDARA", label: "Saudara" },
  { value: "PEMILIK_AGUNAN", label: "Pemilik Agunan" },
  { value: "LAINNYA", label: "Lainnya" },
];

function createRelatedParty() {
  return {
    id: `REL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    name: "",
    nik: "",
    relationship: "",

    address: {
      street: "",
      rt: "",
      rw: "",
      village: "",
      district: "",
      regency: "",
    },
  };
}

export default function PkRelatedPartySection({ pk, setPk, canEdit, locked }) {
  const relatedParties = pk.relatedParties || [];

  const updateParty = (partyId, field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      relatedParties: (prev.relatedParties || []).map((party) =>
        party.id === partyId
          ? {
              ...party,
              [field]: value,
            }
          : party,
      ),
    }));
  };

  const updatePartyAddress = (partyId, field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      relatedParties: (prev.relatedParties || []).map((party) =>
        party.id === partyId
          ? {
              ...party,
              address: {
                ...(party.address || {}),
                [field]: value,
              },
            }
          : party,
      ),
    }));
  };

  const addParty = () => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      relatedParties: [...(prev.relatedParties || []), createRelatedParty()],
    }));
  };

  const removeParty = (partyId) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      relatedParties: (prev.relatedParties || []).filter(
        (party) => party.id !== partyId,
      ),
    }));
  };

  return (
    <PkSection
      title="Pihak Terkait"
      description="Opsional. Tambahkan pihak yang berkaitan dengan PK atau proses BAST."
      locked={locked}
    >
      {relatedParties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-5 py-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200">
            <UserRound size={18} />
          </div>

          <p className="mt-3 text-sm font-medium text-zinc-700">
            Belum ada pihak terkait
          </p>

          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-zinc-500">
            Bagian ini tidak wajib diisi. Tambahkan hanya jika ada pihak lain
            yang perlu dicatat atau digunakan dalam dokumen BAST.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {relatedParties.map((party, index) => {
            const address = party.address || {};

            return (
              <div
                key={party.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Pihak Terkait {index + 1}
                    </p>

                    <p className="mt-0.5 text-xs text-zinc-500">
                      Data pihak yang dapat digunakan dalam proses BAST.
                    </p>
                  </div>

                  {canEdit && !locked && (
                    <button
                      type="button"
                      onClick={() => removeParty(party.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <PkInput
                    label="Nama"
                    value={party.name || ""}
                    onChange={(e) =>
                      updateParty(party.id, "name", e.target.value)
                    }
                    disabled={!canEdit || locked}
                  />

                  <PkInput
                    label="NIK"
                    value={party.nik || ""}
                    onChange={(e) =>
                      updateParty(party.id, "nik", e.target.value)
                    }
                    disabled={!canEdit || locked}
                  />

                  <PkSelect
                    label="Hubungan"
                    value={party.relationship || ""}
                    onChange={(e) =>
                      updateParty(party.id, "relationship", e.target.value)
                    }
                    disabled={!canEdit || locked}
                    options={relationshipOptions}
                  />

                  <div className="md:col-span-2 xl:col-span-3">
                    <PkInput
                      label="Alamat / Jalan"
                      value={address.street || ""}
                      onChange={(e) =>
                        updatePartyAddress(party.id, "street", e.target.value)
                      }
                      disabled={!canEdit || locked}
                    />
                  </div>

                  <PkInput
                    label="RT"
                    value={address.rt || ""}
                    onChange={(e) =>
                      updatePartyAddress(party.id, "rt", e.target.value)
                    }
                    disabled={!canEdit || locked}
                  />

                  <PkInput
                    label="RW"
                    value={address.rw || ""}
                    onChange={(e) =>
                      updatePartyAddress(party.id, "rw", e.target.value)
                    }
                    disabled={!canEdit || locked}
                  />

                  <PkInput
                    label="Desa / Kelurahan"
                    value={address.village || ""}
                    onChange={(e) =>
                      updatePartyAddress(party.id, "village", e.target.value)
                    }
                    disabled={!canEdit || locked}
                  />

                  <PkInput
                    label="Kecamatan"
                    value={address.district || ""}
                    onChange={(e) =>
                      updatePartyAddress(party.id, "district", e.target.value)
                    }
                    disabled={!canEdit || locked}
                  />

                  <PkInput
                    label="Kabupaten"
                    value={address.regency || ""}
                    onChange={(e) =>
                      updatePartyAddress(party.id, "regency", e.target.value)
                    }
                    disabled={!canEdit || locked}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canEdit && !locked && (
        <button
          type="button"
          onClick={addParty}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          <Plus size={16} />
          Tambah Pihak Terkait
        </button>
      )}
    </PkSection>
  );
}
