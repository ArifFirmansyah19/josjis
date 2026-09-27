"use client";

import { saveAs } from "file-saver";
import JSZip from "jszip";

import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

import { jsPDF } from "jspdf";

/* =========================================================
   CONFIG
========================================================= */

/*
 * FOTO BDS
 * Lebih agresif karena biasanya jumlahnya banyak.
 */
const BDS_IMAGE_MAX_SIZE = 1600;
const BDS_IMAGE_QUALITY = 0.65;

/*
 * FOTO SURAT BERTANDA TANGAN
 * Jangan terlalu ekstrem supaya tulisan dan tanda tangan
 * tetap jelas.
 */
const SIGNED_LETTER_MAX_SIZE = 2400;
const SIGNED_LETTER_QUALITY = 0.88;

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/* =========================================================
   GENERAL HELPERS
========================================================= */

function formatAgunanSurat(agunan) {
  if (!agunan) return "—";

  const nomor = agunan.nomor ? ` No. ${agunan.nomor}` : "";

  const desa = agunan.desa ? `/${agunan.desa}` : "";

  const nama = agunan.namaSertifikat ? ` an. ${agunan.namaSertifikat}` : "";

  return `${agunan.jenis || ""}${nomor}${desa}${nama}`.trim();
}

function getTodayFilenameDate(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, "0");

  const mm = String(date.getMonth() + 1).padStart(2, "0");

  const yyyy = date.getFullYear();

  return `${dd}${mm}${yyyy}`;
}

function sanitizeFileName(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim();
}

function getBaseFileName({ suratKeluar = "JKK 1", date = new Date() }) {
  return `order_agunan_${sanitizeFileName(
    suratKeluar,
  )}_${getTodayFilenameDate(date)}`;
}

/* =========================================================
   IMAGE HELPERS
========================================================= */

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () => reject(new Error("Gagal membaca gambar."));

    image.src = source;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));

    reader.readAsDataURL(blob);
  });
}

/* =========================================================
   COMPRESS IMAGE
========================================================= */

async function compressImage(source, { maxSize, quality }) {
  if (!source) {
    return null;
  }

  const image = await loadImage(source);

  let width = image.naturalWidth || image.width;

  let height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error("Ukuran gambar tidak valid.");
  }

  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);

    width = Math.round(width * ratio);

    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", {
    alpha: false,
  });

  if (!ctx) {
    throw new Error("Canvas tidak tersedia.");
  }

  ctx.fillStyle = "#ffffff";

  ctx.fillRect(0, 0, width, height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });

  if (!blob) {
    throw new Error("Gagal melakukan kompresi gambar.");
  }

  return blob;
}

/* =========================================================
   COMPRESS BDS
========================================================= */

async function compressBdsSource(source) {
  if (!source) {
    return null;
  }

  if (source instanceof Blob) {
    const dataUrl = await blobToDataUrl(source);

    return compressImage(dataUrl, {
      maxSize: BDS_IMAGE_MAX_SIZE,
      quality: BDS_IMAGE_QUALITY,
    });
  }

  if (typeof source === "string") {
    return compressImage(source, {
      maxSize: BDS_IMAGE_MAX_SIZE,
      quality: BDS_IMAGE_QUALITY,
    });
  }

  return null;
}

/* =========================================================
   COMPRESS SIGNED LETTER
========================================================= */

async function compressSignedLetterSource(source) {
  if (!source) {
    return null;
  }

  if (source instanceof Blob) {
    const dataUrl = await blobToDataUrl(source);

    return compressImage(dataUrl, {
      maxSize: SIGNED_LETTER_MAX_SIZE,
      quality: SIGNED_LETTER_QUALITY,
    });
  }

  if (typeof source === "string") {
    return compressImage(source, {
      maxSize: SIGNED_LETTER_MAX_SIZE,
      quality: SIGNED_LETTER_QUALITY,
    });
  }

  return null;
}

/* =========================================================
   LOAD LOGO MANDIRI
========================================================= */

async function loadMandiriLogo() {
  try {
    const response = await fetch("/images/mandiri-logo.png");

    if (!response.ok) {
      throw new Error("Logo Mandiri tidak ditemukan.");
    }

    const blob = await response.blob();

    return blob;
  } catch (error) {
    console.error("Gagal memuat logo Mandiri:", error);

    return null;
  }
}

