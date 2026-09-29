/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-assign-module-variable */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileDown,
  FileText,
  Pencil,
  Printer,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";

/* =========================================================
   KONSTANTA
========================================================= */

const RETENTION_DAYS = 42;

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const WEEKDAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const WEEKDAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const UNIT_INFO = {
  JKK1: {
    code: "11081A",
    name: "Jambi Kuamang Kuning 1",
    workUnit: "KCP KUAMANG KUNING 1",
  },

  JKK2: {
    code: "11081B",
    name: "Jambi Kuamang Kuning 2",
    workUnit: "KCP KUAMANG KUNING 2",
  },
};

const NATIONAL_HOLIDAYS_2026 = {
  "2026-01-01": "Tahun Baru Masehi",
  "2026-01-16": "Isra Mikraj Nabi Muhammad SAW",
  "2026-02-17": "Tahun Baru Imlek",
  "2026-03-19": "Hari Suci Nyepi",
  "2026-03-21": "Hari Raya Idul Fitri",
  "2026-03-22": "Hari Raya Idul Fitri",
  "2026-04-03": "Wafat Yesus Kristus",
  "2026-04-05": "Hari Paskah",
  "2026-05-01": "Hari Buruh Internasional",
  "2026-05-14": "Kenaikan Yesus Kristus",
  "2026-05-27": "Hari Raya Idul Adha",
  "2026-05-31": "Hari Raya Waisak",
  "2026-06-01": "Hari Lahir Pancasila",
  "2026-06-16": "Tahun Baru Islam",
  "2026-08-17": "Hari Kemerdekaan Republik Indonesia",
  "2026-08-25": "Maulid Nabi Muhammad SAW",
  "2026-12-25": "Hari Raya Natal",
};

/* =========================================================
   HELPER
========================================================= */

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function formatDateLong(value) {
  const date = new Date(`${value}T00:00:00`);

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateShort(value) {
  const date = new Date(`${value}T00:00:00`);

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function getDefaultStartTime(value) {
  const date = new Date(`${value}T00:00:00`);
  const day = date.getDay();

  if (day === 0 || day === 6 || NATIONAL_HOLIDAYS_2026[value]) {
    return "07:30";
  }

  return "16:30";
}

function getRetentionLimit() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);

  limit.setDate(limit.getDate() - RETENTION_DAYS);

  return dateKey(limit);
}

/* =========================================================
   CALENDAR
========================================================= */

