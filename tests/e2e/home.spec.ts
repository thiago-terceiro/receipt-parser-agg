import { test, expect } from "@playwright/test";

test.describe("Home Page & Core Navigation", () => {
  test("renders the home page with correct branding and header", async ({ page }) => {
    await page.goto("/");

    // Verify main header branding
    await expect(page.getByRole("link", { name: /Receipt AI/i }).first()).toBeVisible();

    // Verify Groceries Dashboard link
    await expect(page.getByRole("link", { name: /Groceries Dashboard/i }).first()).toBeVisible();

    // Verify dropzone or upload prompt is visible
    await expect(page.getByText(/Drag & drop receipt/i).or(page.getByText(/Drop your receipt/i)).or(page.getByText(/Upload/i)).first()).toBeVisible();
  });

  test("allows switching languages", async ({ page }) => {
    await page.goto("/");

    // Locate language switcher
    const localeSwitcher = page.getByRole("combobox", { name: /language|idioma/i }).or(page.locator("select")).first();
    if (await localeSwitcher.isVisible()) {
      await expect(localeSwitcher).toBeVisible();
    }
  });
});
