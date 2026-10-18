import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, PageTitle } from "@/components/Brand";
import { AccentPicker, Section } from "@/components/Form";
import { TemplateBuilder } from "@/components/TemplateBuilder";
import { WatermarkControls } from "@/components/WatermarkControls";
import { CUSTOM_PREFIX, defaultStyle, designFrom, type CustomTemplate } from "@/lib/design";
import { A4Preview, QuoteDocument, type DocData } from "@/components/QuoteDocument";
import {
  addDays,
  emptyCompany,
  loadQuotes,
  TEMPLATES,
  today,
  uid,
  type Quote,
  type TemplateId,
} from "@/lib/quotes";
import {
  defaultSettings,
  docTerms,
  hasProfile,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/store";
import { AppError, errorMessage } from "@/lib/storage";
import { useTranslation } from "react-i18next";
import { tFor } from "@/i18n/index";
import { pageMeta } from "@/i18n/meta";

export const Route = createFileRoute("/modeles")({
  head: ({ match }) => pageMeta(match, "templates"),
  component: Templates,
});

/** Example content, clearly labelled as such, used only when no quote has been saved yet. */
function sample(s: Settings): DocData {
  const issue = today();
  // Example content is written in the document language, like the document itself.
  const t = tFor(s.docLang);
  return {
    lang: s.docLang,
    kind: "devis",
    number: t("templates.sample.number"),
    issueDate: issue,
    secondDate: addDays(issue, s.validityDays),
    company: hasProfile(s)
      ? s.company
      : { ...emptyCompany(), name: t("doc.yourCompany"), city: t("templates.sample.companyCity") },
    client: {
      ...emptyCompany(),
      name: t("templates.sample.client"),
      city: t("templates.sample.clientCity"),
    },
    lines: [
      {
        id: "ex1",
        description: t("templates.sample.line1"),
        qty: 42,
        unit: "m²",
        unitPrice: 180,
        discount: 0,
        vatRate: 20,
        kind: "materiel",
      },
      {
        id: "ex2",
        description: t("templates.sample.line2"),
        qty: 42,
        unit: "m²",
        unitPrice: 75,
        discount: 0,
        vatRate: 20,
        kind: "main_oeuvre",
      },
      {
        id: "ex3",
        description: t("templates.sample.line3"),
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
    terms: docTerms(s, s.docLang),
    delivery: t("templates.sample.delivery"),
    exemptionNote: "",
    template: s.template,
    accent: s.accent,
    logo: s.logo,
  };
}

const fromQuote = (q: Quote, s: Settings): DocData => ({
  ...q,
  lang: q.lang ?? s.docLang,
  kind: "devis",
  secondDate: q.validUntil,
  logo: s.logo,
});

/** Reads an image and shrinks it so it fits comfortably in browser storage. */
function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type))
      return reject(new AppError("logoFormat"));
    if (file.size > 5 * 1024 * 1024) return reject(new AppError("logoSize"));
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
      reject(new AppError("logoRead"));
    };
    img.src = url;
  });
}

