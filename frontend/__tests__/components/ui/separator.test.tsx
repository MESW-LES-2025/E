import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { Separator } from "../../../components/ui/separator";

describe("Separator Component", () => {
  it("should render with default props", () => {
    const { container } = render(<Separator />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
  });

  it("should render with horizontal orientation", () => {
    const { container } = render(<Separator orientation="horizontal" />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
    // Radix UI doesn't expose orientation as HTML attribute, but component accepts it
  });

  it("should render with vertical orientation", () => {
    const { container } = render(<Separator orientation="vertical" />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
  });

  it("should render with decorative prop", () => {
    const { container } = render(<Separator decorative={true} />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
  });

  it("should render with decorative false", () => {
    const { container } = render(<Separator decorative={false} />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<Separator className="custom-class" />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toHaveClass("custom-class");
  });
});
