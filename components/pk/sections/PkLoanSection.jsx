"use client";

import PkInput from "@/components/pk/shared/PkInput";
import PkSelect from "@/components/pk/shared/PkSelect";
import PkSection from "@/components/pk/shared/PkSection";

const loanTypes = [
  { value: "KUM", label: "KUM" },
  { value: "KUR", label: "KUR" },
  { value: "KPP", label: "KPP" },
  { value: "KSM", label: "KSM" },
];

const pkStatuses = [
  { value: "AKTIF", label: "AKTIF" },
  { value: "LUNAS", label: "LUNAS" },
  { value: "BATAL", label: "BATAL" },
];

const DEFAULT_TUJUAN_KREDIT = "Untuk Usaha Perkebunan Kelapa Sawit";

const KUR_BUNGA_TAHUN = 6;
const KUR_BUNGA_BULAN = KUR_BUNGA_TAHUN / 12;

/**
 * Format angka menjadi format Indonesia.
 *
 * Contoh:
 * 1550000 -> 1.550.000
 */
function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const raw = String(value).replace(/\D/g, "");

  if (!raw) {
    return "";
  }

  return new Intl.NumberFormat("id-ID").format(Number(raw));
}

/**
 * Mengambil angka saja dari input.
 *
 * Contoh:
 * 1.550.000 -> 1550000
 */
function sanitizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value).replace(/\D/g, "");
}

/**
 * Menghitung tanggal acuan angsuran:
 * TGL PK + 1 bulan.
 *
 * Contoh:
 * 2026-01-31 -> 2026-02-28
 * 2026-03-15 -> 2026-04-15
 */
