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

export default function PkSpouseSection({ pk, setPk, canEdit, locked }) {
  const disabled = !canEdit || locked;

  /*
   * Section pasangan seharusnya hanya dipanggil ketika MENIKAH.
   * Tetap kita beri pengaman di level component.
   */
  if (pk?.status_debitur !== "MENIKAH") {
    return null;
  }

  const sameAddress = Boolean(pk?.alamat_pasangan_sama_debitur);

  const updateField = (field, value) => {
    if (disabled) return;

    setPk((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateRtRw = (field, value) => {
    if (disabled || sameAddress) return;

    setPk((prev) => ({
      ...prev,
      [field]: formatRtRw(value),
    }));
  };

  const updateAddressName = (field, value) => {
    if (disabled || sameAddress) return;

    setPk((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatAddressOnBlur = (field, value) => {
    if (disabled || sameAddress) return;

    setPk((prev) => ({
      ...prev,
      [field]: formatName(value),
    }));
  };

  const handleSameAddressChange = (checked) => {
    if (disabled) return;

    setPk((prev) => ({
      ...prev,
      alamat_pasangan_sama_debitur: checked,

      /*
       * Ketika dicentang, langsung salin alamat debitur
       * ke data pasangan.
       */
      ...(checked
        ? {
            alamat_pasangan_jalan: prev.alamat_jalan || "",
            alamat_pasangan_rt: prev.rt || "",
            alamat_pasangan_rw: prev.rw || "",
            alamat_pasangan_desa_kelurahan: prev.alamat_desa_kelurahan || "",
            alamat_pasangan_kecamatan: prev.alamat_kecamatan || "",
            alamat_pasangan_kabupaten: prev.alamat_kabupaten || "",
          }
        : {}),
    }));
  };

  return (
    <PkSection
      title="Data Pasangan"
      description="Data pasangan debitur dan alamat pasangan."
      locked={locked}
    >
      <div className="space-y-5">
        {/* ================================================================
            IDENTITAS PASANGAN
        ================================================================ */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">
              Identitas Pasangan
            </h3>

            <p className="mt-1 text-xs text-zinc-500">
              Data pasangan hanya diperlukan untuk debitur dengan status
              MENIKAH.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PkInput
              label="Nama Pasangan"
              value={pk?.nama_pasangan || ""}
              onChange={(e) => updateField("nama_pasangan", e.target.value)}
              disabled={disabled}
              placeholder="Nama pasangan"
            />

            <PkInput
              label="NIK Pasangan"
              value={pk?.nik_pasangan || ""}
              onChange={(e) =>
                updateField(
                  "nik_pasangan",
                  e.target.value.replace(/\D/g, "").slice(0, 16),
                )
              }
              disabled={disabled}
              inputMode="numeric"
              maxLength={16}
              placeholder="16 digit NIK"
            />

            <PkInput
              label="No. HP Pasangan"
              value={pk?.nomor_handphone_pasangan || ""}
              onChange={(e) =>
                updateField("nomor_handphone_pasangan", e.target.value)
              }
              disabled={disabled}
              inputMode="tel"
              placeholder="Nomor HP pasangan"
            />
          </div>
        </div>

        {/* ================================================================
            ALAMAT
        ================================================================ */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">
              Alamat Pasangan
            </h3>

            <p className="mt-1 text-xs text-zinc-500">
              Alamat pasangan dapat mengikuti alamat debitur atau diisi
              terpisah.
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <label
              className={[
                "flex items-start gap-3",
                !disabled ? "cursor-pointer" : "cursor-default",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={sameAddress}
                onChange={(e) => handleSameAddressChange(e.target.checked)}
                disabled={disabled}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300"
              />

              <span>
                <span className="block text-sm font-medium text-zinc-800">
                  Alamat sama dengan debitur
                </span>

                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  Jika dicentang, alamat pasangan otomatis mengikuti alamat
                  debitur.
                </span>
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="md:col-span-2 xl:col-span-3">
              <PkInput
                label="Alamat / Jalan"
                value={
                  sameAddress
                    ? pk?.alamat_jalan || ""
                    : pk?.alamat_pasangan_jalan || ""
                }
                onChange={(e) =>
                  updateAddressName("alamat_pasangan_jalan", e.target.value)
                }
                onBlur={(e) =>
                  formatAddressOnBlur("alamat_pasangan_jalan", e.target.value)
                }
                disabled={disabled || sameAddress}
                placeholder="Alamat / jalan"
              />
            </div>

            <PkInput
              label="RT"
              value={sameAddress ? pk?.rt || "" : pk?.alamat_pasangan_rt || ""}
              onChange={(e) => updateRtRw("alamat_pasangan_rt", e.target.value)}
              disabled={disabled || sameAddress}
              inputMode="numeric"
              maxLength={3}
              placeholder="001"
            />

            <PkInput
              label="RW"
              value={sameAddress ? pk?.rw || "" : pk?.alamat_pasangan_rw || ""}
              onChange={(e) => updateRtRw("alamat_pasangan_rw", e.target.value)}
              disabled={disabled || sameAddress}
              inputMode="numeric"
              maxLength={3}
              placeholder="001"
            />

            <PkInput
              label="Desa / Kelurahan"
              value={
                sameAddress
                  ? pk?.alamat_desa_kelurahan || ""
                  : pk?.alamat_pasangan_desa_kelurahan || ""
              }
              onChange={(e) =>
                updateAddressName(
                  "alamat_pasangan_desa_kelurahan",
                  e.target.value,
                )
              }
              onBlur={(e) =>
                formatAddressOnBlur(
                  "alamat_pasangan_desa_kelurahan",
                  e.target.value,
                )
              }
              disabled={disabled || sameAddress}
              placeholder="Desa / Kelurahan"
            />

            <PkInput
              label="Kecamatan"
              value={
                sameAddress
                  ? pk?.alamat_kecamatan || ""
                  : pk?.alamat_pasangan_kecamatan || ""
              }
              onChange={(e) =>
                updateAddressName("alamat_pasangan_kecamatan", e.target.value)
              }
              onBlur={(e) =>
                formatAddressOnBlur("alamat_pasangan_kecamatan", e.target.value)
              }
              disabled={disabled || sameAddress}
              placeholder="Kecamatan"
            />

            <PkInput
              label="Kabupaten"
              value={
                sameAddress
                  ? pk?.alamat_kabupaten || ""
                  : pk?.alamat_pasangan_kabupaten || ""
              }
              onChange={(e) =>
                updateAddressName("alamat_pasangan_kabupaten", e.target.value)
              }
              onBlur={(e) =>
                formatAddressOnBlur("alamat_pasangan_kabupaten", e.target.value)
              }
              disabled={disabled || sameAddress}
              placeholder="Kabupaten"
            />
          </div>
        </div>
      </div>
    </PkSection>
  );
}
