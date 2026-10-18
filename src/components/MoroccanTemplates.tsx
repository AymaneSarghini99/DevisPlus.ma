import { useId, type ReactNode } from "react";
import {
  amountInWords,
  computeTotals,
  fmtDate,
  lineHT,
  mad,
  needsExemptionNote,
  type Company,
  type Line,
  type Party,
  type Totals,
} from "@/lib/quotes";
import type { DocData } from "./QuoteDocument";
import type { DocStyle } from "@/lib/design";

/** Layouts common on Moroccan quotes and invoices: full-grid tables, boxed parties,
 *  "Arrêté à la somme de" box, stamp areas, zellige ornament and French/Arabic labels. */
export const MOROCCAN_TEMPLATES = ["zellige", "marche", "bilingue", "commercial"] as const;

const pct = (n: number) => `${Number(n) || 0} %`;
const muted = "text-[#5b6478]";

// French label with its Arabic equivalent (bilingual template only).
function Bi({ fr, ar, on }: { fr: string; ar: string; on: boolean }) {
  if (!on) return <>{fr}</>;
  return (
    <span className="inline-flex flex-col leading-tight">
      <span>{fr}</span>
      <span
        lang="ar"
        dir="rtl"
        className="font-[IBM_Plex_Sans_Arabic,sans-serif] text-[0.95em] normal-case tracking-normal"
      >
        {ar}
      </span>
    </span>
  );
}

