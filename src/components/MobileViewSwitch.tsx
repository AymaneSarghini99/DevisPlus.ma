import { Eye, PencilLine } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export type EditorView = "edit" | "preview";

/**
 * On phones the editor form and the A4 preview do not fit side by side: one is shown at a time
 * (from lg up, both stay visible). showPreview() switches to the preview and waits for it to be
 * laid out, for the PDF download and printing that need the sheet on screen.
 */
export function useEditorView() {
  const [view, setView] = useState<EditorView>("edit");
  const showPreview = () =>
    new Promise<void>((done) => {
      setView("preview");
      requestAnimationFrame(() => requestAnimationFrame(() => done()));
    });
  return {
    view,
    setView,
    showPreview,
    /** Classes of the form column and the preview column. */
    formClass: view === "preview" ? "max-lg:hidden" : "",
    previewClass: view === "edit" ? "max-lg:hidden print:block" : "",
  };
}

export function MobileViewSwitch({
  view,
  onChange,
}: {
  view: EditorView;
  onChange: (v: EditorView) => void;
}) {
  const { t } = useTranslation();
  const item = (v: EditorView, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === v}
      onClick={() => {
        onChange(v);
        window.scrollTo({ top: 0 });
      }}
      className={`flex h-9 flex-1 items-center justify-center gap-2 text-sm font-medium transition ${
        view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
  return (
    <div
      role="tablist"
      className="no-print sticky top-0 z-30 -mx-4 flex border-b bg-background/95 px-4 py-2 backdrop-blur lg:hidden"
    >
      <div className="flex w-full border bg-card">
        {item("edit", <PencilLine className="size-4" />, t("common.viewEdit"))}
        {item("preview", <Eye className="size-4" />, t("common.viewPreview"))}
      </div>
    </div>
  );
}
