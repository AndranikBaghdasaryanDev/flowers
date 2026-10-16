import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { orderNoteSchema } from "@/lib/validation";
import { addOrderNote } from "@/lib/services/orders";

/** kind=internal → staff-only note; kind=customer → message shown to and emailed to the customer. */
export const POST = route<{ id: string }>(async (req, ctx) => {
  const { id } = await ctx.params;
  const input = await readJson(req, orderNoteSchema);
  const user = await requirePermission(input.kind === "internal" ? "orders:read" : "orders:update");
  return ok(await addOrderNote(id, input.kind, input.body, user));
});
