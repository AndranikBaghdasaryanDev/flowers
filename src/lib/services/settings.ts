import "server-only";
import { cache } from "react";
import { connectDb } from "@/lib/db";
import { Settings, type SettingsDoc, type SettingsText } from "@/lib/models/content";
import type { I18nOverrides } from "@/lib/models/_util";
import { isCurrencyCode, type CurrencyCode } from "@/lib/domain/money";
import { isValidTimeZone } from "@/lib/domain/time";
import { mediaUrl } from "@/lib/media-url";
import { overridesFor, pickText } from "@/lib/localize";
import type { Locale } from "@/i18n/config";

type ContentDefaults = {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageAlt: string;
  storyTitle: string;
  storyBody: string;
  storyImageAlt: string;
};

/**
 * Neutral fallback copy used only while the owner has not written their own, per language.
 * It makes no factual claims about the business (no history, awards, promises).
 */
export const CONTENT_DEFAULTS_BY_LOCALE: Record<Locale, ContentDefaults> = {
  en: {
    heroEyebrow: "Floriani Flowers · Yerevan",
    heroTitle: "Flowers that say what words cannot",
    heroSubtitle:
      "Hand-composed bouquets and arrangements for birthdays, love, gratitude, apologies and every quiet moment worth marking.",
    heroImageAlt: "A hand-composed Floriani bouquet",
    storyTitle: "Composed by hand, given with heart",
    storyBody:
      "Every arrangement begins with a feeling you want to share. Our florists choose each stem for its colour, texture and character, then compose it into something that feels personal — for the person receiving it, and for you.\n\nFrom a single statement rose to a lavish composition, each piece is prepared with care and wrapped to be remembered.",
    storyImageAlt: "A florist composing a bouquet",
  },
  hy: {
    heroEyebrow: "Floriani Flowers · Երևան",
    heroTitle: "Ծաղիկներ, որոնք ասում են այն, ինչ բառերը չեն կարող",
    heroSubtitle:
      "Ձեռքով հավաքված ծաղկեփնջեր և կոմպոզիցիաներ՝ ծննդյան օրերի, սիրո, երախտագիտության, ներողության և յուրաքանչյուր լուռ պահի համար, որն արժանի է հիշվելու։",
    heroImageAlt: "Ձեռքով հավաքված Floriani ծաղկեփունջ",
    storyTitle: "Հավաքված ձեռքով, նվիրված սրտով",
    storyBody:
      "Յուրաքանչյուր կոմպոզիցիա սկսվում է այն զգացումից, որը ցանկանում եք կիսել։ Մեր ֆլորիստներն ընտրում են ամեն ցողուն՝ ըստ գույնի, հյուսվածքի և բնավորության, և ստեղծում մի բան, որն անձնական է թե՛ ստացողի, թե՛ ձեզ համար։\n\nՄեկ արտահայտիչ վարդից մինչև շքեղ կոմպոզիցիա՝ յուրաքանչյուր աշխատանք պատրաստվում է հոգատարությամբ և փաթեթավորվում այնպես, որ հիշվի։",
    storyImageAlt: "Ֆլորիստը ծաղկեփունջ է հավաքում",
  },
  ru: {
    heroEyebrow: "Floriani Flowers · Ереван",
    heroTitle: "Цветы, которые скажут то, что не выразить словами",
    heroSubtitle:
      "Букеты и композиции ручной работы — для дней рождения, любви, благодарности, извинений и каждого тихого момента, который хочется отметить.",
    heroImageAlt: "Букет Floriani ручной работы",
    storyTitle: "Собрано руками, подарено от сердца",
    storyBody:
      "Каждая композиция начинается с чувства, которым вы хотите поделиться. Наши флористы выбирают каждый стебель за его цвет, фактуру и характер и собирают из них то, что ощущается личным — и для того, кто получает подарок, и для вас.\n\nОт одной выразительной розы до роскошной композиции — каждая работа создаётся с заботой и упаковывается так, чтобы её запомнили.",
    storyImageAlt: "Флорист собирает букет",
  },
};

