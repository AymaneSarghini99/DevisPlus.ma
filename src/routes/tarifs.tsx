import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Globe, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { F } from "@/components/Form";
import { LegalLink } from "@/components/LegalPage";
import { MarketingHeader } from "@/components/MarketingHeader";
import { WhatsAppIcon } from "@/components/WhatsAppWidget";
import { useFormat } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import { tFor } from "@/i18n/index";
import { jsonLd, offerLd } from "@/lib/seo";
import { CONTACT } from "@/legal/operator";
import { whatsappUrl } from "@/lib/quotes";

export const Route = createFileRoute("/tarifs")({
  head: ({ match }) => {
    const h = pageMeta(match, "pricing");
    // Same name, wording and price as the visible offer (French, the indexed language).
    const t = tFor("fr");
    return {
      ...h,
      scripts: [
        jsonLd(
          offerLd({ name: t("pricing.planName"), description: t("pricing.intro"), price: PRICE }),
        ),
      ],
    };
  },
  component: Pricing,
});

/** Offer price in MAD (launch price, one-time payment). */
const PRICE = 2500;
const INCLUDED = ["i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "i10"] as const;
const CONDITIONS = ["c1", "c2", "c3", "c4", "c5", "c6"] as const;

type Request = {
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  ice: string;
  subdomain: string;
  message: string;
};
const EMPTY: Request = {
  name: "",
  company: "",
  email: "",
  phone: "",
  city: "",
  ice: "",
  subdomain: "",
  message: "",
};

function requestErrors(r: Request) {
  const e: Partial<Record<keyof Request, string>> = {};
  if (!r.name.trim()) e.name = "required";
  if (!r.company.trim()) e.company = "required";
  if (!r.email.trim()) e.email = "required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) e.email = "email";
  if (!r.phone.trim()) e.phone = "required";
  else if (r.phone.replace(/\D/g, "").length < 9) e.phone = "phone";
  if (r.ice && !/^\d{15}$/.test(r.ice)) e.ice = "ice";
  return e;
}

function Pricing() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const amount = fmt.number(PRICE);
  const [r, setR] = useState<Request>(EMPTY);
  const [tried, setTried] = useState(false);
  const errors = requestErrors(r);
  const err = (k: keyof Request) =>
    tried && errors[k] ? t(`validation.${errors[k]}` as never) : undefined;
  const set = (k: keyof Request) => (e: { target: { value: string } }) =>
    setR({ ...r, [k]: e.target.value });

  /** The request is written in the visitor's language and sent from their own app. */
  const compose = () => {
    const v = (x: string) => x.trim() || t("pricing.none");
    return {
      subject: t("pricing.subject", { company: r.company.trim() }),
      body: t("pricing.body", {
        amount,
        name: r.name.trim(),
        company: r.company.trim(),
        email: r.email.trim(),
        phone: r.phone.trim(),
        city: v(r.city),
        ice: v(r.ice),
        subdomain: v(r.subdomain),
        message: r.message.trim(),
      }),
    };
  };
  const send = (channel: "email" | "whatsapp") => {
    setTried(true);
    if (Object.keys(errors).length) {
      toast.error(t("common.fixFields"));
      return;
    }
    const { subject, body } = compose();
    const url =
      channel === "email"
        ? `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        : whatsappUrl(CONTACT.whatsapp, `${subject}\n\n${body}`);
    if (channel === "email") window.location.href = url;
    else window.open(url, "_blank", "noopener");
    // Honest feedback: the request is prepared, not delivered.
    toast(t("pricing.prepared"), { description: t("pricing.preparedText"), duration: 10000 });
  };

  const field = (
    k: keyof Request,
    label: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
    wide = false,
  ) => (
    <F label={label} id={`rq-${k}`} error={err(k)} wide={wide}>
      <input
        id={`rq-${k}`}
        className="field"
        aria-invalid={!!err(k)}
        value={r[k]}
        onChange={set(k)}
        {...extra}
      />
    </F>
  );

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 md:pt-20">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("pricing.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-[1.15] tracking-tight md:text-5xl">
            {t("pricing.title")}
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">{t("pricing.intro")}</p>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <div className="border-2 border-foreground bg-card p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <h2 className="text-lg font-semibold">{t("pricing.planName")}</h2>
                  <p className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                    <bdi>{t("pricing.price", { amount })}</bdi>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{t("pricing.priceNote")}</p>
                </div>
                <a href="#contact" className="btn btn-primary h-11 px-5">
                  {t("pricing.cta")}
                </a>
              </div>
              <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("pricing.includedTitle")}
              </h3>
              <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {INCLUDED.map((k) => (
                  <li key={k} className="flex gap-2.5 text-sm">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    {t(`pricing.included.${k}`)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border bg-card p-6 md:p-8">
              <h2 className="text-lg font-semibold">{t("pricing.conditionsTitle")}</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {CONDITIONS.map((k) => (
                  <li key={k} className="border-b pb-3 last:border-0 last:pb-0">
                    {t(`pricing.conditions.${k}`, { amount })}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm">
                <LegalLink id="refunds" className="font-medium underline underline-offset-2" />
              </p>
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-20 border-t bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{t("pricing.formTitle")}</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {t("pricing.formIntro")}
              </p>
              <form
                noValidate
                className="mt-6 grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send("email");
                }}
              >
                {field("name", t("pricing.name"), { autoComplete: "name", dir: "auto" })}
                {field("company", t("pricing.company"), {
                  autoComplete: "organization",
                  dir: "auto",
                })}
                {field("email", t("pricing.email"), {
                  type: "email",
                  autoComplete: "email",
                  dir: "ltr",
                })}
                {field("phone", t("pricing.phone"), {
                  type: "tel",
                  autoComplete: "tel",
                  inputMode: "tel",
                  dir: "ltr",
                })}
                {field("city", t("pricing.city"), { autoComplete: "address-level2", dir: "auto" })}
                {field("ice", t("pricing.ice"), {
                  inputMode: "numeric",
                  maxLength: 15,
                  dir: "ltr",
                  className: "field num",
                })}
                {field(
                  "subdomain",
                  t("pricing.subdomain"),
                  { placeholder: t("pricing.subdomainPlaceholder"), dir: "ltr" },
                  true,
                )}
                <F label={t("pricing.message")} id="rq-message" wide>
                  <textarea
                    id="rq-message"
                    rows={4}
                    dir="auto"
                    className="field h-auto py-2"
                    placeholder={t("pricing.messagePlaceholder")}
                    value={r.message}
                    onChange={set("message")}
                  />
                </F>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button type="submit" className="btn btn-primary h-11 px-5">
                    <Mail className="size-4" /> {t("pricing.sendEmail")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-accent h-11 px-5"
                    onClick={() => send("whatsapp")}
                  >
                    <WhatsAppIcon className="size-4" /> {t("pricing.sendWhatsapp")}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {t("pricing.sendNote")}
                </p>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {t("pricing.privacyNote")}{" "}
                  <LegalLink id="privacy" className="underline underline-offset-2" />.
                </p>
              </form>
            </div>

            <aside className="self-start border bg-background p-6">
              <h3 className="font-semibold">{t("pricing.orContact")}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center gap-2.5">
                  <Mail
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-label={t("site.emailLabel")}
                  />
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {CONTACT.email}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-label={t("site.phoneLabel")}
                  />
                  <a
                    href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                    dir="ltr"
                    className="num underline-offset-2 hover:underline"
                  >
                    {CONTACT.phone}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <WhatsAppIcon className="size-4 shrink-0 text-[#25D366]" />
                  <a
                    href={whatsappUrl(CONTACT.whatsapp, t("site.waGreeting"))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                    aria-label={t("site.whatsappLabel")}
                  >
                    <bdi dir="ltr" className="num">
                      {CONTACT.whatsapp}
                    </bdi>{" "}
                    <span className="text-muted-foreground">({t("site.whatsappOnly")})</span>
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Globe
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-label={t("site.websiteLabel")}
                  />
                  <a
                    href={CONTACT.website}
                    dir="ltr"
                    className="underline-offset-2 hover:underline"
                  >
                    {CONTACT.website.replace(/^https?:\/\//, "")}
                  </a>
                </li>
                <li className="flex gap-2.5">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-label={t("site.addressLabel")}
                  />
                  <address className="not-italic">
                    {t("site.street")}
                    <br />
                    {CONTACT.postalCode} {t("site.city")}
                    {t("doc.listSep")}
                    {t("site.country")}
                  </address>
                </li>
              </ul>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
