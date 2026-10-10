"use client";

import { useState } from "react";

export default function CorrectionForm({ onSubmit }) {
  const [section, setSection] = useState("documents");

  const [message, setMessage] = useState("");

  function submit() {
    if (!message.trim()) {
      return;
    }

    onSubmit?.({
      id: `COR-${Date.now()}`,
      section,
      message: message.trim(),
      status: "OPEN",
      createdAt: new Date().toISOString(),
    });

    setMessage("");
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div>
        <h3 className="text-sm font-semibold">Kirim Permintaan Perbaikan</h3>

        <p className="mt-1 text-xs text-zinc-500">
          Pesan akan muncul di My Work SGP.
        </p>
      </div>

      <select
        value={section}
        onChange={(e) => setSection(e.target.value)}
        className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm"
      >
        <option value="loan">Informasi Pinjaman</option>

        <option value="debtor">Data Debitur</option>

        <option value="spouse">Data Pasangan</option>

        <option value="collateral">Agunan</option>

        <option value="documents">Dokumen</option>
      </select>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Contoh: Mohon lengkapi KTP pasangan dan FC sertifikat."
        className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-zinc-400"
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Kirim ke SGP
        </button>
      </div>
    </div>
  );
}
