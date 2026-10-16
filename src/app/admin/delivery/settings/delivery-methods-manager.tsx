"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, Clock, MapPin, Pencil, Plus, Store, Trash2, Truck, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, RadioCard, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { CURRENCIES, toMinor, type CurrencyCode } from "@/lib/domain/money";
import { cn } from "@/lib/cn";
import type { AdminDeliveryMethod } from "@/lib/services/admin";
import type { DeliveryMethodInput } from "@/lib/validation";
import { useFormat, useT } from "@/i18n/client";
import type { Formatter } from "@/i18n/format";
import { TranslationTabs, translationFields, type TranslationField } from "@/components/admin/translation-tabs";
import type { ContentLocale, I18nOverrides } from "@/lib/models/_util";
import type { DeliveryMethodText } from "@/lib/models/delivery";

type T = ReturnType<typeof useT>;

/** Weekday indexes 0 (Sunday) … 6; names come from Intl in the admin's language. */
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
// 1 January 2023 was a Sunday.
const weekdayName = (f: Formatter, day: number) => f.date(new Date(Date.UTC(2023, 0, 1 + day)), { weekday: "short", timeZone: "UTC" });

const YEREVAN_DISTRICTS = [
  "Ajapnyak",
  "Arabkir",
  "Avan",
  "Davtashen",
  "Erebuni",
  "Kanaker-Zeytun",
  "Kentron",
  "Malatia-Sebastia",
  "Nor Nork",
  "Nork-Marash",
  "Nubarashen",
  "Shengavit",
];

let rowSeq = 0;
const rowKey = () => `row-${++rowSeq}`;

/** `tr` holds the area's Armenian / Russian names, kept on the row so they follow it when rows are removed. */
type ZoneRow = { key: string; name: string; fee: string; tr: Record<ContentLocale, string> };
type MethodText = Omit<DeliveryMethodText, "zones">;
type WindowRow = { key: string; label: string; start: string; end: string };

type Draft = {
  name: string;
  type: "delivery" | "pickup";
  description: string;
  isActive: boolean;
  fee: string;
  freeOverAmount: string;
  minOrderAmount: string;
  city: string;
  zones: ZoneRow[];
  estimatedTime: string;
  leadTimeMinutes: string;
  maxDaysAhead: string;
  availableWeekdays: number[];
  timeWindows: WindowRow[];
  requiresCourier: boolean;
  pickupAddress: string;
  sortOrder: string;
  i18n: I18nOverrides<MethodText>;
};

const withoutZones = (block: Partial<DeliveryMethodText> | undefined): Partial<MethodText> | undefined => {
  if (!block) return undefined;
  const { zones: _zones, ...rest } = block;
  return rest;
};

function toDraft(m: AdminDeliveryMethod): Draft {
  return {
    name: m.name,
    type: m.type,
    description: m.description,
    isActive: m.isActive,
    fee: String(m.fee),
    freeOverAmount: m.freeOverAmount === null ? "" : String(m.freeOverAmount),
    minOrderAmount: String(m.minOrderAmount),
    city: m.city,
    zones: m.zones.map((z, i) => ({
      key: rowKey(),
      name: z.name,
      fee: z.fee === null ? "" : String(z.fee),
      tr: { hy: m.i18n.hy?.zones?.[i] ?? "", ru: m.i18n.ru?.zones?.[i] ?? "" },
    })),
    estimatedTime: m.estimatedTime,
    leadTimeMinutes: String(m.leadTimeMinutes),
    maxDaysAhead: String(m.maxDaysAhead),
    availableWeekdays: [...m.availableWeekdays],
    timeWindows: m.timeWindows.map((w) => ({ key: rowKey(), label: w.label, start: w.start, end: w.end })),
    requiresCourier: m.requiresCourier,
    pickupAddress: m.pickupAddress,
    sortOrder: String(m.sortOrder),
    i18n: { hy: withoutZones(m.i18n.hy), ru: withoutZones(m.i18n.ru) },
  };
}

function newDraft(sortOrder: number): Draft {
  return {
    name: "",
    type: "delivery",
    description: "",
    isActive: true,
    fee: "0",
    freeOverAmount: "",
    minOrderAmount: "0",
    city: "",
    zones: [],
    estimatedTime: "",
    leadTimeMinutes: "120",
    maxDaysAhead: "30",
    availableWeekdays: [0, 1, 2, 3, 4, 5, 6],
    timeWindows: [],
    requiresCourier: true,
    pickupAddress: "",
    sortOrder: String(sortOrder),
    i18n: {},
  };
}

