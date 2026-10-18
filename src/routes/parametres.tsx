import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, PageTitle } from "@/components/Brand";
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

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — DevisPlus.ma" },
      {
        name: "description",
        content:
          "Profil de l'entreprise, identifiants fiscaux, coordonnées bancaires et préférences des documents.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
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
    errors["company.rib"] = "Le RIB marocain comporte 24 chiffres";
  if (!s.vatRates.length) errors["vat"] = "Gardez au moins un taux";
  if (!s.vatRates.includes(s.defaultVat))
    errors["vat"] = "Le taux par défaut doit faire partie de la liste";
  const err = (k: string) => (tried ? errors[k] : undefined);
  const missing = missingInvoiceMentions({
    company: s.company,
    client: { ...emptyParty(), ice: "x" },
  });

  const save = () => {
    setTried(true);
    if (Object.keys(errors).length) {
      toast.error("Paramètres non enregistrés", { description: "Corrigez les champs signalés." });
      return;
    }
    try {
      saveSettings(s);
      setDirty(false);
      toast.success("Paramètres enregistrés. Ils s'appliquent aux nouveaux documents.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const addRate = () => {
    const r = Number(newRate.replace(",", "."));
    if (!(r >= 0 && r <= 100) || newRate.trim() === "") {
      toast.error("Taux invalide (0 à 100).");
      return;
    }
    if (!s.vatRates.includes(r)) update({ vatRates: [...s.vatRates, r].sort((a, b) => b - a) });
    setNewRate("");
  };

  if (!loaded) return <p className="p-8 text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="min-h-screen">
      <AppHeader>
        {dirty && (
          <span className="hidden text-sm text-muted-foreground sm:inline" role="status">
            Non enregistré
          </span>
        )}
        <button className="btn btn-primary" onClick={save} disabled={!dirty}>
          Enregistrer
        </button>
      </AppHeader>
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-8">
        <PageTitle title="Paramètres" />

        <section>
          <h2 className="font-semibold">Votre entreprise</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Repris automatiquement sur chaque nouveau devis. Les devis et factures déjà créés
            gardent les informations de leur date.
          </p>
          <PartyFields who="company" p={s.company} set={setCo} err={err} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <F label="Taxe professionnelle (TP)" id="tp">
              <input
                id="tp"
                className="field num"
                value={s.company.tp}
                onChange={(e) => setCo({ tp: e.target.value })}
              />
            </F>
          </div>
        </section>

        <section>
          <h2 className="font-semibold">Coordonnées bancaires</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <F label="Banque" id="bank">
              <input
                id="bank"
                className="field"
                value={s.company.bank}
                onChange={(e) => setCo({ bank: e.target.value })}
              />
            </F>
            <F label="RIB (24 chiffres)" id="rib" error={err("company.rib")}>
              <input
                id="rib"
                className="field num"
                inputMode="numeric"
                aria-invalid={!!err("company.rib")}
                value={s.company.rib}
                onChange={(e) => setCo({ rib: e.target.value.replace(/[^\d ]/g, "") })}
              />
            </F>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Imprimés en pied de devis et de facture lorsqu'ils sont renseignés.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Mentions sur vos documents</h2>
          {missing.length ? (
            <div className="mt-3 border bg-card p-4 text-sm">
              <p>Informations encore absentes, généralement attendues sur une facture au Maroc :</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              ICE, IF, RC, TP et adresse sont renseignés.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            DevisPlus vous aide à faire figurer ces mentions mais ne certifie pas la conformité
            fiscale de vos documents. Faites valider vos modèles et taux par votre comptable.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Préférences des devis</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <F label="Validité (jours)" id="validity">
              <input
                id="validity"
                type="number"
                min={1}
                max={365}
                className="field num text-right"
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
            <F label="Acompte par défaut (%)" id="dep">
              <input
                id="dep"
                type="number"
                min={0}
                max={100}
                className="field num text-right"
                value={s.deposit}
                onChange={(e) =>
                  update({ deposit: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
                }
              />
            </F>
            <F label="TVA par défaut" id="defvat" error={err("vat")}>
              <select
                id="defvat"
                className="field"
                value={s.defaultVat}
                onChange={(e) => update({ defaultVat: Number(e.target.value) })}
              >
                {s.vatRates.map((r) => (
                  <option key={r} value={r}>
                    {r} %
                  </option>
                ))}
              </select>
            </F>
          </div>
          <div className="mt-3">
            <F label="Conditions de paiement par défaut" id="dterms">
              <textarea
                id="dterms"
                rows={2}
                className="field h-auto py-2"
                value={s.terms}
                onChange={(e) => update({ terms: e.target.value })}
              />
            </F>
          </div>
          <div className="mt-4">
            <span className="label">Taux de TVA proposés</span>
            <div className="flex flex-wrap items-center gap-2">
              {s.vatRates.map((r) => (
                <span
                  key={r}
                  className="num inline-flex h-8 items-center gap-1 rounded-sm border bg-card pl-3 pr-1 text-sm"
                >
                  {r} %
                  <button
                    type="button"
                    aria-label={`Retirer le taux ${r} %`}
                    className="rounded-sm p-1 text-muted-foreground hover:bg-muted"
                    onClick={() => update({ vatRates: s.vatRates.filter((x) => x !== r) })}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              <label htmlFor="newrate" className="sr-only">
                Nouveau taux
              </label>
              <input
                id="newrate"
                className="field num h-8 w-20 text-right"
                placeholder="%"
                inputMode="decimal"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRate()}
              />
              <button type="button" className="btn btn-ghost h-8" onClick={addRate}>
                Ajouter
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
                  Rétablir 20 / 14 / 10 / 7 / 0 %
                </button>
              )}
            </div>
            {err("vat") && <p className="mt-1 text-xs text-destructive">{err("vat")}</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              Retirer un taux ne modifie aucun devis ni aucune facture existants : chaque ligne
              garde le taux saisi.
            </p>
          </div>
          <p className="mt-4 text-sm">
            Modèle, couleur et logo :{" "}
            <Link to="/modeles" className="font-medium underline underline-offset-2">
              page Modèles
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
