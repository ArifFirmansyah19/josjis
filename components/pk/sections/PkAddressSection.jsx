"use client";

import PkInput from "@/components/pk/shared/PkInput";
import PkSection from "@/components/pk/shared/PkSection";

function formatName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}

function formatRtRw(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 3);
}

export default function PkAddressSection({ pk, setPk, canEdit, locked }) {
  const disabled = !canEdit || locked;

  const updateField = (field, value, formatter = null) => {
    if (disabled) return;

    const formattedValue = formatter ? formatter(value) : value;

    setPk((prev) => ({
      ...prev,
      [field]: formattedValue,
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
            value={pk?.alamat_jalan || ""}
            onChange={(e) => updateField("alamat_jalan", e.target.value)}
            onBlur={(e) =>
              updateField("alamat_jalan", e.target.value, formatName)
            }
            disabled={disabled}
          />
        </div>

        <PkInput
          label="RT"
          value={pk?.rt || ""}
          onChange={(e) => updateField("rt", e.target.value, formatRtRw)}
          disabled={disabled}
          inputMode="numeric"
          maxLength={3}
        />

        <PkInput
          label="RW"
          value={pk?.rw || ""}
          onChange={(e) => updateField("rw", e.target.value, formatRtRw)}
          disabled={disabled}
          inputMode="numeric"
          maxLength={3}
        />

        <PkInput
          label="Desa / Kelurahan"
          value={pk?.alamat_desa_kelurahan || ""}
          onChange={(e) => updateField("alamat_desa_kelurahan", e.target.value)}
          onBlur={(e) =>
            updateField("alamat_desa_kelurahan", e.target.value, formatName)
          }
          disabled={disabled}
        />

        <PkInput
          label="Kecamatan"
          value={pk?.alamat_kecamatan || ""}
          onChange={(e) => updateField("alamat_kecamatan", e.target.value)}
          onBlur={(e) =>
            updateField("alamat_kecamatan", e.target.value, formatName)
          }
          disabled={disabled}
        />

        <PkInput
          label="Kabupaten"
          value={pk?.alamat_kabupaten || ""}
          onChange={(e) => updateField("alamat_kabupaten", e.target.value)}
          onBlur={(e) =>
            updateField("alamat_kabupaten", e.target.value, formatName)
          }
          disabled={disabled}
        />
      </div>
    </PkSection>
  );
}
