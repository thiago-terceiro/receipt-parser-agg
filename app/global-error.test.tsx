import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import GlobalError from "./global-error";

describe("app/global-error.tsx", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it("renders global error boundary layout and content", () => {
    const reset = jest.fn();
    const error = new Error("Fatal root layout crash");

    render(<GlobalError error={error} reset={reset} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(
      screen.getByText("A critical application error occurred."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("triggers reset callback when Try again is clicked", () => {
    const reset = jest.fn();
    const error = new Error("Crash");

    render(<GlobalError error={error} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("displays error digest when available", () => {
    const reset = jest.fn();
    const error = Object.assign(new Error("Crash with digest"), {
      digest: "DIGEST_999",
    });

    render(<GlobalError error={error} reset={reset} />);

    expect(screen.getByText("Digest: DIGEST_999")).toBeInTheDocument();
  });
});
