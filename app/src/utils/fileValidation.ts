/**
 * Client-side file type/size validation for artist uploads.
 *
 * The limits below mirror what AudioBlock_Backend enforces with multer
 * (`routes/SongRoutes.ts`, `middlewares/upload.ts`) so a bad file is rejected
 * with a clear message before any bytes are sent, instead of failing mid-upload
 * with a generic server error.
 */

export interface FileValidationRules {
  /** Human-readable name used in error messages, e.g. "Cover image". */
  label: string;
  /** Maximum allowed size in bytes. */
  maxSizeBytes: number;
  /** Accepted MIME types (compared case-insensitively). */
  allowedMimeTypes: readonly string[];
  /** Accepted file extensions incl. the dot; used when the browser reports no MIME type. */
  allowedExtensions: readonly string[];
}

export interface FileValidationResult {
  valid: boolean;
  /** User-facing reason the file was rejected; `null` when valid. */
  error: string | null;
}

const MB = 1024 * 1024;

export const AUDIO_FILE_RULES: FileValidationRules = {
  label: "Audio file",
  maxSizeBytes: 200 * MB,
  allowedMimeTypes: [
    "audio/mpeg",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "audio/x-flac",
    "audio/webm",
  ],
  allowedExtensions: [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"],
};

/** Cover art — backend `coverUpload` allows JPG/PNG up to 5 MB. */
export const COVER_IMAGE_RULES: FileValidationRules = {
  label: "Cover image",
  maxSizeBytes: 5 * MB,
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png"],
  allowedExtensions: [".jpg", ".jpeg", ".png"],
};

/** Profile image — backend `upload` middleware allows JPG/PNG up to 2 MB. */
export const PROFILE_IMAGE_RULES: FileValidationRules = {
  label: "Profile image",
  maxSizeBytes: 2 * MB,
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png"],
  allowedExtensions: [".jpg", ".jpeg", ".png"],
};

/** Comment attachments — common document/image/audio types, capped at 10 MB. */
export const COMMENT_ATTACHMENT_RULES: FileValidationRules = {
  label: "Attachment",
  maxSizeBytes: 10 * MB,
  allowedMimeTypes: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
  ],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".txt", ".mp3", ".wav"],
};

/** Formats a byte count for display, e.g. `5242880` -> `"5 MB"`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  const mb = bytes / MB;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

/** Turns a rules object's extensions into an `<input accept>` value. */
export function toAcceptAttribute(rules: FileValidationRules): string {
  return [...rules.allowedMimeTypes, ...rules.allowedExtensions].join(",");
}

/** Short "JPG, PNG" style list for error messages. */
function describeExtensions(rules: FileValidationRules): string {
  return rules.allowedExtensions.map((ext) => ext.slice(1).toUpperCase()).join(", ");
}

/**
 * Validates a file's type and size against a set of rules.
 *
 * Type is checked by MIME type first; if the browser reports none (or a
 * generic `application/octet-stream`), the file extension is used instead.
 * Empty files are rejected too.
 *
 * @param file - The file the user picked or dropped.
 * @param rules - One of the exported rule presets, or a custom set.
 * @returns `{ valid, error }` — `error` is a user-facing message when `valid` is false.
 * @example
 * const { valid, error } = validateFile(file, COVER_IMAGE_RULES);
 * if (!valid) toast.error(error);
 */
export function validateFile(file: File, rules: FileValidationRules): FileValidationResult {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const hasUsefulMime = mime !== "" && mime !== "application/octet-stream";

  const typeOk = hasUsefulMime
    ? rules.allowedMimeTypes.includes(mime)
    : rules.allowedExtensions.some((ext) => name.endsWith(ext));

  if (!typeOk) {
    return {
      valid: false,
      error: `Unsupported file type. ${rules.label} must be one of: ${describeExtensions(rules)}.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: `${rules.label} is empty.` };
  }

  if (file.size > rules.maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. ${rules.label} must be ${formatBytes(rules.maxSizeBytes)} or smaller, but yours is ${formatBytes(file.size)}.`,
    };
  }

  return { valid: true, error: null };
}
