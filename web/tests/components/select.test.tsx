import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

vi.mock("lucide-react", () => ({
  ChevronDown: (props: Record<string, unknown>) => React.createElement("span", { "data-testid": "chevron-icon", ...props }),
}));

import { Select } from "../../src/components/ui/select";

afterEach(cleanup);

describe("Select", () => {
  it("renders a select element", () => {
    render(
      <Select>
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows a label", () => {
    render(<Select label="Country"><option>US</option></Select>);
    expect(screen.getByText("Country")).toBeInTheDocument();
  });

  it("shows an error message", () => {
    render(<Select error="Pick one"><option>A</option></Select>);
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("auto-generates id from label", () => {
    render(<Select label="My Field"><option>X</option></Select>);
    expect(screen.getByLabelText("My Field")).toHaveAttribute("id", "my-field");
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLSelectElement>();
    render(<Select ref={ref}><option>A</option></Select>);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it("renders the chevron icon", () => {
    const { container } = render(<Select><option>A</option></Select>);
    expect(container.querySelector("[data-testid='chevron-icon']")).toBeInTheDocument();
  });
});