export function MoroccanDocument({ d, title, st }: { d: DocData; title: string; st: DocStyle }) {
  const t = computeTotals(d.lines, d.globalDiscount, d.kind === "devis" ? d.deposit : 0);
  const showDiscount = d.lines.some((l) => Number(l.discount) > 0);
  const number = d.number || "attribué à l'émission";
  const bi = d.template === "bilingue";

  return (
    <>
      {d.template === "zellige" && <ZelligeBand top />}

      {d.template === "zellige" && (
        <header className="text-center">
          {d.logo && (
            <img
              src={d.logo}
              alt=""
              className="mx-auto mb-2 max-h-14 max-w-[200px] object-contain"
            />
          )}
          <div className="text-lg font-semibold uppercase tracking-[0.2em]">
            {d.company.name || "Votre entreprise"}
          </div>
          <div className={muted}>
            {[d.company.address, d.company.city].filter(Boolean).join(" — ")}
            {(d.company.phone || d.company.email) && (
              <> · {[d.company.phone, d.company.email].filter(Boolean).join(" · ")}</>
            )}
          </div>
          <div
            className="mx-auto mt-5 inline-block border-4 border-double px-8 py-2"
            style={{ borderColor: "var(--doc-accent)" }}
          >
            <div className="text-base font-semibold uppercase tracking-[0.25em]">{title}</div>
            <div className="num">N° {number}</div>
          </div>
          <div className={`mt-2 ${muted}`}>
            {d.company.city ? `${d.company.city}, le ` : "Le "}
            {fmtDate(d.issueDate)}
          </div>
        </header>
      )}

      {d.template === "marche" && (
        <header>
          <div className="grid grid-cols-[1.4fr_1fr] gap-4">
            <Box>
              {d.logo && (
                <img src={d.logo} alt="" className="mb-2 max-h-12 max-w-[160px] object-contain" />
              )}
              <div className="text-[14px] font-semibold uppercase">
                {d.company.name || "Votre entreprise"}
              </div>
              <div>{[d.company.address, d.company.city].filter(Boolean).join(", ")}</div>
              <div className={muted}>
                {[d.company.phone, d.company.email].filter(Boolean).join(" · ")}
              </div>
              <CompanyIds c={d.company} />
            </Box>
            <Box className="flex flex-col justify-center text-center">
              <div className="text-base font-semibold uppercase tracking-[0.2em]">{title}</div>
              <div className="num font-medium">N° {number}</div>
              <div className={`mt-1 ${muted}`}>
                Date : <span className="num">{fmtDate(d.issueDate)}</span>
              </div>
              <div className={muted}>
                {d.kind === "devis" ? "Validité" : "Échéance"} :{" "}
                <span className="num">{fmtDate(d.secondDate)}</span>
              </div>
            </Box>
          </div>
          <h2 className="mt-5 text-center text-[13px] font-semibold uppercase tracking-wider underline underline-offset-4">
            Bordereau des prix — détail estimatif
          </h2>
        </header>
      )}

      {d.template === "bilingue" && (
        <header
          className="flex justify-between gap-6 border-b-2 pb-4"
          style={{ borderColor: "var(--doc-accent)" }}
        >
          <div className="min-w-0">
            {d.logo && (
              <img src={d.logo} alt="" className="mb-2 max-h-14 max-w-[180px] object-contain" />
            )}
            <div className="text-[15px] font-semibold">{d.company.name || "Votre entreprise"}</div>
            <div>{[d.company.address, d.company.city].filter(Boolean).join(", ")}</div>
            <div className={muted}>
              {[d.company.phone, d.company.email].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-lg font-semibold uppercase tracking-[0.18em]">{title}</div>
            {!st.title.trim() && (
              <div
                lang="ar"
                dir="rtl"
                className="font-[IBM_Plex_Sans_Arabic,sans-serif] text-lg font-semibold"
              >
                {d.kind === "devis" ? "عرض أسعار" : "فاتورة"}
              </div>
            )}
            <div className="num">{number}</div>
          </div>
        </header>
      )}

      {d.template === "commercial" && (
        <header className="flex items-stretch justify-between gap-6">
          <div className="min-w-0 self-center">
            {d.logo && (
              <img src={d.logo} alt="" className="mb-2 max-h-14 max-w-[180px] object-contain" />
            )}
            <div className="text-[16px] font-semibold">{d.company.name || "Votre entreprise"}</div>
            <div className={muted}>
              {[d.company.phone, d.company.email].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div
            className="shrink-0 px-6 py-3 text-right"
            style={{ background: "var(--doc-accent)", color: "var(--doc-on-accent)" }}
          >
            <div className="text-xl font-semibold uppercase tracking-[0.2em]">{title}</div>
            <div className="num">N° {number}</div>
            <div className="num opacity-90">{fmtDate(d.issueDate)}</div>
          </div>
        </header>
      )}

      {/* Parties */}
      {d.template === "commercial" ? (
        <div className="mt-5 grid grid-cols-2 gap-4">
          <TitledBox title="Émetteur">
            <PartyBlock p={d.company} />
            <CompanyIds c={d.company} />
          </TitledBox>
          <TitledBox title={d.kind === "devis" ? "Client" : "Facturé à"}>
            <PartyBlock p={d.client} />
          </TitledBox>
        </div>
      ) : d.template === "marche" ? (
        <Box className="mt-4">
          <span className="font-semibold">
            {d.kind === "devis" ? "Maître d'ouvrage / Client : " : "Client : "}
          </span>
          {d.client.name || "—"}
          {d.client.address && (
            <> — {[d.client.address, d.client.city].filter(Boolean).join(", ")}</>
          )}
          <ClientIds p={d.client} inline />
          {d.delivery && (
            <div className="mt-1">
              <span className="font-semibold">Délai d'exécution : </span>
              {d.delivery}
            </div>
          )}
        </Box>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-6">
          <dl className="space-y-0.5 self-start">
            {d.template === "bilingue" && (
              <>
                <MetaRow k={<Bi on fr="Date" ar="التاريخ" />} v={fmtDate(d.issueDate)} />
              </>
            )}
            <MetaRow
              k={
                <Bi
                  on={bi}
                  fr={d.kind === "devis" ? "Valable jusqu'au" : "Échéance"}
                  ar={d.kind === "devis" ? "صالح إلى غاية" : "تاريخ الاستحقاق"}
                />
              }
              v={fmtDate(d.secondDate)}
            />
            {d.quoteRef && <MetaRow k="Devis d'origine" v={d.quoteRef} />}
            {d.delivery && (
              <MetaRow k={<Bi on={bi} fr="Délai de livraison" ar="أجل التسليم" />} v={d.delivery} />
            )}
          </dl>
          <Box className={d.template === "zellige" ? "border-2" : ""}>
            <div className={`mb-1 text-[10.5px] uppercase tracking-wider ${muted}`}>
              <Bi on={bi} fr={d.kind === "devis" ? "Client" : "Facturé à"} ar="الزبون" />
            </div>
            <PartyBlock p={d.client} />
          </Box>
        </div>
      )}

      {d.template === "commercial" && (
        <div className="mt-4 grid grid-cols-4 border text-[11.5px]">
          {[
            ["Date", fmtDate(d.issueDate)],
            [d.kind === "devis" ? "Validité" : "Échéance", fmtDate(d.secondDate)],
            ["Délai", d.delivery || "—"],
            [
              d.kind === "devis" ? "Acompte" : "Devis d'origine",
              d.kind === "devis" ? pct(d.deposit) : d.quoteRef || "—",
            ],
          ].map(([k, v], i) => (
            <div key={k} className={`px-3 py-2 ${i ? "border-l" : ""}`}>
              <div className={`text-[10px] uppercase tracking-wider ${muted}`}>{k}</div>
              <div className="num font-medium">{v}</div>
            </div>
          ))}
        </div>
      )}

      <GridTable d={d} t={t} showDiscount={showDiscount} />

      {d.template !== "marche" && (
        <div className="mt-4 flex justify-end">
          <TotalsBox d={d} t={t} bi={bi} />
        </div>
      )}

      {st.showWords && (
        <div className="mt-4 border-2 px-3 py-2" style={{ borderColor: "var(--doc-accent)" }}>
          <span className="font-semibold">
            {d.kind === "facture" ? "Arrêtée la présente facture" : "Arrêté le présent devis"} à la
            somme de :{" "}
          </span>
          <span className={d.template === "marche" ? "uppercase" : ""}>
            {amountInWords(t.ttc)} toutes taxes comprises.
          </span>
        </div>
      )}

      <div className="h-5 shrink-0" />
      <footer className={`mt-auto space-y-2 text-[11px] ${muted}`}>
        {needsExemptionNote(d.lines) && (
          <Note k="Exonération de TVA" v={d.exemptionNote || "motif à préciser"} />
        )}
        {d.terms && <Note k="Conditions de paiement" v={d.terms} />}
        {(d.company.bank || d.company.rib) && (
          <Note
            k="Règlement par virement"
            v={[d.company.bank, d.company.rib && `RIB ${d.company.rib}`]
              .filter(Boolean)
              .join(" — ")}
          />
        )}
        {st.footerNote && <p className="whitespace-pre-wrap">{st.footerNote}</p>}
        {st.showSignature && (
          <div className="grid grid-cols-2 gap-6 pt-3 text-[#14213D]">
            <StampBox
              label={
                d.template === "bilingue"
                  ? "Cachet et signature — الختم والتوقيع"
                  : "Cachet et signature de l'entreprise"
              }
            />
            {d.kind === "devis" ? (
              <StampBox label="Bon pour accord — date, cachet et signature du client" />
            ) : (
              <div />
            )}
          </div>
        )}
        <LegalBox c={d.company} />
      </footer>

      {d.template === "zellige" && <ZelligeBand />}
    </>
  );
}

function GridTable({ d, t, showDiscount }: { d: DocData; t: Totals; showDiscount: boolean }) {
  const marche = d.template === "marche";
  const bi = d.template === "bilingue";
  const filled = d.template === "commercial" || d.template === "zellige";
  const th = "border px-2 py-1.5 font-semibold";
  const cols = 6 + (showDiscount ? 1 : 0) + (marche ? 0 : 1); // N°, désignation, unité, qté, P.U., montant
  return (
    <table className="mt-5 w-full border-collapse text-[12px]">
      <thead>
        <tr
          className="text-[10.5px] uppercase tracking-wide"
          style={
            filled
              ? { background: "var(--doc-accent)", color: "var(--doc-on-accent)" }
              : { background: "#f1f1ec" }
          }
        >
          <th className={`${th} w-10 text-center`}>{marche ? "N° prix" : "N°"}</th>
          <th className={`${th} text-left`}>
            <Bi on={bi} fr={marche ? "Désignation des ouvrages" : "Désignation"} ar="البيان" />
          </th>
          <th className={`${th} w-14 text-center`}>
            <Bi on={bi} fr="Unité" ar="الوحدة" />
          </th>
          <th className={`${th} w-16 text-right`}>
            <Bi on={bi} fr="Qté" ar="الكمية" />
          </th>
          <th className={`${th} w-24 text-right`}>
            <Bi on={bi} fr="P.U. HT" ar="الثمن الأحادي" />
          </th>
          {showDiscount && <th className={`${th} w-12 text-right`}>Rem.</th>}
          {!marche && <th className={`${th} w-12 text-right`}>TVA</th>}
          <th className={`${th} w-28 text-right`}>
            <Bi on={bi} fr={marche ? "Prix total HT" : "Montant HT"} ar="المبلغ" />
          </th>
        </tr>
      </thead>
      <tbody>
        {d.lines.map((l, i) => (
          <GridRow key={l.id} l={l} n={i + 1} showDiscount={showDiscount} showVat={!marche} />
        ))}
      </tbody>
      {marche && (
        <tfoot className="font-semibold">
          <FootRow cols={cols} k="Total HT" v={mad(t.ht)} />
          {t.discount > 0 && (
            <FootRow cols={cols} k={`Dont remises`} v={"− " + mad(t.discount)} muted />
          )}
          {t.byRate.map((r) => (
            <FootRow key={r.rate} cols={cols} k={`TVA ${pct(r.rate)}`} v={mad(r.tva)} />
          ))}
          <FootRow cols={cols} k="Total TTC" v={mad(t.ttc)} strong />
          {d.kind === "devis" && d.deposit > 0 && (
            <FootRow cols={cols} k={`Acompte (${pct(d.deposit)})`} v={mad(t.deposit)} muted />
          )}
          {d.kind === "facture" && d.paid ? (
            <FootRow
              cols={cols}
              k="Reste à payer"
              v={mad(Math.round((t.ttc - d.paid) * 100) / 100)}
            />
          ) : null}
        </tfoot>
      )}
    </table>
  );
}

function GridRow({
  l,
  n,
  showDiscount,
  showVat,
}: {
  l: Line;
  n: number;
  showDiscount: boolean;
  showVat: boolean;
}) {
  const [first, ...rest] = (l.description || "—").split("\n");
  const td = "border px-2 py-1.5 align-top";
  return (
    <tr className="break-inside-avoid">
      <td className={`${td} num text-center`}>{n}</td>
      <td className={`${td} break-words`}>
        <div>{first}</div>
        {rest.length > 0 && (
          <div className={`whitespace-pre-wrap text-[11px] ${muted}`}>{rest.join("\n")}</div>
        )}
      </td>
      <td className={`${td} text-center`}>{l.unit}</td>
      <td className={`${td} num text-right`}>{l.qty}</td>
      <td className={`${td} num text-right`}>{mad(l.unitPrice)}</td>
      {showDiscount && (
        <td className={`${td} num text-right`}>{l.discount ? pct(l.discount) : ""}</td>
      )}
      {showVat && <td className={`${td} num text-right`}>{pct(l.vatRate)}</td>}
      <td className={`${td} num text-right`}>{mad(lineHT(l))}</td>
    </tr>
  );
}

function FootRow({
  cols,
  k,
  v,
  strong,
  muted: m,
}: {
  cols: number;
  k: string;
  v: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <tr
      style={
        strong ? { background: "var(--doc-accent)", color: "var(--doc-on-accent)" } : undefined
      }
      className={m ? "font-normal" : ""}
    >
      <td colSpan={cols - 1} className="border px-2 py-1.5 text-right">
        {k}
      </td>
      <td className="num border px-2 py-1.5 text-right">{v}</td>
    </tr>
  );
}

function TotalsBox({ d, t, bi }: { d: DocData; t: Totals; bi: boolean }) {
  const row = (k: ReactNode, v: string, strong = false) => (
    <tr
      style={
        strong ? { background: "var(--doc-accent)", color: "var(--doc-on-accent)" } : undefined
      }
      className={strong ? "font-semibold" : ""}
    >
      <td className="border px-3 py-1.5">{k}</td>
      <td className="num border px-3 py-1.5 text-right whitespace-nowrap">{v}</td>
    </tr>
  );
  return (
    <table className="w-80 border-collapse">
      <tbody>
        {t.discount > 0 && row(<Bi on={bi} fr="Remises" ar="التخفيض" />, "− " + mad(t.discount))}
        {row(<Bi on={bi} fr="Total HT" ar="المجموع دون احتساب الرسوم" />, mad(t.ht))}
        {t.byRate.map((r) =>
          row(<Bi on={bi} fr={`TVA ${pct(r.rate)}`} ar="الضريبة على القيمة المضافة" />, mad(r.tva)),
        )}
        {row(<Bi on={bi} fr="Total TTC" ar="المجموع مع احتساب الرسوم" />, mad(t.ttc), true)}
        {d.kind === "devis" &&
          d.deposit > 0 &&
          row(<Bi on={bi} fr={`Acompte (${pct(d.deposit)})`} ar="التسبيق" />, mad(t.deposit))}
        {d.kind === "facture" && d.paid
          ? row("Reste à payer", mad(Math.round((t.ttc - d.paid) * 100) / 100))
          : null}
      </tbody>
    </table>
  );
}

function Box({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border px-3 py-2 ${className}`}>{children}</div>;
}

function TitledBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border">
      <div
        className="border-b px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider"
        style={{ background: "#f1f1ec" }}
      >
        {title}
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

function PartyBlock({ p }: { p: Party }) {
  return (
    <>
      <div className="font-semibold">{p.name || "—"}</div>
      {p.contact && <div>À l'attention de {p.contact}</div>}
      {p.address && <div>{p.address}</div>}
      {p.city && <div>{p.city}</div>}
      {(p.phone || p.email) && (
        <div className={muted}>{[p.phone, p.email].filter(Boolean).join(" · ")}</div>
      )}
      <ClientIds p={p} />
    </>
  );
}

function ClientIds({ p, inline }: { p: Party; inline?: boolean }) {
  const ids = [p.ice && `ICE ${p.ice}`, p.if_ && `IF ${p.if_}`, p.rc && `RC ${p.rc}`].filter(
    Boolean,
  );
  if (!ids.length) return null;
  return inline ? (
    <span className="num"> — {ids.join(" · ")}</span>
  ) : (
    <div className="num text-[11.5px]">{ids.join(" · ")}</div>
  );
}

function CompanyIds({ c }: { c: Company }) {
  const ids = [
    c.ice && `ICE ${c.ice}`,
    c.if_ && `IF ${c.if_}`,
    c.rc && `RC ${c.rc}`,
    c.tp && `TP ${c.tp}`,
  ].filter(Boolean);
  return ids.length ? <div className="num mt-1 text-[11px]">{ids.join(" · ")}</div> : null;
}

function MetaRow({ k, v }: { k: ReactNode; v: string }) {
  return (
    <div className="flex items-start gap-3">
      <dt className={`min-w-28 ${muted}`}>{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  );
}

function Note({ k, v }: { k: string; v: string }) {
  return (
    <p>
      <span className="font-semibold text-[#14213D]">{k} : </span>
      {v}
    </p>
  );
}

function StampBox({ label }: { label: string }) {
  return <div className="h-24 border p-2 text-[11px]">{label}</div>;
}

function LegalBox({ c }: { c: Company }) {
  const ids = [
    c.ice && `ICE : ${c.ice}`,
    c.if_ && `IF : ${c.if_}`,
    c.rc && `RC : ${c.rc}`,
    c.tp && `TP : ${c.tp}`,
  ].filter(Boolean);
  if (!c.name && !ids.length) return null;
  return (
    <p className="num mt-3 border-t pt-2 text-center text-[10.5px]">
      <span className="font-sans">{[c.name, c.address, c.city].filter(Boolean).join(" — ")}</span>
      {ids.length > 0 && (
        <>
          <br />
          {ids.join(" | ")}
        </>
      )}
    </p>
  );
}

/** Eight-pointed star (khatam) band, the classic zellige motif, in the accent colour. */
function ZelligeBand({ top }: { top?: boolean }) {
  const id = "zellige" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      aria-hidden
      className={`-mx-8 block h-5 w-[calc(100%+4rem)] print:mx-0 print:w-full ${top ? "-mt-8 mb-6 print:mt-0" : "mt-6 -mb-8 print:mb-0"}`}
    >
      <defs>
        <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#14213D" />
          <rect x="6" y="6" width="12" height="12" fill="var(--doc-accent)" />
          <rect
            x="6"
            y="6"
            width="12"
            height="12"
            fill="var(--doc-accent)"
            transform="rotate(45 12 12)"
          />
          <circle cx="12" cy="12" r="2.6" fill="#14213D" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
