"use client";

import Image from "next/image";
import { Link, useFormat, useT } from "@/i18n/client";
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
import {
  allowedNextStatuses,
  MOTOR_VEHICLES,
  ORDER_STATUSES,
  permissionForTransition,
  VEHICLE_TYPES,
  type OrderStatus,
  type PaymentStatus,
  type VehicleType,
} from "@/lib/domain/orders";
import type { Formatter } from "@/i18n/format";
import { paymentMethodLabel, paymentStatusLabel, statusLabel, vehicleLabel } from "@/i18n/labels";
import { hasPermission, type Role } from "@/lib/domain/roles";
import { cn } from "@/lib/cn";
import type { StaffOrderDTO } from "@/lib/types";

type Courier = { id: string; name: string; phone: string; vehicleType: VehicleType; vehicleModel: string; vehicleRegistration: string; isActive: boolean };

const fmt = (f: Formatter, iso: string | null, tz: string) =>
  iso ? f.dateTime(iso, tz, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export function OrderManager({ initial, couriers, role, timeZone }: { initial: StaffOrderDTO; couriers: Courier[]; role: Role; timeZone: string }) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const f = useFormat();
  const [order, setOrder] = useState(initial);
  const [stale, setStale] = useState(false);
  const [transition, setTransition] = useState<OrderStatus | null>(null);
  const kind = order.fulfillment.type;
  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(role, p);

  const next = allowedNextStatuses(order.status, kind).filter((s) => can(permissionForTransition(s)));
  const primary = next.find((s) => s !== "cancelled" && s !== "delivery_failed" && s !== "ready") ?? next.find((s) => s === "ready");

  const statusName = (s: OrderStatus) => statusLabel(t, s, kind);
  const actionLabel = (s: OrderStatus) =>
    s === "ready" && order.status === "delivery_failed"
      ? t("admin.orders.action.returnToShop")
      : s === "ready"
        ? kind === "pickup"
          ? t("admin.orders.action.readyPickup")
          : t("admin.orders.action.readyDispatch")
        : s === "completed" && kind === "pickup"
          ? t("admin.orders.action.markPickedUp")
          : s === "out_for_delivery" && order.status === "delivery_failed"
            ? t("admin.orders.action.retryDelivery")
            : t.dynamic(`admin.orders.action.${s}`, undefined, statusName(s));
  // Status e-mails are recorded as `order_<status>`; the other templates have their own labels.
  const templateLabel = (template: string) => {
    const s = template.slice("order_".length);
    if (template.startsWith("order_") && (ORDER_STATUSES as readonly string[]).includes(s)) return statusName(s as OrderStatus);
    return t.dynamic(`admin.orders.template.${template}`, undefined, template.replace(/_/g, " "));
  };

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
      toast.success(to === "paid" ? t("admin.orders.paymentRecorded") : t("admin.orders.paymentRefunded"));
    } catch (e) {
      handleError(e, t("admin.orders.paymentNotUpdated"));
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {stale && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning-50 px-4 py-3 text-sm text-warning">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {t("admin.orders.staleNotice")}</span>
          <Button size="sm" variant="outline" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={reload}>{t("admin.orders.reloadLatest")}</Button>
        </div>
      )}

      {/* Header + actions */}
      <div className="rounded-2xl border border-line bg-paper p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[2rem] leading-none text-ink">{order.orderNumber}</h1>
              <Badge tone={statusTone(order.status)} dot>{statusName(order.status)}</Badge>
              <Badge tone={order.paymentStatus === "paid" ? "success" : order.paymentStatus === "unpaid" ? "warning" : "neutral"}>{paymentStatusLabel(t, order.paymentStatus)}</Badge>
            </div>
            <p className="mt-2 text-[13px] text-ink-muted">
              {t("admin.orders.placedAt", { date: fmt(f, order.createdAt, timeZone) })} · {kind === "pickup" ? t("admin.orders.pickup") : t("admin.orders.delivery")}{" "}
              {f.dateKey(order.deliveryDate, { weekday: "short", day: "numeric", month: "short" })}
              {order.timeWindow ? `, ${order.timeWindow.label}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {next.length === 0 && <span className="text-sm text-ink-muted">{t("admin.orders.noFurtherChanges")}</span>}
            {next.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === primary ? "primary" : s === "cancelled" || s === "delivery_failed" ? "outline" : "soft"}
                className={s === "cancelled" ? "hover:!border-danger hover:!text-danger" : undefined}
                onClick={() => setTransition(s)}
              >
                {actionLabel(s)}
              </Button>
            ))}
          </div>
        </div>
        {order.status === "delivered" && order.paymentStatus !== "paid" && order.total > 0 && (
          <p className="mt-4 rounded-xl bg-info-50 px-4 py-2.5 text-[13px] text-info">{t("admin.orders.recordCashHint")}</p>
        )}
        {order.cancelReason && <p className="mt-4 text-[13px] text-danger">{t("admin.orders.cancelReason", { reason: order.cancelReason })}</p>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Panel title={t("admin.orders.items")} padded={false}>
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                    {i.image ? <Image src={i.image.src} alt="" fill sizes="48px" className="object-cover" /> : <ImageFallback />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{i.name}</p>
                    <p className="text-xs text-ink-muted tabular">{t("admin.orders.unitLine", { quantity: i.quantity, price: f.money(i.unitPrice, order.currency) })}</p>
                  </div>
                  <span className="font-semibold tabular">{f.money(i.lineTotal, order.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">{t("admin.orders.subtotal")}</dt><dd className="tabular">{f.money(order.subtotal, order.currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">{kind === "pickup" ? t("admin.orders.pickup") : t("admin.orders.deliveryFee")}</dt><dd className="tabular">{f.money(order.deliveryFee, order.currency)}</dd></div>
              {order.discountTotal > 0 && <div className="flex justify-between"><dt className="text-ink-soft">{t("admin.orders.discount")}</dt><dd className="tabular">−{f.money(order.discountTotal, order.currency)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>{t("admin.orders.total")}</dt><dd className="tabular">{f.money(order.total, order.currency)}</dd></div>
            </dl>
          </Panel>

          {(order.giftMessage || order.customerComment) && (
            <Panel title={t("admin.orders.fromCustomer")}>
              <div className="space-y-4 text-sm">
                {order.giftMessage && (
                  <div className="flex gap-3">
                    <Gift className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="font-semibold text-ink">{t("admin.orders.giftMessage")}</p>
                      <p className="mt-1 whitespace-pre-line rounded-xl bg-cream px-4 py-3 font-display text-lg italic text-ink">“{order.giftMessage}”</p>
                    </div>
                  </div>
                )}
                {order.customerComment && (
                  <div className="flex gap-3">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="font-semibold text-ink">{t("admin.orders.comment")}</p>
                      <p className="mt-1 whitespace-pre-line text-ink-soft">{order.customerComment}</p>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}

          <NotesPanel order={order} setOrder={setOrder} canMessage={can("orders:update")} timeZone={timeZone} onError={handleError} />

          <Panel title={<span className="flex items-center gap-2"><History className="h-4 w-4" /> {t("admin.orders.statusHistory")}</span>}>
            <ol className="space-y-4 border-l-2 border-line pl-5">
              {[...order.history].reverse().map((h) => (
                <li key={h.id} className="relative text-sm">
                  <span className={cn("absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-paper", h.type === "status" ? "bg-brand" : h.type === "payment" ? "bg-success" : "bg-line-strong")} aria-hidden="true" />
                  <p className="font-semibold text-ink">
                    {h.type === "created"
                      ? t("admin.orders.history.placed")
                      : h.type === "status"
                        ? `${statusName(h.from as OrderStatus)} → ${statusName(h.to as OrderStatus)}`
                        : h.type === "payment"
                          ? t("admin.orders.history.payment", { from: paymentStatusLabel(t, h.from as PaymentStatus), to: paymentStatusLabel(t, h.to as PaymentStatus) })
                          : h.type === "delivery"
                            ? t("admin.orders.history.delivery")
                            : t("admin.orders.messageToCustomer")}
                  </p>
                  {h.note && <p className="mt-0.5 text-ink-soft"><span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{t("admin.orders.history.internal")} · </span>{h.note}</p>}
                  {h.message && <p className="mt-0.5 text-ink-soft"><span className="text-[11px] font-bold uppercase tracking-wider text-brand">{t("admin.orders.history.toCustomer")} · </span>{h.message}</p>}
                  <p className="text-xs text-ink-muted">{h.actorName} · {fmt(f, h.at, timeZone)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title={t("admin.orders.customer")}>
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-ink">
                {order.customer.name}
                {order.userId ? (
                  can("customers:read") ? (
                    <Link href={`/admin/customers/${order.userId}`} className="ml-2 text-[12px] font-semibold text-brand hover:underline">{t("admin.orders.account")}</Link>
                  ) : null
                ) : (
                  <span className="ml-2 text-[12px] font-medium text-ink-muted">{t("admin.orders.guest")}</span>
                )}
              </p>
              <a href={`tel:${order.customer.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-ink-soft hover:text-brand"><Phone className="h-4 w-4" /> {order.customer.phone}</a>
              <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 break-all text-ink-soft hover:text-brand"><Mail className="h-4 w-4 shrink-0" /> {order.customer.email}</a>
              {(order.recipient.name || order.recipient.phone) && (
                <div className="rounded-xl bg-cream px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{t("admin.orders.recipient")}</p>
                  <p className="font-medium text-ink">{order.recipient.name}</p>
                  {order.recipient.phone && <a href={`tel:${order.recipient.phone.replace(/[^\d+]/g, "")}`} className="text-ink-soft hover:text-brand">{order.recipient.phone}</a>}
                </div>
              )}
            </div>
          </Panel>

          <Panel title={<span className="flex items-center gap-2">{kind === "pickup" ? <Store className="h-4 w-4" /> : <Truck className="h-4 w-4" />} {order.fulfillment.methodName}</span>}>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-ink"><CalendarDays className="h-4 w-4 text-brand" /> {f.dateKey(order.deliveryDate, { weekday: "long", day: "numeric", month: "long" })}{order.timeWindow ? `, ${order.timeWindow.label}` : ""}</p>
              {order.address && (
                <div className="flex gap-2 text-ink-soft">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div>
                    <p className="text-ink">{[order.address.street, order.address.building && t("admin.orders.addr.building", { value: order.address.building })].filter(Boolean).join(", ")}</p>
                    <p>{[
                        order.address.apartment && t("admin.orders.addr.apartment", { value: order.address.apartment }),
                        order.address.entrance && t("admin.orders.addr.entrance", { value: order.address.entrance }),
                        order.address.floor && t("admin.orders.addr.floor", { value: order.address.floor }),
                      ].filter(Boolean).join(" · ")}</p>
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

          <Panel title={<span className="flex items-center gap-2"><Banknote className="h-4 w-4" /> {t("admin.orders.payment")}</span>}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-ink-soft">{t("admin.orders.method")}</span><span className="font-medium">{paymentMethodLabel(t, order.paymentMethod)}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">{t("admin.common.status")}</span><span className="font-medium">{paymentStatusLabel(t, order.paymentStatus)}{order.paidAt ? ` · ${fmt(f, order.paidAt, timeZone)}` : ""}</span></div>
              {can("payments:manage") && (
                <div className="flex gap-2 pt-1">
                  {order.paymentStatus === "unpaid" && order.status !== "cancelled" && (
                    <Button size="sm" loading={payBusy} onClick={() => changePayment("paid")}>{t("admin.orders.recordCash")}</Button>
                  )}
                  {order.paymentStatus === "paid" && (
                    <Button size="sm" variant="outline" loading={payBusy} onClick={() => changePayment("refunded")}>{t("admin.orders.markRefunded")}</Button>
                  )}
                </div>
              )}
            </div>
          </Panel>

          {order.notifications.length > 0 && (
            <Panel title={<span className="flex items-center gap-2"><BellRing className="h-4 w-4" /> {t("admin.orders.notifications")}</span>} description={t("admin.orders.notificationsHint")}>
              <ul className="space-y-2 text-[13px]">
                {order.notifications.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-3">
                    <span className="text-ink-soft">{templateLabel(n.template)} · {fmt(f, n.createdAt, timeZone)}</span>
                    <Badge tone={n.status === "sent" ? "success" : n.status === "failed" ? "danger" : n.status === "skipped" ? "neutral" : "info"}>
                      {t.dynamic(`admin.orders.notificationStatus.${n.status}`, undefined, n.status)}
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
            toast.success(t("admin.orders.statusNow", { status: statusName(o.status) }));
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
  const t = useT();
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
      onError(e, t("admin.orders.statusNotChanged"));
    } finally {
      setBusy(false);
    }
  };

  const consequences: Partial<Record<OrderStatus, string>> = {
    cancelled: [
      t("admin.orders.consequence.cancelled"),
      order.paymentStatus === "unpaid" ? t("admin.orders.consequence.cancelledVoid") : order.paymentStatus === "paid" ? t("admin.orders.consequence.cancelledPaid") : "",
      t("admin.orders.consequence.cancelledStock"),
    ]
      .filter(Boolean)
      .join(" "),
    out_for_delivery: order.delivery.courierName ? t("admin.orders.consequence.courier", { name: order.delivery.courierName }) : t("admin.orders.consequence.needsCourier"),
    delivered: t("admin.orders.consequence.delivered"),
    completed: t("admin.orders.consequence.completed"),
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${statusLabel(t, order.status, kind)} → ${statusLabel(t, to, kind)}`}
      description={consequences[to]}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("admin.common.back")}</Button>
          <Button variant={to === "cancelled" ? "danger" : "primary"} onClick={submit} loading={busy}>
            {t("common.confirm")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        {needsReason && (
          <Field id="tr-reason" label={to === "cancelled" ? t("admin.orders.reasonCancel") : t("admin.orders.whatHappened")} required error={fields.reason}>
            <Input id="tr-reason" value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!fields.reason} placeholder={to === "delivery_failed" ? t("admin.orders.reasonFailedPlaceholder") : t("admin.orders.reasonCancelPlaceholder")} />
          </Field>
        )}
        <Field id="tr-msg" label={t("admin.orders.messageToTheCustomer")} optional hint={t("admin.orders.messageHint")}>
          <Textarea id="tr-msg" rows={2} value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <Field id="tr-note" label={t("admin.orders.internalNote")} optional hint={t("admin.orders.internalHint")}>
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
  const t = useT();
  const f = useFormat();
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
      toast.success(t("admin.orders.deliverySaved"));
    } catch (e) {
      onError(e, t("admin.orders.deliveryNotSaved"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Car className="h-4 w-4 text-brand" /> {t("admin.orders.courierVehicle")}</p>
        {order.requiresCourier && !d.courierName && <Badge tone="warning">{t("admin.orders.needsCourier")}</Badge>}
      </div>
      {(d.dispatchedAt || d.deliveredAt || d.attempts > 0) && (
        <dl className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-cream px-4 py-3 text-[12.5px]">
          <dt className="text-ink-muted">{t("admin.orders.assigned")}</dt><dd>{fmt(f, d.assignedAt, timeZone)}</dd>
          <dt className="text-ink-muted">{t("admin.orders.dispatched")}</dt><dd>{fmt(f, d.dispatchedAt, timeZone)}</dd>
          <dt className="text-ink-muted">{t("admin.orders.delivered")}</dt><dd>{fmt(f, d.deliveredAt, timeZone)}</dd>
          <dt className="text-ink-muted">{t("admin.orders.attempts")}</dt><dd>{f.number(d.attempts)}</dd>
          {d.failureReason && (<><dt className="text-ink-muted">{t("admin.orders.lastFailure")}</dt><dd className="text-warning">{d.failureReason}</dd></>)}
        </dl>
      )}
      {canManage && !closed ? (
        <div className="space-y-3">
          <Field id="dl-courier" label={t("admin.orders.courier")}>
            <Select id="dl-courier" value={courierId} onChange={(e) => pickCourier(e.target.value)}>
              <option value="">{t("admin.orders.notAssigned")}</option>
              {couriers.filter((c) => c.isActive || c.id === courierId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
              ))}
            </Select>
          </Field>
          {couriers.length === 0 && (
            <p className="text-[13px] text-ink-muted">
              {t.rich("admin.orders.noCouriers", {
                link: (c) => <Link href="/admin/delivery/couriers" className="font-semibold text-brand hover:underline">{c}</Link>,
              })}
            </p>
          )}
          {courierId && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="dl-vehicle" label={t("admin.orders.transport")}>
                <Select id="dl-vehicle" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>{vehicleLabel(t, v)}</option>
                  ))}
                </Select>
              </Field>
              {vehicleType !== "on_foot" && (
                <Field id="dl-model" label={t("admin.orders.makeModel")} optional>
                  <Input id="dl-model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
                </Field>
              )}
              {motor && (
                <Field id="dl-reg" label={t("admin.orders.registration")} optional>
                  <Input id="dl-reg" value={vehicleRegistration} onChange={(e) => setReg(e.target.value.toUpperCase())} />
                </Field>
              )}
            </div>
          )}
          <Field id="dl-instr" label={t("admin.orders.courierInstructions")} optional>
            <Textarea id="dl-instr" rows={2} value={instructions} maxLength={500} onChange={(e) => setInstructions(e.target.value)} />
          </Field>
          <Button size="sm" onClick={save} loading={busy}>{t("admin.orders.saveDelivery")}</Button>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          {d.courierName ? `${d.courierName}${d.courierPhone ? ` · ${d.courierPhone}` : ""}${d.vehicleType ? ` · ${vehicleLabel(t, d.vehicleType)}` : ""}${d.vehicleModel ? ` ${d.vehicleModel}` : ""}${d.vehicleRegistration ? ` (${d.vehicleRegistration})` : ""}` : t("admin.orders.noCourierAssigned")}
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
  const t = useT();
  const f = useFormat();
  const [kind, setKind] = useState<"internal" | "customer">("internal");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      setOrder(await api<StaffOrderDTO>(`/api/admin/orders/${order.id}/notes`, { body: { kind, body } }));
      setBody("");
      toast.success(kind === "internal" ? t("admin.orders.noteAdded") : t("admin.orders.messageSent"));
    } catch (e) {
      onError(e, t("admin.orders.notSaved"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title={<span className="flex items-center gap-2"><StickyNote className="h-4 w-4" /> {t("admin.orders.notesTitle")}</span>}>
      {order.internalNotes.length > 0 && (
        <ul className="mb-5 space-y-3">
          {order.internalNotes.map((n) => (
            <li key={n.id} className="rounded-xl bg-[#fbf3e2] px-4 py-3 text-sm">
              <p className="whitespace-pre-line text-ink">{n.body}</p>
              <p className="mt-1 text-xs text-ink-muted">{n.authorName} · {fmt(f, n.createdAt, timeZone)} · {t("admin.orders.internalTag")}</p>
            </li>
          ))}
        </ul>
      )}
      <div role="tablist" aria-label={t("admin.orders.noteType")} className="mb-3 inline-flex rounded-full border border-line p-1">
        {(["internal", ...(canMessage ? ["customer"] : [])] as const).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={kind === k}
            onClick={() => setKind(k as "internal" | "customer")}
            className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold", kind === k ? "bg-ink text-ivory" : "text-ink-soft")}
          >
            {k === "internal" ? t("admin.orders.internalNote") : t("admin.orders.messageCustomer")}
          </button>
        ))}
      </div>
      <Textarea rows={3} value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} aria-label={kind === "internal" ? t("admin.orders.internalNote") : t("admin.orders.messageToCustomer")}
        placeholder={kind === "internal" ? t("admin.orders.notePlaceholder") : t("admin.orders.messagePlaceholder")} />
      <Button size="sm" className="mt-3" onClick={submit} loading={busy} disabled={!body.trim()} icon={<Send className="h-3.5 w-3.5" />}>
        {kind === "internal" ? t("admin.orders.addNote") : t("admin.orders.sendMessage")}
      </Button>
    </Panel>
  );
}
