"use client";

import { Edit3, Trash2 } from "lucide-react";

function formatRekanan(value) {
  return value ? "Iya" : "Tidak";
}

function maskRekening(value) {
  if (!value) return "-";

  const text = String(value);

  if (text.length <= 4) {
    return text;
  }

  return `${"*".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
}

export default function NotarisTable({
  records = [],
  loading = false,
  onView,
  onEdit,
  onDelete,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* DESKTOP */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Nama Notaris
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Provinsi
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Kabupaten
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Nomor Rekening
              </th>

              <th className="w-[110px] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Rekanan
              </th>

              <th className="w-[110px] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-zinc-500"
                >
                  Memuat data notaris...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-zinc-700">
                    Belum ada data notaris
                  </p>

                  <p className="mt-1 text-xs text-zinc-400">
                    Silakan tambahkan notaris baru.
                  </p>
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => onView?.(record)}
                  className="
                    cursor-pointer
                    border-b
                    border-zinc-100
                    transition
                    hover:bg-zinc-50
                    active:bg-zinc-100
                  "
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-zinc-800">
                      {record.nama_notaris}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {record.provinsi}
                  </td>

                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {record.kabupaten}
                  </td>

                  <td className="px-4 py-3 font-mono text-sm text-zinc-600">
                    {record.nomor_rekening || "-"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        record.jenis_rekanan
                          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                          : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500"
                      }
                    >
                      {formatRekanan(record.jenis_rekanan)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-center gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit?.(record);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        title="Edit"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete?.(record.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE */}
      <div className="block sm:hidden">
        {loading ? (
          <div className="px-4 py-12 text-center text-xs text-zinc-500">
            Memuat data notaris...
          </div>
        ) : records.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-zinc-700">
              Belum ada data notaris
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              Silakan tambahkan notaris baru.
            </p>
          </div>
        ) : (
          <div>
            {records.map((record) => (
              <div
                key={record.id}
                onClick={() => onView?.(record)}
                className="
                  cursor-pointer
                  border-b
                  border-zinc-100
                  px-4
                  py-3.5
                  transition
                  active:bg-zinc-100
                "
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-800">
                      {record.nama_notaris}
                    </p>

                    <p className="mt-1 text-[11px] text-zinc-500">
                      {record.kabupaten}, {record.provinsi}
                    </p>

                    <p className="mt-1 font-mono text-[11px] text-zinc-500">
                      Rekening: {maskRekening(record.nomor_rekening)}
                    </p>

                    <div className="mt-2">
                      <span
                        className={
                          record.jenis_rekanan
                            ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                            : "inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500"
                        }
                      >
                        Rekanan: {formatRekanan(record.jenis_rekanan)}
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex shrink-0 items-center gap-0.5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit?.(record);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete?.(record.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
