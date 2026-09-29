"use client";

import PkInput from "@/components/pk/shared/PkInput";
import PkSelect from "@/components/pk/shared/PkSelect";
import PkSection from "@/components/pk/shared/PkSection";

const guaranteeProviders = [
  {
    value: "Askrindo",
    label: "Askrindo",
  },
  {
    value: "Jamkrindo",
    label: "Jamkrindo",
  },
];

const insuranceTypes = [
  {
    value: "AFMS",
    label: "AFMS",
  },
  {
    value: "AJK",
    label: "AJK",
  },
];

const advisStatuses = [
  {
    value: "SUDAH",
    label: "Sudah Advis / Posting",
  },
  {
    value: "BELUM",
    label: "Belum Advis / Posting",
  },
];

const postingStatuses = [
  {
    value: "SUDAH",
    label: "Sudah Posting Advis",
  },
  {
    value: "BELUM",
    label: "Belum Posting Advis",
  },
];

function formatRupiah(value) {
  const amount = Number(value || 0);

  if (!amount) {
    return "";
  }

  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export default function PkInsuranceSection({ pk, setPk, canEdit, locked }) {
  const insurance = pk.insurance || {};

  const isKUR = pk.loanType === "KUR";

  const axaEnabled = Boolean(insurance.axa?.enabled);

  const updateInsurance = (field, value) => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => ({
      ...prev,
      insurance: {
        ...(prev.insurance || {}),
        [field]: value,
      },
    }));
  };

  const updateGuarantee = (field, value) => {
    if (!canEdit || locked) {
      return;
    }

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
    if (!canEdit || locked) {
      return;
    }

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
    if (!canEdit || locked) {
      return;
    }

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

  const updateMagi = (value) => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => ({
      ...prev,
      insurance: {
        ...(prev.insurance || {}),
        magi: {
          ...(prev.insurance?.magi || {}),
          advisStatus: value,
        },
      },
    }));
  };

  return (
    <PkSection
      title="Asuransi & Penjaminan"
      description="Data penjaminan, asuransi jiwa, SIJITU, AXA, dan MAGI."
      locked={locked}
    >
      <div className="space-y-6">
        {/* PENJAMINAN KUR */}
        {isKUR && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-zinc-900">
                Polis Penjaminan
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Polis penjaminan hanya berlaku untuk pinjaman KUR.
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
                value={insurance.guarantee?.applicationDate || ""}
                onChange={(e) =>
                  updateGuarantee("applicationDate", e.target.value)
                }
                disabled={!canEdit || locked}
              />
            </div>
          </div>
        )}

        {/* SIJITU */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">SIJITU</p>

            <p className="mt-1 text-xs text-zinc-500">
              Status advis/posting SIJITU.
            </p>
          </div>

          <div className="max-w-md">
            <PkSelect
              label="Status Advis / Posting"
              value={insurance.sijitu?.postingStatus || ""}
              onChange={(e) =>
                updateInsurance("sijitu", {
                  ...(insurance.sijitu || {}),
                  postingStatus: e.target.value,
                })
              }
              disabled={!canEdit || locked}
              options={postingStatuses}
            />
          </div>
        </div>

        {/* ASURANSI JIWA */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">Asuransi Jiwa</p>

            <p className="mt-1 text-xs text-zinc-500">
              Pilih jenis asuransi jiwa dan lengkapi informasi polis.
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

            <PkInput
              label="Nomor Polis"
              value={insurance.life?.policyNumber || ""}
              onChange={(e) =>
                updateLifeInsurance("policyNumber", e.target.value)
              }
              disabled={!canEdit || locked}
            />

            <div>
              <PkInput
                label="Besaran Premi / Yang Dibayarkan"
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

            <PkSelect
              label="Status Advis / Posting"
              value={insurance.life?.advisStatus || ""}
              onChange={(e) =>
                updateLifeInsurance("advisStatus", e.target.value)
              }
              disabled={!canEdit || locked}
              options={advisStatuses}
            />
          </div>
        </div>

        {/* AXA */}
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
                Centang jika fasilitas pinjaman ini menggunakan AXA.
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

              <div>
                <PkInput
                  label="Premi AXA"
                  type="number"
                  value={insurance.axa?.premium ?? ""}
                  onChange={(e) => updateAxa("premium", e.target.value)}
                  disabled={!canEdit || locked}
                  placeholder="50000"
                />

                {insurance.axa?.premium && (
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {formatRupiah(insurance.axa.premium)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MAGI */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">MAGI</p>

            <p className="mt-1 text-xs text-zinc-500">Status advis MAGI.</p>
          </div>

          <div className="max-w-md">
            <PkSelect
              label="Status Advis"
              value={insurance.magi?.advisStatus || ""}
              onChange={(e) => updateMagi(e.target.value)}
              disabled={!canEdit || locked}
              options={advisStatuses}
            />
          </div>
        </div>
      </div>
    </PkSection>
  );
}
