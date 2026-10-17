import { emptyParty, uid, type Party, type TemplateId, type Unit } from "./quotes";

export type Client = Party & { id: string; paymentTerms: string; createdAt: string };
export type CatalogItem = { id: string; name: string; description: string; unit: Unit; unitPrice: number; vatRate: number };
export type Settings = { company: Party; template: TemplateId; accent: string; logo: string };

function read<T>(k: string, fb: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch { alert("Stockage du navigateur plein : l'enregistrement a échoué (logo trop lourd ?)."); return false; }
}

export const newClient = (): Client => ({ ...emptyParty(), id: uid(), paymentTerms: "", createdAt: new Date().toISOString() });
export const loadClients = () => read<Client[]>("devisplus.clients", []).map((c) => ({ ...newClient(), ...c }));
export function saveClient(c: Client) { write("devisplus.clients", [c, ...loadClients().filter((x) => x.id !== c.id)]); }
export function deleteClient(id: string) { write("devisplus.clients", loadClients().filter((x) => x.id !== id)); }

export const newItem = (): CatalogItem => ({ id: uid(), name: "", description: "", unit: "pièce", unitPrice: 0, vatRate: 20 });
export const loadCatalog = () => read<CatalogItem[]>("devisplus.catalog", []);
export function saveItem(i: CatalogItem) { write("devisplus.catalog", [i, ...loadCatalog().filter((x) => x.id !== i.id)]); }
export function deleteItem(id: string) { write("devisplus.catalog", loadCatalog().filter((x) => x.id !== id)); }

export const loadSettings = (): Settings => ({ company: emptyParty(), template: "classic", accent: "#14213D", logo: "", ...read<Partial<Settings>>("devisplus.settings", {}) });
export const saveSettings = (s: Settings) => write("devisplus.settings", s);
