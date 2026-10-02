"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import PkInput from "@/components/pk/shared/PkInput";
import PkSelect from "@/components/pk/shared/PkSelect";
import PkSection from "@/components/pk/shared/PkSection";
import { getBindingType } from "@/lib/pk/pkRules";

const collateralTypes = [
  { value: "SHM", label: "SHM" },
  { value: "BPKB", label: "BPKB" },
];

const certificateTypes = [
  { value: "FISIK", label: "Fisik" },
  { value: "ELEKTRONIK", label: "Elektronik" },
];

const certificateLocations = [
  { value: "DIBAWA_DEBITUR", label: "Dibawa Debitur saat PK" },
  { value: "PERLU_ORDER_CO", label: "Perlu di-order dari CO" },
  { value: "DI_CABANG", label: "Di Cabang" },
  { value: "DI_NOTARIS", label: "Di Notaris" },
];

const relationshipOptions = [
  { value: "MILIK_SENDIRI", label: "Diri Sendiri" },
  { value: "SUAMI", label: "Suami" },
  { value: "ISTRI", label: "Istri" },
  { value: "AYAH_DEBITUR", label: "Ayah" },
  { value: "IBU_DEBITUR", label: "Ibu" },
  { value: "SAUDARA", label: "Saudara" },
  { value: "JUAL_BELI", label: "Jual Beli" },
  { value: "WARIS", label: "Waris" },
];

const bindingRoleOptions = [
  { value: "DIKAT", label: "Diikat" },
  { value: "MORAL_OBLIGATION", label: "Moral Obligasi" },
];

const automaticOwnerRelationships = new Set([
  "MILIK_SENDIRI",
  "SUAMI",
  "ISTRI",
  "AYAH_DEBITUR",
  "IBU_DEBITUR",
]);

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createOwner() {
  return { id: createId("OWNER"), name: "", nik: "" };
}

function normalizeOwners(collateral) {
  if (Array.isArray(collateral?.owners) && collateral.owners.length) {
    return collateral.owners;
  }
  if (collateral?.owner) {
    return [
      {
        id: createId("OWNER"),
        name: collateral.owner,
        nik: collateral?.nikPemilik || collateral?.nik_pemilik || "",
      },
    ];
  }
  return [];
}

