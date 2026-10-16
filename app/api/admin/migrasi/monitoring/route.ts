import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireActiveAdmin } from "@/lib/migrasi-admin-auth";

export const dynamic = "force-dynamic";

type Produk = "KUR" | "KUM";

type UnitRow = {
  id: string;
  kode_legacy?: string | null;
  kode_unit?: string | null;
  nama_unit?: string | null;
};

type BatchRow = {
  id: string;
  unit_id: string;
  nama_batch: string | null;
  dibuat_oleh: string | null;
  status: string;
  created_at: string;
  dihapus_at: string | null;
};

type DebiturRow = {
  id: string;
  batch_id: string;
  pk_id: string;
  created_at: string;
};

type PKRow = {
  id: string;
  unit_id: string;
  mks_id?: string | null;
  cif?: string | null;
  nama_debitur?: string | null;
  nomor_pk?: string | null;
  status_pk?: string | null;
  limit_kredit?: number | string | null;
  jenis_pengajuan_kredit?: string | null;
};

type DokumenRow = {
  id: string;
  migrasi_debitur_id: string;
  jenis_dokumen: string;
  nama_file: string;
  ukuran_bytes: number | null;
  mime_type: string | null;
  status: string;
  created_at: string;
  dihapus_at: string | null;
};

function normalizeProduk(value: string | null | undefined): Produk | null {
  const produk = String(value ?? "")
    .trim()
    .toUpperCase();

  if (produk === "KUR" || produk.includes("KREDIT USAHA RAKYAT")) {
    return "KUR";
  }

  if (produk === "KUM" || produk.includes("KREDIT USAHA MIKRO")) {
    return "KUM";
  }

  return null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function emptyResponse() {
  return NextResponse.json({
    success: true,
    data: [],
    ringkasan: {
      jumlah_batch: 0,
      jumlah_debitur: 0,
      jumlah_dokumen: 0,
      lengkap: 0,
      belum_lengkap: 0,
      perlu_diperiksa: 0,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    // 1. Validasi admin aktif.
    const auth = await requireActiveAdmin();

    if (!auth.ok) {
      return jsonError(auth.error || "Akses ditolak.", auth.status || 403);
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batch_id")?.trim();
    const kodeLegacy = searchParams.get("kode_legacy")?.trim();

    // 2. Filter unit jika kode unit diberikan.
    let unitFilterIds: string[] | null = null;

    if (kodeLegacy) {
      const { data: unitData, error: unitError } = await supabaseAdmin
        .from("unit")
        .select("id, kode_legacy, kode_unit, nama_unit")
        .or(`kode_legacy.eq.${kodeLegacy},kode_unit.eq.${kodeLegacy}`);

      if (unitError) {
        console.error(
          "Monitoring: gagal mengambil unit berdasarkan kode",
          unitError,
        );

        return jsonError("Gagal mengambil data unit.", 500);
      }

      const filteredUnits = (unitData ?? []) as UnitRow[];
      unitFilterIds = filteredUnits.map((unit) => unit.id);

      if (unitFilterIds.length === 0) {
        return emptyResponse();
      }
    }

    // 3. Ambil batch migrasi.
    let batchQuery = supabaseAdmin
      .from("migrasi_batch")
      .select(
        "id, unit_id, nama_batch, dibuat_oleh, status, created_at, dihapus_at",
      )
      .is("dihapus_at", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (batchId) {
      batchQuery = batchQuery.eq("id", batchId);
    }

    if (unitFilterIds) {
      batchQuery = batchQuery.in("unit_id", unitFilterIds);
    }

    const { data: batchData, error: batchError } = await batchQuery;

    if (batchError) {
      console.error("Monitoring: gagal mengambil batch", batchError);

      return jsonError("Gagal mengambil batch migrasi.", 500);
    }

    const batches = (batchData ?? []) as BatchRow[];

    if (batches.length === 0) {
      return emptyResponse();
    }

    const batchIds = batches.map((batch) => batch.id);
    const unitIds = [...new Set(batches.map((batch) => batch.unit_id))];

    // 4. Ambil data unit.
    // PENTING: tabel unit tidak memiliki kolom "nama".
    const { data: unitData, error: unitError } = await supabaseAdmin
      .from("unit")
      .select("id, kode_legacy, kode_unit, nama_unit")
      .in("id", unitIds);

    if (unitError) {
      console.error("Monitoring: gagal mengambil nama unit", unitError);

      return jsonError("Gagal mengambil informasi unit.", 500);
    }

    const units = (unitData ?? []) as UnitRow[];
    const unitMap = new Map(units.map((unit) => [unit.id, unit]));

    // 5. Ambil relasi debitur dalam batch.
    const { data: debiturData, error: debiturError } = await supabaseAdmin
      .from("migrasi_debitur")
      .select("id, batch_id, pk_id, created_at")
      .in("batch_id", batchIds)
      .is("dihapus_at", null)
      .order("created_at", { ascending: true });

    if (debiturError) {
      console.error("Monitoring: gagal mengambil debitur", debiturError);

      return jsonError("Gagal mengambil data debitur migrasi.", 500);
    }

    const debitur = (debiturData ?? []) as DebiturRow[];
    const pkIds = [...new Set(debitur.map((row) => row.pk_id))];
    const migrasiDebiturIds = debitur.map((row) => row.id);

    // 6. Ambil PK asli.
    // Produk tidak ditentukan dari input manual atau relasi migrasi.
    let pkRows: PKRow[] = [];

    if (pkIds.length > 0) {
      const { data: pkData, error: pkError } = await supabaseAdmin
        .from("pk")
        .select(
          "id, unit_id, mks_id, cif, nama_debitur, nomor_pk, status_pk, limit_kredit, jenis_pengajuan_kredit",
        )
        .in("id", pkIds);

      if (pkError) {
        console.error("Monitoring: gagal mengambil PK", pkError);

        return jsonError("Gagal mengambil data PK asli.", 500);
      }

      pkRows = (pkData ?? []) as PKRow[];
    }

    const pkMap = new Map(pkRows.map((pk) => [pk.id, pk]));

    // 7. Ambil seluruh dokumen aktif.
    let dokumenRows: DokumenRow[] = [];

    if (migrasiDebiturIds.length > 0) {
      const { data: dokumenData, error: dokumenError } = await supabaseAdmin
        .from("migrasi_dokumen")
        .select(
          "id, migrasi_debitur_id, jenis_dokumen, nama_file, ukuran_bytes, mime_type, status, created_at, dihapus_at",
        )
        .in("migrasi_debitur_id", migrasiDebiturIds)
        .is("dihapus_at", null)
        .order("created_at", { ascending: false });

      if (dokumenError) {
        console.error("Monitoring: gagal mengambil dokumen", dokumenError);

        return jsonError("Gagal mengambil dokumen migrasi.", 500);
      }

      dokumenRows = (dokumenData ?? []) as DokumenRow[];
    }

    const dokumenMap = new Map<string, DokumenRow[]>();

    for (const dokumen of dokumenRows) {
      const current = dokumenMap.get(dokumen.migrasi_debitur_id) ?? [];

      current.push(dokumen);
      dokumenMap.set(dokumen.migrasi_debitur_id, current);
    }

    // 8. Susun hasil monitoring per batch.
    const data = batches.map((batch) => {
      const unit = unitMap.get(batch.unit_id);

      const debiturBatch = debitur
        .filter((row) => row.batch_id === batch.id)
        .map((relation) => {
          const pk = pkMap.get(relation.pk_id) ?? null;
          const produk = normalizeProduk(pk?.jenis_pengajuan_kredit);

          const dokumen = dokumenMap.get(relation.id) ?? [];

          const dokumenTersimpan = dokumen.filter(
            (item) => item.status === "TERSIMPAN",
          );

          const dokumenWajib = produk
            ? [
                "PK",
                "Form Aplikasi",
                ...(produk === "KUR" ? ["Polis Penjaminan"] : []),
              ]
            : [];

          const jenisDokumenTersimpan = new Set(
            dokumenTersimpan.map((item) =>
              item.jenis_dokumen.trim().toUpperCase(),
            ),
          );

          const dokumenKurang = dokumenWajib.filter(
            (jenis) => !jenisDokumenTersimpan.has(jenis.trim().toUpperCase()),
          );

          let statusKelengkapan:
            | "PRODUK_PERLU_DICEK"
            | "PK_TIDAK_DITEMUKAN"
            | "LENGKAP"
            | "BELUM_LENGKAP"
            | "BELUM_ADA_DOKUMEN";

          if (!pk) {
            statusKelengkapan = "PK_TIDAK_DITEMUKAN";
          } else if (!produk) {
            statusKelengkapan = "PRODUK_PERLU_DICEK";
          } else if (dokumenKurang.length === 0) {
            statusKelengkapan = "LENGKAP";
          } else if (dokumenTersimpan.length === 0) {
            statusKelengkapan = "BELUM_ADA_DOKUMEN";
          } else {
            statusKelengkapan = "BELUM_LENGKAP";
          }

          return {
            id: relation.id,
            batch_id: relation.batch_id,
            pk_id: relation.pk_id,
            created_at: relation.created_at,

            // Produk mengikuti PK asli di Supabase.
            produk,
            pk,

            dokumen,
            jumlah_dokumen: dokumen.length,
            jumlah_dokumen_tersimpan: dokumenTersimpan.length,
            dokumen_wajib: dokumenWajib,
            dokumen_kurang: dokumenKurang,
            status_kelengkapan: statusKelengkapan,
          };
        });

      const jumlahDokumen = debiturBatch.reduce(
        (total, row) => total + row.jumlah_dokumen,
        0,
      );

      return {
        id: batch.id,
        unit_id: batch.unit_id,
        nama_batch: batch.nama_batch ?? null,

        unit: unit
          ? {
              id: unit.id,
              kode_legacy: unit.kode_legacy ?? null,
              kode_unit: unit.kode_unit ?? null,
              nama:
                unit.nama_unit ||
                unit.kode_unit ||
                unit.kode_legacy ||
                "Unit tidak diketahui",
            }
          : null,

        dibuat_oleh: batch.dibuat_oleh,
        status: batch.status,
        created_at: batch.created_at,
        jumlah_debitur: debiturBatch.length,
        jumlah_dokumen: jumlahDokumen,

        jumlah_lengkap: debiturBatch.filter(
          (row) => row.status_kelengkapan === "LENGKAP",
        ).length,

        jumlah_belum_lengkap: debiturBatch.filter(
          (row) =>
            row.status_kelengkapan === "BELUM_LENGKAP" ||
            row.status_kelengkapan === "BELUM_ADA_DOKUMEN",
        ).length,

        jumlah_perlu_diperiksa: debiturBatch.filter(
          (row) =>
            row.status_kelengkapan === "PRODUK_PERLU_DICEK" ||
            row.status_kelengkapan === "PK_TIDAK_DITEMUKAN",
        ).length,

        debitur: debiturBatch,
      };
    });

    // 9. Ringkasan keseluruhan.
    const semuaDebitur = data.flatMap((batch) => batch.debitur);

    const ringkasan = {
      jumlah_batch: data.length,
      jumlah_debitur: semuaDebitur.length,

      jumlah_dokumen: data.reduce(
        (total, batch) => total + batch.jumlah_dokumen,
        0,
      ),

      lengkap: semuaDebitur.filter(
        (row) => row.status_kelengkapan === "LENGKAP",
      ).length,

      belum_lengkap: semuaDebitur.filter(
        (row) =>
          row.status_kelengkapan === "BELUM_LENGKAP" ||
          row.status_kelengkapan === "BELUM_ADA_DOKUMEN",
      ).length,

      perlu_diperiksa: semuaDebitur.filter(
        (row) =>
          row.status_kelengkapan === "PRODUK_PERLU_DICEK" ||
          row.status_kelengkapan === "PK_TIDAK_DITEMUKAN",
      ).length,
    };

    return NextResponse.json({
      success: true,
      data,
      ringkasan,
    });
  } catch (error) {
    console.error("Monitoring migrasi: kesalahan tidak terduga", error);

    return jsonError("Terjadi kesalahan saat mengambil data monitoring.", 500);
  }
}
