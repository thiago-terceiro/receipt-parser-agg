import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

describe("Select", () => {
  it("renders an accessible combobox, extracts nested JSX labels, and notifies on change", async () => {
    const onValueChange = jest.fn();

    render(
      <Select value="en" onValueChange={onValueChange}>
        <SelectTrigger
          className="min-w-[180px] rounded-full"
          aria-label="Language"
        >
          <SelectValue placeholder="Choose language" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="en">
              <span>
                <span aria-hidden="true">*</span>
                <span>English</span>
              </span>
            </SelectItem>
            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
            <SelectItem value="es" disabled>
              Español
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    const combobox = screen.getByRole("combobox", { name: "Language" });
    expect(combobox).toHaveValue("en");
    expect(screen.getByRole("option", { name: "*English" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Português (Brasil)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Español" })).toBeDisabled();

    await userEvent.selectOptions(combobox, "pt-BR");
    expect(onValueChange).toHaveBeenCalledWith("pt-BR");
  });

  it("supports disabled state and placeholder when uncontrolled", () => {
    render(
      <Select defaultValue="" disabled>
        <SelectTrigger aria-label="Board">
          <SelectValue placeholder="Select a board" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="b1">Home board</SelectItem>
        </SelectContent>
      </Select>,
    );

    const combobox = screen.getByRole("combobox", { name: "Board" });
    expect(combobox).toBeDisabled();
    const placeholderOption = screen.getByText("Select a board");
    expect(placeholderOption).toBeDisabled();
    expect(placeholderOption).toHaveAttribute("hidden");
  });
});
