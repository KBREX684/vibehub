import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { Button } from "../../src/components/ui/button";

afterEach(cleanup);

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    const { rerender } = render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass("bg-[var(--color-primary)]");

    rerender(<Button variant="destructive">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass("bg-[var(--color-error-subtle)]");

    rerender(<Button variant="apple">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass("bg-[var(--color-accent-apple)]");
  });

  it("applies size classes", () => {
    const { rerender } = render(<Button size="sm">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass("px-3");

    rerender(<Button size="lg">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass("px-6");
  });

  it("shows spinner and disables button when loading", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toBeDisabled();
    expect(btn.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("disables when disabled prop is set", () => {
    render(<Button disabled>No</Button>);
    expect(screen.getByRole("button", { name: "No" })).toBeDisabled();
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("calls onClick handler", () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Press</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Press" }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("defaults to secondary variant and md size", () => {
    render(<Button>Default</Button>);
    const btn = screen.getByRole("button", { name: "Default" });
    expect(btn).toHaveClass("bg-transparent");
    expect(btn).toHaveClass("px-4");
  });
});
