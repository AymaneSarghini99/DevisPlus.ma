/** Public pages: the landing, pricing and legal pages. Everything else is the app itself. */
export const MARKETING_PATHS = [
  "/",
  "/tarifs",
  "/legal",
  "/terms",
  "/privacy",
  "/cookies",
  "/refunds",
  "/acceptable-use",
  "/data-processing",
];
export const isPublicPath = (path: string) =>
  MARKETING_PATHS.includes(path.replace(/\/$/, "") || "/");
