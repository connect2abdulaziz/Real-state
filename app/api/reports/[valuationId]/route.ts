import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadReportData } from "@/lib/report/load-report-data";
import { renderReportPdf } from "@/lib/report/render-pdf";

/**
 * GET /api/reports/[valuationId]
 * Returns the branded Estate Valora PDF for a completed valuation.
 */
export async function GET(
  _req: Request,
  { params }: { params: { valuationId: string } }
) {
  try {
    const data = await loadReportData(params.valuationId);
    const pdf = await renderReportPdf(data);

    const supabase = createAdminClient();
    await supabase
      .from("valuations")
      .update({ report_generated_at: new Date().toISOString() })
      .eq("id", params.valuationId);

    const safeAddress = (data.property.address || "property")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Estate-Valora-${safeAddress}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate report";
    const status = message.includes("not found") ? 404 : 500;
    console.error("Report generation failed:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
