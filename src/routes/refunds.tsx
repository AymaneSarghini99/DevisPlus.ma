import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalMeta } from "@/components/LegalPage";

export const Route = createFileRoute("/refunds")({
  head: ({ match }) => legalMeta(match, "refunds"),
  component: () => <LegalPage id="refunds" />,
});
