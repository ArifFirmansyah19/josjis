import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatIndonesianDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${days[date.getDay()]} tanggal ${date.getDate()} ${
    months[date.getMonth()]
  } tahun ${date.getFullYear()}`;
}

function formatAddress(address) {
  if (!address) return "-";

  const parts = [
    address.street,
    address.rt ? `RT ${address.rt}` : "",
    address.rw ? `RW ${address.rw}` : "",
    address.village,
    address.district,
    address.regency,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "-";
}

function getOwners(collateral) {
  if (Array.isArray(collateral?.owners) && collateral.owners.length > 0) {
    return collateral.owners.map((owner) => owner?.name).filter(Boolean);
  }

  if (collateral?.owner) {
    return [collateral.owner];
  }

  return [];
}

function getOwnershipName(collateral) {
  const owners = getOwners(collateral);

  return owners.length > 0 ? owners.join(", ") : "-";
}

function getRelationshipLabel(relationship) {
  if (!relationship) return "-";

  const labels = {
    MILIK_SENDIRI: "Milik Sendiri",
    "Milik Sendiri": "Milik Sendiri",
    JUAL_BELI: "Jual Beli",
    "Jual Beli": "Jual Beli",
    WARIS: "Waris",
    Waris: "Waris",
    HIBAH: "Hibah",
    PASANGAN: "Pasangan",
    ORANG_TUA: "Orang Tua",
    PIHAK_KETIGA: "Pihak Ketiga",
    LAINNYA: "Lainnya",
  };

  return labels[relationship] || relationship;
}

function getSelectedRelatedParties(pk, bast) {
  const relatedParties = Array.isArray(pk?.relatedParties)
    ? pk.relatedParties
    : [];

  const signerIds = Array.isArray(bast?.signerPartyIds)
    ? bast.signerPartyIds
    : [];

  if (signerIds.length === 0) {
    return [];
  }

  return relatedParties.filter((party) => signerIds.includes(party.id));
}

function getWarisOwnerSigners(collaterals, bast) {
  const signerOwnerIds = Array.isArray(bast?.signerOwnerIds)
    ? bast.signerOwnerIds
    : [];

  if (signerOwnerIds.length === 0) {
    return [];
  }

  const owners = [];

  collaterals
    .filter(
      (collateral) =>
        String(collateral?.relationship || "").toUpperCase() === "WARIS",
    )
    .forEach((collateral) => {
      const collateralOwners = Array.isArray(collateral?.owners)
        ? collateral.owners
        : [];

      collateralOwners.forEach((owner, ownerIndex) => {
        if (!owner?.name) return;

        const ownerId =
          owner?.id || `${collateral.id || "COL"}-OWNER-${ownerIndex}`;

        if (!signerOwnerIds.includes(ownerId)) {
          return;
        }

        const exists = owners.some(
          (item) => item.name?.toLowerCase() === owner.name?.toLowerCase(),
        );

        if (!exists) {
          owners.push({
            ...owner,
            id: ownerId,
            relationship: "Pemilik Agunan / Waris",
          });
        }
      });
    });

  return owners;
}

function addLabelValue(doc, label, value, x, y, labelWidth = 28) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(label, x, y);

  doc.setFont("helvetica", "normal");
  doc.text(":", x + labelWidth, y);

  const text = String(value || "-");

  const availableWidth = doc.internal.pageSize.getWidth() - x - labelWidth - 22;

  const lines = doc.splitTextToSize(text, availableWidth);

  doc.text(lines, x + labelWidth + 4, y);

  return Math.max(1, lines.length);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Logo tidak dapat dimuat: ${src}`));

    image.src = src;
  });
}

function addSignatureBlock({ doc, x, y, width, title, name, subtitle }) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);

  doc.text(title, x + width / 2, y, {
    align: "center",
  });

  // Area TTD
  y += 21;

  doc.line(x + 8, y, x + width - 8, y);

  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  doc.text(name || "-", x + width / 2, y, {
    align: "center",
  });

  if (subtitle) {
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    doc.text(subtitle, x + width / 2, y, {
      align: "center",
    });
  }

  return y;
}

