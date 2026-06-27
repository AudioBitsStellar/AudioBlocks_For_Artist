import { describe, it, expect, vi } from "vitest";
import { splitFile, generateFileId, CHUNK_SIZE } from "./chunkUploader";

// crypto.randomUUID is available in Node 18+ but may need a shim in jsdom
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: vi.fn(() => "test-uuid-1234") },
  });
}

describe("splitFile", () => {
  it("returns a single chunk for a file smaller than CHUNK_SIZE", () => {
    const content = new Uint8Array(1024); // 1 KB
    const file = new File([content], "small.mp3", { type: "audio/mpeg" });
    const chunks = splitFile(file);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].size).toBe(1024);
  });

  it("splits a file into the correct number of chunks", () => {
    const totalBytes = CHUNK_SIZE * 2 + 512;
    const content = new Uint8Array(totalBytes);
    const file = new File([content], "big.mp3", { type: "audio/mpeg" });
    const chunks = splitFile(file);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].size).toBe(CHUNK_SIZE);
    expect(chunks[1].size).toBe(CHUNK_SIZE);
    expect(chunks[2].size).toBe(512);
  });

  it("returns no chunks for an empty file", () => {
    const file = new File([], "empty.mp3", { type: "audio/mpeg" });
    expect(splitFile(file)).toHaveLength(0);
  });

  it("respects a custom chunkSize argument", () => {
    const file = new File([new Uint8Array(100)], "test.mp3");
    const chunks = splitFile(file, 40);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].size).toBe(40);
    expect(chunks[2].size).toBe(20);
  });
});

describe("generateFileId", () => {
  it("returns a non-empty string", () => {
    const id = generateFileId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});
