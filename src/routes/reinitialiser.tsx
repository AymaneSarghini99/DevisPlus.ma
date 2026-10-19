import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/components/auth/PasswordPages";
import { pageMeta } from "@/i18n/meta";

/** Better Auth sends the email link here with ?token=… (or ?error=INVALID_TOKEN). */
export const Route = createFileRoute("/reinitialiser")({
  validateSearch: (s: Record<string, unknown>): { token?: string; error?: string } => ({
    ...(typeof s["token"] === "string" ? { token: s["token"] } : {}),
    ...(typeof s["error"] === "string" ? { error: s["error"] } : {}),
  }),
  head: ({ match }) => pageMeta(match, "password"),
  component: Page,
});

function Page() {
  const { token, error } = Route.useSearch();
  return <ResetPasswordPage token={token} error={error} />;
}
