"use client";
import { Image as ImageIcon } from "lucide-react";
import { ColorModeSelector } from "../components/PdfShared";
export default function ImageToPdf({ colorMode, setColorMode, files }) {
  return <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-zinc-500" /><h2 className="text-sm font-bold text-zinc-800">Pengaturan gambar → PDF</h2></div><ColorModeSelector value={colorMode} onChange={setColorMode} title="Warna hasil PDF" />{files.length > 0 && <div className="mt-4 text-[11px] text-zinc-400">{files.length} gambar akan ditempatkan pada halaman A4 dengan ukuran proporsional.</div>}</div>;
}
