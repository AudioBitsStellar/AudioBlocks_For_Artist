"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { HelpCircle, MessageSquare, X, Send, Mail, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

export interface FeedbackData {
  category: "bug" | "feature" | "general";
  message: string;
  email?: string;
  submittedAt: string;
}

export default function SupportFeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"support" | "feedback">("feedback");
  const [category, setCategory] = useState<"bug" | "feature" | "general">("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter a feedback message.");
      return;
    }

    setSubmitting(true);

    const feedbackPayload: FeedbackData = {
      category,
      message: message.trim(),
      email: email.trim() || undefined,
      submittedAt: new Date().toISOString(),
    };

    // Store in localStorage for audit & offline resilience
    try {
      const existing = JSON.parse(localStorage.getItem("audioblocks:artist-feedback") || "[]");
      existing.push(feedbackPayload);
      localStorage.setItem("audioblocks:artist-feedback", JSON.stringify(existing));
    } catch {
      // Ignore localStorage errors
    }

    setTimeout(() => {
      setSubmitting(false);
      toast.success("Thank you for your feedback! Our team will review it.");
      setMessage("");
      setIsOpen(false);
    }, 400);
  };

  return (
    <>
      {/* Floating Entry Point Button - Visible on Every Page */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#D2045B] hover:bg-[#B8043F] text-white px-4 py-2.5 shadow-lg shadow-pink-950/40 border border-pink-400/20 text-sm font-medium transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
        aria-label="Open Support & Feedback"
        data-testid="support-feedback-trigger"
      >
        <MessageSquare className="w-4 h-4" aria-hidden="true" />
        <span>Support & Feedback</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-dialog-title"
          data-testid="support-feedback-dialog"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#161616] border border-[#2A2A2A] shadow-2xl p-6 space-y-6 text-gray-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-pink-500/10 text-[#D2045B] border border-pink-500/20">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="support-dialog-title" className="text-lg font-bold text-white">
                    Support & Feedback
                  </h2>
                  <p className="text-xs text-gray-400">We are here to help your music thrive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-black/50 p-1 border border-[#2A2A2A]">
              <button
                type="button"
                onClick={() => setActiveTab("feedback")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === "feedback"
                    ? "bg-[#D2045B] text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Send Feedback
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("support")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === "support"
                    ? "bg-[#D2045B] text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Contact Support
              </button>
            </div>

            {/* Feedback Tab Content */}
            {activeTab === "feedback" && (
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "general", label: "General" },
                        { id: "feature", label: "Idea / Feature" },
                        { id: "bug", label: "Bug Report" },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCategory(item.id)}
                        className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-colors cursor-pointer ${
                          category === item.id
                            ? "bg-pink-500/10 border-[#D2045B] text-white font-semibold"
                            : "bg-white/5 border-transparent text-gray-400 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="feedback-message"
                    className="block text-xs font-medium text-gray-300 mb-1.5"
                  >
                    Your Feedback <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    maxLength={1000}
                    rows={4}
                    placeholder="Tell us what you love, what feels clunky, or what features you need..."
                    className="w-full rounded-xl bg-white/5 border border-[#2A2A2A] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D2045B] focus:ring-1 focus:ring-[#D2045B] transition-colors resize-none"
                  />
                  <div className="text-right text-[11px] text-gray-500 mt-1">
                    {message.length} / 1000 characters
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="feedback-email"
                    className="block text-xs font-medium text-gray-300 mb-1.5"
                  >
                    Your Email (Optional, if you want a reply)
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="artist@example.com"
                    className="w-full rounded-xl bg-white/5 border border-[#2A2A2A] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D2045B] focus:ring-1 focus:ring-[#D2045B] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#D2045B] hover:bg-[#B8043F] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 text-sm transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Sending..." : "Submit Feedback"}</span>
                </button>
              </form>
            )}

            {/* Support Tab Content */}
            {activeTab === "support" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-[#2A2A2A] space-y-2">
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    <Mail className="w-4 h-4 text-[#D2045B]" />
                    <span>Direct Artist Support</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Reach our artist concierge team directly for urgent help with catalog releases,
                    wallet connections, or payouts.
                  </p>
                  <a
                    href="mailto:support@audioblocks.com"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D2045B] hover:underline pt-1"
                  >
                    <span>support@audioblocks.com</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-[#2A2A2A] space-y-2">
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Frequently Asked Questions & Docs</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Check our artist guides on Soroban royalties, track transcoding, and Stellar
                    wallet setup.
                  </p>
                  <div className="flex gap-4 pt-1">
                    <Link
                      href="/#faq"
                      onClick={() => setIsOpen(false)}
                      className="text-xs text-emerald-400 hover:underline"
                    >
                      Browse FAQs &rarr;
                    </Link>
                    <Link
                      href="/terms"
                      onClick={() => setIsOpen(false)}
                      className="text-xs text-gray-400 hover:underline"
                    >
                      Terms of Service
                    </Link>
                    <Link
                      href="/privacy"
                      onClick={() => setIsOpen(false)}
                      className="text-xs text-gray-400 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <span className="text-[11px] text-gray-500">
                    Typical response time: &lt; 24 hours &bull; Mon - Fri
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
