/**
 * Details of the company that operates DevisPlus.ma, shown on the legal pages.
 *
 * Nothing here may be guessed: a value stays `null` until the owner provides it. Legal pages show a visible "to be completed" marker for each missing value, and
 * the documents stay in "draft" status (see documents.ts) until they are filled in and reviewed.
 */
/** Contact details supplied by the owner (2026-10-18), shown in the footer and legal pages. */
export const CONTACT = {
  street: "25 Avenue Hassan II",
  postalCode: "20000",
  city: "Casablanca",
  email: "contact@devisplus.ma",
  phone: "+212 677846536",
  website: "https://devisplus.ma",
} as const;

export const OPERATOR = {
  brand: "DevisPlus.ma",
  legalName: "DevisPlus.ma" as string | null, // raison sociale (provided by the owner)
  legalForm: null as string | null, // SARL, SARL AU, auto-entrepreneur…
  address: "25 Avenue Hassan II, 20000 Casablanca, Maroc" as string | null,
  rc: null as string | null,
  ice: null as string | null,
  if_: null as string | null,
  email: "contact@devisplus.ma" as string | null, // contact and privacy requests
  phone: "+212 677846536" as string | null,
  host: null as string | null, // hosting provider of the website
  hostLocation: null as string | null, // country of the servers
  cndp: null as string | null, // CNDP declaration / receipt number, if obtained
  court: null as string | null, // competent court, after legal advice
  // Commercial terms used by the refund policy (to be decided by the owner, then reviewed)
  acceptanceDelay: null as string | null,
  refundDelay: null as string | null,
};

export type OperatorField = Exclude<keyof typeof OPERATOR, "brand">;

export const missingOperatorFields = () =>
  (Object.keys(OPERATOR) as (keyof typeof OPERATOR)[]).filter(
    (k) => k !== "brand" && OPERATOR[k] === null,
  ) as OperatorField[];
