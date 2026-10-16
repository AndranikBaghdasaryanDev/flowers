import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { staffInputSchema } from "@/lib/validation";
import { addStaff, listStaff } from "@/lib/services/admin";

export const GET = route(async () => {
  await requirePermission("staff:manage");
  return ok(await listStaff());
});

/** Only owners (staff:manage) can grant staff access; nobody can grant themselves a role. */
export const POST = route(async (req) => {
  const user = await requirePermission("staff:manage");
  const input = await readJson(req, staffInputSchema);
  return ok(await addStaff(input, user), { status: 201 });
});
