"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cabang = {
  id: string;
  nama_cabang: string;
  kode_cabang: string | null;
};

type Unit = {
  id: string;
  nama_unit: string;
  kode_unit: string;
  kode_legacy: string;
};

type Pegawai = {
  id: string;
  nama: string;
  nip: string | null;
  jabatan: string;
  jenis_pegawai: string;
  unit_id: string | null;
};

type Mks = {
  id: string;
  kode_agen: string | null;
  pegawai_id: string;
  pengawas_id: string;
};

export default function TestMasterPage() {
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [unit, setUnit] = useState<Unit[]>([]);
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [mks, setMks] = useState<Mks[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      // =========================
      // CABANG
      // =========================
      const cabangResult = await supabase
        .from("cabang")
        .select("*")
        .order("nama_cabang");

      if (cabangResult.error) {
        setError("Gagal membaca tabel cabang: " + cabangResult.error.message);
        setLoading(false);
        return;
      }

      setCabang(cabangResult.data ?? []);

      // =========================
      // UNIT
      // =========================
      const unitResult = await supabase
        .from("unit")
        .select("*")
        .order("kode_unit");

      if (unitResult.error) {
        setError("Gagal membaca tabel unit: " + unitResult.error.message);
        setLoading(false);
        return;
      }

      setUnit(unitResult.data ?? []);

      // =========================
      // PEGAWAI
      // =========================
      const pegawaiResult = await supabase
        .from("pegawai")
        .select("*")
        .order("nama");

      if (pegawaiResult.error) {
        setError("Gagal membaca tabel pegawai: " + pegawaiResult.error.message);
        setLoading(false);
        return;
      }

      setPegawai(pegawaiResult.data ?? []);

      // =========================
      // MKS
      // =========================
      const mksResult = await supabase.from("mks").select("*");

      if (mksResult.error) {
        setError("Gagal membaca tabel mks: " + mksResult.error.message);
        setLoading(false);
        return;
      }

      setMks(mksResult.data ?? []);

      setLoading(false);
    }

    loadData();
  }, []);

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 text-black">
        <h1 className="text-2xl font-bold">Master Data JOSJIS</h1>

        <p className="mt-4">Membaca data dari Supabase...</p>
      </div>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8 text-black">
        <h1 className="text-2xl font-bold">Master Data JOSJIS</h1>

        <div className="mt-6 rounded-lg border border-red-500 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  // =========================
  // HELPER
  // =========================

  function getUnitName(unitId: string | null) {
    if (!unitId) return "-";

    const found = unit.find((item) => item.id === unitId);

    return found?.nama_unit ?? "-";
  }

  function getPegawaiName(id: string) {
    const found = pegawai.find((item) => item.id === id);

    return found?.nama ?? "-";
  }

  function getPegawaiNip(id: string) {
    const found = pegawai.find((item) => item.id === id);

    return found?.nip ?? "-";
  }

  // =========================
  // PAGE
  // =========================

  return (
    <div className="min-h-screen bg-white p-6 text-black md:p-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Master Data JOSJIS</h1>

        <p className="mt-2 text-gray-700">
          Data langsung dari Supabase melalui JOSJIS.
        </p>
      </div>

      {/* ========================= */}
      {/* CABANG */}
      {/* ========================= */}

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-bold">1. Cabang</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-black">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-black p-3 text-left">
                  Nama Cabang
                </th>

                <th className="border border-black p-3 text-left">
                  Kode Cabang
                </th>
              </tr>
            </thead>

            <tbody>
              {cabang.map((item) => (
                <tr key={item.id}>
                  <td className="border border-black p-3">
                    {item.nama_cabang}
                  </td>

                  <td className="border border-black p-3">
                    {item.kode_cabang ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================= */}
      {/* UNIT */}
      {/* ========================= */}

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-bold">2. Unit</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-black">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-black p-3 text-left">Nama Unit</th>

                <th className="border border-black p-3 text-left">Kode Unit</th>

                <th className="border border-black p-3 text-left">
                  Kode Legacy
                </th>
              </tr>
            </thead>

            <tbody>
              {unit.map((item) => (
                <tr key={item.id}>
                  <td className="border border-black p-3">{item.nama_unit}</td>

                  <td className="border border-black p-3">{item.kode_unit}</td>

                  <td className="border border-black p-3">
                    {item.kode_legacy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================= */}
      {/* PEGAWAI */}
      {/* ========================= */}

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-bold">3. Pegawai</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-black">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-black p-3 text-left">Nama</th>

                <th className="border border-black p-3 text-left">NIP</th>

                <th className="border border-black p-3 text-left">Jabatan</th>

                <th className="border border-black p-3 text-left">Jenis</th>

                <th className="border border-black p-3 text-left">Unit</th>
              </tr>
            </thead>

            <tbody>
              {pegawai.map((item) => (
                <tr key={item.id}>
                  <td className="border border-black p-3 font-medium">
                    {item.nama}
                  </td>

                  <td className="border border-black p-3">{item.nip ?? "-"}</td>

                  <td className="border border-black p-3">{item.jabatan}</td>

                  <td className="border border-black p-3">
                    {item.jenis_pegawai}
                  </td>

                  <td className="border border-black p-3">
                    {getUnitName(item.unit_id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================= */}
      {/* MKS */}
      {/* ========================= */}

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-bold">4. MKS</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-black">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-black p-3 text-left">Nama MKS</th>

                <th className="border border-black p-3 text-left">NIP</th>

                <th className="border border-black p-3 text-left">Kode Agen</th>

                <th className="border border-black p-3 text-left">Unit</th>

                <th className="border border-black p-3 text-left">Pengawas</th>

                <th className="border border-black p-3 text-left">
                  NIP Pengawas
                </th>
              </tr>
            </thead>

            <tbody>
              {mks.map((item) => {
                const mksPegawai = pegawai.find(
                  (p) => p.id === item.pegawai_id,
                );

                const pengawas = pegawai.find((p) => p.id === item.pengawas_id);

                return (
                  <tr key={item.id}>
                    <td className="border border-black p-3 font-medium">
                      {mksPegawai?.nama ?? "-"}
                    </td>

                    <td className="border border-black p-3">
                      {mksPegawai?.nip ?? "-"}
                    </td>

                    <td className="border border-black p-3">
                      {item.kode_agen ?? "-"}
                    </td>

                    <td className="border border-black p-3">
                      {getUnitName(mksPegawai?.unit_id ?? null)}
                    </td>

                    <td className="border border-black p-3">
                      {pengawas?.nama ?? "-"}
                    </td>

                    <td className="border border-black p-3">
                      {pengawas?.nip ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================= */}
      {/* RINGKASAN */}
      {/* ========================= */}

      <section className="border-t border-black pt-6">
        <h2 className="text-xl font-bold">Ringkasan</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="border border-black p-4">
            <div className="text-sm">Cabang</div>

            <div className="mt-1 text-2xl font-bold">{cabang.length}</div>
          </div>

          <div className="border border-black p-4">
            <div className="text-sm">Unit</div>

            <div className="mt-1 text-2xl font-bold">{unit.length}</div>
          </div>

          <div className="border border-black p-4">
            <div className="text-sm">Pegawai</div>

            <div className="mt-1 text-2xl font-bold">{pegawai.length}</div>
          </div>

          <div className="border border-black p-4">
            <div className="text-sm">MKS</div>

            <div className="mt-1 text-2xl font-bold">{mks.length}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
