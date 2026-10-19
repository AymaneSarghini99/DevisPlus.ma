import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/components/auth/PasswordPages";
import { pageMeta } from "@/i18n/meta";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: ({ match }) => pageMeta(match, "password"),
  component: ForgotPasswordPage,
});
