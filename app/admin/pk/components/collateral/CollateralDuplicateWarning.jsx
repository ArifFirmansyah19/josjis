"use client";

import { AlertTriangle } from "lucide-react";

export default function CollateralDuplicateWarning({ duplicate }) {
  if (!duplicate) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

        <div>
          <p className="text-sm font-semibold text-amber-800">
            Agunan/SHM sudah terdaftar
          </p>

          <p className="mt-1 text-xs leading-5 text-amber-700">
            Nomor sertifikat ini sudah digunakan pada PK{" "}
            <strong>{duplicate.pk?.pkNumber || "-"}</strong> atas nama{" "}
            <strong>{duplicate.pk?.debtorName || "-"}</strong>.
          </p>

          <p className="mt-2 text-xs text-amber-700">
            Jangan membuat SHM baru. Gunakan record agunan yang sudah ada dan
            hubungkan dengan PK ini.
          </p>
        </div>
      </div>
    </div>
  );
}
