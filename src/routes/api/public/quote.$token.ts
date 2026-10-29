import { createFileRoute } from "@tanstack/react-router";
import { handleSharedQuoteAccept, handleSharedQuoteGet } from "@/lib/share/server";

export const Route = createFileRoute("/api/public/quote/$token")({
  server: {
    handlers: {
      GET: ({ params }) => handleSharedQuoteGet(params.token),
      POST: ({ request, params }) => handleSharedQuoteAccept(request, params.token),
    },
  },
});
