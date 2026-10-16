"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Image as ImageIcon,
  ScanLine,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ColorModeSelector } from "../components/PdfShared";
import { formatBytes } from "../lib/pdf-utils";

const FILTERS = [
  { value: "document", label: "Dokumen", description: "Teks lebih jelas" },
  { value: "color", label: "Warna", description: "Warna alami" },
  { value: "enhance", label: "Perjelas", description: "Kontras ditingkatkan" },
  { value: "grayscale", label: "Hitam putih", description: "Monokrom" },
];

const LEVELS = [
  { value: "light", label: "Ringan", description: "Kualitas tinggi" },
  { value: "medium", label: "Sedang", description: "Seimbang" },
  { value: "strong", label: "Kuat", description: "Ukuran lebih kecil" },
];

const DEFAULT_CROP = [
  { x: 0.04, y: 0.04 },
  { x: 0.96, y: 0.04 },
  { x: 0.96, y: 0.96 },
  { x: 0.04, y: 0.96 },
];

function initialCrop() {
  return DEFAULT_CROP.map((point) => ({ ...point }));
}

export default function ImageToPdf({
  files = [],
  colorMode,
  setColorMode,
  options,
  onOptionsChange,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragging, setDragging] = useState(-1);
  const [imageDimensions, setImageDimensions] = useState({});
  const [previewEnabled, setPreviewEnabled] = useState(true);

  const imageUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => imageUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [imageUrls]);

  useEffect(() => {
    if (activeIndex >= files.length) {
      setActiveIndex(Math.max(0, files.length - 1));
    }
  }, [activeIndex, files.length]);

  const currentFile = files[activeIndex];
  const currentUrl = imageUrls[activeIndex];
  const crops = options?.crops || {};
  const currentCrop = crops[activeIndex] || initialCrop();

  const originalSize = files.reduce((sum, file) => sum + file.size, 0);

  // Estimasi awal, bukan ukuran pasti hasil PDF.
  const compressionFactor = {
    light: 0.8,
    medium: 0.5,
    strong: 0.3,
  }[options?.level || "medium"];

  const estimatedSize = Math.round(originalSize * compressionFactor);

  function updateOptions(patch) {
    onOptionsChange?.({
      ...options,
      ...patch,
    });
  }

  function updateCrop(nextCrop) {
    updateOptions({
      crops: {
        ...crops,
        [activeIndex]: nextCrop,
      },
    });
  }

  function resetCrop() {
    const nextCrops = { ...crops };
    delete nextCrops[activeIndex];
    updateOptions({ crops: nextCrops });
  }

  function updateCorner(event, cornerIndex) {
    if (dragging !== cornerIndex) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - rect.top) / rect.height),
    );

    const nextCrop = currentCrop.map((point) => ({ ...point }));
    nextCrop[cornerIndex] = { x, y };
    updateCrop(nextCrop);
  }

  function selectLevel(level) {
    updateOptions({ level });
  }

  function selectFilter(filter) {
    updateOptions({ filter });
  }

  if (!files.length) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <ScanLine className="h-5 w-5 text-zinc-500" />
          <div>
            <h2 className="text-sm font-bold text-zinc-800">
              Scan gambar ke PDF
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Pilih gambar terlebih dahulu untuk mengatur hasil scan.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const polygonPoints = currentCrop
    .map((point) => `${point.x * 100},${point.y * 100}`)
    .join(" ");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-zinc-600" />
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Atur area dokumen
              </h2>
              <p className="text-xs text-zinc-500">
                Geser empat titik agar mengikuti tepi kertas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetCrop}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset sudut
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((index) => index - 1)}
            className="rounded-lg border border-zinc-200 p-2 disabled:opacity-30"
            aria-label="Gambar sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 text-center">
            <p className="truncate text-xs font-semibold text-zinc-800">
              {currentFile.name}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Gambar {activeIndex + 1} dari {files.length}
            </p>
          </div>

          <button
            type="button"
            disabled={activeIndex === files.length - 1}
            onClick={() => setActiveIndex((index) => index + 1)}
            className="rounded-lg border border-zinc-200 p-2 disabled:opacity-30"
            aria-label="Gambar berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl bg-zinc-100 p-2">
          <div className="relative mx-auto w-full max-w-xl">
            <img
              src={currentUrl}
              alt={`Pratinjau ${currentFile.name}`}
              draggable={false}
              onLoad={(event) => {
                const image = event.currentTarget;
                setImageDimensions((previous) => ({
                  ...previous,
                  [activeIndex]: {
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                  },
                }));
              }}
              className="block h-auto max-h-[65vh] w-full select-none object-contain"
            />

            {previewEnabled && (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full touch-none"
                onPointerMove={(event) => {
                  if (dragging < 0) return;
                  updateCorner(event, dragging);
                }}
                onPointerUp={() => setDragging(-1)}
                onPointerCancel={() => setDragging(-1)}
                onPointerLeave={() => setDragging(-1)}
              >
                <polygon
                  points={polygonPoints}
                  fill="rgba(16,185,129,0.12)"
                  stroke="#10b981"
                  strokeWidth="0.6"
                  vectorEffect="non-scaling-stroke"
                />

                {currentCrop.map((point, index) => (
                  <g key={index}>
                    <circle
                      cx={point.x * 100}
                      cy={point.y * 100}
                      r="2.4"
                      fill="white"
                      stroke="#059669"
                      strokeWidth="0.8"
                      vectorEffect="non-scaling-stroke"
                      style={{ cursor: "grab", touchAction: "none" }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.currentTarget.ownerSVGElement?.setPointerCapture(
                          event.pointerId,
                        );
                        setDragging(index);
                      }}
                    />
                    <text
                      x={point.x * 100}
                      y={point.y * 100 - 3}
                      textAnchor="middle"
                      fontSize="3"
                      fill="#047857"
                      stroke="white"
                      strokeWidth="0.3"
                      paintOrder="stroke"
                    >
                      {index + 1}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={previewEnabled}
            onChange={(event) => setPreviewEnabled(event.target.checked)}
            className="rounded border-zinc-300"
          />
          Tampilkan batas pemotongan
        </label>

        {imageDimensions[activeIndex] && (
          <p className="mt-2 text-[11px] text-zinc-400">
            Resolusi asli: {imageDimensions[activeIndex].width} ×{" "}
            {imageDimensions[activeIndex].height} piksel
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {files.map((file, index) => (
            <button
              type="button"
              key={`${file.name}-${file.size}-${index}`}
              onClick={() => setActiveIndex(index)}
              className={`rounded-xl border p-2 text-left ${
                index === activeIndex
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <p className="truncate text-[11px] font-semibold text-zinc-700">
                {index + 1}. {file.name}
              </p>
              <p className="mt-1 text-[10px] text-zinc-400">
                {formatBytes(file.size)}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-bold text-zinc-900">Efek hasil scan</h2>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FILTERS.map((filter) => (
            <button
              type="button"
              key={filter.value}
              onClick={() => selectFilter(filter.value)}
              className={`rounded-xl border p-3 text-left ${
                (options?.filter || "document") === filter.value
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <p className="text-xs font-bold text-zinc-800">{filter.label}</p>
              <p className="mt-1 text-[10px] text-zinc-500">
                {filter.description}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-5">
          <h3 className="text-xs font-bold text-zinc-800">Warna PDF</h3>
          <ColorModeSelector
            value={colorMode}
            onChange={setColorMode}
            title="Warna hasil PDF"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-bold text-zinc-900">Kompresi hasil</h2>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {LEVELS.map((level) => (
            <button
              type="button"
              key={level.value}
              onClick={() => selectLevel(level.value)}
              className={`rounded-xl border p-3 text-left ${
                (options?.level || "medium") === level.value
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <p className="text-xs font-bold text-zinc-800">{level.label}</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {level.description}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">Total gambar asli</p>
            <p className="mt-1 text-base font-bold text-zinc-900">
              {formatBytes(originalSize)}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">Perkiraan ukuran PDF</p>
            <p className="mt-1 text-base font-bold text-zinc-900">
              sekitar {formatBytes(estimatedSize)}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              Estimasi awal; ukuran sebenarnya bergantung pada resolusi, filter,
              dan isi gambar.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
