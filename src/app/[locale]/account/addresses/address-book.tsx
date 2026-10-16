"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useT } from "@/i18n/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";

type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  city: string;
  zone: string;
  street: string;
  building: string;
  apartment: string;
  entrance: string;
  floor: string;
  notes: string;
  isDefault: boolean;
};
type Draft = Omit<Address, "id">;

const blank = (name: string, phone: string): Draft => ({
  label: "",
  recipientName: name,
  phone,
  city: "Yerevan",
  zone: "",
  street: "",
  building: "",
  apartment: "",
  entrance: "",
  floor: "",
  notes: "",
  isDefault: false,
});

export function AddressBook({ initial, defaultName, defaultPhone }: { initial: Address[]; defaultName: string; defaultPhone: string }) {
  const t = useT();
  const toast = useToast();
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<Address | null>(null);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const next = await api<Address[]>(editing.id ? `/api/account/addresses/${editing.id}` : "/api/account/addresses", {
        method: editing.id ? "PUT" : "POST",
        body: editing.draft,
      });
      setList(next);
      setEditing(null);
      toast.success(t("account.addresses.saved"));
    } catch (e) {
      setError(errorMessage(e));
      setFields(fieldErrors(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      setList(await api<Address[]>(`/api/account/addresses/${deleting.id}`, { method: "DELETE" }));
      toast.success(t("account.addresses.removed"));
      setDeleting(null);
    } catch (e) {
      toast.error(t("account.addresses.removeFailed"), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const d = editing?.draft;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e));

  return (
    <>
      {list.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-6 w-6" />}
          title={t("account.addresses.emptyTitle")}
          description={t("account.addresses.emptyText")}
          action={<Button onClick={() => setEditing({ id: null, draft: blank(defaultName, defaultPhone) })} icon={<Plus className="h-4 w-4" />}>{t("account.addresses.add")}</Button>}
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {list.map((a) => (
              <li key={a.id} className="flex flex-col rounded-[1.5rem] border border-line bg-paper p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink">{a.label || a.recipientName}</p>
                  {a.isDefault && <Badge tone="brand">{t("account.addresses.default")}</Badge>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {a.recipientName} · {a.phone}
                  <br />
                  {[a.street, a.building && t("address.buildingShort", { value: a.building }), a.apartment && t("address.aptShort", { value: a.apartment })].filter(Boolean).join(", ")}
                  <br />
                  {[a.zone, a.city].filter(Boolean).join(", ")}
                </p>
                <div className="mt-auto flex gap-2 pt-4">
                  <Button size="sm" variant="outline" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing({ id: a.id, draft: { ...a } })}>
                    {t("account.addresses.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDeleting(a)}>
                    {t("account.addresses.remove")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {list.length < 10 && (
            <Button className="mt-6" variant="soft" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: null, draft: blank(defaultName, defaultPhone) })}>
              {t("account.addresses.add")}
            </Button>
          )}
        </>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? t("account.addresses.editTitle") : t("account.addresses.newTitle")}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={save} loading={busy}>
              {t("account.addresses.save")}
            </Button>
          </div>
        }
      >
        {d && (
          <div className="space-y-4">
            <FormError message={error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ad-label" label={t("account.addresses.label")} optional hint={t("account.addresses.labelHint")}>
                <Input id="ad-label" value={d.label} onChange={(e) => set("label", e.target.value)} />
              </Field>
              <Field id="ad-name" label={t("account.addresses.recipientName")} required error={fields.recipientName}>
                <Input id="ad-name" value={d.recipientName} onChange={(e) => set("recipientName", e.target.value)} invalid={!!fields.recipientName} />
              </Field>
              <Field id="ad-phone" label={t("form.phone")} required error={fields.phone}>
                <Input id="ad-phone" type="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} invalid={!!fields.phone} />
              </Field>
              <Field id="ad-city" label={t("address.city")} required error={fields.city}>
                <Input id="ad-city" value={d.city} onChange={(e) => set("city", e.target.value)} invalid={!!fields.city} />
              </Field>
              <Field id="ad-zone" label={t("address.zone")} optional>
                <Input id="ad-zone" value={d.zone} onChange={(e) => set("zone", e.target.value)} />
              </Field>
              <Field id="ad-street" label={t("address.street")} required error={fields.street}>
                <Input id="ad-street" value={d.street} onChange={(e) => set("street", e.target.value)} invalid={!!fields.street} />
              </Field>
              <Field id="ad-building" label={t("address.building")} optional>
                <Input id="ad-building" value={d.building} onChange={(e) => set("building", e.target.value)} />
              </Field>
              <Field id="ad-apt" label={t("address.apartment")} optional>
                <Input id="ad-apt" value={d.apartment} onChange={(e) => set("apartment", e.target.value)} />
              </Field>
              <Field id="ad-entr" label={t("address.entrance")} optional>
                <Input id="ad-entr" value={d.entrance} onChange={(e) => set("entrance", e.target.value)} />
              </Field>
              <Field id="ad-floor" label={t("address.floor")} optional>
                <Input id="ad-floor" value={d.floor} onChange={(e) => set("floor", e.target.value)} />
              </Field>
              <Field id="ad-notes" label={t("address.directionsShort")} optional className="sm:col-span-2">
                <Input id="ad-notes" value={d.notes} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </div>
            <Checkbox id="ad-default" checked={d.isDefault} onChange={(e) => set("isDefault", e.target.checked)} label={t("account.addresses.useAsDefault")} />
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title={t("account.addresses.removeConfirm")}
        description={deleting ? `${deleting.street}, ${deleting.city}` : ""}
        confirmLabel={t("account.addresses.remove")}
      />
    </>
  );
}
