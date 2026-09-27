"use client";

import PkInput from "@/components/pk/shared/PkInput";
import PkSection from "@/components/pk/shared/PkSection";

const EMPTY_ADDRESS = {
  street: "",
  rt: "",
  rw: "",
  village: "",
  district: "",
  regency: "",
};

export default function PkSpouseSection({ pk, setPk, canEdit, locked }) {
  const spouse = pk.spouse || {};

  const debtorAddress = pk.address || EMPTY_ADDRESS;

  const spouseAddress = spouse.sameAddress
    ? debtorAddress
    : spouse.address || EMPTY_ADDRESS;

  const updateSpouse = (field, value) => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => ({
      ...prev,
      spouse: {
        ...(prev.spouse || {}),
        [field]: value,
      },
    }));
  };

  const updateSpouseAddress = (field, value) => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => ({
      ...prev,
      spouse: {
        ...(prev.spouse || {}),
        sameAddress: false,
        address: {
          ...(prev.spouse?.address || EMPTY_ADDRESS),
          [field]: value,
        },
      },
    }));
  };

  const handleSameAddressChange = (checked) => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => ({
      ...prev,
      spouse: {
        ...(prev.spouse || {}),
        sameAddress: checked,
        address: checked
          ? {
              ...(prev.address || EMPTY_ADDRESS),
            }
          : {
              ...(prev.spouse?.address || EMPTY_ADDRESS),
            },
      },
    }));
  };

  return (
    <PkSection
      title="Data Pasangan"
      description="Data pasangan debitur dan alamat pasangan."
      locked={locked}
    >
      <div className="space-y-5">
        {/* NAMA PASANGAN */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PkInput
            label="Nama Pasangan"
            value={spouse.name || ""}
            onChange={(e) => updateSpouse("name", e.target.value)}
            disabled={!canEdit}
            placeholder="Nama pasangan"
          />
        </div>

        {/* SAME ADDRESS */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <label
            className={[
              "flex items-start gap-3",
              canEdit && !locked ? "cursor-pointer" : "cursor-default",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={Boolean(spouse.sameAddress)}
              onChange={(e) => handleSameAddressChange(e.target.checked)}
              disabled={!canEdit || locked}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300"
            />

            <span>
              <span className="block text-sm font-medium text-zinc-800">
                Alamat sesuai data suami/istri
              </span>

              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                Jika dicentang, alamat pasangan otomatis mengikuti alamat
                debitur dan tidak perlu diinput ulang.
              </span>
            </span>
          </label>
        </div>

        {/* ADDRESS */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">
              Alamat Pasangan
            </h3>

            <p className="mt-1 text-xs text-zinc-500">
              {spouse.sameAddress
                ? "Alamat mengikuti data alamat debitur."
                : "Alamat pasangan diisi secara manual."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="md:col-span-2 xl:col-span-3">
              <PkInput
                label="Alamat / Jalan"
                value={spouseAddress.street || ""}
                onChange={(e) => updateSpouseAddress("street", e.target.value)}
                disabled={!canEdit || locked || Boolean(spouse.sameAddress)}
              />
            </div>

            <PkInput
              label="RT"
              value={spouseAddress.rt || ""}
              onChange={(e) => updateSpouseAddress("rt", e.target.value)}
              disabled={!canEdit || locked || Boolean(spouse.sameAddress)}
            />

            <PkInput
              label="RW"
              value={spouseAddress.rw || ""}
              onChange={(e) => updateSpouseAddress("rw", e.target.value)}
              disabled={!canEdit || locked || Boolean(spouse.sameAddress)}
            />

            <PkInput
              label="Desa / Kelurahan"
              value={spouseAddress.village || ""}
              onChange={(e) => updateSpouseAddress("village", e.target.value)}
              disabled={!canEdit || locked || Boolean(spouse.sameAddress)}
            />

            <PkInput
              label="Kecamatan"
              value={spouseAddress.district || ""}
              onChange={(e) => updateSpouseAddress("district", e.target.value)}
              disabled={!canEdit || locked || Boolean(spouse.sameAddress)}
            />

            <PkInput
              label="Kabupaten"
              value={spouseAddress.regency || ""}
              onChange={(e) => updateSpouseAddress("regency", e.target.value)}
              disabled={!canEdit || locked || Boolean(spouse.sameAddress)}
            />
          </div>
        </div>
      </div>
    </PkSection>
  );
}
