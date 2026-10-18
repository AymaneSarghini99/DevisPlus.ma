import { createFileRoute } from "@tanstack/react-router";
import { handleStatus } from "@/lib/google/handlers";
import { googleDeps } from "@/lib/google/server";

export const Route = createFileRoute("/api/google/status")({
  server: {
    handlers: {
      GET: async ({ request }) => handleStatus(request, googleDeps()),
    },
  },
});
