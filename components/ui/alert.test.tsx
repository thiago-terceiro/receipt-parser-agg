import { render, screen } from "@testing-library/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

describe("Alert", () => {
    it("renders the default alert content", () => {
        render(
            <Alert>
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>Something happened.</AlertDescription>
            </Alert>,
        );

        expect(screen.getByRole("alert")).toHaveAttribute("data-slot", "alert");
        expect(screen.getByText("Warning")).toHaveAttribute(
            "data-slot",
            "alert-title",
        );
        expect(screen.getByText("Something happened.")).toHaveAttribute(
            "data-slot",
            "alert-description",
        );
    });

    it("applies the destructive variant", () => {
        render(<Alert variant="destructive">Error</Alert>);

        expect(screen.getByRole("alert")).toHaveAttribute(
            "class",
            expect.stringContaining("text-destructive"),
        );
    });
});