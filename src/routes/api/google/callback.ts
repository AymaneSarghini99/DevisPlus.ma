import { createFileRoute } from "@tanstack/react-router";
import { handleAuth } from "@/lib/account/server";
import { handleCallback, isDriveCallback } from "@/lib/google/handlers";
import { googleDeps } from "@/lib/google/server";

/**
 * Google returns here both from the Drive connection and from "Continuer avec Google"
 * (one callback address registered in Google Cloud). Sign-in returns go to Better Auth.
 */
export const Route = createFileRoute("/api/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const deps = googleDeps();
        if (await isDriveCallback(request, deps)) return handleCallback(request, deps);
        const url = new URL(request.url);
        url.pathname = "/api/auth/callback/google";
        return handleAuth(new Request(url, request));
      },
    },
  },
});
