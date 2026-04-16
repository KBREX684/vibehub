import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

afterEach(cleanup);
import { Dropdown, DropdownItem } from "../../src/components/ui/dropdown";

describe("Dropdown", () => {
  it("menu is hidden initially", () => {
    render(<Dropdown trigger="Menu"><DropdownItem>Item</DropdownItem></Dropdown>);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("clicking trigger opens the menu", () => {
    render(<Dropdown trigger="Menu"><DropdownItem>Item</DropdownItem></Dropdown>);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("Escape key closes the menu", () => {
    render(<Dropdown trigger="Menu"><DropdownItem>Item</DropdownItem></Dropdown>);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("aria-expanded reflects open state", () => {
    render(<Dropdown trigger="Menu"><DropdownItem>Item</DropdownItem></Dropdown>);
    const trigger = screen.getByRole("button", { name: "Menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("has aria-haspopup=menu on trigger", () => {
    render(<Dropdown trigger="Menu"><DropdownItem>Item</DropdownItem></Dropdown>);
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-haspopup", "menu");
  });
});

describe("DropdownItem", () => {
  it("fires onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <Dropdown trigger="Menu">
        <DropdownItem onSelect={onSelect}>Action</DropdownItem>
      </Dropdown>
    );
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Action" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("has role=menuitem", () => {
    render(
      <Dropdown trigger="Menu">
        <DropdownItem>Action</DropdownItem>
      </Dropdown>
    );
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("menuitem", { name: "Action" })).toBeInTheDocument();
  });
});
