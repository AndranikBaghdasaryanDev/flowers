import "server-only";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { Category, Product, type ProductDoc } from "@/lib/models/catalog";
import { mediaInfoMap } from "@/lib/services/media";
import { isPurchasable, maxQuantityFor } from "@/lib/services/catalog";
import { computeDeliveryFee } from "@/lib/services/delivery";
import type { StoreSettings } from "@/lib/services/settings";
import type { DeliveryMethodDTO, QuoteDTO, QuoteLineDTO } from "@/lib/types";
import { msg, renderText, type Msg, type TextTranslator } from "@/lib/api/errors";
import { overridesFor, pickAt, pickText } from "@/lib/localize";

export type CartLine = { productId: string; quantity: number };

/** Merges duplicate product lines so quantities cannot be split to bypass limits. */
export function normaliseLines(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.quantity);
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

export type PricedLine = QuoteLineDTO & { doc: ProductDoc | null };

/** Untranslated quote messages, for callers that raise them as API errors. */
export type QuoteNotes = { delivery: Msg | null; issues: Msg[] };

/**
 * Prices a cart entirely from database values. Client-submitted prices,
 * discounts and totals are never accepted.
 *
 * With `t`, product names and messages in the result are in the translator's language;
 * without it, names are the English base names and messages are dictionary keys.
 */
export async function priceCart(
  lines: CartLine[],
  settings: StoreSettings,
  opts: { method?: DeliveryMethodDTO | null; zone?: string; session?: mongoose.ClientSession; t?: TextTranslator } = {},
): Promise<QuoteDTO & { priced: PricedLine[]; notes: QuoteNotes }> {
  await connectDb();
  const locale = opts.t?.locale;
  const render = (m: Msg | null) => (m ? (opts.t ? renderText(opts.t, m) : m.key) : "");
  const normalised = normaliseLines(lines).filter((l) => mongoose.isValidObjectId(l.productId));
  const ids = normalised.map((l) => new mongoose.Types.ObjectId(l.productId));
  const query = Product.find({ _id: { $in: ids } });
  if (opts.session) query.session(opts.session);
  const docs = await query.lean<ProductDoc[]>();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const catQuery = Category.find({ _id: { $in: docs.map((d) => d.category) } }).select("isActive");
  if (opts.session) catQuery.session(opts.session);
  const activeCats = new Set((await catQuery.lean()).filter((c) => c.isActive).map((c) => String(c._id)));
  const media = await mediaInfoMap(docs.map((d) => d.images[0]?.media));

  const priced: PricedLine[] = normalised.map((line) => {
    const doc = byId.get(line.productId) ?? null;
    if (!doc || doc.archivedAt) {
      const tr = overridesFor(doc?.i18n, locale);
      return {
        productId: line.productId,
        slug: doc?.slug ?? "",
        name: doc ? pickText(tr.name, doc.name) : render(msg("server.pricing.productGone")),
        image: null,
        unitPrice: 0,
        compareAtPrice: null,
        requestedQuantity: line.quantity,
        quantity: 0,
        lineTotal: 0,
        maxQuantity: 0,
        status: "not_found",
        message: render(msg("server.pricing.lineRemoved")),
        doc,
      };
    }
    const tr = overridesFor(doc.i18n, locale);
    const name = pickText(tr.name, doc.name);
    const img = doc.images[0];
    const info = img ? media.get(String(img.media)) : undefined;
    const image = info ? { src: info.url, alt: pickAt(tr.imageAlts, 0, img.alt) || name, width: info.width, height: info.height } : null;
    const purchasable = isPurchasable(doc, activeCats.has(String(doc.category)));
    const max = purchasable ? maxQuantityFor(doc, settings) : 0;
    const quantity = Math.min(line.quantity, max);
    const status: QuoteLineDTO["status"] = !purchasable ? "unavailable" : quantity < line.quantity ? "quantity_reduced" : "ok";
    return {
      productId: line.productId,
      slug: doc.slug,
      name,
      image,
      unitPrice: doc.price,
      compareAtPrice: doc.compareAtPrice && doc.compareAtPrice > doc.price ? doc.compareAtPrice : null,
      requestedQuantity: line.quantity,
      quantity,
      lineTotal: doc.price * quantity,
      maxQuantity: max,
      status,
      message:
        status === "unavailable"
          ? render(msg("server.pricing.lineUnavailable"))
          : status === "quantity_reduced"
            ? render(msg("server.pricing.lineReduced", { max }))
            : "",
      doc,
    };
  });

  const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCount = priced.reduce((sum, l) => sum + l.quantity, 0);
  const issues: Msg[] = [];
  let deliveryFee: number | null = null;
  let delivery: Msg | null = null;
  const method = opts.method ?? null;
  if (method) {
    deliveryFee = computeDeliveryFee(method, subtotal, opts.zone);
    if (deliveryFee === null) {
      delivery = msg(method.zones.length > 0 && !opts.zone ? "server.pricing.chooseZone" : "server.pricing.zoneNotCovered");
    } else if (method.freeOverAmount !== null && subtotal < method.freeOverAmount && deliveryFee > 0) {
      delivery = msg(method.type === "pickup" ? "server.pricing.freePickup" : "server.pricing.freeDelivery", {
        amount: { money: method.freeOverAmount, currency: settings.currency },
      });
    }
    if (method.minOrderAmount > 0 && subtotal < method.minOrderAmount) {
      issues.push(
        msg("server.pricing.minimumOrder", { method: method.name, amount: { money: method.minOrderAmount, currency: settings.currency } }),
      );
    }
  }
  const discountTotal = 0;
  return {
    currency: settings.currency,
    lines: priced.map(({ doc, ...rest }) => rest),
    priced,
    notes: { delivery, issues },
    itemCount,
    subtotal,
    deliveryFee,
    discountTotal,
    total: subtotal - discountTotal + (deliveryFee ?? 0),
    deliveryMessage: render(delivery),
    issues: issues.map(render),
  };
}
