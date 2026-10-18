import { useState } from "react";
import { Trash2 } from "lucide-react";
import { AccentPicker, F } from "./Form";
import { Dropdown } from "./Dropdown";
import { A4Preview, type DocData } from "./QuoteDocument";
import { TEMPLATES, type TemplateId } from "@/lib/quotes";
import type { CustomTemplate, DocStyle } from "@/lib/design";

const SWITCHES: [keyof DocStyle, string][] = [
  ["showLogo", "Logo"],
  ["showWords", "Montant en toutes lettres"],
  ["showBank", "Coordonnées bancaires"],
  ["showSignature", "Zones de signature"],
];

/** Creates or edits a user template: a layout plus colour, font, title and section choices.
 *  The quote data and the calculations stay exactly the same. */
export function TemplateBuilder({
  initial,
  isNew,
  sample,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: CustomTemplate;
  isNew: boolean;
  sample: DocData;
  onSave: (t: CustomTemplate) => void;
  onCancel: () => void;
  onDelete?: (() => void) | undefined;
}) {
  const [t, setT] = useState(initial);
  const [tried, setTried] = useState(false);
  const setStyle = (patch: Partial<DocStyle>) => setT({ ...t, style: { ...t.style, ...patch } });
  const nameError = tried && !t.name.trim() ? "Donnez un nom à votre modèle" : undefined;

  return (
    <section
      className="mt-8 border bg-card p-5"
      aria-label={isNew ? "Créer un modèle" : "Modifier le modèle"}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          {isNew ? "Créer un modèle" : `Modifier « ${initial.name} »`}
        </h2>
        <div className="flex gap-2">
          {onDelete && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onDelete}
              aria-label="Supprimer ce modèle"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setTried(true);
              if (t.name.trim()) onSave({ ...t, name: t.name.trim() });
            }}
          >
            Enregistrer le modèle
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <F label="Nom du modèle *" id="ct-name" error={nameError}>
            <input
              id="ct-name"
              className="field"
              aria-invalid={!!nameError}
              value={t.name}
              placeholder="Ex. : Devis chantier"
              onChange={(e) => setT({ ...t, name: e.target.value })}
            />
          </F>
          <F label="Mise en page de base" id="ct-base">
            <Dropdown
              id="ct-base"
              value={t.base}
              onChange={(v) => setT({ ...t, base: v as TemplateId })}
              options={TEMPLATES.map((x) => ({ value: x.id, label: x.name, hint: x.hint }))}
            />
          </F>
          <AccentPicker value={t.accent} onChange={(accent) => setT({ ...t, accent })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Police" id="ct-font">
              <Dropdown
                id="ct-font"
                value={t.style.font}
                onChange={(v) => setStyle({ font: v as DocStyle["font"] })}
                options={[
                  { value: "sans", label: "Moderne (sans serif)" },
                  { value: "serif", label: "Classique (avec serif)" },
                ]}
              />
            </F>
            <F label="Titre du document" id="ct-title" hint="Vide = « Devis » ou « Facture »">
              <input
                id="ct-title"
                className="field"
                maxLength={30}
                value={t.style.title}
                placeholder="Ex. : Proforma"
                onChange={(e) => setStyle({ title: e.target.value })}
              />
            </F>
          </div>
          <fieldset>
            <legend className="label">Sections affichées</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SWITCHES.map(([k, label]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={!!t.style[k]}
                    onChange={(e) => setStyle({ [k]: e.target.checked } as Partial<DocStyle>)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <F
            label="Mention en pied de page"
            id="ct-footer"
            hint="Ex. : garantie, assurance décennale, horaires…"
          >
            <textarea
              id="ct-footer"
              rows={3}
              maxLength={400}
              className="field h-auto py-2"
              value={t.style.footerNote}
              onChange={(e) => setStyle({ footerNote: e.target.value })}
            />
          </F>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-xs text-muted-foreground">Aperçu A4</p>
          <A4Preview d={{ ...sample, template: t.base, accent: t.accent, style: t.style }} />
        </div>
      </div>
    </section>
  );
}
