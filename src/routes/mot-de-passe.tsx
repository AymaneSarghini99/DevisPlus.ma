import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordPage } from "@/components/auth/PasswordPages";
import { pageMeta } from "@/i18n/meta";

export const Route = createFileRoute("/mot-de-passe")({
  head: ({ match }) => pageMeta(match, "password"),
  component: ChangePasswordPage,
});
