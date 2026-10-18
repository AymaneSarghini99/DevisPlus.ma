import { useId, type ReactNode } from "react";
import type { DocStyle } from "@/lib/design";
import { tFor } from "@/i18n/index";
import {
  amountInWords,
  computeTotals,
  lineHT,
  needsExemptionNote,
  type Company,
  type Line,
  type Totals,
} from "@/lib/quotes";
import { Contact, idList, Ltr, PartyLines, useDoc, type DocData } from "./QuoteDocument";

/** Layouts common on Moroccan quotes and invoices: full-grid tables, boxed parties,
 *  "amount in words" box, stamp areas, zellige ornament and bilingual headings. */
export const MOROCCAN_TEMPLATES = ["zellige", "marche", "bilingue", "commercial"] as const;

const muted = "text-[#5b6478]";

type DocKey = Parameters<ReturnType<typeof useDoc>["t"]>[0];

/** Label in the document language; the bilingual layout adds a second language underneath
 *  (Arabic, or French when the document itself is in Arabic). */
function Bi({ k, vars, on }: { k: DocKey; vars?: Record<string, string>; on: boolean }) {
  const { t, lang } = useDoc();
  const main = t(k as never, vars as never) as unknown as string;
  if (!on) return <>{main}</>;
  const second = lang === "ar" ? "fr" : "ar";
  return (
    <span className="inline-flex flex-col leading-tight">
      <span>{main}</span>
      <span
        lang={second}
        dir={second === "ar" ? "rtl" : "ltr"}
        className="text-[0.95em] normal-case tracking-normal opacity-80"
      >
        {tFor(second)(k as never, vars as never) as unknown as string}
      </span>
    </span>
  );
}

