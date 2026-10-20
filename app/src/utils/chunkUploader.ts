import crypto from "crypto";

export const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

export function splitFile(file: File, chunkSize = CHUNK_SIZE) {
  const chunks: Blob[] = [];
  let offset = 0;

  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }

  return chunks;
}

export function generateFileId() {
  return crypto.randomUUID();
}

export const DEFAULT_CHUNK_CONCURRENCY = 3;

/** Returns the indices in `[0, totalChunks)` that are not in `uploaded`, in order. */
export function getMissingChunkIndices(totalChunks: number, uploaded: readonly number[]) {
  const done = new Set(uploaded);
  const missing: number[] = [];

  for (let index = 0; index < totalChunks; index++) {
    if (!done.has(index)) missing.push(index);
  }

  return missing;
}

interface ConcurrentUploadOptions {
  concurrency?: number;
  isCancelled?: () => boolean;
}

/**
 * Uploads the given chunk indices with at most `concurrency` requests in flight.
 * Once a chunk fails or `isCancelled` returns true, no new chunks are started;
 * chunks already in flight are awaited. Rejects with the first chunk error.
 */
export async function uploadChunksConcurrently(
  indices: readonly number[],
  uploadChunk: (index: number) => Promise<void>,
  { concurrency = DEFAULT_CHUNK_CONCURRENCY, isCancelled = () => false }: ConcurrentUploadOptions = {}
) {
  let next = 0;
  const state: { failure?: { error: unknown } } = {};

  const worker = async () => {
    while (next < indices.length && !state.failure && !isCancelled()) {
      const index = indices[next++];
      try {
        await uploadChunk(index);
      } catch (error) {
        state.failure ??= { error };
      }
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, indices.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  if (state.failure) throw state.failure.error;
}
