"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useNamaCabang() {
  const [namaCabang, setNamaCabang] = useState("");
  const [loadingCabang, setLoadingCabang] = useState(true);

  useEffect(() => {
    let masihAktif = true;

    async function ambilNamaCabang() {
      try {
        const { data, error } = await supabase
          .from("cabang")
          .select("nama_cabang")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Gagal mengambil nama cabang:", error.message);
          return;
        }

        if (masihAktif) {
          setNamaCabang(data?.nama_cabang?.trim() || "");
        }
      } catch (error) {
        console.error("Kesalahan membaca cabang:", error);
      } finally {
        if (masihAktif) {
          setLoadingCabang(false);
        }
      }
    }

    ambilNamaCabang();

    return () => {
      masihAktif = false;
    };
  }, []);

  return {
    namaCabang,
    loadingCabang,
  };
}
