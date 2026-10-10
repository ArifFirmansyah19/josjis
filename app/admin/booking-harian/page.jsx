/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BookingHarian from "./components/BookingHarian";
import LaporanAktivasi from "./components/LaporanAktivasi";

const STORAGE_KEY = "josjis_booking_harian";
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function loadBookings() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.date !== todayKey()) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return Array.isArray(parsed.bookings) ? parsed.bookings : [];
  } catch {
    return [];
  }
}

export default function BookingHarianPage() {
  const [bookings, setBookings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setBookings(loadBookings());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: todayKey(), bookings }),
      );
    } catch (error) {
      console.error("Gagal menyimpan booking:", error);
    }
  }, [bookings, loaded]);

  function updateBookings(updater) {
    setBookings((current) =>
      typeof updater === "function" ? updater(current) : updater,
    );
    setRevision((value) => value + 1);
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-clip pb-8">
        <BookingHarian bookings={bookings} setBookings={updateBookings} />
        <LaporanAktivasi bookings={bookings} revision={revision} />
      </div>
    </DashboardLayout>
  );
}
