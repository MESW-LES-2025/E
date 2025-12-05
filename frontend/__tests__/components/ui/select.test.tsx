import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

describe("Custom Select Component", () => {
  it("renders SelectTrigger and SelectValue", () => {
    render(
      <Select defaultValue="1">
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole("combobox"); // role="combobox" for Radix SelectTrigger
    expect(trigger).toBeInTheDocument();

    // Find by slot text
    expect(screen.getByText("Option 1")).toBeInTheDocument();
  });
});
