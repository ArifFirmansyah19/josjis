import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const BLACK = rgb(0, 0, 0);

const DETAIL_X = 57;
const DETAIL_WIDTH = 480;
const DETAIL_SIZE = 11;
const DETAIL_LINE_HEIGHT = 15;
const DETAIL_DEFAULT_TOP = 220;
const DETAIL_BOTTOM = 560;
const DETAIL_MIN_TOP = 120;
const DETAIL_GAP = 2;

function drawText(page, text, x, top, font, size, options = {}) {
  const value = String(text ?? "");
  if (!value) return;

  page.drawText(value, {
    x,
    y: PAGE_HEIGHT - top - size,
    font,
    size,
    color: options.color || BLACK,
  });
}

function fitText(text, font, preferredSize, maxWidth, minSize = 7) {
  let size = preferredSize;

  while (
    size > minSize &&
    font.widthOfTextAtSize(String(text), size) > maxWidth
  ) {
    size -= 0.25;
  }

  return size;
}

function drawFit(page, text, x, top, maxWidth, font, preferredSize = 11) {
  const value = String(text ?? "");
  const size = fitText(value, font, preferredSize, maxWidth);

  drawText(page, value, x, top, font, size);

  return size;
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);

      // Menangani kata yang lebih panjang dari lebar halaman.
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let part = "";

        for (const character of word) {
          const candidatePart = part + character;

          if (part && font.widthOfTextAtSize(candidatePart, size) > maxWidth) {
            lines.push(part);
            part = character;
          } else {
            part = candidatePart;
          }
        }

        current = part;
      } else {
        current = word;
      }
    }
  }

  if (current) lines.push(current);

  return lines;
}

function drawWrapped(
  page,
  text,
  x,
  top,
  maxWidth,
  font,
  size,
  lineHeight,
  maxBottom,
) {
  const lines = wrapText(text, font, size, maxWidth);
  let currentTop = top;

  for (const line of lines) {
    if (currentTop + lineHeight > maxBottom) {
      throw new Error(
        "Keterangan terlalu panjang untuk area Advis. Periksa kembali isi keterangan.",
      );
    }

    drawFit(page, line, x, currentTop, maxWidth, font, size);
    currentTop += lineHeight;
  }

  return currentTop;
}

/**
 * Menghitung tinggi aktual keterangan berdasarkan hasil wrapping PDF.
 * Setiap elemen array merupakan kelompok baris tersendiri.
 */
function getStackedHeight(
  lines,
  font,
  size,
  maxWidth,
  lineHeight,
  gap = DETAIL_GAP,
) {
  let totalHeight = 0;
  let groupCount = 0;
  let renderedLineCount = 0;

  for (const line of lines) {
    if (!String(line ?? "").trim()) continue;

    const wrappedLines = wrapText(line, font, size, maxWidth);

    if (!wrappedLines.length) continue;

    totalHeight += wrappedLines.length * lineHeight;
    renderedLineCount += wrappedLines.length;
    groupCount += 1;
  }

  if (groupCount > 0) {
    totalHeight += groupCount * gap;
  }

  return {
    totalHeight,
    groupCount,
    renderedLineCount,
  };
}

/**
 * Menggambar keterangan bertingkat.
 */
function drawStacked(
  page,
  lines,
  x,
  top,
  maxWidth,
  font,
  size,
  lineHeight,
  maxBottom,
  gap = DETAIL_GAP,
) {
  let currentTop = top;

  for (const line of lines) {
    if (!String(line ?? "").trim()) continue;

    currentTop = drawWrapped(
      page,
      line,
      x,
      currentTop,
      maxWidth,
      font,
      size,
      lineHeight,
      maxBottom,
    );

    currentTop += gap;
  }

  return currentTop;
}

/**
 * Menentukan posisi awal keterangan secara dinamis.
 * Keterangan yang lebih panjang dinaikkan agar posisi akhirnya
 * tetap relatif dekat dengan posisi standar.
 */