/* =========================================================
   PREPARE COMPRESSED ASSETS
========================================================= */

async function prepareCompressedAssets({ signedLetter, bdsPhotos = [] }) {
  const assets = {
    signedLetter: null,

    /*
     * BDS GLOBAL
     * Bukan object berdasarkan order.
     */
    bds: [],

    mandiriLogo: null,
  };

  /* =======================================================
     LOGO MANDIRI
  ======================================================= */

  assets.mandiriLogo = await loadMandiriLogo();

  /* =======================================================
     SURAT BERTANDA TANGAN
     
     Kompresi lebih ringan.
  ======================================================= */

  if (signedLetter?.file || signedLetter?.url) {
    const source = signedLetter.file || signedLetter.url;

    const blob = await compressSignedLetterSource(source);

    if (blob) {
      assets.signedLetter = {
        blob,
        name: "surat_bertanda_tangan.jpg",
      };
    }
  }

  /* =======================================================
     FOTO BDS GLOBAL

     Urutan:
     0 -> foto pertama
     1 -> foto kedua
     2 -> foto ketiga
     dst.

     Tidak ada hubungan dengan order/debitur.
  ======================================================= */

  for (let index = 0; index < bdsPhotos.length; index += 1) {
    const photo = bdsPhotos[index];

    const source = photo?.file || photo?.url;

    if (!source) {
      continue;
    }

    const blob = await compressBdsSource(source);

    if (!blob) {
      continue;
    }

    assets.bds.push({
      blob,
      index,
      name: photo?.name || `foto-bds-${index + 1}`,
    });
  }

  return assets;
}

/* =========================================================
   PUBLIC ASSET PREPARATION
========================================================= */

export async function prepareExportAssets({ signedLetter, bdsPhotos = [] }) {
  return prepareCompressedAssets({
    signedLetter,
    bdsPhotos,
  });
}

/* =========================================================
   IMAGE DIMENSION
========================================================= */

async function getImageDimensions(blob) {
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);

    return {
      width: image.naturalWidth || image.width,

      height: image.naturalHeight || image.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* =========================================================
   PDF IMAGE
========================================================= */

async function addBlobImageToPdf(pdf, blob, { x, y, maxWidth, maxHeight }) {
  if (!blob) {
    return;
  }

  const dimensions = await getImageDimensions(blob);

  const dataUrl = await blobToDataUrl(blob);

  const ratio = dimensions.width / dimensions.height;

  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;

    width = height * ratio;
  }

  const finalX = x + (maxWidth - width) / 2;

  const finalY = y + (maxHeight - height) / 2;

  pdf.addImage(
    dataUrl,
    "JPEG",
    finalX,
    finalY,
    width,
    height,
    undefined,
    "FAST",
  );
}

/* =========================================================
   PDF - SURAT + BDS
========================================================= */

async function createOverallPdfBlob({ assets }) {
  const pdf = new jsPDF({
    orientation: "portrait",

    unit: "mm",

    format: "a4",

    compress: true,
  });

  let hasPage = false;

  /* =======================================================
     SURAT BERTANDA TANGAN
  ======================================================= */

  if (assets?.signedLetter?.blob) {
    const blob = assets.signedLetter.blob;

    const dimensions = await getImageDimensions(blob);

    const dataUrl = await blobToDataUrl(blob);

    const ratio = dimensions.width / dimensions.height;

    let width = A4_WIDTH_MM;

    let height = width / ratio;

    if (height > A4_HEIGHT_MM) {
      height = A4_HEIGHT_MM;

      width = height * ratio;
    }

    const x = (A4_WIDTH_MM - width) / 2;

    const y = (A4_HEIGHT_MM - height) / 2;

    pdf.addImage(dataUrl, "JPEG", x, y, width, height, undefined, "FAST");

    hasPage = true;
  }

  /* =======================================================
     FOTO BDS GLOBAL
     
     2 FOTO PER HALAMAN A4
     
     Tanpa:
     - judul
     - nama
     - label
     - garis pemisah
  ======================================================= */

  const allPhotos = assets?.bds || [];

  for (let index = 0; index < allPhotos.length; index += 2) {
    if (hasPage) {
      pdf.addPage();
    }

    const first = allPhotos[index];

    const second = allPhotos[index + 1];

    await addBlobImageToPdf(pdf, first?.blob, {
      x: 15,
      y: 10,
      maxWidth: 180,
      maxHeight: 125,
    });

    if (second?.blob) {
      await addBlobImageToPdf(pdf, second.blob, {
        x: 15,
        y: 162,
        maxWidth: 180,
        maxHeight: 125,
      });
    }

    hasPage = true;
  }

  /* =======================================================
     KOSONG
  ======================================================= */

  if (!hasPage) {
    pdf.addPage();

    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(11);

    pdf.text("Belum ada surat bertanda tangan atau foto BDS.", 20, 30);
  }

  return pdf.output("blob");
}

