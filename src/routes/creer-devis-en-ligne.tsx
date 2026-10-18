import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { A4Preview } from "@/components/QuoteDocument";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { sample } from "@/lib/sample";
import { breadcrumbLd, jsonLd, seoHead, SITE_URL, absoluteUrl } from "@/lib/seo";
import { defaultSettings } from "@/lib/store";

/**
 * SEO landing page "créer un devis en ligne" (French: the indexed language). It only presents
 * the existing quote editor and links to it; it does not change any app behaviour.
 */
const PATH = "/creer-devis-en-ligne";
const TITLE = "Créer un devis en ligne gratuitement au Maroc | DevisPlus.ma";
const DESCRIPTION =
  "Créez un devis professionnel en ligne, en dirhams, avec ICE, IF et TVA à 20 % ou 10 %. Aperçu A4 pendant la saisie, PDF, impression et envoi WhatsApp.";

const STEPS = [
  {
    title: "Renseignez votre entreprise",
    text: "Raison sociale, ICE, IF, RC, TP et adresse. Ces informations sont reprises sur vos devis suivants.",
  },
  {
    title: "Ajoutez votre client",
    text: "Nom, ICE si c'est une entreprise, adresse et téléphone. Enregistrez-le pour le retrouver la prochaine fois.",
  },
  {
    title: "Ajoutez vos prestations",
    text: "Désignation, quantité, unité, prix unitaire HT, remise et TVA. Les totaux HT, TVA et TTC se calculent pendant la saisie.",
  },
  {
    title: "Vérifiez et envoyez",
    text: "L'aperçu A4 montre le devis tel qu'il sera imprimé. Téléchargez le PDF, imprimez-le ou préparez le message WhatsApp.",
  },
];

const CONTENT = [
  "Numéro de devis automatique (DV-2026-001…) et date de validité",
  "Vos identifiants : ICE, IF, RC et taxe professionnelle",
  "L'ICE de votre client professionnel",
  "Le détail des lignes : quantités, unités (pièce, m², ml, forfait…), prix HT et remises",
  "La TVA par taux (20 % ou 10 %) et le total TTC",
  "Le montant arrêté en toutes lettres",
  "L'acompte et les conditions de paiement",
];

const FAQ = [
  {
    q: "Comment créer un devis en ligne gratuitement ?",
    a: "Cliquez sur « Créer un devis gratuitement », renseignez votre entreprise et votre client, puis ajoutez vos lignes de prestation. Le devis se crée directement dans votre navigateur, sans inscription.",
  },
  {
    q: "Peut-on modifier un devis après l'avoir créé ?",
    a: "Oui. Un devis enregistré reste modifiable : vous changez une ligne, un prix ou une date, puis vous enregistrez. Vous pouvez aussi le dupliquer pour en préparer un nouveau.",
  },
  {
    q: "Comment imprimer ou envoyer mon devis ?",
    a: "Depuis le devis, utilisez « PDF / Imprimer » pour l'imprimer, le bouton de téléchargement pour obtenir le PDF, ou « Envoyer par WhatsApp » pour préparer le message à votre client.",
  },
  {
    q: "Quels taux de TVA sont proposés ?",
    a: "20 % et 10 %, les deux taux en vigueur au Maroc depuis le 1er janvier 2026, ainsi que les lignes exonérées. Un autre taux peut être ajouté dans les paramètres.",
  },
  {
    q: "DevisPlus est-il disponible partout au Maroc ?",
    a: "Oui. L'outil s'utilise en ligne depuis n'importe quelle ville. DevisPlus.ma est basé à Casablanca.",
  },
  {
    q: "Où sont enregistrés mes devis ?",
    a: "Dans votre navigateur, sur l'appareil que vous utilisez. Pour un outil à votre nom, avec votre logo et vos couleurs, découvrez l'Offre Business.",
  },
];

