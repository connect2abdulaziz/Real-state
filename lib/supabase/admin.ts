import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service-role key.
 *
 * IMPORTANT: only import this from route handlers / server code
 * (app/api/**). Never import it into a "use client" component — the
 * service-role key must never reach the browser bundle. It bypasses Row
 * Level Security, which is intentional here: the homeowner conversation
 * has no auth session, so writes are mediated entirely by our own API
 * routes rather than by RLS policies keyed to a Supabase user.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