const isNumber = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));
const isInt = (v: string) => isNumber(v) && Number.isInteger(Number(v));

/** Client-side checks mirroring deliveryMethodInputSchema; keys match the API's field paths. */
function validate(d: Draft, t: T): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.name.trim().length < 2) e.name = t("admin.delivery.v.name");
  for (const k of ["fee", "minOrderAmount"] as const) {
    if (!isNumber(d[k]) || Number(d[k]) < 0) e[k] = t("admin.delivery.v.amount");
  }
  if (d.freeOverAmount.trim() !== "" && (!isNumber(d.freeOverAmount) || Number(d.freeOverAmount) < 0)) e.freeOverAmount = t("admin.delivery.v.amountOrEmpty");
  if (!isInt(d.leadTimeMinutes) || Number(d.leadTimeMinutes) < 0 || Number(d.leadTimeMinutes) > 20160) e.leadTimeMinutes = t("admin.delivery.v.leadTime");
  if (!isInt(d.maxDaysAhead) || Number(d.maxDaysAhead) < 0 || Number(d.maxDaysAhead) > 365) e.maxDaysAhead = t("admin.delivery.v.daysAhead");
  if (!isInt(d.sortOrder) || Math.abs(Number(d.sortOrder)) > 1000) e.sortOrder = t("admin.delivery.v.sortOrder");
  if (d.availableWeekdays.length === 0) e.availableWeekdays = t("admin.delivery.v.weekdays");
  if (d.type === "delivery") {
    const seen = new Set<string>();
    d.zones.forEach((z, i) => {
      const name = z.name.trim();
      if (!name) e[`zones.${i}.name`] = t("admin.delivery.v.zoneName");
      else if (seen.has(name.toLowerCase())) e[`zones.${i}.name`] = t("admin.delivery.v.zoneDuplicate");
      seen.add(name.toLowerCase());
      if (z.fee.trim() !== "" && (!isNumber(z.fee) || Number(z.fee) < 0)) e[`zones.${i}.fee`] = t("admin.delivery.v.amountOrEmpty");
    });
  }
  d.timeWindows.forEach((w, i) => {
    if (!w.label.trim()) e[`timeWindows.${i}.label`] = t("admin.delivery.v.windowLabel");
    if (!w.start) e[`timeWindows.${i}.start`] = t("admin.delivery.v.windowStart");
    if (!w.end) e[`timeWindows.${i}.end`] = t("admin.delivery.v.windowEnd");
    else if (w.start && w.end <= w.start) e[`timeWindows.${i}.end`] = t("admin.delivery.v.windowOrder");
  });
  return e;
}

function toPayload(d: Draft): DeliveryMethodInput {
  const delivery = d.type === "delivery";
  return {
    name: d.name.trim(),
    type: d.type,
    description: d.description.trim(),
    isActive: d.isActive,
    fee: Number(d.fee),
    freeOverAmount: d.freeOverAmount.trim() === "" ? null : Number(d.freeOverAmount),
    minOrderAmount: Number(d.minOrderAmount),
    zones: delivery ? d.zones.map((z) => ({ name: z.name.trim(), fee: z.fee.trim() === "" ? null : Number(z.fee) })) : [],
    city: delivery ? d.city.trim() : "",
    estimatedTime: d.estimatedTime.trim(),
    leadTimeMinutes: Number(d.leadTimeMinutes),
    maxDaysAhead: Number(d.maxDaysAhead),
    availableWeekdays: [...d.availableWeekdays].sort((a, b) => a - b),
    timeWindows: d.timeWindows.map((w) => ({ label: w.label.trim(), start: w.start, end: w.end })),
    requiresCourier: delivery && d.requiresCourier,
    pickupAddress: delivery ? "" : d.pickupAddress.trim(),
    sortOrder: Number(d.sortOrder),
    i18n: Object.fromEntries(
      (["hy", "ru"] as const).map((loc) => {
        const block = d.i18n[loc] ?? {};
        const tr = {
          ...block,
          city: delivery ? block.city : "",
          pickupAddress: delivery ? "" : block.pickupAddress,
          zones: delivery ? d.zones.map((z) => z.tr[loc].trim()) : [],
        };
        return [loc, tr];
      }),
    ),
  };
}

