import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  Globe,
  Link2,
  Loader2,
  Mail,
  RefreshCw,
  Server,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { F } from "@/components/Form";
import { DomainGuide } from "@/components/onboarding/DomainGuide";
import { sendDomainRequest } from "@/components/onboarding/steps/DomainStep";
import { ChoiceCard } from "@/components/onboarding/steps/shared";
import { WhatsAppIcon } from "@/components/WhatsAppWidget";
import { askConfirm } from "@/lib/confirm";
import type { HostnameState } from "@/lib/domains/cloudflare";
import { errorMessage } from "@/lib/storage";
import {
  domainErrors,
  loadTenant,
  PLATFORM_DOMAIN,
  saveTenant,
  type DomainSettings,
  type Tenant,
} from "@/lib/tenant";
import { workspaceAddress } from "@/onboarding/preview";

type Status = {
  enabled: boolean;
  target: string;
  approval: "pending" | "approved" | "rejected" | "suspended";
  domain: HostnameState | null;
  customDomain: string;
  domainState: "none" | "pending" | "active";
};

async function call(body: Record<string, unknown>) {
  const res = await fetch("/api/workspace/domain", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    domain?: HostnameState | null;
    error?: string;
    detail?: string;
  } | null;
  return { ok: res.ok, data: data ?? {} };
}

function Copyable({ value }: { value: string }) {
  const { t } = useTranslation();
  return (
    <span className="flex min-w-0 items-center justify-between gap-2">
      <bdi dir="ltr" className="num break-all font-medium">
        {value}
      </bdi>
      <button
        type="button"
        className="shrink-0 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={t("onboarding.domain.guide.copy")}
        title={t("onboarding.domain.guide.copy")}
        onClick={() =>
          navigator.clipboard
            .writeText(value)
            .then(() => toast.success(t("onboarding.domain.guide.copied")))
            .catch(() => {})
        }
      >
        <Copy className="size-3.5" />
      </button>
    </span>
  );
}

/**
 * Settings → address of the workspace: a DevisPlus subdomain, or the company's own domain.
 * When the deployment has Cloudflare custom hostnames, an approved company connects its domain
 * itself and follows the activation; otherwise it sends an activation request to the team.
 */
