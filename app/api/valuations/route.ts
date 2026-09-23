import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { runValuation } from "@/lib/valuation/run-valuation";

// Manual/on-demand valuation trigger (admin only).
// Normal path: automatic on conversation complete.
export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const propertyId: string | undefined = body?.propertyId;
  const marketContext: string | undefined = body?.marketContext;

  if (!propertyId) {
    return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
  }

  try {
    const valuation = await runValuation({ propertyId, marketContext });
    return NextResponse.json({ valuation });
  } catch (err) {
    console.error("Valuation request failed:", err);
    return NextResponse.json(
      { error: "Could not generate a valuation" },
      { status: 500 }
    );
  }
}
