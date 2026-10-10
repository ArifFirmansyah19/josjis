"use client";

import { Pencil, Trash2 } from "lucide-react";
import { MONTHS } from "../utils/lemburConstants";
import { formatDateShort } from "../utils/lemburHelpers";

function getDayNumber(dateValue) {
  if (!dateValue) return "-";

  // Mendukung format tanggal YYYY-MM-DD tanpa masalah zona waktu.
  const match = String(dateValue).match(/^\d{4}-\d{2}-(\d{2})/);

  if (match) return String(Number(match[1]));

  const date = new Date(dateValue);

  return Number.isNaN(date.getTime())
    ? formatDateShort(dateValue)
    : String(date.getDate());
}

function getDuration(start, end) {
  if (!start || !end) return "-";

  const parseTime = (value) => {
    const match = String(value).match(/^(\d{1,2}):(\d{2})/);

    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return hours * 60 + minutes;
  };

  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);

  if (startMinutes === null || endMinutes === null) return "-";

  let totalMinutes = endMinutes - startMinutes;

  // Mendukung lembur yang melewati tengah malam.
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  if (totalMinutes === 0) return "0 M";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) return `${hours} H`;
  if (hours === 0) return `${minutes} M`;

  return `${hours} H ${minutes} M`;
}

function formatTimeRange(start, end) {
  if (!start || !end) return "-";

  return `${String(start).slice(0, 5)}–${String(end).slice(0, 5)}`;
}

export default function TabelLembur({
  calendarMonth,
  calendarYear,
  currentUnitInfo,
  loading,
  monthRecords,
  handleEdit,
  handleDelete,
  saving,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-900/[0.02]">
      <div className="border-b border-zinc-100 px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold text-zinc-900">
          Data Lembur {MONTHS[calendarMonth]} {calendarYear}
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Seluruh pengajuan lembur pada unit{" "}
          <span className="font-medium text-zinc-700">
            {currentUnitInfo.name}
          </span>
          .
        </p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-zinc-500">
          Memuat data...
        </div>
      ) : monthRecords.length === 0 ? (
        <div className="p-10 text-center text-sm text-zinc-500">
          Belum ada data lembur pada bulan ini.
        </div>
      ) : (
        <>
          {/* MOBILE: TANGGAL, KEGIATAN, DAN JAM */}
          <div className="divide-y divide-zinc-100 md:hidden">
            {monthRecords.map((record) => (
              <article
                key={record.id}
                className="px-4 py-3 transition-colors hover:bg-zinc-50/60"
              >
                <div className="flex items-start gap-3">
                  <div className="flex w-9 shrink-0 justify-center pt-0.5">
                    <span className="text-lg font-semibold tabular-nums text-zinc-800">
                      {getDayNumber(record.tanggal)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium leading-5 text-zinc-800">
                      {record.pekerjaan || "-"}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                      <span className="tabular-nums">
                        {formatTimeRange(record.jam_mulai, record.jam_selesai)}
                      </span>

                      <span className="text-zinc-300">·</span>

                      <span className="font-medium text-zinc-600">
                        {getDuration(record.jam_mulai, record.jam_selesai)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(record)}
                      className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-800"
                      title="Edit"
                      aria-label="Edit lembur"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(record.id)}
                      disabled={saving}
                      className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Hapus"
                      aria-label="Hapus lembur"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* DESKTOP: TABEL LENGKAP */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Durasi</th>
                  <th className="px-4 py-3">Pekerjaan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {monthRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="transition-colors hover:bg-zinc-50/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-700">
                      {formatDateShort(record.tanggal)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-600">
                      {formatTimeRange(record.jam_mulai, record.jam_selesai)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {getDuration(record.jam_mulai, record.jam_selesai)}
                    </td>

                    <td className="px-4 py-3 text-zinc-600">
                      {record.pekerjaan || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(record)}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
                          title="Edit"
                          aria-label="Edit lembur"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          disabled={saving}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Hapus"
                          aria-label="Hapus lembur"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
