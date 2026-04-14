import { render, screen } from "@testing-library/react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
    it("renders with the default slot metadata", () => {
        render(<Badge>Ready</Badge>);

        expect(screen.getByText("Ready")).toHaveAttribute("data-slot", "badge");
        expect(screen.getByText("Ready")).toHaveAttribute("data-variant", "default");
    });

    it("supports custom variants and asChild rendering", () => {
        render(
            <Badge asChild variant="link">
                <Link href="/status">Status</Link>
            </Badge>,
        );

        expect(screen.getByRole("link", { name: "Status" })).toHaveAttribute(
            "data-variant",
            "link",
        );
    });
});