/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";

import PkLoanSection from "@/components/pk/sections/PkLoanSection";
import PkDebtorSection from "@/components/pk/sections/PkDebtorSection";
import PkAddressSection from "@/components/pk/sections/PkAddressSection";
import PkSpouseSection from "@/components/pk/sections/PkSpouseSection";
import PkCollateralSection from "@/components/pk/sections/PkCollateralSection";
import PkInsuranceSection from "@/components/pk/sections/PkInsuranceSection";
import PkDocumentsSection from "@/components/pk/sections/PkDocumentSection";
import PkOrderSection from "@/components/pk/sections/PkOrderSection";
import PkBastSection from "@/components/pk/sections/PkBastSection";

import PkRelatedPartySection from "@/components/pk/PkRelatedPartySection";

import { PK_ROLES, canModifySection } from "@/lib/permissions/pkPermissions";

const SECTION_CONFIG = [
  {
    key: "loan",
    title: "Informasi Pinjaman",
    icon: ClipboardCheck,
  },
  {
    key: "debtor",
    title: "Data Debitur",
    icon: FileText,
  },
  {
    key: "address",
    title: "Alamat Debitur",
    icon: FileText,
  },
  {
    key: "spouse",
    title: "Data Pasangan",
    icon: FileText,
  },
  {
    key: "relatedParties",
    title: "Pihak Terkait",
    icon: ShieldCheck,
  },
  {
    key: "collateral",
    title: "Data Agunan",
    icon: FileText,
  },
  {
    key: "insurance",
    title: "Asuransi & Penjaminan",
    icon: ShieldCheck,
  },
  {
    key: "documents",
    title: "Dokumen",
    icon: FileText,
  },
  {
    key: "order",
    title: "Order Agunan",
    icon: ClipboardCheck,
  },
  {
    key: "bast",
    title: "BAST",
    icon: FileText,
  },
];

