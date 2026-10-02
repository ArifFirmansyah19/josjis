"use client";

import { Eye } from "lucide-react";

import {
  formatDateShort,
  formatMksName,
  formatCurrency,
} from "../helpers/pkFormatters";

export default function PkMobileTable({ loading, visiblePk, openDetail }) {
  return (
    <div className="lg:hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-2.5 py-2.5 text-left text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                MKS
              </th>

              <th className="px-2.5 py-2.5 text-left text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                Tgl
              </th>

              <th className="px-2.5 py-2.5 text-left text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                Nama Debitur
              </th>

              <th className="px-2.5 py-2.5 text-right text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                Limit
              </th>

              <th className="px-2.5 py-2.5 text-center text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                Detail
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-10 text-center text-xs text-zinc-400"
                >
                  Memuat...
                </td>
              </tr>
            ) : visiblePk.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-10 text-center text-xs text-zinc-400"
                >
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              visiblePk.map((pk) => (
                <tr
                  key={pk.id}
                  onClick={() => openDetail(pk)}
                  className="cursor-pointer border-b border-zinc-100 transition active:bg-zinc-100 last:border-b-0"
                >
                  <td className="max-w-[110px] px-2.5 py-2.5 align-middle">
                    <div className="truncate text-[10px] font-bold text-zinc-800">
                      {formatMksName(pk.mksName)}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-2.5 py-2.5 align-middle">
                    <div className="text-[10px] font-medium text-zinc-600">
                      {formatDateShort(pk.tanggalPk)}
                    </div>
                  </td>

                  <td className="max-w-[180px] px-2.5 py-2.5 align-middle">
                    <div className="truncate text-[10px] font-semibold text-zinc-800">
                      {pk.nama_debitur || pk.namaDebitur || "-"}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-2.5 py-2.5 text-right align-middle">
                    <div className="text-[10px] font-bold text-zinc-800">
                      {formatCurrency(pk.limitKredit)}
                    </div>
                  </td>

                  <td
                    className="px-2.5 py-2.5 text-center align-middle"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openDetail(pk)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
                      title="Detail PK"
                    >
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2">
        <p className="text-[9px] text-zinc-400">
          Ketuk baris untuk membuka detail PK.
        </p>
      </div>
    </div>
  );
}
