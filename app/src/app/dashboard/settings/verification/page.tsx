"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Clock, SearchCheck, Info, CheckCircle2, AlertCircle } from "lucide-react";
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
    description: "Tell us your legal name and share a link that proves your artist identity.",
  },
  {
    key: "review",
    label: "2. Review",
    description: "The AudioBlocks compliance team reviews the request, usually within 2-3 business days.",
  },
  {
    key: "badge",
    label: "3. Verified badge",
    description: "Approved artists get a verified badge shown across the portal and discovery pages.",
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
          <h2 className="text-xl font-semibold text-text">Artist Verification Status &amp; Badge</h2>
          <p className="text-sm text-text-muted">
            Verify your artist identity to unlock official badges, enhanced distribution, and direct contract rights.
          </p>
        </div>
        {status === "verified" && <VerifiedBadge />}
      </div>

      {/* Verification Status Overview Banner (#780) */}
      <div
        data-testid="verification-status-banner"
        className={`rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4 ${
          status === "verified"
            ? "border-success/30 bg-success/5"
            : status === "pending"
              ? "border-primary/30 bg-primary/5"
              : "border-border-subtle bg-surface"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
              status === "verified"
                ? "bg-success/15 text-success"
                : status === "pending"
                  ? "bg-primary/15 text-primary"
                  : "bg-surface-sunken text-text-muted"
            }`}
          >
            {status === "verified" ? (
              <BadgeCheck size={22} aria-hidden="true" />
            ) : status === "pending" ? (
              <Clock size={22} aria-hidden="true" />
            ) : (
              <SearchCheck size={22} aria-hidden="true" />
            )}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text">Account State:</span>
              <span
                data-testid="verification-badge-label"
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  status === "verified"
                    ? "bg-success/20 text-success"
                    : status === "pending"
                      ? "bg-primary/20 text-primary"
                      : "bg-surface-raised text-text-muted"
                }`}
              >
                {status === "verified" ? "Verified Artist" : status === "pending" ? "Under Review" : "Unverified"}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              {status === "verified" &&
                "Your profile has been fully vetted. You have access to official creator perks and trusted badges."}
              {status === "pending" &&
                "Your application is currently being evaluated by our team. You do not need to resubmit."}
              {status === "unverified" &&
                "Submit your official artist details and proof link to initiate the verification process."}
            </p>
          </div>
        </div>

        {status === "unverified" && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            Request verification
          </button>
        )}
      </div>

      {/* Contextual Guidance Box (#780) */}
      <section className="rounded-xl border border-border-subtle bg-surface p-4 text-xs text-text-muted space-y-3">
        <div className="flex items-center gap-2 font-semibold text-text">
          <Info size={16} className="text-primary" />
          <span>Verification Requirements &amp; Guidance</span>
        </div>

        {status === "unverified" && (
          <ul className="list-disc list-inside space-y-1.5 pl-1">
            <li>
              <strong>Proof of Identity:</strong> Provide a link to your official verified Spotify, Apple Music, or YouTube Music artist profile.
            </li>
            <li>
              <strong>Online Presence:</strong> We cross-check links with active social profiles (Twitter/X, Instagram, or official website).
            </li>
            <li>
              <strong>Turnaround Time:</strong> Once submitted, the compliance team reviews requests in 2-3 business days.
            </li>
          </ul>
        )}

        {status === "pending" && (
          <div className="space-y-1">
            <p>
              Your verification application was logged on{" "}
              <strong>{submittedAt ? new Date(submittedAt).toLocaleDateString() : "recently"}</strong>. Our reviewers verify ownership of the linked external profiles to protect creators against impersonation.
            </p>
            <p className="text-amber-300">
              Note: If you made an error in your submitted link, you can withdraw your request below and submit again.
            </p>
          </div>
        )}

        {status === "verified" && (
          <div className="space-y-1">
            <p className="text-success font-medium flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Official Verified Status Active
            </p>
            <p>
              Your profile displays the verified artist badge on all catalog items and tracks. Verified artists are prioritized in platform discovery algorithms and have access to direct smart contract minting rights.
            </p>
          </div>
        )}
      </section>

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
              Request Details &amp; History
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
