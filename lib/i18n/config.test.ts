import {
    detectLocaleFromAcceptLanguage,
    normalizeLegacyLocalePathname,
} from "@/lib/i18n/config";

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

describe("detectLocaleFromAcceptLanguage", () => {
    it("defaults to 'en' when header is missing or empty", () => {
        expect(detectLocaleFromAcceptLanguage(null)).toBe("en");
        expect(detectLocaleFromAcceptLanguage(undefined)).toBe("en");
        expect(detectLocaleFromAcceptLanguage("")).toBe("en");
    });

    it("detects single language headers", () => {
        expect(detectLocaleFromAcceptLanguage("es")).toBe("es");
        expect(detectLocaleFromAcceptLanguage("pt-BR")).toBe("pt-BR");
        expect(detectLocaleFromAcceptLanguage("pt")).toBe("pt-BR");
        expect(detectLocaleFromAcceptLanguage("pt-PT")).toBe("pt-BR");
        expect(detectLocaleFromAcceptLanguage("en-US")).toBe("en");
    });

    it("sorts by q-factor weight and picks highest priority match", () => {
        expect(
            detectLocaleFromAcceptLanguage("es;q=0.9, en;q=0.8, pt-BR;q=0.1"),
        ).toBe("es");
        expect(
            detectLocaleFromAcceptLanguage("pt-BR;q=0.7, es;q=0.9, en;q=0.8"),
        ).toBe("es");
        expect(
            detectLocaleFromAcceptLanguage("en-US,en;q=0.9,es;q=0.8"),
        ).toBe("en");
        expect(
            detectLocaleFromAcceptLanguage("fr-FR,fr;q=0.9,pt-BR;q=0.8"),
        ).toBe("pt-BR");
        expect(
            detectLocaleFromAcceptLanguage("pt-PT;q=0.9, en;q=0.8"),
        ).toBe("pt-BR");
    });

    it("falls back to defaultLocale if no supported language is found", () => {
        expect(detectLocaleFromAcceptLanguage("fr-FR,fr;q=0.9,de;q=0.8")).toBe("en");
        expect(detectLocaleFromAcceptLanguage("*;q=0.1")).toBe("en");
    });
});