"use client";

import { Eye, Pencil, LockKeyhole } from "lucide-react";

import { getCompleteness } from "@/lib/pk/pkCompleteness";

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function PkTable({ data = [], role, onOpen }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1450px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                No
              </th>

              {role === "ADMIN" && (
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                  SGP
                </th>
              )}

              <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                MKS
              </th>

              <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                Nama Debitur
              </th>

              <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                NIK
              </th>

              <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                Jenis
              </th>

              <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                Tgl PK
              </th>

              <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                No. PK
              </th>

              <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                Limit
              </th>

              <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                CIF
              </th>

              <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                Kelengkapan
              </th>

              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={role === "ADMIN" ? 12 : 11}
                  className="px-6 py-16 text-center text-sm text-zinc-500"
                >
                  Tidak ada data PK.
                </td>
              </tr>
            ) : (
              data.map((pk, index) => {
                const completeness = getCompleteness(pk);

                const lockedCount = Object.values(pk.locks || {}).filter(
                  Boolean,
                ).length;

                return (
                  <tr key={pk.id} className="transition hover:bg-zinc-50">
                    <td className="px-4 py-4 text-zinc-500">{index + 1}</td>

                    {role === "ADMIN" && (
                      <td className="px-4 py-4">
                        <div className="font-medium text-zinc-800">
                          {pk.mksName || "-"}
                        </div>

                        <div className="text-xs text-zinc-400">
                          {pk.mksAgentCode || "-"}
                        </div>
                      </td>
                    )}

                    <td className="px-4 py-4">
                      {pk.mksName || pk.mksId || "-"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-zinc-900">
                        {pk.debtorName || "-"}
                      </div>

                      {lockedCount > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400">
                          <LockKeyhole size={11} />
                          {lockedCount} bagian dikunci
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs text-zinc-600">
                      {pk.nik || "-"}
                    </td>

                    <td className="px-4 py-4">{pk.loanType || "-"}</td>

                    <td className="px-4 py-4 text-zinc-600">
                      {pk.pkDate || "-"}
                    </td>

                    <td className="px-4 py-4 font-medium">
                      {pk.pkNumber || "-"}
                    </td>

                    <td className="px-4 py-4 font-medium">
                      {formatRupiah(pk.limit)}
                    </td>

                    <td className="px-4 py-4">{pk.cif || "-"}</td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          completeness.complete
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {completeness.complete
                          ? "Lengkap"
                          : `${completeness.missing.length} kurang`}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onOpen(pk)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          <Eye size={14} />
                          Detail
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpen(pk)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
