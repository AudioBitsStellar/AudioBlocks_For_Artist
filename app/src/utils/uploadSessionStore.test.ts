import { describe, it, expect } from "vitest";
import { isSameFile, isSessionExpired, type UploadSession } from "./uploadSessionStore";

const DAY_MS = 24 * 60 * 60 * 1000;

function makeSession(overrides: Partial<UploadSession> = {}): UploadSession {
  return {
    fileId: "file-1",
    fileName: "track.wav",
    fileSize: 1024,
    lastModified: 1000,
    totalChunks: 1,
    uploadedChunks: [],
    updatedAt: 0,
    ...overrides,
  };
}

describe("isSameFile", () => {
  it("matches a file with the same name, size and lastModified", () => {
    const file = new File([new Uint8Array(1024)], "track.wav");
    Object.defineProperty(file, "lastModified", { value: 1000 });

    expect(isSameFile(makeSession(), file)).toBe(true);
  });

  it("rejects a file whose size differs", () => {
    const file = new File([new Uint8Array(2048)], "track.wav");
    Object.defineProperty(file, "lastModified", { value: 1000 });

    expect(isSameFile(makeSession(), file)).toBe(false);
  });

  it("rejects a file whose lastModified differs", () => {
    const file = new File([new Uint8Array(1024)], "track.wav");
    Object.defineProperty(file, "lastModified", { value: 2000 });

    expect(isSameFile(makeSession(), file)).toBe(false);
  });
});

describe("isSessionExpired", () => {
  it("is not expired within 24 hours of the last update", () => {
    expect(isSessionExpired(makeSession({ updatedAt: 0 }), DAY_MS)).toBe(false);
  });

  it("is expired after 24 hours without an update", () => {
    expect(isSessionExpired(makeSession({ updatedAt: 0 }), DAY_MS + 1)).toBe(true);
  });
});
