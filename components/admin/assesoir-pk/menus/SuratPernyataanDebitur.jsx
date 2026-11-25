import React, { useState } from "react";
import { FileText, Edit3, Printer, X, Check, UserCheck } from "lucide-react";

export default function SuratPernyataanOTS() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    namaDebitur: "",
    ktpDebitur: "",
    alamatDebitur: "",
    namaPasangan: "",
    ktpPasangan: "",
    alamatPasangan: "",
    namaDaerah: "Jambi",
    tanggalSurat: new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    sertakanOrangTua: false,
    namaOrangTua: "",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-24 md:pb-12 font-sans">
      {/* Header Sticky Mobile-Friendly */}
      <header className="sticky top-0 z-30 bg-[#003d79] text-white px-4 py-3.5 shadow-md flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h1 className="text-sm font-bold leading-tight">
              Surat Pernyataan (OTS)
            </h1>
            <p className="text-[11px] text-blue-200">
              Preview & Cetak Dokumen A4
            </p>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            <Edit3 className="w-4 h-4" /> Isi Data
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-[#003d79] font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            <Printer className="w-4 h-4" /> Unduh PDF / Cetak
          </button>
        </div>
      </header>

      {/* Info Banner Mobile */}
      <div className="max-w-3xl mx-auto px-4 pt-4 print:hidden">
        <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl p-3 flex items-center justify-between">
          <span>
            Geser layar ke samping jika dokumen terpotong di layar HP.
          </span>
          <span className="font-semibold text-[#003d79] ml-2 shrink-0">
            Format A4
          </span>
        </div>
      </div>

      {/* Area Preview Kertas A4 (Scrollable Horizontal di Mobile) */}
      <main className="max-w-4xl mx-auto p-4 overflow-x-auto print:p-0 print:overflow-visible">
        <div
          id="printable-area"
          className="bg-white mx-auto shadow-lg border border-slate-200 text-black print:shadow-none print:border-none"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "18mm 20mm",
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "11.5pt",
            lineHeight: "1.45",
          }}
        >
          {/* Judul Surat */}
          <h2 className="text-center font-bold text-base underline tracking-wide mb-6">
            SURAT PERNYATAAN
          </h2>

          <p className="mb-3">Yang bertandatangan dibawah ini :</p>

          {/* Identitas Debitur */}
          <table className="w-full mb-4 border-collapse">
            <tbody>
              <tr>
                <td className="w-36 py-0.5 align-top">Nama</td>
                <td className="w-4 py-0.5 align-top">:</td>
                <td className="py-0.5 font-semibold border-b border-dotted border-black">
                  {formData.namaDebitur ||
                    "..........................................................................."}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">No. KTP</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 border-b border-dotted border-black">
                  {formData.ktpDebitur ||
                    "..........................................................................."}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Alamat</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 border-b border-dotted border-black">
                  {formData.alamatDebitur ||
                    "..........................................................................."}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mb-3">
            Dalam hal ini telah memperoleh persetujuan dari <i>suami/Istri</i>,
            yaitu
          </p>

          {/* Identitas Pasangan */}
          <table className="w-full mb-5 border-collapse">
            <tbody>
              <tr>
                <td className="w-36 py-0.5 align-top">Nama</td>
                <td className="w-4 py-0.5 align-top">:</td>
                <td className="py-0.5 font-semibold border-b border-dotted border-black">
                  {formData.namaPasangan ||
                    "..........................................................................."}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">No. KTP</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 border-b border-dotted border-black">
                  {formData.ktpPasangan ||
                    "..........................................................................."}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Alamat</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 border-b border-dotted border-black">
                  {formData.alamatPasangan ||
                    "..........................................................................."}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mb-3 text-justify">
            Bersamaan pengajuan kredit yang saya ajukan di Bank Mandiri dengan
            ini kami menyatakan dan telah memahami perihal sebagai berikut:
          </p>

          {/* 7 Poin Pernyataan */}
          <ol className="list-decimal pl-6 space-y-2 text-justify mb-5">
            <li className="pl-2">
              Melakukan pembayaran angsuran kredit secara tepat waktu sesuai
              jadwal jatuh tempo setiap bulannya, dan melakukan
              pengecekan/livin/cetak buku rekening, ke Kantor Bank Mandiri
              terdekat, paling lambat 1 (satu) minggu dari tanggal saya Setor
              Angsuran jika membayar angsuran melalui Petugas Bank
            </li>
            <li className="pl-2">
              Tidak akan memberikan imbalan dalam bentuk apapun kepada petugas
              bank
            </li>
            <li className="pl-2">
              Kredit dipakai untuk kepentingan usaha saya sendiri dan tidak
              untuk kepentingan pihak lain (Bukan Kredit Topengan)
            </li>
            <li className="pl-2">
              Tidak melibatkan pihak ketiga/perantara dalam pengajuan/pemberian
              kredit dimana pihak ketiga menerima imbalan atas pencairan kredit
              (Bukan Percaloan)
            </li>
            <li className="pl-2">
              Dari hasil pencairan kredit hanya digunakan untuk saya, dan tidak
              akan dibagi/digunakan lebih dari 1 orang (Bukan Kredit Tempilan)
            </li>
            <li className="pl-2">
              Menyatakan status kepemilikan usaha milik sendiri dan dokumen yang
              diserahkan dapat dipertangung-jawabkan secara hukum
            </li>
            <li className="pl-2">
              Akan segera mengambil agunan/Jaminan paling lambat 2 minggu
              setalah Kredit dinyatakan Lunas
            </li>
          </ol>

          <p className="mb-6 text-justify">
            Demikian Surat Pernyataan ini dibuat saat kunjungan Pihak Bank
            Mandiri dalam rangka proses pengajuan fasilitas kredit dan tidak ada
            paksaan dari pihak manapun untuk dipergunakan sebagaimana mestinya.
          </p>

          {/* Tempat & Tanggal */}
          <div className="mb-4">
            <span>
              {formData.namaDaerah
                ? `${formData.namaDaerah}, `
                : "Nama Daerah, "}
              {formData.tanggalSurat ||
                "......................................."}
            </span>
          </div>

          {/* Kolom Tanda Tangan */}
          <div
            className={`grid ${formData.sertakanOrangTua ? "grid-cols-3" : "grid-cols-2"} gap-4 mt-4 text-center`}
          >
            {/* Kolom Debitur + Materai */}
            <div className="flex flex-col items-center">
              <div className="h-24 flex items-center justify-center">
                <div className="border border-dashed border-slate-400 text-slate-400 text-[10px] px-3 py-2 leading-tight">
                  Materai
                  <br />
                  Rp.10.000
                </div>
              </div>
              <div className="w-44 border-b-2 border-black mb-1"></div>
              <p className="font-bold">Debitur</p>
              {formData.namaDebitur && (
                <p className="text-xs">({formData.namaDebitur})</p>
              )}
            </div>

            {/* Kolom Pasangan */}
            <div className="flex flex-col items-center">
              <div className="h-24"></div>
              <div className="w-44 border-b-2 border-black mb-1"></div>
              <p className="font-bold">Pasangan Debitur</p>
              {formData.namaPasangan && (
                <p className="text-xs">({formData.namaPasangan})</p>
              )}
            </div>

            {/* Kolom Opsional Orang Tua / Penjamin */}
            {formData.sertakanOrangTua && (
              <div className="flex flex-col items-center">
                <div className="h-24"></div>
                <div className="w-44 border-b-2 border-black mb-1"></div>
                <p className="font-bold">Orang Tua / Penjamin</p>
                {formData.namaOrangTua && (
                  <p className="text-xs">({formData.namaOrangTua})</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Floating Bar Mobile */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 p-3 flex gap-2.5 md:hidden shadow-lg print:hidden">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-[#003d79] active:bg-[#002b57] text-white font-semibold text-sm py-3 rounded-xl shadow-sm"
        >
          <Edit3 className="w-4 h-4 text-amber-400" /> Isi / Edit Data
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 active:bg-amber-600 text-slate-900 font-bold text-sm py-3 rounded-xl shadow-sm"
        >
          <Printer className="w-4 h-4" /> Unduh PDF
        </button>
      </div>

      {/* MODAL INPUT DATA (Bottom Sheet di Mobile, Center Modal di Desktop) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 print:hidden">
          <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Isi Data Surat Pernyataan
                </h3>
                <p className="text-xs text-slate-500">
                  Data otomatis terisi ke template surat
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-5 overflow-y-auto space-y-5 text-sm">
              {/* Section Debitur */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  1. Data Pemohon / Debitur
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Lengkap Debitur
                  </label>
                  <input
                    type="text"
                    name="namaDebitur"
                    value={formData.namaDebitur}
                    onChange={handleChange}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#003d79] focus:outline-none text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    No. KTP Debitur
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="ktpDebitur"
                    value={formData.ktpDebitur}
                    onChange={handleChange}
                    placeholder="16 digit NIK KTP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#003d79] focus:outline-none text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Alamat Debitur
                  </label>
                  <textarea
                    rows="2"
                    name="alamatDebitur"
                    value={formData.alamatDebitur}
                    onChange={handleChange}
                    placeholder="Alamat sesuai KTP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#003d79] focus:outline-none text-base"
                  />
                </div>
              </div>

              {/* Section Pasangan */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  2. Data Persetujuan Suami / Istri
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Lengkap Suami/Istri
                  </label>
                  <input
                    type="text"
                    name="namaPasangan"
                    value={formData.namaPasangan}
                    onChange={handleChange}
                    placeholder="Nama pasangan"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#003d79] focus:outline-none text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    No. KTP Suami/Istri
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="ktpPasangan"
                    value={formData.ktpPasangan}
                    onChange={handleChange}
                    placeholder="16 digit NIK KTP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#003d79] focus:outline-none text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Alamat Suami/Istri
                  </label>
                  <textarea
                    rows="2"
                    name="alamatPasangan"
                    value={formData.alamatPasangan}
                    onChange={handleChange}
                    placeholder="Alamat sesuai KTP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#003d79] focus:outline-none text-base"
                  />
                </div>
              </div>

              {/* Section Lokasi & TTD Tambahan */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  3. Tempat, Tanggal & TTD Tambahan
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nama Daerah
                    </label>
                    <input
                      type="text"
                      name="namaDaerah"
                      value={formData.namaDaerah}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tanggal Surat
                    </label>
                    <input
                      type="text"
                      name="tanggalSurat"
                      value={formData.tanggalSurat}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>

                {/* Toggle TTD Orang Tua */}
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    name="sertakanOrangTua"
                    checked={formData.sertakanOrangTua}
                    onChange={handleChange}
                    className="w-5 h-5 rounded text-[#003d79]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-[#003d79]" />{" "}
                      Tambah TTD Orang Tua / Penjamin
                    </span>
                    <span className="text-slate-500">
                      Centang jika jaminan melibatkan orang tua
                    </span>
                  </div>
                </label>

                {formData.sertakanOrangTua && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nama Orang Tua / Penjamin
                    </label>
                    <input
                      type="text"
                      name="namaOrangTua"
                      value={formData.namaOrangTua}
                      onChange={handleChange}
                      placeholder="Nama orang tua penjamin"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex gap-2.5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-[#003d79] hover:bg-[#002b57] text-white font-bold py-3 rounded-xl text-sm shadow"
              >
                <Check className="w-4 h-4" /> Terapkan ke Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style Khusus Print A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
