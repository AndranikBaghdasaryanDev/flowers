"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check, Copy, KeyRound, Pencil, ShieldCheck, UserPlus } from "lucide-react";
import { MobileCards, Panel, Table, td, th } from "@/components/admin/ui";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { PERMISSIONS, ROLE_PERMISSIONS, STAFF_ROLES, type Permission, type Role, type StaffRole } from "@/lib/domain/roles";
import { useFormat, useT } from "@/i18n/client";

type StaffMember = { id: string; name: string; email: string; role: StaffRole; status: string; lastLoginAt: string | null };
type T = ReturnType<typeof useT>;

// Dictionary keys: admin.common.roles.<role>, admin.staff.roleSummary.<role>, admin.staff.permission.<area>_<action>.
const roleLabel = (t: T, r: StaffRole | "customer") => t(`admin.common.roles.${r}`);
const roleSummary = (t: T, r: StaffRole) => t(`admin.staff.roleSummary.${r}`);
const permissionLabel = (t: T, p: Permission) => t.dynamic(`admin.staff.permission.${p.replace(":", "_")}`, undefined, p);

const roleTone = (r: StaffRole): BadgeTone => (r === "owner" ? "dark" : r === "admin" ? "brand" : "sage");

export function StaffManager({ initial, currentUserId, currentRole, timeZone }: { initial: StaffMember[]; currentUserId: string; currentRole: Role; timeZone: string }) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const f = useFormat();
  const [staff, setStaff] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const assignable = STAFF_ROLES.filter((r) => r !== "owner" || currentRole === "owner");
  const fmt = (iso: string | null) =>
    iso ? f.dateTime(iso, timeZone, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : t("admin.staff.never");

  const reload = async () => {
    try {
      setStaff(await api<StaffMember[]>("/api/admin/staff"));
    } catch {
      // The list refreshes with the page below.
    }
    router.refresh();
  };

  const statusBadge = (s: string) => <Badge tone={s === "active" ? "success" : "danger"}>{s === "active" ? t("admin.staff.active") : t("admin.staff.disabled")}</Badge>;

  return (
    <div className="space-y-6">
      {issued && <TemporaryPassword email={issued.email} password={issued.password} onDismiss={() => setIssued(null)} />}

      <Panel
        title={t("admin.staff.team")}
        description={t("admin.staff.teamCount", { count: staff.length })}
        padded={false}
        actions={
          <Button size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setAdding(true)}>
            {t("admin.staff.add")}
          </Button>
        }
      >
        <Table>
          <thead>
            <tr>
              <th className={th}>{t("admin.common.name")}</th>
              <th className={th}>{t("admin.staff.roleLabel")}</th>
              <th className={th}>{t("admin.common.status")}</th>
              <th className={th}>{t("admin.staff.lastSignIn")}</th>
              <th className={`${th} text-right`}>
                <span className="sr-only">{t("admin.common.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const self = s.id === currentUserId;
              return (
                <tr key={s.id}>
                  <td className={td}>
                    <p className="font-semibold text-ink">
                      {s.name} {self && <span className="ml-1 text-xs font-medium text-ink-muted">{t("admin.staff.you")}</span>}
                    </p>
                    <p className="text-xs text-ink-muted">{s.email}</p>
                  </td>
                  <td className={td}>
                    <Badge tone={roleTone(s.role)}>{roleLabel(t, s.role)}</Badge>
                  </td>
                  <td className={td}>{statusBadge(s.status)}</td>
                  <td className={`${td} whitespace-nowrap text-ink-soft`}>{fmt(s.lastLoginAt)}</td>
                  <td className={`${td} text-right`}>
                    {!self && (
                      <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(s)} aria-label={t("admin.staff.editAccessFor", { name: s.name })}>
                        {t("admin.common.edit")}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <MobileCards>
          {staff.map((s) => {
            const self = s.id === currentUserId;
            return (
              <li key={s.id} className="flex items-start justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {s.name} {self && <span className="text-xs font-medium text-ink-muted">{t("admin.staff.you")}</span>}
                  </p>
                  <p className="truncate text-sm text-ink-soft">{s.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={roleTone(s.role)}>{roleLabel(t, s.role)}</Badge>
                    {statusBadge(s.status)}
                  </div>
                  <p className="mt-1.5 text-xs text-ink-muted">{t("admin.staff.lastSignInAt", { date: fmt(s.lastLoginAt) })}</p>
                </div>
                {!self && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)} aria-label={t("admin.staff.editAccessFor", { name: s.name })}>
                    {t("admin.common.edit")}
                  </Button>
                )}
              </li>
            );
          })}
        </MobileCards>
      </Panel>

      <Panel title={t("admin.staff.rolesTitle")} description={t("admin.staff.rolesHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {STAFF_ROLES.map((r) => {
            const granted = new Set<Permission>(ROLE_PERMISSIONS[r]);
            return (
              <div key={r} className="rounded-xl border border-line p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
                  <h3 className="font-sans text-[14.5px] font-semibold tracking-normal text-ink">{roleLabel(t, r)}</h3>
                </div>
                <p className="mt-1 text-[13px] text-ink-muted">{roleSummary(t, r)}</p>
                <ul className="mt-3 space-y-1.5" aria-label={t("admin.staff.permissionsOf", { role: roleLabel(t, r) })}>
                  {PERMISSIONS.filter((p) => granted.has(p)).map((p) => (
                    <li key={p} className="flex items-start gap-2 text-[13px] text-ink-soft">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                      {permissionLabel(t, p)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Panel>

      {adding && (
        <AddStaffModal
          roles={assignable}
          onClose={() => setAdding(false)}
          onAdded={(email, password) => {
            setAdding(false);
            if (password) setIssued({ email, password });
            toast.success(t("admin.staff.added"), password ? t("admin.staff.addedHint") : undefined);
            void reload();
          }}
        />
      )}
      {editing && (
        <EditStaffModal
          member={editing}
          roles={assignable}
          onClose={() => setEditing(null)}
          onSaved={(list) => {
            setEditing(null);
            setStaff(list);
            toast.success(t("admin.staff.accessUpdated"), t("admin.staff.accessUpdatedHint"));
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TemporaryPassword({ email, password, onDismiss }: { email: string; password: string; onDismiss: () => void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div role="status" className="rounded-2xl border border-warning/30 bg-warning-50 p-5">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{t("admin.staff.tempPasswordFor", { email })}</p>
          <p className="mt-1 text-sm text-ink-soft">{t("admin.staff.tempPasswordHint")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="break-all rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[15px] font-semibold text-ink">{password}</code>
            <Button size="sm" variant="outline" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={copy}>
              {copied ? t("admin.staff.copied") : t("admin.staff.copy")}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              {t("admin.staff.shared")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddStaffModal({ roles, onClose, onAdded }: { roles: StaffRole[]; onClose: () => void; onAdded: (email: string, temporaryPassword: string | null) => void }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>(roles.includes("order_manager") ? "order_manager" : roles[0]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const res = await api<{ id: string; temporaryPassword: string | null }>("/api/admin/staff", {
        body: { email: email.trim(), name: name.trim(), role, ...(password ? { password } : {}) },
      });
      onAdded(email.trim(), res.temporaryPassword);
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
      title={t("admin.staff.addTitle")}
      description={t("admin.staff.addHint")}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="add-staff-form" loading={busy}>
            {t("admin.staff.addTitle")}
          </Button>
        </div>
      }
    >
      <form id="add-staff-form" onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Field id="st-email" label={t("form.email")} required error={fields.email}>
          <Input id="st-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!fields.email} required />
        </Field>
        <Field id="st-name" label={t("form.fullName")} required error={fields.name}>
          <Input id="st-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} invalid={!!fields.name} required />
        </Field>
        <Field id="st-role" label={t("admin.staff.roleLabel")} required error={fields.role} hint={roleSummary(t, role)}>
          <Select id="st-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)} invalid={!!fields.role}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(t, r)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="st-password"
          label={t("admin.staff.password")}
          optional
          error={fields.password}
          hint={t("admin.staff.passwordHint")}
        >
          <Input id="st-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!fields.password} />
        </Field>
      </form>
    </Modal>
  );
}

function EditStaffModal({ member, roles, onClose, onSaved }: { member: StaffMember; roles: StaffRole[]; onClose: () => void; onSaved: (list: StaffMember[]) => void }) {
  const toast = useToast();
  const t = useT();
  const [role, setRole] = useState<StaffRole | "customer">(member.role);
  const [status, setStatus] = useState<"active" | "disabled">(member.status === "disabled" ? "disabled" : "active");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options: StaffRole[] = roles.includes(member.role) ? roles : [member.role, ...roles];
  const changed = role !== member.role || status !== (member.status === "disabled" ? "disabled" : "active");

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await api<StaffMember[]>(`/api/admin/staff/${member.id}`, { method: "PATCH", body: { role, status } }));
    } catch (e) {
      setError(errorMessage(e));
      toast.error(t("admin.staff.accessNotChanged"), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("admin.staff.editAccessFor", { name: member.name })}
      description={member.email}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant={role === "customer" || status === "disabled" ? "danger" : "primary"} onClick={submit} loading={busy} disabled={!changed}>
            {t("admin.common.saveChanges")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Field id="ed-role" label={t("admin.staff.roleLabel")} hint={role === "customer" ? t("admin.staff.removeAccessHint") : roleSummary(t, role)}>
          <Select id="ed-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole | "customer")}>
            {options.map((r) => (
              <option key={r} value={r}>
                {roleLabel(t, r)}
              </option>
            ))}
            <option value="customer">{t("admin.staff.removeAccess")}</option>
          </Select>
        </Field>
        <Field id="ed-status" label={t("admin.staff.accountStatus")} hint={status === "disabled" ? t("admin.staff.disabledHint") : undefined}>
          <Select id="ed-status" value={status} onChange={(e) => setStatus(e.target.value === "disabled" ? "disabled" : "active")}>
            <option value="active">{t("admin.staff.active")}</option>
            <option value="disabled">{t("admin.staff.disabled")}</option>
          </Select>
        </Field>
        <p className="text-[13px] text-ink-muted">{t("admin.staff.signOutNote")}</p>
      </div>
    </Modal>
  );
}
