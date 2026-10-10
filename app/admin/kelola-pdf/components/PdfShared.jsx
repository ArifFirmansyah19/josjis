"use client";

import { Archive, FileImage, FileText, Image as ImageIcon, Merge, Scissors, Upload, Info } from "lucide-react";
import { formatBytes } from "../lib/pdf-utils";

export function ModeSelector({ mode, onChange }) {
  const items = [
    { id: "compress", label: "Kompres PDF", description: "Kecilkan ukuran PDF", icon: Archive },
    { id: "image-to-pdf", label: "Gambar → PDF", description: "Jadikan gambar PDF A4", icon: ImageIcon },
    { id: "merge", label: "Gabungkan PDF", description: "Satukan beberapa PDF", icon: Merge },
    { id: "pages", label: "Atur Halaman", description: "Hapus, putar, urutkan", icon: FileText },
    { id: "split", label: "Pisahkan PDF", description: "Pilih halaman tertentu", icon: Scissors },
  ];
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{items.map((item) => {
    const Icon = item.icon; const active = mode === item.id;
    return <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`rounded-2xl border p-4 text-left transition ${active ? "border-zinc-900 bg-zinc-900 text-white shadow-sm" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"}`}>
      <div className="flex items-start gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white/10" : "bg-zinc-100"}`}><Icon className="h-4 w-4" /></div><div className="min-w-0"><div className="text-xs font-bold">{item.label}</div><div className={`mt-1 text-[10px] ${active ? "text-zinc-300" : "text-zinc-400"}`}>{item.description}</div></div></div>
    </button>;
  })}</div>;
}

export function UploadArea({ mode, files, loading, onClick }) {
  const imageMode = mode === "image-to-pdf";
  return <button type="button" onClick={onClick} disabled={loading} className="group w-full rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-6 text-left transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60">
    <div className="flex flex-col items-center justify-center text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 transition group-hover:bg-zinc-900 group-hover:text-white">{imageMode ? <FileImage className="h-5 w-5" /> : <Upload className="h-5 w-5" />}</div>
      <div className="mt-3 text-sm font-semibold text-zinc-800">{files.length ? `${files.length} file dipilih` : imageMode ? "Pilih gambar" : mode === "merge" ? "Pilih beberapa PDF" : "Upload PDF"}</div>
      <div className="mt-1 text-[11px] text-zinc-400">{imageMode ? "JPG, JPEG, PNG, WEBP, BMP, GIF" : mode === "merge" ? "Pilih dua atau lebih file PDF" : "Klik untuk memilih file PDF"}</div>
    </div>
  </button>;
}

export function ColorModeSelector({ value, onChange, title }) {
  return <div className="mt-5"><div className="mb-2 text-xs font-semibold text-zinc-600">{title}</div><div className="grid gap-2 sm:grid-cols-2">
    {[{ id: "color", title: "Tetap Berwarna", description: "Pertahankan warna asli" }, { id: "grayscale", title: "Hitam Putih", description: "Ubah halaman menjadi grayscale" }].map((option) => <button key={option.id} type="button" onClick={() => onChange(option.id)} className={`rounded-xl border p-3 text-left ${value === option.id ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}><div className="flex items-center gap-2"><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${option.id === "color" ? "bg-gradient-to-br from-pink-400 via-yellow-300 to-blue-500" : "bg-zinc-200"}`}><span className={`text-xs font-bold ${option.id === "color" ? "text-white" : "text-zinc-600"}`}>{option.id === "color" ? "A" : "◐"}</span></div><div><div className="text-xs font-bold">{option.title}</div><div className={`mt-0.5 text-[10px] ${value === option.id ? "text-zinc-300" : "text-zinc-400"}`}>{option.description}</div></div></div></button>)}
  </div></div>;
}

export function InfoItem({ label, value }) { return <div><div className="text-[9px] font-medium uppercase tracking-wide text-zinc-400">{label}</div><div className="mt-1 text-xs font-bold text-zinc-700">{value}</div></div>; }

export function SmallActionButton({ children, onClick, disabled, danger, title }) {
  return <button type="button" title={title} onClick={onClick} disabled={disabled} className={`flex h-8 items-center justify-center rounded-lg border text-xs transition ${danger ? "border-red-100 text-red-500 hover:bg-red-50" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"} disabled:cursor-not-allowed disabled:opacity-25`}>{children}</button>;
}

export function PdfNotes() {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="flex gap-3"><Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" /><div className="text-[11px] leading-5 text-zinc-500"><div className="font-semibold text-zinc-700">Catatan</div><ul className="mt-1 list-disc space-y-0.5 pl-4"><li>File asli tidak ditimpa; hasil dibuat sebagai file baru.</li><li>Kompresi merasterisasi halaman sehingga teks tidak bisa dipilih atau dicari lagi.</li><li>PDF yang sangat panjang membutuhkan memori dan waktu lebih banyak untuk membuat preview.</li><li>Pada HP, lokasi penyimpanan mengikuti dukungan browser.</li></ul></div></div></div>;
}

export { formatBytes };
