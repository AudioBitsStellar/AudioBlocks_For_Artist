import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CharacterCount from "@/components/common/CharacterCount";

describe("CharacterCount", () => {
  it("shows the length against the limit", () => {
    render(<CharacterCount length={12} max={100} />);
    expect(screen.getByText("12/100")).toHaveClass("text-gray-400");
  });

  it("warns in yellow once 90% of the limit is reached", () => {
    render(<CharacterCount length={90} max={100} />);
    expect(screen.getByText("90/100")).toHaveClass("text-yellow-500");
  });

  it("turns red when the limit is reached", () => {
    render(<CharacterCount length={100} max={100} />);
    expect(screen.getByText("100/100")).toHaveClass("text-red-500");
  });

  it("stays grey just below the warning threshold", () => {
    render(<CharacterCount length={89} max={100} />);
    expect(screen.getByText("89/100")).toHaveClass("text-gray-400");
  });

  it("exposes the count under the given id so inputs can reference it", () => {
    render(<CharacterCount id="title-count" length={1} max={10} />);
    expect(screen.getByText("1/10")).toHaveAttribute("id", "title-count");
  });
});
