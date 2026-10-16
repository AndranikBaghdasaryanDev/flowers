import "server-only";
import mongoose from "mongoose";
import { env } from "@/lib/env";

/**
 * A single cached Mongoose connection per server process.
 * In development the cache lives on globalThis so hot reloads do not open new pools.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForDb = globalThis as unknown as { __florianiDb?: Cache };
const cache: Cache = globalForDb.__florianiDb ?? { conn: null, promise: null };
globalForDb.__florianiDb = cache;

mongoose.set("strictQuery", true);

export class DatabaseUnavailableError extends Error {
  constructor(cause: unknown) {
    super("The database is currently unavailable.");
    this.name = "DatabaseUnavailableError";
    this.cause = cause;
  }
}

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.mongodbUri, {
        dbName: env.mongodbDbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        autoIndex: true,
      })
      .catch((error) => {
        cache.promise = null;
        throw new DatabaseUnavailableError(error);
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

/** Runs `fn` inside a MongoDB transaction (requires a replica set, e.g. Atlas). */
export async function withTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  await connectDb();
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
