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
import { PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS, STAFF_ROLES, type Permission, type Role, type StaffRole } from "@/lib/domain/roles";

type StaffMember = { id: string; name: string; email: string; role: StaffRole; status: string; lastLoginAt: string | null };

const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard:read": "See the overview dashboard",
  "orders:read": "View orders",
  "orders:update": "Update order status",
  "orders:cancel": "Cancel orders",
  "payments:manage": "Record payments and refunds",
  "delivery:manage": "Manage delivery and couriers",
  "products:manage": "Manage products",
  "categories:manage": "Manage categories",
  "customers:read": "View customers",
  "analytics:read": "View analytics",
  "content:manage": "Edit site content and gallery",
  "reviews:manage": "Moderate reviews",
  "settings:manage": "Change store settings and customer accounts",
  "staff:manage": "Manage staff and roles",
  "audit:read": "Read the activity log",
};

const ROLE_SUMMARY: Record<StaffRole, string> = {
  owner: "Full access, including adding staff and changing roles.",
  admin: "Runs the whole store except staff management.",
  order_manager: "Handles orders, payments, delivery, catalogue and reviews.",
  delivery_manager: "Sees orders and manages couriers and deliveries.",
};

const roleTone = (r: StaffRole): BadgeTone => (r === "owner" ? "dark" : r === "admin" ? "brand" : "sage");

