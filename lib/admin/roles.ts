import type { User } from "@supabase/supabase-js";

/** Emails allowed as admins (comma-separated), plus anyone with app_metadata.role=admin. */
export function adminAllowlist(): string[] {
  const fromList = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const primary = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (primary && !fromList.includes(primary)) fromList.push(primary);
  return fromList;
}

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  if (user.app_metadata?.role === "admin") return true;
  const email = user.email.toLowerCase();
  return adminAllowlist().includes(email);
}
