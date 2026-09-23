import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase instance using the public anon key.
 *
 * The homeowner-facing UI does not talk to Supabase directly for writes —
 * it goes through the /api/conversations route handlers, which use the
 * service-role client instead (see lib/supabase/admin.ts). This client is
 * exported for completeness (e.g. future read-only public views) but is
 * not required by the conversation flow itself.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
