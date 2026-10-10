"use client";

import PkInput from "@/components/pk/shared/PkInput";
import PkSelect from "@/components/pk/shared/PkSelect";
import PkSection from "@/components/pk/shared/PkSection";

const guaranteeProviders = [
  { value: "Askrindo", label: "Askrindo" },
  { value: "Jamkrindo", label: "Jamkrindo" },
];

const insuranceTypes = [
  { value: "AFMS", label: "AFMS" },
  { value: "AJK", label: "AJK" },
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

export default function PkInsuranceSection({ pk, setPk, canEdit, locked }) {
  const insurance = pk?.insurance || {};
  const isKUR = String(pk?.loanType || "").toUpperCase() === "KUR";

  const axaEnabled = Boolean(insurance.axa?.enabled);
  const agreementDate = getAgreementDate(pk);

  const updateInsurance = (field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      insurance: {
        ...(prev.insurance || {}),
        [field]: value,
      },
    }));
  };

  const updateGuarantee = (field, value) => {
    if (!canEdit || locked) return;

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
  };

  const updateLifeInsurance = (field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      insurance: {
        ...(prev.insurance || {}),
        life: {
          ...(prev.insurance?.life || {}),
          [field]: value,
        },
      },
    }));
  };

  const updateAxa = (field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      insurance: {
        ...(prev.insurance || {}),
        axa: {
          ...(prev.insurance?.axa || {}),
          [field]: value,
        },
      },
    }));
  };

  const updateMagi = (field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      insurance: {
        ...(prev.insurance || {}),
        magi: {
          ...(prev.insurance?.magi || {}),
          [field]: value,
        },
      },
    }));
  };

  const updateSijitu = (field, value) => {
    if (!canEdit || locked) return;

    setPk((prev) => ({
      ...prev,
      insurance: {
        ...(prev.insurance || {}),
        sijitu: {
          ...(prev.insurance?.sijitu || {}),
          [field]: value,
        },
      },
    }));
  };

  return (
    <PkSection
      title="Asuransi & Penjaminan"
      description="Data penjaminan dan asuransi pada fasilitas PK."
      locked={locked}
    >
      <div className="space-y-6">
        {isKUR && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-zinc-900">
                Polis Penjaminan
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Wajib untuk fasilitas KUR.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <PkSelect
                label="Perusahaan Penjamin"
                value={insurance.guarantee?.provider || ""}
                onChange={(e) => updateGuarantee("provider", e.target.value)}
                disabled={!canEdit || locked}
                options={guaranteeProviders}
              />

              <PkInput
                label="Nomor Polis Penjaminan"
                value={insurance.guarantee?.policyNumber || ""}
                onChange={(e) =>
                  updateGuarantee("policyNumber", e.target.value)
                }
                disabled={!canEdit || locked}
              />

              <PkInput
                label="Tanggal Pengajuan Polis"
                type="date"
                value={agreementDate}
                disabled
              />
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Tanggal pengajuan polis otomatis mengikuti tanggal perjanjian
              kredit / akad.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">SIJITU</p>
            <p className="mt-1 text-xs text-zinc-500">
              Pantau status order dan posting SIJITU.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PkSelect
              label="Status Order"
              value={insurance.sijitu?.orderStatus || "BELUM_DIORDER"}
              onChange={(e) => updateSijitu("orderStatus", e.target.value)}
              disabled={!canEdit || locked}
              options={orderStatuses}
            />

            <PkSelect
              label="Status Posting"
              value={insurance.sijitu?.postingStatus || "BELUM_POSTING"}
              onChange={(e) => updateSijitu("postingStatus", e.target.value)}
              disabled={!canEdit || locked}
              options={postingStatuses}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">MAGI</p>
            <p className="mt-1 text-xs text-zinc-500">
              Status order, posting, dan premi MAGI.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PkSelect
              label="Status Order"
              value={insurance.magi?.orderStatus || "BELUM_DIORDER"}
              onChange={(e) => updateMagi("orderStatus", e.target.value)}
              disabled={!canEdit || locked}
              options={orderStatuses}
            />

            <PkSelect
              label="Status Posting"
              value={insurance.magi?.postingStatus || "BELUM_POSTING"}
              onChange={(e) => updateMagi("postingStatus", e.target.value)}
              disabled={!canEdit || locked}
              options={postingStatuses}
            />

            <div>
              <PkInput
                label="Premi Dibayarkan"
                type="number"
                value={insurance.magi?.premium ?? ""}
                onChange={(e) => updateMagi("premium", e.target.value)}
                disabled={!canEdit || locked}
                placeholder="50000"
              />

              {insurance.magi?.premium && (
                <p className="mt-1.5 text-xs text-zinc-500">
                  {formatRupiah(insurance.magi.premium)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">Asuransi Jiwa</p>
            <p className="mt-1 text-xs text-zinc-500">
              Pilih AFMS atau AJK, kemudian lengkapi status dan premi.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PkSelect
              label="Jenis Asuransi"
              value={insurance.life?.type || ""}
              onChange={(e) => updateLifeInsurance("type", e.target.value)}
              disabled={!canEdit || locked}
              options={insuranceTypes}
            />

            <PkSelect
              label="Status Order"
              value={insurance.life?.orderStatus || "BELUM_DIORDER"}
              onChange={(e) =>
                updateLifeInsurance("orderStatus", e.target.value)
              }
              disabled={!canEdit || locked}
              options={orderStatuses}
            />

            <PkSelect
              label="Status Posting"
              value={insurance.life?.postingStatus || "BELUM_POSTING"}
              onChange={(e) =>
                updateLifeInsurance("postingStatus", e.target.value)
              }
              disabled={!canEdit || locked}
              options={postingStatuses}
            />

            <div>
              <PkInput
                label="Premi Dibayarkan"
                type="number"
                value={insurance.life?.premium ?? ""}
                onChange={(e) => updateLifeInsurance("premium", e.target.value)}
                disabled={!canEdit || locked}
                placeholder="50000"
              />

              {insurance.life?.premium && (
                <p className="mt-1.5 text-xs text-zinc-500">
                  {formatRupiah(insurance.life.premium)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-start gap-3">
            <input
              id="include-axa"
              type="checkbox"
              checked={axaEnabled}
              onChange={(e) => updateAxa("enabled", e.target.checked)}
              disabled={!canEdit || locked}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-300"
            />

            <div>
              <label
                htmlFor="include-axa"
                className="cursor-pointer text-sm font-semibold text-zinc-900"
              >
                Sertakan AXA?
              </label>

              <p className="mt-1 text-xs text-zinc-500">
                Opsional. Aktifkan jika fasilitas menggunakan AXA.
              </p>
            </div>
          </div>

          {axaEnabled && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <PkInput
                label="Nomor Polis AXA"
                value={insurance.axa?.policyNumber || ""}
                onChange={(e) => updateAxa("policyNumber", e.target.value)}
                disabled={!canEdit || locked}
              />

              <PkSelect
                label="Status Order"
                value={insurance.axa?.orderStatus || "BELUM_DIORDER"}
                onChange={(e) => updateAxa("orderStatus", e.target.value)}
                disabled={!canEdit || locked}
                options={orderStatuses}
              />

              <PkSelect
                label="Status Posting"
                value={insurance.axa?.postingStatus || "BELUM_POSTING"}
                onChange={(e) => updateAxa("postingStatus", e.target.value)}
                disabled={!canEdit || locked}
                options={postingStatuses}
              />
            </div>
          )}
        </div>
      </div>
    </PkSection>
  );
}
