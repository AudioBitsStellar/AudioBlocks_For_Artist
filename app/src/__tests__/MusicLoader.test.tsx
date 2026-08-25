// #151, #158 — MusicLoader component tests.
//
// Both issues describe MusicLoader as an audio player with play/pause, seek,
// volume, and track-switching controls, backed by a "PlaybackContext". That
// component and context don't exist anywhere in this codebase — there is no
// audio player feature at all. The actual `MusicLoader` (app/src/components/
// MusicLoader.tsx) is a small decorative loading indicator: four animated
// bars, sized by a single `small` boolean prop. This file tests the real
// component's real behavior rather than inventing coverage for a feature
// that isn't there (see the PR description for more detail).

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MusicLoader from "@/components/MusicLoader";

describe("MusicLoader", () => {
  it("renders four animated bars", () => {
    const { container } = render(<MusicLoader />);
    const bars = container.querySelectorAll(".animate-music-fast");
    expect(bars).toHaveLength(4);
  });

  it("defaults to the large (h-8) size when small is not passed", () => {
    const { container } = render(<MusicLoader />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("h-8");
    expect(wrapper?.className).not.toContain("h-4");
  });

  it("renders at the large (h-8) size when small is explicitly false", () => {
    const { container } = render(<MusicLoader small={false} />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("h-8");
  });

  it("renders at the small (h-4) size when small is true", () => {
    const { container } = render(<MusicLoader small />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("h-4");
    expect(wrapper?.className).not.toContain("h-8");
  });

  it("applies a staggered animation delay to each bar", () => {
    const { container } = render(<MusicLoader />);
    const bars = Array.from(container.querySelectorAll(".animate-music-fast"));
    const delays = bars.map((bar) => (bar as HTMLElement).style.animationDelay);
    expect(delays).toEqual(["0s", "0.15s", "0.3s", "0.45s"]);
  });

  it("re-renders without throwing when toggled between small and large", () => {
    const { rerender, container } = render(<MusicLoader small={false} />);
    expect(container.firstElementChild?.className).toContain("h-8");

    rerender(<MusicLoader small={true} />);
    expect(container.firstElementChild?.className).toContain("h-4");

    rerender(<MusicLoader small={false} />);
    expect(container.firstElementChild?.className).toContain("h-8");
  });
});
