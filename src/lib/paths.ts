/** Public pages: landing, pricing, guides and legal pages. Everything else is the app itself. */
export const MARKETING_PATHS = [
  "/",
  "/tarifs",
  "/creer-devis-en-ligne",
  "/guides",
  "/legal",
  "/terms",
  "/privacy",
  "/cookies",
  "/refunds",
  "/acceptable-use",
  "/data-processing",
];
export const isPublicPath = (path: string) => {
  const p = path.replace(/\/$/, "") || "/";
  return MARKETING_PATHS.includes(p) || p.startsWith("/guides/");
};
