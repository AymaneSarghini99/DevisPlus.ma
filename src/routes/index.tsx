import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DevisPlus.ma — Devis professionnels pour entreprises marocaines" },
      { name: "description", content: "Créez des devis clairs en dirhams, avec ICE et TVA, et exportez-les en PDF A4." },
      { property: "og:title", content: "DevisPlus.ma — Devis professionnels" },
      { property: "og:description", content: "Créez des devis en dirhams avec ICE et TVA, exportés en PDF A4." },
    ],
  }),
  component: Landing,
});

const steps = [
  ["01", "Votre entreprise et votre client", "Raison sociale, ICE, adresse. Vos informations sont reprises automatiquement au devis suivant."],
  ["02", "Les lignes de prestation", "Quantités, prix unitaires HT, TVA à 20 %, 14 %, 10 % ou 7 %. Les totaux se calculent pendant la saisie."],
  ["03", "Un PDF A4 prêt à envoyer", "Mise en page sobre, montants alignés, conditions de paiement en pied de document."],
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <Link to="/dashboard" className="btn btn-ghost">Mes devis</Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div>
          <p className="num text-xs uppercase tracking-widest text-muted-foreground">Devis · Dirham · TVA · ICE</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
            Le devis que votre client lit, comprend et signe.
          </h1>
          <p className="mt-5 max-w-md text-muted-foreground">
            DevisPlus prépare des devis en dirhams, avec ICE, IF et TVA, en quelques minutes, sans tableur.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/devis/$id" params={{ id: "nouveau" }} className="btn btn-accent">
              Créer un devis <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="border bg-paper p-6 text-sm shadow-[0_1px_0_var(--border),0_12px_32px_-16px_color-mix(in_oklab,var(--foreground)_30%,transparent)]" aria-hidden>
          <div className="flex justify-between border-b pb-4">
            <div><div className="font-semibold">Atelier Bennani SARL</div><div className="text-xs text-muted-foreground">Casablanca</div></div>
            <div className="text-right"><div className="font-semibold">DEVIS</div><div className="num text-xs text-muted-foreground">DV-2026-014</div></div>
          </div>
          {[["Menuiserie bois — porte d'entrée", "1", "8 400,00"], ["Pose et finitions", "2", "1 200,00"]].map(([d, q, p]) => (
            <div key={d} className="flex justify-between border-b py-3"><span>{d}</span><span className="num">{q} × {p}</span></div>
          ))}
          <div className="mt-4 flex justify-between"><span className="text-muted-foreground">Total TTC</span><span className="num text-lg font-semibold">12 960,00 DH</span></div>
          <p className="mt-3 text-xs text-muted-foreground">Exemple d'aperçu</p>
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto max-w-6xl divide-y px-4">
          {steps.map(([n, t, d]) => (
            <div key={n} className="grid gap-2 py-8 md:grid-cols-[80px_1fr_1.4fr]">
              <span className="num text-sm text-muted-foreground">{n}</span>
              <h2 className="font-semibold">{t}</h2>
              <p className="text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground">© 2026 DevisPlus.ma</footer>
    </div>
  );
}
