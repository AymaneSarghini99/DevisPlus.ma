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

export class StorageError extends Error {}

/** Throws StorageError when the browser refuses the write (quota full, private mode…). */
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new StorageError(
      "Enregistrement impossible : le stockage du navigateur est plein ou bloqué (logo trop lourd ?).",
    );
  }
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Une erreur inattendue est survenue.";
