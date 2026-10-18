import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { TFunction } from "i18next";
import { dirOf, type Locale } from "@/i18n/config";
import { makeFormat, type Format } from "@/i18n/format";
import { tFor } from "@/i18n/index";
import {
  amountInWords,
  computeTotals,
  KINDS,
  lineHT,
  needsExemptionNote,
  type Company,
  type Line,
  type LineKind,
  type Party,
  type TemplateId,
} from "@/lib/quotes";
import { defaultStyle, type DocStyle, type Watermark } from "@/lib/design";
import { MOROCCAN_TEMPLATES, MoroccanDocument } from "./MoroccanTemplates";
import { WatermarkLayer } from "./WatermarkLayer";

export type DocData = {
  kind: "devis" | "facture";
  number: string;
  issueDate: string;
  /** Validity date for quotes, due date for invoices. */
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
  /** Document language — independent from the interface language. */
  lang?: Locale;
  /** Shown on draft invoices so a draft is never mistaken for an issued invoice. */
  draft?: boolean;
  quoteRef?: string;
  paid?: number;
  watermark?: Watermark;
  style?: DocStyle;
};

/** Translation and formatting of the document language, shared by every layout. */
type DocCtx = { t: TFunction; fmt: Format; lang: Locale; dir: "ltr" | "rtl" };
const DocContext = createContext<DocCtx | null>(null);
export function useDoc(): DocCtx {
  const c = useContext(DocContext);
  if (!c) throw new Error("useDoc must be used inside QuoteDocument");
  return c;
}

/** Readable text colour (navy or white) on top of a given accent colour. */
export function onAccent(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1]!, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#14213D" : "#ffffff";
}

/** Inline text that must keep its own direction (numbers, IDs, phones, emails) inside RTL text. */
export const Ltr = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <bdi dir="ltr" className={className}>
    {children}
  </bdi>
);

