"use client";

import PkInput from "../../shared/PkInput";
import PkSelect from "../../shared/PkSelect";
import PkSection from "../../shared/PkSection";

const guaranteeProviders = [
  { value: "Askrindo", label: "Askrindo" },
  { value: "Jamkrindo", label: "Jamkrindo" },
];

const orderStatuses = [
  { value: "SUDAH_DIORDER", label: "Sudah Diorder" },
  { value: "BELUM_DIORDER", label: "Belum Diorder" },
];

const postingStatuses = [
  { value: "SUDAH_POSTING", label: "Sudah Posting" },
  { value: "BELUM_POSTING", label: "Belum Posting" },
];

function formatRupiah(value) {
  const amount = Number(value || 0);
  if (!amount) return "";
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function getAgreementDate(pk) {
  return (
    pk?.tanggalPerjanjianKredit ||
    pk?.tanggalAkad ||
    pk?.tglPerjanjianKredit ||
    pk?.tglAkad ||
    pk?.pkDate ||
    pk?.tanggalPk ||
    ""
  );
}

function getPkIdentity(pk) {
  return pk?.id || pk?.pkId || pk?.nomorPK || pk?.noPK || pk?.nomorPk || "";
}

function PremiumField({ label, value, onChange, disabled }) {
  return (
    <div>
      <PkInput
        label={label}
        type="number"
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        placeholder="Masukkan nominal premi"
      />

      {value !== "" && value != null && Number(value) > 0 && (
        <p className="mt-1.5 text-xs text-zinc-500">{formatRupiah(value)}</p>
      )}
    </div>
  );
}

export default function PkInsuranceSection({ pk, setPk, canEdit, locked }) {
  const insurance = pk?.insurance || {};
  const isKUR =
    String(pk?.loanType || pk?.jenisKredit || "")
      .trim()
      .toUpperCase() === "KUR";

  const agreementDate = getAgreementDate(pk);
  const pkIdentity = getPkIdentity(pk);
  const disabled = !canEdit || locked;

  // Semua perubahan diarahkan ke objek PK yang sedang aktif.
  function updateInsuranceSection(section, field, value) {
    if (disabled) return;

    setPk((prev) => ({
      ...prev,
      insurance: {
        ...(prev.insurance || {}),
        [section]: {
          ...(prev.insurance?.[section] || {}),
          [field]: value,
        },
      },
    }));
  }

  function updateGuarantee(field, value) {
    if (disabled) return;

    setPk((prev) => ({
      ...prev,
      insurance: {
        ...(prev.insurance || {}),
        guarantee: {
          ...(prev.insurance?.guarantee || {}),
          [field]: value,
        },
      },
    }));
  }

  return (
    <PkSection
      title="Asuransi & Penjaminan"
      description="Data asuransi dan penjaminan untuk PK yang sedang dibuka."
      locked={locked}
    >
      <div className="space-y-6">
        {/* Identitas PK aktif */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
            Data PK aktif
          </p>

          <p className="mt-1 break-all text-sm font-semibold text-blue-950">
            {pkIdentity || "PK baru — belum memiliki ID"}
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-800">
            Data yang diedit pada bagian ini mengikuti PK yang diberikan oleh
            halaman induk. Pastikan halaman induk memuat dan menyimpan data
            berdasarkan ID PK yang sama.
          </p>
        </div>

        {/* Penjaminan KUR */}
        {isKUR && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-zinc-900">
                Polis Penjaminan KUR
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Data perusahaan penjamin dan nomor polis untuk fasilitas KUR.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <PkSelect
                label="Perusahaan Penjamin"
                value={insurance.guarantee?.provider || ""}
                onChange={(e) => updateGuarantee("provider", e.target.value)}
                disabled={disabled}
                options={guaranteeProviders}
              />

              <PkInput
                label="Nomor Polis Penjaminan"
                value={insurance.guarantee?.policyNumber || ""}
                onChange={(e) =>
                  updateGuarantee("policyNumber", e.target.value)
                }
                disabled={disabled}
              />

              <PkInput
                label="Tanggal Perjanjian Kredit"
                type="date"
                value={agreementDate}
                disabled
              />
            </div>
          </div>
        )}

        {/* SIJITU */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">SIJITU</p>
            <p className="mt-1 text-xs text-zinc-500">
              Status order dan posting SIJITU untuk PK ini.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PkSelect
              label="Status Order"
              value={insurance.sijitu?.orderStatus || "BELUM_DIORDER"}
              onChange={(e) =>
                updateInsuranceSection("sijitu", "orderStatus", e.target.value)
              }
              disabled={disabled}
              options={orderStatuses}
            />

            <PkSelect
              label="Status Posting"
              value={insurance.sijitu?.postingStatus || "BELUM_POSTING"}
              onChange={(e) =>
                updateInsuranceSection(
                  "sijitu",
                  "postingStatus",
                  e.target.value,
                )
              }
              disabled={disabled}
              options={postingStatuses}
            />
          </div>
        </div>

        {/* AII MAGI */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">AII MAGI</p>
            <p className="mt-1 text-xs text-zinc-500">
              AII MAGI dicatat sebagai satu pasangan nama, bukan dua pilihan
              asuransi terpisah.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PkSelect
              label="Status Order"
              value={insurance.magi?.orderStatus || "BELUM_DIORDER"}
              onChange={(e) =>
                updateInsuranceSection("magi", "orderStatus", e.target.value)
              }
              disabled={disabled}
              options={orderStatuses}
            />

            <PkSelect
              label="Status Posting"
              value={insurance.magi?.postingStatus || "BELUM_POSTING"}
              onChange={(e) =>
                updateInsuranceSection("magi", "postingStatus", e.target.value)
              }
              disabled={disabled}
              options={postingStatuses}
            />

            <PremiumField
              label="Premi AII MAGI"
              value={insurance.magi?.premium ?? ""}
              onChange={(e) =>
                updateInsuranceSection("magi", "premium", e.target.value)
              }
              disabled={disabled}
            />
          </div>
        </div>

        {/* AJK AMFS */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">AJK AMFS</p>
            <p className="mt-1 text-xs text-zinc-500">
              AJK AMFS dicatat sebagai satu pasangan nama, bukan pilihan
              terpisah antara AJK dan AMFS.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PkSelect
              label="Status Order"
              value={insurance.life?.orderStatus || "BELUM_DIORDER"}
              onChange={(e) =>
                updateInsuranceSection("life", "orderStatus", e.target.value)
              }
              disabled={disabled}
              options={orderStatuses}
            />

            <PkSelect
              label="Status Posting"
              value={insurance.life?.postingStatus || "BELUM_POSTING"}
              onChange={(e) =>
                updateInsuranceSection("life", "postingStatus", e.target.value)
              }
              disabled={disabled}
              options={postingStatuses}
            />

            <PremiumField
              label="Premi AJK AMFS"
              value={insurance.life?.premium ?? ""}
              onChange={(e) =>
                updateInsuranceSection("life", "premium", e.target.value)
              }
              disabled={disabled}
            />

            <PkInput
              label="Nomor Polis AJK AMFS"
              value={insurance.life?.policyNumber || ""}
              onChange={(e) =>
                updateInsuranceSection("life", "policyNumber", e.target.value)
              }
              disabled={disabled}
            />
          </div>
        </div>

        {/* MMS */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">MMS</p>
            <p className="mt-1 text-xs text-zinc-500">
              Catat status MMS apabila skema ini digunakan pada PK.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PkSelect
              label="Status Order"
              value={insurance.mms?.orderStatus || "BELUM_DIORDER"}
              onChange={(e) =>
                updateInsuranceSection("mms", "orderStatus", e.target.value)
              }
              disabled={disabled}
              options={orderStatuses}
            />

            <PkSelect
              label="Status Posting"
              value={insurance.mms?.postingStatus || "BELUM_POSTING"}
              onChange={(e) =>
                updateInsuranceSection("mms", "postingStatus", e.target.value)
              }
              disabled={disabled}
              options={postingStatuses}
            />

            <PremiumField
              label="Premi MMS"
              value={insurance.mms?.premium ?? ""}
              onChange={(e) =>
                updateInsuranceSection("mms", "premium", e.target.value)
              }
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </PkSection>
  );
}
