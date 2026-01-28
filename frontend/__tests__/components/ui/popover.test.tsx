import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";

describe("Popover Components", () => {
  it("renders Popover with trigger and content", () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );

    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders PopoverAnchor", () => {
    render(
      <Popover>
        <PopoverAnchor>Anchor</PopoverAnchor>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );

    expect(screen.getByText("Anchor")).toBeInTheDocument();
  });
});
