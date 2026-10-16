import { ApiError } from "@/lib/api/errors";
import { ok, requireAnyPermission, route } from "@/lib/api/handler";
import { env } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { storeImage, type MediaPurpose } from "@/lib/services/media";

const PURPOSES: MediaPurpose[] = ["product", "category", "content", "gallery"];

/** Image upload (multipart/form-data: file, purpose, alt). Images are decoded and re-encoded server-side. */
export const POST = route(async (req) => {
  const user = await requireAnyPermission(["products:manage", "categories:manage", "content:manage"]);
  await enforceRateLimit(`upload:${user.id}`, 120, 60 * 60);
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > env.maxUploadBytes + 64 * 1024) {
    throw new ApiError(413, "payload_too_large", `Images must be smaller than ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB.`);
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw ApiError.badRequest("Expected a multipart form upload.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw ApiError.validation("Choose an image to upload.", { file: "Choose an image." });
  const purposeRaw = String(form.get("purpose") ?? "product");
  const purpose = (PURPOSES.includes(purposeRaw as MediaPurpose) ? purposeRaw : "product") as MediaPurpose;
  const alt = String(form.get("alt") ?? "").slice(0, 300);
  const buffer = Buffer.from(await file.arrayBuffer());
  const media = await storeImage(buffer, { filename: file.name || "image", purpose, alt, uploadedBy: user.id });
  return ok(media, { status: 201 });
});
