import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

afterEach(cleanup);
import { Skeleton, CardSkeleton } from "../../src/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders with aria-hidden", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("applies rounded-full class when circle is true", () => {
    const { container } = render(<Skeleton circle />);
    expect(container.firstChild).toHaveClass("rounded-full");
  });

  it("applies default rounded class when circle is false", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass("rounded-[var(--radius-md)]");
  });

  it("applies animate-pulse class", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass("animate-pulse");
  });
});

describe("CardSkeleton", () => {
  it("renders sub-skeleton elements", () => {
    const { container } = render(<CardSkeleton />);
    const skeletons = container.querySelectorAll("[aria-hidden='true']");
    expect(skeletons.length).toBe(3);
  });
});
