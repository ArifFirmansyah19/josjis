import { grayscaleCanvas, getCompressionConfig } from "./pdf-utils";

export async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

export async function renderPdfPageToCanvas(pdfPage, scale = 1) {
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas tidak tersedia.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const renderTask = pdfPage.render({ canvasContext: context, viewport });
  await renderTask.promise;
  return canvas;
}

export async function loadPdfPagePreviews(file, onProgress) {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const loadedPages = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const pdfPage = await pdf.getPage(i);
      const canvas = await renderPdfPageToCanvas(pdfPage, 0.8);
      loadedPages.push({
        id: `${file.name}-${i}-${Math.random().toString(36).slice(2, 9)}`,
        originalIndex: i - 1,
        originalPageNumber: i,
        rotation: 0,
        deleted: false,
        previewUrl: canvas.toDataURL("image/jpeg", 0.68),
        baseRotation: pdfPage.rotate || 0,
      });
      canvas.width = 0;
      canvas.height = 0;
      pdfPage.cleanup?.();
      onProgress?.(i, pdf.numPages);
    }
    return { pages: loadedPages, totalPages: pdf.numPages };
  } finally {
    await loadingTask.destroy();
  }
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Gagal membuat gambar hasil.")), "image/jpeg", quality);
  });
}

export async function compressPdf({ file, level, colorMode, onProgress }) {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const source = await loadingTask.promise;
  const { PDFDocument } = await import("pdf-lib");
  const output = await PDFDocument.create();
  const config = getCompressionConfig(level);
  try {
    for (let i = 1; i <= source.numPages; i++) {
      const sourcePage = await source.getPage(i);
      const canvas = await renderPdfPageToCanvas(sourcePage, config.scale);
      if (colorMode === "grayscale") grayscaleCanvas(canvas);
      const blob = await canvasToJpegBlob(canvas, config.quality);
      const image = await output.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const viewport = sourcePage.getViewport({ scale: 1 });
      const pageWidth = viewport.width;
      const pageHeight = viewport.height;
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;
      const page = output.addPage([pageWidth, pageHeight]);
      page.drawImage(image, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
      canvas.width = 0;
      canvas.height = 0;
      sourcePage.cleanup?.();
      onProgress?.(i, source.numPages);
    }
    return await output.save({ useObjectStreams: true });
  } finally {
    await loadingTask.destroy();
  }
}

export async function imagesToPdf({ files, colorMode, onProgress }) {
  const { PDFDocument } = await import("pdf-lib");
  const output = await PDFDocument.create();
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const margin = 28;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas tidak tersedia.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0);
      if (colorMode === "grayscale") grayscaleCanvas(canvas);
      const blob = await canvasToJpegBlob(canvas, 0.9);
      const image = await output.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const maxWidth = A4_WIDTH - margin * 2;
      const maxHeight = A4_HEIGHT - margin * 2;
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = image.width * ratio;
      const height = image.height * ratio;
      const page = output.addPage([A4_WIDTH, A4_HEIGHT]);
      page.drawImage(image, { x: (A4_WIDTH - width) / 2, y: (A4_HEIGHT - height) / 2, width, height });
      canvas.width = 0;
      canvas.height = 0;
    } finally {
      bitmap.close?.();
    }
    onProgress?.(i + 1, files.length);
  }
  return await output.save({ useObjectStreams: true });
}

export async function mergePdfs(files, onProgress) {
  const { PDFDocument } = await import("pdf-lib");
  const output = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const source = await PDFDocument.load(await files[i].arrayBuffer());
    const copied = await output.copyPages(source, source.getPageIndices());
    copied.forEach((page) => output.addPage(page));
    onProgress?.(i + 1, files.length);
  }
  return await output.save({ useObjectStreams: true });
}

export async function editPdfPages({ file, pages, onProgress }) {
  const { PDFDocument, degrees } = await import("pdf-lib");
  const source = await PDFDocument.load(await file.arrayBuffer());
  const output = await PDFDocument.create();
  const active = pages.filter((page) => !page.deleted);
  if (!active.length) throw new Error("Semua halaman dihapus. Sisakan minimal satu halaman.");
  for (let i = 0; i < active.length; i++) {
    const info = active[i];
    const [page] = await output.copyPages(source, [info.originalIndex]);
    const originalRotation = page.getRotation().angle || 0;
    page.setRotation(degrees((originalRotation + info.rotation) % 360));
    output.addPage(page);
    onProgress?.(i + 1, active.length);
  }
  return await output.save({ useObjectStreams: true });
}

export async function splitPdf({ file, selectedPages }) {
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.load(await file.arrayBuffer());
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, selectedPages);
  copied.forEach((page) => output.addPage(page));
  return await output.save({ useObjectStreams: true });
}
