/**
 * Real QR code generator for event tickets using the qrcode library.
 * 
 * Encodes ticket payloads in the format: audioblocks:ticket:<eventId>:<ticketId>
 * Uses error correction level M for reliability and generates dark-on-light QR codes
 * that work in both light and dark modes.
 */

import QRCode from "qrcode";

/**
 * Generates the ticket payload format for QR encoding.
 * Format: audioblocks:ticket:<eventId>:<ticketId>
 * This format can be parsed and verified by the check-in flow.
 * 
 * @param eventId - The event identifier
 * @param ticketId - The unique ticket identifier
 * @returns The formatted payload string
 */
export function generateTicketPayload(
  eventId: string | number,
  ticketId: string
): string {
  return `audioblocks:ticket:${eventId}:${ticketId}`;
}

/**
 * Parses a scanned QR code payload back into its components.
 * 
 * @param payload - The scanned QR code string
 * @returns The parsed components or null if invalid
 */
export function parseTicketPayload(payload: string): {
  eventId: string;
  ticketId: string;
} | null {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "audioblocks" || parts[1] !== "ticket") {
    return null;
  }
  return {
    eventId: parts[2],
    ticketId: parts[3],
  };
}

/**
 * Generates an SVG string representing a real, scannable QR code.
 *
 * @param eventId - The event identifier
 * @param ticketId - The ticket identifier
 * @param size - The SVG width/height in pixels (default 200)
 * @returns A Promise that resolves to an SVG string
 */
export async function generateQRSVG(
  eventId: string | number,
  ticketId: string,
  size = 200
): Promise<string> {
  const payload = generateTicketPayload(eventId, ticketId);
  
  return QRCode.toString(payload, {
    type: "svg",
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",  // Black modules
      light: "#FFFFFF", // White background
    },
  });
}

/**
 * Generates a data URI for use in <img> src attributes.
 * The QR code uses error correction level M and is designed to be
 * scannable by phone cameras and QR scanners.
 *
 * @param eventId - The event identifier
 * @param ticketId - The ticket identifier
 * @param size - The image width/height in pixels (default 200)
 * @returns A Promise that resolves to a data URI string
 */
export async function generateQRDataURI(
  eventId: string | number,
  ticketId: string,
  size = 200
): Promise<string> {
  const payload = generateTicketPayload(eventId, ticketId);
  
  return QRCode.toDataURL(payload, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Downloads a QR code as a PNG file.
 * 
 * @param eventId - The event identifier
 * @param ticketId - The ticket identifier
 * @param filename - The filename for the download (without extension)
 */
export async function downloadQRCode(
  eventId: string | number,
  ticketId: string,
  filename: string = `ticket-${ticketId}`
): Promise<void> {
  const dataUrl = await generateQRDataURI(eventId, ticketId, 400);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
