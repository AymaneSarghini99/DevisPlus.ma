import { newTenant, type Tenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/config";

/** The signed-in server account (Better Auth user). */
export type AccountUser = { id: string; email: string };

/**
 * Links this browser's workspace to the signed-in account. Business data still lives in the
 * browser, so it must only ever be shown to the account it belongs to:
 * - no workspace yet: a new one for this account (then the setup wizard);
 * - a workspace of this account: unchanged;
 * - an older browser-only workspace (password or Google lock) with the same email: linked;
 * - a workspace of another account: refused ("other").
 */
export function linkTenant(
  tenant: Tenant | null,
  user: AccountUser,
  locale: Locale,
): { tenant: Tenant; changed: boolean } | { other: true } {
  const email = user.email.trim().toLowerCase();
  if (!tenant) {
    const t = newTenant(locale);
    return {
      tenant: {
        ...t,
        admin: { email, passwordHash: "", salt: "", googleSub: "", userId: user.id },
        profile: { ...t.profile, email },
      },
      changed: true,
    };
  }
  const a = tenant.admin;
  if (a.userId) return a.userId === user.id ? { tenant, changed: false } : { other: true };
  const legacy = !!(a.passwordHash || a.googleSub);
  if (legacy && a.email.trim().toLowerCase() !== email) return { other: true };
  return {
    tenant: {
      ...tenant,
      admin: { email, passwordHash: "", salt: "", googleSub: "", userId: user.id },
    },
    changed: true,
  };
}
