"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import {
  Activity,
  Bell,
  Check,
  ChevronRight,
  Database,
  FileText,
  Globe2,
  History,
  Laptop,
  LockKeyhole,
  Save,
  Settings,
  ShieldCheck,
} from "lucide-react";

/* =========================================================
   KONFIGURASI MENU
========================================================= */

const SETTINGS_SECTIONS = [
  {
    id: "umum",
    title: "Umum",
    description: "Konfigurasi dasar sistem",
    icon: Settings,
  },
  {
    id: "unit",
    title: "Unit & Cabang",
    description: "Identitas unit dan cabang",
    icon: Globe2,
  },
  {
    id: "keamanan",
    title: "Pengguna & Keamanan",
    description: "Akses dan keamanan akun",
    icon: ShieldCheck,
  },
  {
    id: "perangkat",
    title: "Perangkat",
    description: "Aturan device pengguna",
    icon: Laptop,
  },
  {
    id: "notifikasi",
    title: "Notifikasi",
    description: "Pemberitahuan sistem",
    icon: Bell,
  },
  {
    id: "dokumen",
    title: "Dokumen & Surat",
    description: "Konfigurasi dokumen",
    icon: FileText,
  },
  {
    id: "backup",
    title: "Backup & Export",
    description: "Pencadangan dan export",
    icon: Database,
  },
  {
    id: "audit",
    title: "Audit Log",
    description: "Pencatatan aktivitas",
    icon: History,
  },
  {
    id: "pemeliharaan",
    title: "Pemeliharaan",
    description: "Status sistem",
    icon: Activity,
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getUnitCode(activeUnit) {
  return (
    activeUnit?.kode_unit || activeUnit?.kode || activeUnit?.kode_legacy || ""
  );
}

function getUnitName(activeUnit) {
  return activeUnit?.nama_unit || activeUnit?.nama || "";
}

/* =========================================================
   PAGE
========================================================= */

export default function PengaturanPage() {
  const { activeUnit } = useUnit();

  const unitCode = getUnitCode(activeUnit);
  const unitName = getUnitName(activeUnit);

  const [activeSection, setActiveSection] = useState("umum");
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    /* UMUM */
    namaSistem: "",
    namaSingkat: "",
    tahunAktif: "",
    zonaWaktu: "Asia/Jakarta",
    bahasa: "id-ID",

    /* UNIT */
    namaUnit: unitName,
    kodeUnit: unitCode,
    kodeLegacy: "",
    kodeKawasan: "",

    /* KEAMANAN */
    sessionTimeout: "",
    requireReauthentication: false,
    enableLoginNotification: true,
    preventConcurrentLogin: false,

    /* PERANGKAT */
    adminMaxDevice: "3",
    mksMaxDevice: "2",
    mbmMaxDevice: "2",
    pengawasMaxDevice: "2",
    requireDeviceBinding: false,

    /* NOTIFIKASI */
    browserNotification: true,
    popupNotification: true,
    reminderOrder: true,
    reminderNotaris: true,
    reminderMigrasi: true,
    reminderDokumen: true,

    /* DOKUMEN */
    tahunSurat: "",
    prefixSurat: "",
    defaultLampiran: "-",
    nomorSuratAuto: true,

    /* BACKUP */
    autoBackup: false,
    backupFrequency: "daily",
    retainBackup: "",
    includeAuditLog: true,

    /* AUDIT */
    auditLogin: true,
    auditLogout: true,
    auditCreate: true,
    auditUpdate: true,
    auditDelete: true,
    auditExport: true,
    auditImport: true,

    /* MAINTENANCE */
    maintenanceMode: false,
    maintenanceMessage: "",
  });

  /* =========================================================
     UPDATE UNIT AKTIF
  ========================================================= */

  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      namaUnit: getUnitName(activeUnit),
      kodeUnit: getUnitCode(activeUnit),
    }));
  }, [activeUnit]);

  /* =========================================================
     CURRENT SECTION
  ========================================================= */

  const currentSection = useMemo(
    () => SETTINGS_SECTIONS.find((section) => section.id === activeSection),
    [activeSection],
  );

  /* =========================================================
     UPDATE SETTING
  ========================================================= */

  function updateSetting(key, value) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    setSaved(false);
  }

  /* =========================================================
     SAVE
  ========================================================= */

  function handleSave() {
    /*
      Belum disimpan ke Supabase.
      Halaman ini baru menyiapkan struktur konfigurasi.
    */

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  /* =========================================================
     RESET SECTION
  ========================================================= */

  function handleResetSection() {
    const confirmed = window.confirm(
      "Kembalikan pengaturan bagian ini ke kondisi awal?",
    );

    if (!confirmed) return;

    let resetValues = {};

    switch (activeSection) {
      case "umum":
        resetValues = {
          namaSistem: "",
          namaSingkat: "",
          tahunAktif: "",
          zonaWaktu: "Asia/Jakarta",
          bahasa: "id-ID",
        };
        break;

      case "unit":
        resetValues = {
          namaUnit: unitName,
          kodeUnit: unitCode,
          kodeLegacy: "",
          kodeKawasan: "",
        };
        break;

      case "keamanan":
        resetValues = {
          sessionTimeout: "",
          requireReauthentication: false,
          enableLoginNotification: true,
          preventConcurrentLogin: false,
        };
        break;

      case "perangkat":
        resetValues = {
          adminMaxDevice: "3",
          mksMaxDevice: "2",
          mbmMaxDevice: "2",
          pengawasMaxDevice: "2",
          requireDeviceBinding: false,
        };
        break;

      case "notifikasi":
        resetValues = {
          browserNotification: true,
          popupNotification: true,
          reminderOrder: true,
          reminderNotaris: true,
          reminderMigrasi: true,
          reminderDokumen: true,
        };
        break;

      case "dokumen":
        resetValues = {
          tahunSurat: "",
          prefixSurat: "",
          defaultLampiran: "-",
          nomorSuratAuto: true,
        };
        break;

      case "backup":
        resetValues = {
          autoBackup: false,
          backupFrequency: "daily",
          retainBackup: "",
          includeAuditLog: true,
        };
        break;

      case "audit":
        resetValues = {
          auditLogin: true,
          auditLogout: true,
          auditCreate: true,
          auditUpdate: true,
          auditDelete: true,
          auditExport: true,
          auditImport: true,
        };
        break;

      case "pemeliharaan":
        resetValues = {
          maintenanceMode: false,
          maintenanceMessage: "",
        };
        break;

      default:
        break;
    }

    setSettings((prev) => ({
      ...prev,
      ...resetValues,
    }));

    setSaved(false);
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 max-w-full overflow-x-hidden bg-slate-50">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-4 w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-5 sm:p-5">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white sm:h-11 sm:w-11">
                  <Settings className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold text-slate-900 sm:text-2xl">
                    Pengaturan
                  </h1>

                  <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-sm">
                    Pusat konfigurasi sistem JOSJIS
                  </p>
                </div>
              </div>

              <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                {saved && (
                  <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 sm:flex-none">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>Tersimpan</span>
                  </div>
                )}

                <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-none">
                  <div className="text-[9px] uppercase tracking-wide text-slate-400">
                    Unit Aktif
                  </div>

                  <div className="truncate text-xs font-bold text-slate-800">
                    {unitCode || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              MOBILE SECTION SELECTOR
          ================================================= */}

          <div className="mb-4 block w-full min-w-0 lg:hidden">
            <div className="grid w-full grid-cols-2 gap-2">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`flex min-w-0 items-center gap-2 rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        active
                          ? "bg-blue-100 text-blue-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-[11px] font-bold ${
                          active ? "text-blue-700" : "text-slate-700"
                        }`}
                      >
                        {section.title}
                      </div>

                      <div className="truncate text-[9px] text-slate-400">
                        {section.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =================================================
              MAIN GRID
          ================================================= */}

          <div className="grid w-full min-w-0 gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
            {/* =================================================
                DESKTOP SIDEBAR
            ================================================= */}

            <aside className="hidden h-fit min-w-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:block">
              <div className="px-3 pb-2 pt-2">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Konfigurasi
                </div>
              </div>

              <div className="space-y-1">
                {SETTINGS_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold">
                          {section.title}
                        </div>

                        <div className="mt-0.5 truncate text-[10px] text-slate-400">
                          {section.description}
                        </div>
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${
                          active ? "text-blue-500" : "text-slate-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* =================================================
                CONTENT
            ================================================= */}

            <main className="min-w-0 w-full">
              <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* CONTENT HEADER */}

                <div className="w-full min-w-0 border-b border-slate-200 p-4 sm:p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    {currentSection && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <currentSection.icon className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                        {currentSection?.title}
                      </h2>

                      <p className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-xs">
                        {currentSection?.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetSection}
                      className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      title="Reset bagian"
                    >
                      <span className="text-sm">↻</span>
                    </button>
                  </div>
                </div>

                {/* =================================================
                    UMUM
                ================================================== */}

                {activeSection === "umum" && (
                  <SectionContent>
                    <SectionTitle
                      title="Identitas Sistem"
                      description="Informasi dasar yang digunakan oleh aplikasi."
                    />

                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field
                        label="Nama Sistem"
                        value={settings.namaSistem}
                        onChange={(value) => updateSetting("namaSistem", value)}
                        placeholder="Nama sistem"
                      />

                      <Field
                        label="Nama Singkat"
                        value={settings.namaSingkat}
                        onChange={(value) =>
                          updateSetting("namaSingkat", value)
                        }
                        placeholder="Nama singkat"
                      />

                      <Field
                        label="Tahun Aktif"
                        value={settings.tahunAktif}
                        onChange={(value) => updateSetting("tahunAktif", value)}
                        placeholder="Contoh: 2026"
                      />

                      <SelectField
                        label="Zona Waktu"
                        value={settings.zonaWaktu}
                        onChange={(value) => updateSetting("zonaWaktu", value)}
                        options={[
                          {
                            value: "Asia/Jakarta",
                            label: "Asia/Jakarta (WIB)",
                          },
                          {
                            value: "Asia/Makassar",
                            label: "Asia/Makassar (WITA)",
                          },
                          {
                            value: "Asia/Jayapura",
                            label: "Asia/Jayapura (WIT)",
                          },
                        ]}
                      />

                      <SelectField
                        label="Bahasa"
                        value={settings.bahasa}
                        onChange={(value) => updateSetting("bahasa", value)}
                        options={[
                          {
                            value: "id-ID",
                            label: "Bahasa Indonesia",
                          },
                          {
                            value: "en-US",
                            label: "English",
                          },
                        ]}
                      />
                    </div>

                    <InfoBox>
                      Pengaturan umum bersifat global dan tidak mengikuti unit
                      aktif.
                    </InfoBox>
                  </SectionContent>
                )}

                {/* =================================================
                    UNIT
                ================================================== */}

                {activeSection === "unit" && (
                  <SectionContent>
                    <SectionTitle
                      title="Identitas Unit"
                      description="Informasi unit yang sedang dipilih pada Topbar."
                    />

                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field
                        label="Nama Unit"
                        value={settings.namaUnit}
                        onChange={(value) => updateSetting("namaUnit", value)}
                        placeholder="Nama unit"
                      />

                      <Field
                        label="Kode Unit"
                        value={settings.kodeUnit}
                        onChange={(value) => updateSetting("kodeUnit", value)}
                        placeholder="Kode unit"
                      />

                      <Field
                        label="Kode Legacy"
                        value={settings.kodeLegacy}
                        onChange={(value) => updateSetting("kodeLegacy", value)}
                        placeholder="Kode legacy"
                      />

                      <Field
                        label="Kode Kawasan"
                        value={settings.kodeKawasan}
                        onChange={(value) =>
                          updateSetting("kodeKawasan", value)
                        }
                        placeholder="Kode kawasan"
                      />
                    </div>

                    <InfoBox>
                      Identitas unit mengikuti master data unit yang digunakan
                      oleh sistem.
                    </InfoBox>
                  </SectionContent>
                )}

                {/* =================================================
                    KEAMANAN
                ================================================== */}

                {activeSection === "keamanan" && (
                  <SectionContent>
                    <SectionTitle
                      title="Pengguna & Keamanan"
                      description="Aturan dasar keamanan sesi dan akses pengguna."
                    />

                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field
                        label="Timeout Sesi"
                        value={settings.sessionTimeout}
                        onChange={(value) =>
                          updateSetting("sessionTimeout", value)
                        }
                        placeholder="Contoh: 30 menit"
                      />
                    </div>

                    <div className="min-w-0 space-y-3">
                      <Toggle
                        label="Re-authentication"
                        description="Minta verifikasi ulang untuk tindakan sensitif."
                        checked={settings.requireReauthentication}
                        onChange={(value) =>
                          updateSetting("requireReauthentication", value)
                        }
                      />

                      <Toggle
                        label="Notifikasi Login"
                        description="Catat dan beri pemberitahuan ketika akun login."
                        checked={settings.enableLoginNotification}
                        onChange={(value) =>
                          updateSetting("enableLoginNotification", value)
                        }
                      />

                      <Toggle
                        label="Cegah Login Bersamaan"
                        description="Batasi sesi aktif bersamaan pada satu akun."
                        checked={settings.preventConcurrentLogin}
                        onChange={(value) =>
                          updateSetting("preventConcurrentLogin", value)
                        }
                      />
                    </div>

                    <WarningBox>
                      Password pengguna tidak disimpan plaintext di database
                      JOSJIS. Autentikasi final akan menggunakan Supabase Auth.
                    </WarningBox>
                  </SectionContent>
                )}

                {/* =================================================
                    PERANGKAT
                ================================================== */}

                {activeSection === "perangkat" && (
                  <SectionContent>
                    <SectionTitle
                      title="Aturan Perangkat"
                      description="Batas jumlah perangkat dan device binding."
                    />

                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <NumberField
                        label="Maks. Perangkat Admin"
                        value={settings.adminMaxDevice}
                        onChange={(value) =>
                          updateSetting("adminMaxDevice", value)
                        }
                      />

                      <NumberField
                        label="Maks. Perangkat MKS"
                        value={settings.mksMaxDevice}
                        onChange={(value) =>
                          updateSetting("mksMaxDevice", value)
                        }
                      />

                      <NumberField
                        label="Maks. Perangkat MBM"
                        value={settings.mbmMaxDevice}
                        onChange={(value) =>
                          updateSetting("mbmMaxDevice", value)
                        }
                      />

                      <NumberField
                        label="Maks. Perangkat Pengawas"
                        value={settings.pengawasMaxDevice}
                        onChange={(value) =>
                          updateSetting("pengawasMaxDevice", value)
                        }
                      />
                    </div>

                    <Toggle
                      label="Device Binding"
                      description="Perangkat baru harus didaftarkan dan terikat ke satu pengguna."
                      checked={settings.requireDeviceBinding}
                      onChange={(value) =>
                        updateSetting("requireDeviceBinding", value)
                      }
                    />

                    <InfoBox>
                      Identitas perangkat tidak menggunakan model HP atau alamat
                      IP sebagai identitas utama.
                    </InfoBox>
                  </SectionContent>
                )}

                {/* =================================================
                    NOTIFIKASI
                ================================================== */}

                {activeSection === "notifikasi" && (
                  <SectionContent>
                    <SectionTitle
                      title="Notifikasi"
                      description="Atur jenis pemberitahuan yang digunakan JOSJIS."
                    />

                    <div className="min-w-0 space-y-3">
                      <Toggle
                        label="Browser Notification"
                        description="Izinkan JOSJIS mengirim notifikasi browser."
                        checked={settings.browserNotification}
                        onChange={(value) =>
                          updateSetting("browserNotification", value)
                        }
                      />

                      <Toggle
                        label="Popup JOSJIS"
                        description="Tampilkan pemberitahuan langsung di aplikasi."
                        checked={settings.popupNotification}
                        onChange={(value) =>
                          updateSetting("popupNotification", value)
                        }
                      />

                      <Toggle
                        label="Pengingat Order Agunan"
                        description="Pengingat jadwal dan cutoff order agunan."
                        checked={settings.reminderOrder}
                        onChange={(value) =>
                          updateSetting("reminderOrder", value)
                        }
                      />

                      <Toggle
                        label="Pengingat Notaris"
                        description="Pemberitahuan untuk proses notaris."
                        checked={settings.reminderNotaris}
                        onChange={(value) =>
                          updateSetting("reminderNotaris", value)
                        }
                      />

                      <Toggle
                        label="Pengingat Migrasi"
                        description="Pemberitahuan migrasi yang masih tertunda."
                        checked={settings.reminderMigrasi}
                        onChange={(value) =>
                          updateSetting("reminderMigrasi", value)
                        }
                      />

                      <Toggle
                        label="Pengingat Dokumen"
                        description="Pemberitahuan dokumen yang belum lengkap."
                        checked={settings.reminderDokumen}
                        onChange={(value) =>
                          updateSetting("reminderDokumen", value)
                        }
                      />
                    </div>
                  </SectionContent>
                )}

                {/* =================================================
                    DOKUMEN
                ================================================== */}

                {activeSection === "dokumen" && (
                  <SectionContent>
                    <SectionTitle
                      title="Dokumen & Surat"
                      description="Konfigurasi dasar pembuatan dokumen dan surat."
                    />

                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field
                        label="Tahun Surat"
                        value={settings.tahunSurat}
                        onChange={(value) => updateSetting("tahunSurat", value)}
                        placeholder="Contoh: 2026"
                      />

                      <Field
                        label="Prefix Surat"
                        value={settings.prefixSurat}
                        onChange={(value) =>
                          updateSetting("prefixSurat", value)
                        }
                        placeholder="Prefix nomor surat"
                      />

                      <Field
                        label="Default Lampiran"
                        value={settings.defaultLampiran}
                        onChange={(value) =>
                          updateSetting("defaultLampiran", value)
                        }
                        placeholder="-"
                      />
                    </div>

                    <Toggle
                      label="Nomor Surat Otomatis"
                      description="Nomor surat berikutnya dibuat berdasarkan urutan sistem."
                      checked={settings.nomorSuratAuto}
                      onChange={(value) =>
                        updateSetting("nomorSuratAuto", value)
                      }
                    />

                    <InfoBox>
                      Format nomor surat final akan mengikuti konfigurasi resmi
                      JOSJIS dan unit yang aktif.
                    </InfoBox>
                  </SectionContent>
                )}

                {/* =================================================
                    BACKUP
                ================================================== */}

                {activeSection === "backup" && (
                  <SectionContent>
                    <SectionTitle
                      title="Backup & Export"
                      description="Pengaturan pencadangan dan data export."
                    />

                    <Toggle
                      label="Backup Otomatis"
                      description="Aktifkan pencadangan otomatis sesuai jadwal."
                      checked={settings.autoBackup}
                      onChange={(value) => updateSetting("autoBackup", value)}
                    />

                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <SelectField
                        label="Frekuensi Backup"
                        value={settings.backupFrequency}
                        onChange={(value) =>
                          updateSetting("backupFrequency", value)
                        }
                        options={[
                          {
                            value: "daily",
                            label: "Harian",
                          },
                          {
                            value: "weekly",
                            label: "Mingguan",
                          },
                          {
                            value: "monthly",
                            label: "Bulanan",
                          },
                        ]}
                      />

                      <NumberField
                        label="Jumlah Backup"
                        value={settings.retainBackup}
                        onChange={(value) =>
                          updateSetting("retainBackup", value)
                        }
                        placeholder="Jumlah backup"
                      />
                    </div>

                    <Toggle
                      label="Sertakan Audit Log"
                      description="Masukkan audit log ke dalam paket backup."
                      checked={settings.includeAuditLog}
                      onChange={(value) =>
                        updateSetting("includeAuditLog", value)
                      }
                    />
                  </SectionContent>
                )}

                {/* =================================================
                    AUDIT
                ================================================== */}

                {activeSection === "audit" && (
                  <SectionContent>
                    <SectionTitle
                      title="Audit Log"
                      description="Tentukan aktivitas yang harus dicatat."
                    />

                    <div className="min-w-0 space-y-3">
                      <Toggle
                        label="Login"
                        description="Catat aktivitas login pengguna."
                        checked={settings.auditLogin}
                        onChange={(value) => updateSetting("auditLogin", value)}
                      />

                      <Toggle
                        label="Logout"
                        description="Catat aktivitas logout pengguna."
                        checked={settings.auditLogout}
                        onChange={(value) =>
                          updateSetting("auditLogout", value)
                        }
                      />

                      <Toggle
                        label="Tambah Data"
                        description="Catat pembuatan data baru."
                        checked={settings.auditCreate}
                        onChange={(value) =>
                          updateSetting("auditCreate", value)
                        }
                      />

                      <Toggle
                        label="Edit Data"
                        description="Catat perubahan data."
                        checked={settings.auditUpdate}
                        onChange={(value) =>
                          updateSetting("auditUpdate", value)
                        }
                      />

                      <Toggle
                        label="Hapus Data"
                        description="Catat penghapusan data."
                        checked={settings.auditDelete}
                        onChange={(value) =>
                          updateSetting("auditDelete", value)
                        }
                      />

                      <Toggle
                        label="Export"
                        description="Catat aktivitas export."
                        checked={settings.auditExport}
                        onChange={(value) =>
                          updateSetting("auditExport", value)
                        }
                      />

                      <Toggle
                        label="Import"
                        description="Catat aktivitas import."
                        checked={settings.auditImport}
                        onChange={(value) =>
                          updateSetting("auditImport", value)
                        }
                      />
                    </div>
                  </SectionContent>
                )}

                {/* =================================================
                    PEMELIHARAAN
                ================================================== */}

                {activeSection === "pemeliharaan" && (
                  <SectionContent>
                    <SectionTitle
                      title="Pemeliharaan Sistem"
                      description="Kontrol status operasional aplikasi."
                    />

                    <div className="w-full min-w-0 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
                      <div className="flex min-w-0 gap-3">
                        <Activity className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-amber-900">
                            Maintenance Mode
                          </div>

                          <p className="mt-1 text-[10px] leading-5 text-amber-700">
                            Ketika aktif, akses pengguna biasa dapat dibatasi
                            selama pemeliharaan.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Toggle
                      label="Maintenance Mode"
                      description="Aktifkan mode pemeliharaan sistem."
                      checked={settings.maintenanceMode}
                      onChange={(value) =>
                        updateSetting("maintenanceMode", value)
                      }
                    />

                    <TextAreaField
                      label="Pesan Maintenance"
                      value={settings.maintenanceMessage}
                      onChange={(value) =>
                        updateSetting("maintenanceMessage", value)
                      }
                      placeholder="Pesan yang akan ditampilkan kepada pengguna..."
                    />
                  </SectionContent>
                )}

                {/* =================================================
                    FOOTER
                ================================================== */}

                <div className="w-full min-w-0 border-t border-slate-200 bg-slate-50 p-3 sm:p-5">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto sm:min-w-[180px]"
                  >
                    <Save className="h-4 w-4" />
                    Simpan Pengaturan
                  </button>
                </div>
              </div>
            </main>
          </div>

          {/* =================================================
              FOOT NOTE
          ================================================== */}

          <div className="mt-4 w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 gap-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-700">
                  Pengaturan sensitif
                </div>

                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                  Pengaturan keamanan, device binding, backup, maintenance, dan
                  konfigurasi sistem harus dibatasi untuk administrator yang
                  berwenang.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* =========================================================
   COMPONENT: SECTION CONTENT
========================================================= */

function SectionContent({ children }) {
  return <div className="w-full min-w-0 space-y-5 p-4 sm:p-5">{children}</div>;
}

/* =========================================================
   COMPONENT: SECTION TITLE
========================================================= */

function SectionTitle({ title, description }) {
  return (
    <div className="min-w-0">
      <h3 className="truncate text-xs font-bold text-slate-800 sm:text-sm">
        {title}
      </h3>

      <p className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p>
    </div>
  );
}

/* =========================================================
   COMPONENT: FIELD
========================================================= */

function Field({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block min-w-0 w-full">
      <span className="mb-1.5 block truncate text-xs font-semibold text-slate-700">
        {label}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
      />
    </label>
  );
}

/* =========================================================
   COMPONENT: NUMBER FIELD
========================================================= */

function NumberField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block min-w-0 w-full">
      <span className="mb-1.5 block truncate text-xs font-semibold text-slate-700">
        {label}
      </span>

      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
      />
    </label>
  );
}

/* =========================================================
   COMPONENT: SELECT
========================================================= */

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0 w-full">
      <span className="mb-1.5 block truncate text-xs font-semibold text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* =========================================================
   COMPONENT: TEXTAREA
========================================================= */

function TextAreaField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block min-w-0 w-full">
      <span className="mb-1.5 block truncate text-xs font-semibold text-slate-700">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="block w-full min-w-0 max-w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
      />
    </label>
  );
}

/* =========================================================
   COMPONENT: TOGGLE
========================================================= */

function Toggle({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50"
    >
      <div
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-slate-800">{label}</div>

        <div className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-slate-500">
          {description}
        </div>
      </div>

      {checked && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
    </button>
  );
}

/* =========================================================
   COMPONENT: INFO BOX
========================================================= */

function InfoBox({ children }) {
  return (
    <div className="w-full min-w-0 rounded-xl border border-blue-100 bg-blue-50 p-3">
      <div className="text-[10px] leading-5 text-blue-700">{children}</div>
    </div>
  );
}

/* =========================================================
   COMPONENT: WARNING BOX
========================================================= */

function WarningBox({ children }) {
  return (
    <div className="w-full min-w-0 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="text-[10px] leading-5 text-amber-700">{children}</div>
    </div>
  );
}
