import { test, expect } from "@playwright/test";

test.describe("Home Page, Structured Data & Core Flows", () => {
  test("renders the home page with correct branding, header, and parseable JSON-LD", async ({ page }) => {
    await page.goto("/en");

    // Verify main header branding and Groceries Dashboard link
    await expect(page.getByRole("link", { name: /Receipt AI/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Groceries/i }).first()).toBeVisible();

    // Verify receipt upload control is rendered
    const fileInput = page.locator("input[type='file']").first();
    await expect(fileInput).toBeAttached();

    // Verify React 19 <script type="application/ld+json"> renders valid unescaped JSON-LD
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScripts.first()).toBeAttached();
    const rawJsonLd = await jsonLdScripts.first().textContent();
    expect(rawJsonLd).toBeTruthy();
    const parsedJsonLd = JSON.parse(rawJsonLd!);
    expect(parsedJsonLd["@context"]).toBe("https://schema.org");
    expect(Array.isArray(parsedJsonLd["@graph"])).toBe(true);
  });

  test("supports localized routes (en, pt-BR, es) and sets html[lang]", async ({ page }) => {
    await page.goto("/pt-br");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");

    await page.goto("/es");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");

    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
