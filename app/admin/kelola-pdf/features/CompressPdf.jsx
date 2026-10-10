"use client";
import { Archive } from "lucide-react";
import { ColorModeSelector, InfoItem, formatBytes } from "../components/PdfShared";
import { getCompressionConfig } from "../lib/pdf-utils";

export default function CompressPdf({ level, setLevel, colorMode, setColorMode, originalSize }) {
  const options = [{ id: "light", label: "Ringan", description: "Kualitas tinggi" }, { id: "medium", label: "Sedang", description: "Seimbang" }, { id: "strong", label: "Kuat", description: "Ukuran lebih kecil" }];
  const config = getCompressionConfig(level);
  const estimated = { low: Math.round(originalSize * config.min), high: Math.round(originalSize * config.max) };
  return <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Archive className="h-4 w-4 text-zinc-500" /><h2 className="text-sm font-bold text-zinc-800">Pengaturan kompresi</h2></div><div className="mt-5"><div className="mb-2 text-xs font-semibold text-zinc-600">Tingkat kompresi</div><div className="grid gap-2 sm:grid-cols-3">{options.map((option) => { const active = level === option.id; return <button key={option.id} type="button" onClick={() => setLevel(option.id)} className={`rounded-xl border p-3 text-left ${active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}><div className="text-xs font-bold">{option.label}</div><div className={`mt-1 text-[10px] ${active ? "text-zinc-300" : "text-zinc-400"}`}>{option.description}</div></button>; })}</div></div><ColorModeSelector value={colorMode} onChange={setColorMode} title="Warna PDF hasil" />{originalSize > 0 && <div className="mt-4 rounded-xl bg-zinc-50 p-4"><div className="grid gap-3 sm:grid-cols-3"><InfoItem label="Ukuran asli" value={formatBytes(originalSize)} /><InfoItem label="Perkiraan hasil" value={`${formatBytes(estimated.low)} – ${formatBytes(estimated.high)}`} /><InfoItem label="Mode" value={colorMode === "grayscale" ? "Hitam putih" : "Berwarna"} /></div><p className="mt-3 text-[10px] leading-4 text-zinc-400">Perkiraan kisaran saja. Ukuran aktual ditampilkan setelah proses selesai.</p></div>}</div>;
}
