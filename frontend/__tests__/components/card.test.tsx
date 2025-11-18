import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "../../components/ui/card";

describe("Card Components", () => {
  describe("Card", () => {
    it("should render children and apply default attributes", () => {
      render(<Card>Card Content</Card>);
      const cardElement = screen.getByText("Card Content");
      expect(cardElement).toBeInTheDocument();
      expect(cardElement).toHaveAttribute("data-slot", "card");
      expect(cardElement).toHaveClass("bg-card text-card-foreground");
    });

    it("should merge className prop", () => {
      render(<Card className="custom-class">Card Content</Card>);
      expect(screen.getByText("Card Content")).toHaveClass("custom-class");
    });
  });

  describe("CardHeader", () => {
    it("should render children and apply default attributes", () => {
      render(<CardHeader>Header Content</CardHeader>);
      const headerElement = screen.getByText("Header Content");
      expect(headerElement).toBeInTheDocument();
      expect(headerElement).toHaveAttribute("data-slot", "card-header");
      expect(headerElement).toHaveClass("grid");
    });

    it("should merge className prop", () => {
      render(<CardHeader className="custom-class">Header Content</CardHeader>);
      expect(screen.getByText("Header Content")).toHaveClass("custom-class");
    });
  });

  describe("CardTitle", () => {
    it("should render children and apply default attributes", () => {
      render(<CardTitle>Title Content</CardTitle>);
      const titleElement = screen.getByText("Title Content");
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveAttribute("data-slot", "card-title");
      expect(titleElement).toHaveClass("font-semibold");
    });

    it("should merge className prop", () => {
      render(<CardTitle className="custom-class">Title Content</CardTitle>);
      expect(screen.getByText("Title Content")).toHaveClass("custom-class");
    });
  });

  describe("CardDescription", () => {
    it("should render children and apply default attributes", () => {
      render(<CardDescription>Description Content</CardDescription>);
      const descriptionElement = screen.getByText("Description Content");
      expect(descriptionElement).toBeInTheDocument();
      expect(descriptionElement).toHaveAttribute(
        "data-slot",
        "card-description",
      );
      expect(descriptionElement).toHaveClass("text-muted-foreground");
    });

    it("should merge className prop", () => {
      render(
        <CardDescription className="custom-class">
          Description Content
        </CardDescription>,
      );
      expect(screen.getByText("Description Content")).toHaveClass(
        "custom-class",
      );
    });
  });

  describe("CardAction", () => {
    it("should render children and apply default attributes", () => {
      render(<CardAction>Action Content</CardAction>);
      const actionElement = screen.getByText("Action Content");
      expect(actionElement).toBeInTheDocument();
      expect(actionElement).toHaveAttribute("data-slot", "card-action");
      expect(actionElement).toHaveClass("col-start-2");
    });

    it("should merge className prop", () => {
      render(<CardAction className="custom-class">Action Content</CardAction>);
      expect(screen.getByText("Action Content")).toHaveClass("custom-class");
    });
  });

  describe("CardContent", () => {
    it("should render children and apply default attributes", () => {
      render(<CardContent>Main Content</CardContent>);
      const contentElement = screen.getByText("Main Content");
      expect(contentElement).toBeInTheDocument();
      expect(contentElement).toHaveAttribute("data-slot", "card-content");
      expect(contentElement).toHaveClass("px-6");
    });

    it("should merge className prop", () => {
      render(<CardContent className="custom-class">Main Content</CardContent>);
      expect(screen.getByText("Main Content")).toHaveClass("custom-class");
    });
  });

  describe("CardFooter", () => {
    it("should render children and apply default attributes", () => {
      render(<CardFooter>Footer Content</CardFooter>);
      const footerElement = screen.getByText("Footer Content");
      expect(footerElement).toBeInTheDocument();
      expect(footerElement).toHaveAttribute("data-slot", "card-footer");
      expect(footerElement).toHaveClass("flex items-center px-6");
    });

    it("should merge className prop", () => {
      render(<CardFooter className="custom-class">Footer Content</CardFooter>);
      expect(screen.getByText("Footer Content")).toHaveClass("custom-class");
    });
  });
});