function getTanggalAcuanAngsuran(tanggalPk) {
  if (!tanggalPk) {
    return "";
  }

  const date = new Date(`${tanggalPk}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const originalDay = date.getDate();

  date.setMonth(date.getMonth() + 1);

  // Jika tanggal bergeser karena bulan berikutnya
  // tidak memiliki tanggal yang sama.
  if (date.getDate() !== originalDay) {
    date.setDate(0);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Membersihkan nomor rekening.
 *
 * Contoh:
 * 110-00-2031703-5
 * menjadi
 * 1100020317035
 */
function sanitizeRekening(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/\D/g, "");
}

/**
 * Bunga KUM per bulan =
 * bunga per tahun / 12
 */
function getBungaKumPerBulan(bungaTahun) {
  if (bungaTahun === null || bungaTahun === undefined || bungaTahun === "") {
    return "";
  }

  const numericValue = Number(bungaTahun);

  if (Number.isNaN(numericValue)) {
    return "";
  }

  return numericValue / 12;
}

export default function PkLoanSection({ pk, setPk, canEdit, locked }) {
  const disabled = !canEdit || locked;

  /**
   * Update field umum.
   */
  const update = (field, value) => {
    if (disabled) return;

    setPk((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Perubahan jenis pinjaman.
   */
  const handleLoanTypeChange = (value) => {
    if (disabled) return;

    setPk((prev) => {
      // KUR
      if (value === "KUR") {
        return {
          ...prev,
          jenis_pengajuan_kredit: value,
          bunga_per_tahun: KUR_BUNGA_TAHUN,
          bunga_per_bulan: KUR_BUNGA_BULAN,
          tujuan_kredit: DEFAULT_TUJUAN_KREDIT,
        };
      }

      // KUM
      if (value === "KUM") {
        const bungaTahun =
          prev.bunga_per_tahun === null ||
          prev.bunga_per_tahun === undefined ||
          prev.bunga_per_tahun === ""
            ? ""
            : prev.bunga_per_tahun;

        return {
          ...prev,
          jenis_pengajuan_kredit: value,
          bunga_per_tahun: bungaTahun,
          bunga_per_bulan: getBungaKumPerBulan(bungaTahun),
          tujuan_kredit: DEFAULT_TUJUAN_KREDIT,
        };
      }

      // KPP / KSM
      return {
        ...prev,
        jenis_pengajuan_kredit: value,
        tujuan_kredit: DEFAULT_TUJUAN_KREDIT,
      };
    });
  };

  /**
   * Perubahan bunga per tahun.
   *
   * KUM:
   * bunga bulan otomatis = bunga tahun / 12
   *
   * KUR:
   * tidak bisa diubah.
   */
  const handleBungaTahunChange = (value) => {
    if (disabled) return;

    setPk((prev) => {
      if (prev.jenis_pengajuan_kredit === "KUR") {
        return {
          ...prev,
          bunga_per_tahun: KUR_BUNGA_TAHUN,
          bunga_per_bulan: KUR_BUNGA_BULAN,
        };
      }

      if (prev.jenis_pengajuan_kredit === "KUM") {
        return {
          ...prev,
          bunga_per_tahun: value,
          bunga_per_bulan: getBungaKumPerBulan(value),
        };
      }

      return {
        ...prev,
        bunga_per_tahun: value,
      };
    });
  };

  /**
   * Perubahan TGL PK.
   *
   * Otomatis mengubah:
   * Tanggal Acuan Angsuran
   * dan memastikan Tujuan Kredit tetap sesuai.
   */
  const handleTanggalPkChange = (value) => {
    if (disabled) return;

    setPk((prev) => ({
      ...prev,
      tanggal_pk: value,
      tanggal_acuan_angsuran: getTanggalAcuanAngsuran(value),
      tujuan_kredit: DEFAULT_TUJUAN_KREDIT,
    }));
  };

  /**
   * Input nominal.
   *
   * State menyimpan angka tanpa titik.
   */
  const handleNominalChange = (field, value) => {
    if (disabled) return;

    update(field, sanitizeNumber(value));
  };

  /**
   * Input nomor rekening.
   */
  const handleRekeningChange = (field, value) => {
    if (disabled) return;

    update(field, sanitizeRekening(value));
  };

  const loanType = pk?.jenis_pengajuan_kredit || "";

  const isKUR = loanType === "KUR";
  const isKUM = loanType === "KUM";

  const bungaTahun = isKUR ? KUR_BUNGA_TAHUN : (pk?.bunga_per_tahun ?? "");

  const bungaBulan = isKUR
    ? KUR_BUNGA_BULAN
    : isKUM
      ? getBungaKumPerBulan(pk?.bunga_per_tahun)
      : (pk?.bunga_per_bulan ?? "");

  const tanggalAcuanAngsuran = getTanggalAcuanAngsuran(pk?.tanggal_pk);

  return (
    <PkSection
      title="Informasi Pinjaman"
      description="Informasi utama fasilitas pinjaman dan PK."
      locked={locked}
    >
      <div className="space-y-6">
        {/* =====================================================
            INFORMASI MKS
        ====================================================== */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">
              Informasi MKS
            </h3>

            <p className="mt-1 text-xs text-zinc-500">
              Informasi MKS berasal dari master MKS dan tidak diubah dari data
              PK.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PkInput label="MKS / SGP" value={pk?.mksName || ""} disabled />

            <PkInput
              label="Kode Agen MKS"
              value={pk?.mksAgentCode || ""}
              disabled
            />
          </div>
        </div>

        {/* =====================================================
            IDENTITAS FASILITAS
        ====================================================== */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">
              Identitas Fasilitas
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PkSelect
              label="Jenis Pinjaman"
              value={loanType}
              onChange={(e) => handleLoanTypeChange(e.target.value)}
              disabled={disabled}
              options={loanTypes}
            />

            <PkInput
              label="CIF"
              value={pk?.cif || ""}
              onChange={(e) => update("cif", e.target.value)}
              disabled={disabled}
            />

            <PkInput
              label="No. Aplikasi Peminjaman"
              value={pk?.nomor_aplikasi || ""}
              onChange={(e) => update("nomor_aplikasi", e.target.value)}
              disabled={disabled}
            />

            <PkInput
              label="Tgl Aplikasi Peminjaman"
              type="date"
              value={pk?.tanggal_aplikasi || ""}
              onChange={(e) => update("tanggal_aplikasi", e.target.value)}
              disabled={disabled}
            />

            <PkInput
              label="TGL PK"
              type="date"
              value={pk?.tanggal_pk || ""}
              onChange={(e) => handleTanggalPkChange(e.target.value)}
              disabled={disabled}
            />

            <PkInput
              label="NO. PK"
              value={pk?.nomor_pk || ""}
              onChange={(e) => update("nomor_pk", e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* =====================================================
            PLAFOND & JANGKA WAKTU
        ====================================================== */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">
              Plafond & Jangka Waktu
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PkInput
              label="Limit Kredit"
              type="text"
              inputMode="numeric"
              value={formatNumber(pk?.limit_kredit)}
              onChange={(e) =>
                handleNominalChange("limit_kredit", e.target.value)
              }
              disabled={disabled}
            />

            <PkInput
              label="Jangka Waktu"
              type="number"
              value={pk?.jangka_waktu ?? ""}
              onChange={(e) =>
                update(
                  "jangka_waktu",
                  e.target.value === "" ? "" : e.target.value,
                )
              }
              disabled={disabled}
              suffix="bulan"
            />

            <PkInput
              label="Angsuran Kredit"
              type="text"
              inputMode="numeric"
              value={formatNumber(pk?.angsuran_kredit)}
              onChange={(e) =>
                handleNominalChange("angsuran_kredit", e.target.value)
              }
              disabled={disabled}
            />

            <PkInput
              label="Tujuan Kredit"
              value={DEFAULT_TUJUAN_KREDIT}
              disabled
            />
          </div>
        </div>

        {/* =====================================================
            SUKU BUNGA
        ====================================================== */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">Suku Bunga</h3>

            <p className="mt-1 text-xs text-zinc-500">
              {isKUR
                ? "Bunga KUR otomatis 6% per tahun atau 0,5% per bulan."
                : isKUM
                  ? "Bunga KUM per bulan dihitung otomatis dari bunga per tahun."
                  : "Bunga dapat diisi sesuai data fasilitas."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <PkInput
              label="Bunga per Tahun"
              type="number"
              value={bungaTahun}
              onChange={(e) =>
                handleBungaTahunChange(
                  e.target.value === "" ? "" : e.target.value,
                )
              }
              disabled={disabled || isKUR}
              suffix="%"
            />

            <PkInput
              label="Bunga per Bulan"
              type="number"
              value={bungaBulan}
              onChange={(e) => {
                if (isKUM || isKUR) {
                  return;
                }

                update(
                  "bunga_per_bulan",
                  e.target.value === "" ? "" : e.target.value,
                );
              }}
              disabled={disabled || isKUM || isKUR}
              suffix="%"
            />

            <PkInput
              label="Tgl Acuan Angsuran"
              type="date"
              value={tanggalAcuanAngsuran}
              disabled
            />
          </div>
        </div>

        {/* =====================================================
            REKENING
        ====================================================== */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">Rekening</h3>

            <p className="mt-1 text-xs text-zinc-500">
              Nomor rekening disimpan tanpa tanda hubung atau spasi.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PkInput
              label="Norek Tabungan"
              value={pk?.rekening_tabungan || ""}
              onChange={(e) =>
                handleRekeningChange("rekening_tabungan", e.target.value)
              }
              disabled={disabled}
              inputMode="numeric"
            />

            <PkInput
              label="Norek Pinjaman"
              value={pk?.rekening_kredit || ""}
              onChange={(e) =>
                handleRekeningChange("rekening_kredit", e.target.value)
              }
              disabled={disabled}
              inputMode="numeric"
            />
          </div>
        </div>

        {/* =====================================================
            STATUS
        ====================================================== */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">Status</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PkSelect
              label="Status PK"
              value={pk?.status_pk || "AKTIF"}
              onChange={(e) => update("status_pk", e.target.value)}
              disabled={disabled}
              options={pkStatuses}
            />
          </div>
        </div>
      </div>
    </PkSection>
  );
}
