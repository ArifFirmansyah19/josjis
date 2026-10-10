/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardPaste,
  Copy,
  Check,
  FileText,
  MessageCircle,
  RotateCcw,
  WandSparkles,
} from "lucide-react";

const DRAFT_KEY = "josjis_laporan_aktivasi_draft";
const UNITS = [
  { value: "JKK1", label: "Kuamang Kuning 1" },
  { value: "JKK2", label: "Kuamang Kuning 2" },
];
const dateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dateID = (key) => {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
};
const unitLabel = (v) => UNITS.find((u) => u.value === v)?.label || "";
const digits = (v) => String(v ?? "").replace(/\D/g, "");
const juta = (v) =>
  `${((Number(digits(v)) || 0) / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} JT`;
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.date !== dateKey()) {
      localStorage.removeItem(DRAFT_KEY);
      return "";
    }
    return typeof parsed.text === "string" ? parsed.text : "";
  } catch {
    return "";
  }
}
function lastNumber(text) {
  return [...String(text || "").matchAll(/^\s*(\d+)\.\s+/gm)].reduce(
    (max, m) => Math.max(max, Number(m[1])),
    0,
  );
}
function activationLine(b, n) {
  return `${n}. ${String(b.debtorName || "")
    .trim()
    .toUpperCase()}/${String(b.applicationNo || "")
    .trim()
    .toUpperCase()}/${unitLabel(b.unit)}/${juta(b.limit)}`;
}
function defaultMessage(key) {
  return [
    `Mohon absensi nya Bpk/Ibu rencana aktivasi hari ini tgl ${dateID(key)}.`,
    "",
    "Nama2 debitur yg akan aktivasi hari ini sbb:",
    "*Nama Deb /No Aplikasi /Unit Mikro/Limit*",
    "",
    "Kami tunggu sampai jam 19.30 wib. terimakasih.",
  ].join("\n");
}
function appendLines(source, lines) {
  const text = String(source || "").trim();
  if (!text) return lines.join("\n");
  const regex =
    /^\s*(Kami tunggu sampai.*|Terima kasih\.?|Terimakasih\.?)\s*$/im;
  const match = regex.exec(text);
  if (match)
    return `${text.slice(0, match.index).trimEnd()}\n${lines.join("\n")}\n\n${text.slice(match.index).trimStart()}`;
  return `${text}\n${lines.join("\n")}`.trim();
}

