import {
  isTheme,
  resolveServerTheme,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
} from "./theme";

describe("lib/theme", () => {
  it("exports constants", () => {
    expect(THEME_STORAGE_KEY).toBe("receipt-ai-theme");
    expect(THEME_COOKIE_NAME).toBe("receipt-ai-theme");
  });

  describe("isTheme", () => {
    it("validates known themes", () => {
      expect(isTheme("light")).toBe(true);
      expect(isTheme("dark")).toBe(true);
      expect(isTheme("system")).toBe(true);
      expect(isTheme("light-blue")).toBe(true);
      expect(isTheme("yellow")).toBe(true);
      expect(isTheme("light-yellow")).toBe(true);
      expect(isTheme("green")).toBe(true);
      expect(isTheme("purple")).toBe(true);
    });

    it("rejects invalid themes", () => {
      expect(isTheme("")).toBe(false);
      expect(isTheme("neon")).toBe(false);
      expect(isTheme(null)).toBe(false);
      expect(isTheme(undefined)).toBe(false);
      expect(isTheme(123)).toBe(false);
      expect(isTheme({})).toBe(false);
    });
  });

  describe("resolveServerTheme", () => {
    it("resolves dark theme cookie", () => {
      const result = resolveServerTheme("dark");
      expect(result).toEqual({
        initialTheme: "dark",
        className: "dark",
        dataTheme: "dark",
        colorScheme: "dark",
      });
    });

    it("resolves light theme cookie", () => {
      const result = resolveServerTheme("light");
      expect(result).toEqual({
        initialTheme: "light",
        className: undefined,
        dataTheme: "light",
        colorScheme: "light",
      });
    });

    it("resolves named theme cookie (e.g. purple)", () => {
      const result = resolveServerTheme("purple");
      expect(result).toEqual({
        initialTheme: "purple",
        className: "theme-purple",
        dataTheme: "light",
        colorScheme: "light",
      });
    });

    it("defaults to system when cookie is missing or invalid", () => {
      const missing = resolveServerTheme(undefined);
      expect(missing).toEqual({
        initialTheme: "system",
        className: undefined,
        dataTheme: undefined,
        colorScheme: undefined,
      });

      const invalid = resolveServerTheme("nonexistent");
      expect(invalid).toEqual({
        initialTheme: "system",
        className: undefined,
        dataTheme: undefined,
        colorScheme: undefined,
      });
    });
  });
});
