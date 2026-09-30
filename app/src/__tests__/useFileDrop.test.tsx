import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useFileDrop } from "@/hooks/useFileDrop";

function Zone(props: { onFiles: (f: File[]) => void; disabled?: boolean; multiple?: boolean }) {
  const { isDragging, dropHandlers } = useFileDrop(props);
  return (
    <div data-testid="zone" data-dragging={isDragging} {...dropHandlers}>
      <span data-testid="child">child</span>
    </div>
  );
}

const mp3 = (name = "a.mp3") => new File(["x"], name, { type: "audio/mpeg" });
const fileTransfer = (files: File[]) => ({
  dataTransfer: { types: ["Files"], files, dropEffect: "" },
});

describe("useFileDrop (#391)", () => {
  it("highlights while files are dragged over and clears on leave", () => {
    render(<Zone onFiles={vi.fn()} />);
    const zone = screen.getByTestId("zone");
    fireEvent.dragEnter(zone, fileTransfer([mp3()]));
    expect(zone).toHaveAttribute("data-dragging", "true");
    fireEvent.dragLeave(zone, fileTransfer([mp3()]));
    expect(zone).toHaveAttribute("data-dragging", "false");
  });

  it("does not flicker when moving over child elements", () => {
    render(<Zone onFiles={vi.fn()} />);
    const zone = screen.getByTestId("zone");
    fireEvent.dragEnter(zone, fileTransfer([mp3()]));
    fireEvent.dragEnter(screen.getByTestId("child"), fileTransfer([mp3()]));
    fireEvent.dragLeave(screen.getByTestId("child"), fileTransfer([mp3()]));
    expect(zone).toHaveAttribute("data-dragging", "true");
  });

  it("passes only the first file unless multiple", () => {
    const onFiles = vi.fn();
    render(<Zone onFiles={onFiles} />);
    act(() => {
      fireEvent.drop(screen.getByTestId("zone"), fileTransfer([mp3("a.mp3"), mp3("b.mp3")]));
    });
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: "a.mp3" })]);
  });

  it("passes every file when multiple", () => {
    const onFiles = vi.fn();
    render(<Zone onFiles={onFiles} multiple />);
    fireEvent.drop(screen.getByTestId("zone"), fileTransfer([mp3("a.mp3"), mp3("b.mp3")]));
    expect(onFiles.mock.calls[0][0]).toHaveLength(2);
  });

  it("ignores drops and shows no highlight while disabled", () => {
    const onFiles = vi.fn();
    render(<Zone onFiles={onFiles} disabled />);
    const zone = screen.getByTestId("zone");
    fireEvent.dragEnter(zone, fileTransfer([mp3()]));
    expect(zone).toHaveAttribute("data-dragging", "false");
    fireEvent.drop(zone, fileTransfer([mp3()]));
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("ignores non-file drags such as selected text", () => {
    render(<Zone onFiles={vi.fn()} />);
    const zone = screen.getByTestId("zone");
    fireEvent.dragEnter(zone, { dataTransfer: { types: ["text/plain"], files: [] } });
    expect(zone).toHaveAttribute("data-dragging", "false");
  });
});
