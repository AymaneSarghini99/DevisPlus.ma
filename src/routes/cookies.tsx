import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalMeta } from "@/components/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: ({ match }) => legalMeta(match, "cookies"),
  component: () => <LegalPage id="cookies" />,
});
