"use client";

import { Eye, Pencil } from "lucide-react";

import {
  formatDate,
  formatMksName,
  formatCurrency,
} from "../helpers/pkFormatters";

function ProductBadge({ value }) {
  const product = String(value || "-").toUpperCase();

  return (
    <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-bold text-zinc-700">
      {product}
    </span>
  );
}

function AgunanBadge({ value }) {
  const count = Number(value || 0);

  return (
    <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-600">
      {count} agunan
    </span>
  );
}

export default function PkDesktopTable({
  loading,
  visiblePk,
  saving,
  openDetail,
  openEdit,
}) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[1180px] border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Tgl PK
            </th>

            <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              MKS
            </th>

            <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Nama Debitur
            </th>

            <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Tgl Peminjaman
            </th>

            <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Produk
            </th>

            <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Tenor
            </th>

            <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Agunan
            </th>

            <th className="whitespace-nowrap px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Limit
            </th>

            <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Detail / Aksi
            </th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={9}
                className="px-4 py-12 text-center text-xs text-zinc-400"
              >
                Memuat data PK...
              </td>
            </tr>
          ) : visiblePk.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="px-4 py-12 text-center text-xs text-zinc-400"
              >
                Tidak ada data PK yang sesuai filter.
              </td>
            </tr>
          ) : (
            visiblePk.map((pk) => (
              <tr
                key={pk.id}
                onClick={() => openDetail(pk)}
                className="group cursor-pointer border-b border-zinc-100 transition hover:bg-zinc-50 last:border-b-0"
              >
                <td className="px-3 py-3 align-middle">
                  <div className="whitespace-nowrap text-xs font-semibold text-zinc-800">
                    {formatDate(pk.tanggalPk)}
                  </div>
                </td>

                <td className="px-3 py-3 align-middle">
                  <div className="max-w-[130px] truncate text-xs font-bold text-zinc-800">
                    {formatMksName(pk.mksName)}
                  </div>

                  {pk.mksAgentCode && (
                    <div className="mt-0.5 text-[9px] text-zinc-400">
                      {pk.mksAgentCode}
                    </div>
                  )}
                </td>

                <td className="px-3 py-3 align-middle">
                  <div className="max-w-[230px] truncate text-xs font-semibold text-zinc-800">
                    {pk.nama_debitur || pk.namaDebitur || "-"}
                  </div>

                  {(pk.cif || pk.nomor_ktp || pk.nik) && (
                    <div className="mt-0.5 truncate text-[9px] text-zinc-400">
                      {pk.cif
                        ? `CIF ${pk.cif}`
                        : `NIK ${pk.nomor_ktp || pk.nik}`}
                    </div>
                  )}
                </td>

                <td className="px-3 py-3 align-middle">
                  <div className="whitespace-nowrap text-xs text-zinc-700">
                    {formatDate(pk.tanggalPeminjaman)}
                  </div>
                </td>

                <td className="px-3 py-3 align-middle">
                  <ProductBadge value={pk.jenisPengajuanKredit} />
                </td>

                <td className="px-3 py-3 text-center align-middle">
                  <span className="text-xs font-medium text-zinc-700">
                    {pk.tenor ? `${pk.tenor} bln` : "-"}
                  </span>
                </td>

                <td className="px-3 py-3 text-center align-middle">
                  <AgunanBadge value={pk.jumlahAgunan} />
                </td>

                <td className="px-3 py-3 text-right align-middle">
                  <div className="whitespace-nowrap text-xs font-bold text-zinc-800">
                    {formatCurrency(pk.limitKredit)}
                  </div>
                </td>

                <td
                  className="px-3 py-3 align-middle"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openDetail(pk)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[10px] font-bold text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                    >
                      <Eye size={13} />
                      Detail
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(pk)}
                      disabled={saving}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 text-[10px] font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
