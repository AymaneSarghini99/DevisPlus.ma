import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  amountInWords,
  computeTotals,
  fmtDate,
  KIND_LABEL,
  lineHT,
  mad,
  needsExemptionNote,
  type Company,
  type Line,
  type LineKind,
  type Party,
  type TemplateId,
} from "@/lib/quotes";

export type DocData = {
  kind: "devis" | "facture";
  number: string;
  issueDate: string;
  /** "Valable jusqu'au" for quotes, "Échéance" for invoices. */
  secondDate: string;
  company: Company;
  client: Party;
  lines: Line[];
  globalDiscount: number;
  deposit: number;
  terms: string;
  delivery: string;
  exemptionNote: string;
  template: TemplateId;
  accent: string;
  logo: string;
  /** Shown on draft invoices so a draft is never mistaken for an issued invoice. */
  draft?: boolean;
  quoteRef?: string;
  paid?: number;
};

/** Readable text colour (navy or white) on top of a given accent colour. */
export function onAccent(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1]!, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#14213D" : "#ffffff";
}

const pct = (n: number) => `${Number(n) || 0} %`;

export function QuoteDocument({ d, className = "" }: { d: DocData; className?: string }) {
  const t = computeTotals(d.lines, d.globalDiscount, d.kind === "devis" ? d.deposit : 0);
  const title = d.kind === "devis" ? "Devis" : "Facture";
  const showDiscount = d.lines.some((l) => Number(l.discount) > 0);
  const exemption = needsExemptionNote(d.lines);
  const vars = { "--doc-accent": d.accent, "--doc-on-accent": onAccent(d.accent) } as CSSProperties;

  return (
    <article
      style={vars}
      className={`print-area relative overflow-hidden bg-paper p-8 text-[12.5px] leading-relaxed text-[#14213D] ${className}`}
    >
      {d.draft && (
        <div className="mb-4 border border-dashed border-destructive px-3 py-2 text-center text-xs font-semibold uppercase tracking-widest text-destructive">
          Brouillon — facture non émise, sans valeur comptable
        </div>
      )}

      <DocHeader d={d} title={title} />

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <SmallLabel template={d.template} accent={d.accent}>
            {d.kind === "devis" ? "Adressé à" : "Facturé à"}
          </SmallLabel>
          <div className="font-semibold">{d.client.name || "—"}</div>
          {d.client.contact && <div>À l'attention de {d.client.contact}</div>}
          <div>{d.client.address}</div>
          <div>{d.client.city}</div>
          <Ids p={d.client} />
          {(d.client.phone || d.client.email) && (
            <div className="text-[#5b6478]">
              {[d.client.phone, d.client.email].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <dl className="space-y-0.5 self-start text-right">
          <Meta k="Date" v={fmtDate(d.issueDate)} />
          <Meta
            k={d.kind === "devis" ? "Valable jusqu'au" : "Échéance"}
            v={fmtDate(d.secondDate)}
          />
          {d.quoteRef && <Meta k="Devis d'origine" v={d.quoteRef} />}
          {d.delivery && (
            <Meta
              k={
                d.template === "btp"
                  ? "Délai d'exécution"
                  : d.template === "services"
                    ? "Délai de réalisation"
                    : "Délai de livraison"
              }
              v={d.delivery}
            />
          )}
        </dl>
      </div>

      {d.template === "btp" ? (
        <BtpTable lines={d.lines} showDiscount={showDiscount} />
      ) : (
        <LinesTable lines={d.lines} showDiscount={showDiscount} template={d.template} />
      )}

      <div className="mt-5 flex items-start justify-between gap-6">
        <div className="max-w-sm text-[11.5px]">
          <SmallLabel template={d.template} accent={d.accent}>
            {d.kind === "facture" ? "Arrêtée la présente facture" : "Arrêté le présent devis"} à la
            somme de
          </SmallLabel>
          <p className="font-medium">{amountInWords(t.ttc)} TTC</p>
        </div>
        <dl className="w-72 shrink-0 space-y-1">
          {t.discount > 0 && (
            <>
              <Row k="Total HT brut" v={mad(t.gross)} />
              <Row
                k={`Remises${d.globalDiscount ? ` (dont globale ${pct(d.globalDiscount)})` : ""}`}
                v={"− " + mad(t.discount)}
              />
            </>
          )}
          <Row k="Total HT" v={mad(t.ht)} />
          {t.byRate.map((r) => (
            <Row
              key={r.rate}
              k={`TVA ${pct(r.rate)}${t.byRate.length > 1 ? ` sur ${mad(r.base)}` : ""}`}
              v={mad(r.tva)}
            />
          ))}
          <div
            className="flex justify-between px-2 py-1.5 font-semibold"
            style={{ background: "var(--doc-accent)", color: "var(--doc-on-accent)" }}
          >
            <dt>Total TTC</dt>
            <dd className="num">{mad(t.ttc)}</dd>
          </div>
          {d.kind === "devis" && d.deposit > 0 && (
            <>
              <Row k={`Acompte à la commande (${pct(d.deposit)})`} v={mad(t.deposit)} />
              <Row k="Solde" v={mad(t.balance)} />
            </>
          )}
          {d.kind === "facture" && d.paid !== undefined && d.paid > 0 && (
            <>
              <Row k="Déjà réglé" v={"− " + mad(d.paid)} />
              <Row k="Reste à payer" v={mad(Math.round((t.ttc - d.paid) * 100) / 100)} />
            </>
          )}
        </dl>
      </div>

      <footer className="mt-8 space-y-3 border-t pt-4 text-[11px] text-[#5b6478]">
        {exemption && (
          <p>
            <span className="font-semibold text-[#14213D]">Exonération de TVA : </span>
            {d.exemptionNote || "motif à préciser"}
          </p>
        )}
        {d.terms && (
          <p>
            <span className="font-semibold text-[#14213D]">Conditions de paiement : </span>
            {d.terms}
          </p>
        )}
        {(d.company.bank || d.company.rib) && (
          <p className="num">
            <span className="font-sans font-semibold text-[#14213D]">Coordonnées bancaires : </span>
            {[d.company.bank, d.company.rib && `RIB ${d.company.rib}`].filter(Boolean).join(" — ")}
          </p>
        )}
        {d.kind === "devis" && (
          <div className="grid grid-cols-2 gap-6 pt-2">
            <p>Devis valable jusqu'au {fmtDate(d.secondDate)}.</p>
            <div className="h-20 border border-dashed p-2">
              Bon pour accord — date, cachet et signature du client
            </div>
          </div>
        )}
        <LegalLine c={d.company} />
      </footer>
    </article>
  );
}

function DocHeader({ d, title }: { d: DocData; title: string }) {
  const co = (
    <div className="min-w-0">
      {d.logo && <img src={d.logo} alt="" className="mb-2 max-h-14 max-w-[180px] object-contain" />}
      <div className="text-[15px] font-semibold">{d.company.name || "Votre entreprise"}</div>
      <div>{d.company.address}</div>
      <div>{d.company.city}</div>
      <div className="text-[#5b6478]">
        {[d.company.phone, d.company.email].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
  const ref = (
    <div className="shrink-0 text-right">
      <div className="text-lg font-semibold uppercase tracking-[0.18em]">{title}</div>
      <div className="num">{d.number || "Numéro attribué à l'émission"}</div>
    </div>
  );

  if (d.template === "premium")
    return (
      <header
        className="-mx-8 -mt-8 mb-2 flex justify-between gap-6 px-8 pb-6 pt-8 print:mx-0 print:mt-0 print:px-6"
        style={{ background: "var(--doc-accent)", color: "var(--doc-on-accent)" }}
      >
        <div className="min-w-0">
          {d.logo && (
            <img
              src={d.logo}
              alt=""
              className="mb-3 max-h-14 max-w-[180px] rounded-sm bg-white object-contain p-1"
            />
          )}
          <div className="text-xl font-semibold tracking-tight">
            {d.company.name || "Votre entreprise"}
          </div>
          <div className="opacity-80">
            {[d.company.address, d.company.city].filter(Boolean).join(", ")}
          </div>
          <div className="opacity-80">
            {[d.company.phone, d.company.email].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-light uppercase tracking-[0.3em]">{title}</div>
          <div className="num mt-1 opacity-90">{d.number || "Numéro attribué à l'émission"}</div>
        </div>
      </header>
    );

  if (d.template === "services")
    return (
      <header
        className="flex justify-between gap-6 border-l-4 pl-4"
        style={{ borderColor: "var(--doc-accent)" }}
      >
        {co}
        {ref}
      </header>
    );

  // classic and btp
  return (
    <header
      className="flex justify-between gap-6 border-b-2 pb-5"
      style={{ borderColor: "var(--doc-accent)" }}
    >
      {co}
      {ref}
    </header>
  );
}

function LinesTable({
  lines,
  showDiscount,
  template,
}: {
  lines: Line[];
  showDiscount: boolean;
  template: TemplateId;
}) {
  const services = template === "services";
  return (
    <table className="mt-6 w-full border-collapse">
      <thead>
        <tr
          className="border-b-2 text-left text-[10.5px] uppercase tracking-wider text-[#5b6478]"
          style={{ borderColor: "var(--doc-accent)" }}
        >
          <th className="py-2 pr-2 font-medium">{services ? "Prestation" : "Désignation"}</th>
          <th className="w-20 py-2 text-right font-medium">{services ? "Durée" : "Qté"}</th>
          <th className="w-24 py-2 text-right font-medium">{services ? "Tarif HT" : "P.U. HT"}</th>
          {showDiscount && <th className="w-14 py-2 text-right font-medium">Rem.</th>}
          <th className="w-12 py-2 text-right font-medium">TVA</th>
          <th className="w-28 py-2 text-right font-medium">Total HT</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <LineRow key={l.id} l={l} showDiscount={showDiscount} bold={services} />
        ))}
      </tbody>
    </table>
  );
}

function BtpTable({ lines, showDiscount }: { lines: Line[]; showDiscount: boolean }) {
  const order: (LineKind | "autre")[] = ["materiel", "main_oeuvre", "service", "autre"];
  const groups = order
    .map((k) => ({ k, lines: lines.filter((l) => (l.kind ?? "autre") === k) }))
    .filter((g) => g.lines.length);
  const cols = showDiscount ? 6 : 5;
  return (
    <table className="mt-6 w-full border-collapse">
      <thead>
        <tr
          className="text-left text-[10.5px] uppercase tracking-wider"
          style={{ background: "var(--doc-accent)", color: "var(--doc-on-accent)" }}
        >
          <th className="px-2 py-2 font-medium">Désignation</th>
          <th className="w-24 py-2 text-right font-medium">Quantité</th>
          <th className="w-24 py-2 text-right font-medium">P.U. HT</th>
          {showDiscount && <th className="w-14 py-2 text-right font-medium">Rem.</th>}
          <th className="w-12 py-2 text-right font-medium">TVA</th>
          <th className="w-28 px-2 py-2 text-right font-medium">Total HT</th>
        </tr>
      </thead>
      {groups.map((g) => {
        const sub = g.lines.reduce((s, l) => s + Math.round(lineHT(l) * 100), 0) / 100;
        return (
          <tbody key={g.k}>
            {groups.length > 1 && (
              <tr className="border-b bg-[#f3f3ef]">
                <td
                  colSpan={cols}
                  className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                >
                  {g.k === "autre" ? "Divers" : KIND_LABEL[g.k]}
                </td>
              </tr>
            )}
            {g.lines.map((l) => (
              <LineRow key={l.id} l={l} showDiscount={showDiscount} padded />
            ))}
            {groups.length > 1 && (
              <tr className="border-b text-[11.5px]">
                <td colSpan={cols - 1} className="px-2 py-1.5 text-right text-[#5b6478]">
                  Sous-total {g.k === "autre" ? "divers" : KIND_LABEL[g.k].toLowerCase()}
                </td>
                <td className="num px-2 py-1.5 text-right font-medium">{mad(sub)}</td>
              </tr>
            )}
          </tbody>
        );
      })}
    </table>
  );
}

function LineRow({
  l,
  showDiscount,
  bold,
  padded,
}: {
  l: Line;
  showDiscount: boolean;
  bold?: boolean;
  padded?: boolean;
}) {
  const [first, ...rest] = (l.description || "—").split("\n");
  return (
    <tr className="break-inside-avoid border-b align-top">
      <td className={`break-words py-2 pr-3 ${padded ? "pl-2" : ""}`}>
        <div className={bold ? "font-medium" : ""}>{first}</div>
        {rest.length > 0 && (
          <div className="whitespace-pre-wrap text-[11.5px] text-[#5b6478]">{rest.join("\n")}</div>
        )}
      </td>
      <td className="num py-2 text-right">
        {l.qty} <span className="text-[#5b6478]">{l.unit}</span>
      </td>
      <td className="num py-2 text-right">{mad(l.unitPrice)}</td>
      {showDiscount && <td className="num py-2 text-right">{l.discount ? pct(l.discount) : ""}</td>}
      <td className="num py-2 text-right">{pct(l.vatRate)}</td>
      <td className={`num py-2 text-right ${padded ? "px-2" : ""}`}>{mad(lineHT(l))}</td>
    </tr>
  );
}

function SmallLabel({
  children,
  template,
  accent,
}: {
  children: ReactNode;
  template: TemplateId;
  accent: string;
}) {
  // Accent-coloured labels only when the accent is dark enough to read on white.
  const tinted = template === "premium" && onAccent(accent) === "#ffffff";
  return (
    <div
      className="mb-1 text-[10.5px] uppercase tracking-wider text-[#5b6478]"
      style={tinted ? { color: accent } : undefined}
    >
      {children}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-end gap-4">
      <dt className="text-[#5b6478]">{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 px-2">
      <dt>{k}</dt>
      <dd className="num whitespace-nowrap">{v}</dd>
    </div>
  );
}

function Ids({ p }: { p: Party }) {
  const ids = [p.ice && `ICE ${p.ice}`, p.if_ && `IF ${p.if_}`, p.rc && `RC ${p.rc}`].filter(
    Boolean,
  );
  return ids.length ? <div className="num text-[11.5px]">{ids.join(" · ")}</div> : null;
}

function LegalLine({ c }: { c: Company }) {
  const ids = [
    c.ice && `ICE ${c.ice}`,
    c.if_ && `IF ${c.if_}`,
    c.rc && `RC ${c.rc}`,
    c.tp && `TP ${c.tp}`,
  ].filter(Boolean);
  if (!ids.length && !c.name) return null;
  return (
    <p className="num border-t pt-3 text-center text-[10.5px]">
      <span className="font-sans">{c.name}</span>
      {ids.length > 0 && " — " + ids.join(" · ")}
    </p>
  );
}

/** Lays the document out at true A4 width (794 px) and scales it to fit its column, so the
 *  screen preview matches the printed page. Printing ignores the scale. */
export function A4Preview({ d, className = "" }: { d: DocData; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const o = outer.current,
      i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const s = Math.min(1, o.clientWidth / 794);
      setScale(s);
      setHeight(i.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className={`a4-frame ${className}`} style={{ height }}>
      <div
        ref={inner}
        className="a4-sheet w-[794px] origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
        <QuoteDocument d={d} className="min-h-[1123px] border shadow-sm" />
      </div>
    </div>
  );
}
