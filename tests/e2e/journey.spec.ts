import { expect, test, type Page } from "@playwright/test";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner@floriani.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "OwnerPass2026";

test.describe.configure({ mode: "serial" });

let orderNumber = "";
let trackUrl = "";

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("customer orders flowers from the storefront", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await noHorizontalOverflow(page);

  // Browse a category
  await page.goto("/categories");
  await page.getByRole("link", { name: /^Roses/ }).first().click();
  await expect(page).toHaveURL(/\/categories\/roses/);

  // Open a product and add it to the bag
  await page.locator("article h3 a").first().click();
  await expect(page).toHaveURL(/\/products\//);
  await page.getByRole("button", { name: "Increase quantity" }).first().click();
  await page.getByRole("button", { name: /Add to bag/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Your bag" })).toBeVisible();
  await page.getByRole("link", { name: "View bag" }).click();

  // Update the cart
  await expect(page).toHaveURL(/\/cart/);
  const qty = page.getByRole("spinbutton").first();
  await expect(qty).toHaveValue("2");
  await page.getByRole("button", { name: /Decrease quantity/ }).first().click();
  await expect(qty).toHaveValue("1");
  await page.getByRole("link", { name: /Proceed to checkout/ }).click();

  // Checkout
  await expect(page).toHaveURL(/\/checkout/);
  await page.locator("#c-name").fill("E2E Test Customer");
  await page.locator("#c-email").fill("e2e@example.com");
  await page.locator("#c-phone").fill("+374 99 555555");
  await page.getByRole("radio", { name: /Courier delivery/ }).check({ force: true });
  await page.locator("#a-zone").selectOption("Arabkir");
  await page.locator("#a-street").fill("Komitas Ave 5");
  await page.locator("button[aria-pressed]").filter({ hasText: /\d/ }).nth(1).click(); // second available date
  await page.locator("#gift").fill("With love");
  await page.getByLabel(/I accept the/).check();
  const place = page.getByRole("button", { name: /Place order/ });
  await expect(place).toBeEnabled();
  await place.click();

  await expect(page).toHaveURL(/\/checkout\/success/);
  await expect(page.getByText(/Thank you, E2E/)).toBeVisible();
  orderNumber = (await page.locator("p.eyebrow").first().innerText()).replace(/^Order\s+/i, "").trim();
  trackUrl = page.url().replace("/checkout/success", "/orders/track");
  expect(orderNumber).toMatch(/^FF-\d+$/);
  expect(errors).toEqual([]);
});

test("protected areas are not accessible without permission", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=/);
  const res = await request.get("/api/admin/orders");
  expect(res.status()).toBe(401);
  const res2 = await request.get("/api/account/orders/000000000000000000000000");
  expect(res2.status()).toBe(401);
});

test("staff processes the order through delivery", async ({ page }) => {
  await page.goto("/login?next=/admin/orders");
  await page.getByLabel("Email", { exact: true }).fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.getByRole("search").getByRole("searchbox").fill(orderNumber);
  await page.getByRole("search").getByRole("searchbox").press("Enter");
  await page.getByRole("link", { name: orderNumber }).first().click();
  await expect(page.getByRole("heading", { name: orderNumber })).toBeVisible();

  const step = async (button: RegExp, label: string, reason?: string) => {
    await page.getByRole("button", { name: button }).click();
    const dialog = page.getByRole("dialog");
    if (reason) await dialog.getByRole("textbox").first().fill(reason);
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(`Order is now “${label}”`)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  };

  await step(/^Confirm order$/, "Confirmed");
  await step(/Start preparing/, "Preparing");
  await step(/Ready for dispatch/, "Ready for dispatch");

  // Assign a courier (create one if none exist)
  const courierSelect = page.locator("#dl-courier");
  const options = await courierSelect.locator("option").count();
  if (options <= 1) test.skip(true, "No couriers configured in this environment");
  await courierSelect.selectOption({ index: 1 });
  await page.getByRole("button", { name: "Save delivery details" }).click();
  await expect(page.getByText("Delivery details saved")).toBeVisible();

  await step(/^Dispatch$/, "Out for delivery");
  await step(/Mark delivered/, "Delivered");
  await page.getByRole("button", { name: "Record cash received" }).click();
  await expect(page.getByText("Payment recorded")).toBeVisible();
  await step(/^Complete$/, "Completed");
});

test("customer sees the updated status", async ({ page }) => {
  await page.goto(trackUrl);
  await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible();
});

test("analytics reflects the order", async ({ page }) => {
  await page.goto("/login?next=/admin/analytics");
  await page.getByLabel("Email", { exact: true }).fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/:\d+\/admin\/analytics/);
  await page.goto("/admin/analytics?range=today");
  await expect(page.getByText("Orders placed").first()).toBeVisible();
  await expect(page.getByText("No orders in this period")).toHaveCount(0);
});
