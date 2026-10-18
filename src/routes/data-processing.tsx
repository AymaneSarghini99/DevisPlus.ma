import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalMeta } from "@/components/LegalPage";

export const Route = createFileRoute("/data-processing")({
  head: ({ match }) => legalMeta(match, "data-processing"),
  component: () => <LegalPage id="data-processing" />,
});
