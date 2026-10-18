import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, EmptyState, PageTitle } from "@/components/Brand";
import { F } from "@/components/Form";
import { KIND_LABEL, mad, UNITS, type LineKind, type Unit } from "@/lib/quotes";
import {
  deleteItem,
  loadCatalog,
  loadSettings,
  newItem,
  saveItem,
  type CatalogItem,
} from "@/lib/store";
import { errorMessage } from "@/lib/storage";
import { Dropdown } from "@/components/Dropdown";

export const Route = createFileRoute("/catalogue")({
  head: () => ({
    meta: [
      { title: "Catalogue — DevisPlus.ma" },
      {
        name: "description",
        content: "Vos produits et services fréquents, à insérer en un clic dans vos devis.",
      },
    ],
  }),
  component: Catalogue,
});

function itemErrors(i: CatalogItem) {
  const e: Record<string, string> = {};
  if (!i.name.trim()) e["name"] = "Champ requis";
  if (!(i.unitPrice >= 0)) e["unitPrice"] = "Prix invalide";
  return e;
}

function Catalogue() {
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [rates, setRates] = useState<number[]>([20, 14, 10, 7, 0]);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<CatalogItem | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    setItems(loadCatalog());
    setRates(loadSettings().vatRates);
  }, []);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    const all = [...(items ?? [])].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return s ? all.filter((i) => (i.name + " " + i.description).toLowerCase().includes(s)) : all;
  }, [items, search]);

  const open = (i: CatalogItem) => {
    setEdit({ ...i });
    setTried(false);
  };
  const errors = edit ? itemErrors(edit) : {};
  const isNew = edit && !items?.some((i) => i.id === edit.id);
  const save = () => {
    if (!edit) return;
    setTried(true);
    if (Object.keys(errors).length) return;
    try {
      saveItem(edit);
      setItems(loadCatalog());
      toast.success(
        isNew
          ? "Ajouté au catalogue."
          : "Article enregistré. Les devis existants ne sont pas modifiés.",
      );
      setEdit(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const remove = (i: CatalogItem) => {
    if (!confirm(`Retirer « ${i.name} » du catalogue ? Les devis existants ne sont pas modifiés.`))
      return;
    try {
      deleteItem(i.id);
      setItems(loadCatalog());
      if (edit?.id === i.id) setEdit(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const itemRates = edit && !rates.includes(edit.vatRate) ? [...rates, edit.vatRate] : rates;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title="Catalogue">
          <button className="btn btn-accent" onClick={() => open(newItem())}>
            <Plus className="size-4" /> Nouvel article
          </button>
        </PageTitle>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Insérez ces articles dans un devis depuis l'éditeur. La quantité et le prix restent
          modifiables dans chaque devis sans changer l'article enregistré ici.
        </p>

        {edit && (
          <section
            className="mt-6 border bg-card p-5"
            aria-label={isNew ? "Nouvel article" : "Modifier l'article"}
          >
            <h2 className="font-semibold">{isNew ? "Nouvel article" : "Modifier l'article"}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <F label="Nom *" id="i-name" error={tried ? errors["name"] : undefined} wide>
                <input
                  id="i-name"
                  className="field"
                  aria-invalid={tried && !!errors["name"]}
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </F>
              <F label="Unité" id="i-unit">
                <Dropdown
                  id="i-unit"
                  value={edit.unit}
                  onChange={(v) => setEdit({ ...edit, unit: v as Unit })}
                  options={UNITS.map((u) => ({ value: u, label: u }))}
                />
              </F>
              <F
                label="Prix unitaire HT (DH)"
                id="i-price"
                error={tried ? errors["unitPrice"] : undefined}
              >
                <input
                  id="i-price"
                  type="number"
                  min={0}
                  step="0.01"
                  className="field num text-right"
                  value={edit.unitPrice}
                  onChange={(e) =>
                    setEdit({ ...edit, unitPrice: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </F>
              <F label="Description" id="i-desc" wide>
                <input
                  id="i-desc"
                  className="field"
                  value={edit.description}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                />
              </F>
              <F label="TVA" id="i-vat">
                <Dropdown
                  id="i-vat"
                  value={String(edit.vatRate)}
                  onChange={(v) => setEdit({ ...edit, vatRate: Number(v) })}
                  options={itemRates.map((r) => ({ value: String(r), label: `${r} %` }))}
                />
              </F>
              <F label="Nature (modèle BTP)" id="i-kind">
                <Dropdown
                  id="i-kind"
                  value={edit.kind ?? ""}
                  onChange={(v) => {
                    const { kind: _k, ...rest } = edit;
                    setEdit(v ? { ...rest, kind: v as LineKind } : rest);
                  }}
                  options={[
                    { value: "", label: "Non précisée" },
                    ...(Object.keys(KIND_LABEL) as LineKind[]).map((k) => ({
                      value: k,
                      label: KIND_LABEL[k],
                    })),
                  ]}
                />
              </F>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={save}>
                Enregistrer
              </button>
            </div>
          </section>
        )}

        {items === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Chargement…</p>
        ) : items.length === 0 ? (
          !edit && (
            <EmptyState
              icon={<Package className="size-6" />}
              title="Catalogue vide"
              action={
                <button className="btn btn-accent" onClick={() => open(newItem())}>
                  <Plus className="size-4" /> Ajouter un article
                </button>
              }
            >
              Ajoutez les produits et prestations que vous facturez souvent : pose au m², heure de
              main-d'œuvre, forfait de déplacement…
            </EmptyState>
          )
        ) : (
          <>
            <div className="relative mt-6 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="item-search" className="sr-only">
                Rechercher un article
              </label>
              <input
                id="item-search"
                className="field pl-9"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mt-3 overflow-x-auto border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Article</th>
                    <th className="px-4 py-3 font-medium">Unité</th>
                    <th className="px-4 py-3 text-right font-medium">P.U. HT</th>
                    <th className="px-4 py-3 text-right font-medium">TVA</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((i) => (
                    <tr key={i.id} className="hover:bg-muted/60">
                      <td className="px-4 py-3">
                        <button
                          className="text-left underline-offset-2 hover:underline"
                          onClick={() => open(i)}
                        >
                          <span className="font-medium">{i.name}</span>
                          {i.description && (
                            <span className="block text-xs text-muted-foreground">
                              {i.description}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {i.unit}
                        {i.kind ? ` · ${KIND_LABEL[i.kind]}` : ""}
                      </td>
                      <td className="num px-4 py-3 text-right">{mad(i.unitPrice)}</td>
                      <td className="num px-4 py-3 text-right">{i.vatRate} %</td>
                      <td className="px-2">
                        <button
                          aria-label={`Supprimer ${i.name}`}
                          className="rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                          onClick={() => remove(i)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-sm text-muted-foreground">
                        Aucun article ne correspond à « {search} ».
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
