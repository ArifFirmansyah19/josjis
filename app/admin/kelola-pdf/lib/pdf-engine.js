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
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Gagal membuat gambar hasil.")),
      "image/jpeg",
      quality,
    );
  });
}

export async function compressPdf({ file, level, colorMode, onProgress }) {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
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
      const image = await output.embedJpg(
        new Uint8Array(await blob.arrayBuffer()),
      );
      const viewport = sourcePage.getViewport({ scale: 1 });
      const pageWidth = viewport.width;
      const pageHeight = viewport.height;
      const ratio = Math.min(
        pageWidth / canvas.width,
        pageHeight / canvas.height,
      );
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;
      const page = output.addPage([pageWidth, pageHeight]);
      page.drawImage(image, {
        x: (pageWidth - width) / 2,
        y: (pageHeight - height) / 2,
        width,
        height,
      });
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

function solveLinearSystem(matrix, values) {
  const n = values.length;
  const a = matrix.map((row, i) => [...row, values[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;

    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) {
        pivot = row;
      }
    }

    if (Math.abs(a[pivot][col]) < 1e-10) {
      throw new Error(
        "Titik sudut dokumen tidak valid. Silakan atur ulang sudut.",
      );
    }

    [a[col], a[pivot]] = [a[pivot], a[col]];

    const divisor = a[col][col];
    for (let j = col; j <= n; j++) {
      a[col][j] /= divisor;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;

      const factor = a[row][col];
      for (let j = col; j <= n; j++) {
        a[row][j] -= factor * a[col][j];
      }
    }
  }

  return a.map((row) => row[n]);
}

function getPerspectiveTransform(sourcePoints, width, height) {
  const destinationPoints = [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: width - 1, y: height - 1 },
    { x: 0, y: height - 1 },
  ];

  const matrix = [];
  const values = [];

  for (let i = 0; i < 4; i++) {
    const { x: u, y: v } = destinationPoints[i];
    const { x, y } = sourcePoints[i];

    matrix.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    values.push(x);

    matrix.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    values.push(y);
  }

  return solveLinearSystem(matrix, values);
}

function warpPerspective(sourceCanvas, normalizedPoints) {
  const sourceContext = sourceCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!sourceContext) {
    throw new Error("Canvas sumber tidak tersedia.");
  }

  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  const points = normalizedPoints.map((point) => ({
    x: Math.max(0, Math.min(1, point.x)) * (sw - 1),
    y: Math.max(0, Math.min(1, point.y)) * (sh - 1),
  }));

  const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

  const outputWidth = Math.max(
    1,
    Math.round(
      Math.max(distance(points[0], points[1]), distance(points[3], points[2])),
    ),
  );

  const outputHeight = Math.max(
    1,
    Math.round(
      Math.max(distance(points[0], points[3]), distance(points[1], points[2])),
    ),
  );

  // Batasi ukuran agar pemrosesan gambar besar tidak terlalu berat.
  const maxDimension = 2000;
  const scale = Math.min(
    1,
    maxDimension / outputWidth,
    maxDimension / outputHeight,
  );

  const width = Math.max(1, Math.round(outputWidth * scale));
  const height = Math.max(1, Math.round(outputHeight * scale));

  const transform = getPerspectiveTransform(points, width, height);
  const [a, b, c, d, e, f, g, h] = transform;

  const source = sourceContext.getImageData(0, 0, sw, sh);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;

  const outputContext = outputCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!outputContext) {
    throw new Error("Canvas hasil tidak tersedia.");
  }

  const output = outputContext.createImageData(width, height);
  const src = source.data;
  const dst = output.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const denominator = g * x + h * y + 1;

      if (Math.abs(denominator) < 1e-10) continue;

      const sx = (a * x + b * y + c) / denominator;
      const sy = (d * x + e * y + f) / denominator;

      const targetIndex = (y * width + x) * 4;

      if (sx < 0 || sy < 0 || sx > sw - 1 || sy > sh - 1) {
        dst[targetIndex] = 255;
        dst[targetIndex + 1] = 255;
        dst[targetIndex + 2] = 255;
        dst[targetIndex + 3] = 255;
        continue;
      }

      // Interpolasi bilinear agar hasil tidak terlalu bergerigi.
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(sw - 1, x0 + 1);
      const y1 = Math.min(sh - 1, y0 + 1);

      const fx = sx - x0;
      const fy = sy - y0;

      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;

      for (let channel = 0; channel < 3; channel++) {
        const top = src[i00 + channel] * (1 - fx) + src[i10 + channel] * fx;

        const bottom = src[i01 + channel] * (1 - fx) + src[i11 + channel] * fx;

        dst[targetIndex + channel] = top * (1 - fy) + bottom * fy;
      }

      dst[targetIndex + 3] = 255;
    }
  }

  outputContext.putImageData(output, 0, 0);
  return outputCanvas;
}

