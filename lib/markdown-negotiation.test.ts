import {
  getMarkdownContentForRoute,
  getMarkdownHeaders,
  isMarkdownRequested,
} from "./markdown-negotiation";

describe("markdown-negotiation", () => {
  describe("isMarkdownRequested", () => {
    it("returns true when text/markdown is present", () => {
      expect(isMarkdownRequested("text/markdown")).toBe(true);
      expect(isMarkdownRequested("text/markdown, text/html;q=0.9")).toBe(true);
      expect(isMarkdownRequested("TEXT/MARKDOWN")).toBe(true);
    });

    it("returns false for standard browser or empty accept headers", () => {
      expect(isMarkdownRequested(null)).toBe(false);
      expect(isMarkdownRequested(undefined)).toBe(false);
      expect(isMarkdownRequested("text/html,application/xhtml+xml")).toBe(false);
      expect(isMarkdownRequested("application/json")).toBe(false);
    });
  });

  describe("getMarkdownHeaders", () => {
    it("includes required Vary: Accept and Content-Type", () => {
      const headers = getMarkdownHeaders();
      expect(headers["Content-Type"]).toBe("text/markdown; charset=utf-8");
      expect(headers.Vary).toBe("Accept");
    });
  });

  describe("getMarkdownContentForRoute", () => {
    it("returns home workspace markdown for root paths", () => {
      const rootMd = getMarkdownContentForRoute("/");
      expect(rootMd).toContain("# Receipt Parser & Aggregator AI — Home Workspace");
      expect(rootMd).toContain("gemini-flash-latest");

      const localeMd = getMarkdownContentForRoute("/en");
      expect(localeMd).toContain("# Receipt Parser & Aggregator AI — Home Workspace");
    });

    it("returns groceries dashboard markdown for /groceries", () => {
      const groceriesMd = getMarkdownContentForRoute("/en/groceries");
      expect(groceriesMd).toContain("# Groceries Dashboard & Shared Boards");
      expect(groceriesMd).toContain("Expense Categorization");
    });

    it("returns invite markdown for /invite", () => {
      const inviteMd = getMarkdownContentForRoute("/es/invite");
      expect(inviteMd).toContain("# Board Invitation Acceptance");
    });

    it("returns fallback markdown for other routes", () => {
      const fallbackMd = getMarkdownContentForRoute("/custom/path");
      expect(fallbackMd).toContain("# Receipt AI Platform");
      expect(fallbackMd).toContain("Path: `/custom/path`");
    });
  });
});
