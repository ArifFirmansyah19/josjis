"use client";

import { Edit3, Eye } from "lucide-react";

import { formatMksName } from "../helpers/pkFormatters";

function getMksCode(name) {
  if (!name) return "-";

  const firstName = String(name).trim().split(/\s+/).filter(Boolean)[0];

  return firstName ? firstName.slice(0, 3).toUpperCase() : "-";
}

function getLimitShort(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const number = Number(String(value).replace(/[^\d.-]/g, ""));

  if (!Number.isFinite(number)) {
    return "-";
  }

  return Math.round(number / 1000000).toLocaleString("id-ID");
}

function formatMobileDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const day = String(date.getDate()).padStart(2, "0");

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sept",
    "Okt",
    "Nov",
    "Des",
  ];

  return `${day}-${months[date.getMonth()]}`;
}

function getProductShort(pk) {
  const value =
    pk.jenisPengajuanKredit ||
    pk.jenis_pengajuan_kredit ||
    pk.loanType ||
    pk.jenisKredit ||
    "";

  if (!value) return "-";

  const text = String(value).trim();

  const upper = text.toUpperCase();

  if (upper.includes("KUR")) return "KUR";
  if (upper.includes("KUM")) return "KUM";
  if (upper.includes("KPP")) return "KPP";
  if (upper.includes("KSM")) return "KSM";

  return text.length > 6 ? text.slice(0, 6) : text;
}

export default function PkMobileTable({
  loading,
  visiblePk,
  openDetail,
  openEdit,
}) {
  return (
    <div className="lg:hidden">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="w-[34%] px-2.5 py-2.5 text-left text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                Debitur
              </th>

              <th className="w-[11%] px-1 py-2.5 text-center text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                MKS
              </th>

              <th className="w-[13%] px-1 py-2.5 text-center text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                Produk
              </th>

              <th className="w-[12%] px-1 py-2.5 text-center text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                Tgl
              </th>

              <th className="w-[12%] px-1 py-2.5 text-center text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                Limit
              </th>

              <th className="w-[18%] px-1 py-2.5 text-center text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-xs text-zinc-400"
                >
                  Memuat...
                </td>
              </tr>
            ) : visiblePk.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
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
                  className="cursor-pointer border-b border-zinc-100 transition active:bg-zinc-50 last:border-b-0"
                >
                  <td className="px-2.5 py-2.5 align-middle">
                    <div className="break-words text-[10px] font-semibold leading-4 text-zinc-800">
                      {pk.nama_debitur || pk.namaDebitur || "-"}
                    </div>
                  </td>

                  <td className="px-1 py-2.5 text-center align-middle">
                    <div
                      className="text-[10px] font-bold tracking-wide text-zinc-700"
                      title={formatMksName(pk.mksName)}
                    >
                      {getMksCode(pk.mksName)}
                    </div>
                  </td>

                  <td className="px-1 py-2.5 text-center align-middle">
                    <div className="truncate text-[9px] font-semibold text-zinc-600">
                      {getProductShort(pk)}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-1 py-2.5 text-center align-middle">
                    <div className="text-[9px] font-medium text-zinc-600">
                      {formatMobileDate(pk.tanggalPk)}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-1 py-2.5 text-center align-middle">
                    <div className="text-[10px] font-bold text-zinc-800">
                      {getLimitShort(pk.limitKredit)}
                    </div>
                  </td>

                  <td
                    className="px-1 py-2.5 text-center align-middle"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openDetail(pk)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 active:bg-zinc-100"
                        title="Detail PK"
                        aria-label="Detail PK"
                      >
                        <Eye size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(pk)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 active:bg-zinc-100"
                        title="Edit PK"
                        aria-label="Edit PK"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-zinc-100 px-3 py-2">
        <p className="text-[9px] text-zinc-400">
          Ketuk baris atau View untuk membuka detail PK.
        </p>
      </div>
    </div>
  );
}
