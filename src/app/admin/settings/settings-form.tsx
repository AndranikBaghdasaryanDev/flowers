"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, CheckCircle2, Coins, CreditCard, Mail, MailWarning } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Textarea, describedBy } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { CURRENCIES, type CurrencyCode } from "@/lib/domain/money";
import { isValidTimeZone } from "@/lib/domain/time";
import { TranslationTabs, pickOverrides, translationFields } from "@/components/admin/translation-tabs";
import type { I18nOverrides } from "@/lib/models/_util";
import type { SettingsText } from "@/lib/models/content";
import { useT } from "@/i18n/client";

type Contact = { phone: string; email: string; whatsapp: string; address: string; hours: string; mapUrl: string };
type Social = { instagram: string; facebook: string; telegram: string };
type Checkout = {
  guestCheckout: boolean;
  allowCustomerCancel: boolean;
  cashOnDelivery: boolean;
  cashOnPickup: boolean;
  maxQuantityPerItem: number;
  orderNotice: string;
};

export type SettingsFormValues = {
  storeName: string;
  tagline: string;
  timeZone: string;
  contact: Contact;
  social: Social;
  checkout: Checkout;
  /** Stored store-text overrides; only the general store fields are edited and saved here. */
  i18n: I18nOverrides<SettingsText>;
};

const SETTINGS_TEXT = ["tagline", "contactAddress", "contactHours", "orderNotice"] as const;

type FormState = Omit<SettingsFormValues, "checkout"> & { checkout: Omit<Checkout, "maxQuantityPerItem"> & { maxQuantityPerItem: string } };

const SMTP_VARS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"];

