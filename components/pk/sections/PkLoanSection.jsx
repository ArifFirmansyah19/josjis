"use client";

import PkInput from "@/components/pk/shared/PkInput";
import PkSelect from "@/components/pk/shared/PkSelect";
import PkSection from "@/components/pk/shared/PkSection";

const loanTypes = [
  { value: "KUM", label: "KUM" },
  { value: "KUR", label: "KUR" },
  { value: "KPP", label: "KPP" },
  { value: "KSM", label: "KSM" },
];

export default function PkLoanSection({ pk, setPk, canEdit, locked }) {
  const update = (field, value) => {
    setPk((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <PkSection
      title="Informasi Pinjaman"
      description="Informasi utama fasilitas pinjaman dan PK."
      locked={locked}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PkInput label="MKS / SGP" value={pk.mksName || ""} disabled />

        <PkInput label="Kode Agen MKS" value={pk.mksAgentCode || ""} disabled />

        <PkSelect
          label="Jenis Pinjaman"
          value={pk.loanType || ""}
          onChange={(e) => update("loanType", e.target.value)}
          disabled={!canEdit}
          options={loanTypes}
        />

        <PkInput
          label="No. Aplikasi Peminjaman"
          value={pk.applicationNumber || ""}
          onChange={(e) => update("applicationNumber", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="Tgl Aplikasi Peminjaman"
          type="date"
          value={pk.applicationDate || ""}
          onChange={(e) => update("applicationDate", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="TGL PK"
          type="date"
          value={pk.pkDate || ""}
          onChange={(e) => update("pkDate", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="NO. PK"
          value={pk.pkNumber || ""}
          onChange={(e) => update("pkNumber", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="Limit"
          type="number"
          value={pk.limit ?? ""}
          onChange={(e) => update("limit", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="Tenor"
          type="number"
          value={pk.tenor ?? ""}
          onChange={(e) => update("tenor", e.target.value)}
          disabled={!canEdit}
          suffix="bulan"
        />

        <PkInput
          label="CIF"
          value={pk.cif || ""}
          onChange={(e) => update("cif", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="Norek Tabungan"
          value={pk.savingsAccount || ""}
          onChange={(e) => update("savingsAccount", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="Norek Pinjaman"
          value={pk.loanAccount || ""}
          onChange={(e) => update("loanAccount", e.target.value)}
          disabled={!canEdit}
        />

        <PkInput
          label="Status Pinjaman"
          value={pk.loanStatus || "DRAFT"}
          disabled
        />
      </div>
    </PkSection>
  );
}
