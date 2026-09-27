import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MANDIRI_LOGO_PATH = "/images/mandiri-logo.png";

function formatTanggal(value) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function getHari(value) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
  });
}

async function loadImageAsDataUrl(path) {
  try {
    const response = await fetch(path);

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        resolve(null);
      };

      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width || 1,
        height: img.naturalHeight || img.height || 1,
      });
    };

    img.onerror = () => {
      resolve({
        width: 1,
        height: 1,
      });
    };

    img.src = dataUrl;
  });
}

export async function exportSuratKeluarPdf({ unit, records = [] }) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    /*
     * ============================================================
     * LOGO MANDIRI
     * ============================================================
     */

    const logo = await loadImageAsDataUrl(MANDIRI_LOGO_PATH);

    let logoWidth = 0;
    let logoHeight = 0;

    if (logo) {
      try {
        const dimensions = await getImageDimensions(logo);

        /*
         * Lebar logo dibuat lebih besar.
         * Tingginya dihitung otomatis berdasarkan rasio
         * gambar asli agar logo tidak gepeng.
         */
        logoWidth = 48;

        logoHeight = (dimensions.height / dimensions.width) * logoWidth;

        /*
         * Batasi tinggi jika file logo ternyata sangat tinggi.
         */
        const maxLogoHeight = 20;

        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;

          logoWidth = (dimensions.width / dimensions.height) * logoHeight;
        }

        doc.addImage(logo, "PNG", 14, 8, logoWidth, logoHeight);
      } catch (error) {
        console.warn("Logo Mandiri gagal ditambahkan:", error);
      }
    }

    /*
     * ============================================================
     * JUDUL
     * ============================================================
     */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);

    doc.text(`BUKU SURAT KELUAR ${unit}`, pageWidth / 2, 34, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);

    doc.text("Register Surat Keluar", pageWidth / 2, 40, {
      align: "center",
    });

    /*
     * ============================================================
     * DATA TABEL
     * ============================================================
     */

    const body = records.map((record, index) => [
      String(index + 1).padStart(3, "0"),
      getHari(record.tanggal),
      formatTanggal(record.tanggal),
      record.keterangan || "-",
      record.tujuan || "-",
    ]);

    if (body.length === 0) {
      body.push(["", "", "", "Belum ada pencatatan surat keluar.", ""]);
    }

    /*
     * ============================================================
     * TABLE
     * ============================================================
     */

    autoTable(doc, {
      startY: 46,

      head: [["No", "Hari", "Tanggal", "Keterangan", "Tujuan"]],

      body,

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 8.5,
        textColor: [40, 40, 40],
        lineColor: [180, 180, 180],
        lineWidth: 0.2,
        cellPadding: 2.5,
        valign: "middle",
      },

      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [30, 30, 30],
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
      },

      columnStyles: {
        0: {
          cellWidth: 12,
          halign: "center",
        },

        1: {
          cellWidth: 25,
        },

        2: {
          cellWidth: 28,
        },

        3: {
          cellWidth: 60,
        },

        4: {
          cellWidth: "auto",
        },
      },

      alternateRowStyles: {
        fillColor: [252, 252, 252],
      },

      margin: {
        top: 46,
        left: 14,
        right: 14,
        bottom: 18,
      },

      /*
       * ==========================================================
       * HEADER / FOOTER SETIAP HALAMAN
       * ==========================================================
       */

      didDrawPage: () => {
        const currentPage = doc.internal.getNumberOfPages();

        /*
         * ------------------------------------------
         * Logo Mandiri
         * ------------------------------------------
         *
         * Logo ditambahkan ulang setiap halaman
         * agar muncul di semua halaman PDF.
         */

        if (logo && logoWidth > 0 && logoHeight > 0) {
          try {
            doc.addImage(logo, "PNG", 14, 8, logoWidth, logoHeight);
          } catch {
            // Abaikan jika logo gagal pada halaman tertentu.
          }
        }

        /*
         * ------------------------------------------
         * Footer
         * ------------------------------------------
         */

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);

        doc.text("JOSJIS", 14, pageHeight - 10);

        doc.text(`Halaman ${currentPage}`, pageWidth - 14, pageHeight - 10, {
          align: "right",
        });
      },
    });

    /*
     * ============================================================
     * DOWNLOAD
     * ============================================================
     */

    const safeUnit = unit.replace(/\s+/g, "-").toLowerCase();

    doc.save(`buku-surat-keluar-${safeUnit}.pdf`);
  } catch (error) {
    console.error("Gagal export Buku Surat Keluar:", error);

    window.alert(
      "PDF gagal dibuat. Silakan cek Console browser untuk detail error.",
    );
  }
}