function normalizeNumericValue(value) {
  if (value === null || value === undefined || value === "") return "";
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  const number = Number(digits);
  return Number.isFinite(number) ? number : "";
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("id-ID") : "";
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUpper(value) {
  return normalizeText(value).toUpperCase();
}

function getDebtorName(pk) {
  return (
    pk?.namaDebitur || pk?.nama_debitur || pk?.debtorName || pk?.debitur || ""
  );
}

function getDebtorGender(pk) {
  const raw =
    pk?.jenisKelamin || pk?.jenis_kelamin || pk?.gender || pk?.jk || "";

  const value = normalizeUpper(raw);

  if (["L", "LAKI-LAKI", "LAKI LAKI", "PRIA", "MALE"].includes(value)) {
    return "L";
  }

  if (["P", "PEREMPUAN", "WANITA", "FEMALE"].includes(value)) {
    return "P";
  }

  return "";
}

function getProductType(pk) {
  const raw =
    pk?.jenisPengajuanKredit ||
    pk?.jenis_pengajuan_kredit ||
    pk?.jenisProduk ||
    pk?.jenis_produk ||
    pk?.produk ||
    pk?.productType ||
    pk?.product_type ||
    pk?.jenisKredit ||
    pk?.jenis_kredit ||
    pk?.tipeProduk ||
    pk?.tipe_produk ||
    "";

  const value = normalizeUpper(raw);

  if (value.includes("KUR")) return "KUR";
  if (value.includes("KUM")) return "KUM";

  return value;
}

function getLimit(pk) {
  const raw =
    pk?.limitKredit ??
    pk?.limit_kredit ??
    pk?.limit ??
    pk?.plafond ??
    pk?.plafon ??
    pk?.jumlahPinjaman ??
    pk?.jumlah_pinjaman ??
    "";

  const digits = String(raw).replace(/\D/g, "");

  if (!digits) return 0;

  const number = Number(digits);

  return Number.isFinite(number) ? number : 0;
}

function getCertificateType(collateral) {
  return normalizeUpper(collateral?.certificateType) === "ELEKTRONIK"
    ? "ELEKTRONIK"
    : "FISIK";
}

function getPkBindingType(pk, collaterals) {
  return getBindingType(getProductType(pk), getLimit(pk), collaterals);
}

function getSpouseData(pk) {
  const pasangan =
    pk?.pasangan ||
    pk?.pasanganDebitur ||
    pk?.pasangan_debitur ||
    pk?.spouse ||
    null;

  return {
    name:
      pasangan?.nama ||
      pasangan?.namaPasangan ||
      pasangan?.nama_pasangan ||
      pasangan?.name ||
      pasangan?.namaSuami ||
      pasangan?.nama_suami ||
      pasangan?.namaIstri ||
      pasangan?.nama_istri ||
      pk?.nama_pasangan ||
      "",
    nik:
      pasangan?.nik ||
      pasangan?.NIK ||
      pasangan?.nikKtp ||
      pasangan?.nik_ktp ||
      pasangan?.nikPasangan ||
      pasangan?.nik_pasangan ||
      pk?.nik_pasangan ||
      pk?.nikPasangan ||
      "",
  };
}

function getRelatedParties(pk) {
  if (Array.isArray(pk?.relatedParties)) return pk.relatedParties;
  if (Array.isArray(pk?.related_parties)) return pk.related_parties;
  return [];
}

function getRelatedPartyData(pk, relationship) {
  const targets =
    relationship === "AYAH_DEBITUR"
      ? ["AYAH", "AYAH_DEBITUR"]
      : relationship === "IBU_DEBITUR"
        ? ["IBU", "IBU_DEBITUR"]
        : [];

  if (!targets.length) {
    return { name: "", nik: "" };
  }

  const party = getRelatedParties(pk).find((item) => {
    const relation = normalizeUpper(
      item?.hubungan || item?.relationship || item?.relation || "",
    );

    return targets.includes(relation);
  });

  return {
    name:
      party?.nama || party?.name || party?.nama_pihak || party?.namaPihak || "",
    nik:
      party?.nik ||
      party?.NIK ||
      party?.nikKtp ||
      party?.nik_ktp ||
      party?.nik_pihak ||
      party?.nikPihak ||
      "",
  };
}

function getAutomaticOwnerData(pk, relationship) {
  if (relationship === "MILIK_SENDIRI") {
    return {
      name: getDebtorName(pk),
      nik: pk?.nik || pk?.nikDebitur || pk?.nik_debitur || pk?.NIK || "",
    };
  }

  if (relationship === "SUAMI" || relationship === "ISTRI") {
    return getSpouseData(pk);
  }

  if (relationship === "AYAH_DEBITUR" || relationship === "IBU_DEBITUR") {
    return getRelatedPartyData(pk, relationship);
  }

  return { name: "", nik: "" };
}

function getRelationshipOptions(pk, currentRelationship = "") {
  const gender = getDebtorGender(pk);

  return relationshipOptions.filter((option) => {
    if (option.value === "SUAMI" && gender === "L") {
      return currentRelationship === "SUAMI";
    }

    if (option.value === "ISTRI" && gender === "P") {
      return currentRelationship === "ISTRI";
    }

    return true;
  });
}

function getNotaryName(notary) {
  return notary?.nama_notaris || notary?.namaNotaris || notary?.nama || "";
}

function getNotaryOptions(notaries) {
  return [
    { value: "", label: "Pilih Notaris" },
    ...notaries
      .filter((notary) => notary?.id)
      .map((notary) => ({
        value: String(notary.id),
        label: getNotaryName(notary) || "-",
      })),
  ];
}

function normalizeRelationshipForDb(value) {
  if (value === "AYAH_DEBITUR" || value === "IBU_DEBITUR") {
    return "ORANG_TUA";
  }

  return value;
}

function getBindingLabel(bindingType) {
  if (bindingType === "SKMHT") return "SKMHT";
  if (bindingType === "APHT") return "APHT";
  return "Tidak Ada";
}

function createEmptyCollateral() {
  return {
    id: createId("COL"),
    type: "SHM",
    number: "",
    certificateType: "FISIK",
    certificateLocation: "DIBAWA_DEBITUR",
    area: "",
    bookDate: "",
    owner: "",
    owners: [],
    relationship: "",
    relationshipDb: "",
    value: "",
    address: {
      village: "",
      district: "",
      regency: "",
    },
    note: "",
    binding: {
      type: "TIDAK ADA",
      role: "",
      notaryId: "",
      notaryName: "",
      notaryCode: "",
      fee: "",
      outgoingLetterNumber: "",
      note: "",
      status: "BELUM DIPROSES",
    },
  };
}

export default function PkCollateralSection({
  pk,
  setPk,
  canEdit,
  locked,
  notaries = [],
  onUseCollateralFromOtherLoan,
}) {
  const collaterals = Array.isArray(pk?.collaterals) ? pk.collaterals : [];

  const editable = Boolean(canEdit && !locked);
  const firstShm = collaterals.find((item) => item?.type === "SHM");

  const firstShmBindingType = getPkBindingType(pk, collaterals);

  const firstShmIsBound =
    Boolean(firstShm) && firstShmBindingType !== "TIDAK ADA";

  const additionalRoleOptions = firstShmIsBound
    ? bindingRoleOptions
    : bindingRoleOptions.filter(
        (option) => option.value === "MORAL_OBLIGATION",
      );

  const updateCollateral = (collateralId, field, value) => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) =>
        item.id === collateralId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));
  };

  const updateCollateralAddress = (collateralId, field, value) => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) =>
        item.id === collateralId
          ? {
              ...item,
              address: {
                ...(item.address || {}),
                [field]: value,
              },
            }
          : item,
      ),
    }));
  };

  const updateBinding = (collateralId, field, value) => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) =>
        item.id === collateralId
          ? {
              ...item,
              binding: {
                ...(item.binding || {}),
                [field]: value,
              },
            }
          : item,
      ),
    }));
  };

  const updateCollateralValue = (collateralId, value) => {
    updateCollateral(collateralId, "value", normalizeNumericValue(value));
  };

  const addCollateral = () => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: [...(prev.collaterals || []), createEmptyCollateral()],
    }));
  };

  const removeCollateral = (collateralId) => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).filter(
        (item) => item.id !== collateralId,
      ),
    }));
  };

  const handleTypeChange = (collateral, type) => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) => {
        if (item.id !== collateral.id) {
          return item;
        }

        if (type === "BPKB") {
          return {
            ...item,
            type,
            certificateType: "FISIK",
            certificateLocation: "DI_CABANG",
            binding: {
              ...(item.binding || {}),
              type: "TIDAK ADA",
              role: "",
              notaryId: "",
              notaryName: "",
              notaryCode: "",
              fee: "",
              outgoingLetterNumber: "",
              note: "",
              status: "TIDAK DIPROSES",
            },
          };
        }

        return {
          ...item,
          type,
          certificateType: item.certificateType || "FISIK",
          certificateLocation: item.certificateLocation || "DIBAWA_DEBITUR",
        };
      }),
    }));
  };

  const handleCertificateTypeChange = (collateral, certificateType) => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) =>
        item.id === collateral.id
          ? {
              ...item,
              certificateType,
            }
          : item,
      ),
    }));
  };

  const handleRelationshipChange = (collateral, relationship) => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) => {
        if (item.id !== collateral.id) {
          return item;
        }

        const currentOwners = normalizeOwners(item);

        if (!relationship) {
          return {
            ...item,
            relationship: "",
            relationshipDb: "",
            owner: "",
            owners: [],
          };
        }

        if (automaticOwnerRelationships.has(relationship)) {
          const automaticOwner = getAutomaticOwnerData(prev, relationship);

          const existingOwner = currentOwners[0];

          const owner = {
            id: existingOwner?.id || createId("OWNER"),
            name: automaticOwner.name || "",
            nik: automaticOwner.nik || "",
          };

          return {
            ...item,
            relationship,
            relationshipDb: normalizeRelationshipForDb(relationship),
            owner: owner.name,
            owners: [owner],
          };
        }

        if (relationship === "WARIS") {
          const owners = currentOwners.length ? currentOwners : [createOwner()];

          return {
            ...item,
            relationship,
            relationshipDb: "WARIS",
            owners,
            owner: owners[0]?.name || "",
          };
        }

        const firstOwner = currentOwners[0];

        return {
          ...item,
          relationship,
          relationshipDb: normalizeRelationshipForDb(relationship),
          owners: firstOwner ? [firstOwner] : [],
          owner: firstOwner?.name || "",
        };
      }),
    }));
  };

  const updateOwner = (collateralId, ownerId, field, value) => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) => {
        if (item.id !== collateralId) {
          return item;
        }

        const owners = normalizeOwners(item).map((owner) =>
          owner.id === ownerId
            ? {
                ...owner,
                [field]: value,
              }
            : owner,
        );

        return {
          ...item,
          owners,
          owner: owners[0]?.name || "",
        };
      }),
    }));
  };

  const addOwner = (collateralId) => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) =>
        item.id === collateralId
          ? {
              ...item,
              owners: [...normalizeOwners(item), createOwner()],
            }
          : item,
      ),
    }));
  };

  const removeOwner = (collateralId, ownerId) => {
    if (!editable) return;

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) => {
        if (item.id !== collateralId) {
          return item;
        }

        const owners = normalizeOwners(item).filter(
          (owner) => owner.id !== ownerId,
        );

        return {
          ...item,
          owners,
          owner: owners[0]?.name || "",
        };
      }),
    }));
  };

  const handleBindingRoleChange = (collateral, value) => {
    if (
      !editable ||
      collateral.type !== "SHM" ||
      collateral.id === firstShm?.id
    ) {
      return;
    }

    if (value === "DIKAT" && !firstShmIsBound) {
      return;
    }

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) => {
        if (item.id !== collateral.id) {
          return item;
        }

        const currentBinding = item.binding || {};

        const isBound = value === "DIKAT";

        return {
          ...item,
          binding: {
            ...currentBinding,
            role: value,
            type: isBound ? firstShmBindingType : "TIDAK ADA",
            status: isBound ? "BELUM DIPROSES" : "TIDAK DIPROSES",
            notaryId: isBound ? currentBinding.notaryId || "" : "",
            notaryName: isBound ? currentBinding.notaryName || "" : "",
            fee: isBound ? currentBinding.fee || "" : "",
            outgoingLetterNumber: isBound
              ? currentBinding.outgoingLetterNumber || ""
              : "",
            note: isBound ? currentBinding.note || "" : "",
          },
        };
      }),
    }));
  };

  const handleNotaryChange = (collateral, notaryId) => {
    if (!editable) return;

    const selectedNotary = notaries.find(
      (notary) => String(notary?.id) === String(notaryId),
    );

    setPk((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((item) =>
        item.id === collateral.id
          ? {
              ...item,
              binding: {
                ...(item.binding || {}),
                notaryId: notaryId ? String(notaryId) : "",
                notaryName: getNotaryName(selectedNotary),
                notaryCode: "",
              },
            }
          : item,
      ),
    }));
  };

  const getShmIndex = (collateralId) => {
    let count = 0;

    for (const collateral of collaterals) {
      if (collateral.type !== "SHM") {
        continue;
      }

      if (collateral.id === collateralId) {
        return count;
      }

      count++;
    }

    return -1;
  };

  return (
    <PkSection
      title="Data Agunan"
      description="Data dokumen agunan, kepemilikan, lokasi, nilai, dan pengikatan."
      locked={locked}
    >
      {collaterals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-5 py-10 text-center">
          <p className="text-sm font-medium text-zinc-700">Belum ada agunan</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-zinc-500">
            Tambahkan agunan baru atau gunakan sertifikat dari pinjaman lain.
          </p>
          {editable && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={addCollateral}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <Plus size={16} />
                Tambah Agunan Baru
              </button>
              <button
                type="button"
                onClick={() => onUseCollateralFromOtherLoan?.()}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                <Search size={16} />
                Gunakan Sertifikat dari Pinjaman Lain
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {collaterals.map((collateral, index) => {
              const address = collateral.address || {};

              const owners = normalizeOwners(collateral);

              const isWaris = collateral.relationship === "WARIS";

              const shmIndex = getShmIndex(collateral.id);

              const isFirstShm = collateral.type === "SHM" && shmIndex === 0;

              const isAdditionalShm = collateral.type === "SHM" && !isFirstShm;

              const effectiveBindingType = isFirstShm
                ? firstShmBindingType
                : collateral.binding?.role === "DIKAT"
                  ? firstShmBindingType
                  : "TIDAK ADA";

              const bindingEnabled =
                collateral.type === "SHM" &&
                effectiveBindingType !== "TIDAK ADA" &&
                (isFirstShm || collateral.binding?.role === "DIKAT");

              const automaticOwner = getAutomaticOwnerData(
                pk,
                collateral.relationship,
              );

              const isAutomaticOwner = automaticOwnerRelationships.has(
                collateral.relationship,
              );

              const displayedOwner = isAutomaticOwner
                ? automaticOwner
                : {
                    name: owners[0]?.name || collateral.owner || "",
                    nik: owners[0]?.nik || "",
                  };

              return (
                <div
                  key={collateral.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4"
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        Agunan {index + 1}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {collateral.type === "SHM"
                          ? isFirstShm
                            ? "SHM pertama — jika memenuhi kriteria, otomatis menjadi Agunan Utama."
                            : "SHM tambahan — pilih Diikat atau Moral Obligasi."
                          : "BPKB — tidak dapat menjadi agunan yang diikat."}
                      </p>
                    </div>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => removeCollateral(collateral.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Hapus Agunan
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Dokumen Agunan
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <PkSelect
                        label="Jenis Agunan"
                        value={collateral.type || ""}
                        onChange={(e) =>
                          handleTypeChange(collateral, e.target.value)
                        }
                        disabled={!editable}
                        options={collateralTypes}
                      />

                      <PkInput
                        label={
                          collateral.type === "BPKB"
                            ? "Nomor BPKB"
                            : "Nomor SHM"
                        }
                        value={collateral.number || ""}
                        onChange={(e) =>
                          updateCollateral(
                            collateral.id,
                            "number",
                            e.target.value,
                          )
                        }
                        disabled={!editable}
                      />

                      <PkSelect
                        label="Jenis Sertifikat"
                        value={collateral.certificateType || ""}
                        onChange={(e) =>
                          handleCertificateTypeChange(
                            collateral,
                            e.target.value,
                          )
                        }
                        disabled={!editable || collateral.type === "BPKB"}
                        options={certificateTypes}
                      />

                      <PkSelect
                        label="Fisik Sertifikat"
                        value={collateral.certificateLocation || ""}
                        onChange={(e) =>
                          updateCollateral(
                            collateral.id,
                            "certificateLocation",
                            e.target.value,
                          )
                        }
                        disabled={!editable || collateral.type === "BPKB"}
                        options={certificateLocations}
                      />

                      {collateral.type === "SHM" && (
                        <>
                          <PkInput
                            label="Luas"
                            value={collateral.area || ""}
                            onChange={(e) =>
                              updateCollateral(
                                collateral.id,
                                "area",
                                e.target.value,
                              )
                            }
                            disabled={!editable}
                            suffix="m²"
                          />

                          <PkInput
                            label="Tanggal Buku"
                            type="date"
                            value={collateral.bookDate || ""}
                            onChange={(e) =>
                              updateCollateral(
                                collateral.id,
                                "bookDate",
                                e.target.value,
                              )
                            }
                            disabled={!editable}
                          />
                        </>
                      )}

                      {collateral.type === "BPKB" && (
                        <>
                          <PkInput
                            label="Nomor Polisi"
                            value={
                              collateral.nomorPolisi ||
                              collateral.nomor_polisi ||
                              ""
                            }
                            onChange={(e) =>
                              updateCollateral(
                                collateral.id,
                                "nomorPolisi",
                                e.target.value,
                              )
                            }
                            disabled={!editable}
                          />

                          <PkInput
                            label="Nomor Rangka"
                            value={
                              collateral.nomorRangka ||
                              collateral.nomor_rangka ||
                              ""
                            }
                            onChange={(e) =>
                              updateCollateral(
                                collateral.id,
                                "nomorRangka",
                                e.target.value,
                              )
                            }
                            disabled={!editable}
                          />

                          <PkInput
                            label="Nomor Mesin"
                            value={
                              collateral.nomorMesin ||
                              collateral.nomor_mesin ||
                              ""
                            }
                            onChange={(e) =>
                              updateCollateral(
                                collateral.id,
                                "nomorMesin",
                                e.target.value,
                              )
                            }
                            disabled={!editable}
                          />

                          <PkInput
                            label="Merek"
                            value={collateral.merek || collateral.merk || ""}
                            onChange={(e) =>
                              updateCollateral(
                                collateral.id,
                                "merek",
                                e.target.value,
                              )
                            }
                            disabled={!editable}
                          />

                          <PkInput
                            label="Tipe"
                            value={collateral.tipe || ""}
                            onChange={(e) =>
                              updateCollateral(
                                collateral.id,
                                "tipe",
                                e.target.value,
                              )
                            }
                            disabled={!editable}
                          />

                          <PkInput
                            label="Tahun"
                            value={collateral.tahun || ""}
                            onChange={(e) =>
                              updateCollateral(
                                collateral.id,
                                "tahun",
                                e.target.value,
                              )
                            }
                            disabled={!editable}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-zinc-200 pt-5">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Kepemilikan
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <PkSelect
                        label="Hubungan dengan Debitur"
                        value={collateral.relationship || ""}
                        onChange={(e) =>
                          handleRelationshipChange(collateral, e.target.value)
                        }
                        disabled={!editable}
                        options={[
                          {
                            value: "",
                            label: "Pilih hubungan...",
                          },
                          ...getRelationshipOptions(
                            pk,
                            collateral.relationship,
                          ),
                        ]}
                      />
                    </div>

                    {isWaris ? (
                      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">
                              Daftar Pemilik
                            </p>
                            <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                              Satu dokumen waris dapat memiliki beberapa nama
                              pemilik.
                            </p>
                          </div>

                          {editable && (
                            <button
                              type="button"
                              onClick={() => addOwner(collateral.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                            >
                              <Plus size={14} />
                              Tambah Pemilik
                            </button>
                          )}
                        </div>

                        <div className="mt-4 space-y-3">
                          {owners.map((owner, ownerIndex) => (
                            <div
                              key={owner.id}
                              className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-semibold text-zinc-700">
                                  Pemilik {ownerIndex + 1}
                                </p>

                                {editable && owners.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeOwner(collateral.id, owner.id)
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={13} />
                                    Hapus
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <PkInput
                                  label="Nama Pemilik"
                                  value={owner.name || ""}
                                  onChange={(e) =>
                                    updateOwner(
                                      collateral.id,
                                      owner.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  disabled={!editable}
                                />

                                <PkInput
                                  label="NIK Pemilik"
                                  value={owner.nik || ""}
                                  onChange={(e) =>
                                    updateOwner(
                                      collateral.id,
                                      owner.id,
                                      "nik",
                                      e.target.value,
                                    )
                                  }
                                  disabled={!editable}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <PkInput
                            label="Atas Nama"
                            value={displayedOwner.name || ""}
                            onChange={(e) => {
                              if (!editable || isAutomaticOwner) {
                                return;
                              }

                              const value = e.target.value;

                              setPk((prev) => ({
                                ...prev,
                                collaterals: (prev.collaterals || []).map(
                                  (item) => {
                                    if (item.id !== collateral.id) {
                                      return item;
                                    }

                                    const existing = normalizeOwners(item)[0];

                                    return {
                                      ...item,
                                      owner: value,
                                      owners: value
                                        ? [
                                            {
                                              id:
                                                existing?.id ||
                                                createId("OWNER"),
                                              name: value,
                                              nik: existing?.nik || "",
                                            },
                                          ]
                                        : [],
                                    };
                                  },
                                ),
                              }));
                            }}
                            disabled={!editable || isAutomaticOwner}
                          />

                          <PkInput
                            label="NIK Pemilik"
                            value={displayedOwner.nik || ""}
                            onChange={(e) => {
                              if (!editable || isAutomaticOwner) {
                                return;
                              }

                              const owner = owners[0];

                              if (!owner) {
                                const newOwner = {
                                  ...createOwner(),
                                  nik: e.target.value,
                                };

                                setPk((prev) => ({
                                  ...prev,
                                  collaterals: (prev.collaterals || []).map(
                                    (item) =>
                                      item.id === collateral.id
                                        ? {
                                            ...item,
                                            owners: [newOwner],
                                          }
                                        : item,
                                  ),
                                }));

                                return;
                              }

                              updateOwner(
                                collateral.id,
                                owner.id,
                                "nik",
                                e.target.value,
                              );
                            }}
                            disabled={!editable || isAutomaticOwner}
                          />
                        </div>

                        {collateral.relationship === "MILIK_SENDIRI" && (
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            Nama dan NIK pemilik otomatis mengikuti data
                            debitur.
                          </p>
                        )}

                        {(collateral.relationship === "SUAMI" ||
                          collateral.relationship === "ISTRI") && (
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            Nama dan NIK pasangan otomatis mengikuti data
                            Pasangan.
                          </p>
                        )}

                        {(collateral.relationship === "AYAH_DEBITUR" ||
                          collateral.relationship === "IBU_DEBITUR") && (
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            Nama dan NIK orang tua otomatis mengikuti data Pihak
                            Terkait.
                          </p>
                        )}

                        {collateral.relationship === "JUAL_BELI" && (
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            Nama dan NIK pemilik dokumen dicatat pada data
                            pemilik.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {collateral.type === "SHM" && (
                    <div className="mt-6 border-t border-zinc-200 pt-5">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Status Pengikatan
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {isFirstShm
                            ? "SHM pertama otomatis menentukan pengikatan berdasarkan produk, limit, dan jenis sertifikat."
                            : "SHM tambahan dapat dipilih Diikat atau Moral Obligasi."}
                        </p>
                      </div>

                      {isFirstShm ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <PkInput
                            label="Peran Agunan"
                            value={
                              firstShmIsBound ? "Agunan Utama" : "Tidak Diikat"
                            }
                            disabled
                          />

                          <PkInput
                            label="Jenis Pengikatan"
                            value={getBindingLabel(firstShmBindingType)}
                            disabled
                          />

                          <PkInput
                            label="Dasar Pengikatan"
                            value={`${getProductType(pk) || "-"} • ${formatNumber(getLimit(pk)) || "0"} • ${getCertificateType(collateral)}`}
                            disabled
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <PkSelect
                            label="Peran Agunan"
                            value={collateral.binding?.role || ""}
                            onChange={(e) =>
                              handleBindingRoleChange(
                                collateral,
                                e.target.value,
                              )
                            }
                            disabled={!editable}
                            options={[
                              {
                                value: "",
                                label: "Pilih peran...",
                              },
                              ...additionalRoleOptions,
                            ]}
                          />

                          <PkInput
                            label="Jenis Pengikatan"
                            value={
                              collateral.binding?.role === "DIKAT"
                                ? getBindingLabel(firstShmBindingType)
                                : "Tidak Ada"
                            }
                            disabled
                          />

                          <PkInput
                            label="Status"
                            value={
                              collateral.binding?.role === "DIKAT"
                                ? "Diikat"
                                : collateral.binding?.role ===
                                    "MORAL_OBLIGATION"
                                  ? "Moral Obligasi"
                                  : "Belum Dipilih"
                            }
                            disabled
                          />
                        </div>
                      )}

                      {isFirstShm && firstShmIsBound && (
                        <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                          <p className="text-xs font-medium text-zinc-700">
                            SHM pertama otomatis menjadi Agunan Utama dengan
                            pengikatan {firstShmBindingType}.
                          </p>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">
                            Tidak tersedia pilihan Moral Obligasi untuk SHM
                            pertama yang memenuhi kriteria.
                          </p>
                        </div>
                      )}

                      {isFirstShm && !firstShmIsBound && (
                        <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                          <p className="text-xs font-medium text-zinc-700">
                            SHM pertama belum memenuhi kriteria pengikatan
                            otomatis.
                          </p>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">
                            Tidak ada SKMHT/APHT yang ditetapkan untuk SHM ini
                            berdasarkan produk, limit, dan jenis sertifikat saat
                            ini.
                          </p>
                        </div>
                      )}

                      {isAdditionalShm && !firstShmIsBound && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <p className="text-xs font-medium text-amber-800">
                            SHM pertama belum memenuhi kriteria pengikatan.
                          </p>
                          <p className="mt-1 text-xs leading-5 text-amber-700">
                            SHM tambahan hanya dapat dipilih sebagai Moral
                            Obligasi sampai SHM pertama memenuhi kriteria
                            pengikatan.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {collateral.type === "BPKB" && (
                    <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                      <p className="text-xs font-medium text-zinc-700">
                        BPKB tidak dapat menjadi agunan yang diikat.
                      </p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Ketentuan SKMHT/APHT pada bagian ini hanya berlaku untuk
                        SHM.
                      </p>
                    </div>
                  )}

                  {collateral.type === "SHM" && bindingEnabled && (
                    <div className="mt-6 border-t border-zinc-200 pt-5">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Data Pengikatan
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Data proses notaris dan pengikatan dicatat di bagian
                          ini.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <PkInput
                          label="Jenis Pengikatan"
                          value={getBindingLabel(effectiveBindingType)}
                          disabled
                        />

                        <PkSelect
                          label="Notaris"
                          value={String(collateral.binding?.notaryId || "")}
                          onChange={(e) =>
                            handleNotaryChange(collateral, e.target.value)
                          }
                          disabled={!editable}
                          options={getNotaryOptions(notaries)}
                        />

                        <PkInput
                          label="Kode Notaris"
                          value={collateral.binding?.notaryCode || ""}
                          disabled
                          placeholder="Akan tersedia dari master notaris"
                        />

                        <PkInput
                          label="Biaya Pengikatan"
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(collateral.binding?.fee)}
                          onChange={(e) =>
                            updateBinding(
                              collateral.id,
                              "fee",
                              normalizeNumericValue(e.target.value),
                            )
                          }
                          disabled={!editable}
                          prefix="Rp"
                        />

                        <PkInput
                          label="Nomor Surat Keluar Order Notaris"
                          value={collateral.binding?.outgoingLetterNumber || ""}
                          onChange={(e) =>
                            updateBinding(
                              collateral.id,
                              "outgoingLetterNumber",
                              e.target.value,
                            )
                          }
                          disabled={!editable}
                          placeholder="Contoh: 056"
                        />

                        <PkInput
                          label="Status Pengikatan"
                          value={collateral.binding?.status || "BELUM DIPROSES"}
                          disabled
                        />

                        <div className="md:col-span-2 xl:col-span-3">
                          <PkInput
                            label="Catatan Pengikatan"
                            value={collateral.binding?.note || ""}
                            onChange={(e) =>
                              updateBinding(
                                collateral.id,
                                "note",
                                e.target.value,
                              )
                            }
                            disabled={!editable}
                            placeholder="Catatan proses pengikatan"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 border-t border-zinc-200 pt-5">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Alamat Agunan
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <PkInput
                        label="Desa / Kelurahan"
                        value={address.village || ""}
                        onChange={(e) =>
                          updateCollateralAddress(
                            collateral.id,
                            "village",
                            e.target.value,
                          )
                        }
                        disabled={!editable}
                      />

                      <PkInput
                        label="Kecamatan"
                        value={address.district || ""}
                        onChange={(e) =>
                          updateCollateralAddress(
                            collateral.id,
                            "district",
                            e.target.value,
                          )
                        }
                        disabled={!editable}
                      />

                      <PkInput
                        label="Kabupaten"
                        value={address.regency || ""}
                        onChange={(e) =>
                          updateCollateralAddress(
                            collateral.id,
                            "regency",
                            e.target.value,
                          )
                        }
                        disabled={!editable}
                      />
                    </div>
                  </div>

                  <div className="mt-6 border-t border-zinc-200 pt-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <PkInput
                        label="Nilai Agunan"
                        type="text"
                        inputMode="numeric"
                        value={formatNumber(collateral.value)}
                        onChange={(e) =>
                          updateCollateralValue(collateral.id, e.target.value)
                        }
                        disabled={!editable}
                        prefix="Rp"
                      />

                      <PkInput
                        label="Catatan Agunan"
                        value={collateral.note || ""}
                        onChange={(e) =>
                          updateCollateral(
                            collateral.id,
                            "note",
                            e.target.value,
                          )
                        }
                        disabled={!editable}
                        placeholder="Catatan tambahan agunan"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {editable && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addCollateral}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <Plus size={16} />
                Tambah Agunan Baru
              </button>

              <button
                type="button"
                onClick={() => onUseCollateralFromOtherLoan?.()}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                <Search size={16} />
                Gunakan Sertifikat dari Pinjaman Lain
              </button>
            </div>
          )}
        </>
      )}
    </PkSection>
  );
}
