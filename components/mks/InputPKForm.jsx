/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MapPin,
  ShieldCheck,
  Users,
  Wallet,
  LoaderCircle,
  Save,
  AlertTriangle,
  UserRound,
  LockKeyhole,
} from "lucide-react";

import PkLoanSection from "@/app/admin/pk/components/sections/Loan/PkLoanSection";
import PkDebtorSection from "@/app/admin/pk/components/sections/Debtor/PkDebtorSection";
import PkAddressSection from "@/app/admin/pk/components/sections/Address/PkAddressSection";
import PkSpouseSection from "@/app/admin/pk/components/sections/Spouse/PkSpouseSection";
import PkCollateralSection from "@/app/admin/pk/components/sections/Collateral/PkCollateralSection";
import PkInsuranceSection from "@/app/admin/pk/components/sections/Insurance/PkInsuranceSection";
import PkDocumentsSection from "@/app/admin/pk/components/sections/Documents/PkDocumentSection";
import PkOrderSection from "@/app/admin/pk/components/sections/Order/PkOrderSection";
import PkBastSection from "@/app/admin/pk/components/sections/Bast/PkBastSection";
import PkRelatedPartySection from "@/app/admin/pk/components/sections/RelatedParty/PkRelatedPartySection";

const SECTIONS = [
  {
    key: "loan",
    title: "Informasi Pinjaman",
    icon: Wallet,
    description: "Data fasilitas kredit dan perhitungan pinjaman.",
  },
  {
    key: "debtor",
    title: "Data Debitur",
    icon: FileText,
    description: "Identitas utama debitur.",
  },
  {
    key: "address",
    title: "Alamat Debitur",
    icon: MapPin,
    description: "Alamat sesuai identitas dan alamat domisili.",
  },
  {
    key: "spouse",
    title: "Data Pasangan",
    icon: Users,
    description: "Data pasangan aktif setelah status MENIKAH dikonfirmasi.",
  },
  {
    key: "relatedParties",
    title: "Pihak Terkait",
    icon: Users,
    description: "Data pihak terkait sesuai kebutuhan.",
  },
  {
    key: "collateral",
    title: "Data Agunan",
    icon: ShieldCheck,
    description: "Data agunan dan pemilik agunan.",
  },
  {
    key: "insurance",
    title: "Asuransi & Penjaminan",
    icon: ShieldCheck,
    description: "Data asuransi dan penjaminan.",
  },
  {
    key: "documents",
    title: "Dokumen",
    icon: FileText,
    description: "Informasi dokumen pendukung PK.",
  },
  {
    key: "order",
    title: "Order Agunan",
    icon: ClipboardCheck,
    description: "Informasi order dan proses agunan.",
  },
  {
    key: "bast",
    title: "BAST",
    icon: FileText,
    description: "Informasi BAST terkait PK.",
  },
];

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function createInitialPk() {
  return {
    status_pk: "DRAFT",

    // Data debitur: kosong sampai diisi pengguna
    nama_debitur: "",
    status_debitur: "",
    jenis_kelamin: "",
    penyebutan_debitur: "",
    alamat_pasangan_sama_debitur: false,

    // Data terkait PK
    relatedParties: [],
    collaterals: [],
    insurances: [],
    documents: [],
    orders: [],

    // Data tambahan
    bast: {},
    locks: {},
    correctionRequests: [],
  };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function InputPKForm({
  nama = "",
  unit = "",
  kodeUnit = "",
  kodeAgen = "",
  notaries = [],
  notariesLoadError = "",
}) {
  const [pk, setPk] = useState(() => ({
    ...createInitialPk(),
    mksName: nama || "",
    mksAgentCode: kodeAgen || "",
  }));
  const [activeSection, setActiveSection] = useState("loan");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Data pasangan baru dapat diisi setelah pengguna memilih MENIKAH
  // pada bagian Data Debitur, kemudian menekan tombol Berikutnya.
  const [spouseUnlocked, setSpouseUnlocked] = useState(false);

  const isMarried =
    normalizeStatus(pk?.status_debitur || pk?.statusDebitur) === "MENIKAH";

  const spouseCanEdit = isMarried && spouseUnlocked;

  // Semua bagian selalu ditampilkan, termasuk Data Pasangan.
  const visibleSections = SECTIONS;

  const activeIndex = visibleSections.findIndex(
    (section) => section.key === activeSection,
  );

  const currentSection = visibleSections.find(
    (section) => section.key === activeSection,
  );

  const updatePk = (updater) => {
    setPk((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;

      if (!next || typeof next !== "object") {
        return current;
      }

      const sameAddress = Boolean(
        next.alamat_pasangan_sama_debitur || next.alamatPasanganSamaDebitur,
      );

      if (!sameAddress) {
        return next;
      }

      return {
        ...next,
        alamat_pasangan_sama_debitur: true,

        alamat_pasangan_jalan:
          next.alamat_jalan ??
          next.alamat_debitur_jalan ??
          next.alamat_pasangan_jalan ??
          "",

        alamat_pasangan_rt:
          next.rt ?? next.alamat_rt ?? next.alamat_pasangan_rt ?? "",

        alamat_pasangan_rw:
          next.rw ?? next.alamat_rw ?? next.alamat_pasangan_rw ?? "",

        alamat_pasangan_desa_kelurahan:
          next.alamat_desa_kelurahan ??
          next.alamat_pasangan_desa_kelurahan ??
          "",

        alamat_pasangan_kecamatan:
          next.alamat_kecamatan ?? next.alamat_pasangan_kecamatan ?? "",

        alamat_pasangan_kabupaten:
          next.alamat_kabupaten ?? next.alamat_pasangan_kabupaten ?? "",
      };
    });
  };

  const goToSection = (sectionKey) => {
    setActiveSection(sectionKey);
    setError("");
  };

  const goToNextSection = () => {
    setError("");

    const currentIndex = visibleSections.findIndex(
      (section) => section.key === activeSection,
    );

    // Buka akses Data Pasangan jika status debitur MENIKAH
    // dan tombol Berikutnya ditekan dari Data Debitur.
    if (activeSection === "debtor") {
      const statusTerbaru = normalizeStatus(pk?.status_debitur);

      if (statusTerbaru === "MENIKAH") {
        setSpouseUnlocked(true);
      } else {
        setSpouseUnlocked(false);
      }
    }

    if (currentIndex >= 0 && currentIndex < visibleSections.length - 1) {
      setActiveSection(visibleSections[currentIndex + 1].key);
    }
  };

  const renderSection = () => {
    const props = {
      pk,
      setPk: updatePk,
      canEdit: true,
      locked: false,
    };

    switch (activeSection) {
      case "loan":
        return <PkLoanSection {...props} />;

      case "debtor":
        return <PkDebtorSection {...props} />;

      case "address":
        return <PkAddressSection {...props} />;

      case "spouse":
        return (
          <div className="space-y-4">
            {!spouseCanEdit && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
              >
                <LockKeyhole size={19} className="mt-0.5 shrink-0" />

                <div>
                  <p className="font-semibold">
                    Data Pasangan belum dapat diisi
                  </p>

                  <p className="mt-1 text-xs leading-5">
                    {isMarried
                      ? "Status debitur sudah MENIKAH. Kembali ke bagian Data Debitur, lalu tekan Berikutnya untuk mengaktifkan isian pasangan."
                      : "Pilih status debitur MENIKAH pada bagian Data Debitur, kemudian tekan Berikutnya. Data pasangan akan tetap terlihat selama proses pengisian."}
                  </p>
                </div>
              </div>
            )}

            <fieldset
              disabled={!spouseCanEdit}
              className={
                spouseCanEdit
                  ? "min-w-0"
                  : "min-w-0 cursor-not-allowed opacity-60"
              }
            >
              <PkSpouseSection
                {...props}
                canEdit={spouseCanEdit}
                locked={!spouseCanEdit}
              />
            </fieldset>
          </div>
        );

      case "relatedParties":
        return <PkRelatedPartySection {...props} />;

      case "collateral":
        return (
          <PkCollateralSection {...props} notaries={normalizeArray(notaries)} />
        );

      case "insurance":
        return <PkInsuranceSection {...props} />;

      case "documents":
        return <PkDocumentsSection {...props} />;

      case "order":
        return <PkOrderSection {...props} />;

      case "bast":
        return <PkBastSection {...props} />;

      default:
        return null;
    }
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (saving) {
      return;
    }

    if (!String(pk.nama_debitur || "").trim()) {
      setError("Nama debitur wajib diisi agar data PK dapat disimpan.");
      setActiveSection("debtor");

      window.setTimeout(() => {
        document.getElementById("nama_debitur")?.focus();
      }, 0);

      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...pk,
        status_pk: "DRAFT",
        nama_debitur: String(pk.nama_debitur).trim(),

        relatedParties: normalizeArray(pk.relatedParties),
        collaterals: normalizeArray(pk.collaterals),
        insurances: normalizeArray(pk.insurances),
        documents: normalizeArray(pk.documents),
        orders: normalizeArray(pk.orders),

        bast:
          pk.bast && typeof pk.bast === "object" && !Array.isArray(pk.bast)
            ? pk.bast
            : {},
      };

      // Identitas MKS, kode agen, dan unit tetap ditentukan server
      // berdasarkan sesi login, bukan dari data yang dikirim browser.
      const response = await fetch("/api/mks/input-pk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error || "Data PK gagal disimpan. Silakan coba kembali.",
        );
      }

      setSuccess(
        `Data PK berhasil disimpan sebagai draft. ID: ${result.id ?? "-"}`,
      );

      setPk({
        ...createInitialPk(),
        mksName: nama || "",
        mksAgentCode: kodeAgen || "",
      });
      setActiveSection("loan");
      setSpouseUnlocked(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan data.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-10 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              JOSJIS · Modul MKS
            </p>

            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Input PK
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Pengisian data PK dengan struktur komponen yang digunakan Admin.
            </p>
          </div>

          <Link
            href="/mks/dashboard"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
        {/* Informasi unit tetap di bagian atas halaman. */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <p className="text-[11px] text-slate-500">Unit kerja</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {unit || "Unit belum tersedia"}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
            <p className="text-[11px] text-emerald-700">Kode unit</p>
            <p className="mt-1 text-sm font-semibold text-emerald-950">
              {kodeUnit || "-"}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
          <strong>Simpan sebagai draft.</strong> Lengkapi data yang diperlukan.
          Identitas MKS, kode agen, dan unit ditentukan oleh server berdasarkan
          sesi login.
        </div>

        {notariesLoadError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{notariesLoadError}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form
          onSubmit={saveDraft}
          className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]"
        >
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 lg:sticky lg:top-4">
            <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Bagian PK
            </p>

            <nav className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {visibleSections.map((section, index) => {
                const Icon = section.icon;
                const active = activeSection === section.key;
                const spouseLocked = section.key === "spouse" && !spouseCanEdit;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => goToSection(section.key)}
                    aria-current={active ? "step" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "bg-zinc-900 text-white"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />

                    <span className="min-w-0 flex-1">
                      {index + 1}. {section.title}
                    </span>

                    {spouseLocked && (
                      <LockKeyhole size={14} className="shrink-0 opacity-60" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-slate-100 px-2 pt-3 text-[11px] leading-5 text-slate-500">
              Data Pasangan selalu tersedia di menu. Isian akan aktif setelah
              status debitur MENIKAH dipilih dan tombol Berikutnya ditekan.
            </div>
          </aside>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {/* Identitas petugas berada di dalam form, bukan di kartu atas. */}

            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">
                {currentSection?.title || "Data PK"}
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {currentSection?.description || "Lengkapi data PK."}
              </p>
            </div>

            {renderSection()}

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-5 text-slate-500">
                Perubahan pada bagian-bagian form dikirim bersama saat tombol
                Simpan Draft ditekan.
              </p>

              <div className="flex flex-wrap justify-end gap-2">
                {activeIndex > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      goToSection(visibleSections[activeIndex - 1].key)
                    }
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Sebelumnya
                  </button>
                )}

                {activeIndex >= 0 &&
                  activeIndex < visibleSections.length - 1 && (
                    <button
                      type="button"
                      onClick={goToNextSection}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Berikutnya
                    </button>
                  )}
              </div>
            </div>
          </section>

          <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:col-start-2">
            <p className="text-[11px] leading-4 text-slate-500">
              Periksa kembali semua bagian sebelum menyimpan.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}

              {saving ? "Menyimpan..." : "Simpan Draft PK"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
