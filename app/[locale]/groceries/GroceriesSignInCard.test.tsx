import { render, screen } from "@testing-library/react";

import { GroceriesSignInCard } from "@/app/[locale]/groceries/GroceriesSignInCard";
import { createTestTranslations } from "@/test/mock-state";

describe("GroceriesSignInCard", () => {
    it("renders the sign-in message and localized home link", () => {
        const translations = createTestTranslations().groceries;

        render(
            <GroceriesSignInCard
                backToHomeLabel={translations.backToHome}
                description={translations.signInDescription}
                locale="es"
                title={translations.signInTitle}
            />,
        );

        expect(screen.getByText("groceries.signInTitle")).toBeInTheDocument();
        expect(screen.getByText("groceries.signInDescription")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "groceries.backToHome" })).toHaveAttribute(
            "href",
            "/es",
        );
    });
});