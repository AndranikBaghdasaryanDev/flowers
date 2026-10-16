/**
 * Integration tests against a real MongoDB replica set (in-memory), exercising the
 * same services the API routes call: pricing, transactional order creation,
 * idempotency, stock, lifecycle rules, ownership and analytics.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import type { SessionUser } from "@/lib/auth/session";

let replSet: MongoMemoryReplSet;
let svc: typeof import("@/lib/services/orders");
let catalogAdmin: typeof import("@/lib/services/admin-catalog");
let analytics: typeof import("@/lib/services/analytics");
let models: {
  Product: typeof import("@/lib/models/catalog").Product;
  Category: typeof import("@/lib/models/catalog").Category;
  DeliveryMethod: typeof import("@/lib/models/delivery").DeliveryMethod;
  Courier: typeof import("@/lib/models/delivery").Courier;
  Order: typeof import("@/lib/models/order").Order;
};

const owner: SessionUser = { id: new mongoose.Types.ObjectId().toString(), email: "o@test", name: "Owner", phone: "", role: "owner", isStaff: true, emailVerified: true };
const deliveryManager: SessionUser = { ...owner, id: new mongoose.Types.ObjectId().toString(), role: "delivery_manager" };
const customerA: SessionUser = { id: new mongoose.Types.ObjectId().toString(), email: "a@test", name: "Customer A", phone: "", role: "customer", isStaff: false, emailVerified: true };
const customerB: SessionUser = { ...customerA, id: new mongoose.Types.ObjectId().toString(), email: "b@test" };

let ids: { cat: string; roses: string; orchid: string; delivery: string; pickup: string; courier: string };
let futureDate = "";

function checkout(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: `key-${Math.random().toString(36).slice(2)}-${Date.now()}`,
    items: [{ productId: ids.roses, quantity: 2 }],
    customer: { name: "Anna Petrosyan", email: "anna@example.com", phone: "+374 99 111111" },
    recipient: { name: "", phone: "" },
    deliveryMethodId: ids.delivery,
    address: { city: "Yerevan", zone: "Kentron", street: "Abovyan 1", building: "", apartment: "", entrance: "", floor: "", notes: "" },
    deliveryDate: futureDate,
    timeWindow: "10:00 – 13:00",
    paymentMethod: "cash_on_delivery" as const,
    giftMessage: "",
    customerComment: "",
    acceptTerms: true as const,
    ...overrides,
  };
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = replSet.getUri();
  process.env.MONGODB_DB = "floriani_test";
  svc = await import("@/lib/services/orders");
  catalogAdmin = await import("@/lib/services/admin-catalog");
  analytics = await import("@/lib/services/analytics");
  const catalog = await import("@/lib/models/catalog");
  const delivery = await import("@/lib/models/delivery");
  const order = await import("@/lib/models/order");
  models = { Product: catalog.Product, Category: catalog.Category, DeliveryMethod: delivery.DeliveryMethod, Courier: delivery.Courier, Order: order.Order };
  const { connectDb } = await import("@/lib/db");
  await connectDb();
  await Promise.all(Object.values(models).map((m) => m.createCollection().then(() => m.syncIndexes())));
  const { toDateKey, addDaysToKey } = await import("@/lib/domain/time");
  futureDate = addDaysToKey(toDateKey(new Date(), "Asia/Yerevan"), 3);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

beforeEach(async () => {
  // Clear every collection (indexes are kept).
  await Promise.all((await mongoose.connection.db!.collections()).map((c) => c.deleteMany({})));
  const cat = await models.Category.create({ name: "Roses", slug: "roses", kind: "collection" });
  const media = new mongoose.Types.ObjectId();
  const roses = await models.Product.create({ name: "Red roses", slug: "red-roses", price: 30000, category: cat._id, images: [{ media, alt: "Roses" }], isActive: true });
  const orchid = await models.Product.create({ name: "Orchid", slug: "orchid", price: 20000, category: cat._id, images: [{ media, alt: "Orchid" }], isActive: true, trackInventory: true, stockQuantity: 2 });
  const delivery = await models.DeliveryMethod.create({
    name: "Courier",
    type: "delivery",
    fee: 1500,
    city: "Yerevan",
    zones: [{ name: "Kentron", fee: null }, { name: "Arabkir", fee: 2500 }],
    leadTimeMinutes: 60,
    maxDaysAhead: 30,
    timeWindows: [{ label: "10:00 – 13:00", start: "10:00", end: "13:00" }],
    requiresCourier: true,
  });
  const pickup = await models.DeliveryMethod.create({ name: "Pickup", type: "pickup", fee: 0, leadTimeMinutes: 60, maxDaysAhead: 30 });
  const courier = await models.Courier.create({ name: "Davit", phone: "+374 99 000000", vehicleType: "car", vehicleRegistration: "01AA001" });
  ids = { cat: String(cat._id), roses: String(roses._id), orchid: String(orchid._id), delivery: String(delivery._id), pickup: String(pickup._id), courier: String(courier._id) };
});

describe("order creation", () => {
  it("prices on the server and ignores client totals", async () => {
    const { order, trackingToken } = await svc.createOrder(checkout(), null);
    expect(order.subtotal).toBe(60000);
    expect(order.deliveryFee).toBe(1500);
    expect(order.total).toBe(61500);
    expect(order.orderNumber).toMatch(/^FF-\d+$/);
    expect(trackingToken.length).toBeGreaterThan(20);
    expect(order.items[0].unitPrice).toBe(30000);
  });

  it("applies zone-specific fees and rejects uncovered areas", async () => {
    const r = await svc.createOrder(checkout({ address: { ...checkout().address, zone: "Arabkir" } }), null);
    expect(r.order.deliveryFee).toBe(2500);
    await expect(svc.createOrder(checkout({ address: { ...checkout().address, zone: "Gyumri" } }), null)).rejects.toMatchObject({ status: 422 });
  });

  it("refuses a stale expected total (price changed)", async () => {
    await expect(svc.createOrder(checkout({ expectedTotal: 1 }), null)).rejects.toMatchObject({ status: 409 });
  });

  it("is idempotent for repeated submissions", async () => {
    const input = checkout();
    const first = await svc.createOrder(input, null);
    const second = await svc.createOrder(input, null);
    expect(second.replayed).toBe(true);
    expect(second.order.orderNumber).toBe(first.order.orderNumber);
    expect(await models.Order.countDocuments()).toBe(1);
  });

  it("decrements stock atomically and blocks overselling", async () => {
    await svc.createOrder(checkout({ items: [{ productId: ids.orchid, quantity: 2 }] }), null);
    expect((await models.Product.findById(ids.orchid).lean())!.stockQuantity).toBe(0);
    await expect(svc.createOrder(checkout({ items: [{ productId: ids.orchid, quantity: 1 }] }), null)).rejects.toMatchObject({ status: 409 });
  });

  it("rejects unavailable products", async () => {
    await models.Product.updateOne({ _id: ids.roses }, { $set: { availability: "unavailable" } });
    await expect(svc.createOrder(checkout(), null)).rejects.toMatchObject({ status: 409 });
  });

  it("drops a submitted address for pickup orders", async () => {
    const r = await svc.createOrder(checkout({ deliveryMethodId: ids.pickup, paymentMethod: "cash_on_pickup", timeWindow: "" }), null);
    expect(r.order.address).toBeNull();
    expect(r.order.deliveryFee).toBe(0);
  });

  it("rejects a delivery order without address and invalid payment method", async () => {
    await expect(svc.createOrder(checkout({ address: null }), null)).rejects.toMatchObject({ status: 422 });
    await expect(svc.createOrder(checkout({ paymentMethod: "cash_on_pickup" }), null)).rejects.toMatchObject({ status: 422 });
  });

  it("rejects dates outside the delivery rules", async () => {
    await expect(svc.createOrder(checkout({ deliveryDate: "2020-01-01" }), null)).rejects.toMatchObject({ status: 422 });
  });
});

describe("order lifecycle", () => {
  it("enforces transitions, courier assignment and payment before completion", async () => {
    const { order } = await svc.createOrder(checkout(), null);
    let o = await svc.changeOrderStatus(order.id, { to: "confirmed", expectedVersion: 0, note: "", message: "", reason: "" }, owner);
    o = await svc.changeOrderStatus(order.id, { to: "preparing", expectedVersion: o.version, note: "", message: "", reason: "" }, owner);
    o = await svc.changeOrderStatus(order.id, { to: "ready", expectedVersion: o.version, note: "", message: "", reason: "" }, owner);
    await expect(svc.changeOrderStatus(order.id, { to: "out_for_delivery", expectedVersion: o.version, note: "", message: "", reason: "" }, owner)).rejects.toMatchObject({ status: 409 });
    o = await svc.assignDelivery(order.id, { expectedVersion: o.version, courierId: ids.courier, vehicleType: null, vehicleModel: "", vehicleRegistration: "", instructions: "", note: "" }, deliveryManager);
    expect(o.delivery.vehicleRegistration).toBe("01AA001");
    o = await svc.changeOrderStatus(order.id, { to: "out_for_delivery", expectedVersion: o.version, note: "", message: "", reason: "" }, deliveryManager);
    // Courier cannot be removed while the order is on the road.
    await expect(svc.assignDelivery(order.id, { expectedVersion: o.version, courierId: null, vehicleType: null, vehicleModel: "", vehicleRegistration: "", instructions: "", note: "" }, owner)).rejects.toMatchObject({ status: 409 });
    o = await svc.changeOrderStatus(order.id, { to: "delivered", expectedVersion: o.version, note: "", message: "", reason: "" }, deliveryManager);
    await expect(svc.changeOrderStatus(order.id, { to: "completed", expectedVersion: o.version, note: "", message: "", reason: "" }, owner)).rejects.toMatchObject({ status: 409 });
    o = await svc.changePaymentStatus(order.id, { to: "paid", expectedVersion: o.version, note: "" }, owner);
    o = await svc.changeOrderStatus(order.id, { to: "completed", expectedVersion: o.version, note: "", message: "", reason: "" }, owner);
    expect(o.status).toBe("completed");
    expect(o.history.filter((h) => h.type === "status")).toHaveLength(6);
  });

  it("rejects stale versions (concurrent edits) and invalid jumps", async () => {
    const { order } = await svc.createOrder(checkout(), null);
    await svc.changeOrderStatus(order.id, { to: "confirmed", expectedVersion: 0, note: "", message: "", reason: "" }, owner);
    await expect(svc.changeOrderStatus(order.id, { to: "cancelled", expectedVersion: 0, note: "", message: "", reason: "x" }, owner)).rejects.toMatchObject({ status: 409 });
    await expect(svc.changeOrderStatus(order.id, { to: "delivered", expectedVersion: 1, note: "", message: "", reason: "" }, owner)).rejects.toMatchObject({ status: 409 });
  });

  it("checks role permissions per transition", async () => {
    const { order } = await svc.createOrder(checkout(), null);
    await expect(svc.changeOrderStatus(order.id, { to: "cancelled", expectedVersion: 0, note: "", message: "", reason: "Customer request" }, deliveryManager)).rejects.toMatchObject({ status: 403 });
  });

  it("restocks and voids payment on cancellation", async () => {
    const { order } = await svc.createOrder(checkout({ items: [{ productId: ids.orchid, quantity: 2 }] }), null);
    const o = await svc.changeOrderStatus(order.id, { to: "cancelled", expectedVersion: 0, note: "", message: "", reason: "Out of flowers" }, owner);
    expect(o.paymentStatus).toBe("voided");
    expect((await models.Product.findById(ids.orchid).lean())!.stockQuantity).toBe(2);
  });

  it("keeps internal notes out of the customer view", async () => {
    const { order } = await svc.createOrder(checkout(), customerA);
    await svc.addOrderNote(order.id, "internal", "Secret staff note", owner);
    await svc.changeOrderStatus(order.id, { to: "confirmed", expectedVersion: 1, note: "internal only", message: "See you soon", reason: "" }, owner);
    const view = await svc.getOrderForUser(order.id, customerA);
    const json = JSON.stringify(view);
    expect(json).not.toContain("Secret staff note");
    expect(json).not.toContain("internal only");
    expect(json).toContain("See you soon");
  });
});

describe("authorization", () => {
  it("never returns another customer's order", async () => {
    const { order } = await svc.createOrder(checkout(), customerA);
    expect(await svc.getOrderForUser(order.id, customerA)).not.toBeNull();
    expect(await svc.getOrderForUser(order.id, customerB)).toBeNull();
    await expect(svc.cancelOwnOrder(order.id, customerB)).rejects.toMatchObject({ status: 404 });
  });

  it("requires the secret token for guest tracking", async () => {
    const { order, trackingToken } = await svc.createOrder(checkout(), null);
    expect(await svc.getOrderByToken(order.orderNumber, trackingToken)).not.toBeNull();
    expect(await svc.getOrderByToken(order.orderNumber, "x".repeat(43))).toBeNull();
  });
});

describe("catalogue integrity", () => {
  it("refuses to delete a category with products unless they are reassigned", async () => {
    await expect(catalogAdmin.deleteCategory(ids.cat, null, owner)).rejects.toMatchObject({ status: 409 });
    const other = await models.Category.create({ name: "Bouquets", slug: "bouquets", kind: "collection" });
    await catalogAdmin.deleteCategory(ids.cat, String(other._id), owner);
    expect(await models.Product.countDocuments({ category: other._id })).toBe(2);
  });

  it("archives products that appear in orders instead of deleting them", async () => {
    const { order } = await svc.createOrder(checkout(), null);
    expect(await catalogAdmin.deleteProduct(ids.roses, owner)).toBe("archived");
    const view = await svc.getStaffOrder(order.id);
    expect(view?.items[0].name).toBe("Red roses");
    expect(await catalogAdmin.deleteProduct(ids.orchid, owner)).toBe("deleted");
  });
});

describe("analytics", () => {
  it("counts placed orders but excludes cancelled ones from value", async () => {
    const a = await svc.createOrder(checkout(), null);
    await svc.createOrder(checkout(), null);
    await svc.changeOrderStatus(a.order.id, { to: "cancelled", expectedVersion: 0, note: "", message: "", reason: "test" }, owner);
    const { toDateKey } = await import("@/lib/domain/time");
    const today = toDateKey(new Date(), "Asia/Yerevan");
    const r = await analytics.getAnalytics({ from: today, to: today });
    expect(r.totals.ordersPlaced).toBe(2);
    expect(r.totals.cancelled).toBe(1);
    expect(r.totals.grossValue).toBe(61500);
    expect(r.totals.unitsSold).toBe(2);
    expect(r.daily).toHaveLength(1);
  });

  it("returns zeroes for an empty period", async () => {
    const r = await analytics.getAnalytics({ from: "2020-01-01", to: "2020-01-07" });
    expect(r.totals.ordersPlaced).toBe(0);
    expect(r.daily).toHaveLength(7);
    expect(r.daily.every((d) => d.orders === 0)).toBe(true);
  });
});
