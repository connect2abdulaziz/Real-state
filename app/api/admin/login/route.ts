import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ensureAdminUser } from "@/lib/admin/ensure-admin";
import { isAdminUser } from "@/lib/admin/roles";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  // Ensure bootstrap admin exists (from ADMIN_EMAIL / ADMIN_PASSWORD in env)
  await ensureAdminUser();

  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || "Invalid email or password" },
      { status: 401 }
    );
  }

  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This account is not an admin" },
      { status: 403 }
    );
  }

  // Clear legacy HMAC cookie if present
  response.cookies.set("ev_admin_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}
