"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface ImageCropperProps {
  imageSrc: string;
  imageFile?: File;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  /** Lets the user pick a different image without leaving the dialog. */
  onReselect?: () => void;
  aspect?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_IMAGE_WIDTH = 300;
const MIN_IMAGE_HEIGHT = 300;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
/** Longest side of the exported image; larger crops are scaled down. */
export const MAX_OUTPUT_SIZE = 1024;

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

function getFileTypeError(fileType: string): string | null {
  if (!ACCEPTED_IMAGE_TYPES.has(fileType.toLowerCase())) {
    return "Unsupported file type. Please select a JPEG, PNG, or WebP image.";
  }
  return null;
}

function getFileSizeError(fileSize: number): string | null {
  if (fileSize > MAX_FILE_SIZE) {
    return "File is too large. Please select an image no larger than 5MB.";
  }
  return null;
}

function getDataUrlFileSize(dataUrl: string): number | null {
  const separatorIndex = dataUrl.indexOf(",");
  if (separatorIndex === -1) return null;

  const metadata = dataUrl.slice(0, separatorIndex);
  const payload = dataUrl.slice(separatorIndex + 1).replace(/\s/g, "");

  if (metadata.toLowerCase().includes(";base64")) {
    try {
      const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
      return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
    } catch {
      return null;
    }
  }

  try {
    return new Blob([decodeURIComponent(payload)]).size;
  } catch {
    return null;
  }
}

function getSourceValidationError(imageSrc: string, imageFile?: File): string | null {
  if (imageFile) {
    return getFileTypeError(imageFile.type) ?? getFileSizeError(imageFile.size);
  }

  if (!imageSrc.startsWith("data:")) return null;

  const header = imageSrc.slice(0, imageSrc.indexOf(","));
  const mimeMatch = header.match(/^data:([^;]+)/i);
  const fileType = mimeMatch?.[1];

  if (!fileType) {
    return "Unsupported file type. Please select a JPEG, PNG, or WebP image.";
  }

  const typeError = getFileTypeError(fileType);
  if (typeError) return typeError;

  const fileSize = getDataUrlFileSize(imageSrc);
  return fileSize === null ? null : getFileSizeError(fileSize);
}

/**
 * Output size for a crop, in source-image pixels (not the on-screen preview
 * size, which would shrink the avatar), capped at MAX_OUTPUT_SIZE and kept at
 * exactly `aspect`.
 */
export function getOutputSize(
  sourceWidth: number,
  aspect: number
): { width: number; height: number } {
  const width = Math.max(1, Math.round(Math.min(sourceWidth, MAX_OUTPUT_SIZE)));
  return { width, height: Math.max(1, Math.round(width / aspect)) };
}

async function getCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  aspect: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const { width, height } = getOutputSize(crop.width * scaleX, aspect);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    width,
    height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas to Blob failed"));
      },
      "image/jpeg",
      0.9
    );
  });
}

export default function ImageCropper({
  imageSrc,
  imageFile,
  onCropComplete,
  onCancel,
  onReselect,
  aspect = 1,
}: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImageValid, setIsImageValid] = useState(false);
  const [dimensionError, setDimensionError] = useState<string | null>(null);

  const sourceValidationError = getSourceValidationError(imageSrc, imageFile);
  const validationError = sourceValidationError ?? dimensionError;

  useEffect(() => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setIsImageValid(false);
    setDimensionError(null);
  }, [imageSrc, imageFile]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const image = e.currentTarget;

      if (sourceValidationError) {
        setIsImageValid(false);
        return;
      }

      if (image.naturalWidth < MIN_IMAGE_WIDTH || image.naturalHeight < MIN_IMAGE_HEIGHT) {
        setDimensionError(
          `Image is too small. Please select an image at least ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px.`
        );
        setIsImageValid(false);
        return;
      }

      setDimensionError(null);
      setIsImageValid(true);
      const initialCrop = centerAspectCrop(image.width, image.height, aspect);
      setCrop(initialCrop);
      // ReactCrop only reports onComplete after the user drags, so seed the
      // crop to apply; otherwise "Apply Crop" stays disabled until a drag.
      setCompletedCrop(convertToPixelCrop(initialCrop, image.width, image.height));
    },
    [aspect, sourceValidationError]
  );

  const handleImageError = () => {
    setIsImageValid(false);
    setDimensionError(
      "The selected file could not be loaded as an image. Please choose a JPEG, PNG, or WebP image."
    );
  };

  // Escape cancels, and focus starts inside the dialog.
  useEffect(() => {
    cancelButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop || !isImageValid || validationError) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop, aspect);
      onCropComplete(blob);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop profile image"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6 w-full max-w-md">
        <h2 className="text-white font-semibold text-lg">Crop your photo</h2>
        <p className="text-sm text-[#A3A3A3]">
          Drag to adjust the crop area. The image will be cropped to a square.
        </p>

        {validationError && (
          <p
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400"
          >
            {validationError}
          </p>
        )}

        <div className="flex justify-center">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            circularCrop={false}
            minWidth={50}
            minHeight={50}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              onError={handleImageError}
              className="max-h-72 w-auto rounded-lg"
            />
          </ReactCrop>
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          {onReselect && (
            <button
              type="button"
              onClick={onReselect}
              disabled={isProcessing}
              className="mr-auto rounded-lg px-2 py-2 text-sm text-[#A3A3A3] underline-offset-2 transition-colors hover:text-white hover:underline disabled:opacity-50"
            >
              Choose another image
            </button>
          )}
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-lg border border-[#2A2A2A] bg-[#111111] text-white px-4 py-2 hover:bg-[#1a1a1a] transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !completedCrop || !isImageValid || !!validationError}
            className="rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white px-4 py-2 font-semibold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Applying…" : "Apply Crop"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { ImageCropper };
