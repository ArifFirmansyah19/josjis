"use client";

import PkInput from "@/components/pk/shared/PkInput";
import PkSelect from "@/components/pk/shared/PkSelect";
import PkSection from "@/components/pk/shared/PkSection";

const maritalStatuses = [
  { value: "MENIKAH", label: "Menikah" },
  { value: "LAJANG", label: "Lajang" },
  { value: "DUDA", label: "Duda" },
  { value: "JANDA", label: "Janda" },
  { value: "CERAI HIDUP", label: "Cerai Hidup" },
  { value: "CERAI MATI", label: "Cerai Mati" },
];

const genders = [
  { value: "LAKI-LAKI", label: "Laki-laki" },
  { value: "PEREMPUAN", label: "Perempuan" },
];

function getSalutationByGender(gender) {
  if (gender === "LAKI-LAKI") return "Tuan";
  if (gender === "PEREMPUAN") return "Nyonya";
  return "";
}

export default function PkDebtorSection({ pk, setPk, canEdit, locked }) {
  const disabled = !canEdit || locked;

  const update = (field, value) => {
    if (disabled) return;

    setPk((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenderChange = (value) => {
    if (disabled) return;

    setPk((prev) => ({
      ...prev,
      jenis_kelamin: value,
      penyebutan_debitur: getSalutationByGender(value),
    }));
  };

  const salutation =
    pk?.penyebutan_debitur || getSalutationByGender(pk?.jenis_kelamin);

  return (
    <PkSection
      title="Data Debitur"
      description="Identitas dan informasi utama debitur."
      locked={locked}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PkSelect
          label="Status"
          value={pk?.status_debitur || ""}
          onChange={(e) => update("status_debitur", e.target.value)}
          disabled={disabled}
          options={maritalStatuses}
        />

        <PkInput label="Penyebutan" value={salutation} disabled />

        <PkInput
          label="Nama Debitur"
          value={pk?.nama_debitur || ""}
          onChange={(e) => update("nama_debitur", e.target.value)}
          disabled={disabled}
        />

        <PkInput
          label="NIK"
          value={pk?.nomor_ktp || ""}
          onChange={(e) => update("nomor_ktp", e.target.value)}
          disabled={disabled}
          inputMode="numeric"
        />

        <PkSelect
          label="Jenis Kelamin"
          value={pk?.jenis_kelamin || ""}
          onChange={(e) => handleGenderChange(e.target.value)}
          disabled={disabled}
          options={genders}
        />

        <PkInput
          label="No. HP"
          value={pk?.nomor_handphone || ""}
          onChange={(e) => update("nomor_handphone", e.target.value)}
          disabled={disabled}
          inputMode="tel"
        />

        <PkInput
          label="Tempat Lahir"
          value={pk?.tempat_lahir || ""}
          onChange={(e) => update("tempat_lahir", e.target.value)}
          disabled={disabled}
        />

        <PkInput
          label="Tanggal Lahir"
          type="date"
          value={pk?.tanggal_lahir || ""}
          onChange={(e) => update("tanggal_lahir", e.target.value)}
          disabled={disabled}
        />
      </div>
    </PkSection>
  );
}