const KNOWN_FIELD =
  /^(name|type|description|fee|freeOverAmount|minOrderAmount|city|zones|estimatedTime|leadTimeMinutes|maxDaysAhead|availableWeekdays|timeWindows|requiresCourier|pickupAddress|sortOrder|zones\.\d+\.(name|fee)|timeWindows\.\d+\.(label|start|end)|i18n[.].+)$/;

function formatLeadTime(t: T, min: number) {
  if (min === 0) return t("admin.delivery.lead.none");
  if (min % 1440 === 0) return t("admin.delivery.lead.days", { count: min / 1440 });
  if (min < 60) return t("admin.delivery.lead.minutes", { min });
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? t("admin.delivery.lead.hoursMinutes", { h, min: m }) : t("admin.delivery.lead.hours", { h });
}

export function DeliveryMethodsManager({ methods, currency }: { methods: AdminDeliveryMethod[]; currency: CurrencyCode }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminDeliveryMethod | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminDeliveryMethod | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const t = useT();
  const f = useFormat();
  const money = (v: number) => f.money(toMinor(v, currency), currency);
  const nextSort = methods.reduce((n, m) => Math.max(n, m.sortOrder), 0) + 1;

  const remove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const { result } = await api<{ result: "deleted" | "deactivated" }>(`/api/admin/delivery-methods/${deleting.id}`, { method: "DELETE" });
      if (result === "deleted") toast.success(t("admin.delivery.deletedToast", { name: deleting.name }));
      else toast.info(t("admin.delivery.deactivatedToast", { name: deleting.name }), t("admin.delivery.deactivatedHint"));
      setDeleting(null);
      router.refresh();
    } catch (e) {
      toast.error(t("admin.delivery.removeFailed"), errorMessage(e));
    } finally {
      setDeleteBusy(false);
    }
  };

  const active = methods.filter((m) => m.isActive).length;

  return (
    <>
      <AdminPageHeader
        title={t("admin.delivery.settingsTitle")}
        crumbs={[{ label: t("admin.delivery.title"), href: "/admin/delivery" }, { label: t("admin.delivery.settingsTitle") }]}
        description={`${t("admin.delivery.methodsOffered", { active, count: methods.length })} · ${t("admin.delivery.pricesIn", { currency, symbol: CURRENCIES[currency].symbol })}`}
        actions={
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            {t("admin.delivery.addMethod")}
          </Button>
        }
      />

      {methods.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-paper px-6 py-16 text-center">
          <Truck className="h-8 w-8 text-ink-muted" aria-hidden="true" />
          <p className="mt-3 font-semibold text-ink">{t("admin.delivery.emptyTitle")}</p>
          <p className="mt-1 max-w-md text-sm text-ink-muted">{t("admin.delivery.emptyText")}</p>
          <Button size="sm" className="mt-4" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            {t("admin.delivery.addMethod")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {methods.map((m) => (
            <MethodCard key={m.id} method={m} money={money} onEdit={() => setEditing(m)} onDelete={() => setDeleting(m)} />
          ))}
        </div>
      )}

      {editing && (
        <MethodForm
          key={editing === "new" ? "new" : editing.id}
          method={editing === "new" ? null : editing}
          initial={editing === "new" ? newDraft(nextSort) : toDraft(editing)}
          currency={currency}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Mounted only while open: a closed Modal <dialog> still covers the page. */}
      {deleting && (
        <ConfirmDialog
          open
          onClose={() => setDeleting(null)}
          onConfirm={remove}
          loading={deleteBusy}
          title={t("admin.delivery.removeTitle", { name: deleting.name })}
          confirmLabel={deleting.orderCount > 0 ? t("admin.delivery.deactivate") : t("admin.common.delete")}
          description={
            <>
              <p>{t("admin.delivery.removeText")}</p>
              <p className="mt-3 font-medium text-ink">
                {deleting.orderCount > 0 ? t("admin.delivery.removeUsed", { count: deleting.orderCount }) : t("admin.delivery.removeUnused")}
              </p>
            </>
          }
        />
      )}
    </>
  );
}

