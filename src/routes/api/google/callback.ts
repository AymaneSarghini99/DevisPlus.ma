import { createFileRoute } from "@tanstack/react-router";
import { handleCallback } from "@/lib/google/handlers";
import { googleDeps } from "@/lib/google/server";

export const Route = createFileRoute("/api/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handleCallback(request, googleDeps()),
    },
  },
});
