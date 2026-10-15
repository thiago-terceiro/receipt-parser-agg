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

const boardFixtures = [
    {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Home dashboard",
        ownerUserId: "user-1",
        role: "owner",
        joinedAt: "2026-04-01T00:00:00.000Z",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
        archivedAt: null,
    },
    {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Shared dashboard",
        ownerUserId: "user-2",
        role: "editor",
        joinedAt: "2026-04-03T00:00:00.000Z",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: "2026-04-04T00:00:00.000Z",
        archivedAt: null,
    },
] as const;

const createSessionStorageStore = () => {
    const storage = new Map<string, string>();

    (window.sessionStorage.getItem as jest.Mock).mockImplementation((key: string) =>
        storage.get(key) ?? null,
    );
    (window.sessionStorage.setItem as jest.Mock).mockImplementation(
        (key: string, value: string) => {
            storage.set(key, value);
        },
    );
    (window.sessionStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
        storage.delete(key);
    });

    return storage;
};

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
        const invalidFile = new File(["notes"], "notes.txt", { type: "text/plain" });

        fireEvent.change(input, { target: { files: [invalidFile] } });

        expect(await screen.findByText("receipt.errors.invalidImage")).toBeInTheDocument();
    });

    it("accepts pdf files", async () => {
        const { container } = renderWithProviders(
            <ReceiptWorkspace availableModels={availableModels} />,
            { withWorkspaceProvider: true },
        );

        const input = container.querySelector("input[type='file']") as HTMLInputElement;
        const pdfFile = new File(["pdf"], "receipt.pdf", { type: "application/pdf" });

        fireEvent.change(input, { target: { files: [pdfFile] } });

        await waitFor(() => {
            expect(screen.getAllByText("receipt.pdf").length).toBeGreaterThan(0);
        });
        expect(
            container.querySelector('object[type="application/pdf"]'),
        ).toBeInTheDocument();
        expect(screen.queryByText("receipt.errors.invalidImage")).not.toBeInTheDocument();
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

    it("extracts a receipt, selects a dashboard, and saves groceries", async () => {
        createSessionStorageStore();
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
                        currencyCode: "EUR",
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
                        boards: boardFixtures,
                    }),
                ),
            )
            .mockResolvedValueOnce(
                createResponse(
                    JSON.stringify({
                        boardId: boardFixtures[1].id,
                        savedCount: 2,
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

        expect((await screen.findAllByText("Milk"))[0]).toBeInTheDocument();
        expect(screen.getByText("receipt.servedBy {\"backend\":\"hf-api\"}")).toBeInTheDocument();
        expect(
            screen.getByText('receipt.total {"amount":"€7.00"}'),
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Show raw response" })).not.toBeInTheDocument();
        expect(screen.getByText("receipt.selectDashboard")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getAllByRole("combobox")[1]).not.toBeDisabled();
        });

        await userEvent.selectOptions(
            screen.getAllByRole("combobox")[1],
            boardFixtures[1].id,
        );

        await userEvent.click(screen.getByRole("button", { name: "receipt.addManualItem" }));
        await userEvent.type(screen.getByRole("textbox", { name: "receipt.editor.item" }), "Bananas");
        await userEvent.clear(screen.getByRole("spinbutton", { name: "receipt.editor.quantity" }));
        await userEvent.type(screen.getByRole("spinbutton", { name: "receipt.editor.quantity" }), "3");
        await userEvent.type(screen.getByRole("spinbutton", { name: "receipt.editor.unitPrice" }), "1.5");
        await userEvent.click(screen.getByRole("button", { name: "receipt.editor.addManual" }));

        expect((await screen.findAllByText("Bananas"))[0]).toBeInTheDocument();
        expect(screen.getAllByText("receipt.alerts.manual")[0]).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "receipt.saveGroceries" }));

        const saveRequest = (global.fetch as jest.Mock).mock.calls[2][1] as {
            body?: string;
        };

        expect(JSON.parse(saveRequest.body ?? "null")).toEqual({
            boardId: boardFixtures[1].id,
            currencyCode: "EUR",
            items: [
                {
                    item: "Milk",
                    normalizedItem: "milk",
                    category: "dairy",
                    quantity: 2,
                    unitPrice: 3.5,
                    lineTotal: 7,
                },
                {
                    item: "Bananas",
                    normalizedItem: "bananas",
                    category: "other",
                    quantity: 3,
                    unitPrice: 1.5,
                    lineTotal: 4.5,
                },
            ],
            sourceFileName: "receipt.png",
            modelId: "test-model",
        });

        expect(await screen.findByText(/receipt.saveSuccess/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "receipt.openFreshDashboard" })).toHaveAttribute(
            "href",
            `/en/groceries?board=${boardFixtures[1].id}&month=2026-04&saved=saved-1`,
        );
    });

    it("restores the last unsaved extracted receipt after remounting", async () => {
        createSessionStorageStore();
        global.fetch = jest.fn().mockResolvedValue(
            createResponse(
                JSON.stringify({
                    backend: "hf-api",
                    currencyCode: "EUR",
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

        const firstRender = renderWithProviders(
            <ReceiptWorkspace availableModels={availableModels} />,
            { withWorkspaceProvider: true },
        );

        const form = firstRender.container.querySelector("form") as HTMLFormElement;
        const input = firstRender.container.querySelector("input[type='file']") as HTMLInputElement;
        fireEvent.change(input, {
            target: { files: [new File(["image"], "receipt.png", { type: "image/png" })] },
        });
        await waitFor(() => {
            expect(screen.getAllByText("receipt.png").length).toBeGreaterThan(0);
        });

        fireEvent.submit(form);
        expect((await screen.findAllByText("Milk"))[0]).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "receipt.addManualItem" }));
        await userEvent.type(screen.getByRole("textbox", { name: "receipt.editor.item" }), "Bananas");
        await userEvent.type(screen.getByRole("spinbutton", { name: "receipt.editor.unitPrice" }), "1.5");
        await userEvent.click(screen.getByRole("button", { name: "receipt.editor.addManual" }));
        expect((await screen.findAllByText("Bananas"))[0]).toBeInTheDocument();

        await waitFor(() => {
            expect(window.sessionStorage.setItem).toHaveBeenCalled();
        });

        firstRender.unmount();

        renderWithProviders(<ReceiptWorkspace availableModels={availableModels} />, {
            withWorkspaceProvider: true,
        });

        expect((await screen.findAllByText("Milk"))[0]).toBeInTheDocument();
        expect(screen.getAllByText("Bananas")[0]).toBeInTheDocument();
        expect(screen.getAllByText("receipt.png").length).toBeGreaterThan(0);
        expect(screen.getByRole("link", { name: "receipt.openDashboard" })).toHaveAttribute(
            "href",
            "/en/groceries",
        );
    });

    it("supports editing a row and resetting the correction", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            createResponse(
                JSON.stringify({
                    backend: "hf-api",
                    currencyCode: "EUR",
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
        await screen.findAllByText("Milk");
        await userEvent.click(screen.getAllByRole("button", { name: "receipt.alerts.adjust" })[0]);

        const quantityInput = screen.getByRole("spinbutton");
        await userEvent.clear(quantityInput);
        await userEvent.type(quantityInput, "0");
        await userEvent.click(screen.getByRole("button", { name: "receipt.editor.apply" }));
        expect(await screen.findByText("receipt.errors.invalidQuantity")).toBeInTheDocument();

        await userEvent.clear(quantityInput);
        await userEvent.type(quantityInput, "3");
        await userEvent.click(screen.getByRole("button", { name: "receipt.editor.apply" }));

        expect((await screen.findAllByText("receipt.alerts.corrected"))[0]).toBeInTheDocument();

        await userEvent.click(screen.getAllByRole("button", { name: "receipt.alerts.adjust" })[0]);
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