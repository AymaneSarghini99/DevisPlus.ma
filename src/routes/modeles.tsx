import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, PageTitle } from "@/components/Brand";
import { AccentPicker } from "@/components/Form";
import { A4Preview, QuoteDocument, type DocData } from "@/components/QuoteDocument";
import {
  addDays,
  emptyCompany,
  loadQuotes,
  TEMPLATES,
  today,
  type Quote,
  type TemplateId,
} from "@/lib/quotes";
import {
  defaultSettings,
  hasProfile,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/store";
import { errorMessage } from "@/lib/storage";

export const Route = createFileRoute("/modeles")({
  head: () => ({
    meta: [
      { title: "Modèles de devis — DevisPlus.ma" },
      {
        name: "description",
        content: "Choisissez la mise en page de vos devis : Classique, Premium, BTP ou Services.",
      },
    ],
  }),
  component: Templates,
});

/** Example content, clearly labelled as such, used only when no quote has been saved yet. */
function sample(s: Settings): DocData {
  const issue = today();
  return {
    kind: "devis",
    number: "EXEMPLE",
    issueDate: issue,
    secondDate: addDays(issue, s.validityDays),
    company: hasProfile(s)
      ? s.company
      : { ...emptyCompany(), name: "Votre entreprise", city: "Casablanca" },
    client: { ...emptyCompany(), name: "Client exemple", city: "Rabat" },
    lines: [
      {
        id: "ex1",
        description: "Fourniture carrelage grès 60×60",
        qty: 42,
        unit: "m²",
        unitPrice: 180,
        discount: 0,
        vatRate: 20,
        kind: "materiel",
      },
      {
        id: "ex2",
        description: "Pose et joints",
        qty: 42,
        unit: "m²",
        unitPrice: 75,
        discount: 0,
        vatRate: 20,
        kind: "main_oeuvre",
      },
      {
        id: "ex3",
        description: "Étude et suivi de chantier",
        qty: 1,
        unit: "forfait",
        unitPrice: 1500,
        discount: 10,
        vatRate: 20,
        kind: "service",
      },
    ],
    globalDiscount: 0,
    deposit: s.deposit,
    terms: s.terms,
    delivery: "2 semaines",
    exemptionNote: "",
    template: s.template,
    accent: s.accent,
    logo: s.logo,
  };
}

const fromQuote = (q: Quote, s: Settings): DocData => ({
  ...q,
  kind: "devis",
  secondDate: q.validUntil,
  logo: s.logo,
});

/** Reads an image and shrinks it so it fits comfortably in browser storage. */
function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type))
      return reject(new Error("Format accepté : PNG, JPG, WebP ou SVG."));
    if (file.size > 5 * 1024 * 1024) return reject(new Error("Image trop lourde (5 Mo maximum)."));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 600 / img.width, 240 / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible."));
    };
    img.src = url;
  });
}

function Templates() {
  const [saved, setSaved] = useState<Settings>(defaultSettings);
  const [draft, setDraft] = useState<Settings>(defaultSettings);
  const [last, setLast] = useState<Quote | null>(null);
  // Previews depend on this browser's data and date: render them only after mounting.
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = loadSettings();
    setSaved(s);
    setDraft(s);
    setLast(loadQuotes()[0] ?? null);
    setReady(true);
  }, []);

  if (!ready) return <p className="p-8 text-sm text-muted-foreground">Chargement…</p>;

  const changed =
    draft.template !== saved.template || draft.accent !== saved.accent || draft.logo !== saved.logo;
  const doc = (template: TemplateId): DocData => {
    const base = last ? fromQuote(last, draft) : sample(draft);
    return { ...base, template, accent: draft.accent, logo: draft.logo };
  };

  const persist = () => {
    try {
      const next = {
        ...loadSettings(),
        template: draft.template,
        accent: draft.accent,
        logo: draft.logo,
      };
      saveSettings(next);
      setSaved(next);
      toast.success("Préférences enregistrées pour vos prochains devis.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const onLogo = async (f: File | undefined) => {
    if (!f) return;
    try {
      setDraft({ ...draft, logo: await resizeLogo(f) });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title="Modèles">
          <button className="btn btn-primary" disabled={!changed} onClick={persist}>
            Définir par défaut
          </button>
        </PageTitle>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Les huit modèles utilisent les mêmes données et le même calcul. Le modèle par défaut
          s'applique aux nouveaux devis ; chaque devis peut ensuite en changer.
          {last
            ? ` Aperçu avec votre dernier devis (${last.number}).`
            : " Aperçu avec un exemple, tant qu'aucun devis n'est enregistré."}
        </p>

        <div
          className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4"
          role="radiogroup"
          aria-label="Modèle"
        >
          {TEMPLATES.map((t) => {
            const active = draft.template === t.id;
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={active}
                onClick={() => setDraft({ ...draft, template: t.id })}
                className={`group border bg-card text-left transition-colors ${active ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/40"}`}
              >
                <div className="relative h-44 overflow-hidden border-b bg-muted" aria-hidden>
                  <div className="pointer-events-none absolute left-1/2 top-3 w-[794px] origin-top -translate-x-1/2 scale-[0.24]">
                    <QuoteDocument d={doc(t.id)} className="shadow-sm" />
                  </div>
                </div>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {t.name}
                      {saved.template === t.id && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          par défaut
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.hint}</div>
                  </div>
                  {active && <Check className="size-4 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="space-y-6">
            <AccentPicker
              value={draft.accent}
              onChange={(accent) => setDraft({ ...draft, accent })}
            />
            <div>
              <span className="label">Logo</span>
              {draft.logo ? (
                <div className="flex items-center gap-3 border bg-card p-3">
                  <img
                    src={draft.logo}
                    alt="Logo actuel"
                    className="h-12 max-w-[160px] object-contain"
                  />
                  <button
                    className="btn btn-ghost ml-auto"
                    onClick={() => setDraft({ ...draft, logo: "" })}
                  >
                    <X className="size-4" /> Retirer
                  </button>
                </div>
              ) : null}
              <input
                ref={fileRef}
                id="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={(e) => onLogo(e.target.files?.[0])}
              />
              <label htmlFor="logo" className="btn btn-ghost mt-2 cursor-pointer">
                <ImagePlus className="size-4" />{" "}
                {draft.logo ? "Remplacer le logo" : "Importer un logo"}
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, JPG, WebP ou SVG. Réduit automatiquement ; conservé dans ce navigateur.
              </p>
            </div>
            {changed && (
              <p className="text-sm text-muted-foreground" role="status">
                Modifications non enregistrées : cliquez sur « Définir par défaut ».
              </p>
            )}
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-xs text-muted-foreground">Aperçu A4</p>
            <A4Preview d={doc(draft.template)} />
          </div>
        </div>
      </main>
    </div>
  );
}
