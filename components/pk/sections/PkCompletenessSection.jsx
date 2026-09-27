"use client";

import { AlertCircle, CheckCircle2, FileCheck2 } from "lucide-react";

import PkSection from "@/components/pk/shared/PkSection";
import { getCompleteness } from "@/lib/pk/pkCompleteness";

export default function PkCompletenessSection({ pk }) {
  const result = getCompleteness(pk);

  const percentage =
    result.total > 0 ? Math.round((result.completed / result.total) * 100) : 0;

  const isComplete = result.complete;

  return (
    <PkSection
      title="Ringkasan Kelengkapan"
      description="Ringkasan kelengkapan data PK dan dokumen yang masih perlu dilengkapi."
    >
      <div className="space-y-5">
        {/* SUMMARY */}
        <div
          className={[
            "rounded-xl border p-4",
            isComplete
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {isComplete ? (
                <CheckCircle2 size={22} className="mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle size={22} className="mt-0.5 text-amber-600" />
              )}

              <div>
                <p
                  className={[
                    "text-sm font-semibold",
                    isComplete ? "text-emerald-900" : "text-amber-900",
                  ].join(" ")}
                >
                  {isComplete ? "PK Lengkap" : "PK Belum Lengkap"}
                </p>

                <p
                  className={[
                    "mt-1 text-xs leading-5",
                    isComplete ? "text-emerald-800" : "text-amber-800",
                  ].join(" ")}
                >
                  {isComplete
                    ? "Seluruh data dan dokumen yang dipersyaratkan telah terpenuhi."
                    : `${result.missing.length} item masih perlu dilengkapi.`}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold text-zinc-900">{percentage}%</p>

              <p className="text-[11px] text-zinc-500">
                {result.completed} dari {result.total} item
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
            <div
              className={[
                "h-full rounded-full transition-all",
                isComplete ? "bg-emerald-600" : "bg-amber-500",
              ].join(" ")}
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>
        </div>

        {/* MISSING ITEMS */}
        {!isComplete && (
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <FileCheck2 size={17} className="text-zinc-500" />

              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Yang Masih Perlu Dilengkapi
                </h3>

                <p className="mt-1 text-xs text-zinc-500">
                  Daftar ini mengikuti rule kelengkapan PK.
                </p>
              </div>
            </div>

            <div className="divide-y divide-zinc-100">
              {result.missing.map((item, index) => {
                const key =
                  typeof item === "string"
                    ? item
                    : item.key || `missing-${index}`;

                const label =
                  typeof item === "string"
                    ? item
                    : item.label || item.name || item.key;

                return (
                  <div key={key} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />

                    <div className="min-w-0">
                      <p className="text-sm text-zinc-800">{label}</p>

                      {typeof item !== "string" && item.description && (
                        <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COMPLETE STATE */}
        {isComplete && (
          <div className="rounded-xl border border-emerald-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Tidak ada data wajib yang tertinggal
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  PK memenuhi seluruh persyaratan kelengkapan berdasarkan
                  kondisi data saat ini.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* INFO */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold text-zinc-800">Catatan</p>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            PK tetap dapat disimpan walaupun belum lengkap. Status kelengkapan
            akan diperbarui otomatis berdasarkan data dan checklist dokumen yang
            tersedia.
          </p>
        </div>
      </div>
    </PkSection>
  );
}
