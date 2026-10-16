import "server-only";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { User, type AddressFields } from "@/lib/models/user";
import { Product } from "@/lib/models/catalog";
import { Notification } from "@/lib/models/system";
import { ApiError } from "@/lib/api/errors";
import { normaliseLines, type CartLine } from "@/lib/services/pricing";
import type { AddressInput } from "@/lib/validation";

export type AddressDTO = AddressInput & { id: string };

export async function getProfile(userId: string) {
  await connectDb();
  const user = await User.findById(userId).select("email name phone marketingOptIn emailVerifiedAt createdAt addresses").lean();
  if (!user) throw ApiError.unauthenticated();
  return {
    email: user.email,
    name: user.name,
    phone: user.phone ?? "",
    marketingOptIn: Boolean(user.marketingOptIn),
    emailVerified: Boolean(user.emailVerifiedAt),
    memberSince: new Date(user.createdAt).toISOString(),
    addresses: (user.addresses ?? []).map(addressDto),
  };
}

function addressDto(a: AddressFields): AddressDTO {
  return {
    id: String(a._id),
    label: a.label ?? "",
    recipientName: a.recipientName ?? "",
    phone: a.phone ?? "",
    city: a.city ?? "",
    zone: a.zone ?? "",
    street: a.street ?? "",
    building: a.building ?? "",
    apartment: a.apartment ?? "",
    entrance: a.entrance ?? "",
    floor: a.floor ?? "",
    notes: a.notes ?? "",
    isDefault: Boolean(a.isDefault),
  };
}

export async function updateProfile(userId: string, data: { name: string; phone: string; marketingOptIn: boolean }) {
  await connectDb();
  // Only whitelisted fields are written; role/status/email can never be changed here.
  await User.updateOne({ _id: userId }, { $set: { name: data.name, phone: data.phone, marketingOptIn: data.marketingOptIn } });
}

export async function listAddresses(userId: string): Promise<AddressDTO[]> {
  await connectDb();
  const user = await User.findById(userId).select("addresses").lean();
  return (user?.addresses ?? []).map(addressDto);
}

async function loadAddresses(userId: string): Promise<AddressFields[]> {
  const user = await User.findById(userId).select("addresses").lean<{ addresses: AddressFields[] }>();
  if (!user) throw ApiError.unauthenticated();
  return user.addresses ?? [];
}

async function storeAddresses(userId: string, addresses: AddressFields[]): Promise<AddressDTO[]> {
  await User.updateOne({ _id: userId }, { $set: { addresses } }, { runValidators: true });
  return listAddresses(userId);
}

export async function saveAddress(userId: string, input: AddressInput, addressId?: string): Promise<AddressDTO[]> {
  await connectDb();
  const addresses = await loadAddresses(userId);
  if (!addressId && addresses.length >= 10) throw ApiError.validation("server.errors.addressLimit");
  const makeDefault = input.isDefault || addresses.length === 0 || (addresses.length === 1 && Boolean(addressId));
  let next: AddressFields[];
  if (addressId) {
    if (!addresses.some((a) => String(a._id) === addressId)) throw ApiError.notFound("server.notFound.address");
    next = addresses.map((a) => (String(a._id) === addressId ? { ...a, ...input, _id: a._id } : a));
  } else {
    next = [...addresses, { ...input, _id: new mongoose.Types.ObjectId() }];
  }
  const targetId = addressId ?? String(next[next.length - 1]._id);
  if (makeDefault) next = next.map((a) => ({ ...a, isDefault: String(a._id) === targetId }));
  else if (!next.some((a) => a.isDefault)) next[0].isDefault = true;
  return storeAddresses(userId, next);
}

export async function deleteAddress(userId: string, addressId: string): Promise<AddressDTO[]> {
  await connectDb();
  const addresses = await loadAddresses(userId);
  const existing = addresses.find((a) => String(a._id) === addressId);
  if (!existing) throw ApiError.notFound("server.notFound.address");
  const next = addresses.filter((a) => String(a._id) !== addressId);
  if (existing.isDefault && next[0]) next[0] = { ...next[0], isDefault: true };
  return storeAddresses(userId, next);
}

/* -------------------------------- Favorites ------------------------------- */

export async function getFavoriteIds(userId: string): Promise<string[]> {
  await connectDb();
  const user = await User.findById(userId).select("favorites").lean();
  return (user?.favorites ?? []).map(String);
}

export async function setFavorite(userId: string, productId: string, favorite: boolean): Promise<string[]> {
  await connectDb();
  if (!mongoose.isValidObjectId(productId)) throw ApiError.notFound("server.notFound.product");
  if (favorite) {
    const exists = await Product.exists({ _id: productId, archivedAt: null });
    if (!exists) throw ApiError.notFound("server.notFound.product");
    await User.updateOne({ _id: userId }, { $addToSet: { favorites: productId } });
  } else {
    await User.updateOne({ _id: userId }, { $pull: { favorites: productId } });
  }
  return getFavoriteIds(userId);
}

/* ---------------------------------- Cart ---------------------------------- */

export async function getServerCart(userId: string) {
  await connectDb();
  const user = await User.findById(userId).select("cart").lean();
  return {
    items: (user?.cart?.items ?? []).map((i) => ({ productId: String(i.product), quantity: i.quantity })),
    giftMessage: user?.cart?.giftMessage ?? "",
  };
}

/**
 * Replaces the stored cart, or merges a guest cart into it.
 * Merging takes the larger quantity per product (never the sum), so signing in
 * twice with the same guest cart cannot double quantities.
 */
export async function saveServerCart(
  userId: string,
  items: CartLine[],
  giftMessage: string,
  mode: "replace" | "merge",
  maxPerItem: number,
) {
  await connectDb();
  let next = normaliseLines(items);
  let message = giftMessage;
  if (mode === "merge") {
    const current = await getServerCart(userId);
    const merged = new Map(current.items.map((i) => [i.productId, i.quantity]));
    for (const line of next) merged.set(line.productId, Math.max(merged.get(line.productId) ?? 0, line.quantity));
    next = [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
    message = giftMessage || current.giftMessage;
  }
  const valid = next
    .filter((l) => mongoose.isValidObjectId(l.productId))
    .map((l) => ({ product: l.productId, quantity: Math.max(1, Math.min(maxPerItem, Math.floor(l.quantity))) }))
    .slice(0, 50);
  const existing = await Product.find({ _id: { $in: valid.map((v) => v.product) }, archivedAt: null }).select("_id").lean();
  const ok = new Set(existing.map((p) => String(p._id)));
  const filtered = valid.filter((v) => ok.has(v.product));
  await User.updateOne(
    { _id: userId },
    { $set: { "cart.items": filtered, "cart.giftMessage": message, "cart.updatedAt": new Date() } },
  );
  return { items: filtered.map((f) => ({ productId: f.product, quantity: f.quantity })), giftMessage: message };
}

/* ------------------------------ Notifications ----------------------------- */

export async function listInAppNotifications(userId: string) {
  await connectDb();
  const docs = await Notification.find({ user: userId, channel: "in_app" }).sort({ createdAt: -1 }).limit(30).lean();
  return docs.map((n) => ({
    id: String(n._id),
    subject: n.subject ?? "",
    body: n.body ?? "",
    orderId: n.order ? String(n.order) : null,
    createdAt: new Date(n.createdAt).toISOString(),
    read: Boolean(n.readAt),
  }));
}

export async function markNotificationsRead(userId: string) {
  await connectDb();
  await Notification.updateMany({ user: userId, channel: "in_app", readAt: null }, { $set: { readAt: new Date() } });
}
