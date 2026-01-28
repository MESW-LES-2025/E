import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";

describe("Custom Select Component", () => {
  // Mock DOM methods that Radix UI Select needs
  beforeEach(() => {
    // Mock scrollIntoView
    HTMLElement.prototype.scrollIntoView = jest.fn();
    // Mock hasPointerCapture
    Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it("renders SelectGroup and SelectLabel", async () => {
    render(
      <Select defaultValue="1">
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Group 1</SelectLabel>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2">Option 2</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    // Open the select to see the content
    const trigger = screen.getByRole("combobox");
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    // Wait for the content to appear in the portal
    await waitFor(() => {
      expect(screen.getByText("Group 1")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("renders SelectSeparator", async () => {
    render(
      <Select defaultValue="1">
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectSeparator />
          <SelectItem value="2">Option 2</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Open the select to see the content
    const trigger = screen.getByRole("combobox");
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    // Wait for the content to appear and check for separator
    await waitFor(() => {
      const separator = document.querySelector('[data-slot="select-separator"]') ||
                       document.querySelector('[role="separator"]');
      expect(separator).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("handles value change", async () => {
    const onValueChange = jest.fn();

    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    // Wait for options to appear in the portal
    await waitFor(() => {
      expect(screen.getByText("Option 2")).toBeInTheDocument();
    }, { timeout: 2000 });

    const option2 = screen.getByText("Option 2");
    fireEvent.pointerDown(option2);
    fireEvent.click(option2);

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("2");
    });
  });

  it("renders with custom className", () => {
    render(
      <Select defaultValue="1">
        <SelectTrigger className="custom-class">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveClass("custom-class");
  });

  it("renders SelectLabel with custom className", async () => {
    render(
      <Select defaultValue="1">
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="custom-label-class">
              Custom Label
            </SelectLabel>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    // Open the select to see the content
    const trigger = screen.getByRole("combobox");
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    // Wait for content to be rendered (SelectContent uses Portal)
    await waitFor(() => {
      const label = screen.getByText("Custom Label");
      expect(label).toHaveClass("custom-label-class");
    }, { timeout: 2000 });
  });
});
