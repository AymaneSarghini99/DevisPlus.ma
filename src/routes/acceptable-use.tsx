import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalMeta } from "@/components/LegalPage";

export const Route = createFileRoute("/acceptable-use")({
  head: ({ match }) => legalMeta(match, "acceptable-use"),
  component: () => <LegalPage id="acceptable-use" />,
});
