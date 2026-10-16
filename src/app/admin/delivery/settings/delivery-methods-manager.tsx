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
import { CURRENCIES, formatMoney, toMinor, type CurrencyCode } from "@/lib/domain/money";
import { cn } from "@/lib/cn";
import type { AdminDeliveryMethod } from "@/lib/services/admin";
import type { DeliveryMethodInput } from "@/lib/validation";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

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

type ZoneRow = { key: string; name: string; fee: string };
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
    zones: m.zones.map((z) => ({ key: rowKey(), name: z.name, fee: z.fee === null ? "" : String(z.fee) })),
    estimatedTime: m.estimatedTime,
    leadTimeMinutes: String(m.leadTimeMinutes),
    maxDaysAhead: String(m.maxDaysAhead),
    availableWeekdays: [...m.availableWeekdays],
    timeWindows: m.timeWindows.map((w) => ({ key: rowKey(), label: w.label, start: w.start, end: w.end })),
    requiresCourier: m.requiresCourier,
    pickupAddress: m.pickupAddress,
    sortOrder: String(m.sortOrder),
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
  };
}

const isNumber = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));
const isInt = (v: string) => isNumber(v) && Number.isInteger(Number(v));

/** Client-side checks mirroring deliveryMethodInputSchema; keys match the API's field paths. */
function validate(d: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.name.trim().length < 2) e.name = "Enter a name.";
  for (const k of ["fee", "minOrderAmount"] as const) {
    if (!isNumber(d[k]) || Number(d[k]) < 0) e[k] = "Enter an amount (0 or more).";
  }
  if (d.freeOverAmount.trim() !== "" && (!isNumber(d.freeOverAmount) || Number(d.freeOverAmount) < 0)) e.freeOverAmount = "Enter an amount or leave empty.";
  if (!isInt(d.leadTimeMinutes) || Number(d.leadTimeMinutes) < 0 || Number(d.leadTimeMinutes) > 20160) e.leadTimeMinutes = "Whole minutes between 0 and 20160.";
  if (!isInt(d.maxDaysAhead) || Number(d.maxDaysAhead) < 0 || Number(d.maxDaysAhead) > 365) e.maxDaysAhead = "Whole days between 0 and 365.";
  if (!isInt(d.sortOrder) || Math.abs(Number(d.sortOrder)) > 1000) e.sortOrder = "A whole number between -1000 and 1000.";
  if (d.availableWeekdays.length === 0) e.availableWeekdays = "Choose at least one day.";
  if (d.type === "delivery") {
    const seen = new Set<string>();
    d.zones.forEach((z, i) => {
      const name = z.name.trim();
      if (!name) e[`zones.${i}.name`] = "Enter the area name or remove the row.";
      else if (seen.has(name.toLowerCase())) e[`zones.${i}.name`] = "This area is listed twice.";
      seen.add(name.toLowerCase());
      if (z.fee.trim() !== "" && (!isNumber(z.fee) || Number(z.fee) < 0)) e[`zones.${i}.fee`] = "Enter an amount or leave empty.";
    });
  }
  d.timeWindows.forEach((w, i) => {
    if (!w.label.trim()) e[`timeWindows.${i}.label`] = "Enter a label.";
    if (!w.start) e[`timeWindows.${i}.start`] = "Choose a start time.";
    if (!w.end) e[`timeWindows.${i}.end`] = "Choose an end time.";
    else if (w.start && w.end <= w.start) e[`timeWindows.${i}.end`] = "End must be after start.";
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
  };
}

const KNOWN_FIELD =
  /^(name|type|description|fee|freeOverAmount|minOrderAmount|city|zones|estimatedTime|leadTimeMinutes|maxDaysAhead|availableWeekdays|timeWindows|requiresCourier|pickupAddress|sortOrder|zones\.\d+\.(name|fee)|timeWindows\.\d+\.(label|start|end))$/;

