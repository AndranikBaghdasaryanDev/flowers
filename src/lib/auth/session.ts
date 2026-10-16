import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { connectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { Session, User } from "@/lib/models/user";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { hasPermission, isStaffRole, type Permission, type Role } from "@/lib/domain/roles";

export const SESSION_COOKIE = "ff_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  isStaff: boolean;
  emailVerified: boolean;
};

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim().slice(0, 64);
}

/** Creates a session for the user and sets the httpOnly cookie. */
export async function createSession(userId: string): Promise<void> {
  await connectDb();
  const token = generateToken();
  const h = await headers();
  await Session.create({
    tokenHash: hashToken(token),
    user: userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    userAgent: (h.get("user-agent") ?? "").slice(0, 300),
    ip: await clientIp(),
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await connectDb();
    await Session.deleteOne({ tokenHash: hashToken(token) });
  }
  jar.delete(SESSION_COOKIE);
}

/** Invalidates every session of a user (e.g. after a password change), except optionally the current one. */
export async function destroyAllSessions(userId: string, exceptCurrent = false): Promise<void> {
  await connectDb();
  const filter: Record<string, unknown> = { user: userId };
  if (exceptCurrent) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) filter.tokenHash = { $ne: hashToken(token) };
  }
  await Session.deleteMany(filter);
}

/**
 * Resolves the signed-in user for this request, or null.
 * Memoised per request with React.cache.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;
  await connectDb();
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  const user = await User.findById(session.user).select("email name phone role status emailVerifiedAt").lean();
  if (!user || user.status !== "active") return null;
  if (Date.now() - new Date(session.lastSeenAt ?? 0).getTime() > TOUCH_INTERVAL_MS) {
    await Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  }
  const role = user.role as Role;
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    phone: user.phone ?? "",
    role,
    isStaff: isStaffRole(role),
    emailVerified: Boolean(user.emailVerifiedAt),
  };
});

export function can(user: SessionUser | null, permission: Permission): boolean {
  return Boolean(user && hasPermission(user.role, permission));
}
