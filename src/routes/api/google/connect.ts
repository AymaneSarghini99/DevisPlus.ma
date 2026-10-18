import { createFileRoute } from "@tanstack/react-router";
import { handleConnect } from "@/lib/google/handlers";
import { googleDeps } from "@/lib/google/server";

export const Route = createFileRoute("/api/google/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => handleConnect(request, googleDeps()),
    },
  },
});