function formatLeadTime(min: number) {
  if (min === 0) return "No lead time";
  if (min % 1440 === 0) return `${min / 1440} ${min === 1440 ? "day" : "days"}`;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function DeliveryMethodsManager({ methods, currency }: { methods: AdminDeliveryMethod[]; currency: CurrencyCode }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminDeliveryMethod | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminDeliveryMethod | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const money = (v: number) => formatMoney(toMinor(v, currency), currency);
  const nextSort = methods.reduce((n, m) => Math.max(n, m.sortOrder), 0) + 1;

  const remove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const { result } = await api<{ result: "deleted" | "deactivated" }>(`/api/admin/delivery-methods/${deleting.id}`, { method: "DELETE" });
      if (result === "deleted") toast.success(`“${deleting.name}” deleted`);
      else toast.info(`“${deleting.name}” deactivated`, "It is used by past orders, so it was hidden from checkout instead of deleted.");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      toast.error("Delivery method not removed", errorMessage(e));
    } finally {
      setDeleteBusy(false);
    }
  };

  const active = methods.filter((m) => m.isActive).length;

  return (
    <>
      <AdminPageHeader
        title="Delivery settings"
        crumbs={[{ label: "Delivery", href: "/admin/delivery" }, { label: "Delivery settings" }]}
        description={`${active} of ${methods.length} ${methods.length === 1 ? "method is" : "methods are"} offered at checkout · prices in ${currency} (${CURRENCIES[currency].symbol})`}
        actions={
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            Add method
          </Button>
        }
      />

      {methods.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-paper px-6 py-16 text-center">
          <Truck className="h-8 w-8 text-ink-muted" aria-hidden="true" />
          <p className="mt-3 font-semibold text-ink">No delivery methods yet</p>
          <p className="mt-1 max-w-md text-sm text-ink-muted">Customers can’t check out until at least one delivery or pickup method is active.</p>
          <Button size="sm" className="mt-4" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            Add method
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
          title={`Remove “${deleting.name}”?`}
          confirmLabel={deleting.orderCount > 0 ? "Deactivate" : "Delete"}
          description={
            <>
              <p>Methods used by past orders are deactivated instead of deleted, so order history keeps its delivery details. A deactivated method is hidden from checkout and can be reactivated later.</p>
              <p className="mt-3 font-medium text-ink">
                {deleting.orderCount > 0
                  ? `This method is used by ${deleting.orderCount} ${deleting.orderCount === 1 ? "order" : "orders"}, so it will be deactivated.`
                  : "No orders use this method, so it will be deleted permanently."}
              </p>
            </>
          }
        />
      )}
    </>
  );
}

