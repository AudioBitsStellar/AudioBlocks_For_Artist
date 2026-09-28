import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FileUpload from "@/components/common/FileUpload";
import { COVER_IMAGE_RULES } from "@/utils/fileValidation";

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("FileUpload validation", () => {
  it("passes a valid file to onFileSelect and shows no error", () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FileUpload validationRules={COVER_IMAGE_RULES} onFileSelect={onFileSelect} />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("cover.png", "image/png");

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("cover.png")).toBeInTheDocument();
  });

  it("rejects an oversized file with an inline error and does not select it", () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FileUpload validationRules={COVER_IMAGE_RULES} onFileSelect={onFileSelect} />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [makeFile("big.png", "image/png", 6 * 1024 * 1024)] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/File too large/);
    expect(onFileSelect).toHaveBeenCalledWith(null);
    expect(screen.queryByText("big.png")).not.toBeInTheDocument();
  });

  it("rejects a dropped file with a disallowed type", () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FileUpload validationRules={COVER_IMAGE_RULES} onFileSelect={onFileSelect} />
    );
    const dropZone = container.querySelector("div.border-dashed") as HTMLElement;

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [makeFile("clip.gif", "image/gif")] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/Unsupported file type/);
    expect(onFileSelect).not.toHaveBeenCalledWith(expect.objectContaining({ name: "clip.gif" }));
  });

  it("does not validate when no rules are provided", () => {
    const onFileSelect = vi.fn();
    const { container } = render(<FileUpload onFileSelect={onFileSelect} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("anything.xyz", "application/x-foo", 999 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });
});
