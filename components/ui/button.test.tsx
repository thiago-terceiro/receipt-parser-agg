import { render, screen } from "@testing-library/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

describe("Button", () => {
    it("renders with the selected size and variant metadata", () => {
        render(
            <Button size="sm" variant="secondary">
                Save
            </Button>,
        );

        expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
            "data-size",
            "sm",
        );
        expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
            "data-variant",
            "secondary",
        );
    });

    it("supports slot rendering through asChild", () => {
        render(
            <Button asChild variant="link">
                <Link href="/home">Home</Link>
            </Button>,
        );

        expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
            "data-slot",
            "button",
        );
    });
});