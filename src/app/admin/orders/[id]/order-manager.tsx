"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Truck,
  Store,
  Gift,
  MessageSquare,
  StickyNote,
  Banknote,
  CalendarDays,
  RefreshCw,
  Send,
  Car,
  History,
  BellRing,
  AlertTriangle,
} from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { statusTone } from "@/components/store/status-tone";
import { ImageFallback } from "@/components/store/image-fallback";
import { api, ApiClientError, errorMessage, fieldErrors } from "@/lib/client/api";
import { formatMoney } from "@/lib/domain/money";
import {
  allowedNextStatuses,
  MOTOR_VEHICLES,
  orderStatusLabel,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  permissionForTransition,
  VEHICLE_LABELS,
  VEHICLE_TYPES,
  type OrderStatus,
  type PaymentStatus,
  type VehicleType,
} from "@/lib/domain/orders";
import { formatDateKey } from "@/lib/domain/time";
import { hasPermission, type Role } from "@/lib/domain/roles";
import { cn } from "@/lib/cn";
import type { StaffOrderDTO } from "@/lib/types";

type Courier = { id: string; name: string; phone: string; vehicleType: VehicleType; vehicleModel: string; vehicleRegistration: string; isActive: boolean };

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm order",
  preparing: "Start preparing",
  ready: "Mark ready",
  out_for_delivery: "Dispatch",
  delivered: "Mark delivered",
  delivery_failed: "Delivery failed",
  completed: "Complete",
  cancelled: "Cancel order",
};

const fmt = (iso: string | null, tz: string) =>
  iso ? new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—";

