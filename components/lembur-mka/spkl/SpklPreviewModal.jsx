"use client";

import { FileDown, X } from "lucide-react";
import SpklTemplate from "./SpklTemplate";
import { MONTHS } from "../utils/lemburConstants";

export default function SpklPreviewModal({
  previewOpen,
  setPreviewOpen,
  calendarMonth,
  calendarYear,
  monthDates,
  handleDownloadPdf,
  previewViewportRef,
  previewPageWidth,
  previewPageHeight,
  previewScale,
  getRecordsForDate,
  master,
  currentUnit,
}) {
  return (
    <>
      {previewOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950/80">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950 px-4 py-3 text-white">
            <div>
              <div className="text-sm font-bold">
                Preview SPKL — {MONTHS[calendarMonth]} {calendarYear}
              </div>
              <div className="text-xs text-zinc-400">
                {monthDates.length} halaman A4 landscape
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-100"
              >
                <FileDown size={15} />
                Unduh
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 sm:p-6">
            <div ref={previewViewportRef} className="w-full">
              <div className="flex w-full flex-col items-center gap-6">
                {monthDates.map((date) => (
                  <div
                    key={date}
                    className="relative shrink-0"
                    style={{
                      width: previewPageWidth,
                      height: previewPageHeight,
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 origin-top-left"
                      style={{
                        width: 1123,
                        height: 794,
                        transform: `scale(${previewScale})`,
                      }}
                    >
                      <SpklTemplate
                        date={date}
                        records={getRecordsForDate(date)}
                        master={master}
                        unit={currentUnit}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
