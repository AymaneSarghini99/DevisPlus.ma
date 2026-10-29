/**
 * Guided tours shown once after the setup (components/ProductTour.tsx). Each step points at the
 * element tagged `data-tour="<target>"` on the page; its title and note are the translations
 * `tour.<tour>.<target>.title` / `.text`. A step whose element is hidden (e.g. the A4 preview on
 * phones) is left out.
 */
export const TOURS = {
  dashboard: ["newQuote", "navClients", "navCatalogue", "navFollowups", "navSettings"],
  editor: ["client", "lines", "totals", "preview", "share"],
} as const;

export type TourId = keyof typeof TOURS;
