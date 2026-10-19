import { createFileRoute } from "@tanstack/react-router";
import { readEnv } from "@/lib/google/config";
import { deploymentFrom } from "@/lib/deployment";

/** Public settings the sign-up page needs (no secrets). */
export const Route = createFileRoute("/api/app-config")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { signupMode: deploymentFrom(readEnv()).signupMode },
          { headers: { "cache-control": "no-store" } },
        ),
    },
  },
});
