"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Upload,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
} from "lucide-react";

const API_BASE = "/api/admin/penyerahan-agunan-lunas";
const MAX_PDF_SIZE = 500 * 1024;

function formatTanggal(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "-";

  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function formatNomorBast(item) {
  if (item?.nomor_urut_surat == null || item?.tahun_surat == null) {
    return "-";
  }

  return `${String(item.nomor_urut_surat).padStart(3, "0")}/${item.tahun_surat}`;
}

async function readJsonResponse(response, fallbackMessage) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
}

function formatUkuran(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return "-";

  const size = Number(bytes);

  if (size < 1024) return `${size} byte`;

  return `${(size / 1024).toFixed(1)} KB`;
}

export default function EditPenyerahanAgunanLunasPage() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [record, setRecord] = useState(null);
  const [namaDebitur, setNamaDebitur] = useState("");
  const [nomorRekening, setNomorRekening] = useState("");
  const [tanggal, setTanggal] = useState("");

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showReplaceWarning, setShowReplaceWarning] = useState(false);

  const loadRecord = useCallback(async () => {
    if (!id) {
      setError("ID data BAST tidak ditemukan.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await readJsonResponse(
        response,
        "Data BAST gagal dimuat.",
      );

      const item = result.data;

      setRecord(item);
      setNamaDebitur(item.nama_debitur ?? "");
      setNomorRekening(item.nomor_rekening_pinjaman ?? "");
      setTanggal(item.tanggal_penyerahan ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data BAST gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] ?? null;

    setFileError("");
    setSuccess("");
    setShowReplaceWarning(false);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      setFileError("Pilih file PDF.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setFileError("File PDF kosong.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_PDF_SIZE) {
      setFile(null);
      setFileError("Ukuran PDF melebihi 500 KB. Kompres PDF terlebih dahulu.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
    setShowReplaceWarning(true);
  }

  function removeSelectedFile() {
    setFile(null);
    setFileError("");
    setShowReplaceWarning(false);

    const input = document.getElementById("dokumen-pengganti");

    if (input) input.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");
    setFileError("");

    const trimmedNama = namaDebitur.trim();
    const trimmedRekening = nomorRekening.trim();

    if (!trimmedNama || trimmedNama.length > 200) {
      setError("Nama debitur wajib diisi, maksimal 200 karakter.");
      return;
    }

    if (!trimmedRekening || trimmedRekening.length > 100) {
      setError("Nomor rekening pinjaman wajib diisi, maksimal 100 karakter.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      setError("Tanggal penyerahan tidak valid.");
      return;
    }

    const parsedDate = new Date(`${tanggal}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== tanggal
    ) {
      setError("Tanggal penyerahan tidak valid.");
      return;
    }

    if (file && file.size > MAX_PDF_SIZE) {
      setError("Ukuran PDF pengganti tidak boleh melebihi 500 KB.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("namaDebitur", trimmedNama);
      formData.append("nomorRekeningPinjaman", trimmedRekening);
      formData.append("tanggalPenyerahan", tanggal);

      // Dokumen hanya dikirim jika pengguna memilih PDF pengganti.
      // Tanpa file baru, API mempertahankan dokumen yang sekarang.
      if (file) {
        formData.append("dokumen", file);
        formData.append("namaFileAsli", file.name);
      }

      const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: formData,
        cache: "no-store",
      });

      const result = await readJsonResponse(
        response,
        "Data BAST gagal diperbarui.",
      );

      setSuccess(
        result.storageCleanupWarning
          ? "Data berhasil diperbarui. Namun, file PDF lama belum berhasil dibersihkan. Hubungi administrator."
          : result.message || "Data BAST berhasil diperbarui.",
      );

      setRecord((current) => ({
        ...current,
        ...result.data,
      }));

      setFile(null);
      setShowReplaceWarning(false);

      const input = document.getElementById("dokumen-pengganti");

      if (input) input.value = "";

      // Kembali ke daftar setelah pengguna sempat melihat status berhasil.
      // Jika ada peringatan pembersihan Storage, biarkan halaman terbuka.
      if (!result.storageCleanupWarning) {
        window.setTimeout(() => {
          router.push("/admin/penyerahan-agunan-lunas");
          router.refresh();
        }, 900);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan perubahan.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openCurrentPdf() {
    if (!id) return;

    window.open(
      `${API_BASE}/${encodeURIComponent(id)}/dokumen?inline=1`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function backToList() {
    router.push("/admin/penyerahan-agunan-lunas");
  }

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-[#174C40]" />
          <p className="mt-3 text-sm text-zinc-500">Memuat data BAST...</p>
        </div>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-8">
        <button
          type="button"
          onClick={backToList}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke daftar
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Data tidak dapat dibuka</p>
              <p className="mt-1">{error || "Data BAST tidak ditemukan."}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadRecord}
            className="mt-4 font-semibold underline"
          >
            Coba muat ulang
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-4xl space-y-5 p-3 sm:space-y-6 sm:p-6 lg:p-8">
      <button
        type="button"
        onClick={backToList}
        disabled={saving}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar
      </button>

      <header>
        <p className="text-xs font-semibold tracking-wider text-[#174C40]">
          OPERASIONAL
        </p>

        <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
          Edit Serah Terima Agunan Lunas
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Perbarui informasi BAST atau ganti dokumen PDF jika diperlukan. Nomor
          BAST dan nomor Surat Keluar tidak akan dibuat ulang.
        </p>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Perubahan belum berhasil</p>
            <p className="mt-1 break-words">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Tutup pesan kesalahan"
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
          <h2 className="font-semibold text-zinc-900">Informasi nomor surat</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Informasi ini bersifat tetap dan tidak dapat diubah melalui form
            edit.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">Nomor BAST</p>
            <p className="mt-1 text-lg font-bold text-[#174C40]">
              {formatNomorBast(record)}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">Tanggal dibuat</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {record.created_at
                ? new Date(record.created_at).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "-"}
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <div>
            <h2 className="font-semibold text-zinc-900">Data penyerahan</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Periksa kembali informasi sebelum menyimpan.
            </p>
          </div>

          <div>
            <label
              htmlFor="namaDebitur"
              className="mb-2 block text-sm font-semibold text-zinc-700"
            >
              Nama debitur <span className="text-red-600">*</span>
            </label>

            <input
              id="namaDebitur"
              name="namaDebitur"
              value={namaDebitur}
              onChange={(event) => setNamaDebitur(event.target.value)}
              maxLength={200}
              required
              disabled={saving}
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#174C40] focus:ring-2 focus:ring-[#174C40]/10 disabled:bg-zinc-50"
              placeholder="Masukkan nama debitur"
            />

            <p className="mt-1 text-xs text-zinc-400">Maksimal 200 karakter.</p>
          </div>

          <div>
            <label
              htmlFor="nomorRekening"
              className="mb-2 block text-sm font-semibold text-zinc-700"
            >
              Nomor rekening pinjaman <span className="text-red-600">*</span>
            </label>

            <input
              id="nomorRekening"
              name="nomorRekeningPinjaman"
              value={nomorRekening}
              onChange={(event) => setNomorRekening(event.target.value)}
              maxLength={100}
              required
              disabled={saving}
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#174C40] focus:ring-2 focus:ring-[#174C40]/10 disabled:bg-zinc-50"
              placeholder="Masukkan nomor rekening pinjaman"
            />

            <p className="mt-1 text-xs text-zinc-400">Maksimal 100 karakter.</p>
          </div>

          <div>
            <label
              htmlFor="tanggalPenyerahan"
              className="mb-2 block text-sm font-semibold text-zinc-700"
            >
              Tanggal penyerahan <span className="text-red-600">*</span>
            </label>

            <input
              id="tanggalPenyerahan"
              name="tanggalPenyerahan"
              type="date"
              value={tanggal}
              onChange={(event) => setTanggal(event.target.value)}
              required
              disabled={saving}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#174C40] focus:ring-2 focus:ring-[#174C40]/10 disabled:bg-zinc-50"
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <div>
            <h2 className="font-semibold text-zinc-900">Dokumen PDF</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              PDF lama tetap digunakan apabila kamu tidak memilih dokumen
              pengganti.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
              <FileText className="h-6 w-6 text-[#174C40]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-zinc-900">
                {record.nama_file_asli || "Dokumen penyerahan saat ini"}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                PDF · {formatUkuran(record.ukuran_file_bytes)}
              </p>

              <button
                type="button"
                onClick={openCurrentPdf}
                disabled={saving}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#174C40] hover:underline disabled:opacity-50"
              >
                <Eye className="h-3.5 w-3.5" />
                Lihat PDF saat ini
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="dokumen-pengganti"
              className="mb-2 block text-sm font-semibold text-zinc-700"
            >
              Ganti dokumen (opsional)
            </label>

            <label
              htmlFor="dokumen-pengganti"
              className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition ${
                file
                  ? "border-[#174C40] bg-[#174C40]/5"
                  : "border-zinc-300 bg-zinc-50 hover:border-[#174C40] hover:bg-[#174C40]/5"
              } ${saving ? "pointer-events-none opacity-60" : ""}`}
            >
              {file ? (
                <>
                  <FileText className="h-8 w-8 text-[#174C40]" />
                  <span className="mt-2 max-w-full break-words text-sm font-semibold text-zinc-900">
                    {file.name}
                  </span>
                  <span className="mt-1 text-xs text-zinc-500">
                    {formatUkuran(file.size)}
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-zinc-400" />
                  <span className="mt-2 text-sm font-semibold text-zinc-700">
                    Pilih PDF pengganti
                  </span>
                  <span className="mt-1 text-xs text-zinc-500">
                    Format PDF, maksimal 500 KB
                  </span>
                </>
              )}

              <input
                id="dokumen-pengganti"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                disabled={saving}
                className="sr-only"
              />
            </label>

            {fileError && (
              <p className="mt-2 text-sm text-red-700">{fileError}</p>
            )}

            {showReplaceWarning && file && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  PDF lama akan digantikan setelah perubahan database berhasil
                  disimpan. Pastikan file yang dipilih sudah benar.
                </p>
              </div>
            )}

            {file && (
              <button
                type="button"
                onClick={removeSelectedFile}
                disabled={saving}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Batalkan penggantian PDF
              </button>
            )}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={backToList}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#174C40] px-5 text-sm font-semibold text-white hover:bg-[#10382F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Menyimpan perubahan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Simpan Perubahan
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs leading-relaxed text-zinc-500">
          Nomor BAST dan nomor Surat Keluar tetap dipertahankan. Edit data tidak
          membuat nomor surat baru.
        </p>
      </form>
    </main>
  );
}
