"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import TwoFactorSetupModal from "@/components/common/modals/TwoFactorSetupModal";
import ConfirmationDialog from "@/components/shared/ConfirmationDialog";
import {
  disableTwoFactor,
  getSecuritySettings,
  setLoginAlerts,
  type SecuritySettings,
} from "@/services/securitySettingsService";

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);

  useEffect(() => {
    setSettings(getSecuritySettings());
  }, []);

  const twoFactorEnabled = settings?.twoFactorStatus === "enabled";

  const handleToggleLoginAlerts = () => {
    if (!settings) return;
    const next = setLoginAlerts(!settings.loginAlerts);
    setSettings(next);
    toast.success(next.loginAlerts ? "Login alerts turned on." : "Login alerts turned off.");
  };

  const handleDisable = () => {
    setSettings(disableTwoFactor());
    toast.success("Two-factor authentication disabled.");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">Account security</h2>
        <p className="text-sm text-text-muted">
          Protect your artist account with two-factor authentication, powered by Privy.
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
                Ask for a 6-digit code from your authenticator app whenever your account is opened
                on a new device.
              </p>
              <p className="mt-2 text-xs uppercase tracking-wide text-text-muted">
                Status:{" "}
                <span data-testid="two-factor-status" className="font-semibold text-text">
                  {settings ? settings.twoFactorStatus : "loading"}
                </span>
                {" · Provider: "}
                <span className="font-semibold text-text">Privy</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {!twoFactorEnabled ? (
              <button
                type="button"
                onClick={() => setIsSetupOpen(true)}
                disabled={!settings || settings.twoFactorStatus === "pending"}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {settings?.twoFactorStatus === "pending" ? "Finish setup" : "Enable 2FA"}
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

        {settings?.recoveryCodes && twoFactorEnabled && (
          <p className="mt-4 text-xs text-text-muted">
            {settings.recoveryCodes.length} recovery codes are stored for this account.
          </p>
        )}
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
              checked={settings?.loginAlerts ?? true}
              onChange={handleToggleLoginAlerts}
              disabled={!settings}
              className="h-6 w-11 appearance-none rounded-full border border-border bg-surface-raised transition-colors checked:border-primary checked:bg-primary"
            />
          </label>
        </div>
      </section>

      <TwoFactorSetupModal
        open={isSetupOpen}
        onOpenChange={setIsSetupOpen}
        onEnabled={() => setSettings(getSecuritySettings())}
      />

      <ConfirmationDialog
        isOpen={isDisableOpen}
        onClose={() => setIsDisableOpen(false)}
        onConfirm={handleDisable}
        title="Disable two-factor authentication?"
        message="Your account will only be protected by your password. You will lose your current recovery codes."
        confirmText="Disable 2FA"
      />
    </div>
  );
}
