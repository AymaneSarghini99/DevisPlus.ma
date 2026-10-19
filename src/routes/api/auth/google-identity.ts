import { createFileRoute } from "@tanstack/react-router";
import { handleIdentity } from "@/lib/google/handlers";
import { googleDeps } from "@/lib/google/server";

export const Route = createFileRoute("/api/auth/google-identity")({
  server: { handlers: { POST: ({ request }) => handleIdentity(request, googleDeps()) } },
});
