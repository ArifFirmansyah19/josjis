"use client";

import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

function getHari(value) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return DAY_NAMES[date.getDay()];
}

function formatTanggal(value) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

export default function SuratKeluarBook({
  unit,
  records,
  page,
  totalPages,
  rowsPerPage = 15,
  onPageChange,
  onEdit,
  onDelete,
}) {
  const startIndex = (page - 1) * rowsPerPage;

  const pageRecords = records.slice(startIndex, startIndex + rowsPerPage);

  const emptyRows = Math.max(0, rowsPerPage - pageRecords.length);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Buku Surat Keluar
            </h2>

            <p className="mt-0.5 text-sm text-zinc-500">
              Register surat keluar {unit}
            </p>
          </div>

          <div className="text-sm font-medium text-zinc-500">
            Halaman {page} dari {totalPages}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-5">
        <div
          key={`${unit}-${page}`}
          className="surat-keluar-page overflow-hidden rounded-xl border border-zinc-300 bg-white"
        >
          <div className="border-b border-zinc-300 px-4 py-4 text-center sm:px-6">
            <div className="text-base font-bold uppercase tracking-wide text-zinc-900">
              BUKU SURAT KELUAR
            </div>

            <div className="mt-1 text-sm font-medium text-zinc-600">{unit}</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-14 border border-zinc-300 bg-zinc-100 px-3 py-3 text-center font-semibold text-zinc-700">
                    No
                  </th>

                  <th className="w-28 border border-zinc-300 bg-zinc-100 px-3 py-3 text-left font-semibold text-zinc-700">
                    Hari
                  </th>

                  <th className="w-32 border border-zinc-300 bg-zinc-100 px-3 py-3 text-left font-semibold text-zinc-700">
                    Tanggal
                  </th>

                  <th className="border border-zinc-300 bg-zinc-100 px-3 py-3 text-left font-semibold text-zinc-700">
                    Keterangan
                  </th>

                  <th className="border border-zinc-300 bg-zinc-100 px-3 py-3 text-left font-semibold text-zinc-700">
                    Tujuan
                  </th>

                  <th className="w-24 border border-zinc-300 bg-zinc-100 px-3 py-3 text-center font-semibold text-zinc-700">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {pageRecords.map((record, index) => (
                  <tr key={record.id} className="transition hover:bg-zinc-50">
                    <td className="border border-zinc-300 px-3 py-3 text-center text-zinc-600">
                      {String(startIndex + index + 1).padStart(3, "0")}
                    </td>

                    <td className="border border-zinc-300 px-3 py-3 text-zinc-700">
                      {getHari(record.tanggal)}
                    </td>

                    <td className="border border-zinc-300 px-3 py-3 text-zinc-700">
                      {formatTanggal(record.tanggal)}
                    </td>

                    <td className="border border-zinc-300 px-3 py-3 text-zinc-700">
                      {record.keterangan || "-"}
                    </td>

                    <td className="border border-zinc-300 px-3 py-3 text-zinc-700">
                      {record.tujuan || "-"}
                    </td>

                    <td className="border border-zinc-300 px-2 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(record.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-600"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {Array.from({ length: emptyRows }).map((_, index) => (
                  <tr key={`empty-${index}`}>
                    <td className="h-11 border border-zinc-300 px-3">&nbsp;</td>
                    <td className="border border-zinc-300 px-3">&nbsp;</td>
                    <td className="border border-zinc-300 px-3">&nbsp;</td>
                    <td className="border border-zinc-300 px-3">&nbsp;</td>
                    <td className="border border-zinc-300 px-3">&nbsp;</td>
                    <td className="border border-zinc-300 px-3">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-300 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-xs text-zinc-500">
              Menampilkan {pageRecords.length} pencatatan
              {records.length > 0 && ` dari ${records.length} pencatatan`}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </button>

              <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-zinc-900 px-3 text-sm font-semibold text-white">
                {page}
              </div>

              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .surat-keluar-page {
          animation: suratKeluarPageFlip 0.25s ease-out;
          transform-origin: left center;
        }

        @keyframes suratKeluarPageFlip {
          0% {
            opacity: 0;
            transform: perspective(1200px) rotateY(-8deg);
          }

          100% {
            opacity: 1;
            transform: perspective(1200px) rotateY(0deg);
          }
        }
      `}</style>
    </div>
  );
}
