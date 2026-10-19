import type { TFunction } from "i18next";
import type { fr } from "@/i18n/messages/fr/index";
import type { RemoteStore } from "@/lib/workspace/sync";

// Single persistence layer. Once the signed-in company's workspace is open (lib/workspace/client),
// its keys are read from and saved to the server; the other keys (and everything before sign-in)
// stay in this browser (localStorage).

const remotes: RemoteStore[] = [];
const remoteFor = (key: string) => remotes.find((r) => r.keys.has(key));

/** Serves the store's keys from the server from now on; returns the function that stops it. */
export function attachRemote(r: RemoteStore) {
  remotes.push(r);
  return () => {
    const i = remotes.indexOf(r);
    if (i >= 0) remotes.splice(i, 1);
  };
}

export function read<T>(key: string, fallback: T): T {
  try {
    const r = remoteFor(key);
    const v = r ? r.cache.get(key) : localStorage.getItem(key);
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
  const r = remoteFor(key);
  if (r) return r.write(key, JSON.stringify(value));
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new StorageError("storage");
  }
}

/** Text to show for any caught error, in the interface language. */
export const errorMessage = (e: unknown, t: TFunction) =>
  e instanceof AppError ? t(`errors.${e.code}`) : t("errors.unexpected");