export function OrderManager({ initial, couriers, role, timeZone }: { initial: StaffOrderDTO; couriers: Courier[]; role: Role; timeZone: string }) {
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState(initial);
  const [stale, setStale] = useState(false);
  const [transition, setTransition] = useState<OrderStatus | null>(null);
  const kind = order.fulfillment.type;
  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(role, p);

  const next = allowedNextStatuses(order.status, kind).filter((s) => can(permissionForTransition(s)));
  const primary = next.find((s) => s !== "cancelled" && s !== "delivery_failed" && s !== "ready") ?? next.find((s) => s === "ready");

  const handleError = (e: unknown, fallback: string) => {
    if (e instanceof ApiClientError && e.meta.reason === "stale_version") setStale(true);
    toast.error(fallback, errorMessage(e));
  };

  const reload = () => {
    router.refresh();
    api<StaffOrderDTO>(`/api/admin/orders/${order.id}`)
      .then((o) => {
        setOrder(o);
        setStale(false);
      })
      .catch(() => undefined);
  };

  /* ------------------------------ payment ------------------------------ */
  const [payBusy, setPayBusy] = useState(false);
  const changePayment = async (to: PaymentStatus) => {
    setPayBusy(true);
    try {
      setOrder(await api<StaffOrderDTO>(`/api/admin/orders/${order.id}/payment`, { body: { to, expectedVersion: order.version } }));
      toast.success(to === "paid" ? "Payment recorded" : "Payment marked as refunded");
    } catch (e) {
      handleError(e, "Payment not updated");
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {stale && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning-50 px-4 py-3 text-sm text-warning">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> This order was changed by someone else.</span>
          <Button size="sm" variant="outline" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={reload}>Reload latest</Button>
        </div>
      )}

      {/* Header + actions */}
      <div className="rounded-2xl border border-line bg-paper p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[2rem] leading-none text-ink">{order.orderNumber}</h1>
              <Badge tone={statusTone(order.status)} dot>{orderStatusLabel(order.status, kind)}</Badge>
              <Badge tone={order.paymentStatus === "paid" ? "success" : order.paymentStatus === "unpaid" ? "warning" : "neutral"}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</Badge>
            </div>
            <p className="mt-2 text-[13px] text-ink-muted">
              Placed {fmt(order.createdAt, timeZone)} · {kind === "pickup" ? "Pickup" : "Delivery"} {formatDateKey(order.deliveryDate, { weekday: "short", day: "numeric", month: "short" })}
              {order.timeWindow ? `, ${order.timeWindow.label}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {next.length === 0 && <span className="text-sm text-ink-muted">No further status changes.</span>}
            {next.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === primary ? "primary" : s === "cancelled" || s === "delivery_failed" ? "outline" : "soft"}
                className={s === "cancelled" ? "hover:!border-danger hover:!text-danger" : undefined}
                onClick={() => setTransition(s)}
              >
                {s === "ready" && order.status === "delivery_failed"
                  ? "Return to shop"
                  : s === "ready"
                    ? kind === "pickup"
                      ? "Ready for pickup"
                      : "Ready for dispatch"
                    : s === "completed" && kind === "pickup"
                      ? "Mark picked up"
                      : s === "out_for_delivery" && order.status === "delivery_failed"
                        ? "Retry delivery"
                        : ACTION_LABEL[s]}
              </Button>
            ))}
          </div>
        </div>
        {order.status === "delivered" && order.paymentStatus !== "paid" && order.total > 0 && (
          <p className="mt-4 rounded-xl bg-info-50 px-4 py-2.5 text-[13px] text-info">Record the cash payment to complete this order.</p>
        )}
        {order.cancelReason && <p className="mt-4 text-[13px] text-danger">Cancellation reason: {order.cancelReason}</p>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Panel title="Items" padded={false}>
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                    {i.image ? <Image src={i.image.src} alt="" fill sizes="48px" className="object-cover" /> : <ImageFallback />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{i.name}</p>
                    <p className="text-xs text-ink-muted tabular">{i.quantity} × {formatMoney(i.unitPrice, order.currency)} (price at order time)</p>
                  </div>
                  <span className="font-semibold tabular">{formatMoney(i.lineTotal, order.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="tabular">{formatMoney(order.subtotal, order.currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">{kind === "pickup" ? "Pickup" : "Delivery fee"}</dt><dd className="tabular">{formatMoney(order.deliveryFee, order.currency)}</dd></div>
              {order.discountTotal > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd className="tabular">−{formatMoney(order.discountTotal, order.currency)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular">{formatMoney(order.total, order.currency)}</dd></div>
            </dl>
          </Panel>

          {(order.giftMessage || order.customerComment) && (
            <Panel title="From the customer">
              <div className="space-y-4 text-sm">
                {order.giftMessage && (
                  <div className="flex gap-3">
                    <Gift className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="font-semibold text-ink">Gift card message</p>
                      <p className="mt-1 whitespace-pre-line rounded-xl bg-cream px-4 py-3 font-display text-lg italic text-ink">“{order.giftMessage}”</p>
                    </div>
                  </div>
                )}
                {order.customerComment && (
                  <div className="flex gap-3">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="font-semibold text-ink">Comment</p>
                      <p className="mt-1 whitespace-pre-line text-ink-soft">{order.customerComment}</p>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}

          <NotesPanel order={order} setOrder={setOrder} canMessage={can("orders:update")} timeZone={timeZone} onError={handleError} />

          <Panel title={<span className="flex items-center gap-2"><History className="h-4 w-4" /> Status history</span>}>
            <ol className="space-y-4 border-l-2 border-line pl-5">
              {[...order.history].reverse().map((h) => (
                <li key={h.id} className="relative text-sm">
                  <span className={cn("absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-paper", h.type === "status" ? "bg-brand" : h.type === "payment" ? "bg-success" : "bg-line-strong")} aria-hidden="true" />
                  <p className="font-semibold text-ink">
                    {h.type === "created"
                      ? "Order placed"
                      : h.type === "status"
                        ? `${orderStatusLabel(h.from as OrderStatus, kind)} → ${orderStatusLabel(h.to as OrderStatus, kind)}`
                        : h.type === "payment"
                          ? `Payment: ${PAYMENT_STATUS_LABELS[h.from as PaymentStatus]} → ${PAYMENT_STATUS_LABELS[h.to as PaymentStatus]}`
                          : h.type === "delivery"
                            ? "Delivery details updated"
                            : "Message to customer"}
                  </p>
                  {h.note && <p className="mt-0.5 text-ink-soft"><span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Internal · </span>{h.note}</p>}
                  {h.message && <p className="mt-0.5 text-ink-soft"><span className="text-[11px] font-bold uppercase tracking-wider text-brand">To customer · </span>{h.message}</p>}
                  <p className="text-xs text-ink-muted">{h.actorName} · {fmt(h.at, timeZone)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title="Customer">
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-ink">
                {order.customer.name}
                {order.userId ? (
                  can("customers:read") ? (
                    <Link href={`/admin/customers/${order.userId}`} className="ml-2 text-[12px] font-semibold text-brand hover:underline">Account</Link>
                  ) : null
                ) : (
                  <span className="ml-2 text-[12px] font-medium text-ink-muted">Guest</span>
                )}
              </p>
              <a href={`tel:${order.customer.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-ink-soft hover:text-brand"><Phone className="h-4 w-4" /> {order.customer.phone}</a>
              <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 break-all text-ink-soft hover:text-brand"><Mail className="h-4 w-4 shrink-0" /> {order.customer.email}</a>
              {(order.recipient.name || order.recipient.phone) && (
                <div className="rounded-xl bg-cream px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Recipient</p>
                  <p className="font-medium text-ink">{order.recipient.name}</p>
                  {order.recipient.phone && <a href={`tel:${order.recipient.phone.replace(/[^\d+]/g, "")}`} className="text-ink-soft hover:text-brand">{order.recipient.phone}</a>}
                </div>
              )}
            </div>
          </Panel>

          <Panel title={<span className="flex items-center gap-2">{kind === "pickup" ? <Store className="h-4 w-4" /> : <Truck className="h-4 w-4" />} {order.fulfillment.methodName}</span>}>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-ink"><CalendarDays className="h-4 w-4 text-brand" /> {formatDateKey(order.deliveryDate, { weekday: "long", day: "numeric", month: "long" })}{order.timeWindow ? `, ${order.timeWindow.label}` : ""}</p>
              {order.address && (
                <div className="flex gap-2 text-ink-soft">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div>
                    <p className="text-ink">{[order.address.street, order.address.building && `bld. ${order.address.building}`].filter(Boolean).join(", ")}</p>
                    <p>{[order.address.apartment && `Apt ${order.address.apartment}`, order.address.entrance && `Entrance ${order.address.entrance}`, order.address.floor && `Floor ${order.address.floor}`].filter(Boolean).join(" · ")}</p>
                    <p>{[order.address.zone, order.address.city].filter(Boolean).join(", ")}</p>
                    {order.address.notes && <p className="mt-1 italic">“{order.address.notes}”</p>}
                  </div>
                </div>
              )}
            </div>
            {kind === "delivery" && (
              <DeliveryForm order={order} setOrder={setOrder} couriers={couriers} canManage={can("delivery:manage")} onError={handleError} timeZone={timeZone} />
            )}
          </Panel>

          <Panel title={<span className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Payment</span>}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-ink-soft">Method</span><span className="font-medium">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Status</span><span className="font-medium">{PAYMENT_STATUS_LABELS[order.paymentStatus]}{order.paidAt ? ` · ${fmt(order.paidAt, timeZone)}` : ""}</span></div>
              {can("payments:manage") && (
                <div className="flex gap-2 pt-1">
                  {order.paymentStatus === "unpaid" && order.status !== "cancelled" && (
                    <Button size="sm" loading={payBusy} onClick={() => changePayment("paid")}>Record cash received</Button>
                  )}
                  {order.paymentStatus === "paid" && (
                    <Button size="sm" variant="outline" loading={payBusy} onClick={() => changePayment("refunded")}>Mark refunded</Button>
                  )}
                </div>
              )}
            </div>
          </Panel>

          {order.notifications.length > 0 && (
            <Panel title={<span className="flex items-center gap-2"><BellRing className="h-4 w-4" /> Customer notifications</span>} description="Emails are only sent when an email provider is configured.">
              <ul className="space-y-2 text-[13px]">
                {order.notifications.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-3">
                    <span className="text-ink-soft">{n.template.replace(/_/g, " ")} · {fmt(n.createdAt, timeZone)}</span>
                    <Badge tone={n.status === "sent" ? "success" : n.status === "failed" ? "danger" : n.status === "skipped" ? "neutral" : "info"}>
                      {n.status === "skipped" ? "Not sent (no provider)" : n.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      {transition && (
        <TransitionDialog
          order={order}
          to={transition}
          onClose={() => setTransition(null)}
          onDone={(o) => {
            setOrder(o);
            setTransition(null);
            toast.success(`Order is now “${orderStatusLabel(o.status, kind)}”`);
          }}
          onError={handleError}
        />
      )}
    </div>
  );
}

function TransitionDialog({
  order,
  to,
  onClose,
  onDone,
  onError,
}: {
  order: StaffOrderDTO;
  to: OrderStatus;
  onClose: () => void;
  onDone: (o: StaffOrderDTO) => void;
  onError: (e: unknown, msg: string) => void;
}) {
  const kind = order.fulfillment.type;
  const needsReason = to === "cancelled" || to === "delivery_failed";
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onDone(await api<StaffOrderDTO>(`/api/admin/orders/${order.id}/status`, { body: { to, expectedVersion: order.version, note, message, reason } }));
    } catch (e) {
      setError(errorMessage(e));
      setFields(fieldErrors(e));
      onError(e, "Status not changed");
    } finally {
      setBusy(false);
    }
  };

  const consequences: Partial<Record<OrderStatus, string>> = {
    cancelled: `The customer will be told the order is cancelled.${order.paymentStatus === "unpaid" ? " Payment will be voided." : order.paymentStatus === "paid" ? " The payment is recorded as paid — refund it separately." : ""} Reserved stock is returned.`,
    out_for_delivery: order.delivery.courierName ? `Courier: ${order.delivery.courierName}.` : "A courier must be assigned first.",
    delivered: "The customer will be told the order was delivered.",
    completed: "This closes the order.",
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${orderStatusLabel(order.status, kind)} → ${orderStatusLabel(to, kind)}`}
      description={consequences[to]}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Back</Button>
          <Button variant={to === "cancelled" ? "danger" : "primary"} onClick={submit} loading={busy}>
            Confirm
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        {needsReason && (
          <Field id="tr-reason" label={to === "cancelled" ? "Reason for cancellation" : "What happened?"} required error={fields.reason}>
            <Input id="tr-reason" value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!fields.reason} placeholder={to === "delivery_failed" ? "Recipient not available, wrong address…" : "Customer request, out of stock…"} />
          </Field>
        )}
        <Field id="tr-msg" label="Message to the customer" optional hint="Shown on the customer's order page and included in the notification.">
          <Textarea id="tr-msg" rows={2} value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <Field id="tr-note" label="Internal note" optional hint="Visible to staff only.">
          <Textarea id="tr-note" rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function DeliveryForm({
  order,
  setOrder,
  couriers,
  canManage,
  onError,
  timeZone,
}: {
  order: StaffOrderDTO;
  setOrder: (o: StaffOrderDTO) => void;
  couriers: Courier[];
  canManage: boolean;
  onError: (e: unknown, msg: string) => void;
  timeZone: string;
}) {
  const toast = useToast();
  const d = order.delivery;
  const [courierId, setCourierId] = useState(d.courierId ?? "");
  const [vehicleType, setVehicleType] = useState<VehicleType | "">(d.vehicleType ?? "");
  const [vehicleModel, setVehicleModel] = useState(d.vehicleModel);
  const [vehicleRegistration, setReg] = useState(d.vehicleRegistration);
  const [instructions, setInstructions] = useState(d.instructions);
  const [busy, setBusy] = useState(false);
  const closed = ["delivered", "completed", "cancelled"].includes(order.status);
  const motor = vehicleType !== "" && MOTOR_VEHICLES.includes(vehicleType);

  const pickCourier = (id: string) => {
    setCourierId(id);
    const c = couriers.find((x) => x.id === id);
    if (c) {
      setVehicleType(c.vehicleType);
      setVehicleModel(c.vehicleModel);
      setReg(c.vehicleRegistration);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      setOrder(
        await api<StaffOrderDTO>(`/api/admin/orders/${order.id}/delivery`, {
          body: { expectedVersion: order.version, courierId: courierId || null, vehicleType: vehicleType || null, vehicleModel, vehicleRegistration: motor ? vehicleRegistration : "", instructions },
        }),
      );
      toast.success("Delivery details saved");
    } catch (e) {
      onError(e, "Delivery details not saved");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Car className="h-4 w-4 text-brand" /> Courier & vehicle</p>
        {order.requiresCourier && !d.courierName && <Badge tone="warning">Needs courier</Badge>}
      </div>
      {(d.dispatchedAt || d.deliveredAt || d.attempts > 0) && (
        <dl className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-cream px-4 py-3 text-[12.5px]">
          <dt className="text-ink-muted">Assigned</dt><dd>{fmt(d.assignedAt, timeZone)}</dd>
          <dt className="text-ink-muted">Dispatched</dt><dd>{fmt(d.dispatchedAt, timeZone)}</dd>
          <dt className="text-ink-muted">Delivered</dt><dd>{fmt(d.deliveredAt, timeZone)}</dd>
          <dt className="text-ink-muted">Attempts</dt><dd>{d.attempts}</dd>
          {d.failureReason && (<><dt className="text-ink-muted">Last failure</dt><dd className="text-warning">{d.failureReason}</dd></>)}
        </dl>
      )}
      {canManage && !closed ? (
        <div className="space-y-3">
          <Field id="dl-courier" label="Courier">
            <Select id="dl-courier" value={courierId} onChange={(e) => pickCourier(e.target.value)}>
              <option value="">Not assigned</option>
              {couriers.filter((c) => c.isActive || c.id === courierId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
              ))}
            </Select>
          </Field>
          {couriers.length === 0 && (
            <p className="text-[13px] text-ink-muted">No couriers yet. <Link href="/admin/delivery/couriers" className="font-semibold text-brand hover:underline">Add couriers</Link></p>
          )}
          {courierId && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="dl-vehicle" label="Transport">
                <Select id="dl-vehicle" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>{VEHICLE_LABELS[v]}</option>
                  ))}
                </Select>
              </Field>
              {vehicleType !== "on_foot" && (
                <Field id="dl-model" label="Make / model" optional>
                  <Input id="dl-model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
                </Field>
              )}
              {motor && (
                <Field id="dl-reg" label="Registration" optional>
                  <Input id="dl-reg" value={vehicleRegistration} onChange={(e) => setReg(e.target.value.toUpperCase())} />
                </Field>
              )}
            </div>
          )}
          <Field id="dl-instr" label="Instructions for the courier" optional>
            <Textarea id="dl-instr" rows={2} value={instructions} maxLength={500} onChange={(e) => setInstructions(e.target.value)} />
          </Field>
          <Button size="sm" onClick={save} loading={busy}>Save delivery details</Button>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          {d.courierName ? `${d.courierName}${d.courierPhone ? ` · ${d.courierPhone}` : ""}${d.vehicleType ? ` · ${VEHICLE_LABELS[d.vehicleType]}` : ""}${d.vehicleModel ? ` ${d.vehicleModel}` : ""}${d.vehicleRegistration ? ` (${d.vehicleRegistration})` : ""}` : "No courier assigned."}
        </p>
      )}
    </div>
  );
}

function NotesPanel({
  order,
  setOrder,
  canMessage,
  timeZone,
  onError,
}: {
  order: StaffOrderDTO;
  setOrder: (o: StaffOrderDTO) => void;
  canMessage: boolean;
  timeZone: string;
  onError: (e: unknown, msg: string) => void;
}) {
  const toast = useToast();
  const [kind, setKind] = useState<"internal" | "customer">("internal");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      setOrder(await api<StaffOrderDTO>(`/api/admin/orders/${order.id}/notes`, { body: { kind, body } }));
      setBody("");
      toast.success(kind === "internal" ? "Internal note added" : "Message sent to customer");
    } catch (e) {
      onError(e, "Not saved");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title={<span className="flex items-center gap-2"><StickyNote className="h-4 w-4" /> Notes & messages</span>}>
      {order.internalNotes.length > 0 && (
        <ul className="mb-5 space-y-3">
          {order.internalNotes.map((n) => (
            <li key={n.id} className="rounded-xl bg-[#fbf3e2] px-4 py-3 text-sm">
              <p className="whitespace-pre-line text-ink">{n.body}</p>
              <p className="mt-1 text-xs text-ink-muted">{n.authorName} · {fmt(n.createdAt, timeZone)} · internal</p>
            </li>
          ))}
        </ul>
      )}
      <div role="tablist" aria-label="Note type" className="mb-3 inline-flex rounded-full border border-line p-1">
        {(["internal", ...(canMessage ? ["customer"] : [])] as const).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={kind === k}
            onClick={() => setKind(k as "internal" | "customer")}
            className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold", kind === k ? "bg-ink text-ivory" : "text-ink-soft")}
          >
            {k === "internal" ? "Internal note" : "Message customer"}
          </button>
        ))}
      </div>
      <Textarea rows={3} value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} aria-label={kind === "internal" ? "Internal note" : "Message to customer"} placeholder={kind === "internal" ? "Only staff can see this." : "The customer will see this on their order page and receive it by email if configured."} />
      <Button size="sm" className="mt-3" onClick={submit} loading={busy} disabled={!body.trim()} icon={<Send className="h-3.5 w-3.5" />}>
        {kind === "internal" ? "Add note" : "Send message"}
      </Button>
    </Panel>
  );
}
