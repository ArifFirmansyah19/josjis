"use client";

import { useEffect } from "react";

import { Plus, Trash2, UserRound } from "lucide-react";

import PkInput from "@/components/pk/shared/PkInput";

import PkSelect from "@/components/pk/shared/PkSelect";

import PkSection from "@/components/pk/shared/PkSection";

const relationshipOptions = [
  { value: "AYAH", label: "Ayah" },
  { value: "IBU", label: "Ibu" },
  { value: "ANAK", label: "Anak" },
  { value: "SAUDARA", label: "Saudara" },
  { value: "PEMILIK_AGUNAN", label: "Pemilik Agunan" },
];

const accountOptions = [
  { value: "YA", label: "Ya" },
  { value: "TIDAK", label: "Tidak" },
];

function createRelatedParty() {
  return {
    /*
     * ID sementara frontend.
     * Kalau sudah tersimpan di Supabase,
     * ID UUID database akan dipakai.
     */
    id: `REL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    nama: "",
    nik: "",
    hubungan: "",
    phone: "",

    has_account: false,
    cif: "",
    savings_account_number: "",

    /*
     * Alamat
     */
    alamat_sama_debitur: false,
    alamat_jalan: "",
    alamat_rt: "",
    alamat_rw: "",
    alamat_desa_kelurahan: "",
    alamat_kecamatan: "",
    alamat_kabupaten: "",
  };
}

/*
 * Mengambil alamat debitur dari struktur PK.
 */
function getDebtorAddress(pk) {
  return {
    alamat_jalan: pk?.alamat_jalan || "",
    alamat_rt: pk?.rt || "",
    alamat_rw: pk?.rw || "",
    alamat_desa_kelurahan: pk?.alamat_desa_kelurahan || "",
    alamat_kecamatan: pk?.alamat_kecamatan || "",
    alamat_kabupaten: pk?.alamat_kabupaten || "",
  };
}

/*
 * Mengecek apakah alamat debitur benar-benar berubah
 * dibanding alamat pihak terkait.
 */
function isSameAddress(a, b) {
  return (
    (a?.alamat_jalan || "") === (b?.alamat_jalan || "") &&
    (a?.alamat_rt || "") === (b?.alamat_rt || "") &&
    (a?.alamat_rw || "") === (b?.alamat_rw || "") &&
    (a?.alamat_desa_kelurahan || "") === (b?.alamat_desa_kelurahan || "") &&
    (a?.alamat_kecamatan || "") === (b?.alamat_kecamatan || "") &&
    (a?.alamat_kabupaten || "") === (b?.alamat_kabupaten || "")
  );
}

/*
 * Hubungan yang hanya boleh satu orang dalam satu PK.
 */
const singleRelationshipValues = new Set(["AYAH", "IBU"]);

export default function PkRelatedPartySection({ pk, setPk, canEdit, locked }) {
  const relatedParties = pk?.relatedParties || [];

  const isDisabled = !canEdit || locked;

  /*
   * =========================================================
   * MENGAMBIL PILIHAN HUBUNGAN UNTUK SETIAP PARTY
   * =========================================================
   *
   * Ayah dan Ibu hanya boleh dipakai satu kali.
   *
   * Pihak yang sedang diedit tetap mendapatkan pilihannya
   * sendiri agar data yang sudah ada tidak tiba-tiba hilang.
   */
  const getRelationshipOptions = (partyId) => {
    const usedRelationships = new Set(
      relatedParties
        .filter((party) => party?.id !== partyId)
        .map((party) => party?.hubungan)
        .filter(Boolean),
    );

    return relationshipOptions.filter((option) => {
      if (!singleRelationshipValues.has(option.value)) {
        return true;
      }

      return !usedRelationships.has(option.value);
    });
  };

  /*
   * =========================================================
   * SINKRONISASI ALAMAT SESUAI DEBITUR
   * =========================================================
   *
   * Kalau checkbox aktif, alamat pihak terkait mengikuti
   * alamat debitur.
   *
   * Kita juga menyimpan snapshot alamat ke relatedParties.
   */
  useEffect(() => {
    if (!pk || !relatedParties.length) {
      return;
    }

    const debtorAddress = getDebtorAddress(pk);

    const hasPartyUsingDebtorAddress = relatedParties.some(
      (party) => party.alamat_sama_debitur === true,
    );

    if (!hasPartyUsingDebtorAddress) {
      return;
    }

    let changed = false;

    const nextParties = relatedParties.map((party) => {
      if (!party.alamat_sama_debitur) {
        return party;
      }

      const currentAddress = {
        alamat_jalan: party.alamat_jalan || "",
        alamat_rt: party.alamat_rt || "",
        alamat_rw: party.alamat_rw || "",
        alamat_desa_kelurahan: party.alamat_desa_kelurahan || "",
        alamat_kecamatan: party.alamat_kecamatan || "",
        alamat_kabupaten: party.alamat_kabupaten || "",
      };

      if (isSameAddress(currentAddress, debtorAddress)) {
        return party;
      }

      changed = true;

      return {
        ...party,
        ...debtorAddress,
      };
    });

    if (changed) {
      setPk((prev) => ({
        ...prev,
        relatedParties: nextParties,
      }));
    }
  }, [
    pk?.alamat_jalan,
    pk?.rt,
    pk?.rw,
    pk?.alamat_desa_kelurahan,
    pk?.alamat_kecamatan,
    pk?.alamat_kabupaten,
  ]);

  /*
   * =========================================================
   * UPDATE PARTY
   * =========================================================
   */
  const updateParty = (partyId, field, value) => {
    if (isDisabled) {
      return;
    }

    /*
     * Hubungan AYAH dan IBU hanya boleh satu.
     *
     * Kalau user memilih Ayah/Ibu pada party ini,
     * kita cek party lain terlebih dahulu.
     */
    if (field === "hubungan" && singleRelationshipValues.has(value)) {
      const duplicateExists = relatedParties.some(
        (party) => party.id !== partyId && party.hubungan === value,
      );

      if (duplicateExists) {
        return;
      }
    }

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

  /*
   * =========================================================
   * UPDATE REKENING
   * =========================================================
   */
  const updateHasAccount = (partyId, value) => {
    if (isDisabled) {
      return;
    }

    const hasAccount = value === "YA";

    setPk((prev) => ({
      ...prev,

      relatedParties: (prev.relatedParties || []).map((party) =>
        party.id === partyId
          ? {
              ...party,

              has_account: hasAccount,

              /*
               * Kalau tidak memiliki rekening,
               * CIF dan rekening harus dikosongkan.
               */
              ...(hasAccount
                ? {}
                : {
                    cif: "",
                    savings_account_number: "",
                  }),
            }
          : party,
      ),
    }));
  };

  /*
   * =========================================================
   * ALAMAT SESUAI DEBITUR
   * =========================================================
   */
  const updateSameAsDebtor = (partyId, checked) => {
    if (isDisabled) {
      return;
    }

    const debtorAddress = getDebtorAddress(pk);

    setPk((prev) => ({
      ...prev,

      relatedParties: (prev.relatedParties || []).map((party) => {
        if (party.id !== partyId) {
          return party;
        }

        /*
         * Kalau dicentang:
         * langsung copy alamat debitur
         * ke pihak terkait.
         */
        if (checked) {
          return {
            ...party,
            alamat_sama_debitur: true,
            ...debtorAddress,
          };
        }

        /*
         * Kalau dilepas:
         * alamat yang terakhir tersimpan tetap
         * dipertahankan.
         *
         * User bisa mengeditnya kembali.
         */
        return {
          ...party,
          alamat_sama_debitur: false,
        };
      }),
    }));
  };

  /*
   * =========================================================
   * TAMBAH PARTY
   * =========================================================
   */
  const addParty = () => {
    if (isDisabled) {
      return;
    }

    setPk((prev) => ({
      ...prev,

      relatedParties: [...(prev.relatedParties || []), createRelatedParty()],
    }));
  };

  /*
   * =========================================================
   * HAPUS PARTY
   * =========================================================
   */
  const removeParty = (partyId) => {
    if (isDisabled) {
      return;
    }

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
      description="Opsional. Tambahkan pihak lain yang berkaitan dengan PK, agunan, atau proses BAST."
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
            Bagian ini tidak wajib diisi. Tambahkan hanya jika terdapat pihak
            lain yang perlu dicatat dalam data PK atau digunakan dalam dokumen.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {relatedParties.map((party, index) => {
            const hasAccount = Boolean(party.has_account);

            const sameAsDebtor = Boolean(party.alamat_sama_debitur);

            const currentRelationshipOptions = getRelationshipOptions(party.id);

            return (
              <div
                key={party.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4"
              >
                {/* =====================================================
                      HEADER
                  ====================================================== */}
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Pihak Terkait {index + 1}
                    </p>

                    <p className="mt-0.5 text-xs text-zinc-500">
                      Isi sesuai kebutuhan pihak yang terkait.
                    </p>
                  </div>

                  {!isDisabled && (
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
                  {/* ===================================================
                        IDENTITAS
                    ==================================================== */}

                  <PkInput
                    label="Nama"
                    value={party.nama || ""}
                    onChange={(e) =>
                      updateParty(party.id, "nama", e.target.value)
                    }
                    disabled={isDisabled}
                    required
                  />

                  <PkInput
                    label="NIK"
                    value={party.nik || ""}
                    onChange={(e) =>
                      updateParty(
                        party.id,
                        "nik",
                        e.target.value.replace(/\D/g, "").slice(0, 16),
                      )
                    }
                    disabled={isDisabled}
                    inputMode="numeric"
                    maxLength={16}
                    placeholder="16 digit NIK"
                  />

                  <PkSelect
                    label="Hubungan"
                    value={party.hubungan || ""}
                    onChange={(e) =>
                      updateParty(party.id, "hubungan", e.target.value)
                    }
                    disabled={isDisabled}
                    options={currentRelationshipOptions}
                  />

                  <PkInput
                    label="Nomor Telepon"
                    value={party.phone || ""}
                    onChange={(e) =>
                      updateParty(party.id, "phone", e.target.value)
                    }
                    disabled={isDisabled}
                    inputMode="tel"
                    placeholder="08xxxxxxxxxx"
                  />

                  {/* =================================================
                        REKENING
                    ================================================== */}

                  <PkSelect
                    label="Memiliki Rekening?"
                    value={hasAccount ? "YA" : "TIDAK"}
                    onChange={(e) => updateHasAccount(party.id, e.target.value)}
                    disabled={isDisabled}
                    options={accountOptions}
                  />

                  {hasAccount && (
                    <>
                      <PkInput
                        label="CIF"
                        value={party.cif || ""}
                        onChange={(e) =>
                          updateParty(party.id, "cif", e.target.value)
                        }
                        disabled={isDisabled}
                        placeholder="Nomor CIF"
                      />

                      <PkInput
                        label="Nomor Rekening Tabungan"
                        value={party.savings_account_number || ""}
                        onChange={(e) =>
                          updateParty(
                            party.id,
                            "savings_account_number",
                            e.target.value,
                          )
                        }
                        disabled={isDisabled}
                        placeholder="Nomor rekening"
                      />
                    </>
                  )}

                  {/* =================================================
                        ALAMAT
                    ================================================== */}

                  <div className="md:col-span-2 xl:col-span-3">
                    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={sameAsDebtor}
                          onChange={(e) =>
                            updateSameAsDebtor(party.id, e.target.checked)
                          }
                          disabled={isDisabled}
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-300"
                        />

                        <span>
                          <span className="block text-sm font-medium text-zinc-800">
                            Alamat sesuai dengan Debitur
                          </span>

                          <span className="mt-0.5 block text-xs text-zinc-500">
                            Alamat akan mengikuti alamat debitur dan tidak perlu
                            diisi ulang.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-2 xl:col-span-3">
                    <PkInput
                      label="Alamat / Jalan"
                      value={party.alamat_jalan || ""}
                      onChange={(e) =>
                        updateParty(party.id, "alamat_jalan", e.target.value)
                      }
                      disabled={isDisabled || sameAsDebtor}
                    />
                  </div>

                  <PkInput
                    label="RT"
                    value={party.alamat_rt || ""}
                    onChange={(e) =>
                      updateParty(party.id, "alamat_rt", e.target.value)
                    }
                    disabled={isDisabled || sameAsDebtor}
                  />

                  <PkInput
                    label="RW"
                    value={party.alamat_rw || ""}
                    onChange={(e) =>
                      updateParty(party.id, "alamat_rw", e.target.value)
                    }
                    disabled={isDisabled || sameAsDebtor}
                  />

                  <PkInput
                    label="Desa / Kelurahan"
                    value={party.alamat_desa_kelurahan || ""}
                    onChange={(e) =>
                      updateParty(
                        party.id,
                        "alamat_desa_kelurahan",
                        e.target.value,
                      )
                    }
                    disabled={isDisabled || sameAsDebtor}
                  />

                  <PkInput
                    label="Kecamatan"
                    value={party.alamat_kecamatan || ""}
                    onChange={(e) =>
                      updateParty(party.id, "alamat_kecamatan", e.target.value)
                    }
                    disabled={isDisabled || sameAsDebtor}
                  />

                  <PkInput
                    label="Kabupaten"
                    value={party.alamat_kabupaten || ""}
                    onChange={(e) =>
                      updateParty(party.id, "alamat_kabupaten", e.target.value)
                    }
                    disabled={isDisabled || sameAsDebtor}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isDisabled && (
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
