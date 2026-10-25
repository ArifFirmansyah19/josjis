"use client";

import { useMemo, useState } from "react";
import { Calculator, RotateCcw, ShieldCheck, CalendarDays } from "lucide-react";

const STANDARD_RULES = {
  KUM: [
    {
      min: 1,
      max: 100000000,
      serviceFeeRate: 0.005,
      provisionRate: 0.005,
    },
    {
      min: 100000001,
      max: 250000000,
      serviceFeeRate: 0.0075,
      provisionRate: 0.005,
    },
    {
      min: 250000001,
      max: 500000000,
      serviceFeeRate: 0.01,
      provisionRate: 0.005,
    },
  ],

  KUR: [
    {
      min: 1,
      max: 10000000,
      serviceFeeType: "fixed",
      serviceFeeValue: 1,
      provisionRate: 0,
    },
    {
      min: 10000001,
      max: 100000000,
      serviceFeeRate: 0.02,
      provisionRate: 0,
    },
    {
      min: 100000001,
      max: 500000000,
      serviceFeeRate: 0.019,
      provisionRate: 0,
    },
  ],
};

function formatRupiah(value) {
  const number = Number(value) || 0;

  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(number)}`;
}

function formatInputNominal(value) {
  const numeric = String(value).replace(/\D/g, "");

  if (!numeric) return "";

  return new Intl.NumberFormat("id-ID").format(Number(numeric));
}

function parseNominal(value) {
  const numeric = String(value).replace(/\D/g, "");

  return numeric ? Number(numeric) : 0;
}

function formatPercent(rate) {
  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(rate * 100)}%`;
}

function findStandardRule(loanType, limit) {
  const rules = STANDARD_RULES[loanType] || [];

  return rules.find((rule) => limit >= rule.min && limit <= rule.max) || null;
}

/**
 * Menghitung umur berdasarkan tanggal lahir.
 * Umur dihitung dalam tahun penuh, bukan sekadar
 * selisih tahun kalender.
 */
function calculateAge(birthDate) {
  if (!birthDate) return null;

  const parts = birthDate.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [year, month, day] = parts;

  const birth = new Date(year, month - 1, day);
  const today = new Date();

  // Pastikan tanggal yang dimasukkan valid.
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day ||
    birth > today
  ) {
    return null;
  }

  let age = today.getFullYear() - year;

  const birthdayHasNotPassed =
    today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day);

  if (birthdayHasNotPassed) {
    age -= 1;
  }

  return age;
}

/**
 * Aturan asuransi:
 * 1. Umur > 50 tahun: AMFS + MMS, semua limit.
 * 2. Umur <= 50 tahun dan limit < Rp300 juta:
 *    AII MAGI + SI JITU.
 * 3. Umur <= 50 tahun dan limit Rp300-500 juta:
 *    AMFS + SI JITU.
 *
 * Limit di atas Rp500 juta untuk umur <= 50 tahun
 * belum memiliki ketentuan asuransi dalam aturan ini.
 */
function determineInsurance(age, limit) {
  if (age === null || age === undefined || limit <= 0) {
    return {
      names: [],
      message:
        "Masukkan umur atau tanggal lahir dan limit kredit untuk menentukan asuransi.",
      status: "incomplete",
    };
  }

  // Prioritas utama: umur di atas 50 tahun.
  if (age > 50) {
    return {
      names: ["AMFS", "MMS"],
      message:
        "Debitur berumur di atas 50 tahun. Asuransi AMFS + MMS berlaku untuk semua limit KUR maupun KUM.",
      status: "determined",
    };
  }

  // Umur 50 tahun atau kurang, limit di bawah Rp300 juta.
  if (limit < 300000000) {
    return {
      names: ["AII MAGI", "SI JITU"],
      message: "Umur 50 tahun atau kurang dengan limit di bawah Rp300 juta.",
      status: "determined",
    };
  }

  // Umur 50 tahun atau kurang, limit Rp300-500 juta.
  if (limit <= 500000000) {
    return {
      names: ["AMFS", "SI JITU"],
      message:
        "Umur 50 tahun atau kurang dengan limit Rp300 juta sampai Rp500 juta.",
      status: "determined",
    };
  }

  return {
    names: [],
    message:
      "Ketentuan asuransi untuk limit di atas Rp500 juta bagi debitur berumur 50 tahun atau kurang belum ditentukan.",
    status: "unsupported",
  };
}

