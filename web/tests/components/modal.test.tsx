import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

vi.mock("lucide-react", () => ({
  X: (props: Record<string, unknown>) => React.createElement("span", { "data-testid": "x-icon", ...props }),
}));

import { Modal } from "../../src/components/ui/modal";

afterEach(cleanup);

describe("Modal", () => {
  it("does not render when open is false", () => {
    render(<Modal open={false} onClose={() => {}}>Content</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open is true", () => {
    render(<Modal open={true} onClose={() => {}}>Content</Modal>);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("has role=dialog and aria-modal=true", () => {
    render(<Modal open={true} onClose={() => {}}>Content</Modal>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders the title", () => {
    render(<Modal open={true} onClose={() => {}} title="My Title">Body</Modal>);
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose}>Content</Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="Title">Content</Modal>);
    const closeBtn = screen.getByLabelText("Close");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose}>Content</Modal>);
    const backdrop = screen.getByRole("dialog").querySelector("[aria-hidden='true']");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
