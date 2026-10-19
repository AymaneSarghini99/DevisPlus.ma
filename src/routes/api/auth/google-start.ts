import { createFileRoute } from "@tanstack/react-router";
import { handleSignInStart } from "@/lib/google/handlers";
import { googleDeps } from "@/lib/google/server";

export const Route = createFileRoute("/api/auth/google-start")({
  server: { handlers: { GET: ({ request }) => handleSignInStart(request, googleDeps()) } },
});
