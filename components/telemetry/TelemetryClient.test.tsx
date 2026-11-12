import { render, waitFor } from "@testing-library/react";

const mockInitializeBrowserTelemetry = jest.fn();

jest.mock("@/lib/browser-telemetry", () => ({
  initializeBrowserTelemetry: (...args: unknown[]) =>
    mockInitializeBrowserTelemetry(...args),
}));

import { TelemetryClient } from "./TelemetryClient";

describe("TelemetryClient", () => {
  beforeEach(() => {
    mockInitializeBrowserTelemetry.mockClear();
  });

  it("renders null and dynamically initializes browser telemetry after mount", async () => {
    const { container } = render(<TelemetryClient />);
    expect(container.firstChild).toBeNull();

    await waitFor(() => {
      expect(mockInitializeBrowserTelemetry).toHaveBeenCalledTimes(1);
    });
  });
});
