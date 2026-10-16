"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function formatTanggalPanjang(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function terbilangSederhana(n) {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  if (n < 0) return String(n);
  if (n < 12) return angka[n];
  if (n < 20) return `${terbilangSederhana(n - 10)} Belas`;
  if (n < 100) return `${terbilangSederhana(Math.floor(n / 10))} Puluh${n % 10 ? ` ${terbilangSederhana(n % 10)}` : ""}`;
  if (n < 200) return `Seratus${n > 100 ? ` ${terbilangSederhana(n - 100)}` : ""}`;
  if (n < 1000) return `${terbilangSederhana(Math.floor(n / 100))} Ratus${n % 100 ? ` ${terbilangSederhana(n % 100)}` : ""}`;
  return String(n);
}

function getNama(pk) {
  return pk?.nama || pk?.namaDebitur || pk?.nama_debitur || "-";
}
function getNoRekening(pk) {
  return pk?.noRekening || pk?.norek || pk?.no_rekening || pk?.nomorRekening || "";
}
function getAgunanUtama(pk) {
  return pk?.agunanUtama || pk?.utama || pk?.jenisAgunan || pk?.jenis_agunan || "";
}
function getPengikatan(pk) {
  return pk?.pengikatan || pk?.jenisPengikatan || pk?.agunanPengikatan || pk?.jenis_pengikatan || "";
}
function getBacklog(pk) {
  return pk?.backlog || pk?.nomorBacklog || pk?.no_backlog || "";
}
function getCurrent(pk) {
  return pk?.current || pk?.nomorCurrent || pk?.no_current || "";
}

