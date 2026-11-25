"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, ShieldOff, Download, Trash2, AlertOctagon, CheckCircle2, Clock } from "lucide-react";
import TwoFactorSetupModal from "@/components/common/modals/TwoFactorSetupModal";
import Modal from "@/components/shared/Modal";
import OtpInput from "@/components/shared/OtpInput";
import { getTwoFactorHint, purgeLegacyTokenStorage, type TwoFactorHint } from "@/api/session";
import {
  disableTwoFactorWithCode,
  getLoginAlerts,
  setLoginAlerts,
} from "@/services/securitySettingsService";
import {
  getDataExportStatus,
  requestDataExport,
  clearDataExport,
  getAccountDeletionStatus,
  requestAccountDeletion,
  cancelAccountDeletion,
  type DataExportJob,
  type AccountDeletionJob,
} from "@/services/accountDataService";

const CODE_LENGTH = 6;

export default function SecuritySettingsPage() {
  const [twoFactor, setTwoFactor] = useState<TwoFactorHint | null>(null);
  const [loginAlerts, setLoginAlertsState] = useState(true);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);

  // Account Data Export & Deletion States (#784)
  const [exportJob, setExportJob] = useState<DataExportJob | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [deletionJob, setDeletionJob] = useState<AccountDeletionJob | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Drops the TOTP secret and recovery codes that older builds kept in localStorage.
    purgeLegacyTokenStorage();
    setTwoFactor(getTwoFactorHint());
    setLoginAlertsState(getLoginAlerts());
    setExportJob(getDataExportStatus());
    setDeletionJob(getAccountDeletionStatus());
  }, []);

  const twoFactorEnabled = twoFactor === "enabled";

  const handleToggleLoginAlerts = () => {
    const next = setLoginAlerts(!loginAlerts);
    setLoginAlertsState(next);
    toast.success(next ? "Login alerts turned on." : "Login alerts turned off.");
  };

  const handleDisable = async (event: FormEvent) => {
    event.preventDefault();
    if (disableCode.length !== CODE_LENGTH || isDisabling) return;
    setIsDisabling(true);
    try {
      await disableTwoFactorWithCode(disableCode);
      setTwoFactor("disabled");
      setIsDisableOpen(false);
      setDisableCode("");
      toast.success("Two-factor authentication disabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That code is not correct.");
      setDisableCode("");
    } finally {
      setIsDisabling(false);
    }
  };

  const handleRequestExport = async () => {
    setIsExporting(true);
    try {
      const job = await requestDataExport();
      setExportJob(job);
      toast.success("Data export requested. We are preparing your archive.");
      // Poll once after a delay to show complete state
      setTimeout(() => {
        setExportJob(getDataExportStatus());
      }, 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initiate data export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearExport = () => {
    clearDataExport();
    setExportJob(getDataExportStatus());
    toast.success("Export record cleared.");
  };

  const handleConfirmDeletion = async (event: FormEvent) => {
    event.preventDefault();
    if (deleteConfirmationInput.trim().toUpperCase() !== "DELETE") {
      toast.error('Please type "DELETE" exactly to confirm.');
      return;
    }
    setIsDeleting(true);
    try {
      const job = await requestAccountDeletion(deleteConfirmationInput);
      setDeletionJob(job);
      setIsDeleteDialogOpen(false);
      setDeleteConfirmationInput("");
      toast.success("Account deletion initiated with 14-day grace period.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process deletion request.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await cancelAccountDeletion();
      setDeletionJob(null);
      toast.success("Account deletion request has been canceled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel deletion.");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">Account security &amp; privacy</h2>
        <p className="text-sm text-text-muted">
          Protect your artist account with two-factor authentication, export your profile data, or manage account lifecycle.
        </p>
      </div>

      <section
        aria-labelledby="two-factor-heading"
        className="rounded-2xl border border-border-subtle bg-surface p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken">
              {twoFactorEnabled ? (
                <ShieldCheck size={20} className="text-success" aria-hidden="true" />
              ) : (
                <KeyRound size={20} className="text-text-muted" aria-hidden="true" />
              )}
            </span>
            <div>
              <h3 id="two-factor-heading" className="font-semibold text-text">
                Two-factor authentication
              </h3>
              <p className="text-sm text-text-muted">
                Ask for a 6-digit code from your authenticator app whenever you log in.
              </p>
              <p className="mt-2 text-xs uppercase tracking-wide text-text-muted">
                Status:{" "}
                <span data-testid="two-factor-status" className="font-semibold text-text">
                  {twoFactor === null ? "loading" : STATUS_LABEL[twoFactor]}
                </span>
              </p>
              {twoFactor === "unknown" && (
                <p className="mt-2 text-xs text-text-muted">
                  We can&apos;t confirm this setting from this session. Log out and back in to
                  check it.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {!twoFactorEnabled ? (
              <button
                type="button"
                onClick={() => setIsSetupOpen(true)}
                disabled={twoFactor !== "disabled"}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enable 2FA
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsDisableOpen(true)}
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text"
              >
                <ShieldOff size={14} aria-hidden="true" className="mr-1 inline" />
                Disable
              </button>
            )}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="login-alerts-heading"
        className="rounded-2xl border border-border-subtle bg-surface p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 id="login-alerts-heading" className="font-semibold text-text">
              Login alerts
            </h3>
            <p className="text-sm text-text-muted">
              Get an email whenever a new device signs in to your account.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3">
            <span className="sr-only">Enable login alerts</span>
            <input
              type="checkbox"
              role="switch"
              checked={loginAlerts}
              onChange={handleToggleLoginAlerts}
              className="h-6 w-11 appearance-none rounded-full border border-border bg-surface-raised transition-colors checked:border-primary checked:bg-primary"
            />
          </label>
        </div>
      </section>

      {/* Data Export Section (#784) */}
      <section
        aria-labelledby="data-export-heading"
        className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken">
              <Download size={20} className="text-primary" aria-hidden="true" />
            </span>
            <div>
              <h3 id="data-export-heading" className="font-semibold text-text">
                Export artist data
              </h3>
              <p className="text-sm text-text-muted">
                Download a machine-readable archive (JSON) of your profile, catalog metadata, royalty history, and analytics.
              </p>
              {exportJob && exportJob.status !== "idle" && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {exportJob.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 text-success font-medium">
                      <CheckCircle2 size={14} /> Ready for download (148 KB) • Requested {new Date(exportJob.requestedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                      <Clock size={14} className="animate-spin" /> Processing archive job...
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {exportJob && exportJob.status === "completed" ? (
              <>
                <a
                  href={exportJob.downloadUrl || "#"}
                  download="audioblocks_artist_archive.json"
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover inline-flex items-center gap-2"
                >
                  <Download size={14} />
                  Download archive
                </a>
                <button
                  type="button"
                  onClick={handleClearExport}
                  className="text-xs text-text-muted hover:text-text transition-colors"
                >
                  Clear
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleRequestExport}
                disabled={isExporting || exportJob?.status === "queued" || exportJob?.status === "processing"}
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-text transition-colors hover:border-primary disabled:opacity-50"
              >
                {isExporting ? "Submitting..." : "Request export"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Account Deletion Section (#784) */}
      <section
        aria-labelledby="account-deletion-heading"
        className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <AlertOctagon size={20} aria-hidden="true" />
            </span>
            <div>
              <h3 id="account-deletion-heading" className="font-semibold text-red-400">
                Delete artist account
              </h3>
              <p className="text-sm text-text-muted mt-1">
                Permanently remove your artist profile, music catalog, and associated personal data. On-chain smart contracts cannot be deleted but will be decoupled from your account.
              </p>
              {deletionJob && deletionJob.status === "pending_grace_period" && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <p className="font-semibold text-amber-300">Deletion Scheduled</p>
                  <p className="mt-0.5">
                    Your account is currently scheduled for deletion on{" "}
                    <strong>{new Date(deletionJob.scheduledExecutionAt).toLocaleDateString()}</strong> (14-day grace period). You may cancel this request at any time prior to that date.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            {deletionJob && deletionJob.status === "pending_grace_period" ? (
              <button
                type="button"
                onClick={handleCancelDeletion}
                className="rounded-full bg-surface-raised border border-border px-5 py-2 text-sm font-semibold text-text transition-colors hover:border-primary"
              >
                Cancel deletion request
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="rounded-full border border-red-500/40 px-5 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15"
              >
                <Trash2 size={14} className="inline mr-1.5" />
                Delete account
              </button>
            )}
          </div>
        </div>
      </section>

      <TwoFactorSetupModal
        open={isSetupOpen}
        onOpenChange={setIsSetupOpen}
        onEnabled={() => setTwoFactor(getTwoFactorHint())}
      />

      <Modal
        open={isDisableOpen}
        onOpenChange={(next) => {
          if (!next) setDisableCode("");
          setIsDisableOpen(next);
        }}
        subtitle="Account security"
        title="Disable two-factor authentication?"
        size="md"
      >
        <form onSubmit={handleDisable} className="space-y-5 text-white">
          <p className="text-sm text-[#A3A3A3]">
            Your account will only be protected by your password. Enter a current code from your
            authenticator app to confirm.
          </p>
          <OtpInput
            name="disable-2fa-code"
            value={disableCode}
            onChange={setDisableCode}
            disabled={isDisabling}
            length={CODE_LENGTH}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDisableOpen(false)}
              className="rounded-full border border-[#2A2A2A] px-5 py-2 text-sm font-semibold text-[#A3A3A3] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDisabling || disableCode.length !== CODE_LENGTH}
              className="rounded-full bg-[#D2045B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B8043F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Disable 2FA
            </button>
          </div>
        </form>
      </Modal>

      {/* Account Deletion Confirmation Modal (#784) */}
      <Modal
        open={isDeleteDialogOpen}
        onOpenChange={(next) => {
          if (!next) setDeleteConfirmationInput("");
          setIsDeleteDialogOpen(next);
        }}
        subtitle="Irreversible Action"
        title="Are you sure you want to delete your account?"
        size="md"
      >
        <form onSubmit={handleConfirmDeletion} className="space-y-5 text-white">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 space-y-1">
            <p className="font-semibold">Warning: This action cannot be undone after the grace period.</p>
            <p>
              Your public releases, artist profile, and royalty metadata will be unlinked. A 14-day grace period is provided during which you can reverse this action.
            </p>
          </div>

          <div>
            <label htmlFor="delete-confirm-input" className="block text-xs font-medium text-text-muted mb-1.5">
              Type <strong className="text-white">DELETE</strong> to confirm:
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-lg border border-border-subtle bg-surface-raised px-4 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-red-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteConfirmationInput("");
              }}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-text-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeleting || deleteConfirmationInput.trim().toUpperCase() !== "DELETE"}
              className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "Processing..." : "Initiate Deletion"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const STATUS_LABEL: Record<TwoFactorHint, string> = {
  enabled: "on",
  disabled: "off",
  unknown: "unknown",
};
