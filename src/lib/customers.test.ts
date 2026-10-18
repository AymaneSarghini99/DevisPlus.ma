import { beforeEach, describe, expect, it } from "vitest";
import { tFor } from "@/i18n/index";
import {
  addPayment,
  customerErrors,
  customersCsv,
  customerStats,
  deleteCustomer,
  loadCustomers,
  newCustomer,
  newCustomerPayment,
  parseBackup,
  paymentSummary,
  saveCustomer,
  type Customer,
} from "./customers";

beforeEach(() => localStorage.clear());

const pay = (date: string, amount: number) => ({ ...newCustomerPayment(amount), date });
const atlas = (): Customer => ({
  ...newCustomer(),
  company: "Atlas SARL",
  createdAt: "2026-09-01",
});

describe("paymentSummary", () => {
  it("finds the date the customer became fully paid", () => {
    const c = { ...atlas(), payments: [pay("2026-10-05", 1500), pay("2026-09-20", 1000)] };
    expect(paymentSummary(c)).toEqual({
      paid: 2500,
      balance: 0,
      paidAt: "2026-10-05",
      lastPayment: "2026-10-05",
    });
    expect(paymentSummary({ ...atlas(), payments: [pay("2026-09-20", 1000)] })).toMatchObject({
      paid: 1000,
      balance: 1500,
      paidAt: null,
    });
  });
});

describe("addPayment", () => {
  it("marks an awaiting customer as paid once the full price is received", () => {
    let c: Customer = { ...atlas(), status: "awaiting" };
    c = addPayment(c, pay("2026-10-01", 1000));
    expect(c.status).toBe("awaiting");
    c = addPayment(c, pay("2026-10-02", 1500));
    expect(c.status).toBe("paid");
    // An active customer keeps its status.
    expect(addPayment({ ...atlas(), status: "active" }, pay("2026-10-02", 2500)).status).toBe(
      "active",
    );
  });
});

describe("customerStats", () => {
  it("adds up revenue, this month and what is still owed", () => {
    const list: Customer[] = [
      { ...atlas(), status: "paid", payments: [pay("2026-10-03", 2500)] },
      {
        ...atlas(),
        status: "awaiting",
        payments: [pay("2026-09-03", 1000)],
        domainState: "pending",
      },
      { ...atlas(), status: "lead" },
      { ...atlas(), status: "cancelled", payments: [] },
    ];
    expect(customerStats(list, "2026-10")).toEqual({
      customers: 2,
      leads: 1,
      paidCount: 1,
      revenue: 3500,
      revenueMonth: 2500,
      outstanding: 1500,
      pendingDomains: 1,
    });
  });
});

describe("storage, validation and backup", () => {
  it("saves, updates and deletes customers", () => {
    const c = atlas();
    saveCustomer(c);
    saveCustomer({ ...c, city: "Rabat" });
    expect(loadCustomers()).toHaveLength(1);
    expect(loadCustomers()[0]!.city).toBe("Rabat");
    deleteCustomer(c.id);
    expect(loadCustomers()).toEqual([]);
  });

  it("validates the customer form", () => {
    expect(customerErrors(newCustomer())).toEqual({ company: "required" });
    expect(customerErrors({ ...atlas(), email: "x", ice: "12", phone: "06" })).toEqual({
      email: "email",
      ice: "ice",
      phone: "phone",
    });
  });

  it("reads back a JSON backup and rejects anything else", () => {
    const list = [{ ...atlas(), payments: [pay("2026-10-01", 2500)] }];
    expect(parseBackup(JSON.stringify(list))?.[0]?.company).toBe("Atlas SARL");
    expect(parseBackup(JSON.stringify({ customers: list }))).toHaveLength(1);
    expect(parseBackup("not json")).toBeNull();
    expect(parseBackup(JSON.stringify([{ foo: 1 }]))).toBeNull();
  });

  it("exports a CSV with translated headers", () => {
    const csv = customersCsv([{ ...atlas(), payments: [pay("2026-10-01", 2500)] }], tFor("fr"));
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain("Atlas SARL");
    expect(csv).toContain("2026-10-01");
  });
});
