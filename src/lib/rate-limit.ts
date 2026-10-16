import "server-only";
import { connectDb } from "@/lib/db";
import { RateLimit } from "@/lib/models/system";
import { ApiError } from "@/lib/api/errors";

/**
 * Fixed-window rate limiter backed by MongoDB, so limits hold across
 * serverless instances. A TTL index removes expired windows.
 */
export async function hitRateLimit(key: string, limit: number, windowSeconds: number) {
  await connectDb();
  const now = new Date();
  const resetCandidate = new Date(now.getTime() + windowSeconds * 1000);
  const doc = await RateLimit.collection.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          count: { $cond: [{ $or: [{ $not: ["$resetAt"] }, { $lt: ["$resetAt", now] }] }, 1, { $add: ["$count", 1] }] },
          resetAt: { $cond: [{ $or: [{ $not: ["$resetAt"] }, { $lt: ["$resetAt", now] }] }, resetCandidate, "$resetAt"] },
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  );
  const count = (doc?.count as number | undefined) ?? 1;
  const resetAt = (doc?.resetAt as Date | undefined) ?? resetCandidate;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000)),
  };
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const result = await hitRateLimit(key, limit, windowSeconds);
  if (!result.allowed) throw ApiError.rateLimited(result.retryAfter);
}

export async function clearRateLimit(key: string) {
  await connectDb();
  await RateLimit.deleteOne({ key });
}