export function MoroccanDocument({ d, title, st }: { d: DocData; title: string; st: DocStyle }) {
  const { t, fmt, lang } = useDoc();
  const tot = computeTotals(d.lines, d.globalDiscount, d.kind === "devis" ? d.deposit : 0);
  const showDiscount = d.lines.some((l) => Number(l.discount) > 0);
  const number = d.number ? <Ltr>{d.number}</Ltr> : t("doc.numberPendingShort");
  const bi = d.template === "bilingue";
  const name = d.company.name || t("doc.yourCompany");
  const place = [d.company.address, d.company.city].filter(Boolean).join(t("doc.listSep"));

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
            <bdi dir="auto">{name}</bdi>
          </div>
          <div className={muted}>
            <bdi>{place}</bdi>
          </div>
          <Contact p={d.company} />
          <div
            className="mx-auto mt-5 inline-block border-4 border-double px-8 py-2"
            style={{ borderColor: "var(--doc-accent)" }}
          >
            <div className="text-base font-semibold uppercase tracking-[0.25em]">{title}</div>
            <div className="num">
              {t("doc.numberLabel")} {number}
            </div>
          </div>
          <div className={`mt-2 ${muted}`}>
            {d.company.city
              ? t("doc.place", { city: d.company.city, date: fmt.date(d.issueDate) })
              : t("doc.placeNoCity", { date: fmt.date(d.issueDate) })}
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
                <bdi dir="auto">{name}</bdi>
              </div>
              <div>
                <bdi>{place}</bdi>
              </div>
              <Contact p={d.company} />
              <CompanyIds c={d.company} />
            </Box>
            <Box className="flex flex-col justify-center text-center">
              <div className="text-base font-semibold uppercase tracking-[0.2em]">{title}</div>
              <div className="num font-medium">
                {t("doc.numberLabel")} {number}
              </div>
              <div className={`mt-1 ${muted}`}>
                {t("doc.date")}
                {t("doc.colon")}
                <bdi className="num">{fmt.date(d.issueDate)}</bdi>
              </div>
              <div className={muted}>
                {t(d.kind === "devis" ? "doc.validity" : "doc.dueDate")}
                {t("doc.colon")}
                <bdi className="num">{fmt.date(d.secondDate)}</bdi>
              </div>
            </Box>
          </div>
          <h2 className="mt-5 text-center text-[13px] font-semibold uppercase tracking-wider underline underline-offset-4">
            {t("doc.bordereauTitle")}
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
            <div className="text-[15px] font-semibold">
              <bdi dir="auto">{name}</bdi>
            </div>
            <div>
              <bdi>{place}</bdi>
            </div>
            <Contact p={d.company} />
          </div>
          <div className="shrink-0 text-end">
            <div className="text-lg font-semibold uppercase tracking-[0.18em]">
              {st.title.trim() ? title : <Bi on k={`doc.title.${d.kind}`} />}
            </div>
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
            <div className="text-[16px] font-semibold">
              <bdi dir="auto">{name}</bdi>
            </div>
            <Contact p={d.company} />
          </div>
          <div
            className="shrink-0 px-6 py-3 text-end"
            style={{ background: "var(--doc-accent)", color: "var(--doc-on-accent)" }}
          >
            <div className="text-xl font-semibold uppercase tracking-[0.2em]">{title}</div>
            <div className="num">
              {t("doc.numberLabel")} {number}
            </div>
            <div className="num opacity-90">
              <bdi>{fmt.date(d.issueDate)}</bdi>
            </div>
          </div>
        </header>
      )}

      {/* Parties */}
      {d.template === "commercial" ? (
        <div className="mt-5 grid grid-cols-2 gap-4">
          <TitledBox title={t("doc.issuer")}>
            <PartyLines p={d.company} />
          </TitledBox>
          <TitledBox title={t(d.kind === "devis" ? "doc.client" : "doc.billedTo")}>
            <PartyLines p={d.client} />
          </TitledBox>
        </div>
      ) : d.template === "marche" ? (
        <Box className="mt-4">
          <span className="font-semibold">
            {t(d.kind === "devis" ? "doc.owner" : "doc.client")}
            {t("doc.colon")}
          </span>
          <bdi dir="auto">{d.client.name || "—"}</bdi>
          {(d.client.address || d.client.city) && (
            <>
              {" — "}
              <bdi dir="auto">
                {[d.client.address, d.client.city].filter(Boolean).join(t("doc.listSep"))}
              </bdi>
            </>
          )}
          {idList(d.client).map((x) => (
            <span key={x}>
              {" — "}
              <Ltr className="num">{x}</Ltr>
            </span>
          ))}
          {d.delivery && (
            <div className="mt-1">
              <span className="font-semibold">
                {t("doc.delivery.btp")}
                {t("doc.colon")}
              </span>
              <bdi dir="auto">{d.delivery}</bdi>
            </div>
          )}
        </Box>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-6">
          <dl className="space-y-0.5 self-start">
            {bi && <MetaRow k={<Bi on k="doc.date" />} v={fmt.date(d.issueDate)} />}
            <MetaRow
              k={<Bi on={bi} k={d.kind === "devis" ? "doc.validUntil" : "doc.dueDate"} />}
              v={fmt.date(d.secondDate)}
            />
            {d.quoteRef && <MetaRow k={<Bi on={bi} k="doc.quoteRef" />} v={d.quoteRef} />}
            {d.delivery && (
              <MetaRow k={<Bi on={bi} k="doc.delivery.default" />} v={d.delivery} text />
            )}
          </dl>
          <Box className={d.template === "zellige" ? "border-2" : ""}>
            <div className={`mb-1 text-[10.5px] uppercase tracking-wider ${muted}`}>
              <Bi on={bi} k={d.kind === "devis" ? "doc.client" : "doc.billedTo"} />
            </div>
            <PartyLines p={d.client} />
          </Box>
        </div>
      )}

      {d.template === "commercial" && (
        <div className="mt-4 grid grid-cols-4 border text-[11.5px]">
          {(
            [
              [t("doc.date"), fmt.date(d.issueDate), false],
              [
                t(d.kind === "devis" ? "doc.validity" : "doc.dueDate"),
                fmt.date(d.secondDate),
                false,
              ],
              [t("doc.delay"), d.delivery || "—", true],
              d.kind === "devis"
                ? [t("doc.depositShortLabel"), fmt.percent(d.deposit), false]
                : [t("doc.quoteRef"), d.quoteRef || "—", false],
            ] as const
          ).map(([k, v, text], i) => (
            <div key={i} className={`px-3 py-2 ${i ? "border-s" : ""}`}>
              <div className={`text-[10px] uppercase tracking-wider ${muted}`}>{k}</div>
              <div className={text ? "font-medium" : "num font-medium"}>
                <bdi>{v}</bdi>
              </div>
            </div>
          ))}
        </div>
      )}

      <GridTable d={d} tot={tot} showDiscount={showDiscount} />

      {d.template !== "marche" && (
        <div className="mt-4 flex justify-end">
          <TotalsBox d={d} tot={tot} bi={bi} />
        </div>
      )}

      {st.showWords && (
        <div className="mt-4 border-2 px-3 py-2" style={{ borderColor: "var(--doc-accent)" }}>
          <span className="font-semibold">
            {t(d.kind === "facture" ? "doc.wordsFacture" : "doc.wordsDevis")}
            {t("doc.colon")}
          </span>
          <span className={d.template === "marche" ? "uppercase" : ""}>
            {t("doc.wordsFull", { words: amountInWords(tot.ttc, lang) })}
          </span>
        </div>
      )}

      <div className="h-5 shrink-0" />
      <footer className={`mt-auto space-y-2 text-[11px] ${muted}`}>
        {needsExemptionNote(d.lines) && (
          <Note k={t("doc.exemption")} v={d.exemptionNote || t("doc.exemptionMissing")} />
        )}
        {d.terms && <Note k={t("doc.terms")} v={d.terms} />}
        {(d.company.bank || d.company.rib) && (
          <p>
            <span className="font-semibold text-[#14213D]">
              {t("doc.bankTransfer")}
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
        {st.showSignature && (
          <div className="grid grid-cols-2 gap-6 pt-3 text-[#14213D]">
            <StampBox label={<Bi on={bi} k="doc.companyStamp" />} />
            {d.kind === "devis" ? <StampBox label={<Bi on={bi} k="doc.approval" />} /> : <div />}
          </div>
        )}
        <LegalBox c={d.company} />
      </footer>

      {d.template === "zellige" && <ZelligeBand />}
    </>
  );
}

