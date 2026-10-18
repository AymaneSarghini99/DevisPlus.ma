import type { TFunction } from "i18next";
import type { fr } from "@/i18n/messages/fr/index";

// Single persistence layer. Everything is saved in this browser (localStorage) for now;
// swapping these two functions for a database client is the only change needed to move
// to server storage. There is no account or per-user isolation until then.

export function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export type ErrorCode = keyof (typeof fr)["errors"];

/** Business error carrying a translation key (under "errors"), never a hard-coded sentence. */
export class AppError extends Error {
  constructor(public code: ErrorCode) {
    super(code);
  }
}
export class StorageError extends AppError {}

/** Throws StorageError when the browser refuses the write (quota full, private mode…). */
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new StorageError("storage");
  }
}

/** Text to show for any caught error, in the interface language. */
export const errorMessage = (e: unknown, t: TFunction) =>
  e instanceof AppError ? t(`errors.${e.code}`) : t("errors.unexpected");
