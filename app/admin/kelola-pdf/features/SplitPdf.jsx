"use client";
import { Plus, Scissors, Trash2 } from "lucide-react";

export default function SplitPdf({ ranges, setRanges, totalPages, selectedPages, pages, outputMode, setOutputMode }) {
  function updateRange(index, value) {
    setRanges((current) => current.map((range, i) => i === index ? value : range));
  }
  function addRange() { setRanges((current) => [...current, ""]); }
  function removeRange(index) { setRanges((current) => current.filter((_, i) => i !== index)); }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2"><Scissors className="h-4 w-4 text-zinc-500" /><h2 className="text-sm font-bold text-zinc-800">Atur kelompok halaman</h2></div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">Isi setiap baris sebagai satu kelompok halaman. Contoh 1–5 dan 7–8 dapat menjadi dua file terpisah atau satu PDF gabungan.</p>
      <div className="mt-4 space-y-2">
        {ranges.map((range, index) => <div key={index} className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-600">{index + 1}</span>
          <input type="text" value={range} onChange={(event) => updateRange(index, event.target.value)} placeholder={`Contoh: ${index === 0 ? "1-5" : "7-8"}`} className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100" />
          <button type="button" title="Hapus kelompok" onClick={() => removeRange(index)} disabled={ranges.length === 1} className="rounded-lg border border-zinc-200 p-2.5 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
        </div>)}
      </div>
      <button type="button" onClick={addRange} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"><Plus className="h-3.5 w-3.5" />Tambah kelompok</button>
      <div className="mt-5 border-t border-zinc-100 pt-4">
        <div className="text-xs font-bold text-zinc-700">Hasil pemisahan</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${outputMode === "separate" ? "border-zinc-800 bg-zinc-50" : "border-zinc-200"}`}><input type="radio" name="split-output-mode" checked={outputMode === "separate"} onChange={() => setOutputMode("separate")} className="mt-0.5 accent-zinc-900" /><span><span className="block text-xs font-bold text-zinc-800">File terpisah</span><span className="mt-1 block text-[10px] leading-4 text-zinc-500">Setiap kelompok menjadi PDF sendiri. Contoh: 1–5.pdf dan 7–8.pdf.</span></span></label>
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${outputMode === "combined" ? "border-zinc-800 bg-zinc-50" : "border-zinc-200"}`}><input type="radio" name="split-output-mode" checked={outputMode === "combined"} onChange={() => setOutputMode("combined")} className="mt-0.5 accent-zinc-900" /><span><span className="block text-xs font-bold text-zinc-800">Jadikan satu PDF</span><span className="mt-1 block text-[10px] leading-4 text-zinc-500">Semua kelompok digabung sesuai urutan baris dan urutan halaman.</span></span></label>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-zinc-500"><span>Total: <b className="text-zinc-700">{totalPages}</b> halaman</span><span>•</span><span>Halaman terpilih unik: <b className="text-zinc-700">{selectedPages.length}</b></span></div>
    </section>

    {pages?.length > 0 && <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold text-zinc-800">Preview setiap halaman</h2><span className="text-[10px] text-zinc-400">Hijau = dipilih dalam kelompok</span></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {pages.map((page, index) => {
          const chosen = selectedPages.includes(index);
          const groupIndexes = ranges.map((range, i) => ({ range, i })).filter(({ range }) => {
            const nums = String(range).split(",").flatMap((part) => { const match = part.trim().match(/^(\d+)\s*-\s*(\d+)$/); if (match) { const a = Math.min(+match[1], +match[2]); const b = Math.max(+match[1], +match[2]); return Array.from({ length: b - a + 1 }, (_, n) => a + n); } return /^\d+$/.test(part.trim()) ? [+part.trim()] : []; });
            return nums.includes(index + 1);
          }).map(({ i }) => i + 1);
          return <div key={page.id || index} className={`overflow-hidden rounded-xl border ${chosen ? "border-emerald-400 ring-1 ring-emerald-200" : "border-zinc-200"}`}>
            <div className="flex aspect-[3/4] items-center justify-center bg-zinc-100 p-2"><img src={page.previewUrl} alt={`Preview halaman ${index + 1}`} loading="lazy" className="max-h-full max-w-full object-contain shadow-sm" /></div>
            <div className={`flex items-center justify-between gap-1 px-2.5 py-2 ${chosen ? "bg-emerald-50" : "bg-white"}`}><span className="text-[11px] font-bold text-zinc-700">Halaman {index + 1}</span><span className={`text-[9px] font-semibold ${chosen ? "text-emerald-700" : "text-zinc-400"}`}>{chosen ? `Kel. ${groupIndexes.join(", ")}` : "Tidak dipilih"}</span></div>
          </div>;
        })}
      </div>
    </section>}
  </div>;
}
