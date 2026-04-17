import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AvatarStack } from "@/components/ui/avatar-stack";

describe("AvatarStack", () => {
  it("renders visible avatars and overflow count", () => {
    const html = renderToStaticMarkup(
      React.createElement(AvatarStack, {
        items: [
          { id: "1", initial: "A", alt: "Alice" },
          { id: "2", initial: "B", alt: "Bob" },
          { id: "3", initial: "C", alt: "Chen" },
        ],
        max: 2,
        totalCount: 4,
      }),
    );

    expect(html).toContain("Alice");
    expect(html).toContain("Bob");
    expect(html).toContain("+2");
  });

  it("returns no markup for an empty stack", () => {
    const html = renderToStaticMarkup(React.createElement(AvatarStack, { items: [] }));

    expect(html).toBe("");
  });
});
