"use client";

import { generateQRDataURI } from "@/utils/qrcode";
import { Download } from "lucide-react";

interface EventTicketQRProps {
  eventId: string | number;
  ticketId: string;
  eventTitle: string;
  attendeeName?: string;
}

/**
 * Displays a QR code for an event ticket.
 * The QR encodes a validation token derived from the event and ticket IDs.
 */
export function EventTicketQR({ eventId, ticketId, eventTitle, attendeeName }: EventTicketQRProps) {
  const validationToken = `${eventId}:${ticketId}:${Date.now()}`;
  const qrUri = generateQRDataURI(validationToken);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrUri;
    link.download = `ticket-${ticketId}.svg`;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#1F1F1F] bg-[#151818] p-6">
      <div className="space-y-1 text-center">
        <h3 className="text-lg font-semibold text-white">{eventTitle}</h3>
        {attendeeName && (
          <p className="text-sm text-[#A3A3A3]">{attendeeName}</p>
        )}
      </div>

      <div className="rounded-xl bg-white p-4">
        <img
          src={qrUri}
          alt={`QR code for ticket ${ticketId}`}
          width={180}
          height={180}
          className="block"
        />
      </div>

      <div className="space-y-1 text-center">
        <p className="text-xs font-mono text-[#A3A3A3]">Ticket #{ticketId}</p>
        <p className="text-[10px] text-[#6F6F6F]">Scan at event entrance</p>
      </div>

      <button
        onClick={handleDownload}
        className="flex items-center gap-2 rounded-full border border-[#2E2E2E] px-4 py-2 text-xs font-medium text-white transition-colors hover:border-[#885FA8]"
      >
        <Download className="h-3.5 w-3.5" />
        Download QR
      </button>
    </div>
  );
}
