import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
  FieldError,
  FieldSeparator,
  FieldTitle,
} from "../../../components/ui/field";

describe("Field Components", () => {
  describe("FieldSet", () => {
    it("should render FieldSet", () => {
      const { container } = render(
        <FieldSet>
          <legend>Test</legend>
        </FieldSet>,
      );
      const fieldset = container.querySelector('[data-slot="field-set"]');
      expect(fieldset).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <FieldSet className="custom-class">
          <legend>Test</legend>
        </FieldSet>,
      );
      const fieldset = container.querySelector('[data-slot="field-set"]');
      expect(fieldset).toHaveClass("custom-class");
    });
  });

  describe("FieldLegend", () => {
    it("should render FieldLegend with default variant", () => {
      const { container } = render(<FieldLegend>Legend</FieldLegend>);
      const legend = container.querySelector('[data-slot="field-legend"]');
      expect(legend).toBeInTheDocument();
      expect(legend).toHaveAttribute("data-variant", "legend");
      expect(legend).toHaveTextContent("Legend");
    });

    it("should render FieldLegend with label variant", () => {
      const { container } = render(
        <FieldLegend variant="label">Label</FieldLegend>,
      );
      const legend = container.querySelector('[data-slot="field-legend"]');
      expect(legend).toHaveAttribute("data-variant", "label");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <FieldLegend className="custom-class">Legend</FieldLegend>,
      );
      const legend = container.querySelector('[data-slot="field-legend"]');
      expect(legend).toHaveClass("custom-class");
    });
  });

  describe("FieldGroup", () => {
    it("should render FieldGroup", () => {
      const { container } = render(
        <FieldGroup>
          <div>Content</div>
        </FieldGroup>,
      );
      const group = container.querySelector('[data-slot="field-group"]');
      expect(group).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <FieldGroup className="custom-class">
          <div>Content</div>
        </FieldGroup>,
      );
      const group = container.querySelector('[data-slot="field-group"]');
      expect(group).toHaveClass("custom-class");
    });
  });

  describe("Field", () => {
    it("should render Field with default orientation", () => {
      const { container } = render(
        <Field>
          <FieldLabel>Label</FieldLabel>
        </Field>,
      );
      const field = container.querySelector('[data-slot="field"]');
      expect(field).toBeInTheDocument();
    });

    it("should render Field with horizontal orientation", () => {
      const { container } = render(
        <Field orientation="horizontal">
          <FieldLabel>Label</FieldLabel>
        </Field>,
      );
      const field = container.querySelector('[data-slot="field"]');
      expect(field).toHaveAttribute("data-orientation", "horizontal");
    });

    it("should render Field with vertical orientation", () => {
      const { container } = render(
        <Field orientation="vertical">
          <FieldLabel>Label</FieldLabel>
        </Field>,
      );
      const field = container.querySelector('[data-slot="field"]');
      expect(field).toHaveAttribute("data-orientation", "vertical");
    });

    it("should apply invalid state", () => {
      const { container } = render(
        <Field data-invalid="true">
          <FieldLabel>Label</FieldLabel>
        </Field>,
      );
      const field = container.querySelector('[data-slot="field"]');
      expect(field).toBeInTheDocument();
      // The data-invalid prop is passed through via {...props}
      // Check that the field has the data-invalid attribute set to "true"
      expect(field).toHaveAttribute("data-invalid", "true");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <Field className="custom-class">
          <FieldLabel>Label</FieldLabel>
        </Field>,
      );
      const field = container.querySelector('[data-slot="field"]');
      expect(field).toHaveClass("custom-class");
    });
  });

  describe("FieldLabel", () => {
    it("should render FieldLabel", () => {
      render(<FieldLabel>Test Label</FieldLabel>);
      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("should apply htmlFor attribute", () => {
      const { container } = render(
        <FieldLabel htmlFor="test-input">Label</FieldLabel>,
      );
      const label = container.querySelector('[data-slot="field-label"]');
      expect(label).toHaveAttribute("for", "test-input");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <FieldLabel className="custom-class">Label</FieldLabel>,
      );
      const label = container.querySelector('[data-slot="field-label"]');
      expect(label).toHaveClass("custom-class");
    });
  });

  describe("FieldDescription", () => {
    it("should render FieldDescription", () => {
      render(<FieldDescription>Description text</FieldDescription>);
      expect(screen.getByText("Description text")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <FieldDescription className="custom-class">
          Description
        </FieldDescription>,
      );
      const desc = container.querySelector('[data-slot="field-description"]');
      expect(desc).toHaveClass("custom-class");
    });
  });

  describe("FieldContent", () => {
    it("should render FieldContent", () => {
      const { container } = render(
        <FieldContent>
          <div>Content</div>
        </FieldContent>,
      );
      const content = container.querySelector('[data-slot="field-content"]');
      expect(content).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <FieldContent className="custom-class">
          <div>Content</div>
        </FieldContent>,
      );
      const content = container.querySelector('[data-slot="field-content"]');
      expect(content).toHaveClass("custom-class");
    });
  });

  describe("FieldError", () => {
    it("should render FieldError with children", () => {
      render(<FieldError>Error text</FieldError>);
      expect(screen.getByText("Error text")).toBeInTheDocument();
    });

    it("should render FieldError with errors array (single error)", () => {
      render(<FieldError errors={[{ message: "Single error message" }]} />);
      expect(screen.getByText("Single error message")).toBeInTheDocument();
    });

    it("should render FieldError with errors array (multiple errors)", () => {
      render(
        <FieldError
          errors={[
            { message: "Error 1" },
            { message: "Error 2" },
            { message: "Error 1" }, // Duplicate
          ]}
        />,
      );
      expect(screen.getByText("Error 1")).toBeInTheDocument();
      expect(screen.getByText("Error 2")).toBeInTheDocument();
    });

    it("should not render FieldError when no children or errors", () => {
      const { container } = render(<FieldError errors={[]} />);
      const error = container.querySelector('[data-slot="field-error"]');
      expect(error).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <FieldError className="custom-class">Error</FieldError>,
      );
      const error = container.querySelector('[data-slot="field-error"]');
      expect(error).toHaveClass("custom-class");
    });
  });

  describe("FieldSeparator", () => {
    it("should render FieldSeparator without children", () => {
      const { container } = render(<FieldSeparator />);
      const separator = container.querySelector(
        '[data-slot="field-separator"]',
      );
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute("data-content", "false");
    });

    it("should render FieldSeparator with children", () => {
      const { container } = render(
        <FieldSeparator>Separator text</FieldSeparator>,
      );
      const separator = container.querySelector(
        '[data-slot="field-separator"]',
      );
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute("data-content", "true");
      expect(screen.getByText("Separator text")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(<FieldSeparator className="custom-class" />);
      const separator = container.querySelector(
        '[data-slot="field-separator"]',
      );
      expect(separator).toHaveClass("custom-class");
    });
  });

  describe("FieldTitle", () => {
    it("should render FieldTitle", () => {
      const { container } = render(<FieldTitle>Title</FieldTitle>);
      const title = container.querySelector('[data-slot="field-label"]');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("Title");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <FieldTitle className="custom-class">Title</FieldTitle>,
      );
      const title = container.querySelector('[data-slot="field-label"]');
      expect(title).toHaveClass("custom-class");
    });
  });
});
