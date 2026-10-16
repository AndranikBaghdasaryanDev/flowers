import { assertObjectId, ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { staffRoleSchema } from "@/lib/validation";
import { listStaff, updateStaff } from "@/lib/services/admin";

export const PATCH = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("staff:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "staffMember");
  const input = await readJson(req, staffRoleSchema);
  await updateStaff(id, input.role, input.status, user);
  return ok(await listStaff());
});
