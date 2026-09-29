"use client";

import { CalendarDays, Info, Truck } from "lucide-react";

import PkSection from "@/components/pk/shared/PkSection";

function formatDate(date) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getNextOrderSchedule(now = new Date()) {
  const current = new Date(now);

  current.setSeconds(0, 0);

  const day = current.getDay();
  const hour = current.getHours();

  /*
    Jadwal order:
    Selasa  sebelum 10.00
    Kamis   sebelum 10.00

    Jika sudah melewati cutoff:
    Selasa -> Kamis
    Kamis  -> Selasa berikutnya

    Senin -> Selasa
    Rabu  -> Kamis
    Jumat/Sabtu/Minggu -> Selasa berikutnya
  */

  const schedule = new Date(current);

  if (day === 2) {
    // Selasa
    if (hour < 10) {
      return schedule;
    }

    schedule.setDate(schedule.getDate() + 2);

    return schedule;
  }

  if (day === 4) {
    // Kamis
    if (hour < 10) {
      return schedule;
    }

    schedule.setDate(schedule.getDate() + 5);

    return schedule;
  }

  if (day === 1) {
    // Senin -> Selasa
    schedule.setDate(schedule.getDate() + 1);

    return schedule;
  }

  if (day === 3) {
    // Rabu -> Kamis
    schedule.setDate(schedule.getDate() + 1);

    return schedule;
  }

  if (day === 5) {
    // Jumat -> Selasa
    schedule.setDate(schedule.getDate() + 4);

    return schedule;
  }

  if (day === 6) {
    // Sabtu -> Selasa
    schedule.setDate(schedule.getDate() + 3);

    return schedule;
  }

  // Minggu -> Selasa
  schedule.setDate(schedule.getDate() + 2);

  return schedule;
}

function getOrderDescription(now = new Date()) {
  const schedule = getNextOrderSchedule(now);

  return {
    date: schedule,
    label: formatDate(schedule),
  };
}

export default function PkOrderSection({ pk, locked }) {
  const collaterals = Array.isArray(pk?.collaterals) ? pk.collaterals : [];

  const orderRequired = collaterals.filter(
    (item) => item?.certificateLocation === "PERLU_ORDER_CO",
  );

  const hasOrderRequired = orderRequired.length > 0;

  const schedule = getOrderDescription();

  return (
    <PkSection
      title="Order Agunan"
      description="Informasi agunan yang memerlukan proses order dari pinjaman sebelumnya."
      locked={locked}
    >
      {!hasOrderRequired ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5">
          <div className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 shrink-0 text-zinc-400" />

            <div>
              <p className="text-sm font-medium text-zinc-700">
                Tidak ada agunan yang perlu di-order.
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Jika lokasi sertifikat diatur menjadi Perlu di-order dari CO,
                agunan akan otomatis masuk ke daftar Order Agunan.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Truck size={19} className="mt-0.5 shrink-0 text-amber-600" />

              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Agunan perlu di-order
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Agunan untuk pinjaman ini perlu di-order dari pinjaman
                  sebelumnya debitur a.n.{" "}
                  <strong>{pk?.debtorName || "-"}</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Unit / Cluster
              </p>

              <p className="mt-1 text-sm font-semibold text-zinc-900">
                {pk?.unit || "-"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Jumlah Agunan
              </p>

              <p className="mt-1 text-sm font-semibold text-zinc-900">
                {orderRequired.length} agunan
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-start gap-3">
              <CalendarDays
                size={18}
                className="mt-0.5 shrink-0 text-zinc-500"
              />

              <div>
                <p className="text-xs font-medium text-zinc-500">
                  Jadwal order terdekat
                </p>

                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {schedule.label}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Order dilakukan sebelum pukul <strong>10.00</strong>.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">
              Agunan yang perlu di-order
            </p>

            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <div className="divide-y divide-zinc-100">
                {orderRequired.map((collateral, index) => (
                  <div
                    key={collateral.id || `order-${index}`}
                    className="flex flex-col gap-2 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {collateral.type || "Agunan"}
                      </p>

                      <p className="mt-0.5 text-xs text-zinc-500">
                        Nomor: {collateral.number || "-"}
                      </p>

                      <p className="text-xs text-zinc-500">
                        Atas Nama: {collateral.owner || "-"}
                      </p>
                    </div>

                    <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                      Perlu Order
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-900">Informasi</p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              Data agunan ini otomatis masuk ke daftar Order Agunan berdasarkan
              unit / cluster. Nomor Order Agunan tidak perlu diinput pada detail
              PK.
            </p>
          </div>
        </div>
      )}
    </PkSection>
  );
}