const STANDARD_TABLE = [
  {
    product: "KUM",
    limit: "Rp1–Rp100 juta",
    service: "0,50%",
    provision: "0,50%",
  },
  {
    product: "KUM",
    limit: ">Rp100–Rp250 juta",
    service: "0,75%",
    provision: "0,50%",
  },
  {
    product: "KUM",
    limit: ">Rp250–Rp500 juta",
    service: "1,00%",
    provision: "0,50%",
  },
  {
    product: "KUR",
    limit: "s.d. Rp10 juta",
    service: "Rp1",
    provision: "Rp0",
  },
  {
    product: "KUR",
    limit: ">Rp10–Rp100 juta",
    service: "2,00%",
    provision: "Rp0",
  },
  {
    product: "KUR",
    limit: ">Rp100–Rp500 juta",
    service: "1,90%",
    provision: "Rp0",
  },
];

export default function PraPencairanPage() {
  const [loanType, setLoanType] = useState("KUM");
  const [limitInput, setLimitInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // Jika tanggal lahir diisi, umur otomatis dihitung.
  // Jika tidak, umur menggunakan input manual.
  const calculatedAge = useMemo(() => {
    if (birthDate) {
      return calculateAge(birthDate);
    }

    if (ageInput.trim() === "") {
      return null;
    }

    const parsed = Number(ageInput);

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 120) {
      return null;
    }

    return parsed;
  }, [ageInput, birthDate]);

  const calculation = useMemo(() => {
    const limit = parseNominal(limitInput);

    if (!limit) {
      return {
        limit: 0,
        serviceFee: 0,
        serviceFeeRate: 0,
        provision: 0,
        provisionRate: 0,
        notaryFee: 0,
        otherCost: 0,
        totalFee: 0,
        rule: null,
        error: "",
      };
    }

    const standardRule = findStandardRule(loanType, limit);

    if (!standardRule) {
      return {
        limit,
        serviceFee: 0,
        serviceFeeRate: 0,
        provision: 0,
        provisionRate: 0,
        notaryFee: 0,
        otherCost: 0,
        totalFee: 0,
        rule: null,
        error: "Limit kredit berada di luar batas ketentuan pencairan.",
      };
    }

    let serviceFee = 0;
    let serviceFeeRate = standardRule.serviceFeeRate || 0;

    if (standardRule.serviceFeeType === "fixed") {
      serviceFee = standardRule.serviceFeeValue;
      serviceFeeRate = 0;
    } else {
      serviceFee = limit * standardRule.serviceFeeRate;
    }

    const provision = limit * standardRule.provisionRate;

    // Nominal notaris tetap Rp0 untuk saat ini.
    const notaryFee = 0;

    // Biaya lainnya tetap Rp0 untuk saat ini.
    const otherCost = 0;

    const totalFee = serviceFee + provision + notaryFee + otherCost;

    return {
      limit,
      serviceFee,
      serviceFeeRate,
      provision,
      provisionRate: standardRule.provisionRate,
      notaryFee,
      otherCost,
      totalFee,
      rule: standardRule,
      error: "",
    };
  }, [loanType, limitInput]);

  const insurance = useMemo(
    () => determineInsurance(calculatedAge, calculation.limit),
    [calculatedAge, calculation.limit],
  );

  function handleLimitChange(event) {
    setLimitInput(formatInputNominal(event.target.value));
  }

  function handleAgeChange(event) {
    const value = event.target.value;

    // Izinkan input kosong ketika pengguna menghapus angka.
    if (value === "") {
      setAgeInput("");
      return;
    }

    // Umur hanya boleh berupa angka bulat.
    if (!/^\d+$/.test(value)) return;

    const age = Number(value);

    if (age <= 120) {
      setAgeInput(value);
    }
  }

  function handleBirthDateChange(event) {
    setBirthDate(event.target.value);
  }

  function handleReset() {
    setLoanType("KUM");
    setLimitInput("");
    setAgeInput("");
    setBirthDate("");
  }

  const insuranceHasResult =
    insurance.status === "determined" && insurance.names.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
          <Calculator className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Kalkulator Pra Pencairan
          </h1>

          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            Hitung biaya layanan, provisi, dan rekomendasi asuransi berdasarkan
            umur serta limit kredit.
          </p>
        </div>
      </div>

      {/* INPUT PENCairan DAN DATA UMUR */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-zinc-900">
            Input Pencairan
          </h2>

          <p className="mt-0.5 text-xs text-zinc-500">
            Masukkan jenis pinjaman, limit kredit, dan umur atau tanggal lahir
            debitur.
          </p>
        </div>

        <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
          {/* JENIS PINJAMAN */}
          <div>
            <label
              htmlFor="loanType"
              className="mb-1.5 block text-sm font-medium text-zinc-700"
            >
              Jenis Pinjaman
            </label>

            <select
              id="loanType"
              value={loanType}
              onChange={(event) => setLoanType(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
            >
              <option value="KUM">KUM</option>
              <option value="KUR">KUR</option>
            </select>
          </div>

          {/* LIMIT */}
          <div>
            <label
              htmlFor="loanLimit"
              className="mb-1.5 block text-sm font-medium text-zinc-700"
            >
              Limit Kredit
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                Rp
              </span>

              <input
                id="loanLimit"
                type="text"
                inputMode="numeric"
                value={limitInput}
                onChange={handleLimitChange}
                placeholder="0"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              />
            </div>
          </div>

          {/* UMUR */}
          <div>
            <label
              htmlFor="debtorAge"
              className="mb-1.5 block text-sm font-medium text-zinc-700"
            >
              Umur Debitur
            </label>

            <div className="relative">
              <input
                id="debtorAge"
                type="number"
                inputMode="numeric"
                min="0"
                max="120"
                step="1"
                value={
                  birthDate && calculatedAge !== null ? calculatedAge : ageInput
                }
                onChange={handleAgeChange}
                readOnly={Boolean(birthDate)}
                placeholder="Contoh: 45"
                className={`h-11 w-full rounded-xl border border-zinc-200 px-3 pr-14 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 ${
                  birthDate ? "bg-zinc-50 text-zinc-500" : "bg-white"
                }`}
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                tahun
              </span>
            </div>

            <p className="mt-1.5 text-xs text-zinc-400">
              {birthDate
                ? "Umur dihitung otomatis dari tanggal lahir."
                : "Isi umur jika tanggal lahir tidak diketahui."}
            </p>
          </div>

          {/* TANGGAL LAHIR */}
          <div>
            <label
              htmlFor="birthDate"
              className="mb-1.5 block text-sm font-medium text-zinc-700"
            >
              Tanggal Lahir
            </label>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={handleBirthDateChange}
                max={new Date().toLocaleDateString("en-CA")}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              />
            </div>

            <p className="mt-1.5 text-xs text-zinc-400">
              Jika diisi, tanggal lahir menjadi acuan umur otomatis. Hapus
              tanggal lahir untuk kembali memakai umur manual.
            </p>
          </div>
        </div>
      </section>

      {/* PERINGATAN BIAYA */}
      {calculation.limit > 0 && !calculation.error && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-6">
          <div className="text-sm font-semibold text-amber-900">
            BIAYA STANDAR KETENTUAN, BELUM TERMASUK PROMO
          </div>

          <div className="mt-1 text-xs text-amber-700">
            Biaya promo dapat berbeda dari biaya standar yang ditampilkan.
          </div>
        </section>
      )}

      {/* HASIL PERHITUNGAN */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-zinc-900">
            Hasil Perhitungan
          </h2>
        </div>

        {calculation.error ? (
          <div className="p-4 sm:p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {calculation.error}
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="space-y-1">
              {/* PROVISI */}
              <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3">
                <div className="min-w-0">
                  <div className="text-sm text-zinc-500">Biaya Provisi</div>

                  {calculation.limit > 0 && calculation.rule && (
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {formatPercent(calculation.provisionRate)}
                    </div>
                  )}
                </div>

                <span className="shrink-0 text-sm font-semibold text-zinc-900">
                  {formatRupiah(calculation.provision)}
                </span>
              </div>

              {/* LAYANAN */}
              <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3">
                <div className="min-w-0">
                  <div className="text-sm text-zinc-500">Biaya Layanan</div>

                  {calculation.limit > 0 && calculation.serviceFeeRate > 0 && (
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {formatPercent(calculation.serviceFeeRate)}
                    </div>
                  )}
                </div>

                <span className="shrink-0 text-sm font-semibold text-zinc-900">
                  {formatRupiah(calculation.serviceFee)}
                </span>
              </div>

              {/* NOTARIS */}
              {calculation.limit > 100000000 && (
                <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-500">Biaya Notaris</div>

                    <div className="mt-0.5 text-xs text-zinc-400">
                      Untuk pinjaman di atas Rp100 juta
                    </div>
                  </div>

                  <span className="shrink-0 text-sm font-semibold text-zinc-900">
                    {formatRupiah(calculation.notaryFee)}
                  </span>
                </div>
              )}

              {/* LAINNYA */}
              <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3">
                <span className="text-sm text-zinc-500">Biaya Lainnya</span>

                <span className="shrink-0 text-sm font-semibold text-zinc-900">
                  {formatRupiah(calculation.otherCost)}
                </span>
              </div>

              {/* TOTAL */}
              <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3">
                <span className="text-sm font-medium text-zinc-700">
                  Total Biaya
                </span>

                <span className="shrink-0 text-sm font-bold text-zinc-900">
                  {formatRupiah(calculation.totalFee)}
                </span>
              </div>
            </div>

            {/* TOTAL BIAYA UTAMA */}
            <div className="mt-5 rounded-2xl bg-zinc-900 p-4 text-white sm:p-5">
              <div className="text-xs font-medium text-zinc-400">
                Total Biaya
              </div>

              <div className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                {formatRupiah(calculation.totalFee)}
              </div>
            </div>

            {/* HASIL ASURANSI */}
            <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-white">
              <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-emerald-950">
                    Rekomendasi Asuransi
                  </h3>

                  <p className="mt-0.5 text-xs text-emerald-800">
                    Ditentukan otomatis dari umur dan limit kredit.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {insuranceHasResult ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {insurance.names.map((name) => (
                        <div
                          key={name}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4"
                        >
                          <div className="text-xs font-medium text-emerald-700">
                            Asuransi yang digunakan
                          </div>

                          <div className="mt-1 text-lg font-bold text-emerald-950">
                            {name}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-3 text-xs leading-5 text-zinc-600">
                      {insurance.message}
                    </div>
                  </>
                ) : (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                      insurance.status === "unsupported"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-zinc-200 bg-zinc-50 text-zinc-500"
                    }`}
                  >
                    {insurance.message}
                  </div>
                )}

                {calculatedAge !== null && (
                  <div className="mt-3 text-xs text-zinc-500">
                    Umur yang digunakan:{" "}
                    <span className="font-semibold text-zinc-700">
                      {calculatedAge} tahun
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* KETENTUAN STANDAR BIAYA */}

      <div className="w-full min-w-0 p-3 sm:p-5 md:p-6">
        <div className="w-full overflow-hidden rounded-xl border border-zinc-100">
          <table className="w-full table-fixed text-[11px] sm:text-xs md:text-sm">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[39%]" />
              <col className="w-[23%]" />
              <col className="w-[23%]" />
            </colgroup>

            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-1.5 py-2 text-left font-semibold text-zinc-500 sm:px-2.5 sm:py-3">
                  Produk
                </th>
                <th className="px-1.5 py-2 text-left font-semibold text-zinc-500 sm:px-2.5 sm:py-3">
                  Limit
                </th>
                <th className="px-1.5 py-2 text-left font-semibold text-zinc-500 sm:px-2.5 sm:py-3">
                  Layanan
                </th>
                <th className="px-1.5 py-2 text-left font-semibold text-zinc-500 sm:px-2.5 sm:py-3">
                  Provisi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {STANDARD_TABLE.map((row, index) => (
                <tr
                  key={`${row.product}-${index}`}
                  className="hover:bg-zinc-50"
                >
                  <td className="break-words px-1.5 py-2 font-medium text-zinc-900 sm:px-2.5 sm:py-3">
                    {row.product}
                  </td>

                  <td className="break-words px-1.5 py-2 leading-4 text-zinc-600 sm:px-2.5 sm:py-3 sm:leading-5">
                    {row.limit}
                  </td>

                  <td className="break-words px-1.5 py-2 text-zinc-600 sm:px-2.5 sm:py-3">
                    {row.service}
                  </td>

                  <td className="break-words px-1.5 py-2 text-zinc-600 sm:px-2.5 sm:py-3">
                    {row.provision}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KETENTUAN ASURANSI */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-zinc-900">
            Ketentuan Pemilihan Asuransi
          </h2>

          <p className="mt-0.5 text-xs text-zinc-500">
            Aturan umur diprioritaskan sebelum aturan limit.
          </p>
        </div>

        <div className="space-y-3 p-4 sm:p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-bold text-amber-950">
              Umur di atas 50 tahun
            </div>

            <div className="mt-1 text-sm text-amber-900">
              AMFS + MMS, berapa pun limit pinjaman KUR maupun KUM.
            </div>

            <div className="mt-1 text-xs text-amber-800">
              Aturan ini menjadi prioritas utama.
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm font-bold text-zinc-900">
              Umur 50 tahun atau kurang
            </div>

            <div className="mt-2 space-y-2 text-sm text-zinc-700">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span>Limit di bawah Rp300 juta</span>
                <span className="font-semibold">AII MAGI + SI JITU</span>
              </div>

              <div className="border-t border-zinc-200" />

              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span>Limit Rp300 juta–Rp500 juta</span>
                <span className="font-semibold">AMFS + SI JITU</span>
              </div>
            </div>
          </div>

          <p className="text-xs leading-5 text-zinc-500">
            Untuk debitur berumur 50 tahun atau kurang dengan limit di atas
            Rp500 juta, rekomendasi asuransi tidak ditentukan karena belum ada
            ketentuan yang diberikan.
          </p>
        </div>
      </section>

      {/* RESET */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>
    </div>
  );
}
