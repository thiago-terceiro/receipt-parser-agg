import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarDays } from "lucide-react";


import { GroceriesDashboardSummarySection } from "@/contents/groceries-dashboard/GroceriesDashboardSummarySection";
import { makeMonthPayload, monthOptions } from "@/test/fixtures";
import { createTestTranslations } from "@/test/mock-state";

import type { PropsWithChildren } from "react";

type MockSelectProps = PropsWithChildren<{
    onValueChange?: (value: string) => void;
    value?: string;
}>;

type MockSelectOptionProps = PropsWithChildren<{ value: string }>;

type MockSelectValueProps = { placeholder?: string };

jest.mock("@/components/ui/select", () => ({
    Select: ({ children, onValueChange, value }: MockSelectProps) => (
        <select
            aria-label="month-select"
            onChange={(event) => onValueChange?.(event.target.value)}
            value={value}
        >
            {children}
        </select>
    ),
    SelectContent: ({ children }: PropsWithChildren) => <>{children}</>,
    SelectItem: ({ children, value }: MockSelectOptionProps) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
    SelectValue: ({ placeholder }: MockSelectValueProps) => <option value="">{placeholder}</option>,
}));

describe("GroceriesDashboardSummarySection", () => {
    const translations = createTestTranslations();
    const statCards = [{ label: "Month total", value: "$14.00", icon: CalendarDays }];

    it("renders month controls and disables next month when already current", async () => {
        const onMonthChange = jest.fn();

        render(
            <GroceriesDashboardSummarySection
                payload={makeMonthPayload()}
                currentMonth="2026-04"
                monthOptions={monthOptions}
                locale="en"
                statCards={statCards}
                translations={translations}
                onMonthChange={onMonthChange}
            />,
        );

        expect(screen.getByRole("link", { name: "groceries.previousMonth" })).toHaveAttribute(
            "href",
            "/en/groceries?month=2026-03",
        );
        expect(screen.getByRole("button", { name: "groceries.nextMonth" })).toBeDisabled();
        await userEvent.selectOptions(screen.getByLabelText("month-select"), "2026-03");
        expect(onMonthChange).toHaveBeenCalledWith("2026-03");
    });

    it("renders an enabled next-month link for historical views", () => {
        render(
            <GroceriesDashboardSummarySection
                payload={makeMonthPayload({ month: "2026-03" })}
                currentMonth="2026-04"
                monthOptions={monthOptions}
                locale="en"
                statCards={statCards}
                translations={translations}
                onMonthChange={jest.fn()}
            />,
        );

        expect(screen.getByRole("link", { name: "groceries.nextMonth" })).toHaveAttribute(
            "href",
            "/en/groceries",
        );
    });
});