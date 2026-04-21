import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";


import { ReceiptWorkspace } from "@/contents/home/ReceiptWorkspace";
import { availableModels } from "@/test/fixtures";
import { mockAuthState } from "@/test/mock-state";
import { renderWithProviders } from "@/test/render";

import type { PropsWithChildren } from "react";

type MockSelectProps = PropsWithChildren<{
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    value?: string;
}>;

type MockSelectOptionProps = PropsWithChildren<{ value: string }>;

type MockSelectValueProps = { placeholder?: string };

type MockDialogProps = PropsWithChildren<{ open?: boolean }>;

jest.mock("@/components/ui/select", () => ({
    Select: ({ children, onValueChange, value, disabled }: MockSelectProps) => (
        <select
            aria-label="mock-select"
            disabled={disabled}
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

jest.mock("@/components/ui/dialog", () => ({
    Dialog: ({ children, open }: MockDialogProps) => (open ? <div>{children}</div> : null),
    DialogContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DialogDescription: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DialogHeader: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DialogTitle: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

const createResponse = (body: string, ok = true) =>
    ({
        ok,
        text: jest.fn().mockResolvedValue(body),
    }) as unknown as Response;

describe("ReceiptWorkspace", () => {
    it("renders placeholder panels before a file is selected", () => {
        renderWithProviders(<ReceiptWorkspace availableModels={availableModels} />, {
            withWorkspaceProvider: true,
        });

        expect(screen.getByText("receipt.previewPlaceholder")).toBeInTheDocument();
        expect(screen.getByText("receipt.resultPlaceholder")).toBeInTheDocument();
    });

    it("rejects invalid files", async () => {
        const { container } = renderWithProviders(
            <ReceiptWorkspace availableModels={availableModels} />,
            { withWorkspaceProvider: true },
        );

        const input = container.querySelector("input[type='file']") as HTMLInputElement;
        const invalidFile = new File(["pdf"], "receipt.pdf", { type: "application/pdf" });

        fireEvent.change(input, { target: { files: [invalidFile] } });

        expect(await screen.findByText("receipt.errors.invalidImage")).toBeInTheDocument();
    });

    it("shows an error when submitting without a file", async () => {
        const { container } = renderWithProviders(
            <ReceiptWorkspace availableModels={availableModels} />,
            {
                withWorkspaceProvider: true,
            },
        );

        fireEvent.submit(container.querySelector("form") as HTMLFormElement);

        expect(await screen.findByText("receipt.errors.noFile")).toBeInTheDocument();
    });

    it("extracts a receipt, toggles raw response, and saves groceries", async () => {
        mockAuthState.status = "authenticated";
        mockAuthState.session = {
            expires: "2026-05-01T00:00:00.000Z",
            user: { email: "person@example.com" },
        };
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(
                createResponse(
                    JSON.stringify({
                        backend: "hf-api",
                        modelId: "test-model",
                        items: [
                            {
                                item: "Milk",
                                normalizedItem: "milk",
                                category: "dairy",
                                quantity: 2,
                                unitPrice: 3.5,
                                lineTotal: 7,
                            },
                        ],
                        rawResponse: "raw-output",
                    }),
                ),
            )
            .mockResolvedValueOnce(
                createResponse(
                    JSON.stringify({
                        savedCount: 1,
                        month: "2026-04",
                        receiptId: "saved-1",
                    }),
                ),
            );

        const { container } = renderWithProviders(
            <ReceiptWorkspace availableModels={availableModels} />,
            { withWorkspaceProvider: true },
        );

        const form = container.querySelector("form") as HTMLFormElement;
        const input = container.querySelector("input[type='file']") as HTMLInputElement;
        const file = new File(["image"], "receipt.png", { type: "image/png" });
        fireEvent.change(input, { target: { files: [file] } });
        await waitFor(() => {
            expect(screen.getAllByText("receipt.png").length).toBeGreaterThan(0);
        });

        fireEvent.submit(form);

        expect(await screen.findByText("Milk")).toBeInTheDocument();
        expect(screen.getByText("receipt.servedBy {\"backend\":\"hf-api\"}")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Show raw response" }));
        expect(screen.getByText("raw-output")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "receipt.saveGroceries" }));

        expect(await screen.findByText(/receipt.saveSuccess/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "receipt.openFreshDashboard" })).toHaveAttribute(
            "href",
            "/en/groceries?month=2026-04&saved=saved-1",
        );
    });

    it("supports editing a row and resetting the correction", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            createResponse(
                JSON.stringify({
                    backend: "hf-api",
                    modelId: "test-model",
                    items: [
                        {
                            item: "Milk",
                            normalizedItem: "milk",
                            category: "dairy",
                            quantity: 2,
                            unitPrice: 3.5,
                            lineTotal: 7,
                        },
                    ],
                    rawResponse: "raw-output",
                }),
            ),
        );

        const { container } = renderWithProviders(
            <ReceiptWorkspace availableModels={availableModels} />,
            { withWorkspaceProvider: true },
        );

        const form = container.querySelector("form") as HTMLFormElement;
        const input = container.querySelector("input[type='file']") as HTMLInputElement;
        fireEvent.change(input, {
            target: { files: [new File(["image"], "receipt.png", { type: "image/png" })] },
        });
        await waitFor(() => {
            expect(screen.getAllByText("receipt.png").length).toBeGreaterThan(0);
        });

        fireEvent.submit(form);
        await screen.findByText("Milk");
        await userEvent.click(screen.getByRole("button", { name: "receipt.alerts.adjust" }));

        const quantityInput = screen.getByRole("spinbutton");
        await userEvent.clear(quantityInput);
        await userEvent.type(quantityInput, "0");
        await userEvent.click(screen.getByRole("button", { name: "receipt.editor.apply" }));
        expect(await screen.findByText("receipt.errors.invalidQuantity")).toBeInTheDocument();

        await userEvent.clear(quantityInput);
        await userEvent.type(quantityInput, "3");
        await userEvent.click(screen.getByRole("button", { name: "receipt.editor.apply" }));

        expect(await screen.findByText("receipt.alerts.corrected")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "receipt.alerts.adjust" }));
        await userEvent.click(screen.getByRole("button", { name: "receipt.editor.reset" }));

        await waitFor(() => {
            expect(screen.queryByText("receipt.alerts.corrected")).not.toBeInTheDocument();
        });
    });

    it("surfaces extraction parsing failures", async () => {
        global.fetch = jest.fn().mockResolvedValue(createResponse("", true));

        const { container } = renderWithProviders(
            <ReceiptWorkspace availableModels={availableModels} />,
            { withWorkspaceProvider: true },
        );

        const form = container.querySelector("form") as HTMLFormElement;
        const input = container.querySelector("input[type='file']") as HTMLInputElement;
        fireEvent.change(input, {
            target: { files: [new File(["image"], "receipt.png", { type: "image/png" })] },
        });
        await waitFor(() => {
            expect(screen.getAllByText("receipt.png").length).toBeGreaterThan(0);
        });

        fireEvent.submit(form);

        expect(
            await screen.findByText("The server returned an empty response."),
        ).toBeInTheDocument();
    });
});