export function DomainSection() {
  const { t } = useTranslation();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [d, setD] = useState<DomainSettings | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState("");
  const [tried, setTried] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/workspace/domain", { credentials: "same-origin" }).catch(
      () => null,
    );
    if (res?.ok) setStatus((await res.json()) as Status);
  }, []);

  useEffect(() => {
    try {
      const tn = loadTenant();
      setTenant(tn);
      setD(tn?.domain ?? null);
    } catch {
      setTenant(null);
    }
    void refresh();
  }, [refresh]);

  if (!tenant || !d) return null;
  const errors = domainErrors(d);
  const err = (k: "subdomain" | "customDomain") =>
    tried && errors[k] ? t(`validation.${errors[k]}` as never) : undefined;
  const dirty = JSON.stringify(d) !== JSON.stringify(tenant.domain);
  const set = (patch: Partial<DomainSettings>) => setD({ ...d, ...patch });
  const custom = d.mode === "custom";
  const hostname = d.customDomain.trim().toLowerCase();
  const connected = status?.customDomain && status.customDomain === hostname;
  const live = status?.domain && connected ? status.domain : null;
  const selfService = !!status?.enabled && status.approval === "approved";

  const save = () => {
    setTried(true);
    if (Object.keys(errors).length) {
      toast.error(t("common.fixFields"));
      return false;
    }
    try {
      const next = {
        ...tenant,
        domain: { ...d, customDomain: d.customDomain.trim().toLowerCase() },
      };
      saveTenant(next);
      setTenant(next);
      setD(next.domain);
      toast.success(t("account.domain.saved"));
      return true;
    } catch (e) {
      toast.error(errorMessage(e, t));
      return false;
    }
  };

  const act = async (action: "connect" | "check" | "remove") => {
    if (action === "connect" && dirty && !save()) return;
    if (
      action === "remove" &&
      !(await askConfirm({
        title: t("account.domain.removeConfirm", { domain: status?.customDomain ?? hostname }),
        tone: "danger",
      }))
    )
      return;
    setBusy(action);
    try {
      const { ok, data } = await call({ action, hostname });
      if (!ok) {
        toast.error(
          data.error === "cloudflare"
            ? `${t("account.admin.error.cloudflare")} ${data.detail ?? ""}`
            : t(`account.domain.error.${data.error ?? "failed"}`, {
                defaultValue: t("account.admin.error.failed"),
              }),
        );
        return;
      }
      if (action === "check" && data.domain?.state === "active")
        toast.success(t("account.domain.activeNow", { domain: data.domain.hostname }));
      await refresh();
    } finally {
      setBusy("");
    }
  };

  const request = (channel: "email" | "whatsapp") => {
    if (dirty && !save()) return;
    sendDomainRequest(t, { ...tenant, domain: d }, channel);
    const next = { ...tenant, domain: { ...d, requestedAt: new Date().toISOString() } };
    saveTenant(next);
    setTenant(next);
    setD(next.domain);
  };

  const badge = live
    ? live.state === "active"
      ? ["bg-emerald-100 text-emerald-900", CheckCircle2, t("account.domain.state.active")]
      : live.state === "failed"
        ? ["bg-red-100 text-red-900", Clock, t("account.domain.state.failed")]
        : ["bg-amber-100 text-amber-900", Clock, t("account.domain.state.pending")]
    : status?.domainState === "active" && !custom
      ? ["bg-emerald-100 text-emerald-900", CheckCircle2, t("account.domain.state.active")]
      : ["bg-muted text-muted-foreground", Clock, t("onboarding.domain.statusPending")];
  const [badgeClass, BadgeIcon, badgeText] = badge as [string, typeof Clock, string];

  return (
    <section id="domain" className="scroll-mt-24">
      <h2 className="font-semibold">{t("onboarding.domain.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("account.domain.intro")}</p>
      <div className="mt-3 space-y-5 rounded-[var(--radius)] border bg-card p-5">
        <div
          role="radiogroup"
          aria-label={t("onboarding.domain.title")}
          className="grid gap-2 sm:grid-cols-2"
        >
          <ChoiceCard
            checked={!custom}
            onSelect={() => set({ mode: "subdomain" })}
            icon={<Globe className="size-5" />}
            title={t("onboarding.domain.modeSubdomain")}
            text={t("onboarding.domain.modeSubdomainText")}
          />
          <ChoiceCard
            checked={custom}
            onSelect={() => set({ mode: "custom" })}
            icon={<Server className="size-5" />}
            title={t("onboarding.domain.modeCustom")}
            text={t("onboarding.domain.modeCustomText")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <F
            label={t("onboarding.domain.subdomain")}
            id="set-subdomain"
            error={err("subdomain")}
            {...(custom ? { hint: t("onboarding.domain.fallbackNote") } : {})}
          >
            <div dir="ltr" className="flex items-stretch">
              <input
                id="set-subdomain"
                dir="ltr"
                autoCapitalize="none"
                spellCheck={false}
                className="field rounded-e-none"
                aria-invalid={!!err("subdomain")}
                value={d.subdomain}
                onChange={(e) =>
                  set({ subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                }
              />
              <span className="num flex items-center rounded-e-[var(--radius)] border border-s-0 bg-muted px-3 text-sm text-muted-foreground">
                .{PLATFORM_DOMAIN}
              </span>
            </div>
          </F>
          {custom && (
            <F
              label={t("onboarding.domain.customDomain")}
              id="set-custom"
              error={err("customDomain")}
              hint={t("onboarding.domain.customHint")}
            >
              <input
                id="set-custom"
                dir="ltr"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="url"
                placeholder="devis.monentreprise.ma"
                className="field"
                aria-invalid={!!err("customDomain")}
                value={d.customDomain}
                onChange={(e) => set({ customDomain: e.target.value.replace(/\s/g, "") })}
              />
            </F>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius)] bg-muted/40 p-4">
          <span className="text-sm font-medium">{t("onboarding.domain.statusLabel")}</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
          >
            <BadgeIcon className="size-3.5" /> {badgeText}
          </span>
          <bdi dir="ltr" className="num text-sm font-semibold">
            {workspaceAddress(d)}
          </bdi>
          {dirty && (
            <button type="button" className="btn btn-primary ms-auto h-9" onClick={save}>
              {t("account.domain.save")}
            </button>
          )}
        </div>

        {custom && selfService ? (
          live ? (
            <div className="space-y-3">
              <p className="text-sm">
                {t(
                  live.state === "active" ? "account.domain.activeText" : "account.domain.dnsText",
                )}
              </p>
              {live.state !== "active" && (
                <div className="space-y-2">
                  {live.records.map((r) => (
                    <div
                      key={r.type + r.name}
                      className="grid gap-1 rounded-sm border p-3 text-sm sm:grid-cols-[4rem_1fr_1fr] sm:items-center sm:gap-3"
                    >
                      <span className="text-xs font-semibold">{r.type}</span>
                      <Copyable value={r.name} />
                      <Copyable value={r.value} />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!!busy}
                  onClick={() => act("check")}
                >
                  {busy === "check" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  {t("account.domain.check")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost border text-destructive"
                  disabled={!!busy}
                  onClick={() => act("remove")}
                >
                  {busy === "remove" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {t("account.domain.remove")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("account.domain.connectText")}</p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!!busy || !!errors.customDomain}
                onClick={() => act("connect")}
              >
                {busy === "connect" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Link2 className="size-4" />
                )}
                {t("account.domain.connect")}
              </button>
            </div>
          )
        ) : (
          <>
            {custom && <DomainGuide domain={d.customDomain} valid={!errors.customDomain} />}
            <div>
              <p className="text-sm text-muted-foreground">
                {status?.enabled && status.approval === "pending" && custom
                  ? t("account.domain.trialNote")
                  : t("onboarding.domain.statusText")}
              </p>
              <p className="label mt-3">{t("onboarding.domain.request")}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-ghost border"
                  disabled={Object.keys(errors).length > 0}
                  onClick={() => request("whatsapp")}
                >
                  <WhatsAppIcon className="size-4" /> {t("onboarding.domain.requestWhatsapp")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost border"
                  disabled={Object.keys(errors).length > 0}
                  onClick={() => request("email")}
                >
                  <Mail className="size-4" /> {t("onboarding.domain.requestEmail")}
                </button>
              </div>
              {tenant.domain.requestedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("onboarding.domain.requestedNote")}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