function MethodCard({ method: m, money, onEdit, onDelete }: { method: AdminDeliveryMethod; money: (v: number) => string; onEdit: () => void; onDelete: () => void }) {
  const t = useT();
  const f = useFormat();
  const delivery = m.type === "delivery";
  const days = m.availableWeekdays.length === 7 ? t("admin.delivery.everyDay") : m.availableWeekdays.map((d) => weekdayName(f, d)).join(", ");
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border bg-paper", m.isActive ? "border-line" : "border-dashed border-line-strong")}>
      <div className="flex items-start gap-4 border-b border-line px-5 py-4">
        <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", m.isActive ? "bg-brand-50 text-brand" : "bg-cream text-ink-muted")}>
          {delivery ? <Truck className="h-5 w-5" aria-hidden="true" /> : <Store className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-sans text-[16px] font-semibold tracking-normal text-ink">{m.name}</h2>
            <Badge tone={delivery ? "brand" : "sage"}>{delivery ? t("admin.delivery.typeDelivery") : t("admin.delivery.typePickup")}</Badge>
            {!m.isActive && <Badge tone="neutral">{t("admin.delivery.inactive")}</Badge>}
          </div>
          {m.description && <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{m.description}</p>}
        </div>
      </div>

      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-[13px] sm:grid-cols-3">
        <Fact label={t("admin.delivery.fact.fee")}>{m.fee === 0 ? t("common.free") : money(m.fee)}</Fact>
        <Fact label={t("admin.delivery.fact.freeOver")}>{m.freeOverAmount === null ? "—" : money(m.freeOverAmount)}</Fact>
        <Fact label={t("admin.delivery.fact.minOrder")}>{m.minOrderAmount === 0 ? t("admin.delivery.fact.none") : money(m.minOrderAmount)}</Fact>
        <Fact label={t("admin.delivery.fact.leadTime")}>{formatLeadTime(t, m.leadTimeMinutes)}</Fact>
        <Fact label={t("admin.delivery.fact.bookAhead")}>{m.maxDaysAhead === 0 ? t("admin.delivery.fact.sameDay") : t("admin.delivery.fact.upToDays", { count: m.maxDaysAhead })}</Fact>
        <Fact label={t("admin.delivery.fact.sortOrder")}>{m.sortOrder}</Fact>
      </dl>

      <div className="space-y-2.5 border-t border-line px-5 py-4 text-[13px] text-ink-soft">
        <p className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" /> {days}
        </p>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
          {m.timeWindows.length === 0 ? (
            <span>{t("admin.delivery.anyTimeOfDay")}</span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {m.timeWindows.map((w) => (
                <span key={`${w.start}-${w.end}-${w.label}`} className="rounded-full bg-cream px-2 py-0.5 text-[12px] text-ink tabular">
                  {w.label.includes(w.start) ? w.label : `${w.label} · ${w.start}–${w.end}`}
                </span>
              ))}
            </span>
          )}
        </div>
        {delivery ? (
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
            <span className="min-w-0">
              {m.city ? <span className="font-medium text-ink">{t("admin.delivery.cityOnly", { city: m.city })} </span> : null}
              {m.zones.length === 0
                ? t("admin.delivery.anyArea")
                : `${t("admin.delivery.areaCount", { count: m.zones.length })}: ${m.zones
                    .slice(0, 6)
                    .map((z) => (z.fee === null ? z.name : `${z.name} (${money(z.fee)})`))
                    .join(", ")}${m.zones.length > 6 ? `, ${t("admin.delivery.moreAreas", { count: m.zones.length - 6 })}` : ""}`}
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
            <span>{m.pickupAddress || t("admin.delivery.noPickupAddress")}</span>
          </p>
        )}
        <p className="text-ink-muted">
          {m.estimatedTime ? t("admin.delivery.etaShown", { eta: m.estimatedTime }) : t("admin.delivery.noEta")}
          {delivery ? ` · ${m.requiresCourier ? t("admin.delivery.courierRequired") : t("admin.delivery.courierOptional")}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
        <span className="text-[12.5px] text-ink-muted tabular">
          {t("admin.delivery.usedBy", { count: m.orderCount })}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onDelete} className="hover:!text-danger" aria-label={t("admin.delivery.removeName", { name: m.name })}>
            {m.orderCount > 0 ? t("admin.delivery.deactivate") : t("admin.common.delete")}
          </Button>
          <Button size="sm" variant="outline" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit} aria-label={t("admin.common.editName", { name: m.name })}>
            {t("admin.common.edit")}
          </Button>
        </div>
      </div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink tabular">{children}</dd>
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-4 border-t border-line pt-5 first-of-type:border-t-0 first-of-type:pt-0">
      <legend className="contents">
        <span className="block font-sans text-[15px] font-semibold text-ink">{title}</span>
      </legend>
      {description && <p className="-mt-2 text-[13px] text-ink-muted">{description}</p>}
      {children}
    </fieldset>
  );
}

function MoneyInput({ id, value, onChange, currency, invalid, placeholder }: { id: string; value: string; onChange: (v: string) => void; currency: CurrencyCode; invalid?: boolean; placeholder?: string }) {
  const def = CURRENCIES[currency];
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={def.decimals === 0 ? 1 : 1 / 10 ** def.decimals}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        invalid={invalid}
        className="pr-12 tabular"
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-muted" aria-hidden="true">
        {def.symbol}
      </span>
    </div>
  );
}

function MethodForm({ method, initial, currency, onClose }: { method: AdminDeliveryMethod | null; initial: Draft; currency: CurrencyCode; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const f = useFormat();
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((s) => ({ ...s, [key]: value }));
  const delivery = d.type === "delivery";
  const symbol = CURRENCIES[currency].symbol;

  const setZone = (key: string, patch: Partial<ZoneRow>) => setD((s) => ({ ...s, zones: s.zones.map((z) => (z.key === key ? { ...z, ...patch } : z)) }));
  const setWindow = (key: string, patch: Partial<WindowRow>) => setD((s) => ({ ...s, timeWindows: s.timeWindows.map((w) => (w.key === key ? { ...w, ...patch } : w)) }));
  // Row errors are keyed by index, so they are cleared whenever rows shift.
  const removeZone = (key: string) => {
    setD((s) => ({ ...s, zones: s.zones.filter((z) => z.key !== key) }));
    setFields({});
  };
  const removeWindow = (key: string) => {
    setD((s) => ({ ...s, timeWindows: s.timeWindows.filter((w) => w.key !== key) }));
    setFields({});
  };
  const translated: TranslationField[] = [
    ...translationFields(d.i18n, (fn) => setD((s) => ({ ...s, i18n: fn(s.i18n) })), [
      { key: "name", label: t("admin.common.name"), base: d.name, maxLength: 80 },
      { key: "description", label: t("admin.common.description"), base: d.description, rows: 2, maxLength: 500 },
      ...(delivery
        ? [{ key: "city" as const, label: t("address.city"), base: d.city, maxLength: 80 }]
        : [{ key: "pickupAddress" as const, label: t("admin.delivery.form.pickupAddress"), base: d.pickupAddress, rows: 2, maxLength: 300 }]),
      { key: "estimatedTime", label: t("admin.delivery.form.eta"), base: d.estimatedTime, maxLength: 120 },
    ]),
    ...(delivery
      ? d.zones.map((z, i) => ({
          key: `zones.${i}`,
          label: t("admin.delivery.form.areaNameAria", { n: i + 1 }),
          base: z.name,
          maxLength: 80,
          group: t("admin.delivery.form.where"),
          get: (loc: ContentLocale) => z.tr[loc],
          set: (loc: ContentLocale, v: string | string[]) => setD((s) => ({ ...s, zones: s.zones.map((r) => (r.key === z.key ? { ...r, tr: { ...r.tr, [loc]: String(v) } } : r)) })),
        }))
      : []),
  ];
  const missingDistricts = YEREVAN_DISTRICTS.filter((name) => !d.zones.some((z) => z.name.trim().toLowerCase() === name.toLowerCase()));
  const addDistricts = () =>
    setD((s) => ({
      ...s,
      zones: [...s.zones.filter((z) => z.name.trim() || z.fee.trim()), ...missingDistricts.map((name) => ({ key: rowKey(), name, fee: "", tr: { hy: "", ru: "" } }))],
    }));
  const toggleDay = (day: number) =>
    setD((s) => ({ ...s, availableWeekdays: s.availableWeekdays.includes(day) ? s.availableWeekdays.filter((x) => x !== day) : [...s.availableWeekdays, day] }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local = validate(d, t);
    setFields(local);
    if (Object.keys(local).length > 0) {
      setError(t("admin.common.fixFields"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api<{ id: string }>(method ? `/api/admin/delivery-methods/${method.id}` : "/api/admin/delivery-methods", { method: method ? "PUT" : "POST", body: toPayload(d) });
      toast.success(method ? t("admin.delivery.saved") : t("admin.delivery.added"), d.isActive ? undefined : t("admin.delivery.inactiveHint"));
      router.refresh();
      onClose();
    } catch (err) {
      const errs = fieldErrors(err);
      const unmapped = Object.entries(errs)
        .filter(([k]) => !KNOWN_FIELD.test(k))
        .map(([, v]) => v);
      setFields(errs);
      setError([errorMessage(err), ...unmapped].join(" "));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={method ? t("admin.common.editName", { name: method.name }) : t("admin.delivery.addTitle")}
      description={t("admin.delivery.formHint", { currency, symbol })}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Checkbox id="dm-active" checked={d.isActive} onChange={(e) => set("isActive", e.target.checked)} label={t("admin.delivery.offerAtCheckout")} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="delivery-method-form" loading={busy}>
              {method ? t("admin.common.saveChanges") : t("admin.delivery.addMethod")}
            </Button>
          </div>
        </div>
      }
    >
      <form id="delivery-method-form" onSubmit={submit} noValidate className="space-y-6">
        <FormError message={error} />

        <TranslationTabs fields={translated} errors={fields}>
          <div className="space-y-6">
            <FormSection title={t("admin.delivery.form.basics")}>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("admin.delivery.form.type")}>
                <RadioCard
                  name="dm-type"
                  value="delivery"
                  checked={delivery}
                  onChange={() => set("type", "delivery")}
                  title={t("admin.delivery.typeDelivery")}
                  description={t("admin.delivery.form.typeDeliveryHint")}
                  icon={<Truck className="h-5 w-5" />}
                />
                <RadioCard
                  name="dm-type"
                  value="pickup"
                  checked={!delivery}
                  onChange={() => set("type", "pickup")}
                  title={t("admin.delivery.typePickup")}
                  description={t("admin.delivery.form.typePickupHint")}
                  icon={<Store className="h-5 w-5" />}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <Field id="dm-name" label={t("admin.common.name")} required error={fields.name} hint={t("admin.delivery.form.nameHint")}>
                  <Input
                    id="dm-name"
                    value={d.name}
                    maxLength={80}
                    onChange={(e) => set("name", e.target.value)}
                    invalid={!!fields.name}
                    placeholder={delivery ? t("admin.delivery.form.namePlaceholderDelivery") : t("admin.delivery.form.namePlaceholderPickup")}
                  />
                </Field>
                <Field id="dm-sort" label={t("admin.delivery.fact.sortOrder")} error={fields.sortOrder} hint={t("admin.delivery.form.sortHint")}>
                  <Input id="dm-sort" type="number" inputMode="numeric" step={1} value={d.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} invalid={!!fields.sortOrder} className="tabular" />
                </Field>
              </div>
              <Field id="dm-desc" label={t("admin.common.description")} optional error={fields.description}>
                <Textarea id="dm-desc" rows={2} maxLength={500} value={d.description} onChange={(e) => set("description", e.target.value)} invalid={!!fields.description} />
              </Field>
            </FormSection>

            <FormSection title={t("admin.delivery.form.pricing")}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="dm-fee" label={delivery ? t("admin.delivery.form.deliveryFee") : t("admin.delivery.form.pickupFee")} error={fields.fee} hint={t("admin.delivery.form.feeHint")}>
                  <MoneyInput id="dm-fee" value={d.fee} onChange={(v) => set("fee", v)} currency={currency} invalid={!!fields.fee} />
                </Field>
                <Field id="dm-free" label={t("admin.delivery.fact.freeOver")} optional error={fields.freeOverAmount} hint={t("admin.delivery.form.freeOverHint")}>
                  <MoneyInput id="dm-free" value={d.freeOverAmount} onChange={(v) => set("freeOverAmount", v)} currency={currency} invalid={!!fields.freeOverAmount} />
                </Field>
                <Field id="dm-min" label={t("admin.delivery.fact.minOrder")} error={fields.minOrderAmount} hint={t("admin.delivery.form.minOrderHint")}>
                  <MoneyInput id="dm-min" value={d.minOrderAmount} onChange={(v) => set("minOrderAmount", v)} currency={currency} invalid={!!fields.minOrderAmount} />
                </Field>
              </div>
            </FormSection>

            {delivery ? (
              <FormSection title={t("admin.delivery.form.where")} description={t("admin.delivery.form.whereHint")}>
                <Field id="dm-city" label={t("address.city")} optional error={fields.city} hint={t("admin.delivery.form.cityHint")}>
                  <Input id="dm-city" value={d.city} maxLength={80} onChange={(e) => set("city", e.target.value)} invalid={!!fields.city} placeholder={t("admin.delivery.form.cityPlaceholder")} />
                </Field>
                <div className="space-y-2">
                  {d.zones.length > 0 && (
                    <div className="hidden grid-cols-[minmax(0,1fr)_160px_40px] gap-2 px-1 text-[12px] font-semibold text-ink-muted sm:grid" aria-hidden="true">
                      <span>{t("admin.delivery.form.area")}</span>
                      <span>{t("admin.delivery.form.feeOverride", { symbol })}</span>
                      <span />
                    </div>
                  )}
                  <ul className="space-y-2">
                    {d.zones.map((z, i) => {
                      const nameErr = fields[`zones.${i}.name`];
                      const feeErr = fields[`zones.${i}.fee`];
                      return (
                        <li key={z.key} className="rounded-xl border border-line bg-paper p-2 sm:border-0 sm:bg-transparent sm:p-0">
                          <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 sm:grid-cols-[minmax(0,1fr)_160px_40px]">
                            <Input id={`dm-zone-${z.key}`} aria-label={t("admin.delivery.form.areaNameAria", { n: i + 1 })} value={z.name} maxLength={80} onChange={(e) => setZone(z.key, { name: e.target.value })} invalid={!!nameErr} className="h-11" placeholder={t("admin.delivery.form.areaName")} />
                            <div className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto">
                              <Input
                                aria-label={t("admin.delivery.form.areaFeeAria", { n: i + 1 })}
                                type="number"
                                inputMode="decimal"
                                min={0}
                                value={z.fee}
                                onChange={(e) => setZone(z.key, { fee: e.target.value })}
                                invalid={!!feeErr}
                                className="h-11 tabular"
                                placeholder={t("admin.delivery.form.baseFee")}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeZone(z.key)}
                              className="inline-flex h-11 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-danger"
                              aria-label={t("admin.delivery.form.removeArea", { name: z.name || i + 1 })}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          {(nameErr || feeErr) && (
                            <p className="mt-1 px-1 text-[13px] text-danger" role="alert">
                              {nameErr ?? feeErr}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {fields.zones && <p className="text-[13px] text-danger" role="alert">{fields.zones}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="soft" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setD((s) => ({ ...s, zones: [...s.zones, { key: rowKey(), name: "", fee: "", tr: { hy: "", ru: "" } }] }))}>
                      {t("admin.delivery.form.addArea")}
                    </Button>
                    <Button size="sm" variant="outline" icon={<MapPin className="h-3.5 w-3.5" />} onClick={addDistricts} disabled={missingDistricts.length === 0}>
                      {missingDistricts.length === 0 ? t("admin.delivery.form.districtsAdded") : t("admin.delivery.form.addDistricts", { count: missingDistricts.length })}
                    </Button>
                  </div>
                </div>
                <Checkbox
                  id="dm-courier"
                  checked={d.requiresCourier}
                  onChange={(e) => set("requiresCourier", e.target.checked)}
                  label={t("admin.delivery.form.requiresCourier")}
                  description={t("admin.delivery.form.requiresCourierHint")}
                />
                {fields.requiresCourier && <p className="text-[13px] text-danger" role="alert">{fields.requiresCourier}</p>}
              </FormSection>
            ) : (
              <FormSection title={t("admin.delivery.form.pickupPoint")}>
                <Field id="dm-pickup" label={t("admin.delivery.form.pickupAddress")} optional error={fields.pickupAddress} hint={t("admin.delivery.form.pickupAddressHint")}>
                  <Textarea id="dm-pickup" rows={2} maxLength={300} value={d.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} invalid={!!fields.pickupAddress} />
                </Field>
                <p className="text-[13px] text-ink-muted">{t("admin.delivery.form.pickupNoCourier")}</p>
              </FormSection>
            )}

            <FormSection title={t("admin.delivery.form.scheduling")} description={t("admin.delivery.form.schedulingHint")}>
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink" id="dm-days-label">
                  {t("admin.delivery.form.availableDays")}
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="dm-days-label">
                  {WEEKDAYS.map((day) => {
                    const on = d.availableWeekdays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "h-10 min-w-14 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                          on ? "border-brand bg-brand text-white" : "border-line bg-paper text-ink-soft hover:border-brand hover:text-brand",
                        )}
                      >
                        {weekdayName(f, day)}
                      </button>
                    );
                  })}
                </div>
                {fields.availableWeekdays && (
                  <p className="mt-1.5 text-[13px] text-danger" role="alert">
                    {fields.availableWeekdays}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="dm-lead"
                  label={t("admin.delivery.form.leadTime")}
                  error={fields.leadTimeMinutes}
                  hint={isInt(d.leadTimeMinutes) ? t("admin.delivery.form.leadTimeValue", { lead: formatLeadTime(t, Number(d.leadTimeMinutes)) }) : t("admin.delivery.form.leadTimeHint")}
                >
                  <Input id="dm-lead" type="number" inputMode="numeric" min={0} max={20160} step={5} value={d.leadTimeMinutes} onChange={(e) => set("leadTimeMinutes", e.target.value)} invalid={!!fields.leadTimeMinutes} className="tabular" />
                </Field>
                <Field id="dm-ahead" label={t("admin.delivery.form.daysAhead")} error={fields.maxDaysAhead} hint={t("admin.delivery.form.daysAheadHint")}>
                  <Input id="dm-ahead" type="number" inputMode="numeric" min={0} max={365} step={1} value={d.maxDaysAhead} onChange={(e) => set("maxDaysAhead", e.target.value)} invalid={!!fields.maxDaysAhead} className="tabular" />
                </Field>
              </div>

              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-ink">{t("admin.delivery.form.timeWindows")}</p>
                <p className="text-[13px] text-ink-muted">{t("admin.delivery.form.timeWindowsHint")}</p>
                <ul className="space-y-2">
                  {d.timeWindows.map((w, i) => {
                    const errs = [fields[`timeWindows.${i}.label`], fields[`timeWindows.${i}.start`], fields[`timeWindows.${i}.end`]].filter(Boolean);
                    const badOrder = !!w.start && !!w.end && w.end <= w.start;
                    return (
                      <li key={w.key} className="rounded-xl border border-line bg-paper p-2 sm:border-0 sm:bg-transparent sm:p-0">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_130px_130px_40px]">
                          <Input
                            aria-label={t("admin.delivery.form.windowLabelAria", { n: i + 1 })}
                            value={w.label}
                            maxLength={40}
                            placeholder={t("admin.delivery.form.windowPlaceholder")}
                            onChange={(e) => setWindow(w.key, { label: e.target.value })}
                            invalid={!!fields[`timeWindows.${i}.label`]}
                            className="col-span-2 h-11 sm:col-span-1"
                          />
                          <Input aria-label={t("admin.delivery.form.windowStartAria", { n: i + 1 })} type="time" value={w.start} onChange={(e) => setWindow(w.key, { start: e.target.value })} invalid={!!fields[`timeWindows.${i}.start`]} className="h-11 px-3 tabular" />
                          <Input aria-label={t("admin.delivery.form.windowEndAria", { n: i + 1 })} type="time" value={w.end} onChange={(e) => setWindow(w.key, { end: e.target.value })} invalid={!!fields[`timeWindows.${i}.end`] || badOrder} className="h-11 px-3 tabular" />
                          <button
                            type="button"
                            onClick={() => removeWindow(w.key)}
                            className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-[13px] text-ink-muted hover:bg-cream hover:text-danger sm:col-span-1 sm:h-11 sm:w-10"
                            aria-label={t("admin.delivery.form.removeWindow", { name: w.label || i + 1 })}
                          >
                            <X className="h-4 w-4" />
                            <span className="sm:sr-only">{t("admin.delivery.form.remove")}</span>
                          </button>
                        </div>
                        {(errs.length > 0 || badOrder) && (
                          <p className="mt-1 px-1 text-[13px] text-danger" role="alert">
                            {errs[0] ?? t("admin.delivery.v.windowOrder")}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {fields.timeWindows && <p className="text-[13px] text-danger" role="alert">{fields.timeWindows}</p>}
                <Button
                  size="sm"
                  variant="soft"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  disabled={d.timeWindows.length >= 24}
                  onClick={() => setD((s) => ({ ...s, timeWindows: [...s.timeWindows, { key: rowKey(), label: "", start: "", end: "" }] }))}
                >
                  {t("admin.delivery.form.addWindow")}
                </Button>
              </div>

              <Field
                id="dm-eta"
                label={t("admin.delivery.form.eta")}
                optional
                error={fields.estimatedTime}
                hint={t("admin.delivery.form.etaHint")}
              >
                <Input id="dm-eta" value={d.estimatedTime} maxLength={120} onChange={(e) => set("estimatedTime", e.target.value)} invalid={!!fields.estimatedTime} />
              </Field>
            </FormSection>
          </div>
        </TranslationTabs>
      </form>
    </Modal>
  );
}
