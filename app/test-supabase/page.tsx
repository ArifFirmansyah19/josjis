"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabasePage() {
  const [status, setStatus] = useState("Mengecek koneksi...");

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase
        .from("cabang")
        .select("id, nama_cabang")
        .limit(1);

      if (error) {
        console.error(error);
        setStatus("❌ Gagal konek: " + error.message);
        return;
      }

      console.log("Data Supabase:", data);
      setStatus("✅ Supabase berhasil terkoneksi!");
    }

    testConnection();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Test Supabase</h1>
      <p className="mt-4">{status}</p>
    </div>
  );
}