function getDetailStartTop(
  lines,
  font,
  size,
  maxWidth,
  defaultTop = DETAIL_DEFAULT_TOP,
  lineHeight = DETAIL_LINE_HEIGHT,
  gap = DETAIL_GAP,
) {
  const { totalHeight, renderedLineCount } = getStackedHeight(
    lines,
    font,
    size,
    maxWidth,
    lineHeight,
    gap,
  );

  if (!renderedLineCount) return defaultTop;

  const targetEnd = defaultTop + lineHeight + gap;
  const calculatedTop = targetEnd - totalHeight;

  return Math.max(DETAIL_MIN_TOP, calculatedTop);
}

/**
 * Menggambar keterangan dan mengembalikan posisi akhirnya.
 */
function drawAdaptiveDetail(page, lines, font) {
  const detailTop = getDetailStartTop(lines, font, DETAIL_SIZE, DETAIL_WIDTH);

  const detailHeight = getStackedHeight(
    lines,
    font,
    DETAIL_SIZE,
    DETAIL_WIDTH,
    DETAIL_LINE_HEIGHT,
    DETAIL_GAP,
  );

  if (detailTop + detailHeight.totalHeight > DETAIL_BOTTOM) {
    throw new Error(
      "Keterangan Advis terlalu panjang. Kurangi panjang keterangan agar muat dalam satu halaman.",
    );
  }

  const detailEnd = drawStacked(
    page,
    lines,
    DETAIL_X,
    detailTop,
    DETAIL_WIDTH,
    font,
    DETAIL_SIZE,
    DETAIL_LINE_HEIGHT,
    DETAIL_BOTTOM,
    DETAIL_GAP,
  );

  return {
    detailTop,
    detailEnd,
  };
}

/**
 * Mengubah byte PDF menjadi base64.
 */
function base64FromBytes(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

/**
 * Normalisasi nomor aplikasi.
 * Mencegah awalan AD- menjadi ganda.
 */
function normalizeNomorAplikasi(value) {
  return String(value ?? "")
    .trim()
    .replace(/^AD-/i, "");
}

/**
 * Memisahkan keterangan Notaris menjadi beberapa baris.
 * Jika nama debitur belum ada, otomatis ditambahkan.
 */
function splitNotarisDetail(detailTransaksi, nama) {
  const detail = String(detailTransaksi ?? "").trim();

  if (!detail) return [];

  let lines = detail
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Mendukung format satu baris:
  // Pembayaran Biaya SKMHT/APHT an. Nama Debitur
  if (lines.length === 1) {
    const match = lines[0].match(/^([\s\S]*?)\s+an\.\s*([\s\S]*)$/i);

    if (match && match[1].trim() && match[2].trim()) {
      lines = [match[1].trim(), `an. ${match[2].trim()}`];
    }
  }

  const sudahAdaNamaDebitur = lines.some((line) => /\ban\./i.test(line));

  if (!sudahAdaNamaDebitur && String(nama ?? "").trim()) {
    lines.push(`an. ${String(nama).trim()}`);
  }

  return lines;
}

/**
 * Menggambar nominal dan terbilang setelah keterangan.
 * Digunakan bersama oleh generator Notaris dan Asuransi.
 */
function drawNominalAndTerbilang(
  page,
  nominal,
  terbilang,
  detailEnd,
  bold,
  italic,
  errorPrefix = "Teks Advis",
) {
  const nominalTop = Math.max(327, detailEnd + 20);

  drawFit(page, `Rp. ${nominal}`, 280, nominalTop, 250, bold, 12);

  const terbilangTop = nominalTop + 21;

  const terbilangEnd = drawWrapped(
    page,
    terbilang,
    46,
    terbilangTop,
    480,
    italic,
    11,
    14,
    700,
  );

  const rekeningTop = Math.max(377, terbilangEnd + 12);

  if (rekeningTop + 40 > PAGE_HEIGHT - 35) {
    throw new Error(
      `${errorPrefix} terlalu panjang untuk satu halaman A4. Periksa keterangan atau terbilang.`,
    );
  }

  return rekeningTop;
}

/**
 * Menggambar blok rekening tabungan debitur.
 */
function drawRekeningDebitur(
  page,
  rekeningTabunganDebitur,
  nama,
  rekeningTop,
  bold,
) {
  drawText(page, "D/", 231, rekeningTop, bold, 19);

  drawFit(page, rekeningTabunganDebitur, 255, rekeningTop - 4, 285, bold, 11);

  drawFit(page, nama, 255, rekeningTop + 15, 285, bold, 11);
}

/**
 * Generator Advis Pelunasan.
 * Layout dipertahankan seperti sebelumnya.
 */
export async function createAdvisPelunasanPdf(data) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const {
    nama = "",
    norekPinjaman = "",
    norekTabungan = "",
    tanggal = "",
    nominal = "",
    terbilang = "",
    detailTransaksi = "PEMBAYARAN PELUNASAN PINJAMAN",
  } = data || {};

  if (!nama || !norekPinjaman || !norekTabungan || !nominal) {
    throw new Error(
      "Nama debitur, rekening pinjaman, rekening tabungan, dan nominal wajib tersedia.",
    );
  }

  drawText(page, tanggal, 65, 68, bold, 12);

  drawText(page, "K/", 339, 132, bold, 19);
  drawFit(page, norekPinjaman, 367, 126, 180, bold, 11);
  drawFit(page, `Yth. ${nama}`, 367, 146, 180, bold, 11);

  const detailEnd = drawWrapped(
    page,
    detailTransaksi,
    57,
    220,
    480,
    regular,
    11,
    15,
    560,
  );

  const nominalTop = Math.max(327, detailEnd + 20);

  drawFit(page, `Rp. ${nominal}`, 280, nominalTop, 250, bold, 12);

  const terbilangTop = nominalTop + 21;

  const terbilangEnd = drawWrapped(
    page,
    terbilang,
    46,
    terbilangTop,
    480,
    italic,
    11,
    14,
    700,
  );

  const rekeningTop = Math.max(377, terbilangEnd + 12);

  if (rekeningTop + 40 > PAGE_HEIGHT - 35) {
    throw new Error(
      "Teks Advis terlalu panjang untuk satu halaman A4. Periksa detail transaksi atau nominal terbilang.",
    );
  }

  drawText(page, "D/", 231, rekeningTop, bold, 19);
  drawFit(page, norekTabungan, 255, rekeningTop - 4, 285, bold, 11);
  drawFit(page, nama, 255, rekeningTop + 15, 285, bold, 11);

  const bytes = await pdf.save();
  return base64FromBytes(bytes);
}

