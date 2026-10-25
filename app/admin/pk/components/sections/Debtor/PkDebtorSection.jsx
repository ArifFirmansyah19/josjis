"use client";

import PkInput from "../../shared/PkInput";
import PkSelect from "../../shared/PkSelect";
import PkSection from "../../shared/PkSection";

const maritalStatuses = [
  { value: "", label: "Pilih status" },
  { value: "MENIKAH", label: "Menikah" },
  { value: "LAJANG", label: "Lajang" },
  { value: "DUDA", label: "Duda" },
  { value: "JANDA", label: "Janda" },
  { value: "CERAI HIDUP", label: "Cerai Hidup" },
  { value: "CERAI MATI", label: "Cerai Mati" },
];

const genders = [
  { value: "", label: "Pilih jenis kelamin" },
  { value: "LAKI-LAKI", label: "Laki-laki" },
  { value: "PEREMPUAN", label: "Perempuan" },
];

function getSalutationByGender(gender) {
  if (gender === "LAKI-LAKI") return "Tuan";
  if (gender === "PEREMPUAN") return "Nyonya";
  return "";
}

function calculateAge(birthDate, today = new Date()) {
  if (!birthDate) return null;

  // Hindari pergeseran tanggal akibat zona waktu.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const birth = new Date(year, month - 1, day);

  // Pastikan tanggal lahir valid.
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return null;
  }

  let age = today.getFullYear() - year;

  const birthdayNotReached =
    today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day);

  if (birthdayNotReached) age -= 1;

  return age >= 0 ? age : null;
}

export default function PkDebtorSection({ pk, setPk, canEdit, locked }) {
  const disabled = !canEdit || locked;
  const age = calculateAge(pk?.tanggal_lahir);

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
          value={pk?.status_debitur ?? ""}
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
          onChange={(e) =>
            update("nomor_ktp", e.target.value.replace(/\D/g, "").slice(0, 16))
          }
          disabled={disabled}
          inputMode="numeric"
          maxLength={16}
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

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="text-sm font-medium text-zinc-600">Usia Debitur</p>

          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {age === null ? "—" : `${age} tahun`}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {age === null
              ? "Isi tanggal lahir yang valid."
              : "Dihitung otomatis berdasarkan tanggal hari ini."}
          </p>
        </div>
      </div>
    </PkSection>
  );
}