export function QuoteDocument({
  d: raw,
  className = "",
  onWatermarkChange,
}: {
  d: DocData;
  className?: string;
  /** When set, the watermark can be dragged (and moved with the arrow keys) in the preview. */
  onWatermarkChange?: ((w: Watermark) => void) | undefined;
}) {
  const lang = raw.lang ?? "fr";
  const ctx: DocCtx = { t: tFor(lang), fmt: makeFormat(lang), lang, dir: dirOf(lang) };
  const { t, fmt } = ctx;
  const st = { ...defaultStyle(), ...raw.style };
  // Style switches that simply remove content are applied once, for every layout.
  const d: DocData = {
    ...raw,
    logo: st.showLogo ? raw.logo : "",
    company: st.showBank ? raw.company : { ...raw.company, bank: "", rib: "" },
  };
  const tot = computeTotals(d.lines, d.globalDiscount, d.kind === "devis" ? d.deposit : 0);
  const title = st.title.trim() || t(`doc.title.${d.kind}`);
  const showDiscount = d.lines.some((l) => Number(l.discount) > 0);
  const exemption = needsExemptionNote(d.lines);
  const vars = { "--doc-accent": d.accent, "--doc-on-accent": onAccent(d.accent) } as CSSProperties;

  return (
    <DocContext.Provider value={ctx}>
      <article
        lang={lang}
        dir={ctx.dir}
        style={{
          ...vars,
          containerType: "inline-size",
          ...(st.font === "serif" ? { fontFamily: "var(--font-doc-serif)" } : {}),
        }}
        className={`doc print-area relative isolate flex flex-col overflow-hidden bg-paper p-8 text-[12.5px] leading-relaxed text-[#14213D] ${className}`}
      >
        {d.draft && (
          <div className="mb-4 border border-dashed border-destructive px-3 py-2 text-center text-xs font-semibold uppercase tracking-widest text-destructive">
            {t("doc.draftBanner")}
          </div>
        )}

        {(MOROCCAN_TEMPLATES as readonly string[]).includes(d.template) ? (
          <MoroccanDocument d={d} title={title} st={st} />
        ) : (
          <>
            <DocHeader d={d} title={title} />

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <SmallLabel template={d.template} accent={d.accent}>
                  {t(d.kind === "devis" ? "doc.addressedTo" : "doc.billedTo")}
                </SmallLabel>
                <PartyLines p={d.client} />
              </div>
              <dl className="space-y-0.5 self-start text-end">
                <Meta k={t("doc.date")} v={fmt.date(d.issueDate)} />
                <Meta
                  k={t(d.kind === "devis" ? "doc.validUntil" : "doc.dueDate")}
                  v={fmt.date(d.secondDate)}
                />
                {d.quoteRef && <Meta k={t("doc.quoteRef")} v={d.quoteRef} />}
                {d.delivery && (
                  <Meta
                    k={t(
                      d.template === "btp"
                        ? "doc.delivery.btp"
                        : d.template === "services"
                          ? "doc.delivery.services"
                          : "doc.delivery.default",
                    )}
                    v={d.delivery}
                    text
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
              <div className={`max-w-sm text-[11.5px] ${st.showWords ? "" : "invisible"}`}>
                <SmallLabel template={d.template} accent={d.accent}>
                  {t(d.kind === "facture" ? "doc.wordsFacture" : "doc.wordsDevis")}
                </SmallLabel>
                <p className="font-medium">
                  {t("doc.wordsInline", { words: amountInWords(tot.ttc, lang) })}
                </p>
              </div>
              <dl className="w-72 shrink-0 space-y-1">
                {tot.discount > 0 && (
                  <>
                    <Row k={t("doc.grossHt")} v={fmt.money(tot.gross)} />
                    <Row
                      k={
                        d.globalDiscount
                          ? t("doc.discountsGlobal", { pct: fmt.percent(d.globalDiscount) })
                          : t("doc.discounts")
                      }
                      v={"− " + fmt.money(tot.discount)}
                    />
                  </>
                )}
                <Row k={t("doc.totalHt")} v={fmt.money(tot.ht)} />
                {tot.byRate.map((r) => (
                  <Row
                    key={r.rate}
                    k={
                      tot.byRate.length > 1
                        ? t("doc.vatOn", { rate: fmt.percent(r.rate), base: fmt.money(r.base) })
                        : t("doc.vat", { rate: fmt.percent(r.rate) })
                    }
                    v={fmt.money(r.tva)}
                  />
                ))}
                <div
                  className="flex justify-between px-2 py-1.5 font-semibold"
                  style={{ background: "var(--doc-accent)", color: "var(--doc-on-accent)" }}
                >
                  <dt>{t("doc.totalTtc")}</dt>
                  <dd className="num">
                    <bdi>{fmt.money(tot.ttc)}</bdi>
                  </dd>
                </div>
                {d.kind === "devis" && d.deposit > 0 && (
                  <>
                    <Row
                      k={t("doc.deposit", { pct: fmt.percent(d.deposit) })}
                      v={fmt.money(tot.deposit)}
                    />
                    <Row k={t("doc.balance")} v={fmt.money(tot.balance)} />
                  </>
                )}
                {d.kind === "facture" && d.paid !== undefined && d.paid > 0 && (
                  <>
                    <Row k={t("doc.alreadyPaid")} v={"− " + fmt.money(d.paid)} />
                    <Row
                      k={t("doc.remaining")}
                      v={fmt.money(Math.round((tot.ttc - d.paid) * 100) / 100)}
                    />
                  </>
                )}
              </dl>
            </div>

            {/* The footer is pushed to the bottom of the page; the spacer keeps a minimum gap. */}
            <div className="h-8 shrink-0" />
            <footer className="mt-auto space-y-3 border-t pt-4 text-[11px] text-[#5b6478]">
              {exemption && (
                <Note k={t("doc.exemption")} v={d.exemptionNote || t("doc.exemptionMissing")} />
              )}
              {d.terms && <Note k={t("doc.terms")} v={d.terms} />}
              {(d.company.bank || d.company.rib) && (
                <p>
                  <span className="font-semibold text-[#14213D]">
                    {t("doc.bank")}
                    {t("doc.colon")}
                  </span>
                  <bdi dir="auto">{d.company.bank}</bdi>
                  {d.company.bank && d.company.rib && " — "}
                  {d.company.rib && <Ltr className="num">RIB {d.company.rib}</Ltr>}
                </p>
              )}
              {st.footerNote && (
                <p className="whitespace-pre-wrap">
                  <bdi>{st.footerNote}</bdi>
                </p>
              )}
              {d.kind === "devis" && st.showSignature && (
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <p>{t("doc.validNote", { date: fmt.date(d.secondDate) })}</p>
                  <div className="h-20 border border-dashed p-2">{t("doc.approval")}</div>
                </div>
              )}
              <LegalLine c={d.company} />
            </footer>
          </>
        )}
        {raw.watermark?.enabled && (
          <WatermarkLayer w={raw.watermark} logo={raw.logo} onChange={onWatermarkChange} />
        )}
      </article>
    </DocContext.Provider>
  );
}

/** Client or company block: free text follows its own direction, identifiers stay LTR. */
export function PartyLines({ p }: { p: Party }) {
  const { t } = useDoc();
  return (
    <>
      <div className="font-semibold">
        <bdi dir="auto">{p.name || "—"}</bdi>
      </div>
      {p.contact && <div>{t("doc.attention", { name: p.contact })}</div>}
      {p.address && (
        <div>
          <bdi>{p.address}</bdi>
        </div>
      )}
      {p.city && (
        <div>
          <bdi>{p.city}</bdi>
        </div>
      )}
      <Ids p={p} />
      <Contact p={p} />
    </>
  );
}

export function Contact({
  p,
  className = "text-[#5b6478]",
}: {
  p: Pick<Party, "phone" | "email">;
  className?: string;
}) {
  if (!p.phone && !p.email) return null;
  return (
    <div className={className}>
      {p.phone && <Ltr>{p.phone}</Ltr>}
      {p.phone && p.email && " · "}
      {p.email && <Ltr>{p.email}</Ltr>}
    </div>
  );
}

function DocHeader({ d, title }: { d: DocData; title: string }) {
  const { t } = useDoc();
  const name = d.company.name || t("doc.yourCompany");
  const number = d.number ? <Ltr>{d.number}</Ltr> : t("doc.numberPending");
  const co = (
    <div className="min-w-0">
      {d.logo && <img src={d.logo} alt="" className="mb-2 max-h-14 max-w-[180px] object-contain" />}
      <div className="text-[15px] font-semibold">
        <bdi dir="auto">{name}</bdi>
      </div>
      {d.company.address && (
        <div>
          <bdi>{d.company.address}</bdi>
        </div>
      )}
      {d.company.city && (
        <div>
          <bdi>{d.company.city}</bdi>
        </div>
      )}
      <Contact p={d.company} />
    </div>
  );
  const ref = (
    <div className="shrink-0 text-end">
      <div className="text-lg font-semibold uppercase tracking-[0.18em]">{title}</div>
      <div className="num">{number}</div>
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
            <bdi dir="auto">{name}</bdi>
          </div>
          <div className="opacity-80">
            <bdi>{[d.company.address, d.company.city].filter(Boolean).join(t("doc.listSep"))}</bdi>
          </div>
          <Contact p={d.company} className="opacity-80" />
        </div>
        <div className="text-end">
          <div className="text-2xl font-light uppercase tracking-[0.3em]">{title}</div>
          <div className="num mt-1 opacity-90">{number}</div>
        </div>
      </header>
    );

  if (d.template === "services")
    return (
      <header
        className="flex justify-between gap-6 border-s-4 ps-4"
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
  const { t } = useDoc();
  const services = template === "services";
  return (
    <table className="mt-6 w-full border-collapse">
      <thead>
        <tr
          className="border-b-2 text-start text-[10.5px] uppercase tracking-wider text-[#5b6478]"
          style={{ borderColor: "var(--doc-accent)" }}
        >
          <th className="py-2 pe-2 text-start font-medium">
            {t(services ? "doc.col.service" : "doc.col.designation")}
          </th>
          <th className="w-24 py-2 text-end font-medium">
            {t(services ? "doc.col.duration" : "doc.col.qty")}
          </th>
          <th className="w-28 py-2 text-end font-medium">
            {t(services ? "doc.col.rate" : "doc.col.unitPrice")}
          </th>
          {showDiscount && (
            <th className="w-14 py-2 text-end font-medium">{t("doc.col.discount")}</th>
          )}
          <th className="w-12 py-2 text-end font-medium">{t("doc.col.vat")}</th>
          <th className="w-28 py-2 text-end font-medium">{t("doc.col.totalHt")}</th>
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
  const { t, fmt } = useDoc();
  const order: (LineKind | "other")[] = [...KINDS, "other"];
  const groups = order
    .map((k) => ({ k, lines: lines.filter((l) => (l.kind ?? "other") === k) }))
    .filter((g) => g.lines.length);
  const cols = showDiscount ? 6 : 5;
  return (
    <table className="mt-6 w-full border-collapse">
      <thead>
        <tr
          className="text-start text-[10.5px] uppercase tracking-wider"
          style={{ background: "var(--doc-accent)", color: "var(--doc-on-accent)" }}
        >
          <th className="px-2 py-2 text-start font-medium">{t("doc.col.designation")}</th>
          <th className="w-24 py-2 text-end font-medium">{t("doc.col.quantity")}</th>
          <th className="w-24 py-2 text-end font-medium">{t("doc.col.unitPrice")}</th>
          {showDiscount && (
            <th className="w-14 py-2 text-end font-medium">{t("doc.col.discount")}</th>
          )}
          <th className="w-12 py-2 text-end font-medium">{t("doc.col.vat")}</th>
          <th className="w-28 px-2 py-2 text-end font-medium">{t("doc.col.totalHt")}</th>
        </tr>
      </thead>
      {groups.map((g) => {
        const sub = g.lines.reduce((s, l) => s + Math.round(lineHT(l) * 100), 0) / 100;
        const label = t(`kinds.${g.k}`);
        return (
          <tbody key={g.k}>
            {groups.length > 1 && (
              <tr className="border-b bg-[#f3f3ef]">
                <td
                  colSpan={cols}
                  className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                >
                  {label}
                </td>
              </tr>
            )}
            {g.lines.map((l) => (
              <LineRow key={l.id} l={l} showDiscount={showDiscount} padded />
            ))}
            {groups.length > 1 && (
              <tr className="border-b text-[11.5px]">
                <td colSpan={cols - 1} className="px-2 py-1.5 text-end text-[#5b6478]">
                  {t("doc.subtotal", { kind: label })}
                </td>
                <td className="num px-2 py-1.5 text-end font-medium">
                  <bdi>{fmt.money(sub)}</bdi>
                </td>
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
  const { t, fmt } = useDoc();
  const [first, ...rest] = (l.description || "—").split("\n");
  return (
    <tr className="break-inside-avoid border-b align-top">
      <td className={`break-words py-2 pe-3 ${padded ? "ps-2" : ""}`}>
        <div className={bold ? "font-medium" : ""}>
          <bdi>{first}</bdi>
        </div>
        {rest.length > 0 && (
          <div className="whitespace-pre-wrap text-[11.5px] text-[#5b6478]">
            <bdi>{rest.join("\n")}</bdi>
          </div>
        )}
      </td>
      <td className="num py-2 text-end">
        <Ltr>{fmt.number(l.qty)}</Ltr>{" "}
        <span className="font-sans text-[#5b6478]">{t(`units.${l.unit}`)}</span>
      </td>
      <td className="num whitespace-nowrap py-2 ps-2 text-end">
        <bdi>{fmt.money(l.unitPrice)}</bdi>
      </td>
      {showDiscount && (
        <td className="num py-2 text-end">
          {l.discount ? <Ltr>{fmt.percent(l.discount)}</Ltr> : ""}
        </td>
      )}
      <td className="num py-2 text-end">
        <Ltr>{fmt.percent(l.vatRate)}</Ltr>
      </td>
      <td className={`num whitespace-nowrap py-2 ps-2 text-end ${padded ? "pe-2" : ""}`}>
        <bdi>{fmt.money(lineHT(l))}</bdi>
      </td>
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

function Meta({ k, v, text }: { k: string; v: string; text?: boolean }) {
  return (
    <div className="flex justify-end gap-4">
      <dt className="text-[#5b6478]">{k}</dt>
      <dd className={text ? "" : "num"}>
        <bdi>{v}</bdi>
      </dd>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 px-2">
      <dt>{k}</dt>
      <dd className="num whitespace-nowrap">
        <bdi>{v}</bdi>
      </dd>
    </div>
  );
}

function Note({ k, v }: { k: string; v: string }) {
  const { t } = useDoc();
  return (
    <p>
      <span className="font-semibold text-[#14213D]">
        {k}
        {t("doc.colon")}
      </span>
      <bdi dir="auto">{v}</bdi>
    </p>
  );
}

/** "ICE 0012… · IF 4567…" — Moroccan identifiers keep their Latin acronyms in every language. */
export function idList(p: Partial<Company>) {
  return [
    p.ice && `ICE ${p.ice}`,
    p.if_ && `IF ${p.if_}`,
    p.rc && `RC ${p.rc}`,
    "tp" in p && p.tp && `TP ${p.tp}`,
  ].filter(Boolean) as string[];
}

function Ids({ p }: { p: Party }) {
  const ids = idList(p);
  return ids.length ? (
    <div className="num text-[11.5px]">
      {ids.map((x, i) => (
        <span key={x}>
          {i > 0 && " · "}
          <Ltr>{x}</Ltr>
        </span>
      ))}
    </div>
  ) : null;
}

function LegalLine({ c }: { c: Company }) {
  const ids = idList(c);
  if (!ids.length && !c.name) return null;
  return (
    <p className="num border-t pt-3 text-center text-[10.5px]">
      <bdi dir="auto" className="font-sans">
        {c.name}
      </bdi>
      {ids.map((x, i) => (
        <span key={x}>
          {i === 0 ? (c.name ? " — " : "") : " · "}
          <Ltr>{x}</Ltr>
        </span>
      ))}
    </p>
  );
}

/** Lays the document out at true A4 width (794 px) and scales it to fit its column, so the
 *  screen preview matches the printed page. Printing ignores the scale. */
export function A4Preview({
  d,
  className = "",
  onWatermarkChange,
}: {
  d: DocData;
  className?: string;
  onWatermarkChange?: ((w: Watermark) => void) | undefined;
}) {
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
    // The sheet is laid out LTR-anchored so scaling always starts from the same corner;
    // the document inside sets its own direction.
    <div ref={outer} dir="ltr" className={`a4-frame ${className}`} style={{ height }}>
      <div
        ref={inner}
        className="a4-sheet w-[794px] origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
        <QuoteDocument
          d={d}
          className="min-h-[1123px] border shadow-sm"
          onWatermarkChange={onWatermarkChange}
        />
      </div>
    </div>
  );
}
