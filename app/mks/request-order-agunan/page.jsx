"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock3,
  FileImage,
  History,
  LoaderCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const API_URL = "/api/request-order-agunan";

const STATUS = {
  MENUNGGU_PEMERIKSAAN: {
    label: "Menunggu pemeriksaan",
    color: "bg-amber-100 text-amber-800",
  },
  DITERIMA: {
    label: "Diterima Admin",
    color: "bg-emerald-100 text-emerald-800",
  },
  PERLU_REVISI: {
    label: "Perlu revisi",
    color: "bg-orange-100 text-orange-800",
  },
  DITOLAK: {
    label: "Ditolak",
    color: "bg-red-100 text-red-800",
  },
  DIPROSES: {
    label: "Sedang diproses",
    color: "bg-blue-100 text-blue-800",
  },
  SELESAI: {
    label: "Selesai",
    color: "bg-slate-200 text-slate-700",
  },
};

const ALASAN_OPTIONS = [
  { value: "LUNAS", label: "Lunas" },
  { value: "TOP_UP", label: "Top Up" },
];

const EMPTY_FORM = {
  nama_debitur: "",
  nomor_rekening_pinjaman: "",
  alasan: "LUNAS",
  nomor_notasi: "",
  agunan: "",
  catatan_pengajuan: "",
};

function getStatus(status) {
  return (
    STATUS[String(status || "").toUpperCase()] || {
      label: String(status || "Belum diketahui").replaceAll("_", " "),
      color: "bg-gray-100 text-gray-700",
    }
  );
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function latestMessage(item) {
  const messages = Array.isArray(item?.pesan) ? item.pesan : [];
  if (!messages.length) return null;

  return [...messages].sort((a, b) => {
    return (
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    );
  })[0];
}

function canEditItem(item) {
  if (item?.can_edit !== undefined) return Boolean(item.can_edit);

  return (
    ["MENUNGGU_PEMERIKSAAN", "PERLU_REVISI", "DITOLAK"].includes(
      String(item?.status || "").toUpperCase(),
    ) && !item?.sudah_diproses
  );
}

async function compressImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Pilih file gambar yang valid.");
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Ukuran foto awal maksimal 15 MB.");
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
      img.src = imageUrl;
    });

    const maxDimension = 1800;
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.width, image.height),
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Gagal memproses gambar.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.82;
    let blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );

    while (blob && blob.size > 1.8 * 1024 * 1024 && quality > 0.4) {
      quality -= 0.1;
      blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
    }

    if (!blob) throw new Error("Gagal mengompres foto.");
    if (blob.size > 2 * 1024 * 1024) {
      throw new Error(
        "Foto masih melebihi 2 MB. Silakan gunakan foto dengan resolusi lebih rendah.",
      );
    }

    return new File(
      [blob],
      `${file.name.replace(/\.[^.]+$/, "") || "bukti-bds"}.jpg`,
      { type: "image/jpeg", lastModified: Date.now() },
    );
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