function getCalendarCells(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startDay = firstDay.getDay();

  const cells = [];

  for (let i = 0; i < startDay; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= lastDate; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function CalendarDay({ date, selected, today, holiday, hasOvertime, onClick }) {
  if (!date) {
    return <div className="aspect-square bg-zinc-50/50" aria-hidden="true" />;
  }

  const key = dateKey(date);

  const isSunday = date.getDay() === 0;
  const isSaturday = date.getDay() === 6;

  let background = "bg-white hover:bg-zinc-50";

  if (holiday || isSunday) {
    background = "bg-red-50 hover:bg-red-100";
  } else if (isSaturday) {
    background = "bg-amber-50 hover:bg-amber-100";
  }

  if (today && !selected) {
    background = "bg-blue-50 hover:bg-blue-100";
  }

  if (hasOvertime && !selected) {
    background = "bg-emerald-50 hover:bg-emerald-100";
  }

  if (selected) {
    background = "bg-zinc-900 text-white hover:bg-zinc-800";
  }

  return (
    <button
      type="button"
      onClick={() => onClick(key)}
      title={holiday || "Klik untuk melihat atau mengajukan lembur"}
      className={[
        "relative aspect-square min-w-0 border-r border-b border-zinc-200 p-1.5 text-left transition sm:p-2",
        background,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold sm:h-8 sm:w-8",
            selected
              ? "bg-white text-zinc-900"
              : holiday || isSunday
                ? "text-red-600"
                : isSaturday
                  ? "text-amber-700"
                  : "text-zinc-800",
            today && !selected ? "ring-2 ring-blue-500 ring-offset-1" : "",
          ].join(" ")}
        >
          {date.getDate()}
        </span>

        {hasOvertime && (
          <span
            className={[
              "mt-1 h-2 w-2 shrink-0 rounded-full",
              selected ? "bg-emerald-300" : "bg-emerald-500",
            ].join(" ")}
          />
        )}
      </div>

      <div className="mt-1">
        {holiday && (
          <div
            className={[
              "line-clamp-2 text-[8px] font-medium leading-tight sm:text-[9px]",
              selected ? "text-red-200" : "text-red-600",
            ].join(" ")}
          >
            {holiday}
          </div>
        )}

        {hasOvertime && (
          <div
            className={[
              "mt-0.5 text-[8px] font-semibold sm:text-[9px]",
              selected ? "text-emerald-200" : "text-emerald-700",
            ].join(" ")}
          >
            Lembur
          </div>
        )}
      </div>
    </button>
  );
}

/* =========================================================
   SPKL
   VISUAL DIPERTAHANKAN DARI KODE AWAL USER
========================================================= */

function SpklPage({ date, records, master, unit }) {
  const info = UNIT_INFO[unit] || UNIT_INFO.JKK1;

  const supervisor = master?.supervisor || {};

  const mkaList = Array.isArray(master?.mka) ? master.mka : [];

  const branchManager = master?.branchManager || {};

  const sortedRecords = [...records].sort((a, b) =>
    (a.jam_mulai || "").localeCompare(b.jam_mulai || ""),
  );

  const workRows =
    sortedRecords.length > 0
      ? sortedRecords.map((record, index) => {
          const mka = mkaList.find((person) => person.id === record.mka_id);

          return {
            no: index + 1,
            nip: mka?.nip || "-",
            name: mka?.name || "-",
            position: mka?.position || "MKA",
            time: `${record.jam_mulai || "-"} - ${record.jam_selesai || "-"}`,
            work: record.pekerjaan || "-",
          };
        })
      : mkaList.map((mka, index) => ({
          no: index + 1,
          nip: mka.nip || "-",
          name: mka.name || "-",
          position: mka.position || "MKA",
          time: "-",
          work: "-",
        }));

  const safeRows =
    workRows.length > 0
      ? workRows
      : [
          {
            no: 1,
            nip: "-",
            name: "-",
            position: "MKA",
            time: "-",
            work: "-",
          },
        ];

  const dateObject = new Date(`${date}T00:00:00`);

  const weekday = WEEKDAYS[dateObject.getDay()];

  return (
    <section className="spkl-page">
      <div className="spkl-header">
        <div className="spkl-logo-area">
          <img
            src="/images/mandiri-logo.png"
            alt="Bank Mandiri"
            className="spkl-logo"
          />
        </div>

        <div className="spkl-title-wrap">
          <h1>SURAT PERINTAH KERJA LEMBUR</h1>
        </div>

        <div className="spkl-header-right" />
      </div>

      <p className="spkl-intro">
        Sehubungan dengan adanya tugas pekerjaan dan/atau kegiatan kedinasan
        yang tidak dapat ditunda / ditangguhkan, sehingga membutuhkan
        penyelesaian dengan segera, maka dengan ini kami memerintahkan kepada
        pegawai yang tercantum dalam daftar di bawah ini untuk melaksanakan
        Kerja Lembur pada :
      </p>

      <div className="spkl-date-info">
        <div>
          <span>Hari</span>
          <strong>:</strong>
          <span>{weekday}</span>
        </div>

        <div>
          <span>Tanggal</span>
          <strong>:</strong>
          <span>{formatDateLong(date)}</span>
        </div>

        <div>
          <span>Sifat Pekerjaan</span>
          <strong>:</strong>
          <span>Non Rutin</span>
        </div>
      </div>

      <h2 className="spkl-section-title">I. Petugas Kerja Lembur</h2>

      <table className="spkl-table spkl-table-workers">
        <thead>
          <tr>
            <th className="col-no">NO.</th>
            <th className="col-nip">NIP</th>
            <th className="col-name">NAMA</th>
            <th className="col-position">JABATAN</th>
            <th className="col-unit">UNIT KERJA</th>
            <th className="col-time">WAKTU LEMBUR</th>
            <th className="col-work">PEKERJAAN YANG HARUS DISELESAIKAN</th>
            <th className="col-sign">TANDA TANGAN</th>
          </tr>
        </thead>

        <tbody>
          {safeRows.map((row) => (
            <tr key={`${row.no}-${row.nip}-${row.name}`}>
              <td className="text-center">{row.no}</td>
              <td>{row.nip}</td>
              <td className="font-semibold">{row.name}</td>
              <td>{row.position}</td>
              <td>{info.workUnit}</td>
              <td className="whitespace-nowrap text-center">{row.time}</td>
              <td>{row.work}</td>
              <td className="signature-cell" />
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="spkl-section-title spkl-supervisor-title">
        II. PENGAWAS KERJA LEMBUR
      </h2>

      <table className="spkl-table spkl-table-supervisor">
        <thead>
          <tr>
            <th className="col-no">NO.</th>
            <th className="col-nip">NIP</th>
            <th className="col-name">NAMA</th>
            <th className="col-position">JABATAN</th>
            <th className="col-unit">UNIT KERJA</th>
            <th className="col-sign">TANDA TANGAN</th>
            <th className="col-note">CATATAN PENGAWASAN *)</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="text-center">1</td>
            <td>{supervisor.nip || "-"}</td>
            <td className="font-semibold">{supervisor.name || "-"}</td>
            <td>{supervisor.position || "-"}</td>
            <td>{info.workUnit}</td>
            <td className="signature-cell supervisor-signature" />
            <td>Dilaksanakan sesuai dengan baik</td>
          </tr>
        </tbody>
      </table>

      <div className="spkl-note">
        *) Penilaian hasil Kerja Lembur yang diisi pada akhir Kerja Lembur atau
        bagi Atasan Langsung : satu hari berikutnya.
      </div>

      <div className="spkl-approval">
        <div className="spkl-location">
          Kuamang Kuning, {formatDateLong(date)}
        </div>

        <div className="spkl-knowing">Mengetahui,</div>

        <div className="spkl-bank">PT Bank Mandiri (Persero) Tbk</div>

        <div className="spkl-branch">KCP KUAMANG KUNING</div>

        <div className="spkl-manager-sign" />
        <div className="spkl-manager-sign" />

        <div className="spkl-manager-name">{branchManager.name || "-"}</div>

        <div className="spkl-manager-position">
          {branchManager.position || "Branch Manager"}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function PengajuanLemburMkaPage() {
  const { activeUnit } = useUnit();

  const today = useMemo(() => dateKey(new Date()), []);

  const todayDate = useMemo(() => new Date(`${today}T00:00:00`), [today]);

  const [selectedDate, setSelectedDate] = useState(today);

  const [calendarMonth, setCalendarMonth] = useState(todayDate.getMonth());

  const [calendarYear, setCalendarYear] = useState(todayDate.getFullYear());

  const [unitId, setUnitId] = useState(null);

  const [overtime, setOvertime] = useState([]);

  const [master, setMaster] = useState({
    supervisor: {
      name: "",
      nip: "",
      position: "",
      id: null,
    },

    mka: [],

    branchManager: {
      name: "",
      nip: "",
      position: "Branch Manager",
      id: null,
    },
  });

  const [modal, setModal] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);

  const previewViewportRef = useRef(null);

  const [previewWidth, setPreviewWidth] = useState(0);

  const [form, setForm] = useState({
    startTime: getDefaultStartTime(today),
    endTime: "20:00",
    reason: "",
  });

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const currentUnit = activeUnit?.value || "JKK1";

  const currentUnitInfo = UNIT_INFO[currentUnit] || UNIT_INFO.JKK1;

  /* =========================================================
     LOAD MASTER + LEMBUR
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        /* =====================================================
           1. CARI UNIT BERDASARKAN KODE JKK1 / JKK2
        ===================================================== */

        const { data: unit, error: unitError } = await supabase
          .from("unit")
          .select("id, nama_unit, kode_unit, kode_legacy")
          .eq("kode_unit", currentUnit)
          .single();

        if (unitError) {
          throw unitError;
        }

        if (!unit) {
          throw new Error(`Unit ${currentUnit} tidak ditemukan.`);
        }

        if (cancelled) return;

        setUnitId(unit.id);

        /* =====================================================
           2. MASTER PEGAWAI UNIT
        ===================================================== */

        const { data: unitPegawai, error: pegawaiError } = await supabase
          .from("pegawai")
          .select("id, nama, nip, jabatan, jenis_pegawai, unit_id, aktif")
          .eq("unit_id", unit.id)
          .eq("aktif", true)
          .order("nama", { ascending: true });

        if (pegawaiError) {
          throw pegawaiError;
        }

        const pengawas =
          unitPegawai?.find((item) => item.jenis_pegawai === "PENGAWAS") ||
          null;

        const mkaList =
          unitPegawai?.filter((item) => item.jenis_pegawai === "MKA") || [];

        /* =====================================================
           3. BRANCH MANAGER GLOBAL
              unit_id NULL
        ===================================================== */

        const { data: branchManagers, error: bmError } = await supabase
          .from("pegawai")
          .select("id, nama, nip, jabatan, jenis_pegawai, unit_id, aktif")
          .eq("jenis_pegawai", "BRANCH_MANAGER")
          .eq("aktif", true)
          .is("unit_id", null)
          .order("nama", { ascending: true });

        if (bmError) {
          throw bmError;
        }

        const branchManager = branchManagers?.[0] || null;

        /* =====================================================
           4. MASTER
        ===================================================== */

        const nextMaster = {
          supervisor: {
            id: pengawas?.id || null,
            name: pengawas?.nama || "",
            nip: pengawas?.nip || "",
            position: pengawas?.jabatan || "",
          },

          mka: mkaList.map((item) => ({
            id: item.id,
            name: item.nama || "",
            nip: item.nip || "",
            position: item.jabatan || "MKA",
          })),

          branchManager: {
            id: branchManager?.id || null,
            name: branchManager?.nama || "",
            nip: branchManager?.nip || "",
            position: branchManager?.jabatan || "Branch Manager",
          },
        };

        if (!cancelled) {
          setMaster(nextMaster);
        }

        /* =====================================================
           5. DATA LEMBUR 42 HARI
        ===================================================== */

        const retentionLimit = getRetentionLimit();

        const { data: lemburData, error: lemburError } = await supabase
          .from("lembur_mka")
          .select(
            `
              id,
              unit_id,
              mka_id,
              pengawas_id,
              tanggal,
              jam_mulai,
              jam_selesai,
              pekerjaan,
              created_at,
              updated_at
            `,
          )
          .eq("unit_id", unit.id)
          .gte("tanggal", retentionLimit)
          .order("tanggal", {
            ascending: true,
          })
          .order("jam_mulai", {
            ascending: true,
          });

        if (lemburError) {
          throw lemburError;
        }

        if (!cancelled) {
          setOvertime(lemburData || []);
        }
      } catch (loadError) {
        console.error(loadError);

        if (!cancelled) {
          setError(loadError?.message || "Gagal membaca data lembur.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentUnit]);

  /* =========================================================
     UKUR PREVIEW
  ========================================================= */

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    const element = previewViewportRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      setPreviewWidth(element.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [previewOpen]);

  /* =========================================================
     DATA BULAN
  ========================================================= */

  const monthRecords = useMemo(() => {
    return overtime
      .filter((item) => {
        const date = new Date(`${item.tanggal}T00:00:00`);

        return (
          date.getFullYear() === calendarYear &&
          date.getMonth() === calendarMonth
        );
      })
      .sort((a, b) => {
        if (a.tanggal !== b.tanggal) {
          return a.tanggal.localeCompare(b.tanggal);
        }

        return (a.jam_mulai || "").localeCompare(b.jam_mulai || "");
      });
  }, [overtime, calendarMonth, calendarYear]);

  const monthDates = useMemo(() => {
    return [...new Set(monthRecords.map((item) => item.tanggal))].sort();
  }, [monthRecords]);

  const calendarCells = useMemo(
    () => getCalendarCells(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );

  const selectedRecords = useMemo(() => {
    return overtime
      .filter((item) => item.tanggal === selectedDate)
      .sort((a, b) => (a.jam_mulai || "").localeCompare(b.jam_mulai || ""));
  }, [overtime, selectedDate]);

  /* =========================================================
     NAVIGASI BULAN
  ========================================================= */

  const goPreviousMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((year) => year - 1);
      return;
    }

    setCalendarMonth((month) => month - 1);
  };

  const goNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((year) => year + 1);
      return;
    }

    setCalendarMonth((month) => month + 1);
  };

  const goToday = () => {
    const date = new Date();

    const key = dateKey(date);

    setCalendarYear(date.getFullYear());

    setCalendarMonth(date.getMonth());

    setSelectedDate(key);
  };

  /* =========================================================
     KLIK KALENDER
  ========================================================= */

  const handleCalendarClick = (date) => {
    setSelectedDate(date);

    const existing = overtime.filter((item) => item.tanggal === date);

    if (existing.length > 0) {
      setModal({
        type: "detail",
        date,
      });

      return;
    }

    setForm({
      startTime: getDefaultStartTime(date),
      endTime: "20:00",
      reason: "",
    });

    setModal({
      type: "form",
      date,
    });
  };

  /* =========================================================
     EDIT
  ========================================================= */

  const handleEdit = (record) => {
    setSelectedDate(record.tanggal);

    setForm({
      startTime: record.jam_mulai || getDefaultStartTime(record.tanggal),

      endTime: record.jam_selesai || "20:00",

      reason: record.pekerjaan || "",
    });

    setModal({
      type: "edit",
      date: record.tanggal,
      recordId: record.id,
    });
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async (recordId) => {
    const target = overtime.find((item) => item.id === recordId);

    if (!target) {
      return;
    }

    const confirmed = window.confirm(
      `Hapus data lembur tanggal ${formatDateLong(target.tanggal)}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { error: deleteError } = await supabase
        .from("lembur_mka")
        .delete()
        .eq("id", recordId);

      if (deleteError) {
        throw deleteError;
      }

      setOvertime((current) => current.filter((item) => item.id !== recordId));

      setModal(null);
    } catch (deleteError) {
      console.error(deleteError);

      setError(deleteError?.message || "Gagal menghapus data lembur.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     SUBMIT FORM
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!unitId) {
      window.alert("Unit belum berhasil dibaca.");
      return;
    }

    if (!master?.mka || master.mka.length === 0) {
      window.alert(
        "MKA aktif untuk unit ini belum tersedia di Master Pegawai.",
      );
      return;
    }

    if (!master?.supervisor?.id) {
      window.alert(
        "Pengawas aktif untuk unit ini belum tersedia di Master Pegawai.",
      );
      return;
    }

    if (!form.startTime || !form.endTime) {
      return;
    }

    if (form.endTime <= form.startTime) {
      window.alert("Jam selesai harus lebih besar dari jam mulai.");

      return;
    }

    if (!form.reason.trim()) {
      window.alert("Pekerjaan wajib diisi.");

      return;
    }

    try {
      setSaving(true);
      setError("");

      /* =====================================================
         EDIT
      ===================================================== */

      if (modal?.type === "edit") {
        const { data: updated, error: updateError } = await supabase
          .from("lembur_mka")
          .update({
            jam_mulai: form.startTime,

            jam_selesai: form.endTime,

            pekerjaan: form.reason.trim(),

            updated_at: new Date().toISOString(),
          })
          .eq("id", modal.recordId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setOvertime((current) =>
          current.map((item) =>
            item.id === modal.recordId
              ? {
                  ...item,
                  ...updated,
                }
              : item,
          ),
        );

        setModal(null);

        return;
      }

      /* =====================================================
         CEK SATU LEMBUR PER TANGGAL
      ===================================================== */

      const { data: existing, error: existingError } = await supabase
        .from("lembur_mka")
        .select("id")
        .eq("unit_id", unitId)
        .eq("tanggal", modal.date)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing) {
        window.alert("Tanggal tersebut sudah memiliki pengajuan lembur.");

        setModal(null);

        return;
      }

      /* =====================================================
         TAMBAH
         SATU MKA AKTIF PER UNIT
      ===================================================== */

      const mka = master.mka[0];

      const { data: inserted, error: insertError } = await supabase
        .from("lembur_mka")
        .insert({
          unit_id: unitId,

          mka_id: mka.id,

          pengawas_id: master.supervisor.id,

          tanggal: modal.date,

          jam_mulai: form.startTime,

          jam_selesai: form.endTime,

          pekerjaan: form.reason.trim(),
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setOvertime((current) =>
        [...current, inserted].sort((a, b) => {
          if (a.tanggal !== b.tanggal) {
            return a.tanggal.localeCompare(b.tanggal);
          }

          return (a.jam_mulai || "").localeCompare(b.jam_mulai || "");
        }),
      );

      setModal(null);
    } catch (submitError) {
      console.error(submitError);

      setError(submitError?.message || "Gagal menyimpan data lembur.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     RECORD PER TANGGAL
  ========================================================= */

  const getRecordsForDate = (date) => {
    return overtime
      .filter((item) => item.tanggal === date)
      .sort((a, b) => (a.jam_mulai || "").localeCompare(b.jam_mulai || ""));
  };

  /* =========================================================
     DOWNLOAD PDF
  ========================================================= */

  const handleDownloadPdf = async () => {
    const area = document.getElementById("spkl-pdf-area");

    if (!area || monthDates.length === 0) {
      window.alert("Belum ada data lembur pada bulan ini.");

      return;
    }

    try {
      const module = await import("jspdf-html2canvas");

      const html2PDF = module.default || module;

      const fileName = `SPKL ${MONTHS[
        calendarMonth
      ].toUpperCase()} ${calendarYear} - ${
        master?.mka?.[0]?.name || "MKA"
      }.pdf`;

      await html2PDF(area, {
        jsPDF: {
          format: "a4",
          orientation: "landscape",
          unit: "mm",
          margin: 0,
        },

        imageType: "image/jpeg",

        imageQuality: 1,

        output: fileName,

        html2canvas: {
          scale: 3,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1123,
          windowHeight: 794,
        },
      });
    } catch (pdfError) {
      console.error(pdfError);

      window.alert(
        "PDF belum dapat dibuat. Pastikan package jspdf-html2canvas sudah terpasang.",
      );
    }
  };

  /* =========================================================
     PRINT
  ========================================================= */

  const handlePrint = () => {
    if (monthDates.length === 0) {
      window.alert("Belum ada data lembur pada bulan ini.");

      return;
    }

    const oldTitle = document.title;

    document.title = `SPKL ${MONTHS[
      calendarMonth
    ].toUpperCase()} ${calendarYear}`;

    window.print();

    setTimeout(() => {
      document.title = oldTitle;
    }, 1000);
  };

  /* =========================================================
     SCALE PREVIEW
  ========================================================= */

  const previewScale = previewWidth > 0 ? Math.min(1, previewWidth / 1123) : 1;

  const previewPageWidth = 1123 * previewScale;

  const previewPageHeight = 794 * previewScale;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1500px] space-y-5">
        {/* HEADER */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
              <Clock3 size={17} />
              Operasional
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Pengajuan Lembur MKA
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Klik tanggal pada kalender untuk mengajukan atau melihat lembur.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={monthDates.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileText size={17} />
              Preview SPKL
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={monthDates.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileDown size={17} />
              Unduh SPKL
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={monthDates.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer size={17} />
              Print Langsung
            </button>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* CALENDAR */}

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/80 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
                <CalendarDays size={20} />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Kalender Lembur
                </div>

                <div className="text-lg font-bold text-zinc-900">
                  {MONTHS[calendarMonth]} {calendarYear}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToday}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Hari ini
              </button>

              <button
                type="button"
                onClick={goPreviousMonth}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={goNextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-b border-zinc-200 px-4 py-3 text-xs font-medium text-zinc-500 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-red-100 ring-1 ring-red-200" />
              Tanggal merah
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-200" />
              Sabtu
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-blue-100 ring-1 ring-blue-200" />
              Hari ini
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-200" />
              Ada lembur
            </div>
          </div>

          <div className="flex justify-center px-3 py-5 sm:px-5 sm:py-6">
            <div className="w-full max-w-[590px] overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
              <div className="grid grid-cols-7 bg-zinc-100/90">
                {WEEKDAYS_SHORT.map((day, index) => (
                  <div
                    key={day}
                    className={[
                      "border-r border-b border-zinc-200 px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide sm:text-xs",
                      index === 0
                        ? "text-red-600"
                        : index === 6
                          ? "text-amber-700"
                          : "text-zinc-600",
                    ].join(" ")}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarCells.map((date, index) => {
                  if (!date) {
                    return (
                      <CalendarDay
                        key={`empty-${index}`}
                        date={null}
                        onClick={() => {}}
                      />
                    );
                  }

                  const key = dateKey(date);

                  return (
                    <CalendarDay
                      key={key}
                      date={date}
                      selected={selectedDate === key}
                      today={today === key}
                      holiday={NATIONAL_HOLIDAYS_2026[key]}
                      hasOvertime={getRecordsForDate(key).length > 0}
                      onClick={handleCalendarClick}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* MONTHLY TABLE */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-zinc-900">
              Data Lembur {MONTHS[calendarMonth]} {calendarYear}
            </h2>

            <p className="text-sm text-zinc-500">
              Seluruh pengajuan lembur pada unit{" "}
              <span className="font-semibold text-zinc-700">
                {currentUnitInfo.name}
              </span>
              .
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Memuat data...
            </div>
          ) : monthRecords.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Belum ada data lembur pada bulan ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">Tanggal</th>

                    <th className="px-4 py-3">Waktu</th>

                    <th className="px-4 py-3">Pekerjaan</th>

                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {monthRecords.map((record) => (
                    <tr key={record.id} className="transition hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-800">
                        {formatDateShort(record.tanggal)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                        {record.jam_mulai} - {record.jam_selesai}
                      </td>

                      <td className="px-4 py-3 text-zinc-600">
                        {record.pekerjaan || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(record.id)}
                            disabled={saving}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* =====================================================
          FORM / EDIT MODAL
      ===================================================== */}

      {modal?.type === "form" || modal?.type === "edit" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  {modal.type === "edit" ? "Edit Lembur" : "Pengajuan Lembur"}
                </div>

                <h2 className="mt-1 text-xl font-bold text-zinc-900">
                  {formatDateLong(modal.date)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
                <div>
                  <span className="font-semibold">Unit:</span>{" "}
                  {currentUnitInfo.name}
                </div>

                <div className="mt-1">
                  <span className="font-semibold">MKA:</span>{" "}
                  {master.mka?.map((item) => item.name).join(", ") || "-"}
                </div>

                <div className="mt-1">
                  <span className="font-semibold">Pengawas:</span>{" "}
                  {master.supervisor?.name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-zinc-700">
                    Jam Mulai
                  </span>

                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startTime: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-zinc-700">
                    Jam Selesai
                  </span>

                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endTime: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-zinc-700">
                  Catatan / Pekerjaan
                </span>

                <textarea
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Tuliskan pekerjaan yang harus diselesaikan..."
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
                />
              </label>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : modal.type === "edit"
                      ? "Simpan Perubahan"
                      : "Ajukan Lembur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {modal?.type === "detail" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Detail Lembur
                </div>

                <h2 className="mt-1 text-xl font-bold text-zinc-900">
                  {formatDateLong(modal.date)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={19} />
              </button>
            </div>

            <div className="divide-y divide-zinc-100">
              {selectedRecords.map((record, index) => {
                const mka = master.mka.find(
                  (item) => item.id === record.mka_id,
                );

                return (
                  <div key={record.id} className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {index + 1}
                        </span>

                        <div>
                          <div className="font-bold text-zinc-900">
                            {mka?.name}
                          </div>

                          <div className="text-xs text-zinc-500">
                            {mka?.position} · Data dari Master Pegawai
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(record)}
                          className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          disabled={saving}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Hapus"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-zinc-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Waktu
                        </div>

                        <div className="mt-1 font-semibold text-zinc-800">
                          {record.jam_mulai} - {record.jam_selesai}
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Pekerjaan
                        </div>

                        <div className="mt-1 font-semibold text-zinc-800">
                          {record.pekerjaan || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          PREVIEW SPKL
      ===================================================== */}

      {previewOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950/80">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950 px-4 py-3 text-white">
            <div>
              <div className="text-sm font-bold">
                Preview SPKL — {MONTHS[calendarMonth]} {calendarYear}
              </div>

              <div className="text-xs text-zinc-400">
                {monthDates.length} halaman A4 landscape
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-100"
              >
                <FileDown size={15} />
                Unduh
              </button>

              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 sm:p-6">
            <div ref={previewViewportRef} className="w-full">
              <div className="flex w-full flex-col items-center gap-6">
                {monthDates.map((date) => (
                  <div
                    key={date}
                    className="relative shrink-0"
                    style={{
                      width: previewPageWidth,
                      height: previewPageHeight,
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 origin-top-left"
                      style={{
                        width: 1123,
                        height: 794,
                        transform: `scale(${previewScale})`,
                      }}
                    >
                      <SpklPage
                        date={date}
                        records={getRecordsForDate(date)}
                        master={master}
                        unit={currentUnit}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          HIDDEN PDF AREA
      ===================================================== */}

      <div
        id="spkl-pdf-area"
        className="spkl-hidden-pdf-area"
        aria-hidden="true"
      >
        {monthDates.map((date) => (
          <SpklPage
            key={date}
            date={date}
            records={getRecordsForDate(date)}
            master={master}
            unit={currentUnit}
          />
        ))}
      </div>

      {/* =====================================================
          STYLE SPKL
          SAMA DENGAN KODE AWAL
      ===================================================== */}

      <style jsx global>{`
        .spkl-page {
          width: 1123px;
          height: 794px;
          min-height: 794px;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          background: #ffffff;
          color: #111111;
          padding: 30px 40px 18px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          line-height: 1.35;
        }

        .spkl-header {
          width: 100%;
          min-height: 110px;
          display: grid;
          grid-template-columns: 180px 1fr 180px;
          align-items: start;
        }

        .spkl-logo-area {
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
        }

        .spkl-logo {
          display: block;
          width: 210px;
          height: auto;
          max-height: 105px;
          object-fit: contain;
          object-position: left top;
        }

        .spkl-title-wrap {
          min-width: 0;
          padding-top: 55px;
          text-align: center;
        }

        .spkl-title-wrap h1 {
          margin: 0;
          font-size: 24px;
          line-height: 1.15;
          font-weight: 700;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }

        .spkl-header-right {
          width: 100%;
        }

        .spkl-intro {
          margin: 11px 0 8px;
          font-size: 13.5px;
          line-height: 1.42;
          text-align: justify;
        }

        .spkl-date-info {
          margin-left: 27px;
          margin-bottom: 9px;
          display: grid;
          gap: 1px;
          font-size: 13px;
        }

        .spkl-date-info > div {
          display: grid;
          grid-template-columns: 112px 13px 1fr;
          align-items: baseline;
        }

        .spkl-date-info span:first-child {
          font-weight: 600;
        }

        .spkl-section-title {
          margin: 7px 0 5px;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 700;
        }

        .spkl-supervisor-title {
          margin-top: 9px;
        }

        .spkl-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 11.5px;
        }

        .spkl-table th,
        .spkl-table td {
          border: 1px solid #222222;
          padding: 5px 6px;
          vertical-align: middle;
          word-wrap: break-word;
          overflow-wrap: anywhere;
        }

        .spkl-table th {
          font-size: 10.5px;
          line-height: 1.18;
          font-weight: 700;
          text-align: center;
          background: #f7f7f7;
        }

        .spkl-table td {
          min-height: 36px;
        }

        .spkl-table-workers .col-no {
          width: 4%;
        }

        .spkl-table-workers .col-nip {
          width: 10%;
        }

        .spkl-table-workers .col-name {
          width: 13%;
        }

        .spkl-table-workers .col-position {
          width: 8%;
        }

        .spkl-table-workers .col-unit {
          width: 12%;
        }

        .spkl-table-workers .col-time {
          width: 11%;
        }

        .spkl-table-workers .col-work {
          width: 25%;
        }

        .spkl-table-workers .col-sign {
          width: 17%;
        }

        .spkl-table-supervisor .col-no {
          width: 4%;
        }

        .spkl-table-supervisor .col-nip {
          width: 12%;
        }

        .spkl-table-supervisor .col-name {
          width: 16%;
        }

        .spkl-table-supervisor .col-position {
          width: 12%;
        }

        .spkl-table-supervisor .col-unit {
          width: 15%;
        }

        .spkl-table-supervisor .col-sign {
          width: 17%;
        }

        .spkl-table-supervisor .col-note {
          width: 24%;
        }

        .signature-cell {
          height: 40px;
        }

        .supervisor-signature {
          height: 42px;
        }

        .spkl-note {
          margin-top: 5px;
          font-size: 10.5px;
          line-height: 1.25;
        }

        .spkl-approval {
          width: 285px;
          margin-left: auto;
          margin-top: 7px;
          text-align: center;
          font-size: 11.5px;
          line-height: 1.22;
        }

        .spkl-location {
          margin-bottom: 3px;
        }

        .spkl-knowing {
          margin-bottom: 2px;
          font-weight: 700;
        }

        .spkl-bank {
          font-weight: 700;
        }

        .spkl-branch {
          font-weight: 700;
        }

        .spkl-manager-sign {
          height: 27px;
        }

        .spkl-manager-name {
          font-weight: 700;
          text-decoration: underline;
        }

        .spkl-manager-position {
          margin-top: 1px;
        }

        .spkl-hidden-pdf-area {
          position: fixed;
          left: -20000px;
          top: 0;
          width: 1123px;
          background: #ffffff;
          z-index: -1;
        }

        .spkl-hidden-pdf-area .spkl-page {
          display: block !important;
          width: 1123px !important;
          height: 794px !important;
          min-height: 794px !important;
          transform: none !important;
          margin: 0 !important;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          html,
          body {
            width: 297mm;
            height: 210mm;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          #spkl-pdf-area,
          #spkl-pdf-area * {
            visibility: visible !important;
          }

          #spkl-pdf-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 1123px !important;
            z-index: 999999 !important;
          }

          #spkl-pdf-area .spkl-page {
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
          }

          #spkl-pdf-area .spkl-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
