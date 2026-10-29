/** Public pages: landing, pricing, guides and legal pages. Everything else is the app itself. */
export const MARKETING_PATHS = [
  "/",
  "/tarifs",
  "/creer-devis-en-ligne",
  "/guides",
  "/nexx-entreprise-group",
  "/legal",
  "/terms",
  "/privacy",
  "/cookies",
  "/refunds",
  "/acceptable-use",
  "/data-processing",
];
/** A quote's acceptance page, opened by the company's client (no DevisPlus chrome there). */
export const isSharedQuotePath = (path: string) => path.startsWith("/accepter/");

export const isPublicPath = (path: string) => {
  const p = path.replace(/\/$/, "") || "/";
  return MARKETING_PATHS.includes(p) || p.startsWith("/guides/");
};
