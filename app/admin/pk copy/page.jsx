"use client";

import { useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";
import { useUnit } from "@/components/UnitContext";

import PkToolbar from "@/components/pk/PkToolbar";
import PkTable from "@/components/pk/PkTable";
import PkDetailModal from "@/components/pk/PkDetailModal";

import { createEmptyPk, initialPkData } from "@/lib/pk/pkData";

import { PK_ROLES, canViewPk } from "@/lib/permissions/pkPermissions";

import { getCompleteness } from "@/lib/pk/pkCompleteness";

export default function PkPage() {
  const { activeUnit } = useUnit();

  /*
   * FRONTEND SIMULATION
   *
   * Nanti role dan currentSgpId berasal
   * dari authentication/session.
   */
  const [role] = useState(PK_ROLES.ADMIN);
  const [currentSgpId] = useState("SGP-01");

  const [pkData, setPkData] = useState(initialPkData);

  const [search, setSearch] = useState("");

  const [loanTypeFilter, setLoanTypeFilter] = useState("SEMUA");

  const [completenessFilter, setCompletenessFilter] = useState("SEMUA");

  const [selectedPk, setSelectedPk] = useState(null);

  /*
   * =========================================================
   * DATA SESUAI UNIT + HAK AKSES
   * =========================================================
   */
  const visiblePk = useMemo(() => {
    return pkData.filter((pk) => {
      if (!pk) {
        return false;
      }

      if (pk.unit !== activeUnit.value) {
        return false;
      }

      return canViewPk({
        role,
        pk,
        currentSgpId,
      });
    });
  }, [pkData, activeUnit, role, currentSgpId]);

  /*
   * =========================================================
   * FILTER DATA
   * =========================================================
   */
  const filteredPk = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return visiblePk.filter((pk) => {
      /*
       * SEARCH
       */
      const searchableValues = [
        pk.id,
        pk.pkNumber,
        pk.debtorName,
        pk.nik,
        pk.cif,
        pk.loanAccount,
        pk.mksName,
        pk.mksAgentCode,
      ];

      const matchesSearch =
        !keyword ||
        searchableValues
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      /*
       * JENIS PINJAMAN
       */
      const matchesLoanType =
        loanTypeFilter === "SEMUA" || pk.loanType === loanTypeFilter;

      /*
       * KELENGKAPAN
       */
      let matchesCompleteness = true;

      if (completenessFilter !== "SEMUA") {
        const completeness = getCompleteness(pk);

        const completenessStatus = completeness.complete
          ? "LENGKAP"
          : "BELUM_LENGKAP";

        matchesCompleteness = completenessStatus === completenessFilter;
      }

      return matchesSearch && matchesLoanType && matchesCompleteness;
    });
  }, [visiblePk, search, loanTypeFilter, completenessFilter]);

  /*
   * =========================================================
   * OPEN PK
   * =========================================================
   */
  const handleOpen = (pk) => {
    if (!pk) {
      return;
    }

    setSelectedPk(pk);
  };

  /*
   * =========================================================
   * TAMBAH PK
   * =========================================================
   */
  const handleAdd = () => {
    const newPk = createEmptyPk({
      unit: activeUnit.value,

      /*
       * Jika SGP login:
       * PK otomatis menjadi milik SGP tersebut.
       *
       * Jika Admin login:
       * sementara menggunakan SGP-01
       * untuk simulasi frontend.
       */
      mksId: role === PK_ROLES.SGP ? currentSgpId : "SGP-01",
    });

    setSelectedPk(newPk);
  };

  /*
   * =========================================================
   * SAVE PK
   * =========================================================
   */
  const handleSave = async (draft) => {
    if (!draft?.id) {
      return;
    }

    setPkData((prev) => {
      const exists = prev.some((item) => item.id === draft.id);

      if (exists) {
        return prev.map((item) => (item.id === draft.id ? draft : item));
      }

      return [draft, ...prev];
    });

    setSelectedPk(draft);
  };

  /*
   * =========================================================
   * LOCK / UNLOCK SECTION
   * =========================================================
   */
  const handleLockSection = ({ pkId, section, locked }) => {
    if (role !== PK_ROLES.ADMIN) {
      return;
    }

    if (!pkId || !section) {
      return;
    }

    setPkData((prev) =>
      prev.map((pk) => {
        if (pk.id !== pkId) {
          return pk;
        }

        return {
          ...pk,

          locks: {
            ...(pk.locks || {}),
            [section]: locked,
          },
        };
      }),
    );

    setSelectedPk((prev) => {
      if (!prev || prev.id !== pkId) {
        return prev;
      }

      return {
        ...prev,

        locks: {
          ...(prev.locks || {}),
          [section]: locked,
        },
      };
    });
  };

  /*
   * =========================================================
   * CORRECTION REQUEST
   * =========================================================
   */
  const handleCorrection = ({ pkId, section, message, ...request }) => {
    if (role !== PK_ROLES.ADMIN) {
      return;
    }

    if (!pkId || !section || !message?.trim()) {
      return;
    }

    const correction = {
      ...request,

      id: `COR-${Date.now()}`,

      pkId,
      section,

      message: message.trim(),

      status: "OPEN",

      createdAt: new Date().toISOString(),
    };

    setPkData((prev) =>
      prev.map((pk) => {
        if (pk.id !== pkId) {
          return pk;
        }

        return {
          ...pk,

          correctionRequests: [...(pk.correctionRequests || []), correction],
        };
      }),
    );

    setSelectedPk((prev) => {
      if (!prev || prev.id !== pkId) {
        return prev;
      }

      return {
        ...prev,

        correctionRequests: [...(prev.correctionRequests || []), correction],
      };
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PkToolbar
          role={role}
          search={search}
          onSearchChange={setSearch}
          loanTypeFilter={loanTypeFilter}
          onLoanTypeChange={setLoanTypeFilter}
          completenessFilter={completenessFilter}
          onCompletenessChange={setCompletenessFilter}
          onAdd={handleAdd}
        />

        <PkTable data={filteredPk} role={role} onOpen={handleOpen} />

        {filteredPk.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-700">
              Tidak ada data PK
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Coba ubah filter pencarian atau tambahkan PK baru.
            </p>
          </div>
        )}
      </div>

      {selectedPk && (
        <PkDetailModal
          pk={selectedPk}
          role={role}
          currentSgpId={currentSgpId}
          allPk={pkData}
          onClose={() => setSelectedPk(null)}
          onSave={handleSave}
          onLockSection={handleLockSection}
          onCorrection={handleCorrection}
        />
      )}
    </DashboardLayout>
  );
}
