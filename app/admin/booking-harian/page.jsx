/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";

import { MessageCircle, Pencil, Save, Trash2, X } from "lucide-react";

const STORAGE_KEY = "josjis_booking_harian";

const UNITS = [
  { value: "JKK1", label: "JKK 1" },
  { value: "JKK2", label: "JKK 2" },
];

const SGP_BY_UNIT = {
  JKK1: ["Sutrisno", "Efran", "Galih", "Deni"],
  JKK2: ["Andri", "Aris", "Fadil", "Syech"],
};

const PRODUCTS = ["KUR", "KUM", "KPP", "KSM"];

const EMPTY_FORM = {
  unit: "JKK1",
  sgpName: "",
  limit: "",
  product: "KUR",
};

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateIndonesia(dateKey) {
  const [year, month, day] = dateKey.split("-");

  return `${day}/${month}/${year}`;
}

function formatRupiah(value) {
  const numericValue = Number(String(value).replace(/\D/g, ""));

  if (!numericValue) return "Rp 0";

  return `Rp ${new Intl.NumberFormat("id-ID").format(numericValue)}`;
}

/**
 * Format nominal khusus untuk pesan WhatsApp.
 *
 * Contoh:
 * 130000000 -> 130 JT
 * 125000000 -> 125 JT
 * 75000000  -> 75 JT
 * 15000000  -> 15 JT
 */
function formatWhatsappNominal(value) {
  const numericValue = Number(String(value).replace(/\D/g, ""));

  if (!numericValue) {
    return "0";
  }

  if (numericValue >= 1000000) {
    const juta = numericValue / 1000000;

    if (Number.isInteger(juta)) {
      return `${juta} JT`;
    }

    return `${juta.toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} JT`;
  }

  return new Intl.NumberFormat("id-ID").format(numericValue);
}

function formatLimitInput(value) {
  const numericValue = String(value).replace(/\D/g, "");

  if (!numericValue) return "";

  return new Intl.NumberFormat("id-ID").format(Number(numericValue));
}

function getNumericLimit(value) {
  return String(value).replace(/\D/g, "");
}

function loadTodayBookings() {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!parsed || parsed.date !== getTodayKey()) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    return Array.isArray(parsed.bookings) ? parsed.bookings : [];
  } catch {
    return [];
  }
}

