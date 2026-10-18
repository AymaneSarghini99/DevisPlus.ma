import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Check, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/Brand";
import { F, PartyFields } from "@/components/Form";
import { missingInvoiceMentions } from "@/lib/invoices";
import { emptyParty, loadQuotes, VAT_RATES, type Company } from "@/lib/quotes";
import {
  defaultSettings,
  hasProfile,
  loadSettings,
  partyErrors,
  saveSettings,
  type Settings,
} from "@/lib/store";
import { errorMessage } from "@/lib/storage";
import { Dropdown } from "@/components/Dropdown";
import { useTranslation } from "react-i18next";
import { LOCALES, NATIVE_NAME, type Locale } from "@/i18n/config";
import { useFormat } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import { GoogleDriveSection } from "@/components/GoogleDriveSection";
import { LegalLink } from "@/components/LegalPage";
import { LEGAL_DOCS } from "@/legal/documents";

export const Route = createFileRoute("/parametres")({
  head: ({ match }) => pageMeta(match, "settings"),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [s, setS] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tried, setTried] = useState(false);
  const [newRate, setNewRate] = useState("");

  useEffect(() => {
    const saved = loadSettings();
    // First visit: start from the company details typed on the latest quote.
    const last = hasProfile(saved) ? undefined : loadQuotes()[0]?.company;
    setS(last ? { ...saved, company: last } : saved);
    setDirty(!!last);
    setLoaded(true);
  }, []);

  const update = (patch: Partial<Settings>) => {
    setS({ ...s, ...patch });
    setDirty(true);
  };
  const setCo = (patch: Partial<Company>) => update({ company: { ...s.company, ...patch } });
  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(partyErrors(s.company, false))) errors[`company.${k}`] = v;
  if (s.company.rib && s.company.rib.replace(/\s/g, "").length !== 24)
    errors["company.rib"] = "rib";
  if (!s.vatRates.length) errors["vat"] = "vatList";
  if (!s.vatRates.includes(s.defaultVat)) errors["vat"] = "vatDefault";
  const err = (k: string) =>
    tried && errors[k] ? t(`validation.${errors[k]}` as never) : undefined;
  const missing = missingInvoiceMentions({
    company: s.company,
    client: { ...emptyParty(), ice: "x" },
  });

  const save = () => {
    setTried(true);
    if (Object.keys(errors).length) {
      toast.error(t("settings.notSaved"), { description: t("common.fixFields") });
      return;
    }
    try {
      saveSettings(s);
      setDirty(false);
      toast.success(t("settings.saved"));
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  const addRate = () => {
    const r = Number(newRate.replace(",", "."));
    if (!(r >= 0 && r <= 100) || newRate.trim() === "") {
      toast.error(t("validation.rate"));
      return;
    }
    if (!s.vatRates.includes(r)) update({ vatRates: [...s.vatRates, r].sort((a, b) => b - a) });
    setNewRate("");
  };

  if (!loaded) return <p className="p-8 text-sm text-muted-foreground">{t("common.loading")}</p>;

  const nav = [
    ["company", t("editor.sectionCompany")],
    ["bank", t("doc.bank")],
    ["quotes", t("settings.preferences")],
    ["google-drive", t("drive.title")],
    ["legal", t("settings.legalTitle")],
  ] as const;

  return (
    <div className="min-h-screen">
      <AppHeader languages />

      {/* Title and save stay visible while scrolling. */}
      <div className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
          <div className="flex items-center gap-3">
            <span
              className={`hidden text-sm sm:inline ${dirty ? "text-amber-700" : "text-muted-foreground"}`}
              role="status"
            >
              {dirty ? (
                t("common.unsaved")
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-4" /> {t("settings.allSaved")}
                </span>
              )}
            </span>
            <button className="btn btn-primary px-5" onClick={save} disabled={!dirty}>
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <nav aria-label={t("settings.onThisPage")} className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 text-sm">
            {nav.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block rounded-sm px-2 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 space-y-10">
          <Card id="company" title={t("editor.sectionCompany")} intro={t("settings.companyHint")}>
            <PartyFields
              who="company"
              p={s.company}
              set={setCo}
              err={err}
              placeholders={{
                name: t("common.example", { value: "Atlas Rénovation SARL" }),
                ice: t("settings.icePlaceholder"),
                contact: t("common.example", { value: "Youssef El Amrani" }),
                address: t("settings.addressPlaceholder"),
                city: t("common.example", { value: t("landing.sampleCity") }),
                phone: t("common.example", { value: "05 22 47 12 30" }),
                email: t("common.example", { value: "contact@entreprise.ma" }),
                if_: t("common.example", { value: "45678912" }),
                rc: t("common.example", { value: "512345 — Casablanca" }),
              }}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <F label={t("party.tp")} id="tp">
                <input
                  id="tp"
                  className="field num"
                  placeholder={t("common.example", { value: "34512678" })}
                  dir="ltr"
                  value={s.company.tp}
                  onChange={(e) => setCo({ tp: e.target.value })}
                />
              </F>
            </div>
            {/* Invoice mentions check, kept compact. */}
            <div
              className={`mt-5 flex gap-2.5 rounded-sm px-3 py-2.5 text-sm ${
                missing.length ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-900"
              }`}
            >
              {missing.length ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              )}
              <div>
                <p>{missing.length ? t("settings.mentionsMissing") : t("settings.mentionsOk")}</p>
                {missing.length > 0 && (
                  <p className="mt-0.5 font-medium">
                    {missing.map((m) => t(`invoice.mentions.${m}`)).join(" · ")}
                  </p>
                )}
                <p className="mt-1 text-xs opacity-80">{t("settings.disclaimer")}</p>
              </div>
            </div>
          </Card>

          <Card id="bank" title={t("doc.bank")} intro={t("settings.bankHint")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label={t("settings.bank")} id="bank-name">
                <input
                  id="bank-name"
                  className="field"
                  placeholder={t("common.example", { value: "Attijariwafa bank — Maârif" })}
                  dir="auto"
                  value={s.company.bank}
                  onChange={(e) => setCo({ bank: e.target.value })}
                />
              </F>
              <F label={t("settings.rib")} id="rib" error={err("company.rib")}>
                <input
                  id="rib"
                  className="field num"
                  placeholder="007 780 0001234567890123 45"
                  dir="ltr"
                  inputMode="numeric"
                  aria-invalid={!!err("company.rib")}
                  value={s.company.rib}
                  onChange={(e) => setCo({ rib: e.target.value.replace(/[^\d ]/g, "") })}
                />
              </F>
            </div>
          </Card>

          <Card
            id="quotes"
            title={t("settings.preferences")}
            intro={
              <>
                {t("settings.templatesLink")}{" "}
                <Link to="/modeles" className="font-medium underline underline-offset-2">
                  {t("settings.templatesPage")}
                </Link>
                .
              </>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <F label={t("settings.validity")} id="validity">
                <input
                  id="validity"
                  type="number"
                  min={1}
                  max={365}
                  className="field num text-end"
                  value={s.validityDays}
                  onChange={(e) =>
                    update({
                      validityDays: Math.min(
                        365,
                        Math.max(1, Math.round(Number(e.target.value) || 30)),
                      ),
                    })
                  }
                />
              </F>
              <F label={t("settings.deposit")} id="dep">
                <input
                  id="dep"
                  type="number"
                  min={0}
                  max={100}
                  className="field num text-end"
                  value={s.deposit}
                  onChange={(e) =>
                    update({ deposit: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
                  }
                />
              </F>
              <F label={t("settings.defaultVat")} id="defvat" error={err("vat")}>
                <Dropdown
                  id="defvat"
                  value={String(s.defaultVat)}
                  onChange={(v) => update({ defaultVat: Number(v) })}
                  options={s.vatRates.map((r) => ({ value: String(r), label: fmt.percent(r) }))}
                />
              </F>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <F label={t("settings.docLang")} id="doclang" hint={t("settings.docLangHint")}>
                <Dropdown
                  id="doclang"
                  value={s.docLang}
                  onChange={(v) => update({ docLang: v as Locale })}
                  options={LOCALES.map((l) => ({ value: l, label: NATIVE_NAME[l] }))}
                />
              </F>
              <div className="sm:col-span-2">
                <F label={t("settings.terms")} id="dterms" hint={t("settings.termsHint")}>
                  <textarea
                    id="dterms"
                    dir="auto"
                    rows={2}
                    className="field h-auto py-2"
                    value={s.terms}
                    onChange={(e) => update({ terms: e.target.value })}
                  />
                </F>
              </div>
            </div>
            <div className="mt-5 border-t pt-4">
              <span className="label">{t("settings.vatRates")}</span>
              <div className="flex flex-wrap items-center gap-2">
                {s.vatRates.map((r) => (
                  <span
                    key={r}
                    className="num inline-flex h-8 items-center gap-1 rounded-sm border bg-background ps-3 pe-1 text-sm"
                  >
                    <bdi>{fmt.percent(r)}</bdi>
                    <button
                      type="button"
                      aria-label={t("settings.removeRate", { rate: fmt.percent(r) })}
                      className="rounded-sm p-1 text-muted-foreground hover:bg-muted"
                      onClick={() => update({ vatRates: s.vatRates.filter((x) => x !== r) })}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                <label htmlFor="newrate" className="sr-only">
                  {t("settings.newRate")}
                </label>
                <input
                  id="newrate"
                  className="field num h-8 w-20 text-end"
                  placeholder="%"
                  inputMode="decimal"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRate()}
                />
                <button type="button" className="btn btn-ghost h-8" onClick={addRate}>
                  {t("common.add")}
                </button>
                {VAT_RATES.some((r) => !s.vatRates.includes(r)) && (
                  <button
                    type="button"
                    className="text-xs underline underline-offset-2"
                    onClick={() =>
                      update({
                        vatRates: [...new Set([...s.vatRates, ...VAT_RATES])].sort((a, b) => b - a),
                      })
                    }
                  >
                    {t("settings.restoreRates")}
                  </button>
                )}
              </div>
              {err("vat") && <p className="mt-1 text-xs text-destructive">{err("vat")}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.ratesHint")}</p>
            </div>
          </Card>

          <GoogleDriveSection />

          <Card id="legal" title={t("settings.legalTitle")} intro={t("legal.settingsText")}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {LEGAL_DOCS.map((d) => (
                <li key={d}>
                  <LegalLink id={d} className="font-medium underline underline-offset-2" />
                </li>
              ))}
            </ul>
          </Card>
        </main>
      </div>
    </div>
  );
}

/** One settings block: title and short explanation above a card. */
function Card({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-semibold">{title}</h2>
      {intro && <p className="mt-1 text-sm text-muted-foreground">{intro}</p>}
      <div className="mt-3 rounded-[var(--radius)] border bg-card p-5">{children}</div>
    </section>
  );
}
