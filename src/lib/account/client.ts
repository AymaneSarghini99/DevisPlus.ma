/** Accounts in the browser: Better Auth client (same origin, /api/auth). */
import { createAuthClient } from "better-auth/react";
import { loadTenant, saveTenant, type Tenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/config";
import { linkTenant, type AccountUser } from "./link";

export const authClient = createAuthClient();

/** Links and saves this browser's workspace for the signed-in user; null when it belongs to another account. */
export function linkLocalWorkspace(user: AccountUser, locale: Locale): Tenant | null {
  let current: Tenant | null = null;
  try {
    current = loadTenant();
  } catch {
    current = null;
  }
  const r = linkTenant(current, user, locale);
  if ("other" in r) return null;
  if (r.changed) saveTenant(r.tenant);
  return r.tenant;
}
