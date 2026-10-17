import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import LocaleError from "./error";

const mockUseParams = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

describe("app/[locale]/error.tsx", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    mockUseParams.mockReturnValue({ locale: "en" });
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it("renders localized English error message by default", () => {
    const reset = jest.fn();
    const error = new Error("Test render error");

    render(<LocaleError error={error} reset={reset} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(
      screen.getByText("An unexpected error occurred while loading this page."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
      "href",
      "/en",
    );
  });

  it("renders Spanish translation when locale is es", () => {
    mockUseParams.mockReturnValue({ locale: "es" });
    const reset = jest.fn();
    const error = new Error("Error en español");

    render(<LocaleError error={error} reset={reset} />);

    expect(screen.getByText("¡Algo salió mal!")).toBeInTheDocument();
    expect(
      screen.getByText("Ocurrió un error inesperado al cargar esta página."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Intentar de nuevo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute(
      "href",
      "/es",
    );
  });

  it("renders Portuguese translation when locale is pt-br", () => {
    mockUseParams.mockReturnValue({ locale: "pt-br" });
    const reset = jest.fn();
    const error = new Error("Erro em português");

    render(<LocaleError error={error} reset={reset} />);

    expect(screen.getByText("Algo deu errado!")).toBeInTheDocument();
    expect(
      screen.getByText("Ocorreu um erro inesperado ao carregar esta página."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para o início" })).toHaveAttribute(
      "href",
      "/pt-br",
    );
  });

  it("triggers reset callback when Try again button is clicked", () => {
    const reset = jest.fn();
    const error = new Error("Recoverable error");

    render(<LocaleError error={error} reset={reset} />);

    const tryAgainButton = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(tryAgainButton);

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("displays error digest when available", () => {
    const reset = jest.fn();
    const error = Object.assign(new Error("Server digest error"), {
      digest: "NEXT_ERROR_12345",
    });

    render(<LocaleError error={error} reset={reset} />);

    expect(screen.getByText("Digest: NEXT_ERROR_12345")).toBeInTheDocument();
  });
});
