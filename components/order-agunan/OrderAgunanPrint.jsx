"use client";

function formatAgunanSurat(agunan) {
  if (!agunan) return "—";

  const nomor = agunan.nomor ? ` No. ${agunan.nomor}` : "";
  const desa = agunan.desa ? `/${agunan.desa}` : "";
  const nama = agunan.namaSertifikat ? ` an. ${agunan.namaSertifikat}` : "";

  return `${agunan.jenis}${nomor}${desa}${nama}`;
}

export default function OrderAgunanPrint({
  rows = [],
  suratKeluar = "JKK 1",
  noSurat = "",
  tanggal = "",
  supervisor = {},
}) {
  return (
    <div
      id="order-agunan-print"
      className="order-agunan-print bg-white text-black"
      style={{
        width: "210mm",
        minHeight: "297mm",
        boxSizing: "border-box",
        padding: "30px 58px 38px 58px",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#000",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 245px",
          columnGap: "25px",
          alignItems: "start",
        }}
      >
        {/* KIRI */}
        <div
          style={{
            fontSize: "12px",
            lineHeight: 1.5,
            paddingTop: "50px",
          }}
        >
          <div>
            Nomor : NRF.R02.JBI.Um.JKK/
            {suratKeluar}/{noSurat || "-"}/2026
          </div>

          <div>Tanggal : {tanggal}</div>

          <div>Lampiran : -</div>
        </div>

        {/* KANAN */}
        <div
          style={{
            textAlign: "right",
            fontSize: "8.5px",
            lineHeight: 1.25,
            marginTop: "-25px",
            marginBottom: "-15px",
          }}
        >
          <img
            src="/images/mandiri-logo.png"
            alt="Bank Mandiri"
            style={{
              display: "block",
              width: "170px",
              height: "auto",
              marginLeft: "auto",
              marginRight: "-20px",
              marginTop: "15px",
              marginBottom: "-8px",
            }}
          />

          <div
            style={{
              marginTop: "-20px",
              fontWeight: 700,
              fontSize: "9px",
              paddingRight: "15px",
            }}
          >
            PT BANK MANDIRI (Persero) Tbk.
          </div>

          <div style={{ paddingRight: "15px" }}>
            <div>Kantor Cabang Mikro / Mandiri Mitra Usaha</div>
            <div>Jambi Kuamang Kuning</div>
            <div>Jl. Batanghari RT.06/02</div>
            <div>Ds. Purwasari Kec. Pelepat Ilir</div>
            <div>Bungo - Jambi</div>
            <div>Telp.: 07477326156 / Fax.: 07477326157</div>
          </div>
        </div>
      </div>

      {/* =================================================
          KEPADA
          Dekat dengan Lampiran
      ================================================= */}
      <div
        style={{
          fontSize: "12px",
          lineHeight: 1.5,
          marginTop: "-10px",
        }}
      >
        <div
          style={{
            fontWeight: 700,
          }}
        >
          Kepada,
        </div>

        <div>PT.Bank Mandiri (Persero) Tbk</div>
        <div>Micro Business Cluster Jambi Bungo</div>
        <div>Jln Sudirman No. 58</div>
        <div>Muara Bungo</div>
      </div>

      {/* =================================================
          PERIHAL
      ================================================= */}
      <div
        style={{
          marginTop: "9px",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        <span
          style={{
            fontWeight: 700,
          }}
        >
          Perihal :
        </span>{" "}
        Pengambilan Agunan Kredit Mikro CO Muara Bungo.
      </div>

      {/* =================================================
          BODY
      ================================================= */}
      <div
        style={{
          marginTop: "9px",
          fontSize: "12px",
          lineHeight: 1.5,
          textAlign: "justify",
        }}
      >
        Menunjuk perihal tersebut di atas, dengan ini mohon bantuannya untuk
        menyerahkan agunan kredit mikro Branch Kuamang Kuning kepada kami,
        selanjutnya agunan dimaksud akan kami tindak lanjuti sebagaimana
        mestinya, dengan rincian sebagai berikut.
      </div>

      {/* =================================================
          TABLE
      ================================================= */}
      <div
        style={{
          marginTop: "11px",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            fontSize: "10px",
            lineHeight: 1.4,
          }}
        >
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "21%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={thStyle}>No.</th>
              <th style={thStyle}>Notasi</th>
              <th style={thStyle}>Nama Debitur</th>
              <th style={thStyle}>No. Rekening</th>
              <th style={thStyle}>Jenis Agunan *)</th>
              <th style={thStyle}>Keterangan **)</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    padding: "12px",
                  }}
                >
                  Belum ada data agunan.
                </td>
              </tr>
            ) : (
              rows.flatMap((row) => {
                const agunanList =
                  Array.isArray(row.agunan) && row.agunan.length > 0
                    ? row.agunan
                    : [null];

                return agunanList.map((agunan, agunanIndex) => {
                  const cells = [];

                  if (agunanIndex === 0) {
                    cells.push(
                      <td
                        key="no"
                        rowSpan={agunanList.length}
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          verticalAlign: "top",
                        }}
                      >
                        {row.no}
                      </td>,
                    );

                    cells.push(
                      <td
                        key="notasi"
                        rowSpan={agunanList.length}
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          verticalAlign: "top",
                        }}
                      >
                        {row.notasi}
                      </td>,
                    );

                    cells.push(
                      <td
                        key="debitur"
                        rowSpan={agunanList.length}
                        style={{
                          ...tdStyle,
                          verticalAlign: "top",
                        }}
                      >
                        {row.namaDebitur}
                      </td>,
                    );

                    cells.push(
                      <td
                        key="norek"
                        rowSpan={agunanList.length}
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          verticalAlign: "top",
                        }}
                      >
                        {row.norekPinjaman}
                      </td>,
                    );
                  }

                  cells.push(
                    <td
                      key="agunan"
                      style={{
                        ...tdStyle,
                        verticalAlign: "top",
                      }}
                    >
                      {agunanList.length > 1 && (
                        <div
                          style={{
                            fontWeight: 700,
                            marginBottom: "2px",
                          }}
                        >
                          Agunan {agunanIndex + 1}
                        </div>
                      )}

                      {formatAgunanSurat(agunan)}
                    </td>,
                  );

                  {
                    /* Keterangan = Lunas / Top Up */
                  }
                  if (agunanIndex === 0) {
                    cells.push(
                      <td
                        key="status"
                        rowSpan={agunanList.length}
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          verticalAlign: "top",
                          fontWeight: 600,
                        }}
                      >
                        {row.status || "—"}
                      </td>,
                    );
                  }

                  return <tr key={`${row.id}-${agunanIndex}`}>{cells}</tr>;
                });
              })
            )}
          </tbody>
        </table>
      </div>

      {/* =================================================
          PENUTUP
          Tepat setelah tabel
      ================================================= */}
      <div
        style={{
          marginTop: "14px",
          fontSize: "12px",
          lineHeight: 1.5,
          textAlign: "justify",
        }}
      >
        Demikian permohonan kami atas bantuan dan kerjasamanya kami ucapkan
        terima kasih.
      </div>

      {/* =================================================
          TANDA TANGAN PENGAWAS
          Di bawah penutup
      ================================================= */}
      <div
        style={{
          marginTop: "20px",
          width: "250px",
          textAlign: "left",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        <div>PT. Bank Mandiri (Persero) Tbk</div>
        <div>KCP Jambi Kuamang Kuning</div>

        <div
          style={{
            height: "65px",
          }}
        />

        <div
          style={{
            fontWeight: 700,
            textDecoration: "underline",
          }}
        >
          {supervisor?.name || "Nama Pegawai Pengawas"}
        </div>

        <div>{supervisor?.position || "Pengawas Unit"}</div>
      </div>

      {/* =================================================
          CATATAN
          Paling bawah setelah tanda tangan
      ================================================= */}
      <div
        style={{
          marginTop: "20px",
          fontSize: "9px",
          lineHeight: 1.4,
        }}
      >
        <div>
          *) Jenis agunan cukup diisi SHM No, BPKB No. SK, an. dll tanpa alamat.
        </div>

        <div>**) Keterangan diisi status pinjaman: Lunas / Top Up.</div>
      </div>
    </div>
  );
}

const thStyle = {
  border: "1px solid #000",
  padding: "5px 4px",
  textAlign: "center",
  verticalAlign: "middle",
  fontWeight: 700,
};

const tdStyle = {
  border: "1px solid #000",
  padding: "5px 4px",
};
