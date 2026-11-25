import React, { useState } from "react";
import {
  ShieldCheck,
  Edit3,
  Printer,
  X,
  Check,
  Calculator,
} from "lucide-react";

export default function SuratGCGBankMandiri() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    namaKcp: "",
    tanggalPencairan: "",
    batasTanggalPencairan: "",
    noRekening: "",
    noHpMbm: "082386499902",
    limitKredit: "",
    biayaAdmin: "",
    biayaProvisi: "",
    biayaAsuransi: "",
    pemblokiran: "",
    namaCsr: "",
    tanggalSerahBuku: "",
    noWaPengaduan: "081376509049",
    namaMbm: "",
    namaDebitur: "",
    namaPasangan: "",
    noHpDebitur: "",
  });

  // Helper format angka ke Rupiah saat mengetik
  const formatRupiah = (angka) => {
    if (!angka) return "";
    const numberString = angka.toString().replace(/[^,\d]/g, "");
    const split = numberString.split(",");
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? "." : "";
      rupiah += separator + ribuan.join(".");
    }
    return rupiah ? `Rp ${rupiah}` : "";
  };

  const parseNumber = (val) => {
    if (!val) return 0;
    return parseInt(val.toString().replace(/\D/g, ""), 10) || 0;
  };

  // Hitung otomatis Total Pencairan = Limit - (Admin + Provisi + Asuransi + Pemblokiran)
  const totalPencairanValue =
    parseNumber(formData.limitKredit) -
    (parseNumber(formData.biayaAdmin) +
      parseNumber(formData.biayaProvisi) +
      parseNumber(formData.biayaAsuransi) +
      parseNumber(formData.pemblokiran));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (e) => {
    const { name, value } = e.target;
    const rawNumeric = value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, [name]: rawNumeric }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-24 md:pb-12 font-sans">
      {/* Header Mobile-Friendly */}
      <header className="sticky top-0 z-30 bg-[#003d79] text-white px-4 py-3.5 shadow-md flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h1 className="text-sm font-bold leading-tight">
              Surat GCG (PK 2 Rangkap)
            </h1>
            <p className="text-[11px] text-blue-200">
              PT. Bank Mandiri (Persero) Tbk
            </p>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            <Edit3 className="w-4 h-4" /> Isi Data GCG
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
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 flex items-center justify-between">
          <span>
            Total pencairan dihitung otomatis dari Limit dikurangi biaya.
          </span>
          <span className="font-bold text-[#003d79] ml-2 shrink-0">A4</span>
        </div>
      </div>

      {/* Area Preview Kertas A4 */}
      <main className="max-w-4xl mx-auto p-4 overflow-x-auto print:p-0 print:overflow-visible">
        <div
          id="printable-area-gcg"
          className="bg-white mx-auto shadow-lg border border-slate-200 text-black print:shadow-none print:border-none"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "12mm 16mm",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "9.5pt",
            lineHeight: "1.35",
          }}
        >
          {/* Header Tujuan Surat */}
          <div className="mb-3">
            <p>Kepada yth,</p>
            <p className="font-bold">Nasabah Kredit</p>
            <p className="font-bold">PT. BANK MANDIRI ( PERSERO ) Tbk</p>
            <p>
              KCP{" "}
              <span className="font-semibold underline">
                {formData.namaKcp ||
                  "..............................................."}
              </span>
            </p>
          </div>

          <p className="font-bold underline mb-3">
            Perihal : Good Corporate Governance Bank Mandiri
          </p>

          <p className="text-justify mb-2.5">
            Kami mengucapkan terimakasih atas kesediaan bapak/ibu menjadi
            nasabah kredit Bank Mandiri, Kami mengharapkan hubungan kemitraan
            yang telah terjalin dapat berlangsung dalam jangka panjang dan
            memberikan manfaat bagi kedua belah pihak. Dalam kesempatan ini kami
            sampaikan kembali bahwa dalam proses pemberian kredit Mikro di Bank
            Mandiri, tidak ada pungutan atau biaya apapun, baik sebelum maupun
            setelah pencairan kredit. Diluar biaya yang telah kami informasikan
            dalam Perjanjian Kredit (PK). Setiap biaya yang kami bebankan atau
            tagihkan kepada bapak/ibu adalah sah/resmi apabila ada pemberitahuan
            tertulis atau bukti tanda terima lainnya.
          </p>

          <p className="mb-2">
            Sejalan dengan hal tersebut kami informasikan ketentuan Bank Mandiri
            sebagai berikut :
          </p>

          {/* Daftar Ketentuan */}
          <ol className="list-decimal pl-5 space-y-1.5 text-justify mb-3">
            <li>
              Pencairan akan dilaksanakan pada{" "}
              <span className="font-semibold underline">
                {formData.tanggalPencairan || "........................"}
              </span>{" "}
              atau selambat-lambatnya tgl{" "}
              <span className="font-semibold underline">
                {formData.batasTanggalPencairan || "........................"}
              </span>{" "}
              pada rek sdr. No.{" "}
              <span className="font-semibold underline">
                {formData.noRekening || ".............................."}
              </span>
              . Jika pada tgl tsb belum ada pencairan agar dapat menghubungi
              pihak Bank di No.{" "}
              <span className="font-bold">
                {formData.noHpMbm || "082386499902"}
              </span>
            </li>

            <li>
              <p className="mb-1">
                Berikut disampaikan biaya-biaya dan pencairan sbb:
              </p>
              <table className="w-80 ml-2 border-collapse text-[9.5pt]">
                <tbody>
                  <tr>
                    <td className="w-36 py-0.5">Limit</td>
                    <td className="w-3">:</td>
                    <td className="font-semibold text-right">
                      {formatRupiah(formData.limitKredit) ||
                        "Rp ........................"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Biaya administrasi</td>
                    <td>:</td>
                    <td className="text-right">
                      {formatRupiah(formData.biayaAdmin) ||
                        "Rp ........................"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Biaya provisi</td>
                    <td>:</td>
                    <td className="text-right">
                      {formatRupiah(formData.biayaProvisi) ||
                        "Rp ........................"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Asuransi</td>
                    <td>:</td>
                    <td className="text-right">
                      {formatRupiah(formData.biayaAsuransi) ||
                        "Rp ........................"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Pemblokiran</td>
                    <td>:</td>
                    <td className="text-right border-b border-black">
                      {formatRupiah(formData.pemblokiran) ||
                        "Rp ........................"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-bold">Total pencairan</td>
                    <td className="font-bold">:</td>
                    <td className="font-bold text-right">
                      {formData.limitKredit
                        ? formatRupiah(totalPencairanValue)
                        : "Rp ........................"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </li>

            <li>
              Proses pembayaran Angsuran agar tidak dititipkan pada sales/pihak
              bank lainnya, baik tunai maupun via transfer namun dapat dilakukan
              pembayaran melalui counter teller dan agen ditunjuk bank.
            </li>

            <li>
              Buku tabungan dan Kartu ATM serta PIN telah diserahkan oleh CSR
              an.{" "}
              <span className="font-semibold underline">
                {formData.namaCsr || "........................"}
              </span>{" "}
              pada tanggal{" "}
              <span className="font-semibold underline">
                {formData.tanggalSerahBuku || "........................"}
              </span>
              , Bank tidak bertanggung jawab apabila atas pencairan digunakan
              oleh Pihak Ketiga lainnya yang bukan debitur sebenarnya.
            </li>

            <li>
              Memastikan agar penggunaan Livin telah sesuai dibuat oleh debitur
              langsung pada No HP terdaftar pada Bank tanpa perantara oleh pihak
              bank dengan tidak menyerahkan OTP kepada Pihak manapun juga.
            </li>

            <li>
              Penggunaan kredit KUR/KUM sesuai tujuan kredit yg terdata pada
              Perjanjian Kredit (Investasi/Modal Kerja) bukan untuk tujuan
              konsumtif lainnya.
            </li>

            <li>
              Bapak/Ibu <b>DILARANG</b> memberikan apapun kepada pegawai atau
              keluarga pegawai Bank Mandiri.
            </li>

            <li>
              Bapak/Ibu <b>DILARANG</b> melakukan pinjam meminjam uang atau
              asset apapun atau memiliki keterkaitan bisnis apapun dengan
              pegawai atau keluarga pegawai Bank Mandiri serta <b>DILARANG</b>{" "}
              melakukan transaksi antar rekening dengan pegawai atau keluarga
              pegawai Bank Mandiri.
            </li>
          </ol>

          <p className="text-justify mb-2">
            Apabila ada pihak atau orang yang mengatasnamakan pegawai Bank
            Mandiri, meminta imbalan atau memungut biaya dalam proses permohonan
            kredit, baik sebelum maupun setelah pencairan kredit, kami harapkan
            Bapak/Ibu dapat menyampaikan kepada kami baik secara tertulis,
            melalui WA/SMS maupun lisan ditujukan kepada :
          </p>

          {/* Alamat Pengaduan 2 Kolom */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-300 p-2.5 mb-2.5 text-[9pt]">
            <div>
              <p className="font-bold">Micro Banking Region II Sumatera 2</p>
              <p>PT Bank Mandiri (Persero) Tbk.</p>
              <p>Jl. Kapten A. Rivai No. 1008</p>
              <p>Palembang 30135</p>
              <p>No tlp : (0741) 6053100</p>
            </div>
            <div>
              <p>atau WA/SMS ditujukan ke :</p>
              <p className="font-bold text-sm mt-0.5">
                {formData.noWaPengaduan || "081376509049"}
              </p>
              <p className="mt-2 border-b border-dotted border-black w-48"></p>
            </div>
          </div>

          <p className="mb-3">
            Demikian kami sampaikan, atas perhatian dan kerjasama Bapak/Ibu kami
            ucapkan terimakasih.
          </p>

          {/* Footer Tanda Tangan */}
          <div className="grid grid-cols-12 gap-2 text-[9pt] pt-1">
            {/* Kiri: Bank Mandiri */}
            <div className="col-span-5">
              <p className="font-bold">PT. Bank Mandiri (Persero) Tbk</p>
              <p>
                KCP{" "}
                <span className="font-semibold">
                  {formData.namaKcp ||
                    "..........................................."}
                </span>
              </p>
              <div className="h-14"></div>
              <p className="font-semibold underline">
                {formData.namaMbm ||
                  "..................................................."}
              </p>
              <p className="font-bold">MBM</p>
            </div>

            {/* Kanan: Penerima PK */}
            <div className="col-span-7">
              <p className="font-bold">Telah diterima Perjanjian Kredit (PK)</p>
              <p>berikut asesoris Perjanjian Kreditnya</p>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <div className="h-14"></div>
                  <p className="font-semibold underline truncate">
                    {formData.namaDebitur ||
                      "......................................."}
                  </p>
                  <p className="font-bold">Debitur</p>
                </div>
                <div>
                  <div className="h-14"></div>
                  <p className="font-semibold underline truncate">
                    {formData.namaPasangan ||
                      "......................................."}
                  </p>
                  <p className="font-bold">Pasangan Debitur</p>
                </div>
              </div>
              <p className="mt-1.5">
                No. Handphone :{" "}
                <span className="font-semibold">
                  {formData.noHpDebitur ||
                    "......................................."}
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Floating Bar Mobile */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 p-3 flex gap-2.5 md:hidden shadow-lg print:hidden">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-[#003d79] active:bg-[#002b57] text-white font-semibold text-sm py-3 rounded-xl shadow-sm"
        >
          <Edit3 className="w-4 h-4 text-amber-400" /> Isi / Edit GCG
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 active:bg-amber-600 text-slate-900 font-bold text-sm py-3 rounded-xl shadow-sm"
        >
          <Printer className="w-4 h-4" /> Unduh PDF
        </button>
      </div>

      {/* MODAL INPUT DATA GCG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 print:hidden">
          <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Isi Data GCG Bank Mandiri
                </h3>
                <p className="text-xs text-slate-500">
                  Hitungan pencairan bersih terisi otomatis
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Modal Scrollable */}
            <div className="p-5 overflow-y-auto space-y-5 text-sm">
              {/* Group 1: Unit & Pencairan */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  1. Info Unit & Jadwal Pencairan
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama KCP / Unit Mikro
                  </label>
                  <input
                    type="text"
                    name="namaKcp"
                    value={formData.namaKcp}
                    onChange={handleChange}
                    placeholder="Contoh: Jambi Sipin"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tgl Pencairan
                    </label>
                    <input
                      type="text"
                      name="tanggalPencairan"
                      value={formData.tanggalPencairan}
                      onChange={handleChange}
                      placeholder="25 Nov 2026"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Selambat-lambatnya
                    </label>
                    <input
                      type="text"
                      name="batasTanggalPencairan"
                      value={formData.batasTanggalPencairan}
                      onChange={handleChange}
                      placeholder="27 Nov 2026"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      No. Rekening Debitur
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      name="noRekening"
                      value={formData.noRekening}
                      onChange={handleChange}
                      placeholder="11000xxxxxx"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      No. HP MBM
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      name="noHpMbm"
                      value={formData.noHpMbm}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Rincian Plafon & Biaya */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" /> 2. Plafon & Rincian
                  Biaya (Rp)
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Limit / Plafon Kredit
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="limitKredit"
                    value={formatRupiah(formData.limitKredit)}
                    onChange={handleCurrencyChange}
                    placeholder="Rp 50.000.000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Biaya Administrasi
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      name="biayaAdmin"
                      value={formatRupiah(formData.biayaAdmin)}
                      onChange={handleCurrencyChange}
                      placeholder="Rp 0"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Biaya Provisi
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      name="biayaProvisi"
                      value={formatRupiah(formData.biayaProvisi)}
                      onChange={handleCurrencyChange}
                      placeholder="Rp 0"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Asuransi
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      name="biayaAsuransi"
                      value={formatRupiah(formData.biayaAsuransi)}
                      onChange={handleCurrencyChange}
                      placeholder="Rp 0"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pemblokiran
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      name="pemblokiran"
                      value={formatRupiah(formData.pemblokiran)}
                      onChange={handleCurrencyChange}
                      placeholder="Rp 0"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>

                {/* Box Hasil Total Otomatis */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-900">
                    Total Pencairan Bersih:
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    {formData.limitKredit
                      ? formatRupiah(totalPencairanValue)
                      : "Rp 0"}
                  </span>
                </div>
              </div>

              {/* Group 3: Penyerahan Buku & Tanda Tangan */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  3. Penyerahan Buku & Tanda Tangan
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nama CSR
                    </label>
                    <input
                      type="text"
                      name="namaCsr"
                      value={formData.namaCsr}
                      onChange={handleChange}
                      placeholder="Nama petugas CSR"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tgl Penyerahan
                    </label>
                    <input
                      type="text"
                      name="tanggalSerahBuku"
                      value={formData.tanggalSerahBuku}
                      onChange={handleChange}
                      placeholder="25 Nov 2026"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama MBM (Pejabat Pemrakarsa)
                  </label>
                  <input
                    type="text"
                    name="namaMbm"
                    value={formData.namaMbm}
                    onChange={handleChange}
                    placeholder="Nama lengkap MBM"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nama Debitur
                    </label>
                    <input
                      type="text"
                      name="namaDebitur"
                      value={formData.namaDebitur}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pasangan Debitur
                    </label>
                    <input
                      type="text"
                      name="namaPasangan"
                      value={formData.namaPasangan}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    No. Handphone Debitur
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    name="noHpDebitur"
                    value={formData.noHpDebitur}
                    onChange={handleChange}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-[#003d79] hover:bg-[#002b57] text-white font-bold py-3 rounded-xl text-sm shadow"
              >
                <Check className="w-4 h-4" /> Simpan & Lihat Preview
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
