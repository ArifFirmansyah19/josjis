import React, { useState } from "react";
import {
  Images,
  Edit3,
  Printer,
  X,
  Check,
  RotateCw,
  Trash2,
  Building2,
  Home,
} from "lucide-react";

export default function KolaseOTS() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [meta, setMeta] = useState({
    kategoriFoto: "Foto Tempat Usaha", // 'Foto Tempat Usaha' | 'Foto Rumah'
    jumlahFoto: 3, // 2 | 3 | 4 (maksimal 4)
    namaDebitur: "",
    lokasi: "",
    tanggal: new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    autoOrientasi: true, // otomatis sesuaikan portrait/landscape agar muat di A4
  });

  // Tiap item menyimpan: src, naturalW, naturalH, orientation ('landscape'|'portrait'), rotation (0|90|180|270), caption
  const [photos, setPhotos] = useState([
    {
      id: 1,
      src: "",
      w: 0,
      h: 0,
      orientation: "landscape",
      rotation: 0,
      caption: "",
    },
    {
      id: 2,
      src: "",
      w: 0,
      h: 0,
      orientation: "landscape",
      rotation: 0,
      caption: "",
    },
    {
      id: 3,
      src: "",
      w: 0,
      h: 0,
      orientation: "landscape",
      rotation: 0,
      caption: "",
    },
    {
      id: 4,
      src: "",
      w: 0,
      h: 0,
      orientation: "landscape",
      rotation: 0,
      caption: "",
    },
  ]);

  const handleMetaChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMeta((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleJumlahFotoChange = (num) => {
    const clamped = Math.min(4, Math.max(2, Number(num)));
    setMeta((prev) => ({ ...prev, jumlahFoto: clamped }));
  };

  const handlePhotoUpload = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onload = () => {
        const isPortrait = img.naturalHeight > img.naturalWidth;
        setPhotos((prev) =>
          prev.map((item, idx) =>
            idx === index
              ? {
                  ...item,
                  src: dataUrl,
                  w: img.naturalWidth,
                  h: img.naturalHeight,
                  orientation: isPortrait ? "portrait" : "landscape",
                  // Jika autoOrientasi aktif dan foto portrait, putar 90deg agar pas di slot landscape A4
                  rotation: meta.autoOrientasi && isPortrait ? 90 : 0,
                }
              : item,
          ),
        );
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const toggleAutoOrientasi = () => {
    setMeta((prev) => {
      const nextAuto = !prev.autoOrientasi;
      setPhotos((currPhotos) =>
        currPhotos.map((p) => {
          if (!p.src) return p;
          if (nextAuto) {
            return { ...p, rotation: p.orientation === "portrait" ? 90 : 0 };
          }
          return { ...p, rotation: 0 };
        }),
      );
      return { ...prev, autoOrientasi: nextAuto };
    });
  };

  const rotatePhotoManual = (index) => {
    setPhotos((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, rotation: (item.rotation + 90) % 360 }
          : item,
      ),
    );
  };

  const removePhoto = (index) => {
    setPhotos((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              src: "",
              w: 0,
              h: 0,
              orientation: "landscape",
              rotation: 0,
            }
          : item,
      ),
    );
  };

  const handleCaptionChange = (index, value) => {
    setPhotos((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, caption: value } : item,
      ),
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const activePhotos = photos.slice(0, meta.jumlahFoto);

  // Menentukan tinggi area kolase di A4 agar pasti muat 1 halaman penuh tanpa meluber
  const getSlotHeightClass = () => {
    if (meta.jumlahFoto === 2) return "h-[345px]";
    if (meta.jumlahFoto === 3) return "h-[225px]";
    return "h-[225px]"; // untuk 4 foto (grid 2x2)
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-24 md:pb-12 font-sans">
      {/* Header Mobile-Friendly */}
      <header className="sticky top-0 z-30 bg-[#003d79] text-white px-4 py-3.5 shadow-md flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2.5">
          <Images className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h1 className="text-sm font-bold leading-tight">Kolase OTS (A4)</h1>
            <p className="text-[11px] text-blue-200">
              {meta.kategoriFoto} • {meta.jumlahFoto} Foto
            </p>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            <Edit3 className="w-4 h-4" /> Atur & Upload Foto
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-[#003d79] font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            <Printer className="w-4 h-4" /> Unduh PDF / Cetak
          </button>
        </div>
      </header>

      {/* Kontrol Cepat Mobile */}
      <div className="max-w-4xl mx-auto px-4 pt-3 space-y-2.5 print:hidden">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700">
              Jenis Foto:
            </span>
            <div className="grid grid-cols-2 gap-1.5 w-60">
              <button
                type="button"
                onClick={() =>
                  setMeta((prev) => ({
                    ...prev,
                    kategoriFoto: "Foto Tempat Usaha",
                  }))
                }
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                  meta.kategoriFoto === "Foto Tempat Usaha"
                    ? "bg-[#003d79] text-white border-[#003d79]"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Usaha
              </button>
              <button
                type="button"
                onClick={() =>
                  setMeta((prev) => ({ ...prev, kategoriFoto: "Foto Rumah" }))
                }
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                  meta.kategoriFoto === "Foto Rumah"
                    ? "bg-[#003d79] text-white border-[#003d79]"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <Home className="w-3.5 h-3.5" /> Rumah
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700">
              Jumlah Foto (Maks. 4):
            </span>
            <div className="flex gap-1.5">
              {[2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleJumlahFotoChange(num)}
                  className={`w-10 py-1.5 rounded-lg text-xs font-bold border ${
                    meta.jumlahFoto === num
                      ? "bg-amber-500 text-slate-900 border-amber-500"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Area Preview Kertas A4 (1 Halaman Penuh) */}
      <main className="max-w-5xl mx-auto p-4 overflow-x-auto print:p-0 print:overflow-visible">
        <div
          className="bg-white mx-auto shadow-lg border border-slate-200 text-black flex flex-col justify-between print:shadow-none print:border-none"
          style={{
            width: "210mm",
            height: "297mm",
            padding: "12mm 14mm",
            fontFamily: "Arial, Helvetica, sans-serif",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* Header Kolase A4 */}
          <div className="border-b-2 border-[#003d79] pb-2 mb-3 flex items-end justify-between">
            <div>
              <p className="text-[9pt] font-bold uppercase tracking-wider text-[#003d79]">
                DOKUMENTASI ON THE SPOT (OTS)
              </p>
              <h2 className="text-base font-bold uppercase text-black leading-tight">
                KOLASE {meta.kategoriFoto} ({meta.jumlahFoto} FOTO)
              </h2>
              <p className="text-[9.5pt] text-slate-800 mt-0.5">
                Debitur:{" "}
                <span className="font-bold">
                  {meta.namaDebitur ||
                    "........................................"}
                </span>
                {meta.lokasi && (
                  <>
                    {" "}
                    | Lokasi:{" "}
                    <span className="font-semibold">{meta.lokasi}</span>
                  </>
                )}
              </p>
            </div>
            <div className="text-right text-[9pt] text-slate-700">
              <div>
                Tanggal:{" "}
                <span className="font-semibold">{meta.tanggal || "-"}</span>
              </div>
              <div className="text-[8pt] text-slate-500">
                Auto-Orientasi: {meta.autoOrientasi ? "Aktif" : "Manual"}
              </div>
            </div>
          </div>

          {/* Grid Foto Dinamis (2, 3, atau 4 Foto) */}
          <div
            className={`flex-1 grid gap-2.5 ${
              meta.jumlahFoto === 2
                ? "grid-cols-1 grid-rows-2"
                : meta.jumlahFoto === 3
                  ? "grid-cols-1 grid-rows-3"
                  : "grid-cols-2 grid-rows-2"
            }`}
          >
            {activePhotos.map((photo, idx) => {
              const isRotated90or270 =
                photo.rotation === 90 || photo.rotation === 270;
              return (
                <div
                  key={photo.id}
                  className="border border-slate-800 rounded-xs flex flex-col overflow-hidden bg-slate-50/50"
                >
                  <div
                    className={`flex-1 w-full flex items-center justify-center overflow-hidden relative bg-white ${getSlotHeightClass()}`}
                  >
                    {photo.src ? (
                      <img
                        src={photo.src}
                        alt={`${meta.kategoriFoto} ${idx + 1}`}
                        style={{
                          transform: `rotate(${photo.rotation}deg) scale(${
                            isRotated90or270 ? 0.72 : 1
                          })`,
                          transition: "transform 0.2s ease",
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div className="text-center px-3">
                        <p className="text-[9.5pt] font-semibold text-slate-500">
                          Slot Foto #{idx + 1} — {meta.kategoriFoto}
                        </p>
                        <p className="text-[8pt] text-slate-400">
                          Otomatis menyesuaikan portrait / landscape agar muat
                          A4
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Keterangan Foto */}
                  <div className="border-t border-slate-800 px-2.5 py-1 bg-slate-50 flex items-center justify-between text-[8.5pt]">
                    <span className="font-bold">
                      {idx + 1}.{" "}
                      {photo.caption || `${meta.kategoriFoto} ${idx + 1}`}
                    </span>
                    {photo.src && (
                      <span className="text-[7.5pt] text-slate-500 uppercase">
                        {photo.orientation} • {photo.rotation}°
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Kecil di Bawah A4 */}
          <div className="pt-2 mt-2 border-t border-slate-300 flex items-center justify-between text-[8pt] text-slate-600">
            <span>
              Kategori: <b>{meta.kategoriFoto}</b> • Maksimal 4 foto per lembar
              A4
            </span>
            <span>Lembar Kolase OTS</span>
          </div>
        </div>
      </main>

      {/* Bottom Floating Bar Mobile */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 p-3 flex gap-2.5 md:hidden shadow-lg print:hidden">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-[#003d79] active:bg-[#002b57] text-white font-semibold text-sm py-3 rounded-xl shadow-sm"
        >
          <Edit3 className="w-4 h-4 text-amber-400" /> Upload & Atur
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 active:bg-amber-600 text-slate-900 font-bold text-sm py-3 rounded-xl shadow-sm"
        >
          <Printer className="w-4 h-4" /> Unduh PDF
        </button>
      </div>

      {/* MODAL FORM INPUT & UPLOAD FOTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 print:hidden">
          <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Pengaturan Kolase OTS
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih jenis foto, jumlah (2–4), dan upload gambar
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
              {/* 1. Kategori & Jumlah Foto */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  1. Kategori & Jumlah Foto (Maksimal 4)
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  {["Foto Tempat Usaha", "Foto Rumah"].map((kat) => (
                    <button
                      type="button"
                      key={kat}
                      onClick={() =>
                        setMeta((prev) => ({ ...prev, kategoriFoto: kat }))
                      }
                      className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition ${
                        meta.kategoriFoto === kat
                          ? "bg-[#003d79] text-white border-[#003d79]"
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      {kat}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Pilih Banyaknya Foto (2, 3, atau 4)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => handleJumlahFotoChange(num)}
                        className={`py-2.5 rounded-xl border font-bold text-sm ${
                          meta.jumlahFoto === num
                            ? "bg-amber-500 text-slate-900 border-amber-500"
                            : "bg-white text-slate-700 border-slate-300"
                        }`}
                      >
                        {num} Foto
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Auto Orientasi Portrait / Landscape */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <div className="text-xs pr-2">
                    <div className="font-bold text-slate-800">
                      Otomatis Miringkan / Tegakkan (Portrait & Landscape)
                    </div>
                    <div className="text-slate-500">
                      Menyesuaikan orientasi foto agar muat rapi di kertas A4
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={meta.autoOrientasi}
                    onChange={toggleAutoOrientasi}
                    className="w-5 h-5 rounded text-[#003d79] shrink-0"
                  />
                </label>
              </div>

              {/* 2. Identitas Singkat */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  2. Informasi Singkat
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Debitur
                  </label>
                  <input
                    type="text"
                    name="namaDebitur"
                    value={meta.namaDebitur}
                    onChange={handleMetaChange}
                    placeholder="Nama debitur"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Lokasi / Alamat
                    </label>
                    <input
                      type="text"
                      name="lokasi"
                      value={meta.lokasi}
                      onChange={handleMetaChange}
                      placeholder="Kec. / Kota"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tanggal
                    </label>
                    <input
                      type="text"
                      name="tanggal"
                      value={meta.tanggal}
                      onChange={handleMetaChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Upload Foto Sesuai Jumlah yang Dipilih */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003d79] bg-blue-50 px-2.5 py-1.5 rounded-md">
                  3. Upload {meta.jumlahFoto} Foto ({meta.kategoriFoto})
                </h4>

                {activePhotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Foto ke-{idx + 1}{" "}
                        {photo.src && (
                          <span className="font-normal text-slate-500">
                            ({photo.orientation}, {photo.rotation}°)
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {photo.src && (
                          <>
                            <button
                              type="button"
                              onClick={() => rotatePhotoManual(idx)}
                              className="text-xs bg-white border border-slate-300 px-2 py-1 rounded-lg flex items-center gap-1 text-slate-700"
                            >
                              <RotateCw className="w-3.5 h-3.5" /> Putar 90°
                            </button>
                            <button
                              type="button"
                              onClick={() => removePhoto(idx)}
                              className="text-xs text-red-600 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(idx, e)}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#003d79] file:text-white"
                    />

                    <input
                      type="text"
                      value={photo.caption}
                      onChange={(e) => handleCaptionChange(idx, e.target.value)}
                      placeholder={`Keterangan foto ke-${idx + 1} (opsional)`}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    />

                    {photo.src && (
                      <div className="h-24 w-full bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={photo.src}
                          alt={`Preview ${idx + 1}`}
                          style={{
                            transform: `rotate(${photo.rotation}deg) scale(${
                              photo.rotation === 90 || photo.rotation === 270
                                ? 0.65
                                : 1
                            })`,
                            maxHeight: "100%",
                            maxWidth: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-[#003d79] hover:bg-[#002b57] text-white font-bold py-3 rounded-xl text-sm shadow"
              >
                <Check className="w-4 h-4" /> Terapkan ke Preview A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style Khusus Print A4 1 Halaman */}
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
