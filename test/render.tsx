import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { ReceiptWorkspaceStateProvider } from "@/context/ReceiptWorkspaceStateProvider";
import { ThemeProvider } from "@/context/ThemeProvider";

type ProviderOptions = RenderOptions & {
    defaultModelId?: string;
    withThemeProvider?: boolean;
    withWorkspaceProvider?: boolean;
};

const Providers = ({
    children,
    defaultModelId = "test-model",
    withThemeProvider = false,
    withWorkspaceProvider = false,
}: {
    children: ReactNode;
    defaultModelId?: string;
    withThemeProvider?: boolean;
    withWorkspaceProvider?: boolean;
}) => {
    let tree = <>{children}</>;

    if (withWorkspaceProvider) {
        tree = (
            <ReceiptWorkspaceStateProvider defaultModelId={defaultModelId}>
                {tree}
            </ReceiptWorkspaceStateProvider>
        );
    }

    if (withThemeProvider) {
        tree = <ThemeProvider>{tree}</ThemeProvider>;
    }

    return tree;
};

export const renderWithProviders = (
    ui: ReactElement,
    {
        defaultModelId,
        withThemeProvider,
        withWorkspaceProvider,
        ...options
    }: ProviderOptions = {},
) => {
    return render(ui, {
        wrapper: ({ children }) => (
            <Providers
                defaultModelId={defaultModelId}
                withThemeProvider={withThemeProvider}
                withWorkspaceProvider={withWorkspaceProvider}
            >
                {children}
            </Providers>
        ),
        ...options,
    });
};