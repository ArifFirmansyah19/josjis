"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Eye, FileText, Save, Trash2 } from "lucide-react";

import PkSection from "@/components/pk/shared/PkSection";
import PkInput from "@/components/pk/shared/PkInput";
import PkSelect from "@/components/pk/shared/PkSelect";

import BastPreviewModal from "@/components/pk/bast/BastPreviewModal";
import { createBastDescription } from "@/lib/pk/bastRules";
import { generateBastPdf } from "@/lib/pk/generateBastPdf";
import { getUnitMaster } from "@/lib/master/unitMaster";

const destinationOptions = [
  {
    value: "",
    label: "Pilih tujuan",
  },
  {
    value: "DEBITUR",
    label: "Debitur",
  },
  {
    value: "NOTARIS",
    label: "Notaris",
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getOwners(collateral) {
  if (Array.isArray(collateral?.owners) && collateral.owners.length > 0) {
    return collateral.owners.filter((owner) => owner?.name);
  }

  if (collateral?.owner) {
    return [
      {
        id: `${collateral.id}-OWNER-0`,
        name: collateral.owner,
        nik: "",
      },
    ];
  }

  return [];
}

function isWaris(collateral) {
  return String(collateral?.relationship || "").toUpperCase() === "WARIS";
}

export default function PkBastSection({ pk, setPk, canEdit, locked }) {
  const collaterals = Array.isArray(pk.collaterals) ? pk.collaterals : [];

  const bast = pk.bast || {};

  const [previewOpen, setPreviewOpen] = useState(false);

  const [generating, setGenerating] = useState(false);

  /*
   * ============================================================
   * MASTER UNIT
   * ============================================================
   *
   * Pihak Kedua tidak lagi diinput manual.
   * Data otomatis diambil berdasarkan unit PK.
   */
  const unitMaster = getUnitMaster(pk.unit);

  const secondParty = unitMaster?.mbm || {
    name: "",
    nip: "",
    position: "MBM",
  };

  const secondPartyUnitName = unitMaster?.name || pk.unitName || pk.unit || "-";

  /*
   * ============================================================
   * AGUNAN
   * ============================================================
   */

  const selectedCollateralIds = Array.isArray(bast.collateralIds)
    ? bast.collateralIds
    : [];

  const selectedCollaterals = useMemo(() => {
    return collaterals.filter((collateral) =>
      selectedCollateralIds.includes(collateral.id),
    );
  }, [collaterals, selectedCollateralIds]);

  /*
   * ============================================================
   * KETERANGAN SURAT
   * ============================================================
   */

  const description = createBastDescription({
    number: bast.number || "",
    collaterals: selectedCollaterals,
    debtorName: pk.debtorName || "",
  });

  /*
   * ============================================================
   * PIHAK TERKAIT
   * ============================================================
   */

  const relatedParties = Array.isArray(pk.relatedParties)
    ? pk.relatedParties
    : [];

  const selectedSignerPartyIds = Array.isArray(bast.signerPartyIds)
    ? bast.signerPartyIds
    : [];

  const selectedSignerOwnerIds = Array.isArray(bast.signerOwnerIds)
    ? bast.signerOwnerIds
    : [];

  /*
   * ============================================================
   * PIHAK TERKAIT YANG MENANDATANGANI
   * ============================================================
   */

  const selectedRelatedParties = relatedParties.filter((party) =>
    selectedSignerPartyIds.includes(party.id),
  );

  /*
   * ============================================================
   * PEMILIK WARIS YANG MENANDATANGANI
   * ============================================================
   */

  const warisOwnerOptions = useMemo(() => {
    const options = [];

    selectedCollaterals.forEach((collateral) => {
      if (!isWaris(collateral)) {
        return;
      }

      getOwners(collateral).forEach((owner, ownerIndex) => {
        const ownerId = owner.id || `${collateral.id}-OWNER-${ownerIndex}`;

        const exists = options.some((item) => item.id === ownerId);

        if (!exists) {
          options.push({
            id: ownerId,
            name: owner.name,
            nik: owner.nik || "",
            collateralNumber: collateral.number || "-",
          });
        }
      });
    });

    return options;
  }, [selectedCollaterals]);

  /*
   * ============================================================
   * UPDATE BAST
   * ============================================================
   */

  const updateBast = (field, value) => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => ({
      ...prev,
      bast: {
        ...(prev.bast || {}),
        [field]: value,
      },
    }));
  };

  /*
   * ============================================================
   * TOGGLE AGUNAN
   * ============================================================
   */

  const toggleCollateral = (collateralId) => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => {
      const currentIds = Array.isArray(prev.bast?.collateralIds)
        ? prev.bast.collateralIds
        : [];

      const exists = currentIds.includes(collateralId);

      const nextIds = exists
        ? currentIds.filter((id) => id !== collateralId)
        : [...currentIds, collateralId];

      return {
        ...prev,
        bast: {
          ...(prev.bast || {}),
          collateralIds: nextIds,
        },
      };
    });
  };

  /*
   * ============================================================
   * TOGGLE PIHAK TERKAIT
   * ============================================================
   */

  const toggleRelatedParty = (partyId) => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => {
      const currentIds = Array.isArray(prev.bast?.signerPartyIds)
        ? prev.bast.signerPartyIds
        : [];

      const exists = currentIds.includes(partyId);

      const nextIds = exists
        ? currentIds.filter((id) => id !== partyId)
        : [...currentIds, partyId];

      return {
        ...prev,
        bast: {
          ...(prev.bast || {}),
          signerPartyIds: nextIds,
        },
      };
    });
  };

  /*
   * ============================================================
   * TOGGLE PEMILIK WARIS
   * ============================================================
   */

  const toggleWarisOwner = (ownerId) => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => {
      const currentIds = Array.isArray(prev.bast?.signerOwnerIds)
        ? prev.bast.signerOwnerIds
        : [];

      const exists = currentIds.includes(ownerId);

      const nextIds = exists
        ? currentIds.filter((id) => id !== ownerId)
        : [...currentIds, ownerId];

      return {
        ...prev,
        bast: {
          ...(prev.bast || {}),
          signerOwnerIds: nextIds,
        },
      };
    });
  };

  /*
   * ============================================================
   * PREVIEW
   * ============================================================
   */

  const handlePreview = () => {
    if (!bast.number) {
      return;
    }

    if (!bast.date) {
      return;
    }

    if (selectedCollaterals.length === 0) {
      return;
    }

    setPreviewOpen(true);
  };

  /*
   * ============================================================
   * SIMPAN BAST
   * ============================================================
   */

  const handleSaveBast = () => {
    if (!canEdit || locked) {
      return;
    }

    const savedBast = {
      ...clone(bast),

      description,

      /*
       * Pihak Kedua otomatis.
       */
      secondPartyName: secondParty.name,

      secondPartyNip: secondParty.nip,

      secondPartyPosition: secondParty.position,

      unitName: secondPartyUnitName,

      status: "TERSIMPAN",

      savedAt: new Date().toISOString(),
    };

    setPk((prev) => ({
      ...prev,
      bast: savedBast,
    }));
  };

  /*
   * ============================================================
   * GENERATE PDF
   * ============================================================
   */

  const handleGeneratePdf = () => {
    if (generating) {
      return;
    }

    if (selectedCollaterals.length === 0) {
      return;
    }

    if (!bast.number || !bast.date) {
      return;
    }

    try {
      setGenerating(true);

      const generatedBast = {
        ...clone(bast),

        description,

        /*
         * Pihak Kedua otomatis berdasarkan unit.
         */
        secondPartyName: secondParty.name,

        secondPartyNip: secondParty.nip,

        secondPartyPosition: secondParty.position,

        unitName: secondPartyUnitName,

        status: "PDF_GENERATED",

        pdfGenerated: true,

        savedAt: new Date().toISOString(),
      };

      const filename = generateBastPdf({
        pk,
        bast: generatedBast,
        collaterals: selectedCollaterals,
      });

      setPk((prev) => ({
        ...prev,
        bast: generatedBast,
      }));

      if (filename) {
        console.info(`PDF BAST berhasil dibuat: ${filename}`);
      }
    } catch (error) {
      console.error("Gagal membuat PDF BAST:", error);
    } finally {
      setGenerating(false);
    }
  };

  /*
   * ============================================================
   * RESET
   * ============================================================
   */

  const handleClearBast = () => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => ({
      ...prev,
      bast: {
        ...(prev.bast || {}),

        number: "",
        date: "",
        description: "",
        destination: "",
        notaryName: "",

        collateralIds: [],

        signerPartyIds: [],

        signerOwnerIds: [],

        status: "DRAFT",

        savedAt: "",

        pdfGenerated: false,

        pdfUrl: "",
      },
    }));
  };

  const disabled = !canEdit || locked;

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <>
      <PkSection
        title="BAST Moral Obligasi"
        description="Kelola berita acara serah terima dokumen agunan moral obligasi."
        locked={locked}
      >
        {/* ======================================================
            INFO
        ======================================================= */}
        <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-start gap-3">
            <FileText size={18} className="mt-0.5 shrink-0 text-zinc-500" />

            <div>
              <p className="text-sm font-medium text-zinc-800">
                Berita Acara Serah Terima Agunan
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Pilih dokumen agunan yang akan diserahterimakan. Satu BAST dapat
                memuat beberapa SHM sekaligus.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================
            AGUNAN
        ======================================================= */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-800">
                Agunan yang Diserahterimakan
              </p>

              <p className="mt-0.5 text-[11px] text-zinc-500">
                Pilih satu atau beberapa dokumen.
              </p>
            </div>

            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
              {selectedCollaterals.length} dipilih
            </span>
          </div>

          {collaterals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-zinc-600">
                Belum ada agunan
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Tambahkan agunan terlebih dahulu pada bagian Agunan.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {collaterals.map((collateral) => {
                const selected = selectedCollateralIds.includes(collateral.id);

                const owners = getOwners(collateral);

                return (
                  <label
                    key={collateral.id}
                    className={[
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                      selected
                        ? "border-zinc-400 bg-zinc-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300",
                      disabled ? "cursor-not-allowed opacity-70" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleCollateral(collateral.id)}
                      className="mt-1 h-4 w-4 rounded border-zinc-300"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900">
                          {collateral.number || "Nomor SHM belum diisi"}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                          {collateral.type || "SHM"}
                        </span>

                        {isWaris(collateral) && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            Waris
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-zinc-500">
                        <span>Atas Nama: </span>

                        <span className="font-medium text-zinc-700">
                          {owners.length > 0
                            ? owners.map((owner) => owner.name).join(", ")
                            : "-"}
                        </span>
                      </div>

                      <div className="mt-1 text-[11px] text-zinc-400">
                        Hubungan: {collateral.relationship || "-"}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================
            DATA SURAT
        ======================================================= */}
        <div className="mt-6 border-t border-zinc-100 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <PkInput
              label="Nomor Surat"
              value={bast.number || ""}
              onChange={(event) => updateBast("number", event.target.value)}
              placeholder="Contoh: 056"
              disabled={disabled}
            />

            <PkInput
              label="Tanggal Surat"
              type="date"
              value={bast.date || ""}
              onChange={(event) => updateBast("date", event.target.value)}
              disabled={disabled}
            />

            <PkSelect
              label="Tujuan"
              value={bast.destination || ""}
              options={destinationOptions}
              onChange={(event) =>
                updateBast("destination", event.target.value)
              }
              disabled={disabled}
            />

            {bast.destination === "NOTARIS" && (
              <PkInput
                label="Nama Notaris"
                value={bast.notaryName || ""}
                onChange={(event) =>
                  updateBast("notaryName", event.target.value)
                }
                placeholder="Nama Notaris"
                disabled={disabled}
              />
            )}
          </div>

          <div className="mt-4">
            <PkInput label="Keterangan Surat" value={description} disabled />

            <p className="mt-1.5 text-[11px] text-zinc-400">
              Keterangan dibuat otomatis berdasarkan nomor surat, SHM yang
              dipilih, dan nama debitur.
            </p>
          </div>
        </div>

        {/* ======================================================
            PIHAK KEDUA — OTOMATIS
        ======================================================= */}
        <div className="mt-6 border-t border-zinc-100 pt-6">
          <div className="mb-4">
            <p className="text-xs font-semibold text-zinc-800">PIHAK KEDUA</p>

            <p className="mt-1 text-[11px] leading-5 text-zinc-500">
              Data otomatis berdasarkan Unit Kerja PK.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium text-zinc-500">Nama</p>

                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {secondParty.name || "-"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-zinc-500">NIP</p>

                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {secondParty.nip || "-"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-zinc-500">Jabatan</p>

                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {secondParty.position || "MBM"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-zinc-500">
                  Unit Kerja
                </p>

                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {secondPartyUnitName}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================
            PIHAK TERKAIT
        ======================================================= */}
        <div className="mt-6 border-t border-zinc-100 pt-6">
          <div className="mb-4">
            <p className="text-xs font-semibold text-zinc-800">
              Pihak Terkait / Penandatangan
            </p>

            <p className="mt-1 text-[11px] leading-5 text-zinc-500">
              Opsional. Pihak terkait tidak otomatis sama dengan nama
              kepemilikan dokumen.
            </p>
          </div>

          {relatedParties.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5">
              <p className="text-xs font-medium text-zinc-600">
                Belum ada Pihak Terkait
              </p>

              <p className="mt-1 text-[11px] text-zinc-400">
                Tambahkan Pihak Terkait pada bagian Pihak Terkait jika
                diperlukan.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {relatedParties.map((party) => {
                const selected = selectedSignerPartyIds.includes(party.id);

                return (
                  <label
                    key={party.id}
                    className={[
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                      selected
                        ? "border-zinc-400 bg-zinc-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300",
                      disabled ? "cursor-not-allowed opacity-70" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleRelatedParty(party.id)}
                      className="mt-1 h-4 w-4 rounded border-zinc-300"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900">
                        {party.name || "-"}
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        {party.relationship || "Pihak Terkait"} · NIK{" "}
                        {party.nik || "-"}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================
            PEMILIK WARIS
        ======================================================= */}
        {warisOwnerOptions.length > 0 && (
          <div className="mt-6 border-t border-zinc-100 pt-6">
            <div className="mb-4">
              <p className="text-xs font-semibold text-zinc-800">
                Pemilik Waris yang Turut Menandatangani
              </p>

              <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                Pemilik pada SHM Waris tetap merupakan data kepemilikan dokumen.
                Centang hanya pemilik yang memang akan menjadi penandatangan.
              </p>
            </div>

            <div className="space-y-2">
              {warisOwnerOptions.map((owner) => {
                const selected = selectedSignerOwnerIds.includes(owner.id);

                return (
                  <label
                    key={owner.id}
                    className={[
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                      selected
                        ? "border-zinc-400 bg-zinc-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300",
                      disabled ? "cursor-not-allowed opacity-70" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleWarisOwner(owner.id)}
                      className="mt-1 h-4 w-4 rounded border-zinc-300"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900">
                        {owner.name}
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        SHM {owner.collateralNumber} · Pemilik Waris
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================
            STATUS
        ======================================================= */}
        {bast.status && bast.status !== "DRAFT" && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <p className="text-sm font-medium text-emerald-800">
                {bast.status === "PDF_GENERATED"
                  ? "PDF BAST berhasil dibuat"
                  : "BAST tersimpan"}
              </p>

              {bast.savedAt && (
                <p className="mt-1 text-[11px] text-emerald-700">
                  Terakhir diproses:{" "}
                  {new Date(bast.savedAt).toLocaleString("id-ID")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ======================================================
            ACTION
        ======================================================= */}
        <div className="mt-6 flex flex-col gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClearBast}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} />
            Reset
          </button>

          <button
            type="button"
            onClick={handleSaveBast}
            disabled={disabled || selectedCollaterals.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />
            Simpan ke BAST
          </button>

          <button
            type="button"
            onClick={handlePreview}
            disabled={
              !bast.number || !bast.date || selectedCollaterals.length === 0
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Eye size={16} />
            Preview BAST
          </button>
        </div>
      </PkSection>

      {/* ========================================================
          PREVIEW MODAL
      ========================================================= */}
      {previewOpen && (
        <BastPreviewModal
          pk={pk}
          bast={{
            ...bast,

            description,

            /*
             * Pastikan Preview juga menerima
             * PIHAK KEDUA otomatis.
             */
            secondPartyName: secondParty.name,

            secondPartyNip: secondParty.nip,

            secondPartyPosition: secondParty.position,

            unitName: secondPartyUnitName,
          }}
          collaterals={selectedCollaterals}
          generating={generating}
          onClose={() => setPreviewOpen(false)}
          onGeneratePdf={handleGeneratePdf}
        />
      )}
    </>
  );
}
