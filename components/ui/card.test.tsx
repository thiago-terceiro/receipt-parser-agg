import { render, screen } from "@testing-library/react";

import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

describe("Card", () => {
    it("renders the full card subcomponent structure", () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>Receipt</CardTitle>
                    <CardDescription>Details</CardDescription>
                    <CardAction>Action</CardAction>
                </CardHeader>
                <CardContent>Content</CardContent>
                <CardFooter>Footer</CardFooter>
            </Card>,
        );

        expect(screen.getByText("Receipt")).toHaveAttribute("data-slot", "card-title");
        expect(screen.getByText("Details")).toHaveAttribute(
            "data-slot",
            "card-description",
        );
        expect(screen.getByText("Action")).toHaveAttribute("data-slot", "card-action");
        expect(screen.getByText("Content")).toHaveAttribute("data-slot", "card-content");
        expect(screen.getByText("Footer")).toHaveAttribute("data-slot", "card-footer");
    });
});