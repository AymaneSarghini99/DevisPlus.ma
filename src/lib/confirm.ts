/**
 * Promise-based confirmation, shown by <ConfirmHost /> (mounted once in the root layout).
 * Replaces the browser's window.confirm with a dialog in the app's own style and language.
 *
 *   if (!(await askConfirm({ title: "Supprimer le devis ?", tone: "danger" }))) return;
 */
export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for deletions and anything that cannot be undone. */
  tone?: "danger" | "default";
};
export type ConfirmRequest = ConfirmOptions & { resolve: (ok: boolean) => void };

let listener: ((r: ConfirmRequest) => void) | null = null;

/** Registered by ConfirmHost. */
export function onConfirmRequest(fn: ((r: ConfirmRequest) => void) | null) {
  listener = fn;
}

export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // Without the host (tests, server rendering), refuse rather than act silently.
    if (!listener) return resolve(false);
    listener({ ...options, resolve });
  });
}
