import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { updateConsultationStatus } from "@/lib/admin/queries";
import type { ConsultationStatus } from "@/lib/types";

const ALLOWED: ConsultationStatus[] = [
  "requested",
  "declined",
  "scheduled",
  "completed",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const status = body.status as ConsultationStatus;
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const updated = await updateConsultationStatus(params.id, status);
    return NextResponse.json({ ok: true, consultation: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
