import { UNIT_INFO, WEEKDAYS } from "../utils/lemburConstants";
import { formatDateLong } from "../utils/lemburHelpers";

export default function SpklTemplate({ date, records, master, unit }) {
  const info = UNIT_INFO[unit] || UNIT_INFO.JKK1;
  const supervisor = master?.supervisor || {};
  const mkaList = Array.isArray(master?.mka) ? master.mka : [];
  const branchManager = master?.branchManager || {};
  const sortedRecords = [...records].sort((a, b) =>
    (a.jam_mulai || "").localeCompare(b.jam_mulai || ""),
  );
  const workRows =
    sortedRecords.length > 0
      ? sortedRecords.map((record, index) => {
          const mka = record.mka_nama
            ? {
                name: record.mka_nama,
                nip: record.mka_nip,
                position: record.mka_jabatan,
              }
            : mkaList.find((person) => person.id === record.mka_id);
          return {
            no: index + 1,
            nip: mka?.nip || "-",
            name: mka?.name || "-",
            position: mka?.position || "MKA",
            time: `${record.jam_mulai || "-"} - ${record.jam_selesai || "-"}`,
            work: record.pekerjaan || "-",
          };
        })
      : mkaList.map((mka, index) => ({
          no: index + 1,
          nip: mka.nip || "-",
          name: mka.name || "-",
          position: mka.position || "MKA",
          time: "-",
          work: "-",
        }));
  const safeRows =
    workRows.length > 0
      ? workRows
      : [{ no: 1, nip: "-", name: "-", position: "MKA", time: "-", work: "-" }];
  const dateObject = new Date(`${date}T00:00:00`);
  const weekday = WEEKDAYS[dateObject.getDay()];
  return (
    <section className="spkl-page">
      <div className="spkl-header">
        <div className="spkl-logo-area">
          <img
            src="/images/mandiri-logo.png"
            alt="Bank Mandiri"
            className="spkl-logo"
          />
        </div>
        <div className="spkl-title-wrap">
          <h1>SURAT PERINTAH KERJA LEMBUR</h1>
        </div>
        <div className="spkl-header-right" />
      </div>
      <p className="spkl-intro">
        Sehubungan dengan adanya tugas pekerjaan dan/atau kegiatan kedinasan
        yang tidak dapat ditunda / ditangguhkan, sehingga membutuhkan
        penyelesaian dengan segera, maka dengan ini kami memerintahkan kepada
        pegawai yang tercantum dalam daftar di bawah ini untuk melaksanakan
        Kerja Lembur pada :
      </p>
      <div className="spkl-date-info">
        <div>
          <span>Hari</span>
          <strong>:</strong>
          <span>{weekday}</span>
        </div>
        <div>
          <span>Tanggal</span>
          <strong>:</strong>
          <span>{formatDateLong(date)}</span>
        </div>
        <div>
          <span>Sifat Pekerjaan</span>
          <strong>:</strong>
          <span>Non Rutin</span>
        </div>
      </div>
      <h2 className="spkl-section-title">I. Petugas Kerja Lembur</h2>
      <table className="spkl-table spkl-table-workers">
        <thead>
          <tr>
            <th className="col-no">NO.</th>
            <th className="col-nip">NIP</th>
            <th className="col-name">NAMA</th>
            <th className="col-position">JABATAN</th>
            <th className="col-unit">UNIT KERJA</th>
            <th className="col-time">WAKTU LEMBUR</th>
            <th className="col-work">PEKERJAAN YANG HARUS DISELESAIKAN</th>
            <th className="col-sign">TANDA TANGAN</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row) => (
            <tr key={`${row.no}-${row.nip}-${row.name}`}>
              <td className="text-center">{row.no}</td>
              <td>{row.nip}</td>
              <td className="font-semibold">{row.name}</td>
              <td>{row.position}</td>
              <td>{info.workUnit}</td>
              <td className="whitespace-nowrap text-center">{row.time}</td>
              <td>{row.work}</td>
              <td className="signature-cell" />
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="spkl-section-title spkl-supervisor-title">
        II. PENGAWAS KERJA LEMBUR
      </h2>
      <table className="spkl-table spkl-table-supervisor">
        <thead>
          <tr>
            <th className="col-no">NO.</th>
            <th className="col-nip">NIP</th>
            <th className="col-name">NAMA</th>
            <th className="col-position">JABATAN</th>
            <th className="col-unit">UNIT KERJA</th>
            <th className="col-sign">TANDA TANGAN</th>
            <th className="col-note">CATATAN PENGAWASAN *)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-center">1</td>
            <td>{supervisor.nip || "-"}</td>
            <td className="font-semibold">{supervisor.name || "-"}</td>
            <td>{supervisor.position || "-"}</td>
            <td>{info.workUnit}</td>
            <td className="signature-cell supervisor-signature" />
            <td>Dilaksanakan sesuai dengan baik</td>
          </tr>
        </tbody>
      </table>
      <div className="spkl-note">
        *) Penilaian hasil Kerja Lembur yang diisi pada akhir Kerja Lembur atau
        bagi Atasan Langsung : satu hari berikutnya.
      </div>
      <div className="spkl-approval">
        <div className="spkl-location">
          Kuamang Kuning, {formatDateLong(date)}
        </div>
        <div className="spkl-knowing">Mengetahui,</div>
        <div className="spkl-bank">PT Bank Mandiri (Persero) Tbk</div>
        <div className="spkl-branch">KCP KUAMANG KUNING</div>
        <div className="spkl-manager-sign" />
        <div className="spkl-manager-sign" />
        <div className="spkl-manager-name">{branchManager.name || "-"}</div>
        <div className="spkl-manager-position">
          {branchManager.position || "Branch Manager"}
        </div>
      </div>
    </section>
  );
}
