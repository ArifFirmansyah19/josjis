function hasInsuranceData(data) {
  if (!data || typeof data !== "object") return false;

  return Object.values(data).some(
    (value) => value !== undefined && value !== null && value !== "",
  );
}

function normalizeStatus(value, fallback = "BELUM") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return value;
}

export async function syncInsurance({
  supabase,
  pkId,
  insurance,
  pkDate = null,
}) {
  if (!supabase || !pkId || !insurance) return;

  const records = [];

  function addRecord(jenisAsuransi, data, { force = false } = {}) {
    if (!force && !hasInsuranceData(data)) return;

    data = data || {};

    records.push({
      jenis_asuransi: jenisAsuransi,
      provider: data.provider || null,
      nomor_polis: data.nomorPolis || null,
      premi: data.premi ?? null,

      // Status order dan pembayaran terpisah.
      order_status: data.orderStatus || null,
      payment_status: data.paymentStatus || null,

      // Mengutamakan tanggal PK.
      tanggal_order: pkDate || data.tanggalOrder || null,
    });
  }

  // 1. Penjaminan KUR: Askrindo atau Jamkrindo.
  addRecord("PENJAMINAN", insurance.penjaminan);

  // 2. Asuransi jiwa: AII MAGI atau AJK AMFS,
  // mengikuti hasil penentuan aturan asuransi.
  if (insurance.life) {
    addRecord(insurance.life.type || "AFMS", insurance.life);
  }

  // 3. AXA jika digunakan.
  addRecord("AXA", insurance.axa);

  // 4. SIJITU. Premi default Rp300.000
  // jika objek SIJITU memang dikirim oleh formulir.
  if (insurance.sijitu) {
    addRecord("SIJITU", {
      ...insurance.sijitu,
      premi: insurance.sijitu.premi ?? 300000,
    });
  }

  // 5. MAGI jika digunakan.
  addRecord("MAGI", insurance.magi);

  // 6. MMS jika digunakan untuk debitur berusia >50 tahun.
  addRecord("MMS", insurance.mms);

  if (records.length === 0) return;

  const jenisAsuransi = [
    ...new Set(records.map((record) => record.jenis_asuransi)),
  ];

  // Ambil data lama agar status dan tanggal yang sudah tersimpan
  // tidak otomatis kembali ke BELUM atau menjadi kosong.
  const { data: existingRows, error: fetchError } = await supabase
    .from("pk_asuransi")
    .select(
      "id, jenis_asuransi, provider, nomor_polis, premi, order_status, payment_status, tanggal_order",
    )
    .eq("pk_id", pkId)
    .in("jenis_asuransi", jenisAsuransi);

  if (fetchError) throw fetchError;

  const existingByType = new Map(
    (existingRows || []).map((row) => [row.jenis_asuransi, row]),
  );

  for (const record of records) {
    const existing = existingByType.get(record.jenis_asuransi);

    const payload = {
      pk_id: pkId,
      jenis_asuransi: record.jenis_asuransi,

      provider: record.provider ?? existing?.provider ?? null,

      nomor_polis: record.nomor_polis ?? existing?.nomor_polis ?? null,

      premi: record.premi ?? existing?.premi ?? null,

      order_status: normalizeStatus(
        record.order_status,
        existing?.order_status || "BELUM",
      ),

      payment_status: normalizeStatus(
        record.payment_status,
        existing?.payment_status || "BELUM",
      ),

      tanggal_order: record.tanggal_order ?? existing?.tanggal_order ?? null,

      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from("pk_asuransi")
        .update(payload)
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("pk_asuransi").insert({
        ...payload,
        order_status: normalizeStatus(payload.order_status),
        payment_status: normalizeStatus(payload.payment_status),
      });

      if (error) throw error;
    }
  }
}