/* =========================================================
   WORD HELPERS
========================================================= */

const WORD_BORDER = {
  style: BorderStyle.SINGLE,

  /*
   * Sedikit diperkuat supaya
   * garis terlihat jelas di Word.
   */
  size: 2,

  color: "000000",
};

const WORD_NO_BORDER = {
  style: BorderStyle.NONE,

  size: 0,

  color: "FFFFFF",
};

function wordText(text, { bold = false, size = 20, underline = false } = {}) {
  return new TextRun({
    text: String(text ?? ""),

    bold,

    size,

    font: "Arial",

    underline: underline ? {} : undefined,
  });
}

function wordParagraph(
  text = "",
  {
    bold = false,
    size = 20,
    alignment = AlignmentType.LEFT,
    spacingAfter = 0,
    spacingBefore = 0,
    line = 300,
  } = {},
) {
  return new Paragraph({
    alignment,

    spacing: {
      after: spacingAfter,

      before: spacingBefore,

      line,
    },

    children: [
      wordText(text, {
        bold,
        size,
      }),
    ],
  });
}

/* =========================================================
   WORD BORDER CELL
========================================================= */

function wordTableCell(
  children,
  {
    width,
    alignment = AlignmentType.LEFT,
    vertical = "top",
    bold = false,
    rowSpan,
    columnSpan,
  } = {},
) {
  const content = Array.isArray(children)
    ? children
    : [
        wordParagraph(children, {
          bold,
          alignment,
          size: 18,
        }),
      ];

  return new TableCell({
    width: {
      size: width,
      type: WidthType.PERCENTAGE,
    },

    ...(rowSpan
      ? {
          rowSpan,
        }
      : {}),

    ...(columnSpan
      ? {
          columnSpan,
        }
      : {}),

    vertical: vertical === "center" ? VerticalAlign.CENTER : VerticalAlign.TOP,

    margins: {
      top: 70,
      bottom: 70,
      left: 70,
      right: 70,
    },

    /*
     * BORDER HITAM SETIAP CELL
     */
    borders: {
      top: WORD_BORDER,
      bottom: WORD_BORDER,
      left: WORD_BORDER,
      right: WORD_BORDER,
    },

    children: content,
  });
}

/* =========================================================
   WORD - TABEL ORDER AGUNAN
========================================================= */

