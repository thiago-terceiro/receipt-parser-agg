import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
    ReceiptWorkspaceStateProvider,
    useReceiptWorkspaceState,
} from "@/context/ReceiptWorkspaceStateProvider";

describe("ReceiptWorkspaceStateProvider", () => {
    it("throws when used without the provider", () => {
        const Probe = () => {
            useReceiptWorkspaceState();
            return null;
        };

        expect(() => render(<Probe />)).toThrow(
            "useReceiptWorkspaceState must be used within ReceiptWorkspaceStateProvider.",
        );
    });

    it("provides the default state and update functions", async () => {
        const file = new File(["receipt"], "receipt.png", { type: "image/png" });
        const manualItem = {
            item: "Bananas",
            normalizedItem: "bananas",
            category: "produce",
            quantity: 1,
            unitPrice: 4,
            lineTotal: 4,
        } as const;

        const Probe = () => {
            const state = useReceiptWorkspaceState();

            return (
                <>
                    <span>{state.selectedModelId}</span>
                    <span>{state.manualItems.length}</span>
                    <button type="button" onClick={() => state.setFile(file)}>
                        set file
                    </button>
                    <button type="button" onClick={() => state.setManualItems([manualItem])}>
                        add manual item
                    </button>
                    <span>{state.file?.name ?? "no-file"}</span>
                </>
            );
        };

        render(
            <ReceiptWorkspaceStateProvider defaultModelId="test-model">
                <Probe />
            </ReceiptWorkspaceStateProvider>,
        );

        expect(screen.getByText("test-model")).toBeInTheDocument();
        expect(screen.getByText("0")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "set file" }));
        await userEvent.click(screen.getByRole("button", { name: "add manual item" }));

        expect(screen.getByText("receipt.png")).toBeInTheDocument();
        expect(screen.getByText("1")).toBeInTheDocument();
    });
});