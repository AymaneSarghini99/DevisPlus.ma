/**
 * Free trial: a company that signed up and is not approved yet keeps up to N quotes (the server
 * says how many, see the free_trial migration). Creating one more opens the payment pop-up.
 * The limit is set when the workspace opens (lib/workspace/client); null = no limit.
 */
let limit: number | null = null;
const listeners = new Set<() => void>();

export const setTrialLimit = (n: number | null) => {
  limit = n;
};
export const trialLimit = () => limit;

/** Quotes left in the trial (null when the company has no limit). */
export const trialQuotesLeft = (quoteCount: number) =>
  limit === null ? null : Math.max(0, limit - quoteCount);

/** True for the error saveQuote throws when the trial has no quote left. */
export const isTrialLimit = (e: unknown) =>
  !!e && typeof e === "object" && (e as { code?: unknown }).code === "trialLimit";

/** Opens the payment pop-up (rendered once by the page guard). */
export function showPaywall() {
  listeners.forEach((l) => l());
}
export function onPaywall(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
