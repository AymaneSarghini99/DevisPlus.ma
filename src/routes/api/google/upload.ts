import { createFileRoute } from "@tanstack/react-router";
import { handleUpload } from "@/lib/google/handlers";
import { googleDeps } from "@/lib/google/server";

export const Route = createFileRoute("/api/google/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => handleUpload(request, googleDeps()),
    },
  },
});