function createWordAgunanTable(rows = []) {
  const tableRows = [];

  /* =======================================================
     HEADER
  ======================================================= */

  tableRows.push(
    new TableRow({
      children: [
        wordTableCell("No.", {
          width: 6,
          alignment: AlignmentType.CENTER,
          vertical: "center",
          bold: true,
        }),

        wordTableCell("Notasi", {
          width: 10,
          alignment: AlignmentType.CENTER,
          vertical: "center",
          bold: true,
        }),

        wordTableCell("Nama Debitur", {
          width: 21,
          alignment: AlignmentType.CENTER,
          vertical: "center",
          bold: true,
        }),

        wordTableCell("No. Rekening", {
          width: 18,
          alignment: AlignmentType.CENTER,
          vertical: "center",
          bold: true,
        }),

        wordTableCell("Jenis Agunan *)", {
          width: 30,
          alignment: AlignmentType.CENTER,
          vertical: "center",
          bold: true,
        }),

        wordTableCell("Keterangan **)", {
          width: 15,
          alignment: AlignmentType.CENTER,
          vertical: "center",
          bold: true,
        }),
      ],
    }),
  );

  /* =======================================================
     DATA
  ======================================================= */

  rows.forEach((row) => {
    const agunanList =
      Array.isArray(row.agunan) && row.agunan.length > 0 ? row.agunan : [null];

    const totalRows = agunanList.length;

    agunanList.forEach((agunan, agunanIndex) => {
      const cells = [];

      /* =================================================
           DATA UTAMA
        ================================================= */

      if (agunanIndex === 0) {
        cells.push(
          wordTableCell(String(row.no ?? "—"), {
            width: 6,
            alignment: AlignmentType.CENTER,
            rowSpan: totalRows,
          }),
        );

        cells.push(
          wordTableCell(String(row.notasi ?? "—"), {
            width: 10,
            alignment: AlignmentType.CENTER,
            rowSpan: totalRows,
          }),
        );

        cells.push(
          wordTableCell(String(row.namaDebitur ?? "—"), {
            width: 21,
            rowSpan: totalRows,
          }),
        );

        cells.push(
          wordTableCell(String(row.norekPinjaman ?? "—"), {
            width: 18,
            alignment: AlignmentType.CENTER,
            rowSpan: totalRows,
          }),
        );
      }

      /* =================================================
           JENIS AGUNAN
        ================================================= */

      const agunanParagraphs = [];

      if (totalRows > 1) {
        agunanParagraphs.push(
          wordParagraph(`Agunan ${agunanIndex + 1}`, {
            bold: true,
            size: 18,
            spacingAfter: 20,
          }),
        );
      }

      agunanParagraphs.push(
        wordParagraph(formatAgunanSurat(agunan), {
          size: 18,
        }),
      );

      cells.push(
        wordTableCell(agunanParagraphs, {
          width: 30,
        }),
      );

      /* =================================================
           KETERANGAN / STATUS
        ================================================= */

      if (agunanIndex === 0) {
        cells.push(
          wordTableCell(String(row.status ?? "—"), {
            width: 15,
            alignment: AlignmentType.CENTER,
            vertical: "center",
            bold: true,
            rowSpan: totalRows,
          }),
        );
      }

      tableRows.push(
        new TableRow({
          children: cells,
        }),
      );
    });
  });

  /* =======================================================
     EMPTY
  ======================================================= */

  if (rows.length === 0) {
    tableRows.push(
      new TableRow({
        children: [
          wordTableCell("Belum ada data agunan.", {
            width: 100,
            alignment: AlignmentType.CENTER,
            columnSpan: 6,
          }),
        ],
      }),
    );
  }

  /* =======================================================
     TABLE

     ALL BORDER
  ======================================================= */

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },

    borders: {
      top: WORD_BORDER,
      bottom: WORD_BORDER,
      left: WORD_BORDER,
      right: WORD_BORDER,
      insideHorizontal: WORD_BORDER,
      insideVertical: WORD_BORDER,
    },

    rows: tableRows,
  });
}

/* =========================================================
   WORD - FOTO BDS
   2 FOTO PER HALAMAN
========================================================= */

async function createWordPhotoPages(assets) {
  const paragraphs = [];

  /*
   * GLOBAL BDS ARRAY
   */
  const allPhotos = assets?.bds || [];

  for (let index = 0; index < allPhotos.length; index += 2) {
    const first = allPhotos[index]?.blob || null;

    const second = allPhotos[index + 1]?.blob || null;

    const firstRun = first ? await createWordImageRun(first) : null;

    const secondRun = second ? await createWordImageRun(second) : null;

    /*
     * FOTO PERTAMA
     */
    paragraphs.push(
      new Paragraph({
        pageBreakBefore: true,

        alignment: AlignmentType.CENTER,

        spacing: {
          before: 0,
          after: 250,
        },

        children: firstRun ? [firstRun] : [],
      }),
    );

    /*
     * FOTO KEDUA
     */
    if (secondRun) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,

          spacing: {
            before: 100,
            after: 0,
          },

          children: [secondRun],
        }),
      );
    }
  }

  return paragraphs;
}

/* =========================================================
   WORD IMAGE
========================================================= */

async function createWordImageRun(blob) {
  const dimensions = await getImageDimensions(blob);

  const maxWidth = 520;
  const maxHeight = 350;

  const ratio = dimensions.width / dimensions.height;

  let width = maxWidth;

  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;

    width = height * ratio;
  }

  return new ImageRun({
    data: await blob.arrayBuffer(),

    transformation: {
      width: Math.round(width),

      height: Math.round(height),
    },
  });
}

