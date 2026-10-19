import { createFileRoute } from "@tanstack/react-router";
import { handleAccountsGet, handleAccountsPost } from "@/lib/admin/server";

export const Route = createFileRoute("/api/admin/accounts")({
  server: {
    handlers: {
      GET: ({ request }) => handleAccountsGet(request),
      POST: ({ request }) => handleAccountsPost(request),
    },
  },
});
