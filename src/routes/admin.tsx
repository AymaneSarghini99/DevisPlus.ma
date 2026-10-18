import { createFileRoute } from "@tanstack/react-router";
import { askConfirm } from "@/lib/confirm";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileJson, LogOut, Plus, Search, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher, Logo } from "@/components/Brand";
import { CustomerSheet } from "@/components/admin/CustomerSheet";
import { OwnerAuth } from "@/components/admin/OwnerAuth";
import { Dropdown } from "@/components/Dropdown";
import { useLocale } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import { isOwnerSignedIn, loadOwner, signOutOwner } from "@/lib/auth";
import {
  CUSTOMER_STATUSES,
  customersCsv,
  customerStats,
  deleteCustomer,
  loadCustomers,
  newCustomer,
  parseBackup,
  paymentSummary,
  saveCustomer,
  saveCustomers,
  type Customer,
  type CustomerStatus,
} from "@/lib/customers";
import { errorMessage } from "@/lib/storage";
import type { AdminAccount } from "@/lib/tenant";

export const Route = createFileRoute("/admin")({
  head: ({ match }) => {
    // Owner page: never indexed, and its links are not followed.
    const m = pageMeta(match, "admin");
    return {
      meta: [
        ...m.meta.filter((x) => x["name"] !== "robots"),
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: AdminPage,
});

const STATUS_STYLE: Record<CustomerStatus, string> = {
  lead: "bg-muted text-muted-foreground",
  awaiting: "bg-amber-100 text-amber-900",
  paid: "bg-emerald-100 text-emerald-900",
  active: "bg-accent text-accent-foreground",
  cancelled: "bg-red-100 text-red-900 line-through decoration-red-900/40",
};

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AdminPage() {
  const { t } = useTranslation();
  // undefined: not checked yet (server render); null: no owner access created yet.
  const [owner, setOwner] = useState<AdminAccount | null | undefined>(undefined);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const o = loadOwner();
    setOwner(o);
    setSignedIn(!!o && isOwnerSignedIn(o));
  }, []);

  if (owner === undefined) return <div className="min-h-screen" aria-busy="true" />;
  if (!signedIn)
    return (
      <OwnerAuth
        owner={owner}
        onDone={(a) => {
          setOwner(a);
          setSignedIn(true);
        }}
      />
    );
  return (
    <Register
      onSignOut={() => {
        signOutOwner();
        setSignedIn(false);
        toast(t("auth.loggedOut"));
      }}
    />
  );
}

function Register({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useTranslation();
  const { locale, fmt } = useLocale();
  const [list, setList] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | CustomerStatus>("");
  const [editing, setEditing] = useState<{ c: Customer; isNew: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setList(loadCustomers()), []);

  const stats = useMemo(() => customerStats(list), [list]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((c) => !status || c.status === status)
      .filter(
        (c) =>
          !q ||
          [c.company, c.contact, c.email, c.phone, c.city, c.subdomain, c.customDomain]
            .join(" ")
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [list, query, status]);

  const persist = (fn: () => void, message: string) => {
    try {
      fn();
      setList(loadCustomers());
      toast.success(message);
      return true;
    } catch (e) {
      toast.error(errorMessage(e, t));
      return false;
    }
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    const data = parseBackup(await file.text());
    if (fileInput.current) fileInput.current.value = "";
    if (!data) {
      toast.error(t("admin.restoreInvalid"));
      return;
    }
    const ok = await askConfirm({
      title: t("admin.restoreConfirm", { n: data.length }),
      confirmLabel: t("admin.restore"),
      tone: "danger",
    });
    if (!ok) return;
    persist(() => saveCustomers(data), t("admin.restored", { n: data.length }));
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const kpis: [string, string, boolean?][] = [
    [t("admin.kpi.customers"), String(stats.customers)],
    [t("admin.kpi.leads"), String(stats.leads)],
    [t("admin.kpi.paid"), String(stats.paidCount)],
    [t("admin.kpi.revenue"), fmt.money(stats.revenue), true],
    [t("admin.kpi.revenueMonth"), fmt.money(stats.revenueMonth), true],
    [t("admin.kpi.outstanding"), fmt.money(stats.outstanding), true],
    [t("admin.kpi.pendingDomains"), String(stats.pendingDomains)],
  ];

  return (
    <div className="min-h-screen">
      <header className="no-print border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-sm bg-foreground px-2 py-0.5 text-xs font-medium text-background">
              {t("admin.title")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              className="rounded-sm p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={t("admin.owner.logout")}
              title={t("admin.owner.logout")}
              onClick={onSignOut}
            >
              <LogOut className="size-4 rtl:-scale-x-100" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="ob-enter flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("admin.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
          </div>
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => setEditing({ c: newCustomer(), isNew: true })}
          >
            <Plus className="size-4" /> {t("admin.add")}
          </button>
        </div>

        <p className="ob-enter rounded-sm border-s-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t("admin.notice")}
        </p>

        <dl className="ob-enter grid grid-cols-2 gap-px overflow-hidden border bg-border sm:grid-cols-4 lg:grid-cols-7">
          {kpis.map(([label, value, money]) => (
            <div key={label} className="bg-card p-4 last:col-span-2 lg:last:col-span-1">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className={`num mt-1 font-semibold ${money ? "text-base" : "text-2xl"}`}>
                <bdi>{value}</bdi>
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              className="field ps-9"
              aria-label={t("admin.search")}
              placeholder={t("admin.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Dropdown
            className="w-56"
            ariaLabel={t("admin.col.status")}
            value={status}
            onChange={(v) => setStatus(v as "" | CustomerStatus)}
            options={[
              { value: "", label: t("admin.allStatuses") },
              ...CUSTOMER_STATUSES.map((s) => ({ value: s, label: t(`admin.status.${s}`) })),
            ]}
          />
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!list.length}
            onClick={() =>
              download(
                `devisplus-clients-${stamp}.csv`,
                customersCsv(list, t, locale),
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download className="size-4" /> {t("admin.exportCsv")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!list.length}
            onClick={() =>
              download(
                `devisplus-clients-${stamp}.json`,
                JSON.stringify({ exportedAt: new Date().toISOString(), customers: list }, null, 2),
                "application/json",
              )
            }
          >
            <FileJson className="size-4" /> {t("admin.backup")}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            id="admin-restore"
            onChange={(e) => restore(e.target.files?.[0])}
          />
          <label htmlFor="admin-restore" className="btn btn-ghost cursor-pointer">
            <Upload className="size-4" /> {t("admin.restore")}
          </label>
        </div>

        {!list.length ? (
          <div className="border border-dashed bg-card px-6 py-12 text-center">
            <Users className="mx-auto size-6 text-muted-foreground" />
            <h2 className="mt-3 font-semibold">{t("admin.emptyTitle")}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {t("admin.emptyText")}
            </p>
          </div>
        ) : !shown.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.noMatch")}</p>
        ) : (
          <div className="overflow-x-auto border bg-card">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  {(
                    [
                      "company",
                      "status",
                      "requested",
                      "price",
                      "paid",
                      "balance",
                      "paidAt",
                      "domainState",
                    ] as const
                  ).map((k) => (
                    <th
                      key={k}
                      className={`px-4 py-2.5 font-medium ${
                        ["price", "paid", "balance"].includes(k) ? "text-end" : "text-start"
                      }`}
                    >
                      {t(`admin.col.${k}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((c) => {
                  const s = paymentSummary(c);
                  return (
                    <tr
                      key={c.id}
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                      onClick={() => setEditing({ c, isNew: false })}
                      onKeyDown={(e) => e.key === "Enter" && setEditing({ c, isNew: false })}
                    >
                      <td className="px-4 py-3">
                        <bdi className="block font-medium">{c.company}</bdi>
                        <span className="block text-xs text-muted-foreground">
                          <bdi>{[c.contact, c.city].filter(Boolean).join(" · ")}</bdi>
                          {(c.email || c.phone) && (
                            <>
                              {(c.contact || c.city) && " · "}
                              <bdi dir="ltr">{c.email || c.phone}</bdi>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`}
                        >
                          {t(`admin.status.${c.status}`)}
                        </span>
                      </td>
                      <td className="num px-4 py-3 text-muted-foreground">
                        {fmt.date(c.createdAt)}
                      </td>
                      <td className="num px-4 py-3 text-end">
                        <bdi>{fmt.money(c.price)}</bdi>
                      </td>
                      <td className="num px-4 py-3 text-end">
                        <bdi>{fmt.money(s.paid)}</bdi>
                      </td>
                      <td
                        className={`num px-4 py-3 text-end ${s.balance > 0 && c.status !== "cancelled" && c.status !== "lead" ? "font-semibold text-amber-700" : "text-muted-foreground"}`}
                      >
                        <bdi>{fmt.money(s.balance)}</bdi>
                      </td>
                      <td className="num px-4 py-3">
                        {s.paidAt ? (
                          fmt.date(s.paidAt)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{t(`admin.domain.${c.domainState}`)}</span>
                        {(c.customDomain || c.subdomain) && (
                          <bdi dir="ltr" className="num block text-xs text-muted-foreground">
                            {c.customDomain || `${c.subdomain}.devisplus.ma`}
                          </bdi>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {editing && (
        <CustomerSheet
          customer={editing.c}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            if (persist(() => saveCustomer(c), t("admin.form.saved"))) setEditing(null);
          }}
          onDelete={async (c) => {
            const ok = await askConfirm({
              title: t("admin.form.deleteConfirm", { name: c.company }),
              tone: "danger",
            });
            if (!ok) return;
            if (persist(() => deleteCustomer(c.id), t("admin.form.deleted"))) setEditing(null);
          }}
        />
      )}
    </div>
  );
}
