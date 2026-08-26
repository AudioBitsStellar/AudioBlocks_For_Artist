"use client";

import { useState } from "react";
import PathBreadcrumb from "@/components/PathBreadcrumb";
import { EventTicketQR } from "@/components/events/EventTicketQR";
import { Ticket, Plus, Loader2 } from "lucide-react";

interface TicketsPageProps {
  params: {
    eventId: string;
  };
}

interface TicketEntry {
  id: string;
  attendeeName: string;
  tier: string;
  purchasedAt: string;
}

const MOCK_TICKETS: TicketEntry[] = [
  { id: "TICK-001", attendeeName: "Alice Johnson", tier: "VIP", purchasedAt: "2025-08-20" },
  { id: "TICK-002", attendeeName: "Bob Smith", tier: "General", purchasedAt: "2025-08-21" },
  { id: "TICK-003", attendeeName: "Carol White", tier: "General", purchasedAt: "2025-08-22" },
  { id: "TICK-004", attendeeName: "David Lee", tier: "VIP", purchasedAt: "2025-08-23" },
];

export default function TicketsPage({ params }: TicketsPageProps) {
  const [tickets] = useState<TicketEntry[]>(MOCK_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<TicketEntry | null>(null);

  return (
    <div className="space-y-8">
      <PathBreadcrumb />
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Event Tickets</p>
        <h1 className="text-3xl font-bold text-text">Ticket Management</h1>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ticket List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Tickets ({tickets.length})
            </h2>
          </div>

          <div className="space-y-2">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  selectedTicket?.id === ticket.id
                    ? "border-[#D2045B] bg-[#D2045B]/10"
                    : "border-[#1F1F1F] bg-[#151818] hover:border-[#2E2E2E]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{ticket.attendeeName}</p>
                    <p className="text-xs text-[#6F6F6F] font-mono">{ticket.id}</p>
                  </div>
                  <span className="rounded-full bg-[#222] px-2.5 py-0.5 text-[10px] font-medium text-[#A3A3A3]">
                    {ticket.tier}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* QR Code Display */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <EventTicketQR
              eventId={params.eventId}
              ticketId={selectedTicket.id}
              eventTitle={`Event #${params.eventId}`}
              attendeeName={selectedTicket.attendeeName}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2E2E2E] bg-[#111111] py-24">
              <Ticket className="h-12 w-12 text-[#6F6F6F] mb-3" />
              <p className="text-sm text-[#6F6F6F]">Select a ticket to view its QR code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