function GridTable({ d, tot, showDiscount }: { d: DocData; tot: Totals; showDiscount: boolean }) {
  const { t, fmt } = useDoc();
  const marche = d.template === "marche";
  const bi = d.template === "bilingue";
  const filled = d.template === "commercial" || d.template === "zellige";
  const th = "border px-2 py-1.5 font-semibold";
  const cols = 6 + (showDiscount ? 1 : 0) + (marche ? 0 : 1); // N°, designation, unit, qty, unit price, amount
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
          <th className={`${th} w-10 text-center`}>
            {t(marche ? "doc.col.priceNo" : "doc.col.no")}
          </th>
          <th className={`${th} text-start`}>
            <Bi on={bi} k={marche ? "doc.col.works" : "doc.col.designation"} />
          </th>
          <th className={`${th} w-14 text-center`}>
            <Bi on={bi} k="doc.col.unit" />
          </th>
          <th className={`${th} w-16 text-end`}>
            <Bi on={bi} k="doc.col.qty" />
          </th>
          <th className={`${th} w-24 text-end`}>
            <Bi on={bi} k="doc.col.unitPrice" />
          </th>
          {showDiscount && <th className={`${th} w-12 text-end`}>{t("doc.col.discount")}</th>}
          {!marche && <th className={`${th} w-12 text-end`}>{t("doc.col.vat")}</th>}
          <th className={`${th} w-28 text-end`}>
            <Bi on={bi} k={marche ? "doc.col.totalPriceHt" : "doc.col.amountHt"} />
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
          <FootRow cols={cols} k={t("doc.totalHt")} v={fmt.money(tot.ht)} />
          {tot.discount > 0 && (
            <FootRow
              cols={cols}
              k={t("doc.ofWhichDiscounts")}
              v={"− " + fmt.money(tot.discount)}
              light
            />
          )}
          {tot.byRate.map((r) => (
            <FootRow
              key={r.rate}
              cols={cols}
              k={t("doc.vat", { rate: fmt.percent(r.rate) })}
              v={fmt.money(r.tva)}
            />
          ))}
          <FootRow cols={cols} k={t("doc.totalTtc")} v={fmt.money(tot.ttc)} strong />
          {d.kind === "devis" && d.deposit > 0 && (
            <FootRow
              cols={cols}
              k={t("doc.depositShort", { pct: fmt.percent(d.deposit) })}
              v={fmt.money(tot.deposit)}
              light
            />
          )}
          {d.kind === "facture" && d.paid ? (
            <FootRow
              cols={cols}
              k={t("doc.remaining")}
              v={fmt.money(Math.round((tot.ttc - d.paid) * 100) / 100)}
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
  const { t, fmt } = useDoc();
  const [first, ...rest] = (l.description || "—").split("\n");
  const td = "border px-2 py-1.5 align-top";
  return (
    <tr className="break-inside-avoid">
      <td className={`${td} num text-center`}>{n}</td>
      <td className={`${td} break-words`}>
        <div>
          <bdi>{first}</bdi>
        </div>
        {rest.length > 0 && (
          <div className={`whitespace-pre-wrap text-[11px] ${muted}`}>
            <bdi>{rest.join("\n")}</bdi>
          </div>
        )}
      </td>
      <td className={`${td} text-center`}>{t(`units.${l.unit}`)}</td>
      <td className={`${td} num text-end`}>
        <Ltr>{fmt.number(l.qty)}</Ltr>
      </td>
      <td className={`${td} num text-end`}>
        <bdi>{fmt.money(l.unitPrice)}</bdi>
      </td>
      {showDiscount && (
        <td className={`${td} num text-end`}>
          {l.discount ? <Ltr>{fmt.percent(l.discount)}</Ltr> : ""}
        </td>
      )}
      {showVat && (
        <td className={`${td} num text-end`}>
          <Ltr>{fmt.percent(l.vatRate)}</Ltr>
        </td>
      )}
      <td className={`${td} num text-end`}>
        <bdi>{fmt.money(lineHT(l))}</bdi>
      </td>
    </tr>
  );
}

function FootRow({
  cols,
  k,
  v,
  strong,
  light,
}: {
  cols: number;
  k: string;
  v: string;
  strong?: boolean;
  light?: boolean;
}) {
  return (
    <tr
      style={
        strong ? { background: "var(--doc-accent)", color: "var(--doc-on-accent)" } : undefined
      }
      className={light ? "font-normal" : ""}
    >
      <td colSpan={cols - 1} className="border px-2 py-1.5 text-end">
        {k}
      </td>
      <td className="num border px-2 py-1.5 text-end">
        <bdi>{v}</bdi>
      </td>
    </tr>
  );
}

function TotalsBox({ d, tot, bi }: { d: DocData; tot: Totals; bi: boolean }) {
  const { fmt } = useDoc();
  const row = (key: string, k: ReactNode, v: string, strong = false) => (
    <tr
      key={key}
      style={
        strong ? { background: "var(--doc-accent)", color: "var(--doc-on-accent)" } : undefined
      }
      className={strong ? "font-semibold" : ""}
    >
      <td className="border px-3 py-1.5">{k}</td>
      <td className="num whitespace-nowrap border px-3 py-1.5 text-end">
        <bdi>{v}</bdi>
      </td>
    </tr>
  );
  return (
    <table className="w-80 border-collapse">
      <tbody>
        {tot.discount > 0 &&
          row("disc", <Bi on={bi} k="doc.discounts" />, "− " + fmt.money(tot.discount))}
        {row("ht", <Bi on={bi} k="doc.totalHt" />, fmt.money(tot.ht))}
        {tot.byRate.map((r) =>
          row(
            `vat${r.rate}`,
            <Bi on={bi} k="doc.vat" vars={{ rate: fmt.percent(r.rate) }} />,
            fmt.money(r.tva),
          ),
        )}
        {row("ttc", <Bi on={bi} k="doc.totalTtc" />, fmt.money(tot.ttc), true)}
        {d.kind === "devis" &&
          d.deposit > 0 &&
          row(
            "dep",
            <Bi on={bi} k="doc.depositShort" vars={{ pct: fmt.percent(d.deposit) }} />,
            fmt.money(tot.deposit),
          )}
        {d.kind === "facture" && d.paid
          ? row(
              "rest",
              <Bi on={bi} k="doc.remaining" />,
              fmt.money(Math.round((tot.ttc - d.paid) * 100) / 100),
            )
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

function CompanyIds({ c }: { c: Company }) {
  const ids = idList(c);
  if (!ids.length) return null;
  return (
    <div className="num mt-1 text-[11px]">
      {ids.map((x, i) => (
        <span key={x}>
          {i > 0 && " · "}
          <Ltr>{x}</Ltr>
        </span>
      ))}
    </div>
  );
}

function MetaRow({ k, v, text }: { k: ReactNode; v: string; text?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <dt className={`min-w-28 ${muted}`}>{k}</dt>
      <dd className={text ? "" : "num"}>
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

function StampBox({ label }: { label: ReactNode }) {
  return <div className="h-24 border p-2 text-[11px]">{label}</div>;
}

function LegalBox({ c }: { c: Company }) {
  const { t } = useDoc();
  const ids = idList(c);
  if (!c.name && !ids.length) return null;
  return (
    <p className="num mt-3 border-t pt-2 text-center text-[10.5px]">
      <bdi dir="auto" className="font-sans">
        {[c.name, c.address, c.city].filter(Boolean).join(t("doc.listSep"))}
      </bdi>
      {ids.length > 0 && (
        <>
          <br />
          {ids.map((x, i) => (
            <span key={x}>
              {i > 0 && " | "}
              <Ltr>{x}</Ltr>
            </span>
          ))}
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
