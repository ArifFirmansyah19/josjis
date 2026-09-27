"use client";

import PkInput from "@/components/pk/shared/PkInput";
import PkSection from "@/components/pk/shared/PkSection";

export default function PkAddressSection({ pk, setPk, canEdit, locked }) {
  const address = pk.address || {};

  const updateAddress = (field, value) => {
    setPk((prev) => ({
      ...prev,
      address: {
        ...(prev.address || {}),
        [field]: value,
      },
    }));
  };

  return (
    <PkSection
      title="Alamat Debitur"
      description="Alamat tempat tinggal debitur."
      locked={locked}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <PkInput
            label="Alamat / Jalan"
            value={address.street || ""}
            onChange={(e) => updateAddress("street", e.target.value)}
            disabled={!canEdit}
          />
        </div>

        <PkInput
          label="RT"
          value={address.rt || ""}
          onChange={(e) => updateAddress("rt", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="RW"
          value={address.rw || ""}
          onChange={(e) => updateAddress("rw", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="Desa / Kelurahan"
          value={address.village || ""}
          onChange={(e) => updateAddress("village", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="Kecamatan"
          value={address.district || ""}
          onChange={(e) => updateAddress("district", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="Kabupaten"
          value={address.regency || ""}
          onChange={(e) => updateAddress("regency", e.target.value)}
          disabled={!canEdit}
        />
      </div>
    </PkSection>
  );
}