export default function LampiranMigrasiPage() {
  const router = useRouter();
  const [dokumen, setDokumen] = useState(null);
  const [siap, setSiap] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const page1Ref = useRef(null);
  const page2Ref = useRef(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("josjis_bast_migrasi");
      if (raw) setDokumen(JSON.parse(raw));
    } catch (error) {
      console.error("Gagal membaca data BAST migrasi:", error);
    }
    setSiap(true);
  }, []);

  const debitur = useMemo(
    () => (Array.isArray(dokumen?.debitur) ? dokumen.debitur : []),
    [dokumen]
  );

  const tanggal = dokumen?.tanggal || "2026-10-13";
  const tahun = dokumen?.tahun || "2026";
  const nomorSurat = dokumen?.nomorSurat || "0370";
  const unit = dokumen?.unit || "JKK1";
  const nomorLengkap = `NRF.R02.JBI.JKK/${nomorSurat}/${tahun}`;

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    if (!page1Ref.current || !page2Ref.current || downloading) return;
    setDownloading(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pages = [page1Ref.current, page2Ref.current];

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });
        const image = canvas.toDataURL("image/jpeg", 0.94);
        if (i > 0) pdf.addPage("a4", "portrait");
        pdf.addImage(image, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }

      const safeUnit = String(unit).replace(/[^a-z0-9_-]/gi, "_");
      pdf.save(`BAST_Lampiran_${safeUnit}_${nomorSurat}_${tahun}.pdf`);
    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert("PDF belum berhasil dibuat. Coba tombol Cetak / Simpan PDF sebagai alternatif.");
    } finally {
      setDownloading(false);
    }
  }

  if (!siap) {
    return <div className="p-8 text-center text-sm text-slate-500">Menyiapkan dokumen...</div>;
  }

  if (!dokumen || !debitur.length) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-lg font-bold text-slate-900">Data migrasi tidak ditemukan</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kembali ke halaman Migrasi, centang debitur yang diperlukan, lalu klik BAST + Lampiran.
        </p>
        <button type="button" onClick={() => router.push("/admin/migrasi")} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Kembali ke Migrasi
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-6">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => router.push("/admin/migrasi")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
            <Printer className="h-4 w-4" /> Cetak / Simpan PDF
          </button>
          <button type="button" onClick={handleDownloadPdf} disabled={downloading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            <Download className="h-4 w-4" /> {downloading ? "Membuat PDF..." : "Unduh PDF"}
          </button>
        </div>
      </div>

      <div className="print-pages">
        {/* HALAMAN 1 — BAST */}
        <article ref={page1Ref} className="paper paper-bast mx-auto bg-white text-black">
          <h1 className="text-center text-[13px] font-bold">BERITA ACARA SERAH TERIMA</h1>
          <h2 className="text-center text-[12px] font-bold">DOKUMEN KREDIT</h2>
          <p className="mb-4 text-center text-[10px] font-bold">No. {nomorLengkap}</p>

          <p className="mb-3 text-justify">
            Pada hari ini {formatTanggalPanjang(tanggal)} bertempat di <strong>PT Bank Mandiri (Persero) Tbk., Branch KCM Kuamang Kuning</strong>,
            Jl. Batang Hari RT. 006 RW. 002 Desa Purwasari Kec. Pelepat Ilir Kab. Bungo Prop. Jambi, kami masing-masing yang bertanda tangan di bawah ini:
          </p>

          <div className="identity">
            <div className="identity-row"><span>Nama</span><span>:</span><strong>Doni Iswanto</strong></div>
            <div className="identity-row"><span>NIP</span><span>:</span><span>1387525306</span></div>
            <div className="identity-row"><span>Jabatan</span><span>:</span><span>Branch Manager</span></div>
          </div>
          <p className="mb-3">Bertindak dalam jabatannya tersebut selanjutnya disebut yang menyerahkan atau <strong>PIHAK I</strong>.</p>

          <div className="identity">
            <div className="identity-row"><span>Nama</span><span>:</span><strong>Eko Hayatullah Makhfuz</strong></div>
            <div className="identity-row"><span>NIP</span><span>:</span><span>1082387416</span></div>
            <div className="identity-row"><span>Jabatan</span><span>:</span><span>MBCM – MBC Jambi Bungo</span></div>
          </div>
          <p className="mb-3">Bertindak dalam jabatannya tersebut selanjutnya disebut yang menerima atau <strong>PIHAK II</strong>.</p>

          <p className="mb-3 text-justify">
            Dengan ini menyatakan bahwa <strong>PIHAK PERTAMA</strong> menyerahkan kepada <strong>PIHAK KEDUA</strong> sebagaimana <strong>PIHAK KEDUA</strong> menerima dari <strong>PIHAK PERTAMA</strong> dokumen kredit milik <strong>{debitur.length} ({terbilangSederhana(debitur.length)}) DEBITUR</strong> dengan rincian sebagaimana terlampir.
          </p>
          <p className="mb-3 text-justify">
            Serah terima dokumen-dokumen (sesuai daftar terlampir) tersebut dilaksanakan dalam rangka pengadministrasian dan penyimpanan dokumen.
          </p>
          <p className="text-justify">
            Dengan penyerahan dokumen tersebut di atas, maka sejak tanggal hari ini segala tanggung jawab dari dokumen tersebut di atas beralih kepada <strong>PIHAK KEDUA</strong>.
          </p>
        </article>

        {/* HALAMAN 2 — LAMPIRAN */}
        <article ref={page2Ref} className="paper paper-lampiran mx-auto bg-white text-black">
          <h2 className="mb-1 text-center text-[11px] font-bold">LAMPIRAN BAST DOKUMEN KREDIT</h2>
          <p className="mb-4 text-center text-[9px] font-semibold">No. {nomorLengkap}</p>

          <table className="document-table">
            <thead>
              <tr>
                <th rowSpan={2} className="no-col">NO</th>
                <th rowSpan={2} className="nama-col">NAMA DEBITUR</th>
                <th rowSpan={2} className="rekening-col">NO. REKENING</th>
                <th colSpan={2} className="agunan-group">AGUNAN</th>
                <th rowSpan={2} className="backlog-col">BACKLOG</th>
                <th rowSpan={2} className="current-col">CURRENT</th>
              </tr>
              <tr>
                <th className="utama-col">UTAMA</th>
                <th className="pengikatan-col">PENGIKATAN</th>
              </tr>
            </thead>
            <tbody>
              {debitur.map((pk, index) => (
                <tr key={pk.id || `${getNama(pk)}-${index}`}>
                  <td className="text-center">{index + 1}</td>
                  <td>{getNama(pk)}</td>
                  <td>{getNoRekening(pk)}</td>
                  <td>{getAgunanUtama(pk)}</td>
                  <td>{getPengikatan(pk)}</td>
                  <td>{getBacklog(pk)}</td>
                  <td>{getCurrent(pk)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="signatures">
            <div>
              <p>Yang Menyerahkan</p><p>Pihak I</p><div className="signature-space" />
              <p className="font-bold">Doni Iswanto</p><p>Branch Manager</p>
            </div>
            <div>
              <p>Yang Menerima</p><p>Pihak II</p><div className="signature-space" />
              <p className="font-bold">Eko Hayatullah Makhfuz</p><p>MBCM</p>
            </div>
          </div>
        </article>
      </div>

      <style jsx global>{`
        .paper {
          box-sizing: border-box;
          width: 210mm;
          height: 297mm;
          padding: 15mm;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
          line-height: 1.45;
          background: #fff;
          color: #000;
          box-shadow: 0 2px 12px rgba(15, 23, 42, 0.12);
          margin-bottom: 18px;
        }
        .paper-bast { overflow: hidden; }
        .paper-lampiran { overflow: hidden; }
        .identity { margin: 4px 0 7px 22px; }
        .identity-row { display: grid; grid-template-columns: 52px 8px 1fr; gap: 3px; margin: 2px 0; }
        .document-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7px; line-height: 1.2; }
        .document-table th, .document-table td { border: 1px solid #222; padding: 4px 3px; vertical-align: top; overflow-wrap: anywhere; }
        .document-table th { text-align: center; font-weight: 700; vertical-align: middle; }
        .no-col { width: 5%; }
        .nama-col { width: 21%; }
        .rekening-col { width: 17%; }
        .utama-col { width: 13%; }
        .pengikatan-col { width: 15%; }
        .backlog-col { width: 14%; }
        .current-col { width: 15%; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; margin-top: 18px; text-align: center; font-size: 8px; line-height: 1.25; }
        .signature-space { height: 35px; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden; }
          .paper, .paper * { visibility: visible; }
          .no-print { display: none !important; }
          .paper { position: relative !important; width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 15mm !important; box-shadow: none !important; }
          .paper-bast { break-after: page; page-break-after: always; }
          .paper-lampiran { break-before: page; page-break-before: always; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </main>
  );
}
