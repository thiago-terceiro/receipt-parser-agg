import { render, screen } from "@testing-library/react";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

describe("Select", () => {
    it("renders the trigger metadata", () => {
        render(
            <Select>
                <SelectTrigger size="sm">
                    <SelectValue placeholder="Choose" />
                </SelectTrigger>
            </Select>,
        );

        expect(screen.getByRole("combobox")).toHaveAttribute("data-slot", "select-trigger");
        expect(screen.getByRole("combobox")).toHaveAttribute("data-size", "sm");
    });

    it("renders the open content tree", () => {
        render(
            <Select defaultOpen>
                <SelectTrigger>
                    <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                    <SelectScrollUpButton />
                    <SelectGroup>
                        <SelectLabel>Models</SelectLabel>
                        <SelectItem value="first">First</SelectItem>
                        <SelectSeparator />
                        <SelectItem value="second">Second</SelectItem>
                    </SelectGroup>
                    <SelectScrollDownButton />
                </SelectContent>
            </Select>,
        );

        expect(screen.getByText("Models")).toHaveAttribute("data-slot", "select-label");
        expect(screen.getByText("First")).toBeInTheDocument();
        expect(screen.getByText("Second")).toBeInTheDocument();
    });
});