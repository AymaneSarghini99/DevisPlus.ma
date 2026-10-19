import { createFileRoute } from "@tanstack/react-router";
import { handleWorkspaceGet, handleWorkspacePost } from "@/lib/workspace/server";

export const Route = createFileRoute("/api/workspace/")({
  server: {
    handlers: {
      GET: ({ request }) => handleWorkspaceGet(request),
      POST: ({ request }) => handleWorkspacePost(request),
    },
  },
});
