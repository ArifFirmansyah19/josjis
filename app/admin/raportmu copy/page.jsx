/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useEffect, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";

import BookingModal from "./components/BookingModal";
import EasyCallModal from "./components/EasyCallModal";
import ExcelImportCard from "./components/ExcelImportCard";
import RaportMuProcessMenu from "./components/RaportMuProcessMenu";
import TwoATagihanModal from "./components/TwoATagihanModal";

import { getRaportMuData, saveRaportMuData } from "./services/raportMuStorage";

export default function RaportMuPage() {
  const [data, setData] = useState(null);
  const [excelFile, setExcelFile] = useState(null);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [twoAOpen, setTwoAOpen] = useState(false);
  const [easyCallOpen, setEasyCallOpen] = useState(false);

  useEffect(() => {
    setData(getRaportMuData());
  }, []);

  function handleImport(importData) {
    const nextData = {
      ...importData,
      updatedAt: new Date().toISOString(),
    };

    try {
      saveRaportMuData(nextData);
      setData(nextData);
    } catch (error) {
      console.error("Gagal menyimpan RaportMU:", error);

      window.alert(error?.message || "Data RaportMU gagal disimpan.");
    }
  }

  function handleFileReady(file) {
    setExcelFile(file);
  }

  function handleRemove() {
    const confirmed = window.confirm("Hapus data RaportMU hari ini?");

    if (!confirmed) return;

    setExcelFile(null);

    setBookingOpen(false);
    setTwoAOpen(false);
    setEasyCallOpen(false);

    const emptyData = {
      fileName: null,
      fileSize: null,
      importedAt: null,
      totalRows: 0,
      sheetCount: 0,
      sheets: [],
      status: "EMPTY",
      updatedAt: new Date().toISOString(),
    };

    setData(emptyData);
    saveRaportMuData(emptyData);
  }

  function handleOpenBooking() {
    if (!excelFile) {
      window.alert(
        "File Excel belum tersedia. Upload file RaportMU terlebih dahulu.",
      );

      return;
    }

    setBookingOpen(true);
  }

  function handleOpenTwoA() {
    if (!excelFile) {
      window.alert(
        "File Excel belum tersedia. Upload file RaportMU terlebih dahulu.",
      );

      return;
    }

    setTwoAOpen(true);
  }

  function handleOpenEasyCall() {
    if (!excelFile) {
      window.alert(
        "File Excel belum tersedia. Upload file RaportMU terlebih dahulu.",
      );

      return;
    }

    setEasyCallOpen(true);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            RaportMU
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Import, proses, dan export data RaportMU.
          </p>
        </div>

        <ExcelImportCard
          data={data}
          onImport={handleImport}
          onRemove={handleRemove}
          onFileReady={handleFileReady}
        />

        <RaportMuProcessMenu
          disabled={!excelFile}
          onBookingClick={handleOpenBooking}
          onTwoAClick={handleOpenTwoA}
          onEasyCallClick={handleOpenEasyCall}
        />

        <BookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          file={excelFile}
        />

        <TwoATagihanModal
          open={twoAOpen}
          onClose={() => setTwoAOpen(false)}
          file={excelFile}
        />

        <EasyCallModal
          open={easyCallOpen}
          onClose={() => setEasyCallOpen(false)}
          file={excelFile}
        />
      </div>
    </DashboardLayout>
  );
}