export function StaffManager({ initial, currentUserId, currentRole, timeZone }: { initial: StaffMember[]; currentUserId: string; currentRole: Role; timeZone: string }) {
  const router = useRouter();
  const toast = useToast();
  const [staff, setStaff] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const assignable = STAFF_ROLES.filter((r) => r !== "owner" || currentRole === "owner");
  const fmt = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "Never";

  const reload = async () => {
    try {
      setStaff(await api<StaffMember[]>("/api/admin/staff"));
    } catch {
      // The list refreshes with the page below.
    }
    router.refresh();
  };

  const statusBadge = (s: string) => <Badge tone={s === "active" ? "success" : "danger"}>{s === "active" ? "Active" : "Disabled"}</Badge>;

  return (
    <div className="space-y-6">
      {issued && <TemporaryPassword email={issued.email} password={issued.password} onDismiss={() => setIssued(null)} />}

      <Panel
        title="Team"
        description={`${staff.length} ${staff.length === 1 ? "person has" : "people have"} admin access`}
        padded={false}
        actions={
          <Button size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setAdding(true)}>
            Add staff
          </Button>
        }
      >
        <Table>
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Role</th>
              <th className={th}>Status</th>
              <th className={th}>Last sign-in</th>
              <th className={`${th} text-right`}>
                <span className="sr-only">Actions</span>
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
                      {s.name} {self && <span className="ml-1 text-xs font-medium text-ink-muted">(you)</span>}
                    </p>
                    <p className="text-xs text-ink-muted">{s.email}</p>
                  </td>
                  <td className={td}>
                    <Badge tone={roleTone(s.role)}>{ROLE_LABELS[s.role]}</Badge>
                  </td>
                  <td className={td}>{statusBadge(s.status)}</td>
                  <td className={`${td} whitespace-nowrap text-ink-soft`}>{fmt(s.lastLoginAt)}</td>
                  <td className={`${td} text-right`}>
                    {!self && (
                      <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(s)} aria-label={`Edit access for ${s.name}`}>
                        Edit
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
                    {s.name} {self && <span className="text-xs font-medium text-ink-muted">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-ink-soft">{s.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={roleTone(s.role)}>{ROLE_LABELS[s.role]}</Badge>
                    {statusBadge(s.status)}
                  </div>
                  <p className="mt-1.5 text-xs text-ink-muted">Last sign-in: {fmt(s.lastLoginAt)}</p>
                </div>
                {!self && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)} aria-label={`Edit access for ${s.name}`}>
                    Edit
                  </Button>
                )}
              </li>
            );
          })}
        </MobileCards>
      </Panel>

      <Panel title="What each role can do" description="Changes to a person’s role sign them out so the new access applies straight away.">
        <div className="grid gap-4 sm:grid-cols-2">
          {STAFF_ROLES.map((r) => {
            const granted = new Set<Permission>(ROLE_PERMISSIONS[r]);
            return (
              <div key={r} className="rounded-xl border border-line p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
                  <h3 className="font-sans text-[14.5px] font-semibold tracking-normal text-ink">{ROLE_LABELS[r]}</h3>
                </div>
                <p className="mt-1 text-[13px] text-ink-muted">{ROLE_SUMMARY[r]}</p>
                <ul className="mt-3 space-y-1.5" aria-label={`${ROLE_LABELS[r]} permissions`}>
                  {PERMISSIONS.filter((p) => granted.has(p)).map((p) => (
                    <li key={p} className="flex items-start gap-2 text-[13px] text-ink-soft">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                      {PERMISSION_LABELS[p]}
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
            toast.success("Staff member added", password ? "Share the temporary password with them securely." : undefined);
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
            toast.success("Access updated", "They have been signed out so the change applies straight away.");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TemporaryPassword({ email, password, onDismiss }: { email: string; password: string; onDismiss: () => void }) {
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
          <p className="font-semibold text-ink">Temporary password for {email}</p>
          <p className="mt-1 text-sm text-ink-soft">
            This is shown only once. Share it with them securely (not in a group chat or public channel) and ask them to change it after their first sign-in.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="break-all rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[15px] font-semibold text-ink">{password}</code>
            <Button size="sm" variant="outline" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              I’ve shared it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddStaffModal({ roles, onClose, onAdded }: { roles: StaffRole[]; onClose: () => void; onAdded: (email: string, temporaryPassword: string | null) => void }) {
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
      title="Add staff member"
      description="If the email already belongs to a customer account, that account is given staff access."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-staff-form" loading={busy}>
            Add staff member
          </Button>
        </div>
      }
    >
      <form id="add-staff-form" onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Field id="st-email" label="Email" required error={fields.email}>
          <Input id="st-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!fields.email} required />
        </Field>
        <Field id="st-name" label="Full name" required error={fields.name}>
          <Input id="st-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} invalid={!!fields.name} required />
        </Field>
        <Field id="st-role" label="Role" required error={fields.role} hint={ROLE_SUMMARY[role]}>
          <Select id="st-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)} invalid={!!fields.role}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="st-password"
          label="Password"
          optional
          error={fields.password}
          hint="Leave empty to generate a temporary password, shown once after saving. At least 8 characters with a letter and a number."
        >
          <Input id="st-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!fields.password} />
        </Field>
      </form>
    </Modal>
  );
}

function EditStaffModal({ member, roles, onClose, onSaved }: { member: StaffMember; roles: StaffRole[]; onClose: () => void; onSaved: (list: StaffMember[]) => void }) {
  const toast = useToast();
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
      toast.error("Access not changed", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit access for ${member.name}`}
      description={member.email}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={role === "customer" || status === "disabled" ? "danger" : "primary"} onClick={submit} loading={busy} disabled={!changed}>
            Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Field id="ed-role" label="Role" hint={role === "customer" ? "They keep their customer account and orders but lose all admin access." : ROLE_SUMMARY[role]}>
          <Select id="ed-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole | "customer")}>
            {options.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
            <option value="customer">Remove staff access</option>
          </Select>
        </Field>
        <Field id="ed-status" label="Account status" hint={status === "disabled" ? "They will be signed out and cannot sign in until enabled again." : undefined}>
          <Select id="ed-status" value={status} onChange={(e) => setStatus(e.target.value === "disabled" ? "disabled" : "active")}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </Select>
        </Field>
        <p className="text-[13px] text-ink-muted">Saving signs this person out of all devices so the new access applies immediately.</p>
      </div>
    </Modal>
  );
}
