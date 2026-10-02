"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";
import { supabase } from "@/lib/supabase";

import {
  Archive,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

const SLOT_ORDER = ["1-A", "1-B", "1-C", "1-D", "2-A", "2-B", "2-C", "2-D"];

export default function LokerPage() {
  const { activeUnit } = useUnit();

  const [unitData, setUnitData] = useState(null);
  const [lokerData, setLokerData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [editingLoker, setEditingLoker] = useState(null);

  async function loadData(showRefresh = false) {
    if (!activeUnit?.value) {
      setUnitData(null);
      setLokerData([]);
      setLoading(false);
      return;
    }

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      // --------------------------------------------------
      // UNIT AKTIF
      // --------------------------------------------------

      const { data: currentUnit, error: unitError } = await supabase
        .from("unit")
        .select(
          "id, nama_unit, kode_unit, kode_legacy, kode_kawasan, cabang_id",
        )
        .eq("kode_unit", activeUnit.value)
        .maybeSingle();

      if (unitError) throw unitError;

      if (!currentUnit) {
        setUnitData(null);
        setLokerData([]);
        setError("Unit aktif tidak ditemukan.");
        return;
      }

      setUnitData(currentUnit);

      // --------------------------------------------------
      // LOKER
      // --------------------------------------------------

      const { data: lokerRows, error: lokerError } = await supabase
        .from("loker")
        .select(
          `
            id,
            unit_id,
            nomor_loker,
            kode_slot,
            aktif,
            created_at,
            updated_at
          `,
        )
        .eq("unit_id", currentUnit.id)
        .order("nomor_loker", { ascending: true })
        .order("kode_slot", { ascending: true });

      if (lokerError) throw lokerError;

      const lokerIds = (lokerRows || []).map((item) => item.id);

      let keteranganRows = [];

      if (lokerIds.length > 0) {
        const { data, error: keteranganError } = await supabase
          .from("loker_keterangan")
          .select(
            `
              id,
              loker_id,
              urutan,
              keterangan,
              updated_by,
              created_at,
              updated_at
            `,
          )
          .in("loker_id", lokerIds)
          .order("urutan", { ascending: true });

        if (keteranganError) throw keteranganError;

        keteranganRows = data || [];
      }

      // --------------------------------------------------
      // MERGE
      // --------------------------------------------------

      const merged = (lokerRows || [])
        .map((loker) => ({
          ...loker,
          keterangan: keteranganRows
            .filter((item) => item.loker_id === loker.id)
            .sort((a, b) => a.urutan - b.urutan),
        }))
        .sort(
          (a, b) =>
            SLOT_ORDER.indexOf(a.kode_slot) - SLOT_ORDER.indexOf(b.kode_slot),
        );

      setLokerData(merged);
    } catch (err) {
      console.error("Gagal mengambil data loker:", err);

      setError(err?.message || "Gagal mengambil data loker dari database.");

      setLokerData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeUnit?.value]);

  const totalKeterangan = useMemo(
    () =>
      lokerData.reduce((total, loker) => total + loker.keterangan.length, 0),
    [lokerData],
  );

  async function handleSaveKeterangan(loker, values) {
    setSaving(true);
    setError("");

    try {
      const cleanValues = values
        .map((value, index) => ({
          urutan: index + 1,
          keterangan: value.trim(),
        }))
        .filter((item) => item.keterangan);

      // Hapus keterangan lama
      const { error: deleteError } = await supabase
        .from("loker_keterangan")
        .delete()
        .eq("loker_id", loker.id);

      if (deleteError) throw deleteError;

      // Masukkan keterangan baru
      if (cleanValues.length > 0) {
        const payload = cleanValues.map((item) => ({
          loker_id: loker.id,
          urutan: item.urutan,
          keterangan: item.keterangan,
          updated_by: null,
          updated_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
          .from("loker_keterangan")
          .insert(payload);

        if (insertError) throw insertError;
      }

      await loadData(true);

      setEditingLoker(null);
    } catch (err) {
      console.error("Gagal menyimpan keterangan loker:", err);

      setError(err?.message || "Gagal menyimpan keterangan loker.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleLoker(loker) {
    const nextStatus = !loker.aktif;

    const confirmed = window.confirm(
      `${nextStatus ? "Aktifkan" : "Nonaktifkan"} loker ${loker.kode_slot}?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      const { error: updateError } = await supabase
        .from("loker")
        .update({
          aktif: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", loker.id);

      if (updateError) throw updateError;

      await loadData(true);
    } catch (err) {
      console.error(err);

      setError(err?.message || "Gagal mengubah status loker.");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Archive className="h-4 w-4" />
              Master Data
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Loker
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Pemetaan lokasi fisik agunan di{" "}
              <span className="font-medium text-zinc-700">
                {unitData?.nama_unit || activeUnit?.value || "-"}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* SUMMARY */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryCard label="Total Slot" value={lokerData.length} />

            <SummaryCard
              label="Slot Aktif"
              value={lokerData.filter((item) => item.aktif).length}
            />

            <SummaryCard label="Total Keterangan" value={totalKeterangan} />
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CONTENT */}
        {loading ? (
          <LoadingCards />
        ) : lokerData.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* LOKER 1 */}
            <LokerGroup
              title="Loker 1"
              items={lokerData.filter((item) => item.nomor_loker === 1)}
              onEdit={setEditingLoker}
              onToggle={handleToggleLoker}
            />

            {/* LOKER 2 */}
            <LokerGroup
              title="Loker 2"
              items={lokerData.filter((item) => item.nomor_loker === 2)}
              onEdit={setEditingLoker}
              onToggle={handleToggleLoker}
            />
          </>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingLoker && (
        <EditKeteranganModal
          loker={editingLoker}
          saving={saving}
          onClose={() => {
            if (!saving) setEditingLoker(null);
          }}
          onSave={handleSaveKeterangan}
        />
      )}
    </DashboardLayout>
  );
}

/* =========================================================
   LOKER GROUP
========================================================= */

function LokerGroup({ title, items, onEdit, onToggle }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-zinc-900" />

        <div>
          <h2 className="font-semibold text-zinc-900">{title}</h2>

          <p className="text-xs text-zinc-500">{items.length} slot</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((loker) => (
          <LokerCard
            key={loker.id}
            loker={loker}
            onEdit={() => onEdit(loker)}
            onToggle={() => onToggle(loker)}
          />
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   LOKER CARD
========================================================= */

function LokerCard({ loker, onEdit, onToggle }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        loker.aktif ? "border-zinc-200" : "border-zinc-200 opacity-60"
      }`}
    >
      {/* TOP */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold tracking-tight text-zinc-900">
            {loker.kode_slot}
          </div>

          <div className="mt-0.5 text-xs text-zinc-500">
            Loker {loker.nomor_loker}
          </div>
        </div>

        <span
          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
            loker.aktif
              ? "bg-emerald-50 text-emerald-700"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {loker.aktif ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      {/* KETERANGAN */}
      <div className="mt-4 min-h-[110px]">
        {loker.keterangan.length === 0 ? (
          <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 text-center text-xs text-zinc-400">
            Belum ada keterangan
          </div>
        ) : (
          <div className="space-y-2">
            {loker.keterangan.map((item) => (
              <div
                key={item.id}
                className="flex gap-2 rounded-lg bg-zinc-50 px-3 py-2"
              >
                <span className="shrink-0 text-xs font-semibold text-zinc-400">
                  {item.urutan}.
                </span>

                <p className="text-xs leading-5 text-zinc-700">
                  {item.keterangan}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTION */}
      <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          {loker.aktif ? "Nonaktifkan" : "Aktifkan"}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   EDIT MODAL
========================================================= */

function EditKeteranganModal({ loker, saving, onClose, onSave }) {
  const initialValues = Array.from(
    { length: 4 },
    (_, index) =>
      loker.keterangan.find((item) => item.urutan === index + 1)?.keterangan ||
      "",
  );

  const [values, setValues] = useState(initialValues);

  function updateValue(index, value) {
    setValues((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(loker, values);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-zinc-900">
              Loker {loker.kode_slot}
            </h2>

            <p className="mt-0.5 text-xs text-zinc-500">
              Maksimal 4 keterangan
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            {values.map((value, index) => (
              <div key={index}>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
                  Keterangan {index + 1}
                </label>

                <textarea
                  value={value}
                  onChange={(event) => updateValue(index, event.target.value)}
                  rows={3}
                  placeholder={
                    index === 0
                      ? "Contoh: Agunan lunas"
                      : "Keterangan tambahan..."
                  }
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                />
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   SUMMARY
========================================================= */

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs text-zinc-500">{label}</div>

      <div className="mt-1 text-xl font-bold text-zinc-900">{value}</div>
    </div>
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingCards() {
  return (
    <div className="space-y-6">
      {[1, 2].map((group) => (
        <div key={group}>
          <div className="mb-3 h-5 w-24 animate-pulse rounded bg-zinc-100" />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
      <Archive className="mx-auto h-8 w-8 text-zinc-300" />

      <h3 className="mt-3 text-sm font-semibold text-zinc-700">
        Loker belum tersedia
      </h3>

      <p className="mt-1 text-xs text-zinc-400">
        Pastikan data loker sudah dibuat untuk unit aktif.
      </p>
    </div>
  );
}
