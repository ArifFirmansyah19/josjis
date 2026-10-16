"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

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

function getNama(pk) {
  return pk?.nama || pk?.namaDebitur || pk?.nama_debitur || "-";
}

function getNoRekening(pk) {
  return (
    pk?.noRekening || pk?.norek || pk?.no_rekening || pk?.nomorRekening || ""
  );
}

function getAgunan(pk) {
  return (
    pk?.agunanUtama || pk?.agunan || pk?.pengikatan || pk?.agunan_utama || ""
  );
}

function getBacklog(pk) {
  return pk?.backlog || pk?.nomorBacklog || pk?.no_backlog || "";
}

function getCurrent(pk) {
  return pk?.current || pk?.nomorCurrent || pk?.no_current || "";
}

function terbilangSederhana(n) {
  const angka = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  if (n < 0) return String(n);
  if (n < 12) return angka[n];
  if (n < 20) return `${terbilangSederhana(n - 10)} Belas`;
  if (n < 100) {
    return `${terbilangSederhana(Math.floor(n / 10))} Puluh${
      n % 10 ? ` ${terbilangSederhana(n % 10)}` : ""
    }`;
  }
  return String(n);
}

export default function LampiranMigrasiPage() {
  const router = useRouter();
  const [dokumen, setDokumen] = useState(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("josjis_bast_migrasi");

      if (raw) {
        setDokumen(JSON.parse(raw));
      }
    } catch (error) {
      console.error("Gagal membaca data BAST migrasi:", error);
    }

    setSiap(true);
  }, []);

  const debitur = useMemo(
    () => (Array.isArray(dokumen?.debitur) ? dokumen.debitur : []),
    [dokumen],
  );

  const tanggal = dokumen?.tanggal || "2026-10-13";
  const tahun = dokumen?.tahun || "2026";
  const nomorSurat = dokumen?.nomorSurat || "0370";
  const unit = dokumen?.unit || "JKK1";

  const kodeUnit = unit === "JKK2" ? "JKK" : "JKK";

  const nomorLengkap = `NRF.R02.JBI.${kodeUnit}/${nomorSurat}/${tahun}`;

  function handlePrint() {
    window.print();
  }

  if (!siap) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Menyiapkan dokumen...
      </div>
    );
  }

  if (!dokumen || !debitur.length) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-lg font-bold text-slate-900">
          Data migrasi tidak ditemukan
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Kembali ke halaman Migrasi DMS, pilih debitur terlebih dahulu, lalu
          klik BAST + Lampiran.
        </p>
        <button
          type="button"
          onClick={() => router.push("/admin/migrasi")}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Kembali ke Migrasi
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-6">
      {/* Tombol hanya muncul di layar, tidak ikut dicetak */}
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/migrasi")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Cetak / Simpan PDF
        </button>
      </div>

      {/* Satu lembar A4: BAST di atas, lampiran di bawah */}
      <article className="paper mx-auto bg-white text-black shadow-lg">
        <section className="bast">
          <h1 className="text-center text-[13px] font-bold">
            BERITA ACARA SERAH TERIMA
          </h1>
          <h2 className="text-center text-[12px] font-bold">DOKUMEN KREDIT</h2>
          <p className="mb-3 text-center text-[10px] font-bold">
            No. {nomorLengkap}
          </p>

          <p className="mb-2 text-justify">
            Pada hari ini {formatTanggalPanjang(tanggal)} bertempat di{" "}
            <strong>
              PT Bank Mandiri (Persero) Tbk., Branch KCM Kuamang Kuning
            </strong>
            , Jl. Batang Hari RT. 006 RW. 002 Desa Purwasari Kec. Pelepat Ilir
            Kab. Bungo Prop. Jambi, kami masing-masing yang bertanda tangan di
            bawah ini:
          </p>

          <div className="identity">
            <div className="identity-row">
              <span>Nama</span>
              <span>:</span>
              <strong>Doni Iswanto</strong>
            </div>
            <div className="identity-row">
              <span>NIP</span>
              <span>:</span>
              <span>1387525306</span>
            </div>
            <div className="identity-row">
              <span>Jabatan</span>
              <span>:</span>
              <span>Branch Manager</span>
            </div>
          </div>

          <p className="mb-2">
            Bertindak dalam jabatannya tersebut selanjutnya disebut yang
            menyerahkan atau <strong>PIHAK I</strong>.
          </p>

          <div className="identity">
            <div className="identity-row">
              <span>Nama</span>
              <span>:</span>
              <strong>Eko Hayatullah Makhfuz</strong>
            </div>
            <div className="identity-row">
              <span>NIP</span>
              <span>:</span>
              <span>1082387416</span>
            </div>
            <div className="identity-row">
              <span>Jabatan</span>
              <span>:</span>
              <span>MBCM – MBC Jambi Bungo</span>
            </div>
          </div>

          <p className="mb-2">
            Bertindak dalam jabatannya tersebut selanjutnya disebut yang
            menerima atau <strong>PIHAK II</strong>.
          </p>

          <p className="mb-2 text-justify">
            Dengan ini menyatakan bahwa <strong>PIHAK PERTAMA</strong>{" "}
            menyerahkan kepada <strong>PIHAK KEDUA</strong> sebagaimana{" "}
            <strong>PIHAK KEDUA</strong> menerima dari{" "}
            <strong>PIHAK PERTAMA</strong> dokumen kredit milik{" "}
            <strong>
              {debitur.length} ({terbilangSederhana(debitur.length)}) DEBITUR
            </strong>{" "}
            dengan rincian sebagaimana terlampir:
          </p>

          <p className="mb-2 text-justify">
            Serah terima dokumen-dokumen (sesuai daftar terlampir) tersebut
            dilaksanakan dalam rangka pengadministrasian dan penyimpanan
            dokumen.
          </p>

          <p className="text-justify">
            Dengan penyerahan dokumen tersebut di atas, maka sejak tanggal hari
            ini segala tanggung jawab dari dokumen tersebut di atas beralih
            kepada <strong>PIHAK KEDUA</strong>.
          </p>
        </section>

        <section className="lampiran">
          <h2 className="text-center text-[9px] font-bold">
            LAMPIRAN BAST DOKUMEN KREDIT
          </h2>
          <p className="mb-1 text-center text-[8px] font-semibold">
            No. {nomorLengkap}
          </p>

          <table className="document-table">
            <thead>
              <tr>
                <th rowSpan={2} className="no-col">
                  NO
                </th>
                <th rowSpan={2} className="nama-col">
                  NAMA DEBITUR
                </th>
                <th rowSpan={2} className="rekening-col">
                  NO. REKENING
                </th>
                <th rowSpan={2} className="agunan-col">
                  AGUNAN UTAMA PENGIKATAN
                </th>
                <th className="backlog-col">BACKLOG</th>
                <th className="current-col">CURRENT</th>
              </tr>
              <tr>
                <th> </th>
                <th> </th>
              </tr>
            </thead>

            <tbody>
              {debitur.map((pk, index) => (
                <tr key={pk.id || `${getNama(pk)}-${index}`}>
                  <td className="text-center">{index === 0 ? "1" : ""}</td>
                  <td>{getNama(pk)}</td>
                  <td className="text-center">{getNoRekening(pk)}</td>
                  <td>{getAgunan(pk)}</td>
                  <td>{getBacklog(pk)}</td>
                  <td>{getCurrent(pk)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="signatures">
            <div>
              <p>Yang Menyerahkan</p>
              <p>Pihak I</p>
              <div className="signature-space" />
              <p className="font-bold">Doni Iswanto</p>
              <p>Branch Manager</p>
            </div>

            <div>
              <p>Yang Menerima</p>
              <p>Pihak II</p>
              <div className="signature-space" />
              <p className="font-bold">Eko Hayatullah Makhfuz</p>
              <p>MBCM</p>
            </div>
          </div>
        </section>
      </article>

      <style jsx global>{`
        .paper {
          box-sizing: border-box;
          width: 210mm;
          min-height: 297mm;
          padding: 10mm;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 8px;
          line-height: 1.25;
        }

        .bast {
          font-size: 8px;
          line-height: 1.25;
        }

        .identity {
          margin: 3px 0 5px 22px;
        }

        .identity-row {
          display: grid;
          grid-template-columns: 48px 8px 1fr;
          gap: 3px;
          margin: 1px 0;
        }

        .lampiran {
          margin-top: 8px;
        }

        .document-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 6.5px;
          line-height: 1.15;
        }

        .document-table th,
        .document-table td {
          border: 1px solid #222;
          padding: 3px 3px;
          vertical-align: top;
          overflow-wrap: anywhere;
        }

        .document-table th {
          text-align: center;
          font-weight: 700;
        }

        .no-col {
          width: 5%;
        }

        .nama-col {
          width: 21%;
        }

        .rekening-col {
          width: 17%;
        }

        .agunan-col {
          width: 27%;
        }

        .backlog-col {
          width: 20%;
        }

        .current-col {
          width: 10%;
        }

        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin-top: 8px;
          text-align: center;
          font-size: 7px;
          line-height: 1.2;
        }

        .signature-space {
          height: 22px;
        }

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .paper,
          .paper * {
            visibility: visible;
          }

          .paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }

          .no-print {
            display: none !important;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </main>
  );
}
