import { assertObjectId, ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { galleryInputSchema } from "@/lib/validation";
import { deleteGalleryItem, listGallery, saveGalleryItem } from "@/lib/services/admin";

export const PUT = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("content:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "Gallery item");
  await saveGalleryItem(await readJson(req, galleryInputSchema), user, id);
  return ok(await listGallery(false));
});

export const DELETE = route<{ id: string }>(async (_req, ctx) => {
  const user = await requirePermission("content:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "Gallery item");
  await deleteGalleryItem(id, user);
  return ok(await listGallery(false));
});
