"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Clock, SearchCheck } from "lucide-react";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import VerificationApplicationModal from "@/components/common/modals/VerificationApplicationModal";
import ConfirmationDialog from "@/components/shared/ConfirmationDialog";
import {
  approveVerification,
  getVerificationApplication,
  getVerificationSubmittedAt,
  getVerificationStatus,
  withdrawVerification,
  type VerificationApplication,
  type VerificationStatus,
} from "@/services/verificationService";

const STEPS: Array<{ key: string; label: string; description: string }> = [
  {
    key: "submit",
    label: "1. Submit your request",
    description: "Tell us your legal name and share a link that proves your identity.",
  },
  {
    key: "review",
    label: "2. Review",
    description: "The AudioBlocks team reviews the request, usually within a few days.",
  },
  {
    key: "badge",
    label: "3. Verified badge",
    description: "Approved artists get a verified badge shown across the portal.",
  },
];

export default function VerificationSettingsPage() {
  const [status, setStatus] = useState<VerificationStatus>("unverified");
  const [application, setApplication] = useState<VerificationApplication | undefined>();
  const [submittedAt, setSubmittedAt] = useState<string | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const hydrate = () => {
    setStatus(getVerificationStatus());
    setApplication(getVerificationApplication());
    setSubmittedAt(getVerificationSubmittedAt());
  };

  useEffect(() => {
    hydrate();
  }, []);

  const activeStep = status === "verified" ? 3 : status === "pending" ? 2 : 1;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Artist verification badge</h2>
          <p className="text-sm text-text-muted">
            Request the badge that tells fans the profile really belongs to you.
          </p>
        </div>
        {status === "verified" && <VerifiedBadge />}
      </div>

      <section
        aria-label="Verification request progress"
        className="rounded-2xl border border-border-subtle bg-surface p-6"
      >
        <ol className="space-y-4">
          {STEPS.map((step, index) => {
            const isDone = index + 1 < activeStep;
            const isCurrent = index + 1 === activeStep;
            const Icon = isDone ? BadgeCheck : isCurrent ? Clock : SearchCheck;
            return (
              <li key={step.key} className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                    isDone
                      ? "border-success text-success"
                      : isCurrent
                        ? "border-primary text-primary"
                        : "border-border text-text-muted"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                </span>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isDone || isCurrent ? "text-text" : "text-text-muted"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-sm text-text-muted">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section
        aria-labelledby="verification-status-heading"
        className="rounded-2xl border border-border-subtle bg-surface p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 id="verification-status-heading" className="font-semibold text-text">
              Request status
            </h3>
            <p className="text-sm text-text-muted" data-testid="verification-status">
              {status === "unverified" && "You have not submitted a request yet."}
              {status === "pending" && "Your request is under review."}
              {status === "verified" && "Your artist profile is verified."}
            </p>
            {application && (
              <dl className="mt-3 space-y-1 text-sm text-text-muted">
                <div className="flex gap-2">
                  <dt className="font-medium text-text">Legal name:</dt>
                  <dd>{application.legalName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-text">Proof link:</dt>
                  <dd className="truncate">{application.proofUrl}</dd>
                </div>
                {submittedAt && (
                  <div className="flex gap-2">
                    <dt className="font-medium text-text">Submitted:</dt>
                    <dd>{new Date(submittedAt).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <div className="flex gap-3">
            {status === "unverified" && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
              >
                Request verification
              </button>
            )}
            {status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(true)}
                  className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text"
                >
                  Withdraw request
                </button>
                {process.env.NODE_ENV !== "production" && (
                  <button
                    type="button"
                    onClick={() => setStatus(approveVerification())}
                    className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text"
                  >
                    Simulate approval (dev)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <VerificationApplicationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmitted={hydrate}
      />

      <ConfirmationDialog
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onConfirm={() => {
          withdrawVerification();
          hydrate();
        }}
        title="Withdraw your request?"
        message="Your application will be cleared and you can submit a new one at any time."
        confirmText="Withdraw"
      />
    </div>
  );
}
