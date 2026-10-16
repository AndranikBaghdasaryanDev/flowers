/**
 * Central brand configuration.
 *
 * To switch from the temporary text wordmark to the real logo, add the logo file to
 * /public/brand/ and set `logo` below, e.g.
 *   logo: { src: "/brand/floriani-logo.svg", width: 180, height: 48, alt: "Floriani Flowers" }
 * Every place that shows the brand uses <Logo />, so nothing else needs to change.
 */
export const brand = {
  name: "Floriani Flowers",
  shortName: "Floriani",
  wordmark: "FLORIANI",
  descriptor: "flowers",
  description:
    "Floriani Flowers — hand-composed bouquets, flower boxes, compositions and indoor plants with delivery in Yerevan.",
  logo: null as null | { src: string; width: number; height: number; alt: string },
  instagramHandle: "floriani.flowers",
} as const;