export const Route = createFileRoute("/creer-devis-en-ligne")({
  head: ({ match }) => {
    const l = (match.context as { locale?: unknown }).locale;
    const head = seoHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      locale: isLocale(l) ? l : DEFAULT_LOCALE,
      index: true,
    });
    return {
      ...head,
      scripts: [
        jsonLd({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${absoluteUrl(PATH)}#webpage`,
          url: absoluteUrl(PATH),
          name: TITLE,
          description: DESCRIPTION,
          inLanguage: "fr-MA",
          isPartOf: { "@id": `${SITE_URL}/#website` },
          publisher: { "@id": `${SITE_URL}/#organization` },
        }),
        jsonLd(
          breadcrumbLd([
            ["Accueil", "/"],
            ["Créer un devis en ligne", PATH],
          ]),
        ),
      ],
    };
  },
  component: CreateQuoteOnline,
});

function StartButton({ label = "Créer un devis gratuitement" }: { label?: string }) {
  return (
    <Link to="/devis/$id" params={{ id: "nouveau" }} search={{}} className="btn btn-accent">
      {label} <ArrowRight className="size-4" />
    </Link>
  );
}

function CreateQuoteOnline() {
  // Real quote component with example content (same as the Templates page).
  const doc = sample(defaultSettings());
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main lang="fr" dir="ltr">
        <section className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-12 px-4 pb-16 pt-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:pt-20">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Devis en ligne · Maroc
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.15] tracking-tight md:text-5xl">
              Créer un devis en ligne gratuitement
            </h1>
            <p className="mt-5 max-w-lg text-muted-foreground">
              DevisPlus vous permet de préparer un devis professionnel en dirhams, avec ICE, IF et
              TVA. Renseignez votre client, ajoutez vos prestations et vos prix, puis vérifiez
              l'aperçu A4 avant de l'envoyer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <StartButton />
              <a href="#etapes" className="btn btn-ghost">
                Comment ça marche
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Sans inscription : le devis se crée dans votre navigateur.
            </p>
          </div>
          <div aria-hidden className="pointer-events-none min-w-0 select-none">
            <A4Preview d={doc} className="shadow-[0_12px_32px_-16px_rgb(20_33_61/0.35)]" />
            <p className="mt-2 text-xs text-muted-foreground">
              Aperçu réel de l'éditeur, avec des données d'exemple.
            </p>
          </div>
        </section>

        <section id="etapes" className="scroll-mt-20 border-y bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Faire un devis en ligne en 4 étapes
            </h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="num text-sm text-muted-foreground">0{i + 1}</span>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10">
              <StartButton label="Commencer mon devis" />
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Ce que contient votre devis
            </h2>
            <p className="mt-3 text-muted-foreground">
              Un devis clair, adapté aux usages marocains, que votre client lit et signe facilement.
            </p>
            <Link
              to="/guides/$slug"
              params={{ slug: "mentions-obligatoires-facture-maroc" }}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-2"
            >
              <BookOpen className="size-4" /> Les mentions obligatoires au Maroc
            </Link>
          </div>
          <ul className="space-y-3">
            {CONTENT.map((c) => (
              <li key={c} className="flex gap-3 border-b pb-3 text-sm last:border-0">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground" />
                {c}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Questions fréquentes
              </h2>
              <p className="mt-3 text-muted-foreground">
                Besoin d'un outil de devis à votre nom ?{" "}
                <Link to="/tarifs" className="font-medium underline underline-offset-2">
                  Découvrez l'Offre Business
                </Link>
                .
              </p>
            </div>
            <div className="divide-y rounded-[var(--radius)] border bg-background">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    <h3>{f.q}</h3>
                    <Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Créez votre premier devis gratuitement
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            En dirhams, avec la TVA calculée pour vous et un aperçu A4 prêt à imprimer.
          </p>
          <div className="mt-8 flex justify-center">
            <StartButton />
          </div>
        </section>
      </main>
    </div>
  );
}
