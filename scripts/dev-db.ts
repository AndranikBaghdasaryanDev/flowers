/**
 * Local development database: a single-node MongoDB replica set (transactions need a
 * replica set, just like Atlas) persisted in ./.data/mongo.
 *
 *   npm run db:local          → mongodb://127.0.0.1:27017/?replicaSet=floriani
 *
 * Production uses MongoDB Atlas via MONGODB_URI; this script is for development only.
 */
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { mkdirSync } from "node:fs";
import path from "node:path";

async function main() {
  const dbPath = path.resolve(process.cwd(), ".data/mongo");
  mkdirSync(dbPath, { recursive: true });
  const port = Number(process.env.LOCAL_MONGO_PORT ?? 27017);
  const replSet = await MongoMemoryReplSet.create({
    replSet: { name: "floriani", count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ port, dbPath }],
  });
  await replSet.waitUntilRunning();
  console.log(`\nLocal MongoDB replica set running.\nMONGODB_URI=mongodb://127.0.0.1:${port}/?replicaSet=floriani\n`);
  const stop = async () => {
    await replSet.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
