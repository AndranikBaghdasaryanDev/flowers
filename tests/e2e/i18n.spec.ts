import { expect, test } from "@playwright/test";

const PAGES = ["/", "/shop", "/categories", "/cart", "/delivery", "/about", "/contact", "/orders/track", "/login"];

test.describe("localization", () => {
  test("unprefixed URLs redirect to the negotiated language", async ({ browser }) => {
    const ru = await browser.newContext({ locale: "ru-RU" });
    const page = await ru.newPage();
    await page.goto("/shop");
    await expect(page).toHaveURL(/\/ru\/shop$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru-RU");
    await ru.close();

    const other = await browser.newContext({ locale: "de-DE" });
    const p2 = await other.newPage();
    await p2.goto("/");
    await expect(p2).toHaveURL(/\/hy$/);
    await expect(p2.locator("html")).toHaveAttribute("lang", "hy-AM");
    await other.close();
  });

  for (const locale of ["hy", "en", "ru"] as const) {
    test(`all public pages render in ${locale} without missing keys`, async ({ page }) => {
      const warnings: string[] = [];
      page.on("console", (msg) => {
        if (msg.text().includes("[i18n] missing key")) warnings.push(msg.text());
      });
      for (const path of PAGES) {
        const response = await page.goto(`/${locale}${path === "/" ? "" : path}`);
        expect(response?.status(), path).toBeLessThan(400);
        await expect(page.locator("main")).toBeVisible();
        // A raw dictionary key ("nav.shop") leaking into the page means a missing translation.
        const text = await page.locator("body").innerText();
        expect(text, path).not.toMatch(/\b(nav|common|shop|cart|checkout|product|home|footer|auth|account|order)\.[a-z]\w+\b/);
      }
      expect(warnings).toEqual([]);
    });
  }

  test("pages declare hreflang alternates", async ({ page }) => {
    await page.goto("/en/shop");
    for (const lang of ["hy", "en", "ru", "x-default"]) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveCount(1);
    }
  });

  test("switching language keeps the page and persists the choice", async ({ page, context }) => {
    await page.goto("/en/shop");
    await page.getByRole("button", { name: /Language/ }).first().click();
    await page.getByRole("link", { name: "Русский" }).first().click();
    await expect(page).toHaveURL(/\/ru\/shop/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru-RU");
    const cookie = (await context.cookies()).find((c) => c.name === "ff_locale");
    expect(cookie?.value).toBe("ru");

    // The remembered choice beats the browser language on the next unprefixed visit.
    await page.goto("/delivery");
    await expect(page).toHaveURL(/\/ru\/delivery/);
  });

  test("prefetching other-language links does not change the saved language", async ({ page, context }) => {
    await page.goto("/en/shop");
    // Bring the footer's language links into view so the router prefetches them.
    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Language/ }).first().hover();
    await page.waitForTimeout(1500);
    const cookie = (await context.cookies()).find((c) => c.name === "ff_locale");
    expect(cookie?.value).toBe("en");
  });

  test("unknown locale segments are not found", async ({ page }) => {
    const response = await page.goto("/de/shop");
    expect(response?.status()).toBe(404);
  });
});
