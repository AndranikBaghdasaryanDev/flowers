/** Public URL of an uploaded media file (served from GridFS by /api/media/[id]). */
export function mediaUrl(mediaId: string): string {
  return `/api/media/${mediaId}`;
}
