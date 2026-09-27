"use client";

import PkInput from "@/components/pk/shared/PkInput";
import PkSection from "@/components/pk/shared/PkSection";

function formatRupiah(value) {
  const amount = Number(value || 0);

  if (!amount) {
    return "-";
  }

  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export default function PkBindingSection({ pk, setPk, canEdit, locked }) {
  const collaterals = Array.isArray(pk.collaterals) ? pk.collaterals : [];

  const boundCollaterals = collaterals.filter(
    (item) => item?.binding?.type && item.binding.type !== "TIDAK ADA",
  );

  return (
    <PkSection
      title="Pengikatan & Notaris"
      description="Ringkasan pengikatan agunan dan proses order notaris."
      locked={locked}
    >
      {boundCollaterals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5">
          <p className="text-sm font-medium text-zinc-700">
            Tidak ada agunan yang memerlukan pengikatan.
          </p>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Jenis pengikatan ditentukan otomatis pada masing-masing data agunan
            berdasarkan limit pinjaman dan jenis sertifikat.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {boundCollaterals.map((collateral, index) => {
            const binding = collateral.binding || {};

            return (
              <div
                key={collateral.id || `binding-${index}`}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {collateral.type || "Agunan"}{" "}
                      {collateral.number ? `- ${collateral.number}` : ""}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Atas Nama: {collateral.owner || "-"}
                    </p>
                  </div>

                  <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
                    {binding.type}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <PkInput
                    label="Jenis Pengikatan"
                    value={binding.type || "-"}
                    disabled
                  />

                  <PkInput
                    label="Notaris"
                    value={binding.notaryName || ""}
                    disabled
                  />

                  <PkInput
                    label="Kode Notaris"
                    value={binding.notaryCode || ""}
                    disabled
                  />

                  <div>
                    <PkInput
                      label="Biaya Pengikatan"
                      value={binding.fee ?? ""}
                      disabled
                    />

                    {binding.fee && (
                      <p className="mt-1.5 text-xs text-zinc-500">
                        {formatRupiah(binding.fee)}
                      </p>
                    )}
                  </div>

                  <PkInput
                    label="Nomor Surat Keluar Order Notaris"
                    value={binding.outgoingLetterNumber || ""}
                    disabled
                  />

                  <PkInput
                    label="Status Pengikatan"
                    value={binding.status || "BELUM DIPROSES"}
                    disabled
                  />
                </div>

                {binding.note && (
                  <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      Catatan Pengikatan
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                      {binding.note}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">Informasi</p>

        <p className="mt-1 text-xs leading-5 text-blue-700">
          Jenis pengikatan ditentukan otomatis dari limit pinjaman dan jenis
          sertifikat. Data Notaris, biaya, dan nomor surat keluar order notaris
          dikelola pada data agunan terkait.
        </p>
      </div>
    </PkSection>
  );
}