/* =========================================================
   WORD - HEADER
========================================================= */

async function createWordHeader({ nomorSurat, tanggal, mandiriLogo }) {
  /*
   * LOGO
   */
  let logoRun = null;

  if (mandiriLogo) {
    const dimensions = await getImageDimensions(mandiriLogo);

    const maxWidth = 430;
    const maxHeight = 105;

    const ratio = dimensions.width / dimensions.height;

    let width = maxWidth;

    let height = width / ratio;

    if (height > maxHeight) {
      height = maxHeight;

      width = height * ratio;
    }

    logoRun = new ImageRun({
      data: await mandiriLogo.arrayBuffer(),

      transformation: {
        width: Math.round(width),

        height: Math.round(height),
      },
    });
  }

  /* =======================================================
     IDENTITAS SURAT
  ======================================================= */

  const suratInfoTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },

    borders: {
      top: WORD_NO_BORDER,
      bottom: WORD_NO_BORDER,
      left: WORD_NO_BORDER,
      right: WORD_NO_BORDER,
      insideHorizontal: WORD_NO_BORDER,
      insideVertical: WORD_NO_BORDER,
    },

    rows: [
      createSuratInfoRow("Nomor", nomorSurat),

      createSuratInfoRow("Tanggal", tanggal),

      createSuratInfoRow("Lampiran", "-"),
    ],
  });

  /* =======================================================
     HEADER UTAMA
     
     INI SENGAJA TETAP SEPERTI VERSI SEBELUMNYA.
  ======================================================= */

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },

    borders: {
      top: WORD_NO_BORDER,
      bottom: WORD_NO_BORDER,
      left: WORD_NO_BORDER,
      right: WORD_NO_BORDER,
      insideHorizontal: WORD_NO_BORDER,
      insideVertical: WORD_NO_BORDER,
    },

    rows: [
      new TableRow({
        children: [
          /*
           * KIRI
           */
          new TableCell({
            width: {
              size: 60,
              type: WidthType.PERCENTAGE,
            },

            borders: {
              top: WORD_NO_BORDER,
              bottom: WORD_NO_BORDER,
              left: WORD_NO_BORDER,
              right: WORD_NO_BORDER,
            },

            children: [suratInfoTable],
          }),

          /*
           * KANAN
           */
          new TableCell({
            width: {
              size: 40,
              type: WidthType.PERCENTAGE,
            },

            borders: {
              top: WORD_NO_BORDER,
              bottom: WORD_NO_BORDER,
              left: WORD_NO_BORDER,
              right: WORD_NO_BORDER,
            },

            children: [
              ...(logoRun
                ? [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,

                      spacing: {
                        after: 20,
                      },

                      children: [logoRun],
                    }),
                  ]
                : []),

              wordParagraph("PT BANK MANDIRI (Persero) Tbk.", {
                bold: true,
                size: 17,
                alignment: AlignmentType.RIGHT,
              }),

              wordParagraph("Kantor Cabang Mikro / Mandiri Mitra Usaha", {
                size: 16,
                alignment: AlignmentType.RIGHT,
              }),

              wordParagraph("Jambi Kuamang Kuning", {
                size: 16,
                alignment: AlignmentType.RIGHT,
              }),

              wordParagraph("Jl. Batanghari RT.06/02", {
                size: 16,
                alignment: AlignmentType.RIGHT,
              }),

              wordParagraph("Ds. Purwasari Kec. Pelepat Ilir", {
                size: 16,
                alignment: AlignmentType.RIGHT,
              }),

              wordParagraph("Bungo - Jambi", {
                size: 16,
                alignment: AlignmentType.RIGHT,
              }),

              wordParagraph("Telp.: 07477326156 / Fax.: 07477326157", {
                size: 16,
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/* =========================================================
   SURAT INFO ROW
========================================================= */

function createSuratInfoRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: {
          size: 14,
          type: WidthType.PERCENTAGE,
        },

        borders: {
          top: WORD_NO_BORDER,
          bottom: WORD_NO_BORDER,
          left: WORD_NO_BORDER,
          right: WORD_NO_BORDER,
        },

        children: [
          wordParagraph(label, {
            size: 20,
          }),
        ],
      }),

      new TableCell({
        width: {
          size: 2,
          type: WidthType.PERCENTAGE,
        },

        borders: {
          top: WORD_NO_BORDER,
          bottom: WORD_NO_BORDER,
          left: WORD_NO_BORDER,
          right: WORD_NO_BORDER,
        },

        children: [
          wordParagraph(":", {
            size: 20,
          }),
        ],
      }),

      new TableCell({
        width: {
          size: 44,
          type: WidthType.PERCENTAGE,
        },

        borders: {
          top: WORD_NO_BORDER,
          bottom: WORD_NO_BORDER,
          left: WORD_NO_BORDER,
          right: WORD_NO_BORDER,
        },

        children: [
          wordParagraph(value, {
            size: 20,
          }),
        ],
      }),

      new TableCell({
        width: {
          size: 40,
          type: WidthType.PERCENTAGE,
        },

        borders: {
          top: WORD_NO_BORDER,
          bottom: WORD_NO_BORDER,
          left: WORD_NO_BORDER,
          right: WORD_NO_BORDER,
        },

        children: [],
      }),
    ],
  });
}

/* =========================================================
   WORD - SURAT
========================================================= */

async function createWordDocument({
  rows = [],
  suratKeluar = "JKK 1",
  noSurat = "",
  tanggal = "",
  supervisor = {},
  assets,
}) {
  const nomorSurat = `NRF.R02.JBI.Um.JKK/${suratKeluar}/${noSurat || "-"}/2026`;

  const children = [];

  /* =======================================================
     HEADER
  ======================================================= */

  children.push(
    await createWordHeader({
      nomorSurat,
      tanggal,
      mandiriLogo: assets?.mandiriLogo || null,
    }),
  );

  /* =======================================================
     KEPADA
  ======================================================= */

  children.push(
    wordParagraph("Kepada,", {
      bold: true,
      size: 20,
      spacingBefore: 120,
    }),

    wordParagraph("PT.Bank Mandiri (Persero) Tbk", {
      size: 20,
    }),

    wordParagraph("Micro Business Cluster Jambi Bungo", {
      size: 20,
    }),

    wordParagraph("Jln Sudirman No. 58", {
      size: 20,
    }),

    wordParagraph("Muara Bungo", {
      size: 20,
      spacingAfter: 120,
    }),
  );

  /* =======================================================
     PERIHAL
  ======================================================= */

  children.push(
    new Paragraph({
      spacing: {
        after: 120,
      },

      children: [
        wordText("Perihal : ", {
          bold: true,
          size: 20,
        }),

        wordText("Pengambilan Agunan Kredit Mikro CO Muara Bungo.", {
          size: 20,
        }),
      ],
    }),
  );

  /* =======================================================
     BODY
  ======================================================= */

  children.push(
    wordParagraph(
      "Menunjuk perihal tersebut di atas, dengan ini mohon bantuannya untuk menyerahkan agunan kredit mikro Branch Kuamang Kuning kepada kami, selanjutnya agunan dimaksud akan kami tindak lanjuti sebagaimana mestinya, dengan rincian sebagai berikut.",
      {
        size: 20,
        line: 300,
        spacingAfter: 160,
      },
    ),
  );

  /* =======================================================
     TABLE ORDER AGUNAN
  ======================================================= */

  children.push(createWordAgunanTable(rows));

  /* =======================================================
     PENUTUP
  ======================================================= */

  children.push(
    wordParagraph(
      "Demikian permohonan kami atas bantuan dan kerjasamanya kami ucapkan terima kasih.",
      {
        size: 20,
        line: 300,
        spacingBefore: 180,
      },
    ),
  );

  /* =======================================================
     TANDA TANGAN
  ======================================================= */

  children.push(
    wordParagraph("PT. Bank Mandiri (Persero) Tbk", {
      size: 20,
      spacingBefore: 240,
    }),

    wordParagraph("KCP Jambi Kuamang Kuning", {
      size: 20,
    }),

    wordParagraph("", {
      size: 20,
      spacingAfter: 500,
    }),

    wordParagraph(supervisor?.name || "Nama Pegawai Pengawas", {
      bold: true,
      size: 20,
    }),

    wordParagraph(supervisor?.position || "Pengawas Unit", {
      size: 20,
      spacingAfter: 180,
    }),
  );

  /* =======================================================
     CATATAN
  ======================================================= */

  children.push(
    wordParagraph(
      "*) Jenis agunan cukup diisi SHM No, BPKB No. SK, an. dll tanpa alamat.",
      {
        size: 15,
      },
    ),

    wordParagraph("**) Keterangan diisi status pinjaman: Lunas / Top Up.", {
      size: 15,
    }),
  );

  /* =======================================================
     FOTO BDS
  ======================================================= */

  const photoPages = await createWordPhotoPages(assets);

  children.push(...photoPages);

  /* =======================================================
     DOCUMENT
  ======================================================= */

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
            },

            margin: {
              top: 850,
              bottom: 850,
              left: 900,
              right: 900,
            },
          },
        },

        children,
      },
    ],
  });
}

