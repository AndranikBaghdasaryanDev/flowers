import "server-only";
import { connectDb } from "@/lib/db";
import { AuthToken, User } from "@/lib/models/user";
import type { Id } from "@/lib/models/_util";
import { ApiError, isDuplicateKeyError } from "@/lib/api/errors";
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { clientIp, createSession, destroyAllSessions } from "@/lib/auth/session";
import { clearRateLimit, enforceRateLimit, hitRateLimit } from "@/lib/rate-limit";
import { isEmailConfigured } from "@/lib/services/email";
import { runAfterResponse, sendPasswordResetEmail, sendVerificationEmail } from "@/lib/services/notifications";
import type { z } from "zod";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
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

/** `locale`: the language the visitor registered in; account emails are sent in it. */
export async function registerUser(input: z.infer<typeof registerSchema>, locale: Locale = DEFAULT_LOCALE) {
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
      locale,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw ApiError.validation("server.errors.emailTaken", {
        email: "server.errors.emailTakenField",
      });
    }
    throw error;
  }
  const token = await issueToken(user._id, "email_verify", VERIFY_TTL_MS);
  const u = { _id: user._id, email: user.email, name: user.name, locale };
  runAfterResponse(() => sendVerificationEmail(u, token));
  await createSession(String(user._id));
  return { id: String(user._id), emailDeliveryConfigured: isEmailConfigured() };
}

/** With a locale, the account's email language follows the language the customer last signed in with. */
export async function loginUser(input: z.infer<typeof loginSchema>, locale?: Locale) {
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
    throw new ApiError(401, "unauthenticated", "server.errors.invalidCredentials");
  }
  if (user.status !== "active") {
    throw ApiError.forbidden("server.errors.accountDisabled");
  }
  await clearRateLimit(accountKey);
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date(), ...(locale ? { locale } : {}) } });
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
  const user = await User.findOne({ email, status: "active" }).select("email name locale").lean();
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
  if (!record) throw ApiError.validation("server.errors.resetLinkInvalid");
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
  const user = await User.findById(userId).select("email name locale emailVerifiedAt").lean();
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
    throw ApiError.validation("server.errors.currentPasswordWrong", { currentPassword: "server.errors.currentPasswordWrong" });
  }
  await User.updateOne({ _id: userId }, { $set: { passwordHash: await hashPassword(next) } });
  await destroyAllSessions(userId, true);
}
