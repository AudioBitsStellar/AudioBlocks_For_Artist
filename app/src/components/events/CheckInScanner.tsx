"use client";

import { useState } from "react";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

interface CheckInResult {
  ticketId: string;
  status: "valid" | "invalid" | "already_checked_in";
  attendeeName?: string;
}

interface CheckInStats {
  total: number;
  checkedIn: number;
  remaining: number;
}

const MOCK_CHECK_IN_RESULTS: Record<string, CheckInResult> = {
  "TICKET-001": { ticketId: "TICKET-001", status: "valid", attendeeName: "Alice Johnson" },
  "TICKET-002": { ticketId: "TICKET-002", status: "valid", attendeeName: "Bob Smith" },
  "TICKET-003": { ticketId: "TICKET-003", status: "already_checked_in", attendeeName: "Carol White" },
  "FAKE-001": { ticketId: "FAKE-001", status: "invalid" },
};

export default function CheckInScanner({ eventId }: { eventId: string | number }) {
  const [manualInput, setManualInput] = useState("");
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stats] = useState<CheckInStats>({ total: 500, checkedIn: 127, remaining: 373 });

  const handleCheckIn = async (ticketId: string) => {
    setIsScanning(true);
    setLastResult(null);

    // Simulate API call delay
    await new Promise((r) => setTimeout(r, 800));

    const result = MOCK_CHECK_IN_RESULTS[ticketId] ?? {
      ticketId,
      status: "invalid" as const,
    };

    setLastResult(result);
    setIsScanning(false);

    if (result.status === "valid") {
      toast.success(`Checked in: ${result.attendeeName ?? ticketId}`);
    } else if (result.status === "already_checked_in") {
      toast.warning(`Already checked in: ${result.attendeeName ?? ticketId}`);
    } else {
      toast.error(`Invalid ticket: ${ticketId}`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleCheckIn(manualInput.trim());
    setManualInput("");
  };

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Tickets", value: stats.total, icon: Users, color: "text-white" },
          { label: "Checked In", value: stats.checkedIn, icon: UserCheck, color: "text-green-400" },
          { label: "Remaining", value: stats.remaining, icon: UserX, color: "text-[#A3A3A3]" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[#1F1F1F] bg-[#151818] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`text-3xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Scanner Area */}
      <div className="rounded-2xl border border-[#1F1F1F] bg-[#151818] p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-white">
            <ScanLine className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Ticket Scanner</h2>
          </div>

          {/* Simulated scan area */}
          <div className="relative w-64 h-64 rounded-2xl border-2 border-dashed border-[#2E2E2E] bg-[#111111] flex items-center justify-center">
            {isScanning ? (
              <Loader2 className="h-12 w-12 animate-spin text-[#D2045B]" />
            ) : lastResult ? (
              <div className="flex flex-col items-center gap-3">
                {lastResult.status === "valid" ? (
                  <CheckCircle2 className="h-16 w-16 text-green-400" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-400" />
                )}
                <div className="text-center">
                  <p className={`text-sm font-semibold ${lastResult.status === "valid" ? "text-green-400" : "text-red-400"}`}>
                    {lastResult.status === "valid"
                      ? "Valid Ticket"
                      : lastResult.status === "already_checked_in"
                        ? "Already Checked In"
                        : "Invalid Ticket"}
                  </p>
                  {lastResult.attendeeName && (
                    <p className="text-xs text-[#A3A3A3] mt-1">{lastResult.attendeeName}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#6F6F6F]">
                <ScanLine className="h-12 w-12" />
                <p className="text-xs text-center">Point camera at ticket QR code<br />or enter ticket ID below</p>
              </div>
            )}

            {/* Scan frame corners */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#D2045B] rounded-tl-lg" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#D2045B] rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#D2045B] rounded-bl-lg" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#D2045B] rounded-br-lg" />
          </div>

          {/* Manual entry */}
          <form onSubmit={handleManualSubmit} className="flex w-full max-w-md items-center gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter ticket ID manually"
              className="flex-1 rounded-full border border-[#2E2E2E] bg-[#111111] px-5 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#885FA8] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualInput.trim() || isScanning}
              className="rounded-full bg-[#D2045B] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#B8043F] disabled:opacity-50"
            >
              Check In
            </button>
          </form>

          {/* Quick test buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-[#6F6F6F]">Quick test:</span>
            {["TICKET-001", "TICKET-003", "FAKE-001"].map((id) => (
              <button
                key={id}
                onClick={() => handleCheckIn(id)}
                disabled={isScanning}
                className="rounded-full border border-[#2E2E2E] px-3 py-1 text-xs font-mono text-[#A3A3A3] transition-colors hover:border-[#885FA8] hover:text-white disabled:opacity-50"
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent check-ins */}
      <div className="rounded-2xl border border-[#1F1F1F] bg-[#151818] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Check-ins</h3>
        <div className="space-y-3">
          {[
            { ticketId: "TICKET-127", name: "Maria Garcia", time: "2 min ago", status: "valid" as const },
            { ticketId: "TICKET-126", name: "James Wilson", time: "5 min ago", status: "valid" as const },
            { ticketId: "TICKET-125", name: "Sarah Chen", time: "8 min ago", status: "already_checked_in" as const },
          ].map((ci) => (
            <div key={ci.ticketId} className="flex items-center justify-between rounded-xl bg-[#111111] px-4 py-3">
              <div className="flex items-center gap-3">
                {ci.status === "valid" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-yellow-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">{ci.name}</p>
                  <p className="text-xs text-[#6F6F6F] font-mono">{ci.ticketId}</p>
                </div>
              </div>
              <span className="text-xs text-[#A3A3A3]">{ci.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