/* =========================================================
   WORD BLOB
========================================================= */

async function createWordBlob({
  rows = [],
  suratKeluar = "JKK 1",
  noSurat = "",
  tanggal = "",
  supervisor = {},
  assets,
}) {
  const document = await createWordDocument({
    rows,
    suratKeluar,
    noSurat,
    tanggal,
    supervisor,
    assets,
  });

  return Packer.toBlob(document);
}

/* =========================================================
   PUBLIC: WORD
========================================================= */

export async function downloadWord({
  rows = [],
  suratKeluar = "JKK 1",
  noSurat = "",
  tanggal = "",
  supervisor = {},
  assets,
  date = new Date(),
}) {
  const baseName = getBaseFileName({
    suratKeluar,
    date,
  });

  const blob = await createWordBlob({
    rows,
    suratKeluar,
    noSurat,
    tanggal,
    supervisor,
    assets,
  });

  saveAs(blob, `${baseName}.docx`);

  return blob;
}

/* =========================================================
   PUBLIC: PDF KESELURUHAN
========================================================= */

export async function downloadOverallPdf({
  assets,
  suratKeluar = "JKK 1",
  date = new Date(),
}) {
  const baseName = getBaseFileName({
    suratKeluar,
    date,
  });

  const blob = await createOverallPdfBlob({
    assets,
  });

  saveAs(blob, `${baseName}.pdf`);

  return blob;
}

