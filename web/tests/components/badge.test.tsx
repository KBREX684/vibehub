import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

afterEach(cleanup);
import { Badge } from "../../src/components/ui/badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    const { rerender } = render(<Badge variant="success">OK</Badge>);
    expect(screen.getByText("OK")).toHaveClass("bg-[var(--color-success-subtle)]");

    rerender(<Badge variant="error">Fail</Badge>);
    expect(screen.getByText("Fail")).toHaveClass("bg-[var(--color-error-subtle)]");

    rerender(<Badge variant="apple">Apple</Badge>);
    expect(screen.getByText("Apple")).toHaveClass("bg-[var(--color-accent-apple-subtle)]");
  });

  it("applies pill rounded class when pill=true", () => {
    render(<Badge pill>Pill</Badge>);
    expect(screen.getByText("Pill")).toHaveClass("rounded-[var(--radius-pill)]");
  });

  it("applies non-pill rounded class by default", () => {
    render(<Badge>Normal</Badge>);
    expect(screen.getByText("Normal")).toHaveClass("rounded-[var(--radius-sm)]");
  });

  it("defaults to default variant", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toHaveClass("bg-[var(--color-bg-elevated)]");
  });
});
