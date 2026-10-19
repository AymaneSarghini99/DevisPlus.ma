import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Globe,
  KeyRound,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Dropdown } from "@/components/Dropdown";
import { F } from "@/components/Form";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/i18n/LocaleProvider";
import type { AccountRow } from "@/lib/admin/server";
import { askConfirm } from "@/lib/confirm";
import type { DnsRecord, HostnameState } from "@/lib/domains/cloudflare";
import { PLATFORM_DOMAIN } from "@/lib/tenant";

export type AccountsData = {
  me: string;
  domains: boolean;
  signupMode: "approval" | "open" | "closed";
  accounts: AccountRow[];
};
type Approval = AccountRow["approval"];
const APPROVALS: Approval[] = ["pending", "approved", "rejected", "suspended"];
type Action =
  | "approve"
  | "reject"
  | "suspend"
  | "domainActivate"
  | "domainRefresh"
  | "domainRemove"
  | "deleteAccount";

const BADGE: Record<Approval, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-900",
  suspended: "bg-muted text-muted-foreground",
};

/** 12 random characters, easy to read out (no 0/O, 1/l/I). */
function newPassword() {
  const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...crypto.getRandomValues(new Uint32Array(12))].map((n) => abc[n % abc.length]).join("");
}

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/accounts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    accounts?: AccountRow[];
    domain?: HostnameState;
    error?: string;
    detail?: string;
  } | null;
  return { ok: res.ok, data: data ?? {} };
}

/** Requested workspace address of a company (setup wizard), e.g. atlas.devisplus.ma. */
const requested = (a: AccountRow) => {
  const d = a.requestedDomain;
  if (!d) return "";
  return d.mode === "custom"
    ? d.customDomain
    : d.subdomain
      ? `${d.subdomain}.${PLATFORM_DOMAIN}`
      : "";
};

/**
 * The companies that signed up (or that the team created), newest first: accept, reject or
 * suspend them, create an account for a customer, and activate their own domain.
 */
