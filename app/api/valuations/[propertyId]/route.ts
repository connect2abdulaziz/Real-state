import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: { propertyId: string } }
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("valuations")
    .select("*")
    .eq("property_id", params.propertyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch valuation:", error);
    return NextResponse.json({ error: "Could not fetch valuation" }, { status: 500 });
  }

  return NextResponse.json({ valuation: data });
}
