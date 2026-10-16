import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/domain/roles";

/** For pages: returns the signed-in user or redirects to sign-in. */
export async function requirePageUser(next: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** For admin pages: requires a staff account (and optionally a permission). */
export async function requireStaffPage(next: string, permission?: Permission): Promise<{ user: SessionUser; allowed: boolean }> {
  const user = await requirePageUser(next);
  if (!user.isStaff) redirect("/account");
  return { user, allowed: permission ? hasPermission(user.role, permission) : true };
}
