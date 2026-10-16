"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Pencil, Phone, Plus, UserRound } from "lucide-react";
import { AdminPageHeader, MobileCards, Panel, Table, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { MOTOR_VEHICLES, VEHICLE_TYPES, type VehicleType } from "@/lib/domain/orders";
import type { CourierDTO } from "@/lib/services/admin";
import { useFormat, useT } from "@/i18n/client";
import { vehicleLabel } from "@/i18n/labels";

type Draft = {
  name: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleModel: string;
  vehicleRegistration: string;
  notes: string;
  isActive: boolean;
};

const EMPTY: Draft = { name: "", phone: "", vehicleType: "car", vehicleModel: "", vehicleRegistration: "", notes: "", isActive: true };

const vehicleSummary = (c: Pick<CourierDTO, "vehicleType" | "vehicleModel" | "vehicleRegistration">) =>
  [c.vehicleType !== "on_foot" ? c.vehicleModel : "", MOTOR_VEHICLES.includes(c.vehicleType) ? c.vehicleRegistration : ""].filter(Boolean).join(" · ");

export function CouriersManager({ couriers }: { couriers: CourierDTO[] }) {
  // `null` = closed, "new" = add form, otherwise the courier being edited.
  const [editing, setEditing] = useState<CourierDTO | "new" | null>(null);
  const t = useT();
  const f = useFormat();
  const activeCount = couriers.filter((c) => c.isActive).length;

  return (
    <>
      <AdminPageHeader
        title={t("admin.couriers.title")}
        crumbs={[{ label: t("admin.delivery.title"), href: "/admin/delivery" }, { label: t("admin.couriers.title") }]}
        description={t("admin.couriers.summary", { active: activeCount, inactive: couriers.length - activeCount })}
        actions={
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            {t("admin.couriers.add")}
          </Button>
        }
      />

      <Panel padded={false} title={t("admin.couriers.yours")} description={t("admin.couriers.yoursHint")}>
        {couriers.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <UserRound className="h-8 w-8 text-ink-muted" aria-hidden="true" />
            <p className="mt-3 font-semibold text-ink">{t("admin.couriers.emptyTitle")}</p>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">{t("admin.couriers.emptyText")}</p>
            <Button size="sm" className="mt-4" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
              {t("admin.couriers.add")}
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th className={th}>{t("admin.common.name")}</th>
                  <th className={th}>{t("form.phone")}</th>
                  <th className={th}>{t("admin.couriers.transport")}</th>
                  <th className={th}>{t("admin.couriers.modelRegistration")}</th>
                  <th className={th}>{t("admin.common.status")}</th>
                  <th className={`${th} text-right`}>{t("admin.couriers.activeDeliveries")}</th>
                  <th className={th}>
                    <span className="sr-only">{t("admin.common.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((c) => (
                  <tr key={c.id} className={c.isActive ? "hover:bg-cream/50" : "bg-cream/30 text-ink-muted"}>
                    <td className={td}>
                      <p className="font-semibold text-ink">{c.name}</p>
                      {c.notes && <p className="max-w-[16rem] truncate text-xs text-ink-muted">{c.notes}</p>}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {c.phone ? (
                        <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="text-ink-soft hover:text-brand">
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className={td}>{vehicleLabel(t, c.vehicleType)}</td>
                    <td className={`${td} text-ink-soft`}>{vehicleSummary(c) || <span className="text-ink-muted">—</span>}</td>
                    <td className={td}>
                      <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? t("admin.couriers.active") : t("admin.couriers.inactive")}</Badge>
                    </td>
                    <td className={`${td} text-right font-semibold tabular`}>{f.number(c.activeDeliveries)}</td>
                    <td className={`${td} text-right`}>
                      <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(c)} aria-label={t("admin.common.editName", { name: c.name })}>
                        {t("admin.common.edit")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <MobileCards>
              {couriers.map((c) => (
                <li key={c.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{c.name}</p>
                      <p className="mt-0.5 text-[13px] text-ink-soft">{[vehicleLabel(t, c.vehicleType), vehicleSummary(c)].filter(Boolean).join(" · ")}</p>
                      {c.phone && (
                        <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-brand">
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {c.phone}
                        </a>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditing(c)} aria-label={t("admin.common.editName", { name: c.name })}>
                      {t("admin.common.edit")}
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? t("admin.couriers.active") : t("admin.couriers.inactive")}</Badge>
                    <span className="text-xs text-ink-muted tabular">
                      {t("admin.couriers.activeDeliveryCount", { count: c.activeDeliveries })}
                    </span>
                  </div>
                </li>
              ))}
            </MobileCards>
          </>
        )}
      </Panel>

      {editing && <CourierForm key={editing === "new" ? "new" : editing.id} courier={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function CourierForm({ courier, onClose }: { courier: CourierDTO | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const [draft, setDraft] = useState<Draft>(
    courier
      ? {
          name: courier.name,
          phone: courier.phone,
          vehicleType: courier.vehicleType,
          vehicleModel: courier.vehicleModel,
          vehicleRegistration: courier.vehicleRegistration,
          notes: courier.notes,
          isActive: courier.isActive,
        }
      : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const motor = MOTOR_VEHICLES.includes(draft.vehicleType);
  const onFoot = draft.vehicleType === "on_foot";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (draft.name.trim().length < 2) {
      setFields({ name: t("admin.couriers.nameRequired") });
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    const body = {
      ...draft,
      vehicleModel: onFoot ? "" : draft.vehicleModel,
      vehicleRegistration: motor ? draft.vehicleRegistration : "",
    };
    try {
      await api<{ id: string }>(courier ? `/api/admin/couriers/${courier.id}` : "/api/admin/couriers", { method: courier ? "PUT" : "POST", body });
      toast.success(courier ? t("admin.couriers.saved") : t("admin.couriers.added"), courier && courier.isActive && !draft.isActive ? t("admin.couriers.deactivatedHint") : undefined);
      router.refresh();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={courier ? t("admin.common.editName", { name: courier.name }) : t("admin.couriers.add")}
      description={t("admin.couriers.formHint")}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="courier-form" loading={busy}>
            {courier ? t("admin.common.saveChanges") : t("admin.couriers.add")}
          </Button>
        </div>
      }
    >
      <form id="courier-form" onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cr-name" label={t("admin.common.name")} required error={fields.name}>
            <Input id="cr-name" value={draft.name} maxLength={120} autoComplete="off" onChange={(e) => set("name", e.target.value)} invalid={!!fields.name} />
          </Field>
          <Field id="cr-phone" label={t("form.phone")} optional error={fields.phone}>
            <Input id="cr-phone" type="tel" inputMode="tel" value={draft.phone} maxLength={32} placeholder="+374 …" onChange={(e) => set("phone", e.target.value)} invalid={!!fields.phone} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cr-vehicle" label={t("admin.couriers.transport")} error={fields.vehicleType}>
            <Select id="cr-vehicle" value={draft.vehicleType} onChange={(e) => set("vehicleType", e.target.value as VehicleType)}>
              {VEHICLE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {vehicleLabel(t, v)}
                </option>
              ))}
            </Select>
          </Field>
          {!onFoot && (
            <Field id="cr-model" label={t("admin.couriers.makeModel")} optional error={fields.vehicleModel}>
              <Input id="cr-model" value={draft.vehicleModel} maxLength={80} placeholder={motor ? t("admin.couriers.makeModelPlaceholder") : ""} onChange={(e) => set("vehicleModel", e.target.value)} invalid={!!fields.vehicleModel} />
            </Field>
          )}
          {motor && (
            <Field id="cr-reg" label={t("admin.couriers.registration")} optional error={fields.vehicleRegistration}>
              <Input id="cr-reg" value={draft.vehicleRegistration} maxLength={20} onChange={(e) => set("vehicleRegistration", e.target.value.toUpperCase())} invalid={!!fields.vehicleRegistration} />
            </Field>
          )}
        </div>
        <Field id="cr-notes" label={t("admin.couriers.notes")} optional hint={t("admin.couriers.notesHint")} error={fields.notes}>
          <Textarea id="cr-notes" rows={2} value={draft.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} invalid={!!fields.notes} />
        </Field>
        <Checkbox
          id="cr-active"
          checked={draft.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          label={t("admin.couriers.active")}
          description={t("admin.couriers.activeHint")}
        />
      </form>
    </Modal>
  );
}
