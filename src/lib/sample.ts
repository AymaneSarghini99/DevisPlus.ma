import { tFor } from "@/i18n/index";
import type { DocData } from "@/components/QuoteDocument";
import { addDays, emptyCompany, today } from "./quotes";
import { docTerms, hasProfile, type Settings } from "./store";

/** Example content, clearly labelled as such, used only when no quote has been saved yet. */
export function sample(s: Settings): DocData {
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
