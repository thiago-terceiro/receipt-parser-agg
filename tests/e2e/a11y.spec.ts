import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag2aaa",
  "wcag21a",
  "wcag21aa",
  "wcag21aaa",
  "wcag22aa",
];

test.describe("Full Page Automated Accessibility Audits (Axe WCAG AA/AAA)", () => {
  for (const route of ["/en", "/pt-br", "/es", "/en/groceries"]) {
    test(`Route (${route}) passes axe accessibility audit`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
