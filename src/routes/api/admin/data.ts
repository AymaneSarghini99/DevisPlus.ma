import { createFileRoute } from "@tanstack/react-router";
import { handleAdminDataGet, handleAdminDataPost } from "@/lib/admin/server";

export const Route = createFileRoute("/api/admin/data")({
  server: {
    handlers: {
      GET: ({ request }) => handleAdminDataGet(request),
      POST: ({ request }) => handleAdminDataPost(request),
    },
  },
});