export default function LaporanAktivasi({ bookings, revision }) {
  const today = useMemo(() => dateKey(), []);
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState("");
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setSource(loadDraft());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      if (source.trim())
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ date: today, text: source }),
        );
      else localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.error("Gagal menyimpan draft aktivasi:", e);
    }
  }, [source, loaded, today]);
  useEffect(() => {
    setGenerated(false);
    setPreview("");
  }, [revision]);
  useEffect(() => {
    function listener(event) {
      const b = bookings.find((x) => x.id === event.detail);
      if (b) generate([b]);
    }
    window.addEventListener("josjis-generate-activation", listener);
    return () =>
      window.removeEventListener("josjis-generate-activation", listener);
  });

  function generate(selected = bookings) {
    if (!selected.length)
      return alert(
        "Belum ada booking yang bisa ditambahkan ke laporan aktivasi.",
      );
    const incomplete = selected.filter(
      (b) =>
        !b.debtorName?.trim() || !b.applicationNo?.trim() || !unitLabel(b.unit),
    );
    if (incomplete.length)
      return alert(
        `${incomplete.length} data booking belum lengkap.\n\nPastikan nama debitur dan nomor aplikasi sudah diisi.`,
      );
    const base = (generated ? preview : source).trim() || defaultMessage(today);
    const n = lastNumber(base);
    setPreview(
      appendLines(
        base,
        selected.map((b, i) => activationLine(b, n + i + 1)),
      ),
    );
    setGenerated(true);
    document
      .getElementById("laporan-aktivasi")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function reset() {
    if (
      !window.confirm(
        "Reset laporan aktivasi?\n\nTeks input dan pratinjau akan dihapus. Data booking harian tetap tersimpan.",
      )
    )
      return;
    setSource("");
    setPreview("");
    setGenerated(false);
    setCopied(false);
    localStorage.removeItem(DRAFT_KEY);
  }
  function share() {
    if (!generated || !preview.trim())
      return alert("Generate laporan aktivasi terlebih dahulu.");
    const w = window.open(
      `https://wa.me/?text=${encodeURIComponent(preview)}`,
      "_blank",
      "noopener,noreferrer",
    );
    if (!w)
      return alert(
        "WhatsApp tidak terbuka. Izinkan pop-up browser, lalu coba lagi.",
      );
    if (
      window.confirm(
        "WhatsApp sudah dibuka.\n\nSetelah menekan Kirim di WhatsApp, pilih OK untuk mengosongkan laporan. Pilih Batal jika pesan belum dikirim.",
      )
    ) {
      setSource("");
      setPreview("");
      setGenerated(false);
      setCopied(false);
      localStorage.removeItem(DRAFT_KEY);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      alert("Gagal menyalin teks. Silakan salin langsung dari pratinjau.");
    }
  }

  return (
    <section
      id="laporan-aktivasi"
      className="scroll-mt-5 overflow-hidden rounded-2xl border border-zinc-100 bg-white"
    >
      <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Laporan Aktivasi</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Tempel teks awal, lalu Generate dari booking yang dipilih atau
              semua booking.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-3 sm:p-5">
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-semibold">
                1. Teks Laporan Awal
              </label>
              <span className="text-xs text-zinc-400">Input</span>
            </div>
            <textarea
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setGenerated(false);
                setPreview("");
              }}
              rows={12}
              placeholder={
                defaultMessage(today) +
                "\n\n1. SARIPUDIN/KUR11084B021026001/Kuamang Kuning 2/500 JT"
              }
              className="block min-h-[250px] w-full resize-y rounded-xl border border-zinc-200/80 px-3 py-3 text-sm leading-6 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
            />
            <p className="text-xs text-zinc-500">
              Teks input disimpan sementara di perangkat ini untuk hari yang
              sama.
            </p>
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">
                2. Pratinjau Laporan Aktivasi
              </label>
              {generated && (
                <span className="rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
                  Siap diperiksa
                </span>
              )}
            </div>
            {generated ? (
              <textarea
                value={preview}
                onChange={(e) => setPreview(e.target.value)}
                rows={12}
                className="block min-h-[250px] w-full resize-y rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 py-3 font-mono text-xs leading-6 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 sm:text-sm"
              />
            ) : (
              <div className="flex min-h-[250px] items-center justify-center rounded-xl border border-dashed bg-zinc-50 p-5 text-center">
                <div>
                  <FileText className="mx-auto h-8 w-8 text-zinc-300" />
                  <p className="mt-3 text-sm font-medium text-zinc-600">
                    Pratinjau akan muncul di sini
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Generate booking untuk menyusun laporan aktivasi.
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-zinc-500">
              Pratinjau dapat diperiksa dan diedit sebelum dibagikan.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => generate(bookings)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white"
          >
            <ClipboardPaste className="h-4 w-4" />
            Generate Semua Booking
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 px-4 hover:bg-red-50 text-sm text-red-600"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Laporan
          </button>
          {generated && (
            <>
              <button
                type="button"
                onClick={copy}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm hover:bg-zinc-50"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Tersalin" : "Salin Teks"}
              </button>
              <button
                type="button"
                onClick={share}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white sm:ml-auto"
              >
                <MessageCircle className="h-4 w-4" />
                Kirim ke WhatsApp
              </button>
            </>
          )}
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
          <strong>Perhatian:</strong> Reset Laporan hanya menghapus teks input
          dan pratinjau aktivasi. Booking harian tetap tersimpan.
        </div>
      </div>
    </section>
  );
}
