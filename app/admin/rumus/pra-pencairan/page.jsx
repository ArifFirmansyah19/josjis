"use client";

import { useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";

import { Calculator, RotateCcw } from "lucide-react";

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

  if (!numeric) {
    return "";
  }

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

export default function PraPencairanPage() {
  const [loanType, setLoanType] = useState("KUM");
  const [limitInput, setLimitInput] = useState("");
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);

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

    /*
     * Biaya notaris hanya ditampilkan
     * jika pinjaman di atas Rp100 juta.
     *
     * Untuk saat ini nominal tetap Rp0.
     */
    const notaryFee = limit > 100000000 ? 0 : 0;

    /*
     * Biaya lainnya saat ini tetap Rp0.
     */
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

  function handleLimitChange(event) {
    setLimitInput(formatInputNominal(event.target.value));
  }

  function handleReset() {
    setLoanType("KUM");
    setLimitInput("");
    setInsuranceEnabled(false);
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* =====================================================
            HEADER
        ===================================================== */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Calculator className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
              Kalkulator Pra Pencairan
            </h1>

            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
              Hitung biaya layanan, provisi, dan total biaya pencairan.
            </p>
          </div>
        </div>

        {/* =====================================================
            INPUT
        ===================================================== */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-zinc-900">
              Input Pencairan
            </h2>

            <p className="mt-0.5 text-xs text-zinc-500">
              Pilih jenis pinjaman dan masukkan limit kredit.
            </p>
          </div>

          <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
            {/* JENIS PINJAMAN */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Jenis Pinjaman
              </label>

              <select
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
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Limit Kredit
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                  Rp
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={limitInput}
                  onChange={handleLimitChange}
                  placeholder="0"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                />
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            WARNING
        ===================================================== */}
        {calculation.limit > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-6">
            <div className="text-sm font-semibold text-amber-900">
              BIAYA STANDAR KETENTUAN SEKARANG, BUKAN TERMASUK PROMO
            </div>

            <div className="mt-1 text-xs text-amber-700">
              Harga promo bisa berbeda.
            </div>
          </section>
        )}

        {/* =====================================================
            HASIL
        ===================================================== */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
                {/* BIAYA PROVISI */}
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

                {/* BIAYA LAYANAN */}
                <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-500">Biaya Layanan</div>

                    {calculation.limit > 0 &&
                      calculation.serviceFeeRate > 0 && (
                        <div className="mt-0.5 text-xs text-zinc-400">
                          {formatPercent(calculation.serviceFeeRate)}
                        </div>
                      )}
                  </div>

                  <span className="shrink-0 text-sm font-semibold text-zinc-900">
                    {formatRupiah(calculation.serviceFee)}
                  </span>
                </div>

                {/* BIAYA NOTARIS */}
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

                {/* BIAYA LAINNYA */}
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

              {/* ASURANSI */}
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <input
                  id="insurance"
                  type="checkbox"
                  checked={insuranceEnabled}
                  onChange={(event) =>
                    setInsuranceEnabled(event.target.checked)
                  }
                  className="h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-200"
                />

                <label
                  htmlFor="insurance"
                  className="cursor-pointer text-sm font-medium text-zinc-700"
                >
                  Asuransi
                </label>
              </div>

              <div className="mt-2 px-1 text-xs text-zinc-400">
                Perhitungan asuransi akan terhubung ke kalkulator Excel.
              </div>
            </div>
          )}
        </section>

        {/* =====================================================
            KETENTUAN STANDAR
        ===================================================== */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-zinc-900">
              Ketentuan Standar
            </h2>

            <p className="mt-0.5 text-xs text-zinc-500">
              Ketentuan biaya berdasarkan jenis pinjaman dan limit kredit.
            </p>
          </div>

          {/* RESPONSIVE TABLE */}
          <div className="p-4 sm:p-6">
            <div className="overflow-hidden rounded-xl border border-zinc-100">
              <table className="w-full table-fixed text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="w-[16%] px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:w-[15%] sm:px-3 sm:text-xs">
                      Produk
                    </th>

                    <th className="w-[38%] px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:w-[40%] sm:px-3 sm:text-xs">
                      Limit
                    </th>

                    <th className="w-[23%] px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:w-[22%] sm:px-3 sm:text-xs">
                      Layanan
                    </th>

                    <th className="w-[23%] px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:w-[23%] sm:px-3 sm:text-xs">
                      Provisi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {/* KUM 1 */}
                  <tr>
                    <td className="px-2 py-3 font-medium text-zinc-900 sm:px-3">
                      KUM
                    </td>

                    <td className="break-words px-2 py-3 leading-5 text-zinc-600 sm:px-3">
                      Rp1 - Rp100 juta
                    </td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">0,50%</td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">0,50%</td>
                  </tr>

                  {/* KUM 2 */}
                  <tr>
                    <td className="px-2 py-3 font-medium text-zinc-900 sm:px-3">
                      KUM
                    </td>

                    <td className="break-words px-2 py-3 leading-5 text-zinc-600 sm:px-3">
                      &gt;Rp100 - Rp250 juta
                    </td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">0,75%</td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">0,50%</td>
                  </tr>

                  {/* KUM 3 */}
                  <tr>
                    <td className="px-2 py-3 font-medium text-zinc-900 sm:px-3">
                      KUM
                    </td>

                    <td className="break-words px-2 py-3 leading-5 text-zinc-600 sm:px-3">
                      &gt;Rp250 - Rp500 juta
                    </td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">1,00%</td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">0,50%</td>
                  </tr>

                  {/* KUR 1 */}
                  <tr>
                    <td className="px-2 py-3 font-medium text-zinc-900 sm:px-3">
                      KUR
                    </td>

                    <td className="break-words px-2 py-3 leading-5 text-zinc-600 sm:px-3">
                      s.d. Rp10 juta
                    </td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">Rp1</td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">Rp0</td>
                  </tr>

                  {/* KUR 2 */}
                  <tr>
                    <td className="px-2 py-3 font-medium text-zinc-900 sm:px-3">
                      KUR
                    </td>

                    <td className="break-words px-2 py-3 leading-5 text-zinc-600 sm:px-3">
                      &gt;Rp10 - Rp100 juta
                    </td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">2,00%</td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">Rp0</td>
                  </tr>

                  {/* KUR 3 */}
                  <tr>
                    <td className="px-2 py-3 font-medium text-zinc-900 sm:px-3">
                      KUR
                    </td>

                    <td className="break-words px-2 py-3 leading-5 text-zinc-600 sm:px-3">
                      &gt;Rp100 - Rp500 juta
                    </td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">1,90%</td>

                    <td className="px-2 py-3 text-zinc-600 sm:px-3">Rp0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =====================================================
            RESET
        ===================================================== */}
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
    </DashboardLayout>
  );
}
