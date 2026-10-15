import { render } from "@testing-library/react";

import { TelemetryClient } from "./TelemetryClient";

describe("TelemetryClient", () => {
  it("renders null without throwing", () => {
    const { container } = render(<TelemetryClient />);
    expect(container.firstChild).toBeNull();
  });
});
