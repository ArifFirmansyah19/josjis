import React, { useState } from "react";
import { Video, Edit3, Printer, X, Check, Camera, Trash2 } from "lucide-react";

export default function OTSDelegasiMBCM() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    tanggalKunjungan: "07 / 10 / 2026",
    pukulWib: "",
    petugas1: "EKO AYATULLAH MUKHFUZ",
    petugas2: "DONI ISWANTO",
    contactPerson: "",
    jenisKredit: "KUM", // 'KUM' | 'KUR'
    limitPengajuan: "350000000",
    jenisPengajuan: "Baru", // 'Baru' | 'Top Up KUR ke KUM' | 'Top Up Ke Limit Awal' | 'Top Up Melebihi Limit Awal' | 'Take Over'
    cifDebitur: "",
    noAplikasi: "KUR 11081A051026001",
    namaDebitur: "SINDU ARIBOWO",
    nikDebitur: "15092210940003",
    namaMbmMenyetujui: "EKO AYATULLAH MUKHFUZ",
    jabatanMenyetujui: "MBCM MUARA BUNGO",
    namaPetugasMengunjungi: "DONI ISWANTO",
    jabatanMengunjungi: "BANKING MANAGER",
    fotoEktp: "",
    fotoUsaha: "",
    fotoTempatTinggal: "",
    fotoPendukungVc: "",
    fotoPendukungLain: "",
    fotoLokasiPendukung: "",
  });

  const formatRupiah = (angka) => {
    if (!angka) return "";
    const numberString = angka.toString().replace(/[^,\d]/g, "");
    const sisa = numberString.length % 3;
    let rupiah = numberString.substr(0, sisa);
    const ribuan = numberString.substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? "." : "";
      rupiah += separator + ribuan.join(".");
    }
    return rupiah ? `Rp ${rupiah}` : "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (e) => {
    const rawNumeric = e.target.value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, limitPengajuan: rawNumeric }));
  };

  const handleImageUpload = (fieldName, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, [fieldName]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: "" }));
  };

  const handlePrint = () => {
    window.print();
  };

  const opsiJenisPengajuan = [
    "Baru",
    "Top Up KUR ke KUM",
    "Top Up Ke Limit Awal",
    "Top Up Melebihi Limit Awal",
    "Take Over",
  ];

  const slotFoto = [
    {
      key: "fotoEktp",
      label: "Foto (calon) Debitur yang menunjukan e-KTP",
      uploadLabel: "Upload / Foto e-KTP",
    },
    {
      key: "fotoUsaha",
      label: "Capture layar video call di lokasi usaha (calon) debitur",
      uploadLabel: "Upload Capture Lokasi Usaha",
    },
    {
      key: "fotoTempatTinggal",
      label: "Capture layar video call di tempat tinggal (calon) debitur",
      uploadLabel: "Upload Capture Tempat Tinggal",
    },
    {
      key: "fotoPendukungVc",
      label: "Capture layar video call (calon) pendukung lain",
      uploadLabel: "Upload Capture Pendukung VC",
    },
    {
      key: "fotoPendukungLain",
      label: "Capture pendukung lain",
      uploadLabel: "Upload Capture Pendukung Lain",
    },
    {
      key: "fotoLokasiPendukung",
      label: "Capture layar video call di lokasi pendukung lain",
      uploadLabel: "Upload Capture Lokasi Pendukung",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 pb-24 md:pb-12 font-sans">
      {/* Header Sticky Mobile-Friendly */}
      <header className="sticky top-0 z-30 bg-[#003d79] text-white px-4 py-3.5 shadow-md flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2.5">
          <Video className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h1 className="text-sm font-bold leading-tight">
              OTS Delegasi MBCM (Video Call)
            </h1>
            <p className="text-[11px] text-blue-200">
              Lembar Verifikasi Debitur & Foto OTS
            </p>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            <Edit3 className="w-4 h-4" /> Isi Data & Foto
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-[#003d79] font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            <Printer className="w-4 h-4" /> Unduh PDF / Cetak
          </button>
        </div>
      </header>

      {/* Banner Info Mobile */}
      <div className="max-w-4xl mx-auto px-4 pt-4 print:hidden">
        <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl p-3 flex items-center justify-between">
          <span>Geser ke samping untuk melihat lebar penuh A4 di HP.</span>
          <span className="font-semibold text-[#003d79] ml-2 shrink-0">
            Format A4
          </span>
        </div>
      </div>

      {/* Area Preview Kertas A4 */}
      <main className="max-w-5xl mx-auto p-4 overflow-x-auto print:p-0 print:overflow-visible">
        <div
          className="bg-white mx-auto shadow-lg border border-slate-200 text-black print:shadow-none print:border-none"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "12mm 14mm",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "9.5pt",
            lineHeight: "1.35",
          }}
        >
          {/* Judul Dokumen */}
          <h2 className="text-center font-bold text-sm underline mb-3">
            Lembar Verifikasi Debitur Dengan Sarana Video call
          </h2>

          {/* Blok Tanggal, Petugas, Contact Person, Jenis Kredit, Limit & Pengajuan */}
          <table className="w-full border-collapse mb-3 text-[9.5pt]">
            <tbody>
              <tr>
                <td className="w-36 py-0.5 font-semibold align-top">
                  Tanggal Kunjungan
                </td>
                <td className="w-64 py-0.5 align-top">
                  :{" "}
                  <span className="font-medium">
                    {formData.tanggalKunjungan || ".... / .... / 2026"}
                  </span>{" "}
                  Pukul{" "}
                  <span className="font-medium underline">
                    {formData.pukulWib || "........"}
                  </span>{" "}
                  WIB
                </td>
                <td className="py-0.5 align-top">
                  <div className="font-semibold">
                    Petugas yang memverifikasi:
                  </div>
                  <div>
                    1. {formData.petugas1 || "................................"}
                  </div>
                  <div>
                    2. {formData.petugas2 || "................................"}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="py-0.5 font-semibold">Contact Person</td>
                <td colSpan="2" className="py-0.5">
                  :{" "}
                  <span className="font-medium">
                    {formData.contactPerson ||
                      "........................................"}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-0.5 font-semibold">Jenis Kredit</td>
                <td colSpan="2" className="py-0.5">
                  :{" "}
                  <span className="inline-flex items-center gap-6 ml-1">
                    <span className="font-semibold">
                      {formData.jenisKredit === "KUM" ? "☑" : "☐"} KUM
                    </span>
                    <span className="font-semibold">
                      {formData.jenisKredit === "KUR" ? "☑" : "☐"} KUR
                    </span>
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-0.5 font-semibold">Limit Pengajuan</td>
                <td colSpan="2" className="py-0.5 font-bold">
                  :{" "}
                  {formatRupiah(formData.limitPengajuan) ||
                    "Rp ........................"}
                </td>
              </tr>
              <tr>
                <td className="py-1 font-semibold align-top">Pengajuan</td>
                <td colSpan="2" className="py-1 align-top">
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {opsiJenisPengajuan.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1"
                      >
                        <span>
                          {formData.jenisPengajuan === item ? "☑" : "☐"}
                        </span>
                        <span
                          className={
                            formData.jenisPengajuan === item ? "font-bold" : ""
                          }
                        >
                          {item}
                        </span>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tabel Informasi Debitur */}
          <div className="font-bold text-[9.5pt] mb-1">Informasi Debitur</div>
          <table className="w-full border-collapse border border-black mb-3 text-[9.5pt]">
            <tbody>
              <tr>
                <td className="border border-black px-2.5 py-1 w-48 font-semibold">
                  CIF Debitur
                </td>
                <td className="border border-black px-2.5 py-1">
                  :{" "}
                  <span className="font-medium">
                    {formData.cifDebitur || "-"}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1 font-semibold">
                  Nomor Aplikasi Kredit
                </td>
                <td className="border border-black px-2.5 py-1 font-semibold">
                  : {formData.noAplikasi || "-"}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1 font-semibold">
                  Nama Debitur
                </td>
                <td className="border border-black px-2.5 py-1 font-bold">
                  : {formData.namaDebitur || "-"}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1 font-semibold">
                  NIK Debitur
                </td>
                <td className="border border-black px-2.5 py-1 font-medium">
                  : {formData.nikDebitur || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Grid Foto OTS (Lampirkan) */}
          <div className="font-bold text-[9.5pt] mb-1">
            Foto OTS (Lampirkan)
          </div>
          <div className="grid grid-cols-3 border-t border-l border-black mb-4">
            {slotFoto.map((slot) => {
              const imgSrc = formData[slot.key];
              return (
                <div
                  key={slot.key}
                  className="border-r border-b border-black flex flex-col justify-between min-h-[125px]"
                >
                  <div className="flex-1 p-1.5 flex items-center justify-center bg-slate-50/40">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={slot.label}
                        className="max-h-24 w-full object-contain"
                      />
                    ) : (
                      <span className="text-[8pt] text-slate-400 italic text-center">
                        [Lampiran Foto]
                      </span>
                    )}
                  </div>
                  <div className="border-t border-black px-1.5 py-1 text-[8pt] font-medium text-center leading-tight bg-white">
                    {slot.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Blok Tanda Tangan */}
          <div className="grid grid-cols-2 gap-6 text-center text-[9.5pt] pt-1">
            <div>
              <p className="font-semibold">Menyetujui</p>
              <div className="h-14"></div>
              <p className="font-bold underline">
                (
                {formData.namaMbmMenyetujui ||
                  "........................................"}
                )
              </p>
              <p className="font-semibold uppercase text-[8.5pt]">
                {formData.jabatanMenyetujui || "MBCM"}
              </p>
            </div>
            <div>
              <p className="font-semibold">Petugas Yang Mengunjungi</p>
              <div className="h-14"></div>
              <p className="font-bold underline">
                (
                {formData.namaPetugasMengunjungi ||
                  "........................................"}
                )
              </p>
              <p className="font-semibold uppercase text-[8.5pt]">
                {formData.jabatanMengunjungi || "BANKING MANAGER"}
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
          <Edit3 className="w-4 h-4 text-amber-400" /> Isi Data & Foto
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 active:bg-amber-600 text-slate-900 font-bold text-sm py-3 rounded-xl shadow-sm"
        >
          <Printer className="w-4 h-4" /> Unduh PDF
        </button>
      </div>

      {/* MODAL INPUT DATA & FOTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 print:hidden">
          <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Isi Verifikasi Video Call
                </h3>
                <p className="text-xs text-slate-500">
                  Data & foto langsung tampil di preview
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
              {/* 1. Waktu & Petugas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  1. Jadwal & Petugas Verifikasi
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tanggal Kunjungan
                    </label>
                    <input
                      type="text"
                      name="tanggalKunjungan"
                      value={formData.tanggalKunjungan}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pukul (WIB)
                    </label>
                    <input
                      type="text"
                      name="pukulWib"
                      value={formData.pukulWib}
                      onChange={handleChange}
                      placeholder="10.30"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="08xxxxxxxxxx / Nama CP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Petugas 1
                    </label>
                    <input
                      type="text"
                      name="petugas1"
                      value={formData.petugas1}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Petugas 2
                    </label>
                    <input
                      type="text"
                      name="petugas2"
                      value={formData.petugas2}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Fasilitas & Limit */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  2. Fasilitas Kredit & Limit
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jenis Kredit
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {["KUM", "KUR"].map((jk) => (
                      <button
                        type="button"
                        key={jk}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, jenisKredit: jk }))
                        }
                        className={`py-2.5 rounded-xl border font-bold text-sm transition ${
                          formData.jenisKredit === jk
                            ? "bg-[#003d79] text-white border-[#003d79]"
                            : "bg-white text-slate-700 border-slate-300"
                        }`}
                      >
                        {jk}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Limit Pengajuan
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="limitPengajuan"
                    value={formatRupiah(formData.limitPengajuan)}
                    onChange={handleCurrencyChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jenis Pengajuan
                  </label>
                  <select
                    name="jenisPengajuan"
                    value={formData.jenisPengajuan}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base"
                  >
                    {opsiJenisPengajuan.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Informasi Debitur */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  3. Informasi Debitur
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      CIF Debitur
                    </label>
                    <input
                      type="text"
                      name="cifDebitur"
                      value={formData.cifDebitur}
                      onChange={handleChange}
                      placeholder="Opsional"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      No. Aplikasi Kredit
                    </label>
                    <input
                      type="text"
                      name="noAplikasi"
                      value={formData.noAplikasi}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Debitur
                  </label>
                  <input
                    type="text"
                    name="namaDebitur"
                    value={formData.namaDebitur}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    NIK Debitur
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="nikDebitur"
                    value={formData.nikDebitur}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
              </div>

              {/* 4. Lampiran Foto OTS & Capture Video Call */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> 4. Foto OTS & Capture Video
                  Call
                </h4>
                {slotFoto.map((slot) => (
                  <div
                    key={slot.key}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {slot.label}
                      </span>
                      {formData[slot.key] && (
                        <button
                          type="button"
                          onClick={() => clearImage(slot.key)}
                          className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(slot.key, e)}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#003d79] file:text-white hover:file:bg-[#002b57]"
                    />
                    {formData[slot.key] && (
                      <img
                        src={formData[slot.key]}
                        alt={slot.uploadLabel}
                        className="h-24 w-full object-contain rounded-lg bg-white border border-slate-200 p-1"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* 5. Penandatangan */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  5. Penandatangan Persetujuan & Kunjungan
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nama Menyetujui
                    </label>
                    <input
                      type="text"
                      name="namaMbmMenyetujui"
                      value={formData.namaMbmMenyetujui}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Jabatan Menyetujui
                    </label>
                    <input
                      type="text"
                      name="jabatanMenyetujui"
                      value={formData.jabatanMenyetujui}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Petugas Mengunjungi
                    </label>
                    <input
                      type="text"
                      name="namaPetugasMengunjungi"
                      value={formData.namaPetugasMengunjungi}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Jabatan Mengunjungi
                    </label>
                    <input
                      type="text"
                      name="jabatanMengunjungi"
                      value={formData.jabatanMengunjungi}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
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