function Templates() {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<Settings>(defaultSettings);
  const [draft, setDraft] = useState<Settings>(defaultSettings);
  const [last, setLast] = useState<Quote | null>(null);
  const [editing, setEditing] = useState<{ t: CustomTemplate; isNew: boolean } | null>(null);
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

  const pick = (s: Settings) => ({
    template: s.template,
    accent: s.accent,
    logo: s.logo,
    watermark: s.watermark,
    defaultCustom: s.defaultCustom,
  });
  const changed = JSON.stringify(pick(draft)) !== JSON.stringify(pick(saved));
  const selectedCustom = draft.customTemplates.find((c) => c.id === draft.defaultCustom);
  const base = (): DocData => ({
    ...(last ? fromQuote(last, draft) : sample(draft)),
    logo: draft.logo,
    watermark: draft.watermark,
  });
  const builtIn = (template: TemplateId): DocData => {
    const { style: _s, ...rest } = base();
    return { ...rest, template, accent: draft.accent };
  };
  const custom = (c: CustomTemplate): DocData => ({ ...base(), ...designFrom(c) });
  const current = selectedCustom ? custom(selectedCustom) : builtIn(draft.template);

  const persist = () => {
    try {
      const next = { ...loadSettings(), ...pick(draft) };
      saveSettings(next);
      setSaved(next);
      toast.success(t("templates.savedDefaults"));
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  /** Custom templates are saved right away (the rest of the page waits for "Définir par défaut"). */
  const storeCustoms = (customTemplates: CustomTemplate[], defaultCustom = draft.defaultCustom) => {
    try {
      const stored = { ...loadSettings(), customTemplates };
      if (saved.defaultCustom && !customTemplates.some((c) => c.id === saved.defaultCustom))
        stored.defaultCustom = "";
      saveSettings(stored);
      setSaved({ ...saved, customTemplates, defaultCustom: stored.defaultCustom });
      setDraft({ ...draft, customTemplates, defaultCustom });
      return true;
    } catch (e) {
      toast.error(errorMessage(e, t));
      return false;
    }
  };

  const onLogo = async (f: File | undefined) => {
    if (!f) return;
    try {
      setDraft({ ...draft, logo: await resizeLogo(f) });
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const card = (
    key: string,
    active: boolean,
    isDefault: boolean,
    d: DocData,
    name: string,
    hint: string,
    onClick: () => void,
  ) => (
    <button
      key={key}
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`group border bg-card text-start transition-colors ${active ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/40"}`}
    >
      <div className="relative h-44 overflow-hidden border-b bg-muted" aria-hidden>
        <div className="pointer-events-none absolute left-1/2 top-3 w-[794px] origin-top -translate-x-1/2 scale-[0.24]">
          <QuoteDocument d={d} className="shadow-sm" />
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 p-3">
        <div>
          <div className="text-sm font-semibold">
            {name}
            {isDefault && (
              <span className="ms-2 text-xs font-normal text-muted-foreground">par défaut</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        {active && <Check className="size-4 shrink-0" />}
      </div>
    </button>
  );

  const startNew = () =>
    setEditing({
      isNew: true,
      t: {
        id: uid(),
        name: "",
        base: selectedCustom?.base ?? draft.template,
        accent: selectedCustom?.accent ?? draft.accent,
        style: selectedCustom ? { ...selectedCustom.style } : defaultStyle(),
        createdAt: new Date().toISOString(),
      },
    });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title={t("templates.title")}>
          <button className="btn btn-ghost" onClick={startNew}>
            <Plus className="size-4" /> {t("templates.create")}
          </button>
          <button className="btn btn-primary" disabled={!changed} onClick={persist}>
            {t("templates.setDefault")}
          </button>
        </PageTitle>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("templates.intro")}{" "}
          {last
            ? t("templates.previewLast", { number: last.number })
            : t("templates.previewSample")}
        </p>

        {editing && (
          <TemplateBuilder
            key={editing.t.id}
            initial={editing.t}
            isNew={editing.isNew}
            sample={base()}
            onCancel={() => setEditing(null)}
            onSave={(tpl) => {
              const list = editing.isNew
                ? [tpl, ...draft.customTemplates]
                : draft.customTemplates.map((c) => (c.id === tpl.id ? tpl : c));
              if (storeCustoms(list, editing.isNew ? tpl.id : draft.defaultCustom)) {
                setEditing(null);
                toast.success(t("templates.savedTemplate", { name: tpl.name }), {
                  description: t("templates.savedTemplateHint"),
                });
              }
            }}
            onDelete={
              editing.isNew
                ? undefined
                : () => {
                    if (!confirm(t("templates.confirmDelete", { name: editing.t.name }))) return;
                    const list = draft.customTemplates.filter((c) => c.id !== editing.t.id);
                    if (
                      storeCustoms(
                        list,
                        draft.defaultCustom === editing.t.id ? "" : draft.defaultCustom,
                      )
                    )
                      setEditing(null);
                  }
            }
          />
        )}

        <div
          role="radiogroup"
          aria-label={t("templates.defaultTemplate")}
          className="mt-6 space-y-6"
        >
          {draft.customTemplates.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold">{t("templates.mine")}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {draft.customTemplates.map((c) =>
                  card(
                    CUSTOM_PREFIX + c.id,
                    draft.defaultCustom === c.id,
                    saved.defaultCustom === c.id,
                    custom(c),
                    c.name,
                    t("templates.basedOn", { name: t(`templates.names.${c.base}.name`) }),
                    () => setDraft({ ...draft, defaultCustom: c.id }),
                  ),
                )}
              </div>
            </div>
          )}
          <div>
            {draft.customTemplates.length > 0 && (
              <h2 className="mb-3 text-sm font-semibold">{t("templates.builtin")}</h2>
            )}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {TEMPLATES.map((tp) =>
                card(
                  tp.id,
                  !selectedCustom && draft.template === tp.id,
                  !saved.defaultCustom && saved.template === tp.id,
                  builtIn(tp.id),
                  t(`templates.names.${tp.id}.name`),
                  t(`templates.names.${tp.id}.hint`),
                  () => setDraft({ ...draft, template: tp.id, defaultCustom: "" }),
                ),
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="space-y-6">
            {selectedCustom ? (
              <div className="border bg-card p-4 text-sm">
                <p>
                  {t("templates.selected")}{" "}
                  <bdi className="font-semibold">{selectedCustom.name}</bdi>
                </p>
                <button
                  className="btn btn-ghost mt-3"
                  onClick={() => setEditing({ t: selectedCustom, isNew: false })}
                >
                  {t("templates.editThis")}
                </button>
              </div>
            ) : (
              <AccentPicker
                value={draft.accent}
                onChange={(accent) => setDraft({ ...draft, accent })}
              />
            )}
            <div>
              <span className="label">{t("templates.logo")}</span>
              {draft.logo ? (
                <div className="flex items-center gap-3 border bg-card p-3">
                  <img
                    src={draft.logo}
                    alt={t("templates.currentLogo")}
                    className="h-12 max-w-[160px] object-contain"
                  />
                  <button
                    className="btn btn-ghost ms-auto"
                    onClick={() => setDraft({ ...draft, logo: "" })}
                  >
                    <X className="size-4" /> {t("common.remove")}
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
                {draft.logo ? t("templates.replaceLogo") : t("templates.uploadLogo")}
              </label>
              <p className="mt-1 text-xs text-muted-foreground">{t("templates.logoHint")}</p>
            </div>
            <Section title={t("templates.defaultWatermark")}>
              <WatermarkControls
                idPrefix="wm-default"
                value={draft.watermark}
                onChange={(watermark) => setDraft({ ...draft, watermark })}
                hasLogo={!!draft.logo}
              />
              <p className="text-xs text-muted-foreground">{t("templates.watermarkHint")}</p>
            </Section>
            {changed && (
              <p className="text-sm text-muted-foreground" role="status">
                {t("templates.unsavedHint")}
              </p>
            )}
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-xs text-muted-foreground">{t("common.previewA4Short")}</p>
            <A4Preview
              d={current}
              onWatermarkChange={(watermark) => setDraft({ ...draft, watermark })}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
