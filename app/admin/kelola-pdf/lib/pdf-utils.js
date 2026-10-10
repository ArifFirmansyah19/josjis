export function formatBytes(bytes = 0) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export function ensurePdfExtension(name) {
  const clean = String(name || "").trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");
  if (!clean) return "hasil-josjis.pdf";
  return clean.toLowerCase().endsWith(".pdf") ? clean : `${clean}.pdf`;
}

export function stripPdfExtension(name) {
  return String(name || "").replace(/\.pdf$/i, "");
}

export function getBaseName(filename) {
  return stripPdfExtension(filename || "hasil-josjis");
}

export function isPdf(file) {
  return file?.type === "application/pdf" || /\.pdf$/i.test(file?.name || "");
}

export function isImage(file) {
  return file?.type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(file?.name || "");
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function parsePdfRanges(input, totalPages) {
  if (!input || !totalPages) return [];
  const result = [];
  const chunks = input.split(",").map((item) => item.trim()).filter(Boolean);
  for (const chunk of chunks) {
    if (/^\d+\s*-\s*\d+$/.test(chunk)) {
      const [startRaw, endRaw] = chunk.split("-");
      let start = Math.max(1, Math.min(parseInt(startRaw, 10), totalPages));
      let end = Math.max(1, Math.min(parseInt(endRaw, 10), totalPages));
      if (start > end) [start, end] = [end, start];
      for (let page = start; page <= end; page++) result.push(page - 1);
    } else if (/^\d+$/.test(chunk)) {
      const page = parseInt(chunk, 10);
      if (page >= 1 && page <= totalPages) result.push(page - 1);
    }
  }
  return [...new Set(result)];
}

export function grayscaleCanvas(canvas) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  context.putImageData(imageData, 0, 0);
}

export function getCompressionConfig(level) {
  const configs = {
    light: { scale: 1.6, quality: 0.82, min: 0.75, max: 0.9, description: "Kualitas tinggi · kompresi ringan" },
    medium: { scale: 1.35, quality: 0.68, min: 0.5, max: 0.75, description: "Seimbang antara ukuran dan kualitas" },
    strong: { scale: 1.05, quality: 0.5, min: 0.25, max: 0.55, description: "Ukuran lebih kecil · kompresi kuat" },
  };
  return configs[level] || configs.medium;
}
