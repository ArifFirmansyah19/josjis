import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const lemburIds = body?.lembur_ids;

    if (!Array.isArray(lemburIds) || lemburIds.length === 0) {
      return NextResponse.json(
        {
          error: "Pilih minimal satu data lembur.",
        },
        {
          status: 400,
        },
      );
    }

    const documentEngineUrl =
      process.env.DOCUMENT_ENGINE_URL || "http://localhost:10000";

    const engineApiKey = process.env.ENGINE_API_KEY;

    if (!engineApiKey) {
      console.error("ENGINE_API_KEY belum tersedia.");

      return NextResponse.json(
        {
          error: "Konfigurasi Document Engine belum lengkap.",
        },
        {
          status: 500,
        },
      );
    }

    const response = await fetch(`${documentEngineUrl}/generate/spkl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Engine-Key": engineApiKey,
      },
      body: JSON.stringify({
        lembur_ids: lemburIds,
      }),

      // Jangan gunakan cache untuk generate dokumen.
      cache: "no-store",
    });

    if (!response.ok) {
      let errorMessage = "Gagal membuat SPKL.";

      try {
        const errorData = await response.json();

        if (errorData?.detail) {
          errorMessage = errorData.detail;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Response bukan JSON.
      }

      console.error("Document Engine error:", response.status, errorMessage);

      return NextResponse.json(
        {
          error: errorMessage,
        },
        {
          status: response.status,
        },
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="SPKL.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("API SPKL error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Terjadi kesalahan saat menghubungkan ke Document Engine.",
      },
      {
        status: 500,
      },
    );
  }
}
