"use client";

import { MessageSquareText } from "lucide-react";

export default function CorrectionMessage({ correction }) {
  if (!correction) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex gap-3">
        <MessageSquareText className="h-5 w-5 shrink-0 text-blue-600" />

        <div>
          <p className="text-sm font-semibold text-blue-900">
            Permintaan perbaikan dari Admin
          </p>

          <p className="mt-1 text-xs text-blue-700">
            Bagian: <strong>{correction.section}</strong>
          </p>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            {correction.message}
          </p>
        </div>
      </div>
    </div>
  );
}
