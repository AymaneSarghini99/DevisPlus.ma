import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";
import { pageMeta } from "@/i18n/meta";
import { safeNext } from "@/lib/auth";

export const Route = createFileRoute("/inscription")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { next?: string | undefined; google?: string | undefined } => ({
    ...(safeNext(s["next"]) ? { next: safeNext(s["next"]) } : {}),
    ...(typeof s["google"] === "string" ? { google: s["google"] } : {}),
  }),
  head: ({ match }) => pageMeta(match, "signup"),
  component: Page,
});

function Page() {
  const { next, google } = Route.useSearch();
  return <AuthPage mode="signup" next={next} google={google} />;
}
