import { NextResponse, connection, type NextRequest } from "next/server";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import { getMedia, openMediaStream } from "@/lib/services/media";
import { logger } from "@/lib/logger";

/** Streams an uploaded image from GridFS. Media ids are immutable, so responses cache forever. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/media/[id]">) {
  await connection();
  const { id } = await ctx.params;
  try {
    const media = await getMedia(id);
    if (!media) return new NextResponse("Not found", { status: 404 });
    const etag = `"${media._id}"`;
    if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    const stream = await openMediaStream(media.fileId as mongoose.Types.ObjectId);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": media.contentType,
        "Content-Length": String(media.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
        ETag: etag,
      },
    });
  } catch (error) {
    logger.error("media stream failed", { id, error });
    return new NextResponse("Image temporarily unavailable", { status: 503 });
  }
}