export function SettingsForm({ initial, currency, emailConfigured }: { initial: SettingsFormValues; currency: CurrencyCode; emailConfigured: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const [form, setForm] = useState<FormState>({
    ...initial,
    checkout: { ...initial.checkout, maxQuantityPerItem: String(initial.checkout.maxQuantityPerItem) },
  });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const setTop = <K extends "storeName" | "tagline" | "timeZone">(key: K, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const setContact = (key: keyof Contact, value: string) => {
    setForm((f) => ({ ...f, contact: { ...f.contact, [key]: value } }));
    setDirty(true);
  };
  const setSocial = (key: keyof Social, value: string) => {
    setForm((f) => ({ ...f, social: { ...f.social, [key]: value } }));
    setDirty(true);
  };
  const setCheckout = <K extends keyof FormState["checkout"]>(key: K, value: FormState["checkout"][K]) => {
    setForm((f) => ({ ...f, checkout: { ...f.checkout, [key]: value } }));
    setDirty(true);
  };

  const translated = translationFields(
    form.i18n,
    (fn) => {
      setForm((f) => ({ ...f, i18n: fn(f.i18n) }));
      setDirty(true);
    },
    [
      { key: "tagline", label: t("admin.settings.tagline"), base: form.tagline, maxLength: 160, group: t("admin.settings.store") },
      { key: "contactAddress", label: t("admin.settings.address"), base: form.contact.address, maxLength: 300, group: t("admin.settings.contact") },
      { key: "contactHours", label: t("admin.settings.hours"), base: form.contact.hours, rows: 3, maxLength: 300, group: t("admin.settings.contact") },
      { key: "orderNotice", label: t("admin.settings.notice"), base: form.checkout.orderNotice, rows: 3, maxLength: 500, group: t("admin.settings.checkout") },
    ],
  );

  /** Props for a field whose API error key is `key` (e.g. "contact.email"). */
  const wire = (key: string, hint?: string) => {
    const id = `st-${key.replace(".", "-")}`;
    return { id, invalid: !!fields[key], "aria-describedby": describedBy(id, fields[key], hint) };
  };

  const tzTrimmed = form.timeZone.trim();
  const tzLooksInvalid = tzTrimmed !== "" && !isValidTimeZone(tzTrimmed);
  const noPayment = !form.checkout.cashOnDelivery && !form.checkout.cashOnPickup;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (noPayment) {
      setFields({ "checkout.cashOnDelivery": t("admin.settings.needPaymentMethod") });
      setError(t("admin.common.fixFields"));
      document.getElementById("payments")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    const trimUrls = <T extends Record<string, string>>(o: T, keys: (keyof T)[]): T => {
      const copy = { ...o };
      for (const k of keys) copy[k] = copy[k].trim() as T[keyof T];
      return copy;
    };
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: {
          storeName: form.storeName,
          tagline: form.tagline,
          timeZone: tzTrimmed,
          contact: trimUrls(form.contact, ["phone", "email", "whatsapp", "mapUrl"]),
          social: trimUrls(form.social, ["instagram", "facebook", "telegram"]),
          checkout: { ...form.checkout, maxQuantityPerItem: Number(form.checkout.maxQuantityPerItem) },
          i18n: pickOverrides(form.i18n, SETTINGS_TEXT),
        },
      });
      setDirty(false);
      toast.success(t("admin.settings.saved"));
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
      toast.error(t("admin.settings.notSaved"), errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const tzHint = t("admin.settings.timeZoneHint");
  const qtyHint = t("admin.settings.maxQtyHint");
  const hoursHint = t("admin.settings.hoursHint");
  const mapHint = t("admin.settings.mapHint");
  const noticeHint = t("admin.settings.noticeHint");

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <FormError message={error} />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <TranslationTabs fields={translated} errors={fields} asPanels className="min-w-0">
          <div className="space-y-6">
            <Panel title={t("admin.settings.store")} description={t("admin.settings.storeHint")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="st-storeName" label={t("admin.settings.storeName")} required error={fields.storeName}>
                  <Input {...wire("storeName")} value={form.storeName} maxLength={80} onChange={(e) => setTop("storeName", e.target.value)} />
                </Field>
                <Field id="st-tagline" label={t("admin.settings.tagline")} optional error={fields.tagline}>
                  <Input {...wire("tagline")} value={form.tagline} maxLength={160} onChange={(e) => setTop("tagline", e.target.value)} />
                </Field>
                <Field
                  id="st-timeZone"
                  label={t("admin.settings.timeZone")}
                  required
                  className="sm:col-span-2"
                  error={fields.timeZone ?? (tzLooksInvalid ? t("admin.settings.timeZoneInvalid") : undefined)}
                  hint={tzHint}
                >
                  <Input
                    {...wire("timeZone", tzHint)}
                    invalid={!!fields.timeZone || tzLooksInvalid}
                    aria-describedby={fields.timeZone || tzLooksInvalid ? "st-timeZone-error" : "st-timeZone-hint"}
                    value={form.timeZone}
                    maxLength={64}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Asia/Yerevan"
                    onChange={(e) => setTop("timeZone", e.target.value)}
                  />
                </Field>
              </div>
            </Panel>

            <Panel title={t("admin.settings.contact")} description={t("admin.settings.contactHint")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="st-contact-phone" label={t("form.phone")} optional error={fields["contact.phone"]}>
                  <Input {...wire("contact.phone")} type="tel" autoComplete="off" value={form.contact.phone} maxLength={32} onChange={(e) => setContact("phone", e.target.value)} />
                </Field>
                <Field id="st-contact-whatsapp" label={t("admin.settings.whatsapp")} optional error={fields["contact.whatsapp"]}>
                  <Input {...wire("contact.whatsapp")} type="tel" autoComplete="off" value={form.contact.whatsapp} maxLength={32} onChange={(e) => setContact("whatsapp", e.target.value)} />
                </Field>
                <Field id="st-contact-email" label={t("form.email")} optional error={fields["contact.email"]} className="sm:col-span-2">
                  <Input {...wire("contact.email")} type="email" autoComplete="off" value={form.contact.email} maxLength={254} onChange={(e) => setContact("email", e.target.value)} />
                </Field>
                <Field id="st-contact-address" label={t("admin.settings.address")} optional error={fields["contact.address"]} className="sm:col-span-2">
                  <Input {...wire("contact.address")} value={form.contact.address} maxLength={300} onChange={(e) => setContact("address", e.target.value)} />
                </Field>
                <Field id="st-contact-hours" label={t("admin.settings.hours")} optional error={fields["contact.hours"]} hint={hoursHint}>
                  <Textarea {...wire("contact.hours", hoursHint)} rows={3} value={form.contact.hours} maxLength={300} onChange={(e) => setContact("hours", e.target.value)} />
                </Field>
                <Field id="st-contact-mapUrl" label={t("admin.settings.mapLink")} optional error={fields["contact.mapUrl"]} hint={mapHint}>
                  <Input {...wire("contact.mapUrl", mapHint)} type="url" inputMode="url" placeholder="https://" value={form.contact.mapUrl} maxLength={500} onChange={(e) => setContact("mapUrl", e.target.value)} />
                </Field>
              </div>
            </Panel>

            <Panel title={t("admin.settings.social")} description={t("admin.settings.socialHint")}>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["instagram", "facebook", "telegram"] as const).map((k) => (
                  <Field key={k} id={`st-social-${k}`} label={k === "instagram" ? "Instagram" : k === "facebook" ? "Facebook" : "Telegram"} optional error={fields[`social.${k}`]}>
                    <Input {...wire(`social.${k}`)} type="url" inputMode="url" placeholder="https://" value={form.social[k]} maxLength={300} onChange={(e) => setSocial(k, e.target.value)} />
                  </Field>
                ))}
              </div>
            </Panel>

            <section className="scroll-mt-24 rounded-2xl border border-line bg-paper" aria-labelledby="payments">
              <div className="border-b border-line px-5 py-4">
                <h2 id="payments" className="scroll-mt-24 flex items-center gap-2 font-sans text-[15px] font-semibold tracking-normal text-ink">
                  <CreditCard className="h-4 w-4" aria-hidden="true" /> {t("admin.settings.checkout")}
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-muted">{t("admin.settings.checkoutHint")}</p>
              </div>
              <div className="space-y-6 p-5">
                <fieldset className="space-y-3">
                  <legend className="mb-3 text-[13px] font-semibold text-ink">{t("admin.settings.paymentMethods")}</legend>
                  <Checkbox
                    id="st-checkout-cashOnDelivery"
                    checked={form.checkout.cashOnDelivery}
                    onChange={(e) => setCheckout("cashOnDelivery", e.target.checked)}
                    label={t("admin.settings.cashOnDelivery")}
                    description={t("admin.settings.cashOnDeliveryHint")}
                    aria-invalid={!!fields["checkout.cashOnDelivery"] || undefined}
                  />
                  <Checkbox
                    id="st-checkout-cashOnPickup"
                    checked={form.checkout.cashOnPickup}
                    onChange={(e) => setCheckout("cashOnPickup", e.target.checked)}
                    label={t("admin.settings.cashOnPickup")}
                    description={t("admin.settings.cashOnPickupHint")}
                    aria-invalid={!!fields["checkout.cashOnPickup"] || undefined}
                  />
                  {(fields["checkout.cashOnDelivery"] || fields["checkout.cashOnPickup"] || noPayment) && (
                    <p className="text-[13px] text-danger" role="alert">
                      {fields["checkout.cashOnDelivery"] ?? fields["checkout.cashOnPickup"] ?? t("admin.settings.needPaymentMethodLong")}
                    </p>
                  )}
                  <p className="flex items-start gap-2 rounded-xl bg-info-50 px-4 py-3 text-[13px] text-info">
                    <Banknote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("admin.settings.noCardPayments")}
                  </p>
                </fieldset>

                <fieldset className="space-y-3 border-t border-line pt-5">
                  <legend className="sr-only">{t("admin.settings.orderingRules")}</legend>
                  <Checkbox
                    id="st-checkout-guestCheckout"
                    checked={form.checkout.guestCheckout}
                    onChange={(e) => setCheckout("guestCheckout", e.target.checked)}
                    label={t("admin.settings.guestCheckout")}
                    description={t("admin.settings.guestCheckoutHint")}
                  />
                  <Checkbox
                    id="st-checkout-allowCustomerCancel"
                    checked={form.checkout.allowCustomerCancel}
                    onChange={(e) => setCheckout("allowCustomerCancel", e.target.checked)}
                    label={t("admin.settings.customerCancel")}
                    description={t("admin.settings.customerCancelHint")}
                  />
                </fieldset>

                <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-[minmax(0,14rem)_1fr]">
                  <Field id="st-checkout-maxQuantityPerItem" label={t("admin.settings.maxQty")} required error={fields["checkout.maxQuantityPerItem"]} hint={qtyHint}>
                    <Input
                      {...wire("checkout.maxQuantityPerItem", qtyHint)}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={99}
                      step={1}
                      value={form.checkout.maxQuantityPerItem}
                      onChange={(e) => setCheckout("maxQuantityPerItem", e.target.value)}
                    />
                  </Field>
                  <Field id="st-checkout-orderNotice" label={t("admin.settings.notice")} optional error={fields["checkout.orderNotice"]} hint={noticeHint}>
                    <Textarea
                      {...wire("checkout.orderNotice", noticeHint)}
                      rows={3}
                      maxLength={500}
                      value={form.checkout.orderNotice}
                      onChange={(e) => setCheckout("orderNotice", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </section>
          </div>
        </TranslationTabs>

        <div className="min-w-0 space-y-6">
          <Panel title={<span className="flex items-center gap-2"><Coins className="h-4 w-4" aria-hidden="true" /> {t("admin.settings.currency")}</span>}>
            <p className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-ink">{currency}</span>
              <span className="text-lg text-ink-muted">{CURRENCIES[currency].symbol}</span>
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              {t("admin.settings.currencyHint")}
            </p>
          </Panel>

          <Panel title={<span className="flex items-center gap-2"><Mail className="h-4 w-4" aria-hidden="true" /> {t("admin.settings.email")}</span>}>
            {emailConfigured ? (
              <div className="space-y-2 text-[13px] leading-relaxed text-ink-soft">
                <Badge tone="success" dot>{t("admin.settings.configured")}</Badge>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{t("admin.settings.emailConfiguredHint")}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-[13px] leading-relaxed text-ink-soft">
                <Badge tone="warning" dot>{t("admin.settings.notConfigured")}</Badge>
                <p className="flex items-start gap-2">
                  <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <span>{t.rich("admin.settings.emailNotSent", { b: (c) => <strong className="font-semibold text-ink">{c}</strong> })}</span>
                </p>
                <p>{t("admin.settings.emailEnvHint")}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {SMTP_VARS.map((v) => (
                    <li key={v}>
                      <code className="rounded-md bg-cream px-1.5 py-0.5 font-mono text-[12px] text-ink">{v}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-paper/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgb(43_30_35/0.25)] backdrop-blur">
        <span className="mr-auto text-[13px] text-ink-muted" aria-live="polite">
          {dirty ? t("admin.common.unsavedChanges") : t("admin.common.allSaved")}
        </span>
        <Button type="submit" loading={busy}>
          {t("admin.settings.save")}
        </Button>
      </div>
    </form>
  );
}