/**
 * Generator Advis Notaris.
 * Satu objek data menghasilkan satu halaman PDF.
 * Array data menghasilkan satu PDF dengan beberapa halaman.
 *
 * Format:
 * Pembayaran Biaya SKMHT/APHT
 * an. Nama Debitur
 */
export async function createAdvisNotarisPdf(dataArray) {
  const items = Array.isArray(dataArray) ? dataArray : [dataArray];

  if (!items.length) {
    throw new Error("Belum ada data Advis Notaris.");
  }

  const pdf = await PDFDocument.create();

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  for (let index = 0; index < items.length; index++) {
    const data = items[index] || {};

    const {
      nama = "",
      rekeningNotaris = "",
      namaNotaris = "",
      rekeningTabunganDebitur = "",
      tanggal = "",
      nominal = "",
      terbilang = "",
      detailTransaksi = "",
    } = data;

    if (
      !String(nama).trim() ||
      !String(rekeningNotaris).trim() ||
      !String(namaNotaris).trim() ||
      !String(rekeningTabunganDebitur).trim() ||
      !String(nominal).trim() ||
      !String(tanggal).trim() ||
      !String(detailTransaksi).trim()
    ) {
      throw new Error(
        `Data Advis Notaris halaman ${index + 1} belum lengkap. Periksa nama debitur, notaris, rekening, tanggal, nominal, dan keterangan.`,
      );
    }

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    drawText(page, tanggal, 65, 68, bold, 12);

    drawText(page, "K/", 339, 132, bold, 19);
    drawFit(page, rekeningNotaris, 367, 126, 180, bold, 11);
    drawFit(page, `Yth. ${namaNotaris}`, 367, 146, 180, bold, 11);

    const detailLines = splitNotarisDetail(detailTransaksi, nama);
    const { detailEnd } = drawAdaptiveDetail(page, detailLines, regular);

    const rekeningTop = drawNominalAndTerbilang(
      page,
      nominal,
      terbilang,
      detailEnd,
      bold,
      italic,
      `Teks Advis Notaris halaman ${index + 1}`,
    );

    drawRekeningDebitur(page, rekeningTabunganDebitur, nama, rekeningTop, bold);
  }

  const bytes = await pdf.save();
  return base64FromBytes(bytes);
}

