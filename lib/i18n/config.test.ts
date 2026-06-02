import { normalizeLegacyLocalePathname } from "@/lib/i18n/config";

describe("normalizeLegacyLocalePathname", () => {
    it("normalizes legacy Portuguese locale prefixes", () => {
        expect(normalizeLegacyLocalePathname("/pt")).toBe("/pt-br");
        expect(normalizeLegacyLocalePathname("/pt/")).toBe("/pt-br/");
        expect(normalizeLegacyLocalePathname("/pt/groceries")).toBe("/pt-br/groceries");
        expect(normalizeLegacyLocalePathname("/pt_br/groceries")).toBe(
            "/pt-br/groceries",
        );
        expect(normalizeLegacyLocalePathname("/pt-BR/groceries")).toBe(
            "/pt-br/groceries",
        );
    });

    it("leaves current and unrelated paths alone", () => {
        expect(normalizeLegacyLocalePathname("/pt-br/groceries")).toBeNull();
        expect(normalizeLegacyLocalePathname("/en/groceries")).toBeNull();
        expect(normalizeLegacyLocalePathname("/invite")).toBeNull();
    });
});