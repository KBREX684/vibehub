import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

afterEach(cleanup);
import { Card, CardHeader, CardBody, CardFooter } from "../../src/components/ui/card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Content</Card>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("uses bg-surface by default", () => {
    render(<Card>Default</Card>);
    expect(screen.getByText("Default")).toHaveClass("bg-[var(--color-bg-surface)]");
  });

  it("uses bg-elevated when elevated is true", () => {
    render(<Card elevated>Elevated</Card>);
    expect(screen.getByText("Elevated")).toHaveClass("bg-[var(--color-bg-elevated)]");
  });

  it("includes hover class by default", () => {
    render(<Card>Hoverable</Card>);
    expect(screen.getByText("Hoverable").className).toContain("hover:border-[var(--color-border-strong)]");
  });

  it("removes hover class when noHover is true", () => {
    render(<Card noHover>Static</Card>);
    expect(screen.getByText("Static").className).not.toContain("hover:border-[var(--color-border-strong)]");
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("CardHeader", () => {
  it("renders children", () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText("Header")).toBeInTheDocument();
  });
});

describe("CardBody", () => {
  it("renders children", () => {
    render(<CardBody>Body</CardBody>);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});

describe("CardFooter", () => {
  it("renders children", () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });
});
