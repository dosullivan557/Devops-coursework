import { describe, expect, it } from "@jest/globals";

import { cn } from "./utils";

describe("cn", () => {
  it("joins conditional class names", () => {
    expect(cn("base", false && "hidden", null, { active: true })).toBe(
      "base active",
    );
  });

  it("resolves conflicting Tailwind classes in favor of the last value", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles nested class arrays", () => {
    expect(cn(["text-sm", ["font-medium"]], "text-lg")).toBe(
      "font-medium text-lg",
    );
  });
});
