import { createFileRoute } from "@tanstack/react-router";
import { handleFolders } from "@/lib/google/handlers";
import { googleDeps } from "@/lib/google/server";

export const Route = createFileRoute("/api/google/folders")({
  server: {
    handlers: {
      POST: async ({ request }) => handleFolders(request, googleDeps()),
    },
  },
});
