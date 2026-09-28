import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import OtpInput from "@/components/shared/OtpInput";

const never = () => {};

/** Minimal harness: OtpInput is driven entirely by its parent's value. */
function Harness({
  onComplete = never,
  disabled = false,
}: {
  onComplete?: (code: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <div>
      <OtpInput value={value} onChange={setValue} onComplete={onComplete} disabled={disabled} />
      <p data-testid="echo">{value}</p>
    </div>
  );
}

function boxes(): HTMLInputElement[] {
  return Array.from(screen.getAllByRole("textbox")) as HTMLInputElement[];
}

describe("OtpInput (#459)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders six labelled boxes in an accessible group", () => {
    render(<Harness />);

    expect(screen.getByRole("group", { name: /verification code/i })).toBeInTheDocument();
    expect(boxes()).toHaveLength(6);
    expect(boxes()[0]).toHaveAttribute("aria-label", "Digit 1 of 6");
    expect(boxes()[5]).toHaveAttribute("aria-label", "Digit 6 of 6");
    expect(boxes()[0]).toHaveAttribute("autocomplete", "one-time-code");
  });

  it("advances to the next box after a digit", async () => {
    render(<Harness />);

    await userEvent.type(boxes()[0], "7");

    expect(screen.getByTestId("echo")).toHaveTextContent("7");
    expect(boxes()[1]).toHaveFocus();
  });

  it("replaces the digit in a box that already holds one", async () => {
    render(<Harness />);
    await userEvent.type(boxes()[0], "7");
    expect(screen.getByTestId("echo")).toHaveTextContent("7");

    fireEvent.keyDown(boxes()[0], { key: "3" });

    expect(screen.getByTestId("echo")).toHaveTextContent("3");
    expect(boxes()[1]).toHaveFocus();
  });

  it("ignores non-digit keystrokes", async () => {
    render(<Harness />);

    await userEvent.type(boxes()[0], "ab1");

    expect(screen.getByTestId("echo")).toHaveTextContent("1");
  });

  it("steps back and deletes the previous box when this one is empty", async () => {
    render(<Harness />);
    await userEvent.type(boxes()[0], "1");
    await userEvent.type(boxes()[1], "2");

    await userEvent.type(boxes()[2], "{backspace}");

    expect(screen.getByTestId("echo")).toHaveTextContent("1");
    expect(boxes()[1]).toHaveFocus();
  });

  it("deletes its own digit without moving focus", async () => {
    render(<Harness />);
    await userEvent.type(boxes()[0], "1");
    await userEvent.type(boxes()[1], "2");

    await userEvent.type(boxes()[1], "{backspace}");

    expect(screen.getByTestId("echo")).toHaveTextContent("1");
    expect(boxes()[1]).toHaveFocus();
  });

  it("moves with the arrow keys without changing the value", async () => {
    render(<Harness />);
    await userEvent.type(boxes()[0], "12");

    fireEvent.keyDown(boxes()[1], { key: "ArrowLeft" });
    expect(boxes()[0]).toHaveFocus();
    fireEvent.keyDown(boxes()[0], { key: "ArrowRight" });
    expect(boxes()[1]).toHaveFocus();
    expect(screen.getByTestId("echo")).toHaveTextContent("12");
  });

  it("fans a pasted code out across the boxes", () => {
    render(<Harness />);

    fireEvent.paste(boxes()[0], { clipboardData: { getData: () => "12 34 56" } });

    expect(screen.getByTestId("echo")).toHaveTextContent("123456");
  });

  it("reports completion exactly once the code is full", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);

    fireEvent.paste(boxes()[0], { clipboardData: { getData: () => "12345" } });
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.paste(boxes()[5], { clipboardData: { getData: () => "6" } });
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("truncates a paste that is longer than the code", () => {
    render(<Harness />);

    fireEvent.paste(boxes()[0], { clipboardData: { getData: () => "1234567890" } });

    expect(screen.getByTestId("echo")).toHaveTextContent("123456");
  });

  it("locks every box when disabled", () => {
    render(<Harness disabled />);

    for (const box of boxes()) expect(box).toBeDisabled();
  });
});
