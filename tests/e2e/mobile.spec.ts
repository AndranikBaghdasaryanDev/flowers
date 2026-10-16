import { expect, test } from "@playwright/test";

const PAGES = ["/", "/shop", "/categories", "/products/velvet-burgundy-roses", "/cart", "/checkout", "/delivery", "/login", "/orders/track"];

for (const path of PAGES) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("mobile menu opens and navigates", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Shop all flowers" }).click();
  await expect(page).toHaveURL(/\/shop/);
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
});

test("mobile filters drawer works", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: /Filters/ }).click();
  const drawer = page.getByRole("dialog", { name: "Filters" });
  await drawer.getByRole("button", { name: "Bouquets" }).click();
  await expect(page).toHaveURL(/category=bouquets/);
});
