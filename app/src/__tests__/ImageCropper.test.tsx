import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageCropper, { MAX_OUTPUT_SIZE, getOutputSize } from "@/components/ImageCropper";

const PNG_SRC = "data:image/png;base64,iVBORw0KGgo=";

const canvasSizes: Array<{ width: number; height: number }> = [];
const drawImage = vi.fn();

beforeEach(() => {
  canvasSizes.length = 0;
  drawImage.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
    this: HTMLCanvasElement
  ) {
    return { drawImage } as unknown as CanvasRenderingContext2D;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
    type?: string
  ) {
    canvasSizes.push({ width: this.width, height: this.height });
    callback(new Blob(["cropped"], { type }));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** jsdom never loads images, so fake the dimensions and fire `load`. */
function loadImage(natural: number, displayed: number) {
  const img = screen.getByAltText("Crop preview") as HTMLImageElement;
  for (const [key, value] of Object.entries({
    naturalWidth: natural,
    naturalHeight: natural,
    width: displayed,
    height: displayed,
  })) {
    Object.defineProperty(img, key, { configurable: true, value });
  }
  fireEvent.load(img);
}

function renderCropper(props: Partial<React.ComponentProps<typeof ImageCropper>> = {}) {
  const handlers = { onCropComplete: vi.fn(), onCancel: vi.fn(), onReselect: vi.fn() };
  render(<ImageCropper imageSrc={PNG_SRC} aspect={1} {...handlers} {...props} />);
  return handlers;
}

describe("getOutputSize", () => {
  it("keeps source resolution and the exact aspect ratio", () => {
    expect(getOutputSize(540, 1)).toEqual({ width: 540, height: 540 });
    expect(getOutputSize(800.4, 16 / 9)).toEqual({ width: 800, height: 450 });
  });

  it("caps the longest side", () => {
    expect(getOutputSize(5000, 1)).toEqual({ width: MAX_OUTPUT_SIZE, height: MAX_OUTPUT_SIZE });
  });
});

describe("ImageCropper", () => {
  it("is a labelled modal dialog that focuses Cancel", () => {
    renderCropper();
    const dialog = screen.getByRole("dialog", { name: /crop profile image/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("enables Apply as soon as the image loads, without dragging", () => {
    renderCropper();
    const apply = screen.getByRole("button", { name: /apply crop/i });
    expect(apply).toBeDisabled();
    loadImage(600, 300);
    expect(apply).toBeEnabled();
  });

  it("sends a square crop at source resolution to onCropComplete", async () => {
    const { onCropComplete } = renderCropper();
    // Displayed at 300px, the default crop is 90% = 270px, i.e. 540 source px.
    loadImage(600, 300);
    await userEvent.click(screen.getByRole("button", { name: /apply crop/i }));

    await waitFor(() => expect(onCropComplete).toHaveBeenCalledTimes(1));
    const blob = onCropComplete.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("image/jpeg");
    expect(canvasSizes).toEqual([{ width: 540, height: 540 }]);
    // Source rectangle is in natural pixels: 5% inset on a 600px image.
    expect(drawImage.mock.calls[0].slice(1)).toEqual([30, 30, 540, 540, 0, 0, 540, 540]);
  });

  it("caps very large crops", async () => {
    const { onCropComplete } = renderCropper();
    loadImage(4000, 400);
    await userEvent.click(screen.getByRole("button", { name: /apply crop/i }));
    await waitFor(() => expect(onCropComplete).toHaveBeenCalled());
    expect(canvasSizes).toEqual([{ width: MAX_OUTPUT_SIZE, height: MAX_OUTPUT_SIZE }]);
  });

  it("rejects images below the minimum size and offers a reselect", async () => {
    const { onReselect, onCropComplete } = renderCropper();
    loadImage(200, 200);

    expect(screen.getByRole("alert")).toHaveTextContent(/too small/i);
    expect(screen.getByRole("button", { name: /apply crop/i })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /choose another image/i }));
    expect(onReselect).toHaveBeenCalledTimes(1);
    expect(onCropComplete).not.toHaveBeenCalled();
  });

  it("rejects unsupported image types up front", () => {
    renderCropper({ imageSrc: "data:image/gif;base64,R0lGOD==" });
    expect(screen.getByRole("alert")).toHaveTextContent(/unsupported file type/i);
  });

  it("resets validation when a new image is selected", () => {
    const handlers = { onCropComplete: vi.fn(), onCancel: vi.fn(), onReselect: vi.fn() };
    const { rerender } = render(<ImageCropper imageSrc={PNG_SRC} {...handlers} />);
    loadImage(200, 200);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(<ImageCropper imageSrc="data:image/png;base64,AAAA" {...handlers} />);
    expect(screen.queryByRole("alert")).toBeNull();
    loadImage(600, 300);
    expect(screen.getByRole("button", { name: /apply crop/i })).toBeEnabled();
  });

  it("cancels from the button and from Escape", async () => {
    const { onCancel } = renderCropper();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("hides the reselect action when no handler is given", () => {
    renderCropper({ onReselect: undefined });
    expect(screen.queryByRole("button", { name: /choose another image/i })).toBeNull();
  });
});
