import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";
import { pageMeta } from "@/i18n/meta";
import { safeNext } from "@/lib/auth";

export const Route = createFileRoute("/connexion")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { next?: string | undefined; google?: string | undefined } => ({
    ...(safeNext(s["next"]) ? { next: safeNext(s["next"]) } : {}),
    ...(typeof s["google"] === "string" ? { google: s["google"] } : {}),
  }),
  head: ({ match }) => pageMeta(match, "signin"),
  component: Page,
});

function Page() {
  const { next, google } = Route.useSearch();
  return <AuthPage mode="signin" next={next} google={google} />;
}