/**
 * Generator Advis Asuransi.
 *
 * Digunakan untuk Asuransi Jiwa dan Asuransi Kebakaran.
 * Satu debitur menghasilkan satu halaman.
 * Array debitur menghasilkan satu PDF gabungan.
 */
async function createAdvisAsuransiPdf(
  dataArray,
  jenisAsuransi,
  namaJenisAsuransi,
) {
  const items = Array.isArray(dataArray) ? dataArray : [dataArray];

  if (!items.length) {
    throw new Error(`Belum ada data Advis Asuransi ${namaJenisAsuransi}.`);
  }

  const pdf = await PDFDocument.create();

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  for (let index = 0; index < items.length; index++) {
    const data = items[index] || {};

    const {
      nama = "",
      rekeningGiroAsuradur = "",
      namaAsuradur = "",
      rekeningTabunganDebitur = "",
      nomorAplikasi = "",
      tanggal = "",
      nominal = "",
      terbilang = "",
    } = data;

    if (
      !String(nama).trim() ||
      !String(rekeningGiroAsuradur).trim() ||
      !String(namaAsuradur).trim() ||
      !String(rekeningTabunganDebitur).trim() ||
      !String(nomorAplikasi).trim() ||
      !String(tanggal).trim() ||
      !String(nominal).trim()
    ) {
      throw new Error(
        `Data Advis Asuransi ${namaJenisAsuransi} halaman ${index + 1} belum lengkap. Periksa nama debitur, asuradur, rekening, nomor aplikasi, tanggal, dan nominal.`,
      );
    }

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Tanggal.
    drawText(page, tanggal, 65, 68, bold, 12);

    // Rekening giro dan nama asuradur.
    drawText(page, "K/", 339, 132, bold, 19);
    drawFit(page, rekeningGiroAsuradur, 367, 126, 180, bold, 11);
    drawFit(page, `Yth. ${namaAsuradur}`, 367, 146, 180, bold, 11);

    // Nomor aplikasi tanpa awalan AD- ganda.
    const nomorAplikasiFinal = normalizeNomorAplikasi(nomorAplikasi);

    // Tiga baris keterangan transaksi.
    const detailLines = [
      `Pembayaran Premi ${jenisAsuransi}`,
      `an. ${nama}`,
      `AD-${nomorAplikasiFinal}`,
    ];

    const { detailEnd } = drawAdaptiveDetail(page, detailLines, regular);

    // Nominal mengikuti posisi akhir keterangan.
    const rekeningTop = drawNominalAndTerbilang(
      page,
      nominal,
      terbilang,
      detailEnd,
      bold,
      italic,
      `Teks Advis Asuransi ${namaJenisAsuransi} halaman ${index + 1}`,
    );

    drawRekeningDebitur(page, rekeningTabunganDebitur, nama, rekeningTop, bold);
  }

  const bytes = await pdf.save();
  return base64FromBytes(bytes);
}

/**
 * Generator Advis Asuransi Jiwa.
 *
 * Format:
 * Pembayaran Premi Asuransi Jiwa
 * an. Nama Debitur
 * AD-Nomor Aplikasi
 */
export async function createAdvisAsuransiJiwaPdf(dataArray) {
  return createAdvisAsuransiPdf(dataArray, "Asuransi Jiwa", "Jiwa");
}

/**
 * Generator Advis Asuransi Kebakaran.
 *
 * Format:
 * Pembayaran Premi Asuransi Kebakaran
 * an. Nama Debitur
 * AD-Nomor Aplikasi
 */
export async function createAdvisAsuransiKebakaranPdf(dataArray) {
  return createAdvisAsuransiPdf(dataArray, "Asuransi Kebakaran", "Kebakaran");
}
