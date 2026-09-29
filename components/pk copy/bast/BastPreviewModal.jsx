"use client";

import { Download, FileText, X } from "lucide-react";

function formatIndonesianDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${days[date.getDay()]} tanggal ${date.getDate()} ${
    months[date.getMonth()]
  } tahun ${date.getFullYear()}`;
}

function formatAddress(address) {
  if (!address) return "-";

  const parts = [
    address.street,
    address.rt ? `RT ${address.rt}` : "",
    address.rw ? `RW ${address.rw}` : "",
    address.village,
    address.district,
    address.regency,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "-";
}

function getOwners(collateral) {
  if (Array.isArray(collateral?.owners) && collateral.owners.length > 0) {
    return collateral.owners.filter((owner) => owner?.name);
  }

  if (collateral?.owner) {
    return [
      {
        name: collateral.owner,
        nik: "",
      },
    ];
  }

  return [];
}

function getOwnershipName(collateral) {
  const owners = getOwners(collateral);

  if (owners.length === 0) {
    return "-";
  }

  return owners
    .map((owner) => owner.name)
    .filter(Boolean)
    .join(", ");
}

function getRelationshipLabel(value) {
  if (!value) return "-";

  const labels = {
    MILIK_SENDIRI: "Milik Sendiri",
    "Milik Sendiri": "Milik Sendiri",
    JUAL_BELI: "Jual Beli",
    "Jual Beli": "Jual Beli",
    WARIS: "Waris",
    Waris: "Waris",
    HIBAH: "Hibah",
    PASANGAN: "Pasangan",
    ORANG_TUA: "Orang Tua",
    PIHAK_KETIGA: "Pihak Ketiga",
    LAINNYA: "Lainnya",
  };

  return labels[value] || value;
}

function getRelatedParties(pk, bast) {
  const relatedParties = Array.isArray(pk?.relatedParties)
    ? pk.relatedParties
    : [];

  const signerPartyIds = Array.isArray(bast?.signerPartyIds)
    ? bast.signerPartyIds
    : [];

  if (signerPartyIds.length === 0) {
    return [];
  }

  return relatedParties.filter((party) => signerPartyIds.includes(party.id));
}

function getWarisOwnerSigners(pk, bast, collaterals) {
  const signerOwnerIds = Array.isArray(bast?.signerOwnerIds)
    ? bast.signerOwnerIds
    : [];

  if (signerOwnerIds.length === 0) {
    return [];
  }

  const owners = [];

  collaterals.forEach((collateral) => {
    const relationship = String(collateral?.relationship || "").toUpperCase();

    if (relationship !== "WARIS") {
      return;
    }

    const collateralOwners = getOwners(collateral);

    collateralOwners.forEach((owner, ownerIndex) => {
      const ownerId =
        owner?.id || `${collateral.id || "COL"}-OWNER-${ownerIndex}`;

      if (!signerOwnerIds.includes(ownerId)) {
        return;
      }

      const exists = owners.some(
        (item) =>
          String(item.name).toLowerCase() === String(owner.name).toLowerCase(),
      );

      if (!exists) {
        owners.push({
          ...owner,
          id: ownerId,
          relationship: "Pemilik Agunan / Waris",
        });
      }
    });
  });

  return owners;
}

function InfoRow({ label, children }) {
  return (
    <div className="grid grid-cols-[92px_12px_1fr] gap-y-0.5 leading-5">
      <span className="font-medium">{label}</span>
      <span>:</span>
      <span className="min-w-0">{children || "-"}</span>
    </div>
  );
}

/**
 * Signature utama.
 *
 * approvalParty dipisahkan dari tanda tangan Pihak Pertama.
 * Jadi pihak yang memberi persetujuan mempunyai area TTD sendiri.
 */
function MainSignature({ title, name, subtitle, approvalParty }) {
  return (
    <div className="text-center">
      <p className="font-semibold uppercase">{title}</p>

      {/* Area tanda tangan */}
      <div className="h-[52px]" />

      <div className="mx-auto w-[170px] border-b border-zinc-900" />

      <p className="mt-1 font-semibold underline">{name || "-"}</p>

      {subtitle && <p className="mt-0.5 text-[10px]">{subtitle}</p>}

      {approvalParty && (
        <div className="mt-4">
          <p className="text-[10px] leading-4">
            Memperoleh Persetujuan{" "}
            <span className="font-semibold">
              {approvalParty.relationship || "PIHAK TERKAIT"}
            </span>
          </p>

          {/* Area TTD pihak yang menyetujui */}
          <div className="h-[45px]" />

          <div className="mx-auto w-[170px] border-b border-zinc-900" />

          <p className="mt-1 font-semibold underline">
            {approvalParty.name || "-"}
          </p>

          <p className="mt-0.5 text-[10px]">
            {approvalParty.relationship || "Pihak Terkait"}
          </p>
        </div>
      )}
    </div>
  );
}

function AdditionalSignature({ title, name, subtitle }) {
  return (
    <div className="text-center">
      <p className="font-semibold">{title}</p>

      <div className="h-[52px]" />

      <div className="mx-auto w-[170px] border-b border-zinc-900" />

      <p className="mt-1 font-semibold underline">{name || "-"}</p>

      {subtitle && <p className="mt-0.5 text-[10px]">{subtitle}</p>}
    </div>
  );
}

export default function BastPreviewModal({
  bast,
  pk,
  collaterals = [],
  onClose,
  onGeneratePdf,
  generating = false,
}) {
  if (!bast) {
    return null;
  }

  const selectedCollaterals = collaterals.filter(
    (collateral) =>
      Array.isArray(bast.collateralIds) &&
      bast.collateralIds.includes(collateral.id),
  );

  const relatedParties = getRelatedParties(pk, bast);

  const warisOwnerSigners = getWarisOwnerSigners(pk, bast, selectedCollaterals);

  const year = bast.date
    ? new Date(`${bast.date}T00:00:00`).getFullYear()
    : new Date().getFullYear();

  const number = String(bast.number || "").trim();

  const formattedNumber = number
    ? `NRF.R02.JBI.JKK/${number}/${year}`
    : `NRF.R02.JBI.JKK/-/${year}`;

  const destinationLabel =
    bast.destination === "NOTARIS"
      ? bast.notaryName
        ? `Notaris ${bast.notaryName}`
        : "Notaris"
      : bast.destination === "DEBITUR"
        ? "Debitur"
        : "-";

  const secondPartyName =
    bast.secondPartyName || bast.mbmName || "MBM / Penyelia Unit";

  const secondPartyPosition = bast.secondPartyPosition || "MBM / PENYELIA UNIT";

  const unitName = bast.unitName || pk.unitName || pk.unit || "-";

  const primaryRelatedParty =
    relatedParties.length > 0 ? relatedParties[0] : null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-3 sm:p-5">
      <div className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        {/* Header preview */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
              <FileText size={18} className="text-zinc-600" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-zinc-950">
                Preview BAST
              </h2>

              <p className="mt-0.5 text-xs text-zinc-500">
                Berita Acara Serah Terima Agunan Moral Obligasi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900"
            aria-label="Tutup preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Document */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-100 p-4 sm:p-8">
          <div className="mx-auto w-full max-w-[794px] bg-white px-8 py-8 text-[12px] text-zinc-900 shadow-sm sm:px-12 sm:py-9">
            {/* Header dokumen */}
            <div className="relative min-h-[90px]">
              <div className="pr-36">
                <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  PT Bank Mandiri (Persero) Tbk.
                </div>

                <div className="mt-5 text-center">
                  <h1 className="text-[15px] font-bold uppercase leading-5">
                    BERITA ACARA
                  </h1>

                  <h2 className="text-[14px] font-bold uppercase leading-5">
                    SERAH TERIMA AGUNAN MORAL OBLIGASI
                  </h2>

                  <p className="mt-1.5 text-[10px] font-medium">
                    {formattedNumber}
                  </p>
                </div>
              </div>

              {/* LOGO MANDIRI */}
              <div className="absolute right-0 top-0">
                <img
                  src="/images/mandiri-logo.png"
                  alt="Bank Mandiri"
                  className="h-auto w-[105px] object-contain"
                />
              </div>
            </div>

            {/* Pembukaan */}
            <div className="mt-5 text-justify leading-5">
              <p>
                Pada hari ini{" "}
                <span className="font-semibold">
                  {formatIndonesianDate(bast.date)}
                </span>
                , yang bertanda tangan di bawah ini:
              </p>
            </div>

            {/* Debitur */}
            <div className="mt-4">
              <InfoRow label="Nama">{pk.debtorName}</InfoRow>

              <InfoRow label="NIK">{pk.nik}</InfoRow>

              <InfoRow label="Alamat">{formatAddress(pk.address)}</InfoRow>
            </div>

            {/* Pihak terkait */}
            {relatedParties.length > 0 && (
              <div className="mt-4">
                <p className="leading-5">
                  telah memperoleh persetujuan dari pihak terkait dengan data:
                </p>

                <div className="mt-2 space-y-3">
                  {relatedParties.map((party, index) => (
                    <div key={party.id || `RELATED-${index}`}>
                      <InfoRow label="Nama">{party.name}</InfoRow>

                      <InfoRow label="NIK">{party.nik}</InfoRow>

                      <InfoRow label="Hubungan">{party.relationship}</InfoRow>

                      <InfoRow label="Alamat">
                        {formatAddress(party.address)}
                      </InfoRow>
                    </div>
                  ))}
                </div>

                <p className="mt-3 leading-5">
                  dalam Berita Acara Serah Terima Dokumen Moral Obligasi yang
                  selanjutnya disebut{" "}
                  <span className="font-semibold">PIHAK PERTAMA</span>, yang
                  menyerahkan.
                </p>
              </div>
            )}

            {relatedParties.length === 0 && (
              <p className="mt-4 leading-5">
                yang selanjutnya disebut{" "}
                <span className="font-semibold">PIHAK PERTAMA</span>, yang
                menyerahkan.
              </p>
            )}

            {/* Pihak Kedua */}
            <div className="mt-4">
              <p className="mb-2 font-semibold">PIHAK KEDUA</p>

              <InfoRow label="Nama">{secondPartyName}</InfoRow>

              <InfoRow label="NIP">{bast.secondPartyNip}</InfoRow>

              <InfoRow label="Jabatan">{secondPartyPosition}</InfoRow>

              <InfoRow label="Unit Kerja">{unitName}</InfoRow>
            </div>

            {/* Pernyataan PK */}
            <div className="mt-5 text-justify leading-5">
              <p>
                PIHAK PERTAMA berdasarkan PK Nomor :{" "}
                <span className="font-semibold">{pk.pkNumber || "-"}</span>{" "}
                tanggal :{" "}
                <span className="font-semibold">
                  {formatIndonesianDate(pk.pkDate)}
                </span>{" "}
                menyatakan dengan sadar dan tanpa paksaan menyerahkan dokumen
                agunan terinci dalam tabel di bawah ini:
              </p>
            </div>

            {/* Tabel */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse border border-zinc-800 text-[10px]">
                <thead>
                  <tr>
                    <th className="w-8 border border-zinc-800 px-1.5 py-1.5 text-center font-bold">
                      No.
                    </th>

                    <th className="w-[17%] border border-zinc-800 px-1.5 py-1.5 text-left font-bold">
                      SHM
                    </th>

                    <th className="w-[30%] border border-zinc-800 px-1.5 py-1.5 text-left font-bold">
                      Nama Kepemilikan Dokumen
                    </th>

                    <th className="w-[14%] border border-zinc-800 px-1.5 py-1.5 text-left font-bold">
                      Luas
                    </th>

                    <th className="border border-zinc-800 px-1.5 py-1.5 text-left font-bold">
                      Hubungan dengan Debitur
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {selectedCollaterals.length > 0 ? (
                    selectedCollaterals.map((collateral, index) => (
                      <tr key={collateral.id || `COL-${index}`}>
                        <td className="border border-zinc-800 px-1.5 py-1.5 text-center align-top">
                          {index + 1}
                        </td>

                        <td className="border border-zinc-800 px-1.5 py-1.5 align-top font-medium">
                          {collateral.number || "-"}
                        </td>

                        <td className="border border-zinc-800 px-1.5 py-1.5 align-top">
                          {getOwnershipName(collateral)}
                        </td>

                        <td className="border border-zinc-800 px-1.5 py-1.5 align-top">
                          {collateral.area ? `${collateral.area} m²` : "-"}
                        </td>

                        <td className="border border-zinc-800 px-1.5 py-1.5 align-top">
                          {getRelationshipLabel(collateral.relationship)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="border border-zinc-800 px-3 py-4 text-center"
                      >
                        Belum ada agunan yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Waris signer info */}
            {warisOwnerSigners.length > 0 && (
              <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-2.5 text-[10px]">
                <p className="font-semibold">
                  Pihak yang turut menandatangani:
                </p>

                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {warisOwnerSigners.map((owner, index) => (
                    <li key={owner.id || `WARIS-${index}`}>{owner.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Penyerahan */}
            <div className="mt-4 text-justify leading-5">
              <p>
                Dokumen agunan tersebut diserahkan oleh PIHAK PERTAMA kepada
                PIHAK KEDUA untuk selanjutnya disimpan, dicatat, dan dikelola
                sesuai dengan ketentuan administrasi agunan yang berlaku.
              </p>

              {destinationLabel !== "-" && (
                <p className="mt-2">
                  Penyerahan dokumen ditujukan kepada{" "}
                  <span className="font-semibold">{destinationLabel}</span>.
                </p>
              )}
            </div>

            {/* Penutup */}
            <div className="mt-5 text-justify leading-5">
              <p>
                Demikian berita acara serah terima ini dibuat dan ditandatangani
                rangkap 2 (dua) yang masing-masing mempunyai kekuatan hukum yang
                sama.
              </p>
            </div>

            {/* Tanda tangan */}
            <div className="mt-8">
              <div className="grid grid-cols-2 gap-8 text-[11px]">
                <MainSignature
                  title="Pihak Pertama"
                  name={pk.debtorName || "Nama Debitur"}
                  subtitle="Debitur"
                  approvalParty={primaryRelatedParty}
                />

                <AdditionalSignature
                  title="Pihak Kedua"
                  name={secondPartyName}
                  subtitle={secondPartyPosition}
                />
              </div>

              {/* Waris */}
              {warisOwnerSigners.length > 0 && (
                <div className="mt-8">
                  <p className="mb-4 text-center text-[11px] font-semibold">
                    PIHAK YANG TURUT MENANDATANGANI
                  </p>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-7 text-[11px]">
                    {warisOwnerSigners.map((owner, index) => (
                      <AdditionalSignature
                        key={owner.id || `WARIS-SIGN-${index}`}
                        title="Pihak Terkait / Ahli Waris"
                        name={owner.name}
                        subtitle="Pemilik Agunan / Waris"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer preview */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Tutup Preview
          </button>

          <button
            type="button"
            onClick={onGeneratePdf}
            disabled={generating || selectedCollaterals.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Membuat PDF...
              </>
            ) : (
              <>
                <Download size={16} />
                Generate & Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
