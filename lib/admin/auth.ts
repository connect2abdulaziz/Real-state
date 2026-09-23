import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin/roles";

export {
  isAdminConfigured,
  isAdminUser,
  adminAllowlist,
} from "@/lib/admin/roles";
export { ensureAdminUser } from "@/lib/admin/ensure-admin";

/** True when the current request has a Supabase session for an admin user. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminUser(user);
}

export async function getAdminUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminUser(user)) return null;
  return user;
}
