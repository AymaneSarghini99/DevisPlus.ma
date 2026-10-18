import type { TFunction } from "i18next";
import type { Locale } from "@/i18n/config";
import type { PaymentMethod } from "./invoices";
import { today, uid } from "./quotes";
import { toCsv } from "./reports";
import { read, write } from "./storage";

/**
 * Platform owner's customer register (the businesses that buy DevisPlus).
 *
 * Storage note: there is no server yet, so customers cannot sign up into a shared database
 * and this list is NOT filled automatically. The owner records each customer and payment here
 * (e.g. after a request received by email or WhatsApp). The data is kept in the owner's
 * browser; export a backup regularly. With a backend, this list would come from the accounts.
 */
export type CustomerStatus = "lead" | "awaiting" | "paid" | "active" | "cancelled";
export const CUSTOMER_STATUSES: CustomerStatus[] = [
  "lead",
  "awaiting",
  "paid",
  "active",
  "cancelled",
];
export type DomainState = "none" | "pending" | "active";
export const DOMAIN_STATES: DomainState[] = ["none", "pending", "active"];

export type CustomerPayment = {
  id: string;
  date: string; // yyyy-mm-dd
  amount: number;
  method: PaymentMethod;
  reference: string;
};

export type Customer = {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  city: string;
  ice: string;
  subdomain: string;
  customDomain: string;
  domainState: DomainState;
  /** Agreed price in MAD (the Business offer is a one-time payment). */
  price: number;
  status: CustomerStatus;
  createdAt: string; // yyyy-mm-dd: date of the request
  payments: CustomerPayment[];
  notes: string;
};

/** Business offer price (one-time payment, MAD). Same value as on /tarifs. */
export const OFFER_PRICE = 2500;
const KEY = "devisplus.customers";

export const newCustomer = (): Customer => ({
  id: uid(),
  company: "",
  contact: "",
  email: "",
  phone: "",
  city: "",
  ice: "",
  subdomain: "",
  customDomain: "",
  domainState: "none",
  price: OFFER_PRICE,
  status: "lead",
  createdAt: today(),
  payments: [],
  notes: "",
});
export const newCustomerPayment = (amount = 0): CustomerPayment => ({
  id: uid(),
  date: today(),
  amount,
  method: "virement",
  reference: "",
});

export const loadCustomers = () =>
  read<Customer[]>(KEY, []).map((c) => ({ ...newCustomer(), ...c, payments: c.payments ?? [] }));
export const saveCustomers = (list: Customer[]) => write(KEY, list);
export function saveCustomer(c: Customer) {
  const all = loadCustomers();
  const i = all.findIndex((x) => x.id === c.id);
  saveCustomers(i < 0 ? [c, ...all] : all.map((x) => (x.id === c.id ? c : x)));
}
export function deleteCustomer(id: string) {
  saveCustomers(loadCustomers().filter((x) => x.id !== id));
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Amount paid, balance left and the date the customer became fully paid (if they are). */
export function paymentSummary(c: Pick<Customer, "price" | "payments">) {
  const sorted = [...c.payments].sort((a, b) => a.date.localeCompare(b.date));
  let paid = 0;
  let paidAt: string | null = null;
  for (const p of sorted) {
    paid = round(paid + p.amount);
    if (!paidAt && c.price > 0 && paid >= c.price) paidAt = p.date;
  }
  const lastPayment = sorted.at(-1)?.date ?? null;
  return { paid, balance: round(Math.max(0, c.price - paid)), paidAt, lastPayment };
}

export type CustomerErrorCode = "required" | "email" | "phone" | "ice" | "amount";
export function customerErrors(c: Customer) {
  const e: Partial<Record<"company" | "email" | "phone" | "ice" | "price", CustomerErrorCode>> = {};
  if (!c.company.trim()) e.company = "required";
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) e.email = "email";
  if (c.phone && c.phone.replace(/\D/g, "").length < 9) e.phone = "phone";
  if (c.ice && !/^\d{15}$/.test(c.ice)) e.ice = "ice";
  if (!(c.price >= 0)) e.price = "amount";
  return e;
}

/** Figures for the admin overview; `month` is "yyyy-mm". Cancelled customers owe nothing. */
export function customerStats(list: Customer[], month = today().slice(0, 7)) {
  let revenue = 0;
  let revenueMonth = 0;
  let outstanding = 0;
  let paidCount = 0;
  let pendingDomains = 0;
  for (const c of list) {
    const s = paymentSummary(c);
    revenue += s.paid;
    revenueMonth += c.payments
      .filter((p) => p.date.startsWith(month))
      .reduce((a, p) => a + p.amount, 0);
    if (c.status !== "cancelled" && c.status !== "lead") outstanding += s.balance;
    if (s.paidAt) paidCount++;
    if (c.domainState === "pending" && c.status !== "cancelled") pendingDomains++;
  }
  return {
    customers: list.filter((c) => c.status !== "lead" && c.status !== "cancelled").length,
    leads: list.filter((c) => c.status === "lead").length,
    paidCount,
    revenue: round(revenue),
    revenueMonth: round(revenueMonth),
    outstanding: round(outstanding),
    pendingDomains,
  };
}

/** CSV of the register, one row per customer. */
export const customersCsv = (list: Customer[], t: TFunction, l: Locale = "fr") =>
  toCsv(
    [
      t("admin.col.company"),
      t("admin.col.contact"),
      t("admin.col.email"),
      t("admin.col.phone"),
      t("admin.col.city"),
      "ICE",
      t("admin.col.address"),
      t("admin.col.status"),
      t("admin.col.requested"),
      t("admin.col.price"),
      t("admin.col.paid"),
      t("admin.col.balance"),
      t("admin.col.paidAt"),
      t("admin.col.domainState"),
      t("admin.col.notes"),
    ],
    list.map((c) => {
      const s = paymentSummary(c);
      return [
        c.company,
        c.contact,
        c.email,
        c.phone,
        c.city,
        c.ice,
        c.customDomain || (c.subdomain ? `${c.subdomain}.devisplus.ma` : ""),
        t(`admin.status.${c.status}`),
        c.createdAt,
        c.price,
        s.paid,
        s.balance,
        s.paidAt ?? "",
        t(`admin.domain.${c.domainState}`),
        c.notes,
      ];
    }),
    l,
  );

/** Validates a JSON backup before it replaces the register. Returns null if unusable. */
export function parseBackup(text: string): Customer[] | null {
  try {
    const data = JSON.parse(text) as unknown;
    const list = Array.isArray(data) ? data : (data as { customers?: unknown })?.customers;
    if (!Array.isArray(list)) return null;
    const ok = list.every(
      (c) => c && typeof c === "object" && typeof (c as Customer).company === "string",
    );
    return ok
      ? list.map((c: Customer) => ({
          ...newCustomer(),
          ...c,
          payments: Array.isArray(c.payments) ? c.payments : [],
        }))
      : null;
  } catch {
    return null;
  }
}

/** Adds a payment; a lead or awaiting customer who is now fully paid becomes "paid". */
export function addPayment(c: Customer, p: CustomerPayment): Customer {
  const next = { ...c, payments: [...c.payments, p] };
  return paymentSummary(next).paidAt && (c.status === "lead" || c.status === "awaiting")
    ? { ...next, status: "paid" }
    : next;
}
