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

function randomUuidFromBytes(bytes: Uint8Array): string {
  // RFC 4122 v4: set version (4) and variant (10xx) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Generates a unique upload file identifier using Web Crypto in the browser.
 *
 * 1. Secure contexts: `globalThis.crypto.randomUUID()`.
 * 2. Insecure contexts (e.g. plain-HTTP LAN testing where `randomUUID` is
 *    unavailable): RFC 4122 v4 UUID built from `crypto.getRandomValues()`.
 * 3. Non-cryptographic fallback when Web Crypto is completely unavailable
 *    (timestamp + Math.random; not suitable for security-sensitive tokens).
 */
export function generateFileId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    return randomUuidFromBytes(webCrypto.getRandomValues(new Uint8Array(16)));
  }
  return `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
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
