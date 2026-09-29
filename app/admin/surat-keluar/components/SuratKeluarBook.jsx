"use client";

import { ChevronLeft, ChevronRight, Edit3, Trash2 } from "lucide-react";

function formatNomor(nomor) {
  return String(nomor ?? 0).padStart(3, "0");
}

function formatTanggalDesktop(tanggal) {
  if (!tanggal) return "-";

  const date = new Date(`${tanggal}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTanggalMobile(tanggal) {
  if (!tanggal) return "-";

  const date = new Date(`${tanggal}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

export default function SuratKeluarBook({
  unit,
  tahun,
  records = [],
  page = 1,
  totalPages = 1,
  rowsPerPage = 10,
  loading = false,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}) {
  const startIndex = (page - 1) * rowsPerPage;

  const visibleRecords = records.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 sm:px-6">
        <h2 className="text-sm font-bold text-zinc-900 sm:text-base">
          Buku Surat Keluar
        </h2>

        <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
          {unit === "JKK 1"
            ? "Jambi Kuamang Kuning 1"
            : "Jambi Kuamang Kuning 2"}{" "}
          · Tahun {tahun}
        </p>
      </div>

      {/* =====================================================
          DESKTOP
          ===================================================== */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-white">
              <th className="w-[70px] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                No.
              </th>

              <th className="w-[130px] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Tanggal
              </th>

              <th className="w-[110px] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Hari
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Keterangan
              </th>

              <th className="w-[220px] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Tujuan
              </th>

              <th className="w-[110px] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />

                    <p className="text-sm text-zinc-500">
                      Memuat data surat keluar...
                    </p>
                  </div>
                </td>
              </tr>
            ) : visibleRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-zinc-700">
                    Belum ada surat keluar
                  </p>

                  <p className="mt-1 text-xs text-zinc-400">
                    Belum ada data untuk {unit} tahun {tahun}.
                  </p>
                </td>
              </tr>
            ) : (
              visibleRecords.map((record) => (
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
                  {/* NO */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex min-w-[42px] justify-center rounded-lg bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700">
                      {formatNomor(record.nomor_urut)}
                    </span>
                  </td>

                  {/* TANGGAL */}
                  <td className="px-4 py-3 text-sm text-zinc-800">
                    {formatTanggalDesktop(record.tanggal)}
                  </td>

                  {/* HARI */}
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {record.hari || "-"}
                  </td>

                  {/* KETERANGAN */}
                  <td className="max-w-[320px] px-4 py-3">
                    <p className="line-clamp-2 text-sm leading-5 text-zinc-700">
                      {record.keterangan || "-"}
                    </p>
                  </td>

                  {/* TUJUAN */}
                  <td className="max-w-[220px] px-4 py-3">
                    <p className="line-clamp-2 text-sm leading-5 text-zinc-600">
                      {record.tujuan || "-"}
                    </p>
                  </td>

                  {/* AKSI */}
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

      {/* =====================================================
          MOBILE
          No | Hari | Tgl | Keterangan | Aksi
          ===================================================== */}
      <div className="block sm:hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />

            <p className="text-xs text-zinc-500">Memuat data...</p>
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-zinc-700">
              Belum ada surat keluar
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              Belum ada data untuk {unit} tahun {tahun}.
            </p>
          </div>
        ) : (
          <div>
            {/* HEADER MOBILE */}
            <div className="grid grid-cols-[48px_58px_70px_minmax(0,1fr)_58px] items-center border-b border-zinc-200 bg-zinc-50 px-2 py-2">
              <div className="text-center text-[9px] font-bold uppercase text-zinc-500">
                No.
              </div>

              <div className="text-center text-[9px] font-bold uppercase text-zinc-500">
                Hari
              </div>

              <div className="text-center text-[9px] font-bold uppercase text-zinc-500">
                Tgl
              </div>

              <div className="px-1 text-left text-[9px] font-bold uppercase text-zinc-500">
                Keterangan
              </div>

              <div className="text-center text-[9px] font-bold uppercase text-zinc-500">
                Aksi
              </div>
            </div>

            {/* DATA MOBILE */}
            {visibleRecords.map((record) => (
              <div
                key={record.id}
                onClick={() => onView?.(record)}
                className="
                  grid
                  cursor-pointer
                  grid-cols-[48px_58px_70px_minmax(0,1fr)_58px]
                  items-center
                  border-b
                  border-zinc-100
                  px-2
                  py-3
                  transition
                  hover:bg-zinc-50
                  active:bg-zinc-100
                "
              >
                {/* NO */}
                <div className="text-center">
                  <span className="text-[11px] font-bold tabular-nums text-zinc-700">
                    {formatNomor(record.nomor_urut)}
                  </span>
                </div>

                {/* HARI */}
                <div className="text-center">
                  <span className="text-[10px] text-zinc-600">
                    {record.hari || "-"}
                  </span>
                </div>

                {/* TANGGAL */}
                <div className="text-center">
                  <span className="text-[10px] font-medium tabular-nums text-zinc-700">
                    {formatTanggalMobile(record.tanggal)}
                  </span>
                </div>

                {/* KETERANGAN */}
                <div className="min-w-0 px-1">
                  <p className="line-clamp-2 break-words text-[11px] leading-4 text-zinc-700">
                    {record.keterangan || "-"}
                  </p>
                </div>

                {/* AKSI */}
                <div
                  className="flex items-center justify-center gap-0.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit?.(record);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 active:bg-zinc-100"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete?.(record.id);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 active:bg-red-50 active:text-red-600"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && records.length > 0 && (
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-3 py-3 sm:px-5">
          <p className="text-[10px] text-zinc-500 sm:text-xs">
            Halaman <span className="font-semibold text-zinc-700">{page}</span>{" "}
            dari{" "}
            <span className="font-semibold text-zinc-700">
              {Math.max(totalPages, 1)}
            </span>
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange?.(Math.max(1, page - 1))}
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                border
                border-zinc-200
                bg-white
                text-zinc-600
                hover:bg-zinc-100
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <ChevronLeft size={15} />
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                border
                border-zinc-200
                bg-white
                text-zinc-600
                hover:bg-zinc-100
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