export default function PkDetailModal({
  pk,
  role = PK_ROLES.ADMIN,
  currentSgpId = "SGP-01",
  onClose,
  onSave,
  onLockSection,
  onCorrection,
}) {
  const [draft, setDraft] = useState(null);
  const [activeSection, setActiveSection] = useState("loan");

  const [correctionMessage, setCorrectionMessage] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);

  useEffect(() => {
    if (!pk) return;

    setDraft(JSON.parse(JSON.stringify(pk)));
    setActiveSection("loan");
    setCorrectionMessage("");
    setShowCorrection(false);
  }, [pk]);

  const permissions = useMemo(() => {
    if (!draft) return null;

    return {
      role,
      pk: draft,
      currentSgpId,
    };
  }, [role, draft, currentSgpId]);

  if (!draft) return null;

  const isAdmin = role === PK_ROLES.ADMIN;

  const isLocked = (section) => {
    return Boolean(draft?.locks?.[section]);
  };

  const canEditSection = (section) => {
    if (!permissions) return false;

    return canModifySection({
      role,
      pk: draft,
      currentSgpId,
      section,
    });
  };

  const handleLock = (section) => {
    if (!isAdmin) return;

    const nextLocked = !isLocked(section);

    setDraft((prev) => ({
      ...prev,
      locks: {
        ...(prev.locks || {}),
        [section]: nextLocked,
      },
    }));

    onLockSection?.({
      pkId: draft.id,
      section,
      locked: nextLocked,
    });
  };

  const handleSave = () => {
    if (!draft) return;

    const updatedDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    setDraft(updatedDraft);
    onSave?.(updatedDraft);
  };

  const handleCorrectionSubmit = () => {
    const message = correctionMessage.trim();

    if (!message || !isAdmin) return;

    onCorrection?.({
      pkId: draft.id,
      section: activeSection,
      message,
      createdAt: new Date().toISOString(),
      status: "OPEN",
    });

    setCorrectionMessage("");
    setShowCorrection(false);
  };

  const renderSection = () => {
    const locked = isLocked(activeSection);
    const editable = canEditSection(activeSection);

    switch (activeSection) {
      case "loan":
        return (
          <PkLoanSection
            pk={draft}
            setPk={setDraft}
            canEdit={editable}
            locked={locked}
          />
        );

      case "debtor":
        return (
          <PkDebtorSection
            pk={draft}
            setPk={setDraft}
            canEdit={editable}
            locked={locked}
          />
        );

      case "address":
        return (
          <PkAddressSection
            pk={draft}
            setPk={setDraft}
            canEdit={editable}
            locked={locked}
          />
        );

      case "spouse":
        return (
          <PkSpouseSection
            pk={draft}
            setPk={setDraft}
            canEdit={editable}
            locked={locked}
          />
        );

      case "relatedParties":
        return (
          <PkRelatedPartySection
            pk={draft}
            setPk={setDraft}
            canEdit={editable}
            locked={locked}
          />
        );

      case "collateral":
        return (
          <PkCollateralSection
            pk={draft}
            setPk={setDraft}
            canEdit={editable}
            locked={locked}
          />
        );

      case "insurance":
        return (
          <PkInsuranceSection
            pk={draft}
            setPk={setDraft}
            canEdit={editable}
            locked={locked}
          />
        );

      case "documents":
        return (
          <PkDocumentsSection
            pk={draft}
            setPk={setDraft}
            canEdit={editable}
            locked={locked}
          />
        );

      case "order":
        return (
          <PkOrderSection
            pk={draft}
            setPk={setDraft}
            canEdit={editable}
            locked={locked}
          />
        );

      case "bast":
        return (
          <PkBastSection
            pk={draft}
            setPk={setDraft}
            canEdit={editable}
            locked={locked}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        aria-label="Tutup modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div className="relative flex h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-zinc-900">
                  Detail PK
                </h2>

                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                  {draft.id}
                </span>

                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  {draft.loanStatus || "DRAFT"}
                </span>
              </div>

              <p className="mt-1 text-xs text-zinc-500">
                {draft.debtorName || "Debitur belum diisi"} ·{" "}
                {draft.pkNumber || "Nomor PK belum diisi"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50/70 p-3 lg:block">
            <div className="px-2 pb-2 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Bagian PK
              </p>
            </div>

            <nav className="space-y-1">
              {SECTION_CONFIG.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.key;
                const locked = isLocked(section.key);

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className={[
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      active
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-white hover:text-zinc-900",
                    ].join(" ")}
                  >
                    <Icon size={16} className="shrink-0" />

                    <span className="min-w-0 flex-1 truncate">
                      {section.title}
                    </span>

                    {locked && (
                      <LockKeyhole
                        size={13}
                        className={active ? "text-zinc-300" : "text-zinc-400"}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {isAdmin && (
              <div className="mt-5 border-t border-zinc-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCorrection((prev) => !prev)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-900"
                >
                  <MessageSquareText size={16} />
                  Permintaan Perbaikan
                </button>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="min-w-0 flex-1 overflow-y-auto bg-[#f7f7f5]">
            {/* Mobile selector */}
            <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
              <select
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              >
                {SECTION_CONFIG.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.title}
                    {isLocked(section.key) ? " · Dikunci Admin" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-5 p-4 sm:p-5 lg:p-6">
              {/* Section toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {
                      SECTION_CONFIG.find(
                        (section) => section.key === activeSection,
                      )?.title
                    }
                  </p>

                  <p className="mt-0.5 text-xs text-zinc-500">
                    {isLocked(activeSection)
                      ? "Bagian ini sedang dikunci oleh Admin."
                      : canEditSection(activeSection)
                        ? "Data dapat diperbarui sesuai hak akses."
                        : "Anda hanya dapat melihat bagian ini."}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleLock(activeSection)}
                    className={[
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition",
                      isLocked(activeSection)
                        ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    <LockKeyhole size={14} />

                    {isLocked(activeSection) ? "Buka Kunci" : "Kunci Bagian"}
                  </button>
                )}
              </div>

              {renderSection()}

              {/* Correction */}
              {showCorrection && isAdmin && (
                <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
                  <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <MessageSquareText size={17} />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-amber-900">
                          Permintaan Perbaikan
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          Kirim catatan kepada SGP untuk melengkapi atau
                          memperbaiki data PK.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <textarea
                      value={correctionMessage}
                      onChange={(e) => setCorrectionMessage(e.target.value)}
                      rows={4}
                      placeholder="Contoh: Mohon lengkapi nomor sertifikat dan alamat agunan."
                      className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                    />

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCorrectionSubmit}
                        disabled={!correctionMessage.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <MessageSquareText size={16} />
                        Kirim Permintaan
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Perubahan disimpan setelah menekan Simpan Perubahan.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                Tutup
              </button>

              {canEditSection(activeSection) && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  <CheckCircle2 size={16} />
                  Simpan Perubahan
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
