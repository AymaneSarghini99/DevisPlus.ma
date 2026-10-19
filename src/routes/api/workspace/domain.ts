import { createFileRoute } from "@tanstack/react-router";
import { handleDomainGet, handleDomainPost } from "@/lib/workspace/server";

export const Route = createFileRoute("/api/workspace/domain")({
  server: {
    handlers: {
      GET: ({ request }) => handleDomainGet(request),
      POST: ({ request }) => handleDomainPost(request),
    },
  },
});
