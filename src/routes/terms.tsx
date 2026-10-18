import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalMeta } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: ({ match }) => legalMeta(match, "terms"),
  component: () => <LegalPage id="terms" />,
});