/* =========================================================
   PUBLIC: ZIP
========================================================= */

export async function downloadZip({
  rows = [],
  bdsPhotos = [],
  signedLetter = null,
  suratKeluar = "JKK 1",
  noSurat = "",
  tanggal = "",
  supervisor = {},
  date = new Date(),
}) {
  /* =======================================================
     1. KOMPRES SURAT + FOTO BDS
  ======================================================= */

  const assets = await prepareCompressedAssets({
    signedLetter,
    bdsPhotos,
  });

  /* =======================================================
     2. PDF
  ======================================================= */

  const pdfBlob = await createOverallPdfBlob({
    assets,
  });

  /* =======================================================
     3. WORD
  ======================================================= */

  const wordBlob = await createWordBlob({
    rows,
    suratKeluar,
    noSurat,
    tanggal,
    supervisor,
    assets,
  });

  /* =======================================================
     4. NAMA FILE
  ======================================================= */

  const baseName = getBaseFileName({
    suratKeluar,
    date,
  });

  const pdfName = `${baseName}.pdf`;

  const wordName = `${baseName}.docx`;

  const zipName = `${baseName}.zip`;

  /* =======================================================
     5. ZIP
     
     HANYA PDF + WORD
  ======================================================= */

  const zip = new JSZip();

  zip.file(pdfName, pdfBlob);

  zip.file(wordName, wordBlob);

  /* =======================================================
     6. COMPRESS ZIP
  ======================================================= */

  const zipBlob = await zip.generateAsync({
    type: "blob",

    compression: "DEFLATE",

    compressionOptions: {
      level: 9,
    },
  });

  /* =======================================================
     7. DOWNLOAD
  ======================================================= */

  saveAs(zipBlob, zipName);

  return {
    zipBlob,
    pdfBlob,
    wordBlob,

    fileNames: {
      pdf: pdfName,
      word: wordName,
      zip: zipName,
    },
  };
}