function MethodCard({ method: m, money, onEdit, onDelete }: { method: AdminDeliveryMethod; money: (v: number) => string; onEdit: () => void; onDelete: () => void }) {
  const delivery = m.type === "delivery";
  const days = m.availableWeekdays.length === 7 ? "Every day" : m.availableWeekdays.map((d) => WEEKDAYS[d]).join(", ");
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border bg-paper", m.isActive ? "border-line" : "border-dashed border-line-strong")}>
      <div className="flex items-start gap-4 border-b border-line px-5 py-4">
        <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", m.isActive ? "bg-brand-50 text-brand" : "bg-cream text-ink-muted")}>
          {delivery ? <Truck className="h-5 w-5" aria-hidden="true" /> : <Store className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-sans text-[16px] font-semibold tracking-normal text-ink">{m.name}</h2>
            <Badge tone={delivery ? "brand" : "sage"}>{delivery ? "Delivery" : "Pickup"}</Badge>
            {!m.isActive && <Badge tone="neutral">Inactive</Badge>}
          </div>
          {m.description && <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{m.description}</p>}
        </div>
      </div>

      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-[13px] sm:grid-cols-3">
        <Fact label="Fee">{m.fee === 0 ? "Free" : money(m.fee)}</Fact>
        <Fact label="Free over">{m.freeOverAmount === null ? "—" : money(m.freeOverAmount)}</Fact>
        <Fact label="Minimum order">{m.minOrderAmount === 0 ? "None" : money(m.minOrderAmount)}</Fact>
        <Fact label="Lead time">{formatLeadTime(m.leadTimeMinutes)}</Fact>
        <Fact label="Book ahead">{m.maxDaysAhead === 0 ? "Same day only" : `Up to ${m.maxDaysAhead} days`}</Fact>
        <Fact label="Sort order">{m.sortOrder}</Fact>
      </dl>

      <div className="space-y-2.5 border-t border-line px-5 py-4 text-[13px] text-ink-soft">
        <p className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" /> {days}
        </p>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
          {m.timeWindows.length === 0 ? (
            <span>Any time of day (no time windows)</span>
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
              {m.city ? <span className="font-medium text-ink">{m.city} only. </span> : null}
              {m.zones.length === 0
                ? "Any area (no area list)"
                : `${m.zones.length} ${m.zones.length === 1 ? "area" : "areas"}: ${m.zones
                    .slice(0, 6)
                    .map((z) => (z.fee === null ? z.name : `${z.name} (${money(z.fee)})`))
                    .join(", ")}${m.zones.length > 6 ? `, +${m.zones.length - 6} more` : ""}`}
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
            <span>{m.pickupAddress || "No pickup address set — the shop address is shown."}</span>
          </p>
        )}
        <p className="text-ink-muted">
          {m.estimatedTime ? `Shown to customers: “${m.estimatedTime}”` : "No delivery time promised to customers"}
          {delivery ? (m.requiresCourier ? " · courier required to dispatch" : " · courier optional") : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
        <span className="text-[12.5px] text-ink-muted tabular">
          Used by {m.orderCount} {m.orderCount === 1 ? "order" : "orders"}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onDelete} className="hover:!text-danger" aria-label={`Remove ${m.name}`}>
            {m.orderCount > 0 ? "Deactivate" : "Delete"}
          </Button>
          <Button size="sm" variant="outline" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit} aria-label={`Edit ${m.name}`}>
            Edit
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
  const missingDistricts = YEREVAN_DISTRICTS.filter((name) => !d.zones.some((z) => z.name.trim().toLowerCase() === name.toLowerCase()));
  const addDistricts = () =>
    setD((s) => ({
      ...s,
      zones: [...s.zones.filter((z) => z.name.trim() || z.fee.trim()), ...missingDistricts.map((name) => ({ key: rowKey(), name, fee: "" }))],
    }));
  const toggleDay = (day: number) =>
    setD((s) => ({ ...s, availableWeekdays: s.availableWeekdays.includes(day) ? s.availableWeekdays.filter((x) => x !== day) : [...s.availableWeekdays, day] }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local = validate(d);
    setFields(local);
    if (Object.keys(local).length > 0) {
      setError("Please check the highlighted fields.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api<{ id: string }>(method ? `/api/admin/delivery-methods/${method.id}` : "/api/admin/delivery-methods", { method: method ? "PUT" : "POST", body: toPayload(d) });
      toast.success(method ? "Delivery method saved" : "Delivery method added", d.isActive ? undefined : "It is inactive, so customers won’t see it at checkout.");
      router.refresh();
      onClose();
    } catch (err) {
      const f = fieldErrors(err);
      const unmapped = Object.entries(f)
        .filter(([k]) => !KNOWN_FIELD.test(k))
        .map(([, v]) => v);
      setFields(f);
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
      title={method ? `Edit ${method.name}` : "Add delivery method"}
      description={`Amounts are in ${currency} (${symbol}). Changes apply to new orders only.`}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Checkbox id="dm-active" checked={d.isActive} onChange={(e) => set("isActive", e.target.checked)} label="Offer at checkout" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="delivery-method-form" loading={busy}>
              {method ? "Save changes" : "Add method"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="delivery-method-form" onSubmit={submit} noValidate className="space-y-6">
        <FormError message={error} />

        <FormSection title="Basics">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Type">
            <RadioCard name="dm-type" value="delivery" checked={delivery} onChange={() => set("type", "delivery")} title="Delivery" description="A courier brings the order to an address." icon={<Truck className="h-5 w-5" />} />
            <RadioCard name="dm-type" value="pickup" checked={!delivery} onChange={() => set("type", "pickup")} title="Pickup" description="The customer collects the order from the shop." icon={<Store className="h-5 w-5" />} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field id="dm-name" label="Name" required error={fields.name} hint="Shown to customers at checkout.">
              <Input id="dm-name" value={d.name} maxLength={80} onChange={(e) => set("name", e.target.value)} invalid={!!fields.name} placeholder={delivery ? "Delivery in Yerevan" : "Pickup from the shop"} />
            </Field>
            <Field id="dm-sort" label="Sort order" error={fields.sortOrder} hint="Lower shows first.">
              <Input id="dm-sort" type="number" inputMode="numeric" step={1} value={d.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} invalid={!!fields.sortOrder} className="tabular" />
            </Field>
          </div>
          <Field id="dm-desc" label="Description" optional error={fields.description}>
            <Textarea id="dm-desc" rows={2} maxLength={500} value={d.description} onChange={(e) => set("description", e.target.value)} invalid={!!fields.description} />
          </Field>
        </FormSection>

        <FormSection title="Pricing">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="dm-fee" label={delivery ? "Delivery fee" : "Pickup fee"} error={fields.fee} hint="0 for free.">
              <MoneyInput id="dm-fee" value={d.fee} onChange={(v) => set("fee", v)} currency={currency} invalid={!!fields.fee} />
            </Field>
            <Field id="dm-free" label="Free over" optional error={fields.freeOverAmount} hint="Empty = always charge the fee.">
              <MoneyInput id="dm-free" value={d.freeOverAmount} onChange={(v) => set("freeOverAmount", v)} currency={currency} invalid={!!fields.freeOverAmount} />
            </Field>
            <Field id="dm-min" label="Minimum order" error={fields.minOrderAmount} hint="0 for no minimum.">
              <MoneyInput id="dm-min" value={d.minOrderAmount} onChange={(v) => set("minOrderAmount", v)} currency={currency} invalid={!!fields.minOrderAmount} />
            </Field>
          </div>
        </FormSection>

        {delivery ? (
          <FormSection title="Where you deliver" description="List the areas customers can choose. An area fee replaces the base delivery fee; leave it empty to use the base fee. With no areas, any address is accepted.">
            <Field id="dm-city" label="City" optional error={fields.city} hint="When set, checkout locks the city to this value.">
              <Input id="dm-city" value={d.city} maxLength={80} onChange={(e) => set("city", e.target.value)} invalid={!!fields.city} placeholder="Yerevan" />
            </Field>
            <div className="space-y-2">
              {d.zones.length > 0 && (
                <div className="hidden grid-cols-[minmax(0,1fr)_160px_40px] gap-2 px-1 text-[12px] font-semibold text-ink-muted sm:grid" aria-hidden="true">
                  <span>Area</span>
                  <span>Fee override ({symbol})</span>
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
                        <Input id={`dm-zone-${z.key}`} aria-label={`Area ${i + 1} name`} value={z.name} maxLength={80} onChange={(e) => setZone(z.key, { name: e.target.value })} invalid={!!nameErr} className="h-11" placeholder="Area name" />
                        <div className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto">
                          <Input
                            aria-label={`Area ${i + 1} fee override`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={z.fee}
                            onChange={(e) => setZone(z.key, { fee: e.target.value })}
                            invalid={!!feeErr}
                            className="h-11 tabular"
                            placeholder="Base fee"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeZone(z.key)}
                          className="inline-flex h-11 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-danger"
                          aria-label={`Remove area ${z.name || i + 1}`}
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
                <Button size="sm" variant="soft" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setD((s) => ({ ...s, zones: [...s.zones, { key: rowKey(), name: "", fee: "" }] }))}>
                  Add area
                </Button>
                <Button size="sm" variant="outline" icon={<MapPin className="h-3.5 w-3.5" />} onClick={addDistricts} disabled={missingDistricts.length === 0}>
                  {missingDistricts.length === 0 ? "All Yerevan districts added" : `Add Yerevan districts (${missingDistricts.length})`}
                </Button>
              </div>
            </div>
            <Checkbox
              id="dm-courier"
              checked={d.requiresCourier}
              onChange={(e) => set("requiresCourier", e.target.checked)}
              label="Requires a courier"
              description="Orders can't be dispatched until a courier is assigned."
            />
            {fields.requiresCourier && <p className="text-[13px] text-danger" role="alert">{fields.requiresCourier}</p>}
          </FormSection>
        ) : (
          <FormSection title="Pickup point">
            <Field id="dm-pickup" label="Pickup address" optional error={fields.pickupAddress} hint="Leave empty to show the shop address from store settings.">
              <Textarea id="dm-pickup" rows={2} maxLength={300} value={d.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} invalid={!!fields.pickupAddress} />
            </Field>
            <p className="text-[13px] text-ink-muted">Pickup orders don’t use couriers.</p>
          </FormSection>
        )}

        <FormSection title="Scheduling" description="Controls which dates and times customers can pick at checkout.">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink" id="dm-days-label">
              Available days
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="dm-days-label">
              {WEEKDAYS.map((label, day) => {
                const on = d.availableWeekdays.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "h-10 min-w-14 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                      on ? "border-brand bg-brand text-white" : "border-line bg-paper text-ink-soft hover:border-brand hover:text-brand",
                    )}
                  >
                    {label}
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
            <Field id="dm-lead" label="Lead time (minutes)" error={fields.leadTimeMinutes} hint={isInt(d.leadTimeMinutes) ? `${formatLeadTime(Number(d.leadTimeMinutes))} between ordering and the earliest slot.` : "Minimum time between ordering and the earliest slot."}>
              <Input id="dm-lead" type="number" inputMode="numeric" min={0} max={20160} step={5} value={d.leadTimeMinutes} onChange={(e) => set("leadTimeMinutes", e.target.value)} invalid={!!fields.leadTimeMinutes} className="tabular" />
            </Field>
            <Field id="dm-ahead" label="Days ahead" error={fields.maxDaysAhead} hint="How far in advance customers can book. 0 = today only.">
              <Input id="dm-ahead" type="number" inputMode="numeric" min={0} max={365} step={1} value={d.maxDaysAhead} onChange={(e) => set("maxDaysAhead", e.target.value)} invalid={!!fields.maxDaysAhead} className="tabular" />
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-ink">Time windows</p>
            <p className="text-[13px] text-ink-muted">Leave empty to accept any time of day. Times are in the store’s time zone.</p>
            <ul className="space-y-2">
              {d.timeWindows.map((w, i) => {
                const errs = [fields[`timeWindows.${i}.label`], fields[`timeWindows.${i}.start`], fields[`timeWindows.${i}.end`]].filter(Boolean);
                const badOrder = !!w.start && !!w.end && w.end <= w.start;
                return (
                  <li key={w.key} className="rounded-xl border border-line bg-paper p-2 sm:border-0 sm:bg-transparent sm:p-0">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_130px_130px_40px]">
                      <Input
                        aria-label={`Window ${i + 1} label`}
                        value={w.label}
                        maxLength={40}
                        placeholder="Morning"
                        onChange={(e) => setWindow(w.key, { label: e.target.value })}
                        invalid={!!fields[`timeWindows.${i}.label`]}
                        className="col-span-2 h-11 sm:col-span-1"
                      />
                      <Input aria-label={`Window ${i + 1} start`} type="time" value={w.start} onChange={(e) => setWindow(w.key, { start: e.target.value })} invalid={!!fields[`timeWindows.${i}.start`]} className="h-11 px-3 tabular" />
                      <Input aria-label={`Window ${i + 1} end`} type="time" value={w.end} onChange={(e) => setWindow(w.key, { end: e.target.value })} invalid={!!fields[`timeWindows.${i}.end`] || badOrder} className="h-11 px-3 tabular" />
                      <button
                        type="button"
                        onClick={() => removeWindow(w.key)}
                        className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-[13px] text-ink-muted hover:bg-cream hover:text-danger sm:col-span-1 sm:h-11 sm:w-10"
                        aria-label={`Remove window ${w.label || i + 1}`}
                      >
                        <X className="h-4 w-4" />
                        <span className="sm:sr-only">Remove</span>
                      </button>
                    </div>
                    {(errs.length > 0 || badOrder) && (
                      <p className="mt-1 px-1 text-[13px] text-danger" role="alert">
                        {errs[0] ?? "End must be after start."}
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
              Add time window
            </Button>
          </div>

          <Field
            id="dm-eta"
            label="Estimated time shown to customers"
            optional
            error={fields.estimatedTime}
            hint="Free text, e.g. “Within 2–3 hours”. Leave empty to avoid promising a time."
          >
            <Input id="dm-eta" value={d.estimatedTime} maxLength={120} onChange={(e) => set("estimatedTime", e.target.value)} invalid={!!fields.estimatedTime} />
          </Field>
        </FormSection>
      </form>
    </Modal>
  );
}
