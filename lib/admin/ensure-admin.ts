import { createAdminClient } from "@/lib/supabase/admin";

async function findUserIdByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found.id;
    if (!data.users.length || data.users.length < 200) return null;
    page += 1;
  }
  return null;
}

/**
 * Ensures the bootstrap admin exists in Supabase Auth (email confirmed + role).
 * Safe to call repeatedly — creates or updates password / metadata.
 * Server-only (uses service role). Do not import from middleware.
 */
export async function ensureAdminUser(): Promise<{
  ok: boolean;
  email?: string;
  created?: boolean;
  error?: string;
}> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email || !password) {
    return {
      ok: false,
      error: "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local",
    };
  }

  if (password.length < 6) {
    return { ok: false, error: "ADMIN_PASSWORD must be at least 6 characters" };
  }

  try {
    const supabase = createAdminClient();
    const existingId = await findUserIdByEmail(supabase, email);

    if (existingId) {
      const { error } = await supabase.auth.admin.updateUserById(existingId, {
        password,
        email_confirm: true,
        app_metadata: { role: "admin" },
      });
      if (error) throw error;
      return { ok: true, email, created: false };
    }

    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });

    if (error) {
      const id = await findUserIdByEmail(supabase, email);
      if (!id) throw error;
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        id,
        {
          password,
          email_confirm: true,
          app_metadata: { role: "admin" },
        }
      );
      if (updateError) throw updateError;
      return { ok: true, email, created: false };
    }

    return { ok: true, email, created: true };
  } catch (err) {
    return {
      ok: false,
      email,
      error: err instanceof Error ? err.message : "Could not ensure admin user",
    };
  }
}
