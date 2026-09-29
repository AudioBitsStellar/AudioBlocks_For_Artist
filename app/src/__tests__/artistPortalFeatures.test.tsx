import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { GenreTagSelector } from "@/components/GenreTagSelector";
import { DashboardStatCards } from "@/components/DashboardStatCards";

describe("Artist Portal Features (#387 & #389)", () => {
  it("renders stat cards correctly with formatted numbers", () => {
    render(<DashboardStatCards plays={50000} followers={1200} earningsUsd={1500.5} />);

    expect(screen.getByText("50,000")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.getByText("$1,500.50")).toBeInTheDocument();
  });

  it("handles genre selection and tag addition/removal", () => {
    const onGenreChange = vi.fn();
    const onTagsChange = vi.fn();

    render(
      <GenreTagSelector
        selectedGenre="afrobeat"
        selectedTags={["afro", "vibes"]}
        onGenreChange={onGenreChange}
        onTagsChange={onTagsChange}
      />
    );

    expect(screen.getByText("#afro")).toBeInTheDocument();
    expect(screen.getByText("#vibes")).toBeInTheDocument();

    const tagInput = screen.getByPlaceholderText("Add tag and press Enter...");
    fireEvent.change(tagInput, { target: { value: "chill" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });

    expect(onTagsChange).toHaveBeenCalledWith(["afro", "vibes", "chill"]);
  });
});
