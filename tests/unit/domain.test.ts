import { describe, expect, it } from "vitest";
import { allowedNextStatuses, checkPaymentTransition, checkTransition, permissionForTransition } from "@/lib/domain/orders";
import { formatMoney, toMajor, toMinor } from "@/lib/domain/money";
import { addDaysToKey, eachDayKey, isDateKey, toDateKey, weekdayOfKey, zonedDayRange, zonedWallTimeToUtc } from "@/lib/domain/time";
import { isReservedSlug, slugify } from "@/lib/domain/slug";
import { hasPermission } from "@/lib/domain/roles";
import { checkoutSchema, productInputSchema, registerSchema } from "@/lib/validation";

const ctx = { fulfillment: "delivery" as const, hasCourier: true, requiresCourier: true, paymentStatus: "unpaid" as const, total: 1000 };

describe("order lifecycle", () => {
  it("allows the normal delivery path", () => {
    expect(checkTransition("pending", "confirmed", ctx).ok).toBe(true);
    expect(checkTransition("confirmed", "preparing", ctx).ok).toBe(true);
    expect(checkTransition("preparing", "ready", ctx).ok).toBe(true);
    expect(checkTransition("ready", "out_for_delivery", ctx).ok).toBe(true);
    expect(checkTransition("out_for_delivery", "delivered", ctx).ok).toBe(true);
  });

  it("rejects skipping steps and leaving terminal states", () => {
    expect(checkTransition("pending", "delivered", ctx).ok).toBe(false);
    expect(checkTransition("cancelled", "confirmed", ctx).ok).toBe(false);
    expect(checkTransition("completed", "cancelled", ctx).ok).toBe(false);
    expect(allowedNextStatuses("completed", "delivery")).toEqual([]);
  });

  it("requires a courier before dispatch", () => {
    const r = checkTransition("ready", "out_for_delivery", { ...ctx, hasCourier: false });
    expect(r.ok).toBe(false);
  });

  it("requires payment before completion", () => {
    expect(checkTransition("delivered", "completed", ctx).ok).toBe(false);
    expect(checkTransition("delivered", "completed", { ...ctx, paymentStatus: "paid" }).ok).toBe(true);
  });

  it("pickup orders never go out for delivery", () => {
    expect(allowedNextStatuses("ready", "pickup")).toEqual(["completed", "cancelled"]);
    expect(checkTransition("ready", "out_for_delivery", { ...ctx, fulfillment: "pickup" }).ok).toBe(false);
  });

  it("supports a retry after a failed delivery", () => {
    expect(allowedNextStatuses("delivery_failed", "delivery")).toContain("out_for_delivery");
    expect(allowedNextStatuses("delivery_failed", "delivery")).toContain("ready");
  });

  it("maps transitions to permissions", () => {
    expect(permissionForTransition("cancelled")).toBe("orders:cancel");
    expect(permissionForTransition("delivered")).toBe("delivery:manage");
    expect(permissionForTransition("confirmed")).toBe("orders:update");
    expect(hasPermission("delivery_manager", "orders:cancel")).toBe(false);
    expect(hasPermission("delivery_manager", "delivery:manage")).toBe(true);
    expect(hasPermission("admin", "staff:manage")).toBe(false);
    expect(hasPermission("customer", "orders:read")).toBe(false);
  });

  it("validates payment transitions", () => {
    expect(checkPaymentTransition("unpaid", "paid", "delivered").ok).toBe(true);
    expect(checkPaymentTransition("unpaid", "paid", "cancelled").ok).toBe(false);
    expect(checkPaymentTransition("paid", "unpaid", "delivered").ok).toBe(false);
  });
});

describe("money", () => {
  it("handles zero-decimal and two-decimal currencies", () => {
    expect(toMinor(12000, "AMD")).toBe(12000);
    expect(toMinor(12.5, "USD")).toBe(1250);
    expect(toMajor(1250, "USD")).toBe(12.5);
    expect(formatMoney(52000, "AMD")).toBe("52,000 ֏");
    expect(formatMoney(1250, "EUR")).toBe("€12.50");
  });
});

describe("time zones", () => {
  it("attributes instants near midnight to the store's local day", () => {
    // 21:30 UTC on 14 Oct is 01:30 on 15 Oct in Yerevan (UTC+4).
    expect(toDateKey(new Date("2026-10-14T21:30:00Z"), "Asia/Yerevan")).toBe("2026-10-15");
    expect(toDateKey(new Date("2026-10-14T19:59:00Z"), "Asia/Yerevan")).toBe("2026-10-14");
  });

  it("builds half-open UTC ranges for local days", () => {
    const { start, end } = zonedDayRange("2026-10-14", "2026-10-14", "Asia/Yerevan");
    expect(start.toISOString()).toBe("2026-10-13T20:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-14T20:00:00.000Z");
  });

  it("handles daylight-saving transitions", () => {
    // Europe/Berlin switches to winter time on 25 Oct 2026; that day has 25 hours.
    const { start, end } = zonedDayRange("2026-10-25", "2026-10-25", "Europe/Berlin");
    expect((end.getTime() - start.getTime()) / 3600000).toBe(25);
    expect(zonedWallTimeToUtc("2026-07-01", "10:00", "Europe/Berlin").toISOString()).toBe("2026-07-01T08:00:00.000Z");
  });

  it("works with date keys", () => {
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(eachDayKey("2026-02-27", "2026-03-01")).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(weekdayOfKey("2026-10-14")).toBe(3);
  });
});

describe("slugs", () => {
  it("creates clean slugs and blocks reserved ones", () => {
    expect(slugify("Velvet Burgundy Roses & More!")).toBe("velvet-burgundy-roses-and-more");
    expect(isReservedSlug("admin")).toBe(true);
    expect(productInputSchema.safeParse({ slug: "admin" }).success).toBe(false);
  });
});

describe("validation", () => {
  it("rejects weak or mismatched passwords", () => {
    const base = { name: "Anna Petrosyan", email: "a@example.com", acceptTerms: true };
    expect(registerSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "longenough1", confirmPassword: "different1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "longenough1", confirmPassword: "longenough1" }).success).toBe(true);
  });

  it("strips unknown fields (mass assignment) and ignores client prices", () => {
    const parsed = checkoutSchema.parse({
      idempotencyKey: "abcdefghijklmnop1234",
      items: [{ productId: "a".repeat(24), quantity: 1, price: 1 }],
      customer: { name: "Anna P", email: "a@example.com", phone: "+374 99 000000", role: "owner" },
      deliveryMethodId: "b".repeat(24),
      deliveryDate: "2026-10-20",
      paymentMethod: "cash_on_delivery",
      acceptTerms: true,
      total: 1,
      paymentStatus: "paid",
    });
    expect(parsed).not.toHaveProperty("total");
    expect(parsed).not.toHaveProperty("paymentStatus");
    expect(parsed.items[0]).not.toHaveProperty("price");
    expect(parsed.customer).not.toHaveProperty("role");
  });

  it("requires a genuine discount", () => {
    const r = productInputSchema.safeParse({
      name: "Test",
      slug: "test-product",
      price: 100,
      compareAtPrice: 90,
      category: "a".repeat(24),
      availability: "available",
      isActive: false,
    });
    expect(r.success).toBe(false);
  });
});
