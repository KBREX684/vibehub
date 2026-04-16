import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(cleanup);
import * as ui from "../../src/components/ui/index";

describe("Barrel exports (index.ts)", () => {
  const expectedExports = [
    "Button",
    "Input",
    "Textarea",
    "Badge",
    "Card",
    "CardHeader",
    "CardBody",
    "CardFooter",
    "Skeleton",
    "CardSkeleton",
    "Modal",
    "Select",
    "Dropdown",
    "DropdownItem",
  ];

  it.each(expectedExports)("exports %s", (name) => {
    expect(ui).toHaveProperty(name);
    expect((ui as Record<string, unknown>)[name]).toBeDefined();
  });
});
