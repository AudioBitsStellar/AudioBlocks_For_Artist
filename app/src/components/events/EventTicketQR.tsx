"use client";

import { useState, useEffect } from "react";
import { downloadQRCode } from "@/utils/qrcode";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EventTicketQRProps {
  eventId: string | number;
  ticketId: string;
  eventTitle: string;
  attendeeName?: string;
}

/**
 * Displays a real, scannable QR code for an event ticket.
 * The QR encodes a validation token in the format: audioblocks:ticket:<eventId>:<ticketId>
 */
export function EventTicketQR({ eventId, ticketId, eventTitle, attendeeName }: EventTicketQRProps) {
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function loadQR() {
      try {
        // Dynamic import to reduce initial bundle size
        const { generateQRDataURI } = await import("@/utils/qrcode");
        const uri = await generateQRDataURI(eventId, ticketId, 180);
        setQrUri(uri);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
        toast.error("Failed to generate QR code");
      }
    }
    loadQR();
  }, [eventId, ticketId]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadQRCode(eventId, ticketId, `ticket-${ticketId}`);
      toast.success("QR code downloaded");
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast.error("Failed to download QR code");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#1F1F1F] bg-[#151818] p-6">
      <div className="space-y-1 text-center">
        <h3 className="text-lg font-semibold text-white">{eventTitle}</h3>
        {attendeeName && <p className="text-sm text-[#A3A3A3]">{attendeeName}</p>}
      </div>

      <div className="rounded-xl bg-white p-4">
        {qrUri ? (
          <img
            src={qrUri}
            alt={`QR code for ticket ${ticketId}`}
            width={180}
            height={180}
            className="block"
          />
        ) : (
          <div className="flex items-center justify-center" style={{ width: 180, height: 180 }}>
            <Loader2 className="h-8 w-8 animate-spin text-[#D2045B]" />
          </div>
        )}
      </div>

      <div className="space-y-1 text-center">
        <p className="text-xs font-mono text-[#A3A3A3]">Ticket #{ticketId}</p>
        <p className="text-[10px] text-[#6F6F6F]">Scan at event entrance</p>
      </div>

      <button
        onClick={handleDownload}
        disabled={!qrUri || isDownloading}
        className="flex items-center gap-2 rounded-full border border-[#2E2E2E] px-4 py-2 text-xs font-medium text-white transition-colors hover:border-[#885FA8] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Download QR
      </button>
    </div>
  );
}
