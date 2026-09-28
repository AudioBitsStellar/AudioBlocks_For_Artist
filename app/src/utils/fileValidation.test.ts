import { describe, it, expect } from "vitest";
import {
  AUDIO_FILE_RULES,
  COVER_IMAGE_RULES,
  PROFILE_IMAGE_RULES,
  COMMENT_ATTACHMENT_RULES,
  formatBytes,
  toAcceptAttribute,
  validateFile,
} from "./fileValidation";

const MB = 1024 * 1024;

/** Builds a File whose reported size is `size` without allocating that many bytes. */
function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateFile", () => {
  describe("cover images", () => {
    it("accepts a PNG under the limit", () => {
      expect(validateFile(makeFile("cover.png", "image/png"), COVER_IMAGE_RULES)).toEqual({
        valid: true,
        error: null,
      });
    });

    it("accepts a JPEG exactly at the 5 MB limit", () => {
      const result = validateFile(makeFile("a.jpg", "image/jpeg", 5 * MB), COVER_IMAGE_RULES);
      expect(result.valid).toBe(true);
    });

    it("rejects a cover image over 5 MB and reports both sizes", () => {
      const result = validateFile(makeFile("a.jpg", "image/jpeg", 5 * MB + 1), COVER_IMAGE_RULES);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/File too large/);
      expect(result.error).toContain("5 MB");
    });

    it("rejects formats the backend does not accept (gif, webp, svg)", () => {
      for (const [name, type] of [
        ["a.gif", "image/gif"],
        ["a.webp", "image/webp"],
        ["a.svg", "image/svg+xml"],
      ]) {
        const result = validateFile(makeFile(name, type), COVER_IMAGE_RULES);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/Unsupported file type/);
        expect(result.error).toContain("JPG, JPEG, PNG");
      }
    });
  });

  describe("profile images", () => {
    it("enforces the 2 MB backend limit", () => {
      expect(validateFile(makeFile("p.png", "image/png", 2 * MB), PROFILE_IMAGE_RULES).valid).toBe(
        true
      );
      const tooBig = validateFile(makeFile("p.png", "image/png", 2 * MB + 1), PROFILE_IMAGE_RULES);
      expect(tooBig.valid).toBe(false);
      expect(tooBig.error).toContain("2 MB");
    });
  });

  describe("audio files", () => {
    it("accepts common audio MIME types", () => {
      for (const type of ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac", "audio/mp4"]) {
        expect(validateFile(makeFile("t.bin", type), AUDIO_FILE_RULES).valid).toBe(true);
      }
    });

    it("rejects an audio file over 200 MB", () => {
      const result = validateFile(makeFile("t.mp3", "audio/mpeg", 201 * MB), AUDIO_FILE_RULES);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/File too large/);
      expect(result.error).toContain("200 MB");
    });

    it("rejects non-audio types", () => {
      const result = validateFile(makeFile("t.pdf", "application/pdf"), AUDIO_FILE_RULES);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Unsupported file type/);
    });

    it("falls back to the extension when the browser reports no MIME type", () => {
      expect(validateFile(makeFile("song.FLAC", ""), AUDIO_FILE_RULES).valid).toBe(true);
      expect(validateFile(makeFile("song.txt", ""), AUDIO_FILE_RULES).valid).toBe(false);
    });

    it("falls back to the extension for application/octet-stream", () => {
      const file = makeFile("song.wav", "application/octet-stream");
      expect(validateFile(file, AUDIO_FILE_RULES).valid).toBe(true);
    });

    it("does not let a misleading extension override a real, disallowed MIME type", () => {
      expect(validateFile(makeFile("song.mp3", "image/png"), AUDIO_FILE_RULES).valid).toBe(false);
    });
  });

  it("rejects empty files", () => {
    const result = validateFile(makeFile("t.mp3", "audio/mpeg", 0), AUDIO_FILE_RULES);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/empty/);
  });

  it("validates comment attachments", () => {
    expect(validateFile(makeFile("a.pdf", "application/pdf"), COMMENT_ATTACHMENT_RULES).valid).toBe(
      true
    );
    expect(
      validateFile(makeFile("a.exe", "application/x-msdownload"), COMMENT_ATTACHMENT_RULES).valid
    ).toBe(false);
    expect(
      validateFile(makeFile("a.pdf", "application/pdf", 11 * MB), COMMENT_ATTACHMENT_RULES).valid
    ).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats bytes, kilobytes and megabytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * MB)).toBe("5 MB");
    expect(formatBytes(1.5 * MB)).toBe("1.5 MB");
  });
});

describe("toAcceptAttribute", () => {
  it("lists MIME types and extensions for the input accept attribute", () => {
    const accept = toAcceptAttribute(COVER_IMAGE_RULES);
    expect(accept).toContain("image/png");
    expect(accept).toContain(".jpg");
    expect(accept).not.toContain("image/*");
  });
});
