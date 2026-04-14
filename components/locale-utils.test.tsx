import { render, screen, waitFor } from "@testing-library/react";

import {
    LocaleEffects,
    persistLocalePreference,
    useLocale,
    useTranslations,
} from "@/components/locale-utils";
import { mockIntlState } from "@/test/mock-state";

describe("locale-utils", () => {
    it("persists the selected locale", () => {
        persistLocalePreference("pt-BR");

        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            "receipt-ai-locale",
            "pt-BR",
        );
        expect(document.documentElement.lang).toBe("pt-BR");
        expect(document.cookie).toContain("receipt-ai-locale=pt-BR");
    });

    it("applies locale side effects through LocaleEffects", async () => {
        render(
            <LocaleEffects locale="es">
                <div>content</div>
            </LocaleEffects>,
        );

        await waitFor(() => {
            expect(window.localStorage.setItem).toHaveBeenCalledWith(
                "receipt-ai-locale",
                "es",
            );
        });
        expect(screen.getByText("content")).toBeInTheDocument();
    });

    it("exposes locale and message helpers from next-intl", () => {
        mockIntlState.locale = "es";

        const Probe = () => {
            const locale = useLocale();
            const translations = useTranslations();

            return (
                <div>
                    <span>{locale}</span>
                    <span>{translations.common.language}</span>
                    <span>{translations.receipt.total("$4.00")}</span>
                </div>
            );
        };

        render(<Probe />);

        expect(screen.getByText("es")).toBeInTheDocument();
        expect(screen.getByText("common.language")).toBeInTheDocument();
        expect(
            screen.getByText('receipt.total {"amount":"$4.00"}'),
        ).toBeInTheDocument();
    });
});