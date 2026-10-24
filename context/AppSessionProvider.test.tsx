import { render, screen } from "@testing-library/react";

import { AppSessionProvider } from "@/context/AppSessionProvider";
import { useReceiptWorkspaceState } from "@/context/ReceiptWorkspaceStateProvider";
import { useTheme } from "@/context/ThemeProvider";
import { defaultModelId } from "@/lib/receipt";

describe("AppSessionProvider", () => {
    it("composes the session, workspace, and theme providers", () => {
        const Probe = () => {
            const workspace = useReceiptWorkspaceState();
            const theme = useTheme();

            return (
                <div>
                    {workspace.selectedModelId}
                    {theme.theme}
                </div>
            );
        };

        render(
            <AppSessionProvider>
                <Probe />
            </AppSessionProvider>,
        );

        expect(screen.getByText(new RegExp(`${defaultModelId}system`))).toBeInTheDocument();
    });
});