function applyScanFilter(canvas, filter, colorMode) {
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error("Canvas filter tidak tersedia.");
  }

  const image = context.getImageData(0, 0, canvas.width, canvas.height);

  const data = image.data;

  let contrast = 1;

  if (filter === "document") contrast = 1.18;
  if (filter === "enhance") contrast = 1.1;

  const grayscale = colorMode === "grayscale" || filter === "grayscale";

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (grayscale) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray;
      g = gray;
      b = gray;
    }

    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  context.putImageData(image, 0, 0);
}

export async function imagesToPdf({
  files,
  colorMode = "color",
  crops = {},
  level = "medium",
  filter = "document",
  onProgress,
}) {
  const { PDFDocument } = await import("pdf-lib");
  const output = await PDFDocument.create();

  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const margin = 28;

  const compression = {
    light: { quality: 0.88, maxDimension: 2400 },
    medium: { quality: 0.72, maxDimension: 1800 },
    strong: { quality: 0.52, maxDimension: 1300 },
  }[level] || { quality: 0.72, maxDimension: 1800 };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const bitmap = await createImageBitmap(file);

    let canvas;

    try {
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = bitmap.width;
      sourceCanvas.height = bitmap.height;

      const sourceContext = sourceCanvas.getContext("2d");

      if (!sourceContext) {
        throw new Error("Canvas tidak tersedia.");
      }

      sourceContext.fillStyle = "#ffffff";
      sourceContext.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);

      sourceContext.drawImage(bitmap, 0, 0);

      // Jika crop tersedia, lakukan koreksi perspektif.
      const crop = crops[i];

      if (
        Array.isArray(crop) &&
        crop.length === 4 &&
        crop.every(
          (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y),
        )
      ) {
        canvas = warpPerspective(sourceCanvas, crop);
      } else {
        canvas = sourceCanvas;
      }

      // Sesuaikan resolusi maksimum berdasarkan pilihan kompresi.
      const resizeScale = Math.min(
        1,
        compression.maxDimension / Math.max(canvas.width, canvas.height),
      );

      if (resizeScale < 1) {
        const resizedCanvas = document.createElement("canvas");
        resizedCanvas.width = Math.max(
          1,
          Math.round(canvas.width * resizeScale),
        );
        resizedCanvas.height = Math.max(
          1,
          Math.round(canvas.height * resizeScale),
        );

        const resizedContext = resizedCanvas.getContext("2d");

        if (!resizedContext) {
          throw new Error("Gagal menyiapkan resolusi gambar.");
        }

        resizedContext.imageSmoothingEnabled = true;
        resizedContext.imageSmoothingQuality = "high";
        resizedContext.drawImage(
          canvas,
          0,
          0,
          resizedCanvas.width,
          resizedCanvas.height,
        );

        if (canvas !== sourceCanvas) {
          canvas.width = 0;
          canvas.height = 0;
        }

        canvas = resizedCanvas;
      }

      applyScanFilter(canvas, filter, colorMode);

      const blob = await canvasToJpegBlob(canvas, compression.quality);

      const image = await output.embedJpg(
        new Uint8Array(await blob.arrayBuffer()),
      );

      const maxWidth = A4_WIDTH - margin * 2;
      const maxHeight = A4_HEIGHT - margin * 2;

      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);

      const width = image.width * ratio;
      const height = image.height * ratio;

      const page = output.addPage([A4_WIDTH, A4_HEIGHT]);

      page.drawImage(image, {
        x: (A4_WIDTH - width) / 2,
        y: (A4_HEIGHT - height) / 2,
        width,
        height,
      });

      sourceCanvas.width = 0;
      sourceCanvas.height = 0;

      if (canvas !== sourceCanvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
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
  if (!active.length)
    throw new Error("Semua halaman dihapus. Sisakan minimal satu halaman.");
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
