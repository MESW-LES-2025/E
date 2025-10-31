import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Home from "../app/page";

describe("Home Page", () => {
  it("renders the welcome message", () => {
    render(<Home />);
    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
    expect(screen.getByText("Welcome to the home page!")).toBeInTheDocument();
  });
});
