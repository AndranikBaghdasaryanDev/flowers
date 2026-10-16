import "server-only";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { Category, Product, type ProductDoc } from "@/lib/models/catalog";
import { mediaInfoMap } from "@/lib/services/media";
import { isPurchasable, maxQuantityFor } from "@/lib/services/catalog";
import { computeDeliveryFee } from "@/lib/services/delivery";
import type { StoreSettings } from "@/lib/services/settings";
import type { DeliveryMethodDTO, QuoteDTO, QuoteLineDTO } from "@/lib/types";
import { formatMoney } from "@/lib/domain/money";

export type CartLine = { productId: string; quantity: number };

/** Merges duplicate product lines so quantities cannot be split to bypass limits. */
export function normaliseLines(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.quantity);
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

export type PricedLine = QuoteLineDTO & { doc: ProductDoc | null };

/**
 * Prices a cart entirely from database values. Client-submitted prices,
 * discounts and totals are never accepted.
 */
export async function priceCart(
  lines: CartLine[],
  settings: StoreSettings,
  opts: { method?: DeliveryMethodDTO | null; zone?: string; session?: mongoose.ClientSession } = {},
): Promise<QuoteDTO & { priced: PricedLine[] }> {
  await connectDb();
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
      return {
        productId: line.productId,
        slug: doc?.slug ?? "",
        name: doc?.name ?? "Product no longer available",
        image: null,
        unitPrice: 0,
        compareAtPrice: null,
        requestedQuantity: line.quantity,
        quantity: 0,
        lineTotal: 0,
        maxQuantity: 0,
        status: "not_found",
        message: "This product is no longer available and was removed from your order.",
        doc,
      };
    }
    const img = doc.images[0];
    const info = img ? media.get(String(img.media)) : undefined;
    const image = info ? { src: info.url, alt: img.alt || doc.name, width: info.width, height: info.height } : null;
    const purchasable = isPurchasable(doc, activeCats.has(String(doc.category)));
    const max = purchasable ? maxQuantityFor(doc, settings) : 0;
    const quantity = Math.min(line.quantity, max);
    const status: QuoteLineDTO["status"] = !purchasable ? "unavailable" : quantity < line.quantity ? "quantity_reduced" : "ok";
    return {
      productId: line.productId,
      slug: doc.slug,
      name: doc.name,
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
          ? "This product is currently unavailable."
          : status === "quantity_reduced"
            ? `Only ${max} can be ordered right now.`
            : "",
      doc,
    };
  });

  const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCount = priced.reduce((sum, l) => sum + l.quantity, 0);
  const issues: string[] = [];
  let deliveryFee: number | null = null;
  let deliveryMessage = "";
  const method = opts.method ?? null;
  if (method) {
    deliveryFee = computeDeliveryFee(method, subtotal, opts.zone);
    if (deliveryFee === null) {
      deliveryMessage = method.zones.length > 0 && !opts.zone ? "Choose a delivery area to see the delivery fee." : "We do not deliver to this area yet.";
    } else if (method.freeOverAmount !== null && subtotal < method.freeOverAmount && deliveryFee > 0) {
      deliveryMessage = `Free ${method.type === "pickup" ? "pickup" : "delivery"} on orders from ${formatMoney(method.freeOverAmount, settings.currency)}.`;
    }
    if (method.minOrderAmount > 0 && subtotal < method.minOrderAmount) {
      issues.push(`The minimum order for ${method.name} is ${formatMoney(method.minOrderAmount, settings.currency)}.`);
    }
  }
  const discountTotal = 0;
  return {
    currency: settings.currency,
    lines: priced.map(({ doc, ...rest }) => rest),
    priced,
    itemCount,
    subtotal,
    deliveryFee,
    discountTotal,
    total: subtotal - discountTotal + (deliveryFee ?? 0),
    deliveryMessage,
    issues,
  };
}
