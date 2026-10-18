import { createFileRoute } from "@tanstack/react-router";
import { handleDisconnect } from "@/lib/google/handlers";
import { googleDeps } from "@/lib/google/server";

export const Route = createFileRoute("/api/google/disconnect")({
  server: {
    handlers: {
      POST: async ({ request }) => handleDisconnect(request, googleDeps()),
    },
  },
});
