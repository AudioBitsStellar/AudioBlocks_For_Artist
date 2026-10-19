import { describe, it, expect, vi } from "vitest";
import {
  splitFile,
  generateFileId,
  CHUNK_SIZE,
  getMissingChunkIndices,
  uploadChunksConcurrently,
} from "./chunkUploader";

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

describe("getMissingChunkIndices", () => {
  it("returns every index when nothing is uploaded", () => {
    expect(getMissingChunkIndices(3, [])).toEqual([0, 1, 2]);
  });

  it("skips chunks that are already uploaded, regardless of order", () => {
    expect(getMissingChunkIndices(5, [3, 0])).toEqual([1, 2, 4]);
  });
});

describe("uploadChunksConcurrently", () => {
  it("never has more than the concurrency limit in flight", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const upload = vi.fn(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
    });

    await uploadChunksConcurrently([0, 1, 2, 3, 4, 5], upload, { concurrency: 2 });

    expect(upload).toHaveBeenCalledTimes(6);
    expect(maxInFlight).toBe(2);
  });

  it("uploads every requested index exactly once", async () => {
    const uploaded: number[] = [];

    await uploadChunksConcurrently([1, 4, 2], async (index) => {
      uploaded.push(index);
    });

    expect([...uploaded].sort()).toEqual([1, 2, 4]);
  });

  it("stops starting new chunks once cancelled", async () => {
    let cancelled = false;
    const upload = vi.fn(async (index: number) => {
      if (index === 0) cancelled = true;
    });

    await uploadChunksConcurrently([0, 1, 2, 3], upload, {
      concurrency: 1,
      isCancelled: () => cancelled,
    });

    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("rejects with the first chunk error and starts no further chunks", async () => {
    const failure = new Error("network down");
    const upload = vi.fn(async (index: number) => {
      if (index === 0) throw failure;
    });

    await expect(uploadChunksConcurrently([0, 1, 2], upload, { concurrency: 1 })).rejects.toBe(
      failure
    );
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
