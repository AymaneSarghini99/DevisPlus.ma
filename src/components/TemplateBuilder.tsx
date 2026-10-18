import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AccentPicker, F } from "./Form";
import { Dropdown } from "./Dropdown";
import { A4Preview, type DocData } from "./QuoteDocument";
import { TEMPLATES, type TemplateId } from "@/lib/quotes";
import type { CustomTemplate, DocStyle } from "@/lib/design";

const SWITCHES = ["showLogo", "showWords", "showBank", "showSignature"] as const;

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
  const { t } = useTranslation();
  const [tpl, setTpl] = useState(initial);
  const [tried, setTried] = useState(false);
  const setStyle = (patch: Partial<DocStyle>) =>
    setTpl({ ...tpl, style: { ...tpl.style, ...patch } });
  const nameError = tried && !tpl.name.trim() ? t("validation.templateName") : undefined;

  return (
    <section
      className="mt-8 border bg-card p-5"
      aria-label={isNew ? t("templates.create") : t("templates.editTitle")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          {isNew ? t("templates.create") : t("templates.editNamed", { name: initial.name })}
        </h2>
        <div className="flex gap-2">
          {onDelete && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onDelete}
              aria-label={t("templates.deleteThis")}
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setTried(true);
              if (tpl.name.trim()) onSave({ ...tpl, name: tpl.name.trim() });
            }}
          >
            {t("templates.saveTemplate")}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <F label={t("templates.name")} id="ct-name" error={nameError}>
            <input
              id="ct-name"
              className="field"
              aria-invalid={!!nameError}
              value={tpl.name}
              placeholder={t("templates.namePlaceholder")}
              dir="auto"
              onChange={(e) => setTpl({ ...tpl, name: e.target.value })}
            />
          </F>
          <F label={t("templates.base")} id="ct-base">
            <Dropdown
              id="ct-base"
              value={tpl.base}
              onChange={(v) => setTpl({ ...tpl, base: v as TemplateId })}
              options={TEMPLATES.map((x) => ({
                value: x.id,
                label: t(`templates.names.${x.id}.name`),
                hint: t(`templates.names.${x.id}.hint`),
              }))}
            />
          </F>
          <AccentPicker value={tpl.accent} onChange={(accent) => setTpl({ ...tpl, accent })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <F label={t("templates.font")} id="ct-font">
              <Dropdown
                id="ct-font"
                value={tpl.style.font}
                onChange={(v) => setStyle({ font: v as DocStyle["font"] })}
                options={[
                  { value: "sans", label: t("templates.fontSans") },
                  { value: "serif", label: t("templates.fontSerif") },
                ]}
              />
            </F>
            <F label={t("templates.docTitle")} id="ct-title" hint={t("templates.docTitleHint")}>
              <input
                id="ct-title"
                className="field"
                maxLength={30}
                value={tpl.style.title}
                placeholder={t("templates.docTitlePlaceholder")}
                dir="auto"
                onChange={(e) => setStyle({ title: e.target.value })}
              />
            </F>
          </div>
          <fieldset>
            <legend className="label">{t("templates.sections")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SWITCHES.map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={!!tpl.style[k]}
                    onChange={(e) => setStyle({ [k]: e.target.checked } as Partial<DocStyle>)}
                  />
                  {t(`templates.switch.${k}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <F label={t("templates.footerNote")} id="ct-footer" hint={t("templates.footerNoteHint")}>
            <textarea
              id="ct-footer"
              dir="auto"
              rows={3}
              maxLength={400}
              className="field h-auto py-2"
              value={tpl.style.footerNote}
              onChange={(e) => setStyle({ footerNote: e.target.value })}
            />
          </F>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-xs text-muted-foreground">{t("common.previewA4Short")}</p>
          <A4Preview d={{ ...sample, template: tpl.base, accent: tpl.accent, style: tpl.style }} />
        </div>
      </div>
    </section>
  );
}
