import { createAdminClient } from "@/lib/supabase/admin";
import { PropertyRecord, ValuationRecord } from "@/lib/types";
import { ReportData, ReportHomeowner } from "@/lib/report/types";

/**
 * Loads everything needed to generate the Estate Valora PDF report.
 */
export async function loadReportData(valuationId: string): Promise<ReportData> {
  const supabase = createAdminClient();

  const { data: valuation, error: valuationError } = await supabase
    .from("valuations")
    .select("*")
    .eq("id", valuationId)
    .single();

  if (valuationError || !valuation) {
    throw new Error("Valuation not found");
  }

  if (valuation.status !== "completed") {
    throw new Error("Report is only available for completed valuations");
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("*")
    .eq("id", valuation.property_id)
    .single();

  if (propertyError || !property) {
    throw new Error("Property record not found");
  }

  let homeowner: ReportHomeowner = { name: null, email: null, phone: null };
  if (valuation.homeowner_id) {
    const { data: row } = await supabase
      .from("homeowners")
      .select("name, email, phone")
      .eq("id", valuation.homeowner_id)
      .single();
    if (row) {
      homeowner = {
        name: row.name ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
      };
    }
  }

  return {
    valuation: valuation as ValuationRecord,
    property: property as PropertyRecord,
    homeowner,
    generatedAt: new Date().toISOString(),
  };
}
