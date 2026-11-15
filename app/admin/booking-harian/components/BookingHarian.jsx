"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MessageCircle,
  Pencil,
  Save,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";
import { getNotarisData } from "@/app/admin/notaris/services/notarisSupabase";

const UNITS = [
  { value: "JKK1", label: "Kuamang Kuning 1" },
  { value: "JKK2", label: "Kuamang Kuning 2" },
];

const MKS_BY_UNIT = {
  JKK1: ["Sutrisno", "Efran", "Galih", "Deni"],
  JKK2: ["Andri", "Aris", "Fadil", "Syech"],
};

const PRODUCTS = ["KUR", "KUM", "KPP", "KSM"];
const INSURANCES = ["Askrindo", "Jamkrindo"];
const LIFE_INSURANCES = ["MAGI", "AMFS"];

const NOTARIS_LIMIT = 100000000;

const EMPTY_FORM = {
  unit: "JKK1",
  debtorName: "",
  applicationNo: "",
  limit: "",
  product: "KUR",
  mksName: "",
  insurance: "Askrindo",
  lifeInsurance: "",
  notarisName: "",
};

const unitLabel = (value) => UNITS.find((u) => u.value === value)?.label || "";

const digits = (value) => String(value ?? "").replace(/\D/g, "");

// Mengubah nama menjadi Title Case.
const titleCase = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(
      /(^|[\s'-])([a-zà-öø-ÿ])/g,
      (_, separator, letter) => separator + letter.toUpperCase(),
    );

const limitInput = (value) =>
  digits(value)
    ? new Intl.NumberFormat("id-ID").format(Number(digits(value)))
    : "";

const rupiah = (value) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(Number(digits(value)) || 0)}`;

const juta = (value) =>
  `${((Number(digits(value)) || 0) / 1000000).toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  })} JT`;

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function BookingHarian({ bookings = [], setBookings }) {
  const bookingRows = Array.isArray(bookings) ? bookings : [];

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const [notarisList, setNotarisList] = useState([]);
  const [loadingNotaris, setLoadingNotaris] = useState(true);
  const [notarisError, setNotarisError] = useState("");

  const today = useMemo(() => {
    const d = new Date();

    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}/${d.getFullYear()}`;
  }, []);

  const availableMks = MKS_BY_UNIT[form.unit] || [];

  const numericLimit = Number(digits(form.limit)) || 0;
  const needsNotaris = numericLimit > NOTARIS_LIMIT;

  const totalLimit = bookingRows.reduce(
    (sum, b) => sum + (Number(digits(b.limit)) || 0),
    0,
  );

  // Ambil data Notaris/PPAT dari Master Data.
  useEffect(() => {
    let active = true;

    async function loadNotaris() {
      try {
        setLoadingNotaris(true);
        setNotarisError("");

        const data = await getNotarisData();

        if (!active) return;

        const sorted = [...(data || [])].sort((a, b) =>
          String(a.nama_notaris || "").localeCompare(
            String(b.nama_notaris || ""),
            "id",
            { sensitivity: "base" },
          ),
        );

        setNotarisList(sorted);
      } catch (error) {
        console.error("Gagal mengambil data Notaris/PPAT:", error);

        if (active) {
          setNotarisError(
            error?.message || "Gagal mengambil data Notaris/PPAT.",
          );
        }
      } finally {
        if (active) setLoadingNotaris(false);
      }
    }

    loadNotaris();

    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  }

  function submit(event) {
    event.preventDefault();

    if (!form.debtorName.trim()) {
      return alert("Nama debitur wajib diisi.");
    }

    if (!form.mksName) {
      return alert("Silakan pilih nama MKS.");
    }

    if (!(Number(digits(form.limit)) > 0)) {
      return alert("Limit pinjaman wajib diisi.");
    }

    if (form.product === "KUR" && !form.insurance) {
      return alert("Silakan pilih asuransi KUR.");
    }

    if (needsNotaris && !form.notarisName) {
      return alert("Silakan pilih nama Notaris/PPAT.");
    }

    const data = {
      unit: form.unit,
      debtorName: form.debtorName.trim(),
      applicationNo: form.applicationNo.trim().toUpperCase(),
      microUnit: unitLabel(form.unit),
      limit: digits(form.limit),
      product: form.product,
      mksName: form.mksName,

      // Asuransi KUR hanya untuk produk KUR.
      insurance: form.product === "KUR" ? form.insurance : "",

      // Asuransi jiwa opsional untuk semua produk dan limit.
      lifeInsurance: form.lifeInsurance || "",

      // Notaris wajib jika limit lebih dari Rp100 juta.
      notarisName: needsNotaris ? form.notarisName : "",
    };

    if (editingId) {
      setBookings((current) =>
        current.map((b) => (b.id === editingId ? { ...b, ...data } : b)),
      );
    } else {
      setBookings((current) => [...current, { id: id(), ...data }]);
    }

    resetForm();
  }

  function edit(booking) {
    setEditingId(booking.id);

    setForm({
      ...EMPTY_FORM,
      ...booking,
      applicationNo: (booking.applicationNo || "").toUpperCase(),
      limit: limitInput(booking.limit),
      insurance:
        booking.product === "KUR" ? booking.insurance || "Askrindo" : "",
      lifeInsurance: booking.lifeInsurance || "",
      notarisName: booking.notarisName || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(bookingId) {
    if (!window.confirm("Apakah booking ini benar-benar ingin dihapus?")) {
      return;
    }

    setBookings((current) => current.filter((b) => b.id !== bookingId));

    if (editingId === bookingId) {
      resetForm();
    }
  }

  // Bagikan booking berdasarkan unit.
  function share(unitValue) {
    const unit = UNITS.find((u) => u.value === unitValue);
    if (!unit) return;

    const rows = bookingRows.filter((b) => b.unit === unitValue);

    const lines = [
      `RENCANA BOOKING ${unit.label.toUpperCase()}`,
      `Tanggal: ${today}`,
      "",
    ];

    if (!rows.length) {
      lines.push("Belum ada rencana booking.");
    } else {
      rows.forEach((b, index) => {
        // Nama debitur otomatis menjadi Title Case.
        let line = `${index + 1}. ${titleCase(b.debtorName)} / ${juta(
          b.limit,
        )} / ${b.product} / ${b.mksName}`;

        // Tampilkan nilai asuransi saja, tanpa label.
        if (b.product === "KUR" && b.insurance) {
          line += ` / ${b.insurance}`;
        }

        if (b.lifeInsurance) {
          line += ` / ${b.lifeInsurance}`;
        }

        // Tampilkan nama notaris saja, tanpa label.
        if (Number(digits(b.limit)) > NOTARIS_LIMIT && b.notarisName) {
          line += ` / ${b.notarisName}`;
        }

        lines.push(line);
      });

      const total = rows.reduce(
        (sum, b) => sum + (Number(digits(b.limit)) || 0),
        0,
      );

      lines.push("");
      lines.push(`Total Booking: ${rows.length}`);
      lines.push(`Total Limit: ${rupiah(total)}, Terima Kasih.`);
    }

    // Untuk kondisi tidak ada booking.
    if (!rows.length) {
      lines.push("", "Terima Kasih.");
    }

    const url = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;

    setShowShareOptions(false);

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            Laporan Booking Harian
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Rencana Booking {today}</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowShareOptions((value) => !value)}
            type="button"
            aria-expanded={showShareOptions}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white transition hover:bg-[#20bd5a] sm:w-auto"
          >
            <MessageCircle className="h-4 w-4" />
            Bagikan Rencana Booking
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showShareOptions ? "rotate-180" : ""
              }`}
            />
          </button>

          {showShareOptions && (
            <>
              <button
                type="button"
                aria-label="Tutup pilihan unit"
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setShowShareOptions(false)}
              />

              <div className="absolute right-0 z-40 mt-2 w-full min-w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white p-2 shadow-lg sm:w-64">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Pilih unit yang dibagikan
                </p>

                {UNITS.map((unit) => {
                  const count = bookingRows.filter(
                    (b) => b.unit === unit.value,
                  ).length;

                  return (
                    <button
                      key={unit.value}
                      type="button"
                      onClick={() => share(unit.value)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition hover:bg-zinc-50 active:bg-zinc-100"
                    >
                      <span>
                        <span className="block font-semibold text-zinc-900">
                          {unit.value === "JKK1" ? "JKK 1" : "JKK 2"}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {unit.label}
                        </span>
                      </span>

                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                        {count} Booking
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-100 bg-white p-4">
          <p className="text-xs text-zinc-500">Total Booking</p>
          <p className="mt-1 text-xl font-bold">{bookingRows.length}</p>
        </div>

        <div className="min-w-0 rounded-xl border border-zinc-100 bg-white p-4">
          <p className="text-xs text-zinc-500">Total Limit</p>
          <p className="mt-1 break-words text-lg font-bold">
            {rupiah(totalLimit)}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold">
              {editingId ? "Edit Booking" : "Input Booking"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Booking tersimpan untuk hari ini.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"
            >
              <X className="h-4 w-4" />
              Batal
            </button>
          )}
        </div>

        <form
          onSubmit={submit}
          className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-6"
        >
          <Field label="Unit Kuamang Kuning">
            <select
              value={form.unit}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  unit: e.target.value,
                  mksName: "",
                }))
              }
              className={inputClass}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nama Debitur">
            <input
              required
              value={form.debtorName}
              onChange={(e) =>
                setForm((f) => ({ ...f, debtorName: e.target.value }))
              }
              placeholder="Nama lengkap debitur"
              className={inputClass}
            />
          </Field>

          <Field label="Limit Pinjaman">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-zinc-400">
                Rp
              </span>

              <input
                required
                inputMode="numeric"
                value={form.limit}
                onChange={(e) => {
                  const nextLimit = limitInput(e.target.value);
                  const nextNumericLimit = Number(digits(nextLimit)) || 0;

                  setForm((f) => ({
                    ...f,
                    limit: nextLimit,
                    notarisName:
                      nextNumericLimit > NOTARIS_LIMIT ? f.notarisName : "",
                  }));
                }}
                placeholder="500.000.000"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          {needsNotaris && (
            <Field label="Nama Notaris/PPAT">
              <select
                required
                value={form.notarisName}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    notarisName: e.target.value,
                  }))
                }
                disabled={loadingNotaris || notarisList.length === 0}
                className={inputClass}
              >
                <option value="">
                  {loadingNotaris
                    ? "Memuat data Notaris/PPAT..."
                    : notarisList.length === 0
                      ? "Data Notaris/PPAT tidak tersedia"
                      : "Pilih Nama Notaris/PPAT"}
                </option>

                {notarisList.map((notaris) => (
                  <option key={notaris.id} value={notaris.nama_notaris}>
                    {notaris.nama_notaris}
                  </option>
                ))}
              </select>

              {notarisError && (
                <p className="mt-1 text-xs text-red-600">{notarisError}</p>
              )}

              {!loadingNotaris && !notarisError && notarisList.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  Silakan periksa Master Data Notaris/PPAT.
                </p>
              )}
            </Field>
          )}

          <Field label="Produk">
            <select
              value={form.product}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  product: e.target.value,
                  insurance:
                    e.target.value === "KUR" ? f.insurance || "Askrindo" : "",
                }))
              }
              className={inputClass}
            >
              {PRODUCTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>

          {form.product === "KUR" && (
            <Field label="Asuransi KUR">
              <select
                required
                value={form.insurance}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    insurance: e.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="">Pilih Asuransi KUR</option>
                {INSURANCES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Nama MKS">
            <select
              required
              value={form.mksName}
              onChange={(e) =>
                setForm((f) => ({ ...f, mksName: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">Pilih Nama MKS</option>
              {availableMks.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>

          <Field label="Nomor Aplikasi">
            <input
              value={form.applicationNo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  applicationNo: e.target.value.toUpperCase(),
                }))
              }
              placeholder="Nomor aplikasi"
              className={inputClass}
            />
          </Field>

          <Field label="Unit Mikro">
            <input
              readOnly
              value={unitLabel(form.unit)}
              className={`${inputClass} bg-zinc-50`}
            />
          </Field>

          {/* Asuransi jiwa opsional untuk semua produk dan semua limit. */}
          <Field label="Asuransi Jiwa (Opsional)">
            <select
              value={form.lifeInsurance}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  lifeInsurance: e.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="">Tidak dipilih</option>
              {LIFE_INSURANCES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:col-span-2 lg:col-span-3 sm:flex-row sm:justify-end">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="h-10 rounded-xl border px-4 text-sm"
              >
                Batal Edit
              </button>
            )}

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white"
            >
              <Save className="h-4 w-4" />
              {editingId ? "Simpan Perubahan" : "Simpan Booking"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
        <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
          <h2 className="font-semibold">Daftar Booking Hari Ini</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Gunakan tombol Generate pada bagian Laporan Aktivasi untuk menyusun
            pesan.
          </p>
        </div>

        {UNITS.map((unit) => {
          const rows = bookingRows.filter((b) => b.unit === unit.value);

          return (
            <div
              key={unit.value}
              className="border-b border-zinc-100 p-3 last:border-0 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{unit.label}</h3>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs">
                  {rows.length} Booking
                </span>
              </div>

              {!rows.length ? (
                <div className="rounded-xl border border-dashed border-zinc-200 p-5 text-center text-sm text-zinc-400">
                  Belum ada booking.
                </div>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {rows.map((b, i) => (
                      <BookingCard
                        key={b.id}
                        booking={b}
                        index={i}
                        onEdit={edit}
                        onDelete={remove}
                      />
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto rounded-xl border border-zinc-100 md:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                        <tr>
                          {[
                            "No.",
                            "Nama Debitur",
                            "Nomor Aplikasi",
                            "Unit Mikro",
                            "Limit",
                            "Produk",
                            "Asuransi KUR",
                            "Asuransi Jiwa",
                            "MKS",
                            "Notaris/PPAT",
                            "Aksi",
                          ].map((h) => (
                            <th key={h} className="whitespace-nowrap px-3 py-3">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {rows.map((b, i) => (
                          <tr key={b.id} className="align-top">
                            <td className="px-3 py-3">{i + 1}</td>

                            <td className="min-w-40 px-3 py-3 font-medium">
                              {b.debtorName}
                            </td>

                            <td className="min-w-40 break-all px-3 py-3 text-xs">
                              {b.applicationNo || "-"}
                            </td>

                            <td className="px-3 py-3">{unitLabel(b.unit)}</td>

                            <td className="whitespace-nowrap px-3 py-3 font-semibold">
                              {rupiah(b.limit)}
                            </td>

                            <td className="px-3 py-3">{b.product}</td>

                            <td className="px-3 py-3">
                              {b.product === "KUR" ? b.insurance || "-" : "-"}
                            </td>

                            <td className="px-3 py-3">
                              {b.lifeInsurance || "-"}
                            </td>

                            <td className="px-3 py-3">{b.mksName}</td>

                            <td className="min-w-36 px-3 py-3">
                              {Number(digits(b.limit)) > NOTARIS_LIMIT
                                ? b.notarisName || "-"
                                : "-"}
                            </td>

                            <td className="px-3 py-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={() =>
                                    window.dispatchEvent(
                                      new CustomEvent(
                                        "josjis-generate-activation",
                                        { detail: b.id },
                                      ),
                                    )
                                  }
                                  type="button"
                                  className="rounded-lg bg-zinc-900 px-2 py-1.5 text-xs text-white"
                                >
                                  Generate
                                </button>

                                <button
                                  onClick={() => edit(b)}
                                  type="button"
                                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs hover:bg-zinc-50"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => remove(b.id)}
                                  type="button"
                                  className="rounded-lg border border-red-100/80 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </section>
    </section>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-zinc-200/80 bg-white px-3 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function BookingCard({ booking: b, index, onEdit, onDelete }) {
  const needsNotaris = Number(digits(b.limit)) > NOTARIS_LIMIT;

  return (
    <article className="rounded-xl border border-zinc-100 p-3">
      <div className="flex gap-2">
        <span className="text-xs text-zinc-400">{index + 1}.</span>

        <div className="min-w-0 flex-1">
          <h4 className="break-words text-sm font-semibold">{b.debtorName}</h4>

          <p className="mt-1 break-all text-xs text-zinc-500">
            No. Aplikasi: {b.applicationNo || "-"}
          </p>

          <p className="mt-2 font-bold">{rupiah(b.limit)}</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
              {b.product}
            </span>

            {b.product === "KUR" && b.insurance && (
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs">
                KUR: {b.insurance}
              </span>
            )}

            {b.lifeInsurance && (
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs">
                Jiwa: {b.lifeInsurance}
              </span>
            )}

            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs">
              MKS: {b.mksName}
            </span>
          </div>

          {needsNotaris && (
            <p className="mt-2 break-words text-xs text-zinc-600">
              Notaris/PPAT:{" "}
              <span className="font-semibold">{b.notarisName || "-"}</span>
            </p>
          )}

          <p className="mt-2 text-xs text-zinc-500">
            Unit Mikro: {unitLabel(b.unit)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("josjis-generate-activation", {
                detail: b.id,
              }),
            )
          }
          className="rounded-lg bg-zinc-900 px-1 py-2 text-xs font-semibold text-white"
        >
          Generate
        </button>

        <button
          type="button"
          onClick={() => onEdit(b)}
          className="rounded-lg border border-zinc-200 px-1 py-2 text-xs hover:bg-zinc-50"
        >
          <Pencil className="mr-1 inline h-3 w-3" />
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete(b.id)}
          className="rounded-lg border border-red-100/80 px-1 py-2 text-xs text-red-600 hover:bg-red-50"
        >
          <Trash2 className="mr-1 inline h-3 w-3" />
          Hapus
        </button>
      </div>
    </article>
  );
}