export async function generateBastPdf({ pk, bast, collaterals = [] }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  const pageHeight = doc.internal.pageSize.getHeight();

  const marginLeft = 17;
  const marginRight = 17;

  const contentWidth = pageWidth - marginLeft - marginRight;

  const selectedCollaterals = collaterals.filter((collateral) =>
    bast?.collateralIds?.includes(collateral.id),
  );

  const selectedRelatedParties = getSelectedRelatedParties(pk, bast);

  const warisOwnerSigners = getWarisOwnerSigners(selectedCollaterals, bast);

  const year = bast?.date
    ? new Date(`${bast.date}T00:00:00`).getFullYear()
    : new Date().getFullYear();

  const number = String(bast?.number || "").trim();

  const documentNumber = number
    ? `NRF.R02.JBI.JKK/${number}/${year}`
    : `NRF.R02.JBI.JKK/-/${year}`;

  const logo = await loadImage("/images/mandiri-logo.png");

  let y = 13;

  // =========================================================
  // HEADER
  // =========================================================

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  doc.text("PT BANK MANDIRI (PERSERO) Tbk.", marginLeft, y);

  // Logo resmi Mandiri
  const logoWidth = 31;
  const logoHeight = 13;

  doc.addImage(
    logo,
    "PNG",
    pageWidth - marginRight - logoWidth,
    8,
    logoWidth,
    logoHeight,
  );

  y += 12;

  doc.setFontSize(12.5);

  doc.text("BERITA ACARA", pageWidth / 2, y, {
    align: "center",
  });

  y += 5;

  doc.setFontSize(11.5);

  doc.text("SERAH TERIMA AGUNAN MORAL OBLIGASI", pageWidth / 2, y, {
    align: "center",
  });

  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  doc.text(documentNumber, pageWidth / 2, y, {
    align: "center",
  });

  y += 7;

  // =========================================================
  // OPENING
  // =========================================================

  doc.setFontSize(8.5);

  const opening = `Pada hari ini ${formatIndonesianDate(
    bast?.date,
  )}, yang bertanda tangan di bawah ini:`;

  const openingLines = doc.splitTextToSize(opening, contentWidth);

  doc.text(openingLines, marginLeft, y);

  y += openingLines.length * 4 + 3;

  // =========================================================
  // PIHAK PERTAMA
  // =========================================================

  let lines = addLabelValue(doc, "Nama", pk?.debtorName, marginLeft, y);

  y += lines * 4;

  lines = addLabelValue(doc, "NIK", pk?.nik, marginLeft, y);

  y += lines * 4;

  lines = addLabelValue(
    doc,
    "Alamat",
    formatAddress(pk?.address),
    marginLeft,
    y,
  );

  y += lines * 4 + 2;

  if (selectedRelatedParties.length > 0) {
    const approvalText =
      "telah memperoleh persetujuan dari pihak terkait dengan data:";

    const approvalLines = doc.splitTextToSize(approvalText, contentWidth);

    doc.text(approvalLines, marginLeft, y);

    y += approvalLines.length * 4 + 2;

    selectedRelatedParties.forEach((party) => {
      lines = addLabelValue(doc, "Nama", party.name, marginLeft + 4, y);

      y += lines * 4;

      lines = addLabelValue(doc, "NIK", party.nik, marginLeft + 4, y);

      y += lines * 4;

      lines = addLabelValue(
        doc,
        "Hubungan",
        party.relationship,
        marginLeft + 4,
        y,
      );

      y += lines * 4;

      lines = addLabelValue(
        doc,
        "Alamat",
        formatAddress(party.address),
        marginLeft + 4,
        y,
      );

      y += lines * 4 + 2;
    });

    const relatedText =
      "dalam Berita Acara Serah Terima Dokumen Moral Obligasi yang selanjutnya disebut PIHAK PERTAMA, yang menyerahkan.";

    const relatedLines = doc.splitTextToSize(relatedText, contentWidth);

    doc.text(relatedLines, marginLeft, y);

    y += relatedLines.length * 4 + 3;
  } else {
    const firstPartyText =
      "yang selanjutnya disebut PIHAK PERTAMA, yang menyerahkan.";

    const firstPartyLines = doc.splitTextToSize(firstPartyText, contentWidth);

    doc.text(firstPartyLines, marginLeft, y);

    y += firstPartyLines.length * 4 + 3;
  }

  // =========================================================
  // PIHAK KEDUA
  // =========================================================

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);

  doc.text("PIHAK KEDUA", marginLeft, y);

  y += 5;

  doc.setFont("helvetica", "normal");

  lines = addLabelValue(
    doc,
    "Nama",
    bast?.secondPartyName || bast?.mbmName || "MBM / Penyelia Unit",
    marginLeft,
    y,
  );

  y += lines * 4;

  lines = addLabelValue(doc, "NIP", bast?.secondPartyNip, marginLeft, y);

  y += lines * 4;

  lines = addLabelValue(
    doc,
    "Jabatan",
    bast?.secondPartyPosition || "MBM / PENYELIA UNIT",
    marginLeft,
    y,
  );

  y += lines * 4;

  lines = addLabelValue(
    doc,
    "Unit Kerja",
    bast?.unitName || pk?.unit || "-",
    marginLeft,
    y,
  );

  y += lines * 4 + 3;

  // =========================================================
  // PK STATEMENT
  // =========================================================

  const pkStatement = `PIHAK PERTAMA berdasarkan PK Nomor : ${
    pk?.pkNumber || "-"
  } tanggal : ${formatIndonesianDate(
    pk?.pkDate,
  )} menyatakan dengan sadar dan tanpa paksaan menyerahkan dokumen agunan terinci dalam tabel di bawah ini:`;

  const pkStatementLines = doc.splitTextToSize(pkStatement, contentWidth);

  doc.text(pkStatementLines, marginLeft, y);

  y += pkStatementLines.length * 4 + 3;

  // =========================================================
  // COLLATERAL TABLE
  // =========================================================

  const tableRows = selectedCollaterals.map((collateral, index) => [
    String(index + 1),
    collateral?.number || "-",
    getOwnershipName(collateral),
    collateral?.area ? `${collateral.area} m²` : "-",
    getRelationshipLabel(collateral?.relationship),
  ]);

  autoTable(doc, {
    startY: y,

    margin: {
      left: marginLeft,
      right: marginRight,
    },

    head: [
      [
        "No.",
        "SHM",
        "Nama Kepemilikan Dokumen",
        "Luas",
        "Hubungan dengan Debitur",
      ],
    ],

    body: tableRows,

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.18,
      cellPadding: 1.7,
      valign: "top",
    },

    headStyles: {
      fontStyle: "bold",
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
    },

    columnStyles: {
      0: {
        cellWidth: 8,
        halign: "center",
      },

      1: {
        cellWidth: 27,
      },

      2: {
        cellWidth: 50,
      },

      3: {
        cellWidth: 19,
      },

      4: {
        cellWidth: 59,
      },
    },

    rowPageBreak: "avoid",
  });

  y = doc.lastAutoTable.finalY + 4;

  // =========================================================
  // WARIS
  // =========================================================

  if (warisOwnerSigners.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    const warisText = `Pihak yang turut menandatangani sebagai pemilik agunan/ahli waris: ${warisOwnerSigners
      .map((owner) => owner.name)
      .join(", ")}.`;

    const warisLines = doc.splitTextToSize(warisText, contentWidth);

    doc.text(warisLines, marginLeft, y);

    y += warisLines.length * 4 + 3;
  }

  // =========================================================
  // TRANSFER
  // =========================================================

  const destination =
    bast?.destination === "NOTARIS"
      ? bast?.notaryName
        ? `Notaris ${bast.notaryName}`
        : "Notaris"
      : bast?.destination === "DEBITUR"
        ? "Debitur"
        : "-";

  let transferText =
    "Dokumen agunan tersebut diserahkan oleh PIHAK PERTAMA kepada PIHAK KEDUA untuk selanjutnya disimpan, dicatat, dan dikelola sesuai dengan ketentuan administrasi agunan yang berlaku.";

  if (destination !== "-") {
    transferText += ` Penyerahan dokumen ditujukan kepada ${destination}.`;
  }

  const transferLines = doc.splitTextToSize(transferText, contentWidth);

  doc.text(transferLines, marginLeft, y);

  y += transferLines.length * 4 + 3;

  // =========================================================
  // CLOSING
  // =========================================================

  const closing =
    "Demikian berita acara serah terima ini dibuat dan ditandatangani rangkap 2 (dua) yang masing-masing mempunyai kekuatan hukum yang sama.";

  const closingLines = doc.splitTextToSize(closing, contentWidth);

  doc.text(closingLines, marginLeft, y);

  y += closingLines.length * 4 + 6;

  // =========================================================
  // SIGNATURE
  // =========================================================

  const signatureWidth = (contentWidth - 25) / 2;

  const leftSignatureX = marginLeft + 3;

  const rightSignatureX = pageWidth - marginRight - signatureWidth - 3;

  // Pastikan blok tanda tangan tidak terpotong.
  if (y + 52 > pageHeight - 10) {
    doc.addPage();
    y = 20;
  }

  addSignatureBlock({
    doc,
    x: leftSignatureX,
    y,
    width: signatureWidth,
    title: "Pihak Pertama",
    name: pk?.debtorName || "Nama Debitur",
    subtitle: "Debitur",
  });

  addSignatureBlock({
    doc,
    x: rightSignatureX,
    y,
    width: signatureWidth,
    title: "Pihak Kedua",
    name: bast?.secondPartyName || bast?.mbmName || "MBM / Penyelia Unit",
    subtitle: bast?.secondPartyPosition || "MBM / PENYELIA UNIT",
  });

  // =========================================================
  // PERSETUJUAN
  // =========================================================

  if (selectedRelatedParties.length > 0) {
    const firstParty = selectedRelatedParties[0];

    let approvalY = y + 35;

    doc.setFont("helvetica", "normal");

    doc.setFontSize(7.5);

    doc.text(
      "Memperoleh Persetujuan",
      leftSignatureX + signatureWidth / 2,
      approvalY,
      {
        align: "center",
      },
    );

    doc.setFont("helvetica", "bold");

    doc.text(
      firstParty.relationship || "PIHAK TERKAIT",
      leftSignatureX + signatureWidth / 2,
      approvalY + 4,
      {
        align: "center",
      },
    );

    // Area TTD istri/suami/pihak terkait
    approvalY += 21;

    doc.line(
      leftSignatureX + 8,
      approvalY,
      leftSignatureX + signatureWidth - 8,
      approvalY,
    );

    doc.setFontSize(8);

    doc.text(
      firstParty.name || "-",
      leftSignatureX + signatureWidth / 2,
      approvalY + 4,
      {
        align: "center",
      },
    );

    doc.setFont("helvetica", "normal");

    doc.setFontSize(7.5);

    doc.text(
      firstParty.relationship || "Pihak Terkait",
      leftSignatureX + signatureWidth / 2,
      approvalY + 8,
      {
        align: "center",
      },
    );
  }

  // =========================================================
  // WARIS SIGNATURES
  // =========================================================

  if (warisOwnerSigners.length > 0) {
    let warisY = y + 63;

    if (warisY + 45 > pageHeight - 8) {
      doc.addPage();
      warisY = 20;
    }

    doc.setFont("helvetica", "bold");

    doc.setFontSize(8);

    doc.text("PIHAK YANG TURUT MENANDATANGANI", pageWidth / 2, warisY, {
      align: "center",
    });

    warisY += 8;

    const warisColumns = 2;

    const warisWidth = (contentWidth - 12) / warisColumns;

    warisOwnerSigners.forEach((owner, index) => {
      const column = index % warisColumns;

      const row = Math.floor(index / warisColumns);

      const x = marginLeft + column * (warisWidth + 12);

      const blockY = warisY + row * 33;

      addSignatureBlock({
        doc,
        x,
        y: blockY,
        width: warisWidth,
        title: "Pihak Terkait / Ahli Waris",
        name: owner.name,
        subtitle: "Pemilik Agunan / Waris",
      });
    });
  }

  // =========================================================
  // DOWNLOAD
  // =========================================================

  const safeDebtorName = String(pk?.debtorName || "Debitur")
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-");

  const safeNumber = String(bast?.number || "BAST")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "");

  const filename = `BAST-Moral-Obligasi-${safeNumber}-${safeDebtorName}.pdf`;

  doc.save(filename);

  return filename;
}
