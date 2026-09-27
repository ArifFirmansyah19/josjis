"use client";

import PkInput from "@/components/pk/shared/PkInput";
import PkSelect from "@/components/pk/shared/PkSelect";
import PkSection from "@/components/pk/shared/PkSection";

const maritalStatuses = [
  { value: "ISTRI", label: "ISTRI" },
  { value: "SUAMI", label: "SUAMI" },
  { value: "DUDA", label: "DUDA" },
  { value: "JANDA", label: "JANDA" },
  { value: "CERAI HIDUP", label: "CERAI HIDUP" },
  { value: "CERAI MATI", label: "CERAI MATI" },
];

const genders = [
  { value: "LAKI-LAKI", label: "Laki-laki" },
  { value: "PEREMPUAN", label: "Perempuan" },
];

const salutations = [
  { value: "Tuan", label: "Tuan" },
  { value: "Nyonya", label: "Nyonya" },
];

export default function PkDebtorSection({ pk, setPk, canEdit, locked }) {
  const update = (field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <PkSection
      title="Data Debitur"
      description="Identitas dan informasi utama debitur."
      locked={locked}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PkSelect
          label="Status"
          value={pk.maritalStatus || ""}
          onChange={(e) => update("maritalStatus", e.target.value)}
          disabled={!canEdit || locked}
          options={maritalStatuses}
        />

        <PkSelect
          label="Penyebutan"
          value={pk.salutation || ""}
          onChange={(e) => update("salutation", e.target.value)}
          disabled={!canEdit || locked}
          options={salutations}
        />

        <PkInput
          label="Nama Debitur"
          value={pk.debtorName || ""}
          onChange={(e) => update("debtorName", e.target.value)}
          disabled={!canEdit || locked}
        />

        <PkInput
          label="NIK"
          value={pk.nik || ""}
          onChange={(e) => update("nik", e.target.value)}
          disabled={!canEdit || locked}
        />

        <PkSelect
          label="Jenis Kelamin"
          value={pk.gender || ""}
          onChange={(e) => update("gender", e.target.value)}
          disabled={!canEdit || locked}
          options={genders}
        />

        <PkInput
          label="Tempat Lahir"
          value={pk.birthPlace || ""}
          onChange={(e) => update("birthPlace", e.target.value)}
          disabled={!canEdit || locked}
        />

        <PkInput
          label="Tanggal Lahir"
          type="date"
          value={pk.birthDate || ""}
          onChange={(e) => update("birthDate", e.target.value)}
          disabled={!canEdit || locked}
        />
      </div>
    </PkSection>
  );
}
