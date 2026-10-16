import "server-only";
import { cache } from "react";
import { connectDb } from "@/lib/db";
import { Settings, type SettingsDoc } from "@/lib/models/content";
import { isCurrencyCode, type CurrencyCode } from "@/lib/domain/money";
import { isValidTimeZone } from "@/lib/domain/time";
import { mediaUrl } from "@/lib/media-url";

/**
 * Neutral fallback copy used only while the owner has not written their own.
 * It makes no factual claims about the business (no history, awards, promises).
 */
export const CONTENT_DEFAULTS = {
  heroEyebrow: "Floriani Flowers · Yerevan",
  heroTitle: "Flowers that say what words cannot",
  heroSubtitle:
    "Hand-composed bouquets and arrangements for birthdays, love, gratitude, apologies and every quiet moment worth marking.",
  storyTitle: "Composed by hand, given with heart",
  storyBody:
    "Every arrangement begins with a feeling you want to share. Our florists choose each stem for its colour, texture and character, then compose it into something that feels personal — for the person receiving it, and for you.\n\nFrom a single statement rose to a lavish composition, each piece is prepared with care and wrapped to be remembered.",
};

export type StoreSettings = {
  storeName: string;
  tagline: string;
  currency: CurrencyCode;
  timeZone: string;
  contact: { phone: string; email: string; whatsapp: string; address: string; hours: string; mapUrl: string };
  social: { instagram: string; facebook: string; telegram: string };
  checkout: {
    guestCheckout: boolean;
    allowCustomerCancel: boolean;
    cashOnDelivery: boolean;
    cashOnPickup: boolean;
    maxQuantityPerItem: number;
    orderNotice: string;
  };
  content: {
    announcement: string;
    heroEyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    heroImageId: string | null;
    heroImage: string | null;
    heroImageAlt: string;
    storyTitle: string;
    storyBody: string;
    storyImageId: string | null;
    storyImage: string | null;
    storyImageAlt: string;
    aboutBody: string;
    deliveryInfo: string;
  };
  legal: { privacy: string; terms: string; returns: string; reviewedAt: string | null };
  updatedAt: string | null;
};

async function loadSettingsDoc(): Promise<SettingsDoc> {
  await connectDb();
  const doc = await Settings.findOneAndUpdate(
    { _id: "store" },
    { $setOnInsert: { _id: "store" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean<SettingsDoc>();
  return doc!;
}

export function serializeSettings(doc: SettingsDoc): StoreSettings {
  const c = doc.content ?? ({} as SettingsDoc["content"]);
  const heroId = c?.heroImage ? String(c.heroImage) : null;
  const storyId = c?.storyImage ? String(c.storyImage) : null;
  const currency = isCurrencyCode(doc.currency ?? "") ? (doc.currency as CurrencyCode) : "AMD";
  const tz = doc.timeZone && isValidTimeZone(doc.timeZone) ? doc.timeZone : "Asia/Yerevan";
  return {
    storeName: doc.storeName ?? "Floriani Flowers",
    tagline: doc.tagline ?? "",
    currency,
    timeZone: tz,
    contact: {
      phone: doc.contact?.phone ?? "",
      email: doc.contact?.email ?? "",
      whatsapp: doc.contact?.whatsapp ?? "",
      address: doc.contact?.address ?? "",
      hours: doc.contact?.hours ?? "",
      mapUrl: doc.contact?.mapUrl ?? "",
    },
    social: {
      instagram: doc.social?.instagram ?? "",
      facebook: doc.social?.facebook ?? "",
      telegram: doc.social?.telegram ?? "",
    },
    checkout: {
      guestCheckout: doc.checkout?.guestCheckout ?? true,
      allowCustomerCancel: doc.checkout?.allowCustomerCancel ?? true,
      cashOnDelivery: doc.checkout?.cashOnDelivery ?? true,
      cashOnPickup: doc.checkout?.cashOnPickup ?? true,
      maxQuantityPerItem: doc.checkout?.maxQuantityPerItem ?? 20,
      orderNotice: doc.checkout?.orderNotice ?? "",
    },
    content: {
      announcement: c?.announcement ?? "",
      heroEyebrow: c?.heroEyebrow || CONTENT_DEFAULTS.heroEyebrow,
      heroTitle: c?.heroTitle || CONTENT_DEFAULTS.heroTitle,
      heroSubtitle: c?.heroSubtitle || CONTENT_DEFAULTS.heroSubtitle,
      heroImageId: heroId,
      heroImage: heroId ? mediaUrl(heroId) : null,
      heroImageAlt: c?.heroImageAlt || "A hand-composed Floriani bouquet",
      storyTitle: c?.storyTitle || CONTENT_DEFAULTS.storyTitle,
      storyBody: c?.storyBody || CONTENT_DEFAULTS.storyBody,
      storyImageId: storyId,
      storyImage: storyId ? mediaUrl(storyId) : null,
      storyImageAlt: c?.storyImageAlt || "A florist composing a bouquet",
      aboutBody: c?.aboutBody ?? "",
      deliveryInfo: c?.deliveryInfo ?? "",
    },
    legal: {
      privacy: doc.legal?.privacy ?? "",
      terms: doc.legal?.terms ?? "",
      returns: doc.legal?.returns ?? "",
      reviewedAt: doc.legal?.reviewedAt ? new Date(doc.legal.reviewedAt).toISOString() : null,
    },
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

/** Store settings for the current request (memoised per request). */
export const getSettings = cache(async (): Promise<StoreSettings> => serializeSettings(await loadSettingsDoc()));

/** Settings without React request memoisation (scripts, background work). */
export async function loadSettings(): Promise<StoreSettings> {
  return serializeSettings(await loadSettingsDoc());
}