export function AccountsPanel({ initial }: { initial: AccountsData }) {
  const { t } = useTranslation();
  const { fmt } = useLocale();
  const [list, setList] = useState(initial.accounts);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"" | Approval>("");
  const [busy, setBusy] = useState("");
  const [creating, setCreating] = useState(false);
  const [dns, setDns] = useState<HostnameState | null>(null);
  const [resetting, setResetting] = useState<AccountRow | null>(null);

  const counts = useMemo(() => {
    const c = { all: list.length, pending: 0, approved: 0, rejected: 0, suspended: 0 };
    for (const a of list) c[a.approval]++;
    return c;
  }, [list]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((a) => !filter || a.approval === filter)
      .filter(
        (a) =>
          !q ||
          [a.company, a.name, a.email, a.phone, a.city, requested(a), a.customDomain]
            .join(" ")
            .toLowerCase()
            .includes(q),
      );
  }, [list, query, filter]);

  const act = async (a: AccountRow, action: Action, extra: Record<string, unknown> = {}) => {
    if (action === "reject" || action === "suspend") {
      const ok = await askConfirm({
        title: t(`account.admin.confirm.${action}`, { name: a.company || a.email }),
        description: t(`account.admin.confirm.${action}Text`),
        confirmLabel: t(`account.admin.action.${action}`),
        tone: "danger",
      });
      if (!ok) return;
    }
    if (action === "deleteAccount") {
      const ok = await askConfirm({
        title: t("account.admin.confirm.deleteAccount", { name: a.company || a.email }),
        description: t("account.admin.confirm.deleteAccountText", { email: a.email }),
        confirmLabel: t("account.admin.action.deleteAccount"),
        tone: "danger",
      });
      if (!ok) return;
    }
    if (action === "domainRemove") {
      const ok = await askConfirm({
        title: t("account.admin.confirm.domainRemove", { domain: a.customDomain }),
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusy(a.orgId + action);
    try {
      const { ok, data } = await post({ action, orgId: a.orgId, ...extra });
      if (!ok) {
        toast.error(
          data.error === "cloudflare"
            ? `${t("account.admin.error.cloudflare")} ${data.detail ?? ""}`
            : t(`account.admin.error.${data.error ?? "failed"}`, {
                defaultValue: t("account.admin.error.failed"),
              }),
        );
        return;
      }
      if (data.accounts) setList(data.accounts);
      if (data.domain) {
        setDns(data.domain);
        const fresh = await fetch("/api/admin/accounts", { credentials: "same-origin" })
          .then((r) => r.json())
          .catch(() => null);
        if (fresh?.accounts) setList(fresh.accounts);
      }
      if (
        action === "approve" ||
        action === "reject" ||
        action === "suspend" ||
        action === "deleteAccount"
      )
        toast.success(t(`account.admin.done.${action}`, { name: a.company || a.email }));
      if (action === "domainRemove") {
        setList((l) =>
          l.map((x) =>
            x.orgId === a.orgId
              ? { ...x, customDomain: "", hostnameId: "", domainState: "none" }
              : x,
          ),
        );
      }
    } finally {
      setBusy("");
    }
  };

  const kpis: [string, number, "" | Approval][] = [
    [t("account.admin.kpi.all"), counts.all, ""],
    [t("account.admin.status.pending"), counts.pending, "pending"],
    [t("account.admin.status.approved"), counts.approved, "approved"],
    [t("account.admin.status.rejected"), counts.rejected, "rejected"],
    [t("account.admin.status.suspended"), counts.suspended, "suspended"],
  ];

  return (
    <div className="space-y-6">
      <div className="ob-enter flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("account.admin.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`account.admin.mode.${initial.signupMode}`)}
          </p>
        </div>
        <button type="button" className="btn btn-accent" onClick={() => setCreating(true)}>
          <UserPlus className="size-4" /> {t("account.admin.create")}
        </button>
      </div>

      <dl className="ob-enter grid grid-cols-2 gap-px overflow-hidden border bg-border sm:grid-cols-5">
        {kpis.map(([label, value, f]) => (
          <button
            key={label}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className="bg-card p-4 text-start transition hover:bg-muted/50 aria-pressed:bg-muted"
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="num mt-1 text-2xl font-semibold">{value}</dd>
          </button>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            className="field ps-9"
            aria-label={t("account.admin.search")}
            placeholder={t("account.admin.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Dropdown
          className="w-56"
          ariaLabel={t("account.admin.col.status")}
          value={filter}
          onChange={(v) => setFilter(v as "" | Approval)}
          options={[
            { value: "", label: t("account.admin.allStatuses") },
            ...APPROVALS.map((s) => ({ value: s, label: t(`account.admin.status.${s}`) })),
          ]}
        />
      </div>

      {!list.length ? (
        <div className="border border-dashed bg-card px-6 py-12 text-center">
          <Users className="mx-auto size-6 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">{t("account.admin.emptyTitle")}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t("account.admin.emptyText")}
          </p>
        </div>
      ) : !shown.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.noMatch")}</p>
      ) : (
        <div className="overflow-x-auto border bg-card">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {(["account", "joined", "setup", "domain", "status"] as const).map((k) => (
                  <th key={k} className="px-4 py-2.5 text-start font-medium">
                    {t(`account.admin.col.${k}`)}
                  </th>
                ))}
                <th className="w-px px-4 py-2.5">
                  <span className="sr-only">{t("account.admin.col.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((a) => {
                const req = a.customDomain || requested(a);
                const rowBusy = busy.startsWith(a.orgId);
                const canActivate =
                  initial.domains &&
                  !a.hostnameId &&
                  a.requestedDomain?.mode === "custom" &&
                  !!a.requestedDomain.customDomain;
                return (
                  <tr key={a.orgId} className="transition-colors hover:bg-muted/30">
                    <td className="max-w-72 px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <bdi className="truncate font-medium">{a.company || a.name || a.email}</bdi>
                        {a.isAdmin && (
                          <ShieldCheck
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-label={t("account.admin.isAdmin")}
                          />
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        <bdi dir="ltr">{a.email}</bdi>
                        {a.methods.length > 0 && (
                          <span>
                            {" · "}
                            {a.methods
                              .map((m) =>
                                m === "google" ? "Google" : t("account.admin.method.password"),
                              )
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="num px-4 py-3 whitespace-nowrap">
                      {fmt.date(a.joinedAt ?? a.createdAt)}
                      <div className="text-xs text-muted-foreground">
                        {a.lastSeen
                          ? t("account.admin.lastSeenOn", { date: fmt.date(a.lastSeen) })
                          : t("account.admin.neverSeen")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {a.setupDone ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <Check className="size-3.5" /> {t("account.admin.setupDone")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("account.admin.setupTodo")}
                        </span>
                      )}
                    </td>
                    <td className="max-w-56 px-4 py-3 text-xs">
                      {req ? (
                        <>
                          <bdi dir="ltr" className="num block truncate">
                            {req}
                          </bdi>
                          <span className="text-muted-foreground">
                            {a.customDomain
                              ? t(`admin.domain.${a.domainState}`)
                              : t("account.admin.requested")}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[a.approval]}`}
                        title={a.approvalChangedAt ? fmt.date(a.approvalChangedAt) : undefined}
                      >
                        {t(`account.admin.status.${a.approval}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {a.approval !== "approved" && (
                          <button
                            type="button"
                            className="btn btn-primary h-8 px-3 text-xs"
                            disabled={!!busy}
                            onClick={() => act(a, "approve")}
                          >
                            {busy === a.orgId + "approve" ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                            {t("account.admin.action.approve")}
                          </button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="rounded-sm p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                            disabled={!!busy}
                            aria-label={t("account.admin.more")}
                            title={t("account.admin.more")}
                          >
                            {rowBusy && busy !== a.orgId + "approve" ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="size-4" />
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-48">
                            {a.approval === "pending" && (
                              <DropdownMenuItem onSelect={() => act(a, "reject")}>
                                <X /> {t("account.admin.action.reject")}
                              </DropdownMenuItem>
                            )}
                            {a.approval === "approved" && (
                              <DropdownMenuItem onSelect={() => act(a, "suspend")}>
                                <PauseCircle /> {t("account.admin.action.suspend")}
                              </DropdownMenuItem>
                            )}
                            {a.userId && (
                              <DropdownMenuItem onSelect={() => setResetting(a)}>
                                <KeyRound /> {t("account.admin.action.resetPassword")}
                              </DropdownMenuItem>
                            )}
                            {canActivate && (
                              <DropdownMenuItem
                                onSelect={() =>
                                  act(a, "domainActivate", {
                                    hostname: a.requestedDomain!.customDomain,
                                  })
                                }
                              >
                                <Globe /> {t("account.admin.action.domainActivate")}
                              </DropdownMenuItem>
                            )}
                            {initial.domains && a.hostnameId && (
                              <>
                                <DropdownMenuItem onSelect={() => act(a, "domainRefresh")}>
                                  <RefreshCw /> {t("account.admin.action.domainRefresh")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => act(a, "domainRemove")}>
                                  <Globe /> {t("account.admin.action.domainRemove")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {!a.isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:bg-red-50 focus:text-destructive"
                                  onSelect={() => act(a, "deleteAccount")}
                                >
                                  <Trash2 /> {t("account.admin.action.deleteAccount")}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateAccount
          onClose={() => setCreating(false)}
          onCreated={(accounts) => setList(accounts)}
        />
      )}
      {dns && <DnsDialog state={dns} onClose={() => setDns(null)} />}
      {resetting && <ResetPassword account={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}

/** Customer's sign-in page, as seen from the admin portal (admin.x → x). */
const signInAddress = () =>
  typeof window === "undefined"
    ? ""
    : `${window.location.origin.replace("//admin.", "//")}/connexion`;

/** Sign-in details shown once, each with a copy button. */
function Credentials({ email, password }: { email: string; password: string }) {
  const { t } = useTranslation();
  return (
    <>
      {(
        [
          [t("account.admin.signInAt"), signInAddress()],
          [t("auth.email"), email],
          [t("auth.password"), password],
        ] as const
      ).map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-2 border-b pb-2">
          <span className="text-muted-foreground">{label}</span>
          <span className="flex items-center gap-1">
            <bdi dir="ltr" className="num font-medium">
              {value}
            </bdi>
            <CopyButton value={value} />
          </span>
        </div>
      ))}
    </>
  );
}

/** New temporary password for a customer who forgot theirs; shown once. */
function ResetPassword({ account, onClose }: { account: AccountRow; onClose: () => void }) {
  const { t } = useTranslation();
  const { dir } = useLocale();
  const [password, setPassword] = useState(newPassword);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError("");
    if (password.length < 8) return setError(t("validation.passwordShort"));
    setBusy(true);
    try {
      const { ok, data } = await post({
        action: "resetPassword",
        userId: account.userId,
        password,
      });
      if (!ok)
        return setError(
          t(`account.admin.error.${data.error ?? "failed"}`, {
            defaultValue: t("account.admin.error.failed"),
          }),
        );
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir={dir} className="sm:max-w-md">
        <DialogTitle>{t("account.admin.resetTitle")}</DialogTitle>
        <DialogDescription>
          {t("account.admin.resetText", { email: account.email })}
        </DialogDescription>
        {done ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-sm border-s-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-emerald-950">
              {t("account.admin.resetDone")}
            </p>
            <Credentials email={account.email} password={password} />
            <button type="button" className="btn btn-primary w-full" onClick={onClose}>
              {t("admin.form.close")}
            </button>
          </div>
        ) : (
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <F
              label={t("account.admin.form.password")}
              id="rp-password"
              hint={t("account.admin.form.passwordHint")}
            >
              <div className="flex gap-2">
                <input
                  id="rp-password"
                  dir="ltr"
                  className="field num"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost border"
                  aria-label={t("account.admin.form.newPassword")}
                  title={t("account.admin.form.newPassword")}
                  onClick={() => setPassword(newPassword())}
                >
                  <RefreshCw className="size-4" />
                </button>
              </div>
            </F>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("account.admin.resetSubmit")}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CopyButton({ value }: { value: string }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={t("account.admin.copy")}
      title={t("account.admin.copy")}
      onClick={() =>
        navigator.clipboard
          .writeText(value)
          .then(() => toast.success(t("account.admin.copied")))
          .catch(() => {})
      }
    >
      <Copy className="size-3.5" />
    </button>
  );
}

/** A customer account made by the team: approved at once; the password is shown once. */
function CreateAccount({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (a: AccountRow[]) => void;
}) {
  const { t } = useTranslation();
  const { dir } = useLocale();
  const [v, setV] = useState({ company: "", name: "", email: "", password: newPassword() });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ email: string; password: string } | null>(null);
  const set = (p: Partial<typeof v>) => setV({ ...v, ...p });

  const submit = async () => {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return setError(t("validation.email"));
    if (v.password.length < 8) return setError(t("validation.passwordShort"));
    setBusy(true);
    try {
      const { ok, data } = await post({ action: "create", ...v, email: v.email.trim() });
      if (!ok)
        return setError(
          t(`account.admin.error.${data.error ?? "failed"}`, {
            defaultValue: t("account.admin.error.failed"),
          }),
        );
      if (data.accounts) onCreated(data.accounts);
      setDone({ email: v.email.trim().toLowerCase(), password: v.password });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir={dir} className="sm:max-w-md">
        <DialogTitle>{t("account.admin.createTitle")}</DialogTitle>
        <DialogDescription>{t("account.admin.createText")}</DialogDescription>
        {done ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-sm border-s-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-emerald-950">
              {t("account.admin.createdText")}
            </p>
            <Credentials email={done.email} password={done.password} />
            <button type="button" className="btn btn-primary w-full" onClick={onClose}>
              {t("admin.form.close")}
            </button>
          </div>
        ) : (
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <F label={t("account.admin.form.company")} id="ca-company">
              <input
                id="ca-company"
                className="field"
                value={v.company}
                onChange={(e) => set({ company: e.target.value })}
              />
            </F>
            <F label={t("account.admin.form.name")} id="ca-name">
              <input
                id="ca-name"
                className="field"
                value={v.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </F>
            <F label={t("account.admin.form.email")} id="ca-email">
              <input
                id="ca-email"
                type="email"
                dir="ltr"
                className="field"
                value={v.email}
                onChange={(e) => set({ email: e.target.value })}
              />
            </F>
            <F
              label={t("account.admin.form.password")}
              id="ca-password"
              hint={t("account.admin.form.passwordHint")}
            >
              <div className="flex gap-2">
                <input
                  id="ca-password"
                  dir="ltr"
                  className="field num"
                  value={v.password}
                  onChange={(e) => set({ password: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-ghost border"
                  aria-label={t("account.admin.form.newPassword")}
                  title={t("account.admin.form.newPassword")}
                  onClick={() => set({ password: newPassword() })}
                >
                  <RefreshCw className="size-4" />
                </button>
              </div>
            </F>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("account.admin.form.submit")}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** DNS records the customer adds at their domain provider, with the activation status. */
function DnsDialog({ state, onClose }: { state: HostnameState; onClose: () => void }) {
  const { t } = useTranslation();
  const { dir } = useLocale();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir={dir} className="sm:max-w-lg">
        <DialogTitle>
          <bdi dir="ltr">{state.hostname}</bdi> — {t(`account.admin.domainState.${state.state}`)}
        </DialogTitle>
        <DialogDescription>{t("account.admin.dnsText")}</DialogDescription>
        <div className="space-y-2 text-sm">
          {state.records.map((r: DnsRecord) => (
            <div key={r.type + r.name} className="grid gap-1 border p-3">
              <span className="text-xs font-semibold">{r.type}</span>
              <span className="flex items-center justify-between gap-2">
                <bdi dir="ltr" className="num break-all">
                  {r.name}
                </bdi>
                <CopyButton value={r.name} />
              </span>
              <span className="flex items-center justify-between gap-2 text-muted-foreground">
                <bdi dir="ltr" className="num break-all">
                  {r.value}
                </bdi>
                <CopyButton value={r.value} />
              </span>
            </div>
          ))}
          {state.detail && <p className="text-xs text-muted-foreground">{state.detail}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
