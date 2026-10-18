import { useEffect, useState } from "react";
import { CheckCircle2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/DatePicker";
import { Dropdown } from "@/components/Dropdown";
import { F } from "@/components/Form";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useLocale } from "@/i18n/LocaleProvider";
import {
  addPayment,
  CUSTOMER_STATUSES,
  customerErrors,
  DOMAIN_STATES,
  newCustomerPayment,
  paymentSummary,
  type Customer,
  type CustomerPayment,
} from "@/lib/customers";
import { METHODS, type PaymentMethod } from "@/lib/invoices";

/** Side panel to create or edit a customer and record their payments. */
export function CustomerSheet({
  customer,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  customer: Customer | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}) {
  const { t } = useTranslation();
  const { dir, fmt } = useLocale();
  const [c, setC] = useState<Customer | null>(customer);
  const [tried, setTried] = useState(false);
  const [pay, setPay] = useState<CustomerPayment>(newCustomerPayment());

  useEffect(() => {
    setC(customer);
    setTried(false);
    if (customer) setPay(newCustomerPayment(paymentSummary(customer).balance));
  }, [customer]);

  if (!c) return null;
  const errors = customerErrors(c);
  const err = (k: keyof typeof errors) =>
    tried && errors[k] ? t(`validation.${errors[k]}` as never) : undefined;
  const set = (patch: Partial<Customer>) => setC({ ...c, ...patch });
  const summary = paymentSummary(c);

  const text = (
    k: "company" | "contact" | "email" | "phone" | "city" | "ice" | "subdomain" | "customDomain",
    label: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <F label={label} id={`cu-${k}`} error={err(k as keyof typeof errors)}>
      <input
        id={`cu-${k}`}
        className="field"
        aria-invalid={!!err(k as keyof typeof errors)}
        value={c[k]}
        onChange={(e) =>
          set({ [k]: k === "ice" ? e.target.value.replace(/\D/g, "") : e.target.value })
        }
        {...extra}
      />
    </F>
  );

  const save = () => {
    setTried(true);
    if (Object.keys(errors).length) {
      toast.error(t("common.fixFields"));
      return;
    }
    onSave(c);
  };

  const recordPayment = () => {
    if (!(pay.amount > 0)) {
      toast.error(t("admin.pay.invalid"));
      return;
    }
    const next = addPayment(c, { ...pay, reference: pay.reference.trim() });
    setC(next);
    setPay(newCustomerPayment(paymentSummary(next).balance));
    toast.success(t("admin.pay.added"));
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={dir === "rtl" ? "left" : "right"}
        dir={dir}
        className="w-full overflow-y-auto p-0 sm:max-w-xl [&>button:last-child]:hidden"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background px-6 py-4">
          <div>
            <SheetTitle className="text-lg font-semibold">
              {isNew ? t("admin.form.newTitle") : c.company || t("admin.form.editTitle")}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {t(`admin.status.${c.status}`)}
            </SheetDescription>
          </div>
          <button
            type="button"
            className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("admin.form.close")}
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          noValidate
          className="space-y-8 px-6 py-6"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("admin.form.identity")}
            </legend>
            {text("company", t("admin.form.company"), { dir: "auto", autoFocus: isNew })}
            {text("contact", t("admin.form.contact"), { dir: "auto" })}
            {text("email", t("admin.form.email"), { type: "email", dir: "ltr" })}
            {text("phone", t("admin.form.phone"), { type: "tel", dir: "ltr" })}
            {text("city", t("admin.form.city"), { dir: "auto" })}
            {text("ice", t("admin.form.ice"), { inputMode: "numeric", maxLength: 15, dir: "ltr" })}
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("admin.form.workspace")}
            </legend>
            <F label={t("admin.form.status")} id="cu-status">
              <Dropdown
                id="cu-status"
                value={c.status}
                onChange={(v) => set({ status: v as Customer["status"] })}
                options={CUSTOMER_STATUSES.map((s) => ({
                  value: s,
                  label: t(`admin.status.${s}`),
                }))}
              />
            </F>
            <F label={t("admin.form.requested")} id="cu-requested">
              <DatePicker
                id="cu-requested"
                value={c.createdAt}
                onChange={(v) => v && set({ createdAt: v })}
              />
            </F>
            <F label={t("admin.form.price")} id="cu-price" error={err("price")}>
              <input
                id="cu-price"
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                className="field num"
                value={Number.isFinite(c.price) ? c.price : ""}
                onChange={(e) => set({ price: Number(e.target.value) })}
              />
            </F>
            <F label={t("admin.form.domainState")} id="cu-domain">
              <Dropdown
                id="cu-domain"
                value={c.domainState}
                onChange={(v) => set({ domainState: v as Customer["domainState"] })}
                options={DOMAIN_STATES.map((s) => ({ value: s, label: t(`admin.domain.${s}`) }))}
              />
            </F>
            {text("subdomain", t("admin.form.subdomain"), {
              dir: "ltr",
              placeholder: "monentreprise",
            })}
            {text("customDomain", t("admin.form.customDomain"), {
              dir: "ltr",
              placeholder: "devis.monentreprise.ma",
            })}
            <F label={t("admin.form.notes")} id="cu-notes" wide>
              <textarea
                id="cu-notes"
                rows={3}
                dir="auto"
                className="field h-auto py-2"
                value={c.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </F>
          </fieldset>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("admin.pay.title")}
            </h3>
            <div
              className={`mb-4 flex items-center gap-2 rounded-sm px-3 py-2 text-sm ${
                summary.paidAt ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"
              }`}
            >
              {summary.paidAt ? (
                <>
                  <CheckCircle2 className="size-4 shrink-0" />
                  {t("admin.pay.fullyPaid", { date: fmt.date(summary.paidAt) })}
                </>
              ) : (
                <span>
                  {t("admin.pay.balance")}{" "}
                  <bdi className="num font-semibold">{fmt.money(summary.balance)}</bdi>
                </span>
              )}
            </div>
            {c.payments.length ? (
              <ul className="divide-y rounded-sm border text-sm">
                {[...c.payments]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="num w-24 shrink-0 text-muted-foreground">
                        {fmt.date(p.date)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {t(`methods.${p.method}`)}
                        {p.reference && (
                          <span className="text-muted-foreground">
                            {" · "}
                            <bdi>{p.reference}</bdi>
                          </span>
                        )}
                      </span>
                      <bdi className="num font-medium">{fmt.money(p.amount)}</bdi>
                      <button
                        type="button"
                        className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label={t("admin.pay.remove")}
                        title={t("admin.pay.remove")}
                        onClick={() => set({ payments: c.payments.filter((x) => x.id !== p.id) })}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("admin.pay.none")}</p>
            )}

            <div className="mt-4 grid gap-3 rounded-sm border border-dashed p-4 sm:grid-cols-2">
              <F label={t("admin.pay.date")} id="pay-date">
                <DatePicker
                  id="pay-date"
                  value={pay.date}
                  onChange={(v) => v && setPay({ ...pay, date: v })}
                />
              </F>
              <F label={t("admin.pay.amount")} id="pay-amount">
                <input
                  id="pay-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  dir="ltr"
                  className="field num"
                  value={Number.isFinite(pay.amount) ? pay.amount : ""}
                  onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })}
                />
              </F>
              <F label={t("admin.pay.method")} id="pay-method">
                <Dropdown
                  id="pay-method"
                  value={pay.method}
                  onChange={(v) => setPay({ ...pay, method: v as PaymentMethod })}
                  options={METHODS.map((m) => ({ value: m, label: t(`methods.${m}`) }))}
                />
              </F>
              <F label={t("admin.pay.reference")} id="pay-ref">
                <input
                  id="pay-ref"
                  dir="auto"
                  className="field"
                  placeholder={t("admin.pay.referencePlaceholder")}
                  value={pay.reference}
                  onChange={(e) => setPay({ ...pay, reference: e.target.value })}
                />
              </F>
              <div className="sm:col-span-2">
                <button type="button" className="btn btn-ghost" onClick={recordPayment}>
                  <Plus className="size-4" /> {t("admin.pay.add")}
                </button>
              </div>
            </div>
          </section>

          <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-2 border-t bg-background px-6 py-4">
            {!isNew ? (
              <button
                type="button"
                className="btn btn-ghost text-destructive"
                onClick={() => onDelete(c)}
              >
                <Trash2 className="size-4" /> {t("admin.form.delete")}
              </button>
            ) : (
              <span />
            )}
            <button type="submit" className="btn btn-primary px-6">
              {t("admin.form.save")}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
