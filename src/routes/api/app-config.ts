import { createFileRoute } from "@tanstack/react-router";
import { readEnv } from "@/lib/google/config";
import { emailConfig } from "@/lib/account/email";
import { deploymentFrom } from "@/lib/deployment";

/** Public settings the sign-up and password pages need (no secrets). */
export const Route = createFileRoute("/api/app-config")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            signupMode: deploymentFrom(readEnv()).signupMode,
            // Password reset links by email (else: the DevisPlus team resets it).
            resetByEmail: !!emailConfig(readEnv()),
          },
          { headers: { "cache-control": "no-store" } },
        ),
    },
  },
});
