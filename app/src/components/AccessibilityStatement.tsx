"use client";

import Link from "next/link";
import { CheckCircle2, Mail, ExternalLink, ShieldCheck } from "lucide-react";

export default function AccessibilityStatement() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8 border-b border-[var(--border-subtle)] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="text-emerald-400" size={28} aria-hidden="true" />
          <h1 className="text-white text-3xl font-bold">Accessibility Statement</h1>
        </div>
        <p className="text-[var(--text-muted)] text-base">
          Our ongoing commitment to digital accessibility for all artists and creators on AudioBlocks.
        </p>
      </div>

      <div className="space-y-8 text-[var(--text)]">
        {/* Conformance Status */}
        <section aria-labelledby="conformance-heading" className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-xl p-6">
          <h2 id="conformance-heading" className="text-xl font-semibold text-white mb-3">
            Conformance Status
          </h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            AudioBlocks is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.
          </p>
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3.5 py-2 text-sm text-emerald-400 font-medium">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>Target Standard: Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</span>
          </div>
        </section>

        {/* Accessibility Measures */}
        <section aria-labelledby="measures-heading" className="space-y-4">
          <h2 id="measures-heading" className="text-xl font-semibold text-white">
            Measures Taken to Support Accessibility
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg">
              <h3 className="font-semibold text-white mb-1.5">Keyboard Operability</h3>
              <p className="text-sm text-gray-400">
                All interactive controls, modals, forms, and audio controls are navigable and operable without a mouse using standard keyboard navigation (Tab, Enter, Space, Escape, Arrow keys).
              </p>
            </div>
            <div className="p-4 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg">
              <h3 className="font-semibold text-white mb-1.5">Screen Reader Optimization</h3>
              <p className="text-sm text-gray-400">
                ARIA landmarks, live regions for dynamic alerts and uploads, descriptive accessible labels, and structured headings are embedded throughout the application.
              </p>
            </div>
            <div className="p-4 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg">
              <h3 className="font-semibold text-white mb-1.5">Color Contrast & Motion</h3>
              <p className="text-sm text-gray-400">
                Theme tokens maintain minimum contrast ratios of 4.5:1 for standard text and 3:1 for large text. Animations strictly respect the <code>prefers-reduced-motion</code> operating system setting.
              </p>
            </div>
            <div className="p-4 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg">
              <h3 className="font-semibold text-white mb-1.5">Focus Management</h3>
              <p className="text-sm text-gray-400">
                High-contrast focus rings are visible on all interactive elements. Overlay dialogs contain focus traps and restore focus to trigger elements upon dismissal.
              </p>
            </div>
          </div>
        </section>

        {/* Feedback & Contact Route */}
        <section aria-labelledby="contact-heading" className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-6">
          <h2 id="contact-heading" className="text-xl font-semibold text-white mb-2">
            Feedback & Accessibility Contact Route
          </h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            We welcome your feedback on the accessibility of the AudioBlocks Artist Dashboard. If you encounter accessibility barriers, experience difficulty using assistive technology, or have recommendations for improvement, please contact our accessibility team:
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <a
              href="mailto:accessibility@audioblocks.io?subject=Accessibility%20Feedback"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Mail size={18} aria-hidden="true" />
              <span>accessibility@audioblocks.io</span>
            </a>
            <span className="text-sm text-gray-400">
              We aim to respond to accessibility inquiries within 2 business days.
            </span>
          </div>
        </section>

        {/* Audit Documentation Links */}
        <section aria-labelledby="docs-heading" className="border-t border-[var(--border-subtle)] pt-6 text-sm text-gray-400">
          <p>
            For engineering details, automated test criteria, and our historical audits, please refer to our internal{" "}
            <Link href="/dashboard/changelog" className="text-emerald-400 hover:underline inline-flex items-center gap-1">
              Release Notes <ExternalLink size={14} aria-hidden="true" />
            </Link>{" "}
            and repository accessibility documentation.
          </p>
        </section>
      </div>
    </div>
  );
}