export default function BookingHarianPage() {
  const todayKey = useMemo(() => getTodayKey(), []);

  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const availableSgp = SGP_BY_UNIT[form.unit] || [];

  useEffect(() => {
    setBookings(loadTodayBookings());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        date: todayKey,
        bookings,
      }),
    );
  }, [bookings, loaded, todayKey]);

  function handleUnitChange(event) {
    const selectedUnit = event.target.value;

    setForm((current) => ({
      ...current,
      unit: selectedUnit,
      sgpName: "",
    }));
  }

  function handleLimitChange(event) {
    const value = event.target.value;

    setForm((current) => ({
      ...current,
      limit: formatLimitInput(value),
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.sgpName) {
      alert("Silakan pilih Nama SGP.");
      return;
    }

    if (!form.limit) {
      alert("Limit pinjaman wajib diisi.");
      return;
    }

    if (!form.product) {
      alert("Silakan pilih produk.");
      return;
    }

    const bookingData = {
      unit: form.unit,
      sgpName: form.sgpName,
      limit: getNumericLimit(form.limit),
      product: form.product,
    };

    if (editingId) {
      setBookings((current) =>
        current.map((booking) =>
          booking.id === editingId
            ? {
                ...booking,
                ...bookingData,
              }
            : booking,
        ),
      );
    } else {
      setBookings((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...bookingData,
        },
      ]);
    }

    resetForm();
  }

  function handleEdit(booking) {
    setEditingId(booking.id);

    setForm({
      unit: booking.unit,
      sgpName: booking.sgpName,
      limit: formatLimitInput(booking.limit),
      product: booking.product,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleDelete(id) {
    const confirmed = window.confirm(
      "Apakah booking ini benar-benar ingin dihapus?",
    );

    if (!confirmed) return;

    setBookings((current) => current.filter((booking) => booking.id !== id));

    if (editingId === id) {
      resetForm();
    }
  }

  function getBookingsByUnit(unit) {
    return bookings.filter((booking) => booking.unit === unit);
  }

  function buildWhatsappMessage() {
    const lines = [`*RENCANA BOOKING ${formatDateIndonesia(todayKey)}*`, ""];

    UNITS.forEach((unit) => {
      const unitBookings = getBookingsByUnit(unit.value);

      lines.push(`*${unit.label}*`);

      if (unitBookings.length === 0) {
        lines.push("-");
      } else {
        unitBookings.forEach((booking, index) => {
          lines.push(
            `${index + 1}. ${booking.sgpName} - ${formatWhatsappNominal(
              booking.limit,
            )} - ${booking.product}`,
          );
        });
      }

      lines.push("");
    });

    lines.push("Terima Kasih");

    return lines.join("\n");
  }

  function handleWhatsappShare() {
    const message = buildWhatsappMessage();

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Laporan Booking Harian
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Rencana Booking {formatDateIndonesia(todayKey)}
            </p>
          </div>

          {/* WHATSAPP SHARE */}
          <button
            type="button"
            onClick={handleWhatsappShare}
            className="inline-flex h-11 items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20bd5a] active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5 fill-current" />
            Bagikan via WhatsApp
          </button>
        </div>

        {/* INPUT BOOKING */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  {editingId ? "Edit Booking" : "Input Booking"}
                </h2>

                <p className="mt-0.5 text-xs text-zinc-500">
                  Isi data booking untuk rencana hari ini.
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  <X className="h-4 w-4" />
                  Batal Edit
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* UNIT */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Unit
                </label>

                <select
                  value={form.unit}
                  onChange={handleUnitChange}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  required
                >
                  {UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* NAMA SGP */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Nama SGP
                </label>

                <select
                  value={form.sgpName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sgpName: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  required
                >
                  <option value="">Pilih Nama SGP</option>

                  {availableSgp.map((sgpName) => (
                    <option key={sgpName} value={sgpName}>
                      {sgpName}
                    </option>
                  ))}
                </select>
              </div>

              {/* LIMIT */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Limit Pinjaman
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    Rp
                  </span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.limit}
                    onChange={handleLimitChange}
                    placeholder="0"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                    required
                  />
                </div>
              </div>

              {/* PRODUK */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Produk
                </label>

                <select
                  value={form.product}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      product: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  required
                >
                  {PRODUCTS.map((product) => (
                    <option key={product} value={product}>
                      {product}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98]"
              >
                {editingId ? (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Perubahan
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Booking
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* LAPORAN */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-zinc-900">
              Rencana Booking
            </h2>

            <p className="mt-0.5 text-xs text-zinc-500">
              Data booking JKK 1 dan JKK 2 untuk hari ini.
            </p>
          </div>

          <div className="divide-y divide-zinc-100">
            {UNITS.map((unit) => {
              const unitBookings = getBookingsByUnit(unit.value);

              return (
                <div key={unit.value} className="p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {unit.label}
                    </h3>

                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                      {unitBookings.length} Booking
                    </span>
                  </div>

                  {unitBookings.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5 text-center text-sm text-zinc-400">
                      -
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-zinc-200">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[650px] text-sm">
                          <thead className="bg-zinc-50">
                            <tr className="border-b border-zinc-200">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                No
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Nama SGP
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Limit Pinjaman
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Produk
                              </th>

                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Aksi
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-zinc-100 bg-white">
                            {unitBookings.map((booking, index) => (
                              <tr
                                key={booking.id}
                                className="transition hover:bg-zinc-50/70"
                              >
                                <td className="px-4 py-3 text-zinc-500">
                                  {index + 1}
                                </td>

                                <td className="px-4 py-3 font-medium text-zinc-900">
                                  {booking.sgpName}
                                </td>

                                <td className="px-4 py-3 text-zinc-700">
                                  {formatRupiah(booking.limit)}
                                </td>

                                <td className="px-4 py-3">
                                  <span className="inline-flex rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                                    {booking.product}
                                  </span>
                                </td>

                                <td className="px-4 py-3">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(booking)}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDelete(booking.id)}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-100 px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Hapus
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
