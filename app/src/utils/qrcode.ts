/**
 * Minimal QR code generator for event tickets.
 *
 * This generates a simple data-matrix-style SVG that encodes a ticket ID.
 * For production, replace with a proper QR library (e.g. qrcode.react).
 * This implementation creates a deterministic pattern based on the input
 * string hash, producing a scannable-looking matrix.
 */

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates an SVG string representing a QR-like data matrix for the given value.
 *
 * @param value - The string to encode (e.g. a ticket ID).
 * @param size - The SVG width/height in pixels.
 * @returns An SVG string that can be used as src or inlined.
 */
export function generateQRSVG(value: string, size = 200): string {
  const gridSize = 21;
  const cellSize = size / gridSize;
  const hash = hashCode(value);
  const rand = seededRandom(hash);

  const cells: string[] = [];

  // Draw finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isOuter = x === 0 || x === 6 || y === 0 || y === 6;
        const isInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (isOuter || isInner) {
          cells.push(
            `<rect x="${(ox + x) * cellSize}" y="${(oy + y) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
          );
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(gridSize - 7, 0);
  drawFinder(0, gridSize - 7);

  // Fill data area with seeded random pattern
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      // Skip finder pattern areas
      if ((x < 8 && y < 8) || (x >= gridSize - 8 && y < 8) || (x < 8 && y >= gridSize - 8)) continue;

      if (rand() > 0.5) {
        cells.push(
          `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="#fff"/>
    ${cells.join("\n    ")}
  </svg>`;
}

/**
 * Creates a data URI from a QR SVG string for use in <img> src attributes.
 */
export function generateQRDataURI(value: string, size = 200): string {
  const svg = generateQRSVG(value, size);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
