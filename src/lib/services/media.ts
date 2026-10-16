import "server-only";
import mongoose from "mongoose";
import sharp, { type Metadata, type OutputInfo } from "sharp";
import { Readable } from "node:stream";
import { connectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { Media, type MediaDoc } from "@/lib/models/catalog";
import { ApiError } from "@/lib/api/errors";

const BUCKET = "media";
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif", "gif", "tiff"]);
const MAX_INPUT_PIXELS = 50_000_000;
const MAX_EDGE = 2400;

export type MediaPurpose = "product" | "category" | "content" | "gallery";

async function bucket() {
  const conn = await connectDb();
  const db = conn.connection.db;
  if (!db) throw new Error("Database handle unavailable");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET });
}

export type StoredMedia = { id: string; url: string; width: number; height: number; size: number; alt: string };

/**
 * Validates an uploaded image by decoding it (not by trusting the filename or
 * client-declared type), strips metadata, normalises orientation and re-encodes
 * it to WebP. Re-encoding neutralises polyglot/malicious payloads.
 */
export async function storeImage(
  input: Buffer,
  opts: { filename: string; purpose: MediaPurpose; alt?: string; uploadedBy?: string | null; isSample?: boolean },
): Promise<StoredMedia> {
  if (input.length === 0) throw ApiError.validation("The file is empty.");
  if (input.length > env.maxUploadBytes) {
    throw new ApiError(413, "payload_too_large", `Images must be smaller than ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB.`);
  }

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new ApiError(415, "unsupported_media_type", "This file is not a valid image. Use JPEG, PNG, WebP or AVIF.");
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) {
    throw new ApiError(415, "unsupported_media_type", "Unsupported image format. Use JPEG, PNG, WebP or AVIF.");
  }
  if (!meta.width || !meta.height || meta.width < 200 || meta.height < 200) {
    throw ApiError.validation("Images must be at least 200 × 200 pixels.");
  }

  let output: { data: Buffer; info: OutputInfo };
  try {
    output = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, animated: false })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new ApiError(415, "unsupported_media_type", "The image could not be processed.");
  }

  const safeName = opts.filename.replace(/[^\w.\- ]+/g, "").slice(0, 120).replace(/\.[^.]+$/, "") || "image";
  let b;
  try {
    b = await bucket();
  } catch (error) {
    throw new ApiError(503, "service_unavailable", "Image storage is temporarily unavailable. Please try again.", undefined, {
      cause: String(error),
    });
  }

  const fileId = new mongoose.Types.ObjectId();
  await new Promise<void>((resolve, reject) => {
    const upload = b.openUploadStreamWithId(fileId, `${safeName}.webp`, {
      metadata: { contentType: "image/webp", purpose: opts.purpose },
    });
    Readable.from(output.data).pipe(upload).on("error", reject).on("finish", () => resolve());
  });

  try {
    const doc = await Media.create({
      fileId,
      filename: `${safeName}.webp`,
      contentType: "image/webp",
      size: output.info.size,
      width: output.info.width,
      height: output.info.height,
      alt: opts.alt ?? "",
      purpose: opts.purpose,
      uploadedBy: opts.uploadedBy ?? null,
      isSample: opts.isSample ?? false,
    });
    return {
      id: String(doc._id),
      url: `/api/media/${doc._id}`,
      width: doc.width,
      height: doc.height,
      size: doc.size,
      alt: doc.alt ?? "",
    };
  } catch (error) {
    await b.delete(fileId).catch(() => undefined);
    throw error;
  }
}

export async function getMedia(id: string): Promise<MediaDoc | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  return Media.findById(id).lean<MediaDoc>();
}

export async function openMediaStream(fileId: mongoose.Types.ObjectId) {
  const b = await bucket();
  return b.openDownloadStream(fileId);
}

/** Deletes a media record and its file. Callers must make sure nothing references it. */
export async function deleteMedia(id: string): Promise<void> {
  const media = await getMedia(id);
  if (!media) return;
  const b = await bucket();
  await b.delete(media.fileId as mongoose.Types.ObjectId).catch(() => undefined);
  await Media.deleteOne({ _id: media._id });
}

export type MediaInfo = { id: string; url: string; width: number; height: number };

export async function mediaInfoMap(ids: (string | mongoose.Types.ObjectId | null | undefined)[]): Promise<Map<string, MediaInfo>> {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  const map = new Map<string, MediaInfo>();
  if (unique.length === 0) return map;
  await connectDb();
  const docs = await Media.find({ _id: { $in: unique } }).select("width height").lean();
  for (const d of docs) {
    map.set(String(d._id), { id: String(d._id), url: `/api/media/${d._id}`, width: d.width, height: d.height });
  }
  return map;
}
