import { useCallback, useEffect, useState } from "react";
import { askConfirm } from "@/lib/confirm";
import { AlertTriangle, CheckCircle2, FolderPlus, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Dropdown } from "./Dropdown";
import { loadSettings } from "@/lib/store";
import { GoogleDriveIcon } from "./GoogleDriveIcon";

type Folder = { id: string; name: string };
type Status =
  | { configured: false; connected: false; missing: string[] }
  | {
      configured: true;
      connected: boolean;
      email?: string;
      folder?: Folder | null;
      folderStatus?: "none" | "ok" | "missing";
      error?: string;
    };

const RESULTS = ["connected", "denied", "state", "scope", "not_configured", "revoked"];

async function post<T>(path: string, body: unknown): Promise<T & { error?: string }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  return (await res.json().catch(() => ({ error: "error" }))) as T & { error?: string };
}

/** Settings section: connect Google Drive, choose the folder for quotation PDFs, disconnect.
 *  Every state shown here comes from the server, which checks it with Google. */
export function GoogleDriveSection() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [choice, setChoice] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<"" | "folders" | "save" | "create" | "disconnect">("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/google/status", { credentials: "same-origin" });
      setStatus((await res.json()) as Status);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    // Default folder name: "<Company> – Devis & Factures" once the company is known.
    const company = loadSettings().company.name.trim();
    setNewName(company ? `${company} – ${t("drive.folderSuffix")}` : t("drive.defaultFolder"));
    // Result of the Google redirect (?drive=…): show it once, then clean the address bar.
    const url = new URL(window.location.href);
    const result = url.searchParams.get("drive");
    if (result) {
      const key = RESULTS.includes(result) ? result : "error";
      if (key === "connected") toast.success(t("drive.result.connected"));
      else toast.error(t(`drive.result.${key}` as never));
      url.searchParams.delete("drive");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      document.getElementById("google-drive")?.scrollIntoView({ block: "start" });
    }
    load();
  }, [load, t]);

  const connected = status?.configured && status.connected;
  const needsFolder = connected && (!status.folder || status.folderStatus === "missing" || editing);

  // Folders the app can use are listed when a folder has to be chosen.
  useEffect(() => {
    if (!needsFolder || folders) return;
    setBusy("folders");
    post<{ folders: Folder[] }>("/api/google/folders", { action: "list" })
      .then((r) => {
        if (r.error) throw new Error(r.error);
        setFolders(r.folders);
        setChoice(r.folders[0]?.id ?? "");
      })
      .catch(() => setFolders([]))
      .finally(() => setBusy(""));
  }, [needsFolder, folders]);

  const fail = (code?: string) =>
    toast.error(t(`drive.error.${code && ERRORS.includes(code) ? code : "error"}` as never));

  const select = async (action: "select" | "create") => {
    setBusy(action === "select" ? "save" : "create");
    const r = await post<{ folder: Folder }>(
      "/api/google/folders",
      action === "select" ? { action, id: choice } : { action, name: newName },
    );
    setBusy("");
    if (r.error) {
      fail(r.error);
      if (r.error === "revoked") load();
      return;
    }
    toast.success(t("drive.folderSaved", { name: r.folder.name }));
    setEditing(false);
    setFolders(null);
    load();
  };

  const disconnect = async () => {
    const ok = await askConfirm({
      title: t("drive.disconnect"),
      description: t("drive.disconnectConfirm"),
      confirmLabel: t("drive.disconnect"),
      tone: "danger",
    });
    if (!ok) return;
    setBusy("disconnect");
    const r = await post<{ revoked: boolean }>("/api/google/disconnect", {});
    setBusy("");
    if (r.error) {
      fail(r.error);
      return;
    }
    toast.success(t("drive.disconnected"));
    setFolders(null);
    setEditing(false);
    load();
  };

  return (
    <section id="google-drive" className="scroll-mt-24">
      <div className="flex items-center gap-2.5">
        <GoogleDriveIcon className="size-5" />
        <h2 className="font-semibold">{t("drive.title")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("drive.intro")}</p>

      <div className="mt-4 space-y-4 rounded-[var(--radius)] border bg-card p-5">
        {!status && !loadError && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("drive.checking")}
          </p>
        )}
        {loadError && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-destructive">
            {t("drive.loadError")}
            <button type="button" className="btn btn-ghost h-8" onClick={load}>
              <RefreshCw className="size-3.5" /> {t("drive.retry")}
            </button>
          </p>
        )}

        {/* Not configured yet looks the same: clicking Connect then explains it is not set up. */}
        {status && !status.connected && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">{t("drive.notConnected")}</p>
              {"error" in status && status.error === "revoked" && (
                <p className="mt-1 text-destructive">{t("drive.error.revoked")}</p>
              )}
            </div>
            {/* Full-page navigation: the server redirects to Google's own sign-in page. */}
            <a href="/api/google/connect" className="btn btn-primary">
              <GoogleDriveIcon className="size-4" /> {t("drive.connect")}
            </a>
          </div>
        )}

        {connected && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-medium">{t("drive.connectedAs")}</p>
                  <bdi dir="ltr" className="text-muted-foreground">
                    {status.email || "—"}
                  </bdi>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost text-destructive"
                disabled={busy === "disconnect"}
                onClick={disconnect}
              >
                {busy === "disconnect" && <Loader2 className="size-4 animate-spin" />}
                {t("drive.disconnect")}
              </button>
            </div>
            {status.error && (
              <p className="flex items-center gap-2 rounded-sm bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <AlertTriangle className="size-4 shrink-0" />
                {t(
                  `drive.error.${ERRORS.includes(status.error) ? status.error : "error"}` as never,
                )}
              </p>
            )}

            <div className="border-t pt-4">
              <p className="label">{t("drive.folder")}</p>
              {status.folder && status.folderStatus !== "missing" && !editing && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <bdi className="font-medium">{status.folder.name}</bdi>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
                    {t("drive.changeFolder")}
                  </button>
                </div>
              )}
              {status.folderStatus === "missing" && (
                <p className="mb-3 flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="size-4 shrink-0" /> {t("drive.error.folder_missing")}
                </p>
              )}
              {needsFolder && (
                <div className="space-y-4">
                  {busy === "folders" ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> {t("drive.loadingFolders")}
                    </p>
                  ) : folders && folders.length > 0 ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-56 flex-1">
                        <Dropdown
                          ariaLabel={t("drive.folder")}
                          value={choice}
                          onChange={setChoice}
                          options={folders.map((f) => ({ value: f.id, label: f.name }))}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!choice || busy === "save"}
                        onClick={() => select("select")}
                      >
                        {busy === "save" && <Loader2 className="size-4 animate-spin" />}
                        {t("drive.useFolder")}
                      </button>
                    </div>
                  ) : null}
                  <div>
                    <label className="label" htmlFor="drive-new">
                      {t("drive.newFolder")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        id="drive-new"
                        dir="auto"
                        maxLength={100}
                        className="field min-w-56 flex-1"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={!newName.trim() || busy === "create"}
                        onClick={() => select("create")}
                      >
                        {busy === "create" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <FolderPlus className="size-4" />
                        )}
                        {t("drive.createFolder")}
                      </button>
                    </div>
                  </div>
                  {editing && (
                    <button
                      type="button"
                      className="text-xs underline underline-offset-2"
                      onClick={() => setEditing(false)}
                    >
                      {t("drive.cancel")}
                    </button>
                  )}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">{t("drive.scopeNote")}</p>
            </div>
          </>
        )}
        {status?.configured && (
          <p className="border-t pt-3 text-xs text-muted-foreground">{t("drive.uploadsNext")}</p>
        )}
      </div>
    </section>
  );
}

const ERRORS = [
  "revoked",
  "scope",
  "folder_missing",
  "rate_limited",
  "google_unavailable",
  "bad_request",
  "not_connected",
  "forbidden",
];
