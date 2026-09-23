import { Suspense } from "react";
import { ensureAdminUser, isAdminConfigured } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata = {
  title: "Admin login | Estate Valora",
};

export default async function AdminLoginPage() {
  const configured = isAdminConfigured();
  let seed: { ok: boolean; email?: string; error?: string; created?: boolean } | null =
    null;

  if (configured) {
    seed = await ensureAdminUser();
  }

  const defaultEmail =
    seed?.email || process.env.ADMIN_EMAIL?.trim() || "";

  return (
    <div className="min-h-screen flex items-center justify-center px-5 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(183,172,127,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(44,156,197,0.08), transparent 50%)",
        }}
      />
      <div className="relative w-full max-w-md text-center">
        <p className="font-serif text-[2rem] text-foreground">Estate Valora</p>
        <p className="mt-1 text-[12px] uppercase tracking-[0.16em] text-foreground-subtle">
          Brokerage dashboard
        </p>
        <div className="mt-8 rounded-md border border-white/10 bg-surface/80 backdrop-blur-sm px-6 py-7 text-left">
          {!configured ? (
            <div className="space-y-3 text-[13px] text-foreground-muted leading-relaxed">
              <p className="text-foreground font-medium">Supabase not configured</p>
              <p>
                Set{" "}
                <code className="text-electric text-[12px]">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>
                , anon key, and{" "}
                <code className="text-electric text-[12px]">
                  SUPABASE_SERVICE_ROLE_KEY
                </code>{" "}
                in <code className="text-[12px]">.env.local</code>.
              </p>
            </div>
          ) : (
            <>
              {seed && !seed.ok && (
                <p className="mb-4 text-[12px] text-warm leading-relaxed">
                  Could not sync admin user: {seed.error}. You can still sign in
                  if the account already exists in Supabase Auth.
                </p>
              )}
              {seed?.ok && (
                <p className="mb-4 text-[12px] text-foreground-subtle leading-relaxed">
                  Supabase Auth · admin{" "}
                  {seed.created ? "created" : "synced"} for{" "}
                  <span className="text-foreground-muted">{seed.email}</span>
                </p>
              )}
              <Suspense
                fallback={
                  <p className="text-foreground-muted text-sm">Loading…</p>
                }
              >
                <AdminLoginForm defaultEmail={defaultEmail} />
              </Suspense>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
