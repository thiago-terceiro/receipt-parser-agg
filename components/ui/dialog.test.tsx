import { render, screen } from "@testing-library/react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

describe("Dialog", () => {
    it("renders trigger and open content", () => {
        render(
            <Dialog open>
                <DialogTrigger>Open</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editor</DialogTitle>
                        <DialogDescription>Dialog body</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>,
        );

        expect(screen.getByText("Open")).toHaveAttribute("data-slot", "dialog-trigger");
        expect(screen.getByText("Editor")).toBeInTheDocument();
        expect(screen.getByText("Dialog body")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });
});