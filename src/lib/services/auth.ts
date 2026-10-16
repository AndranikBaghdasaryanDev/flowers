import "server-only";
import { connectDb } from "@/lib/db";
import { AuthToken, User } from "@/lib/models/user";
import type { Id } from "@/lib/models/_util";
import { ApiError } from "@/lib/api/errors";
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { clientIp, createSession, destroyAllSessions } from "@/lib/auth/session";
import { clearRateLimit, enforceRateLimit, hitRateLimit } from "@/lib/rate-limit";
import { isEmailConfigured } from "@/lib/services/email";
import { runAfterResponse, sendPasswordResetEmail, sendVerificationEmail } from "@/lib/services/notifications";
import { isDuplicateKeyError } from "@/lib/api/handler";
import type { z } from "zod";
import type { loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation";

const RESET_TTL_MS = 60 * 60 * 1000;
const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;

async function issueToken(userId: Id | string, type: "email_verify" | "password_reset", ttl: number): Promise<string> {
  // Only one live token per user and purpose.
  await AuthToken.deleteMany({ user: userId, type, usedAt: null });
  const token = generateToken();
  await AuthToken.create({ user: userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttl) });
  return token;
}

/** Atomically consumes a single-use token. */
async function consumeToken(token: string, type: "email_verify" | "password_reset") {
  return AuthToken.findOneAndUpdate(
    { tokenHash: hashToken(token), type, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { returnDocument: "after" },
  ).lean();
}

export async function registerUser(input: z.infer<typeof registerSchema>) {
  await connectDb();
  const ip = await clientIp();
  await enforceRateLimit(`register:${ip}`, 10, 60 * 60);
  let user;
  try {
    user = await User.create({
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      role: "customer",
      marketingOptIn: input.marketingOptIn,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw ApiError.validation("An account with this email already exists.", {
        email: "An account with this email already exists. Try signing in or resetting your password.",
      });
    }
    throw error;
  }
  const token = await issueToken(user._id, "email_verify", VERIFY_TTL_MS);
  const u = { _id: user._id, email: user.email, name: user.name };
  runAfterResponse(() => sendVerificationEmail(u, token));
  await createSession(String(user._id));
  return { id: String(user._id), emailDeliveryConfigured: isEmailConfigured() };
}

export async function loginUser(input: z.infer<typeof loginSchema>) {
  await connectDb();
  const ip = await clientIp();
  // Throttle per IP and per account to slow brute-force and credential stuffing.
  await enforceRateLimit(`login-ip:${ip}`, 30, 15 * 60);
  const accountKey = `login-acct:${input.email}`;
  const acct = await hitRateLimit(accountKey, 8, 15 * 60);
  if (!acct.allowed) throw ApiError.rateLimited(acct.retryAfter);

  const user = await User.findOne({ email: input.email }).select("+passwordHash status").lean();
  const valid = user
    ? await verifyPassword(input.password, user.passwordHash)
    : (await verifyPassword(input.password, await getDummyHash()), false);
  if (!user || !valid) {
    throw new ApiError(401, "unauthenticated", "The email or password is incorrect.");
  }
  if (user.status !== "active") {
    throw ApiError.forbidden("This account has been disabled. Please contact us.");
  }
  await clearRateLimit(accountKey);
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  await createSession(String(user._id));
  return { id: String(user._id) };
}

/** Always resolves the same way, so it never reveals whether an email is registered. */
export async function requestPasswordReset(email: string) {
  await connectDb();
  const ip = await clientIp();
  await enforceRateLimit(`forgot-ip:${ip}`, 10, 60 * 60);
  const perEmail = await hitRateLimit(`forgot-email:${email}`, 3, 60 * 60);
  if (!perEmail.allowed) return { emailDeliveryConfigured: isEmailConfigured() };
  const user = await User.findOne({ email, status: "active" }).select("email name").lean();
  if (user) {
    const token = await issueToken(user._id, "password_reset", RESET_TTL_MS);
    runAfterResponse(() => sendPasswordResetEmail(user, token));
  }
  return { emailDeliveryConfigured: isEmailConfigured() };
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  await connectDb();
  const ip = await clientIp();
  await enforceRateLimit(`reset-ip:${ip}`, 20, 60 * 60);
  const record = await consumeToken(input.token, "password_reset");
  if (!record) throw ApiError.validation("This reset link is invalid or has expired. Please request a new one.");
  await User.updateOne({ _id: record.user }, { $set: { passwordHash: await hashPassword(input.password) } });
  await destroyAllSessions(String(record.user));
  await createSession(String(record.user));
}

export async function verifyEmail(token: string): Promise<boolean> {
  await connectDb();
  const record = await consumeToken(token, "email_verify");
  if (!record) return false;
  await User.updateOne({ _id: record.user, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() } });
  return true;
}

export async function resendVerification(userId: string) {
  await connectDb();
  await enforceRateLimit(`verify-resend:${userId}`, 3, 60 * 60);
  const user = await User.findById(userId).select("email name emailVerifiedAt").lean();
  if (!user || user.emailVerifiedAt) return { alreadyVerified: true, emailDeliveryConfigured: isEmailConfigured() };
  const token = await issueToken(user._id, "email_verify", VERIFY_TTL_MS);
  runAfterResponse(() => sendVerificationEmail(user, token));
  return { alreadyVerified: false, emailDeliveryConfigured: isEmailConfigured() };
}

export async function changePassword(userId: string, current: string, next: string) {
  await connectDb();
  await enforceRateLimit(`change-pw:${userId}`, 10, 15 * 60);
  const user = await User.findById(userId).select("+passwordHash").lean();
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    throw ApiError.validation("Your current password is incorrect.", { currentPassword: "Your current password is incorrect." });
  }
  await User.updateOne({ _id: userId }, { $set: { passwordHash: await hashPassword(next) } });
  await destroyAllSessions(userId, true);
}
