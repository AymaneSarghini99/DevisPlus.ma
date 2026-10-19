import { createFileRoute } from "@tanstack/react-router";
import { handleWorkspaceStatus } from "@/lib/workspace/server";

export const Route = createFileRoute("/api/workspace/status")({
  server: { handlers: { GET: ({ request }) => handleWorkspaceStatus(request) } },
});
