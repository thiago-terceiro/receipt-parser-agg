import { render, screen, waitFor } from "@testing-library/react";

import {
    LocaleEffects,
    syncDocumentLocale,
    useLocale,
    useTranslations,
} from "@/components/locale-utils";
import { mockIntlState } from "@/test/mock-state";

describe("locale-utils", () => {
    it("applies the selected locale to the document", () => {
        syncDocumentLocale("pt-BR");

        expect(document.documentElement.lang).toBe("pt-BR");
    });

    it("applies locale side effects through LocaleEffects", async () => {
        mockIntlState.locale = "es";

        render(
            <LocaleEffects>
                <div>content</div>
            </LocaleEffects>,
        );

        await waitFor(() => {
            expect(document.documentElement.lang).toBe("es");
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