function StatusBadge({ status }) {
  const info = getStatus(status);

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${info.color}`}
    >
      {info.label}
    </span>
  );
}

export default function MKSOrderAgunanPage() {
  const [items, setItems] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("SEMUA");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");
  const [formError, setFormError] = useState("");

  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Gagal memuat pengajuan.");
      }

      setItems(Array.isArray(result.items) ? result.items : []);
      setBundles(Array.isArray(result.bundles) ? result.bundles : []);
    } catch (error) {
      setPageError(error.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const status = String(item.status || "").toUpperCase();

      const matchesFilter =
        filter === "SEMUA" ||
        (filter === "AKTIF" && !["SELESAI", "DIPROSES"].includes(status)) ||
        (filter === "RIWAYAT" && ["SELESAI", "DIPROSES"].includes(status));

      const matchesSearch =
        !keyword ||
        [
          item.nama_debitur,
          item.nomor_rekening_pinjaman,
          item.nomor_notasi,
          item.agunan,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
        );

      return matchesFilter && matchesSearch;
    });
  }, [items, search, filter]);

  const summary = useMemo(() => {
    const count = (status) =>
      items.filter((item) => String(item.status || "").toUpperCase() === status)
        .length;

    return {
      total: items.length,
      menunggu: count("MENUNGGU_PEMERIKSAAN"),
      revisi: count("PERLU_REVISI"),
      diproses: count("DIPROSES"),
    };
  }, [items]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function clearPhoto() {
    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(null);
    setPhotoPreview("");
    setExistingPhotoUrl("");
  }

  async function handlePhoto(file) {
    if (!file) return;

    setFormError("");
    setNotice("");

    try {
      const compressed = await compressImage(file);

      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }

      setPhoto(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
      setExistingPhotoUrl("");
    } catch (error) {
      setFormError(error.message || "Gagal memproses foto.");
    }
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    clearPhoto();
    setFormError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(item) {
    if (!canEditItem(item)) {
      setPageError("Pengajuan ini sudah tidak dapat diubah.");
      return;
    }

    setEditingId(item.id);
    setForm({
      nama_debitur: item.nama_debitur || "",
      nomor_rekening_pinjaman: item.nomor_rekening_pinjaman || "",
      alasan: item.alasan || "LUNAS",
      nomor_notasi: item.nomor_notasi || "",
      agunan: item.agunan || "",
      catatan_pengajuan: "",
    });

    clearPhoto();
    setExistingPhotoUrl(item.bukti_bds_url || "");
    setFormError("");
    setNotice("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    clearPhoto();
    setFormError("");
  }

  async function submitForm(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    if (!form.nama_debitur.trim()) {
      setFormError("Nama debitur wajib diisi.");
      return;
    }

    if (!form.nomor_rekening_pinjaman.trim()) {
      setFormError("Nomor rekening pinjaman wajib diisi.");
      return;
    }

    if (!form.alasan) {
      setFormError("Pilih alasan pengajuan.");
      return;
    }

    if (!editingId && !photo) {
      setFormError("Bukti capture BDS wajib dilampirkan.");
      return;
    }

    setSaving(true);

    try {
      const payload = new FormData();

      payload.set("nama_debitur", form.nama_debitur.trim());
      payload.set(
        "nomor_rekening_pinjaman",
        form.nomor_rekening_pinjaman.trim(),
      );
      payload.set("alasan", form.alasan);
      payload.set("nomor_notasi", form.nomor_notasi.trim());
      payload.set("agunan", form.agunan.trim());
      payload.set("catatan_pengajuan", form.catatan_pengajuan.trim());

      if (photo) {
        payload.set("bukti_bds", photo, photo.name);
      }

      if (editingId) {
        const currentItem = items.find(
          (item) => String(item.id) === String(editingId),
        );

        const currentStatus = String(currentItem?.status || "").toUpperCase();

        const isResubmission = ["PERLU_REVISI", "DITOLAK"].includes(
          currentStatus,
        );

        payload.set("action", isResubmission ? "resubmit" : "update");

        payload.set("id", String(editingId));
      } else {
        payload.set("action", "create");
      }

      const response = await fetch(API_URL, {
        method: "POST",
        body: payload,
        credentials: "same-origin",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Pengajuan gagal disimpan.");
      }

      closeForm();
      setNotice(
        editingId
          ? "Perubahan pengajuan berhasil dikirim."
          : "Pengajuan berhasil dikirim.",
      );

      await loadData();
    } catch (error) {
      setFormError(error.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item) {
    if (!canEditItem(item)) {
      setPageError("Pengajuan ini sudah tidak dapat dihapus.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus pengajuan untuk ${item.nama_debitur || "debitur ini"}?`,
    );

    if (!confirmed) return;

    setPageError("");
    setNotice("");

    try {
      const response = await fetch(API_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: item.id }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Pengajuan gagal dihapus.");
      }

      setNotice("Pengajuan berhasil dihapus.");
      await loadData();
    } catch (error) {
      setPageError(error.message || "Gagal menghapus pengajuan.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-700 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
                <ShieldCheck size={15} />
                Modul Operasional MKS
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Request Order Agunan
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                Ajukan kebutuhan order agunan, lampirkan bukti BDS, dan pantau
                pemeriksaan Admin sampai pengajuan selesai.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-900 shadow-sm transition hover:bg-blue-50"
            >
              <Plus size={18} />
              Buat Pengajuan
            </button>
          </div>
        </section>

        {pageError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <div className="min-w-0 flex-1">{pageError}</div>
            <button
              type="button"
              onClick={() => setPageError("")}
              aria-label="Tutup pesan"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
            <div className="min-w-0 flex-1">{notice}</div>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Tutup pesan"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Total pengajuan",
              value: summary.total,
              icon: FileImage,
              color: "text-blue-700 bg-blue-50",
            },
            {
              label: "Menunggu Admin",
              value: summary.menunggu,
              icon: Clock3,
              color: "text-amber-700 bg-amber-50",
            },
            {
              label: "Perlu revisi",
              value: summary.revisi,
              icon: MessageSquare,
              color: "text-orange-700 bg-orange-50",
            },
            {
              label: "Sudah diproses",
              value: summary.diproses,
              icon: CheckCircle2,
              color: "text-emerald-700 bg-emerald-50",
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}
                >
                  <Icon size={20} />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {card.value}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                  {card.label}
                </div>
              </div>
            );
          })}
        </section>

        {bundles.length > 0 && (
          <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-950">
              <Clock3 size={18} />
              Informasi jadwal bundel
            </div>
            <p className="text-sm leading-6 text-blue-900">
              Pengajuan dikelompokkan berdasarkan unit dan jadwal proses.
              Tenggat pengajuan mengikuti jadwal bundel yang ditetapkan sistem.
              Periksa status setiap pengajuan untuk mengetahui apakah masih
              dapat diubah.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {bundles.slice(0, 4).map((bundle) => (
                <div
                  key={bundle.id}
                  className="rounded-xl border border-blue-100 bg-white p-3"
                >
                  <div className="text-xs text-slate-500">
                    {bundle.jenis_bundel || "Bundel order agunan"}
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {bundle.tanggal_proses
                      ? new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "full",
                          timeZone: "Asia/Jakarta",
                        }).format(new Date(bundle.tanggal_proses))
                      : "Jadwal belum tersedia"}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Status: {String(bundle.status || "-").replaceAll("_", " ")}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Daftar pengajuan
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pantau status, catatan Admin, dan riwayat pengajuan.
                </p>
              </div>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Muat ulang
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama debitur atau nomor rekening..."
                  className={`${inputClass} pl-10`}
                />
              </div>

              <div className="flex rounded-xl bg-slate-100 p-1">
                {[
                  ["SEMUA", "Semua"],
                  ["AKTIF", "Aktif"],
                  ["RIWAYAT", "Riwayat"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                      filter === value
                        ? "bg-white text-blue-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-slate-500">
              <LoaderCircle className="animate-spin" size={30} />
              <p className="text-sm">Memuat pengajuan...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                {filter === "RIWAYAT" ? (
                  <History size={26} />
                ) : (
                  <FileImage size={26} />
                )}
              </div>
              <h3 className="font-bold text-slate-800">Belum ada pengajuan</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                {search
                  ? "Tidak ditemukan pengajuan yang sesuai dengan pencarian."
                  : "Pengajuan yang kamu buat akan muncul di sini."}
              </p>
              {!search && filter !== "RIWAYAT" && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  <Plus size={17} />
                  Buat pengajuan pertama
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const message = latestMessage(item);
                const editable = canEditItem(item);

                return (
                  <article
                    key={item.id}
                    className="p-4 transition hover:bg-slate-50/70 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={item.status} />
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {item.alasan === "TOP_UP"
                              ? "Top Up"
                              : item.alasan || "-"}
                          </span>
                        </div>

                        <h3 className="mt-3 break-words text-lg font-bold text-slate-900">
                          {item.nama_debitur || "Nama debitur belum tersedia"}
                        </h3>

                        <p className="mt-1 break-all text-sm text-slate-600">
                          No. rekening:{" "}
                          <span className="font-semibold">
                            {item.nomor_rekening_pinjaman || "-"}
                          </span>
                        </p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs font-medium text-slate-500">
                              Nomor notasi
                            </div>
                            <div className="mt-1 break-words text-sm font-semibold text-slate-800">
                              {item.nomor_notasi || "-"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs font-medium text-slate-500">
                              Tanggal pengajuan
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-800">
                              {formatDate(item.created_at)}
                            </div>
                          </div>
                        </div>

                        {item.agunan && (
                          <div className="mt-3 rounded-xl border border-slate-100 p-3">
                            <div className="text-xs font-semibold text-slate-500">
                              Data agunan
                            </div>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                              {item.agunan}
                            </p>
                          </div>
                        )}

                        {(item.bukti_bds_url || item.bukti_bds_path) && (
                          <a
                            href={item.bukti_bds_url || undefined}
                            target={item.bukti_bds_url ? "_blank" : undefined}
                            rel={
                              item.bukti_bds_url
                                ? "noopener noreferrer"
                                : undefined
                            }
                            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            <FileImage size={17} />
                            Lihat bukti BDS
                          </a>
                        )}

                        {message?.pesan && (
                          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3.5">
                            <div className="flex items-center gap-2 text-sm font-bold text-orange-900">
                              <MessageSquare size={16} />
                              Catatan Admin
                            </div>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-orange-900">
                              {message.pesan}
                            </p>
                            {message.created_at && (
                              <p className="mt-2 text-xs text-orange-700">
                                {formatDate(message.created_at)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 xl:w-44 xl:flex-col">
                        {editable && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 xl:flex-none"
                            >
                              <RefreshCw size={15} />
                              {["PERLU_REVISI", "DITOLAK"].includes(
                                String(item.status || "").toUpperCase(),
                              )
                                ? "Perbaiki / Ajukan ulang"
                                : "Ubah pengajuan"}
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteItem(item)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                              Hapus
                            </button>
                          </>
                        )}
                        {!editable && (
                          <div className="rounded-xl bg-slate-100 px-3 py-2.5 text-center text-xs leading-5 text-slate-500">
                            Pengajuan tidak dapat diubah melalui halaman ini.
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) closeForm();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="form-title"
              className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
                <div>
                  <h2
                    id="form-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    {editingId
                      ? "Perbaiki pengajuan"
                      : "Pengajuan order agunan"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Kolom bertanda * wajib diisi.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Tutup formulir"
                >
                  <X size={21} />
                </button>
              </div>

              <form onSubmit={submitForm} className="space-y-5 p-5 sm:p-7">
                {formError && (
                  <div
                    role="alert"
                    className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                  >
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nama debitur" required>
                    <input
                      className={inputClass}
                      value={form.nama_debitur}
                      onChange={(event) =>
                        updateField("nama_debitur", event.target.value)
                      }
                      placeholder="Masukkan nama sesuai data"
                      maxLength={200}
                      required
                    />
                  </Field>

                  <Field label="Nomor rekening pinjaman" required>
                    <input
                      className={inputClass}
                      value={form.nomor_rekening_pinjaman}
                      onChange={(event) =>
                        updateField(
                          "nomor_rekening_pinjaman",
                          event.target.value,
                        )
                      }
                      placeholder="Masukkan nomor rekening"
                      maxLength={100}
                      required
                    />
                  </Field>

                  <Field label="Alasan pengajuan" required>
                    <select
                      className={inputClass}
                      value={form.alasan}
                      onChange={(event) =>
                        updateField("alasan", event.target.value)
                      }
                      required
                    >
                      {ALASAN_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Nomor notasi">
                    <input
                      className={inputClass}
                      value={form.nomor_notasi}
                      onChange={(event) =>
                        updateField("nomor_notasi", event.target.value)
                      }
                      placeholder="Opsional"
                      maxLength={100}
                    />
                  </Field>
                </div>

                <Field
                  label="Data agunan"
                  hint="Opsional. Satu agunan per baris, misalnya: - SHM No. 010 a.n. Sujai."
                >
                  <textarea
                    className={`${inputClass} min-h-28 resize-y`}
                    value={form.agunan}
                    onChange={(event) =>
                      updateField("agunan", event.target.value)
                    }
                    placeholder={"- SHM No. 010 a.n. Sujai\n- ..."}
                    maxLength={5000}
                    rows={4}
                  />
                </Field>

                <Field
                  label="Bukti capture BDS"
                  required={!editingId}
                  hint="Foto akan dikompres menjadi JPEG maksimal 2 MB. Pastikan informasi BDS terbaca."
                >
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 sm:p-5">
                    {photoPreview ? (
                      <div className="space-y-3">
                        <img
                          src={photoPreview}
                          alt="Pratinjau bukti BDS"
                          className="max-h-72 w-full rounded-xl bg-slate-100 object-contain"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-emerald-700">
                            Foto siap diunggah
                            {photo
                              ? ` · ${(photo.size / 1024).toFixed(0)} KB`
                              : ""}
                          </span>
                          <button
                            type="button"
                            onClick={clearPhoto}
                            className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            Ganti foto
                          </button>
                        </div>
                      </div>
                    ) : existingPhotoUrl ? (
                      <div className="space-y-3">
                        <a
                          href={existingPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 underline"
                        >
                          <FileImage size={17} />
                          Lihat bukti BDS sebelumnya
                        </a>
                        <p className="text-xs text-slate-500">
                          Jika tidak ingin mengganti bukti, biarkan foto ini
                          tetap digunakan.
                        </p>
                        <button
                          type="button"
                          onClick={() => galleryRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Upload size={17} />
                          Ganti bukti BDS
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                          <FileImage size={24} />
                        </div>
                        <p className="font-semibold text-slate-800">
                          Tambahkan capture BDS
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Pilih foto dari galeri atau ambil langsung dengan
                          kamera.
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => cameraRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                          >
                            <Camera size={17} />
                            Buka kamera
                          </button>
                          <button
                            type="button"
                            onClick={() => galleryRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Upload size={17} />
                            Pilih galeri
                          </button>
                        </div>
                      </div>
                    )}

                    <input
                      ref={galleryRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        handlePhoto(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                    <input
                      ref={cameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => {
                        handlePhoto(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </div>
                </Field>

                {editingId && (
                  <Field
                    label="Catatan pengajuan ulang"
                    hint="Opsional. Jelaskan singkat perbaikan yang dilakukan."
                  >
                    <textarea
                      className={`${inputClass} min-h-20 resize-y`}
                      value={form.catatan_pengajuan}
                      onChange={(event) =>
                        updateField("catatan_pengajuan", event.target.value)
                      }
                      placeholder="Contoh: Bukti BDS telah diperbarui..."
                      maxLength={1000}
                      rows={3}
                    />
                  </Field>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeForm}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle className="animate-spin" size={18} />
                    ) : (
                      <Send size={17} />
                    )}
                    {saving ? "Menyimpan..." : "Kirim pengajuan"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
