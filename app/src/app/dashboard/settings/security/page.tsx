"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import TwoFactorSetupModal from "@/components/common/modals/TwoFactorSetupModal";
import Modal from "@/components/shared/Modal";
import OtpInput from "@/components/shared/OtpInput";
import { getTwoFactorHint, purgeLegacyTokenStorage, type TwoFactorHint } from "@/api/session";
import {
  disableTwoFactorWithCode,
  getLoginAlerts,
  setLoginAlerts,
} from "@/services/securitySettingsService";

const CODE_LENGTH = 6;

export default function SecuritySettingsPage() {
  const [twoFactor, setTwoFactor] = useState<TwoFactorHint | null>(null);
  const [loginAlerts, setLoginAlertsState] = useState(true);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    // Drops the TOTP secret and recovery codes that older builds kept in localStorage.
    purgeLegacyTokenStorage();
    setTwoFactor(getTwoFactorHint());
    setLoginAlertsState(getLoginAlerts());
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">Account security</h2>
        <p className="text-sm text-text-muted">
          Protect your artist account with two-factor authentication from an authenticator app.
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
    </div>
  );
}

const STATUS_LABEL: Record<TwoFactorHint, string> = {
  enabled: "on",
  disabled: "off",
  unknown: "unknown",
};
