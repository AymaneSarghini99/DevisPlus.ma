import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalMeta } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: ({ match }) => legalMeta(match, "privacy"),
  component: () => <LegalPage id="privacy" />,
});
