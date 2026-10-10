"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, FileDown, FileText, Printer } from "lucide-react";
import KalenderLembur from "@/components/lembur-mka/kalender/KalenderLembur";
import SpklTemplate from "@/components/lembur-mka/spkl/SpklTemplate";
import SpklStyles from "@/components/lembur-mka/spkl/SpklStyles";
import SpklPreviewModal from "@/components/lembur-mka/spkl/SpklPreviewModal";
import TabelLembur from "@/components/lembur-mka/data/TabelLembur";
import ModalFormLembur from "@/components/lembur-mka/form/ModalFormLembur";
import ModalDetailLembur from "@/components/lembur-mka/form/ModalDetailLembur";
import {
  MONTHS,
  UNIT_INFO,
} from "@/components/lembur-mka/utils/lemburConstants";
import {
  dateKey,
  formatDateLong,
  getDefaultStartTime,
  getRetentionLimit,
  getCalendarCells,
} from "@/components/lembur-mka/utils/lemburHelpers";
import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";

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
    supervisor: { name: "", nip: "", position: "", id: null },
    mka: [],
    branchManager: { name: "", nip: "", position: "Branch Manager", id: null },
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

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const { data: unit, error: unitError } = await supabase
          .from("unit")
          .select("id, nama_unit, kode_unit, kode_legacy")
          .eq("kode_unit", currentUnit)
          .single();
        if (unitError) throw unitError;
        if (!unit) throw new Error(`Unit ${currentUnit} tidak ditemukan.`);
        if (cancelled) return;
        setUnitId(unit.id);

        const { data: unitPegawai, error: pegawaiError } = await supabase
          .from("pegawai")
          .select(
            "id, nama, nip, jabatan, jenis_pegawai, unit_id, aktif, created_at",
          )
          .eq("unit_id", unit.id)
          .eq("aktif", true)
          .order("created_at", { ascending: true });
        if (pegawaiError) throw pegawaiError;

        const pengawas =
          unitPegawai?.find((item) => item.jenis_pegawai === "PENGAWAS") ||
          null;
        const mkaList =
          unitPegawai?.filter((item) => item.jenis_pegawai === "MKA") || [];

        const { data: branchManagers, error: bmError } = await supabase
          .from("pegawai")
          .select("id, nama, nip, jabatan, jenis_pegawai, unit_id, aktif")
          .eq("jenis_pegawai", "BRANCH_MANAGER")
          .eq("aktif", true)
          .is("unit_id", null)
          .order("nama", { ascending: true });
        if (bmError) throw bmError;

        const branchManager = branchManagers?.[0] || null;
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
            createdAt: item.created_at || null,
          })),
          branchManager: {
            id: branchManager?.id || null,
            name: branchManager?.nama || "",
            nip: branchManager?.nip || "",
            position: branchManager?.jabatan || "Branch Manager",
          },
        };
        if (!cancelled) setMaster(nextMaster);

        const retentionLimit = getRetentionLimit();
        const { data: lemburData, error: lemburError } = await supabase
          .from("lembur_mka")
          .select(
            `
            id,
            unit_id,
            mka_id,
            mka_nama,
            mka_nip,
            mka_jabatan,
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
          .order("tanggal", { ascending: true })
          .order("jam_mulai", { ascending: true });
        if (lemburError) throw lemburError;
        if (!cancelled) setOvertime(lemburData || []);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled)
          setError(loadError?.message || "Gagal membaca data lembur.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [currentUnit]);

  useEffect(() => {
    if (!previewOpen) return;
    const element = previewViewportRef.current;
    if (!element) return;
    const updateWidth = () => setPreviewWidth(element.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [previewOpen]);

  const monthRecords = useMemo(
    () =>
      overtime
        .filter((item) => {
          const date = new Date(`${item.tanggal}T00:00:00`);
          return (
            date.getFullYear() === calendarYear &&
            date.getMonth() === calendarMonth
          );
        })
        .sort((a, b) => {
          if (a.tanggal !== b.tanggal)
            return a.tanggal.localeCompare(b.tanggal);
          return (a.jam_mulai || "").localeCompare(b.jam_mulai || "");
        }),
    [overtime, calendarMonth, calendarYear],
  );

  const monthDates = useMemo(
    () => [...new Set(monthRecords.map((item) => item.tanggal))].sort(),
    [monthRecords],
  );

  const calendarCells = useMemo(
    () => getCalendarCells(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );

  const selectedRecords = useMemo(
    () =>
      overtime
        .filter((item) => item.tanggal === selectedDate)
        .sort((a, b) => (a.jam_mulai || "").localeCompare(b.jam_mulai || "")),
    [overtime, selectedDate],
  );

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

  const handleCalendarClick = (date) => {
    setSelectedDate(date);
    const existing = overtime.filter((item) => item.tanggal === date);
    if (existing.length > 0) {
      setModal({ type: "detail", date });
      return;
    }
    setForm({
      startTime: getDefaultStartTime(date),
      endTime: "20:00",
      reason: "",
    });
    setModal({ type: "form", date });
  };

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

  const handleDelete = async (recordId) => {
    const target = overtime.find((item) => item.id === recordId);
    if (!target) return;
    const confirmed = window.confirm(
      `Hapus data lembur tanggal ${formatDateLong(target.tanggal)}?`,
    );
    if (!confirmed) return;
    try {
      setSaving(true);
      setError("");
      const { error: deleteError } = await supabase
        .from("lembur_mka")
        .delete()
        .eq("id", recordId);
      if (deleteError) throw deleteError;
      setOvertime((current) => current.filter((item) => item.id !== recordId));
      setModal(null);
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError?.message || "Gagal menghapus data lembur.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!unitId) {
      window.alert("Unit belum berhasil dibaca.");
      return;
    }
    if (!master?.mka?.length) {
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
    if (!form.startTime || !form.endTime) return;
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
        if (updateError) throw updateError;
        setOvertime((current) =>
          current.map((item) =>
            item.id === modal.recordId ? { ...item, ...updated } : item,
          ),
        );
        setModal(null);
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from("lembur_mka")
        .select("id")
        .eq("unit_id", unitId)
        .eq("tanggal", modal.date)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        window.alert("Tanggal tersebut sudah memiliki pengajuan lembur.");
        setModal(null);
        return;
      }

      const mka = master.mka[master.mka.length - 1];
      const { data: inserted, error: insertError } = await supabase
        .from("lembur_mka")
        .insert({
          unit_id: unitId,
          mka_id: mka.id,
          mka_nama: mka.name,
          mka_nip: mka.nip,
          mka_jabatan: mka.position,
          pengawas_id: master.supervisor.id,
          tanggal: modal.date,
          jam_mulai: form.startTime,
          jam_selesai: form.endTime,
          pekerjaan: form.reason.trim(),
        })
        .select()
        .single();
      if (insertError) throw insertError;

      setOvertime((current) =>
        [...current, inserted].sort((a, b) => {
          if (a.tanggal !== b.tanggal)
            return a.tanggal.localeCompare(b.tanggal);
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

  const getRecordsForDate = (date) =>
    overtime
      .filter((item) => item.tanggal === date)
      .sort((a, b) => (a.jam_mulai || "").localeCompare(b.jam_mulai || ""));

  const handleDownloadPdf = async () => {
    const area = document.getElementById("spkl-pdf-area");
    if (!area || monthDates.length === 0) {
      window.alert("Belum ada data lembur pada bulan ini.");
      return;
    }
    try {
      const module = await import("jspdf-html2canvas");
      const html2PDF = module.default || module;
      const fileName = `SPKL ${MONTHS[calendarMonth].toUpperCase()} ${calendarYear} - ${master?.mka?.[master.mka.length - 1]?.name || "MKA"}.pdf`;
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

  const handlePrint = () => {
    if (monthDates.length === 0) {
      window.alert("Belum ada data lembur pada bulan ini.");
      return;
    }
    const oldTitle = document.title;
    document.title = `SPKL ${MONTHS[calendarMonth].toUpperCase()} ${calendarYear}`;
    window.print();
    setTimeout(() => {
      document.title = oldTitle;
    }, 1000);
  };

  const previewScale = previewWidth > 0 ? Math.min(1, previewWidth / 1123) : 1;
  const previewPageWidth = 1123 * previewScale;
  const previewPageHeight = 794 * previewScale;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1500px] space-y-5">
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

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <KalenderLembur
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          goToday={goToday}
          goPreviousMonth={goPreviousMonth}
          goNextMonth={goNextMonth}
          calendarCells={calendarCells}
          selectedDate={selectedDate}
          today={today}
          getRecordsForDate={getRecordsForDate}
          handleCalendarClick={handleCalendarClick}
        />

        <TabelLembur
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          currentUnitInfo={currentUnitInfo}
          loading={loading}
          monthRecords={monthRecords}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          saving={saving}
        />
      </div>

      <ModalFormLembur
        modal={modal}
        setModal={setModal}
        form={form}
        setForm={setForm}
        currentUnitInfo={currentUnitInfo}
        master={master}
        handleSubmit={handleSubmit}
        saving={saving}
      />

      <ModalDetailLembur
        modal={modal}
        setModal={setModal}
        selectedRecords={selectedRecords}
        master={master}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        saving={saving}
      />

      <SpklPreviewModal
        previewOpen={previewOpen}
        setPreviewOpen={setPreviewOpen}
        calendarMonth={calendarMonth}
        calendarYear={calendarYear}
        monthDates={monthDates}
        handleDownloadPdf={handleDownloadPdf}
        previewViewportRef={previewViewportRef}
        previewPageWidth={previewPageWidth}
        previewPageHeight={previewPageHeight}
        previewScale={previewScale}
        getRecordsForDate={getRecordsForDate}
        master={master}
        currentUnit={currentUnit}
      />

      <div
        id="spkl-pdf-area"
        className="spkl-hidden-pdf-area"
        aria-hidden="true"
      >
        {monthDates.map((date) => (
          <SpklTemplate
            key={date}
            date={date}
            records={getRecordsForDate(date)}
            master={master}
            unit={currentUnit}
          />
        ))}
      </div>

      <SpklStyles />
    </DashboardLayout>
  );
}
