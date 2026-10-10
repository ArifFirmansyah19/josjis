export function mapInsuranceRows(rows, pkId) {
  const currentRows = (rows || []).filter((row) => row.pk_id === pkId);

  const findLatest = (jenisAsuransi) =>
    currentRows.find((row) => row.jenis_asuransi === jenisAsuransi) || null;

  const toUi = (row) =>
    row
      ? {
          ...row,
          provider: row.provider ?? "",
          nomor_polis: row.nomor_polis ?? "",
          premi: row.premi ?? null,
          order_status: row.order_status ?? "BELUM",
          payment_status: row.payment_status ?? "BELUM",
          tanggal_order: row.tanggal_order ?? null,
        }
      : null;

  const penjaminan = findLatest("PENJAMINAN");
  const afms = findLatest("AFMS");
  const ajk = findLatest("AJK");
  const axa = findLatest("AXA");
  const sijitu = findLatest("SIJITU");
  const magi = findLatest("MAGI");
  const mms = findLatest("MMS");

  return {
    penjaminan: toUi(penjaminan),

    // Mempertahankan kompatibilitas dengan kedua jenis
    // asuransi jiwa yang sudah digunakan.
    life: toUi(afms) || toUi(ajk) || toUi(magi) || toUi(mms),

    afms: toUi(afms),
    ajk: toUi(ajk),
    axa: toUi(axa),
    sijitu: toUi(sijitu),
    magi: toUi(magi),
    mms: toUi(mms),

    rows: currentRows,
  };
}
