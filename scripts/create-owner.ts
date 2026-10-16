/**
 * Creates (or promotes) the first owner account. Owners can then add other staff in the admin.
 *
 *   npm run create-owner -- --email owner@example.com --name "Owner Name" [--password "..."]
 *
 * If --password is omitted a strong random password is generated and printed once.
 */
import "./load-env";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/user";
import { hashPassword } from "@/lib/auth/password";
import { emailSchema, passwordSchema } from "@/lib/validation";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = emailSchema.parse(arg("email") ?? process.env.OWNER_EMAIL);
  const name = (arg("name") ?? process.env.OWNER_NAME ?? "Store owner").trim();
  const providedPassword = arg("password") ?? process.env.OWNER_PASSWORD;
  const password = providedPassword ?? `${randomBytes(12).toString("base64url")}7a`;
  passwordSchema.parse(password);

  await connectDb();
  const existing = await User.findOne({ email });
  if (existing) {
    existing.set({ role: "owner", status: "active" });
    if (providedPassword) existing.set({ passwordHash: await hashPassword(password) });
    await existing.save();
    console.log(`Promoted ${email} to owner.${providedPassword ? " Password updated." : ""}`);
  } else {
    await User.create({ email, name, role: "owner", passwordHash: await hashPassword(password), emailVerifiedAt: new Date() });
    console.log(`Created owner account ${email}.`);
    if (!providedPassword) console.log(`Temporary password (shown once): ${password}`);
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