/** English fallback copy (shown as placeholders in the admin content editor). */
export const CONTENT_DEFAULTS = CONTENT_DEFAULTS_BY_LOCALE.en;

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
  /** Stored Armenian / Russian overrides — only in the raw (admin) form, i.e. when no locale was requested. */
  i18n?: I18nOverrides<SettingsText>;
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

/**
 * Without a locale: the stored (English) text plus the raw `i18n` overrides, for editing.
 * With a locale: text translated for that language, falling back to English, then to the defaults.
 */
export function serializeSettings(doc: SettingsDoc, locale?: Locale): StoreSettings {
  const c = doc.content ?? ({} as SettingsDoc["content"]);
  const tr = overridesFor(doc.i18n, locale);
  const defaults = CONTENT_DEFAULTS_BY_LOCALE[locale ?? "en"];
  const text = (field: keyof SettingsText, base: string | null | undefined) => pickText(tr[field], base ?? "");
  const heroId = c?.heroImage ? String(c.heroImage) : null;
  const storyId = c?.storyImage ? String(c.storyImage) : null;
  const currency = isCurrencyCode(doc.currency ?? "") ? (doc.currency as CurrencyCode) : "AMD";
  const tz = doc.timeZone && isValidTimeZone(doc.timeZone) ? doc.timeZone : "Asia/Yerevan";
  return {
    storeName: doc.storeName ?? "Floriani Flowers",
    tagline: text("tagline", doc.tagline),
    currency,
    timeZone: tz,
    contact: {
      phone: doc.contact?.phone ?? "",
      email: doc.contact?.email ?? "",
      whatsapp: doc.contact?.whatsapp ?? "",
      address: text("contactAddress", doc.contact?.address),
      hours: text("contactHours", doc.contact?.hours),
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
      orderNotice: text("orderNotice", doc.checkout?.orderNotice),
    },
    content: {
      announcement: text("announcement", c?.announcement),
      heroEyebrow: text("heroEyebrow", c?.heroEyebrow) || defaults.heroEyebrow,
      heroTitle: text("heroTitle", c?.heroTitle) || defaults.heroTitle,
      heroSubtitle: text("heroSubtitle", c?.heroSubtitle) || defaults.heroSubtitle,
      heroImageId: heroId,
      heroImage: heroId ? mediaUrl(heroId) : null,
      heroImageAlt: text("heroImageAlt", c?.heroImageAlt) || defaults.heroImageAlt,
      storyTitle: text("storyTitle", c?.storyTitle) || defaults.storyTitle,
      storyBody: text("storyBody", c?.storyBody) || defaults.storyBody,
      storyImageId: storyId,
      storyImage: storyId ? mediaUrl(storyId) : null,
      storyImageAlt: text("storyImageAlt", c?.storyImageAlt) || defaults.storyImageAlt,
      aboutBody: text("aboutBody", c?.aboutBody),
      deliveryInfo: text("deliveryInfo", c?.deliveryInfo),
    },
    legal: {
      privacy: text("privacy", doc.legal?.privacy),
      terms: text("terms", doc.legal?.terms),
      returns: text("returns", doc.legal?.returns),
      reviewedAt: doc.legal?.reviewedAt ? new Date(doc.legal.reviewedAt).toISOString() : null,
    },
    ...(locale ? {} : { i18n: doc.i18n ?? {} }),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

/**
 * Store settings for the current request (memoised per request and per locale).
 * Pass the visitor's locale for display; omit it to get the raw stored values (admin).
 */
export const getSettings = cache(
  async (locale?: Locale): Promise<StoreSettings> => serializeSettings(await loadSettingsDoc(), locale),
);

/** Settings without React request memoisation (scripts, background work, admin). */
export async function loadSettings(locale?: Locale): Promise<StoreSettings> {
  return serializeSettings(await loadSettingsDoc(), locale);
}
