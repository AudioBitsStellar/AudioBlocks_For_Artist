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
