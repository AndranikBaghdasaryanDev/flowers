import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { galleryInputSchema } from "@/lib/validation";
import { listGallery, saveGalleryItem } from "@/lib/services/admin";

export const GET = route(async () => {
  await requirePermission("content:manage");
  return ok(await listGallery(false));
});

export const POST = route(async (req) => {
  const user = await requirePermission("content:manage");
  await saveGalleryItem(await readJson(req, galleryInputSchema), user);
  return ok(await listGallery(false), { status: 201 });
});
