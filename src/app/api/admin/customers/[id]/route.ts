import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { assertObjectId, ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { getCustomer, setCustomerStatus } from "@/lib/services/admin";

export const GET = route<{ id: string }>(async (_req, ctx) => {
  await requirePermission("customers:read");
  const { id } = await ctx.params;
  const customer = await getCustomer(id);
  if (!customer) throw ApiError.notFound("Customer not found.");
  return ok(customer);
});

/** Enables or disables a customer account (staff accounts are managed under staff). */
export const PATCH = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("settings:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "Customer");
  const { status } = await readJson(req, z.object({ status: z.enum(["active", "disabled"]) }));
  await setCustomerStatus(id, status, user);
  return ok({ status });
});
