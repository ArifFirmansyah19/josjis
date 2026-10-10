"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  MONTHS,
  NATIONAL_HOLIDAYS_2026,
  WEEKDAYS_SHORT,
} from "../utils/lemburConstants";
import { dateKey } from "../utils/lemburHelpers";

function CalendarDay({ date, selected, today, holiday, hasOvertime, onClick }) {
  if (!date)
    return <div className="aspect-square bg-zinc-50/50" aria-hidden="true" />;
  const key = dateKey(date);
  const isSunday = date.getDay() === 0;
  const isSaturday = date.getDay() === 6;
  let background = "bg-white hover:bg-zinc-50";
  if (holiday || isSunday) background = "bg-red-50 hover:bg-red-100";
  else if (isSaturday) background = "bg-amber-50 hover:bg-amber-100";
  if (today && !selected) background = "bg-blue-50 hover:bg-blue-100";
  if (hasOvertime && !selected)
    background = "bg-emerald-50 hover:bg-emerald-100";
  if (selected) background = "bg-zinc-900 text-white hover:bg-zinc-800";
  return (
    <button
      type="button"
      onClick={() => onClick(key)}
      title={holiday || "Klik untuk melihat atau mengajukan lembur"}
      className={[
        "relative aspect-square min-w-0 border-r border-b border-zinc-200 p-1.5 text-left transition sm:p-2",
        background,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold sm:h-8 sm:w-8",
            selected
              ? "bg-white text-zinc-900"
              : holiday || isSunday
                ? "text-red-600"
                : isSaturday
                  ? "text-amber-700"
                  : "text-zinc-800",
            today && !selected ? "ring-2 ring-blue-500 ring-offset-1" : "",
          ].join(" ")}
        >
          {date.getDate()}
        </span>
        {hasOvertime && (
          <span
            className={[
              "mt-1 h-2 w-2 shrink-0 rounded-full",
              selected ? "bg-emerald-300" : "bg-emerald-500",
            ].join(" ")}
          />
        )}
      </div>
      <div className="mt-1">
        {holiday && (
          <div
            className={[
              "line-clamp-2 text-[8px] font-medium leading-tight sm:text-[9px]",
              selected ? "text-red-200" : "text-red-600",
            ].join(" ")}
          >
            {holiday}
          </div>
        )}
        {hasOvertime && (
          <div
            className={[
              "mt-0.5 text-[8px] font-semibold sm:text-[9px]",
              selected ? "text-emerald-200" : "text-emerald-700",
            ].join(" ")}
          >
            Lembur
          </div>
        )}
      </div>
    </button>
  );
}

export default function KalenderLembur({
  calendarMonth,
  calendarYear,
  goToday,
  goPreviousMonth,
  goNextMonth,
  calendarCells,
  selectedDate,
  today,
  getRecordsForDate,
  handleCalendarClick,
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/80 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <CalendarDays size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Kalender Lembur
            </div>
            <div className="text-lg font-bold text-zinc-900">
              {MONTHS[calendarMonth]} {calendarYear}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Hari ini
          </button>
          <button
            type="button"
            onClick={goPreviousMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-b border-zinc-200 px-4 py-3 text-xs font-medium text-zinc-500 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-red-100 ring-1 ring-red-200" />
          Tanggal merah
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-200" />
          Sabtu
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-blue-100 ring-1 ring-blue-200" />
          Hari ini
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-200" />
          Ada lembur
        </div>
      </div>
      <div className="flex justify-center px-3 py-5 sm:px-5 sm:py-6">
        <div className="w-full max-w-[590px] overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
          <div className="grid grid-cols-7 bg-zinc-100/90">
            {WEEKDAYS_SHORT.map((day, index) => (
              <div
                key={day}
                className={[
                  "border-r border-b border-zinc-200 px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide sm:text-xs",
                  index === 0
                    ? "text-red-600"
                    : index === 6
                      ? "text-amber-700"
                      : "text-zinc-600",
                ].join(" ")}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarCells.map((date, index) => {
              if (!date) {
                return (
                  <CalendarDay
                    key={`empty-${index}`}
                    date={null}
                    onClick={() => {}}
                  />
                );
              }
              const key = dateKey(date);
              return (
                <CalendarDay
                  key={key}
                  date={date}
                  selected={selectedDate === key}
                  today={today === key}
                  holiday={NATIONAL_HOLIDAYS_2026[key]}
                  hasOvertime={getRecordsForDate(key).length > 0}
                  onClick={handleCalendarClick}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
