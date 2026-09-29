"use client";

import { useMemo } from "react";
import { Check, Circle } from "lucide-react";

import PkSection from "@/components/pk/shared/PkSection";
import { getApplicableDocuments } from "@/lib/pk/pkCompleteness";

export default function PkDocumentSection({ pk, setPk, canEdit, locked }) {
  const documents = pk.documents || {};

  const applicableDocuments = useMemo(() => {
    return getApplicableDocuments(pk);
  }, [pk]);

  const completedCount = applicableDocuments.filter(
    (document) => documents[document.key],
  ).length;

  const totalCount = applicableDocuments.length;

  const percentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleDocument = (key) => {
    if (!canEdit || locked) {
      return;
    }

    setPk((prev) => ({
      ...prev,
      documents: {
        ...(prev.documents || {}),
        [key]: !prev.documents?.[key],
      },
    }));
  };

  return (
    <PkSection
      title="Dokumen"
      description="Checklist kelengkapan dokumen PK. Dokumen yang muncul menyesuaikan kondisi PK."
      locked={locked}
    >
      <div className="space-y-4">
        {/* SUMMARY */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500">
                Kelengkapan Dokumen
              </p>

              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {completedCount} / {totalCount}
              </p>
            </div>

            <div className="min-w-[180px]">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Progress</span>

                <span className="font-semibold text-zinc-700">
                  {percentage}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-all"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CHECKLIST */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-900">
              Ringkasan Checklist
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Klik dokumen untuk mengubah status kelengkapan.
            </p>
          </div>

          <div className="divide-y divide-zinc-100">
            {applicableDocuments.map((document) => {
              const checked = Boolean(documents[document.key]);

              return (
                <button
                  key={document.key}
                  type="button"
                  onClick={() => toggleDocument(document.key)}
                  disabled={!canEdit || locked}
                  className={[
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                    canEdit && !locked ? "hover:bg-zinc-50" : "cursor-default",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      checked
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-transparent",
                    ].join(" ")}
                  >
                    {checked ? (
                      <Check size={13} strokeWidth={2.5} />
                    ) : (
                      <Circle size={9} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={[
                        "block text-sm font-medium",
                        checked ? "text-zinc-900" : "text-zinc-700",
                      ].join(" ")}
                    >
                      {document.label}
                    </span>

                    {document.description && (
                      <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                        {document.description}
                      </span>
                    )}

                    {document.required && (
                      <span className="mt-1 inline-block text-[11px] font-medium text-rose-600">
                        Wajib
                      </span>
                    )}
                  </span>

                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium",
                      checked
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    ].join(" ")}
                  >
                    {checked ? "Lengkap" : "Belum Lengkap"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* INFO KONDISIONAL */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold text-blue-900">
            Dokumen Kondisional
          </p>

          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-blue-800">
            <li>• NPWP mengikuti jenis pinjaman dan limit.</li>

            <li>• BPJS TK berlaku untuk KUR di atas Rp100 juta.</li>

            <li>• Dokumen pasangan mengikuti status perkawinan.</li>

            <li>• CN muncul apabila PK membutuhkan pengikatan.</li>

            <li>
              • BAST Moral muncul apabila terdapat agunan moral/tambahan yang
              tidak diikat.
            </li>
          </ul>
        </div>
      </div>
    </PkSection>
  );
}
