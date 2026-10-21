"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Link2, Loader2, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { usePrivy } from "@privy-io/react-auth";
import ConfirmationDialog from "@/components/shared/ConfirmationDialog";
import EmptyState from "@/components/shared/EmptyState";
import {
  SOCIAL_PLATFORMS,
  socialProfileUrl,
  type SocialPlatformId,
} from "@/utils/linkedAccounts";

type LinkedAccountDisplay = {
  id: string;
  type: string;
  label: string;
  handle?: string;
  address?: string;
  verified: boolean;
};

function mapPrivyAccounts(privyUser: any): LinkedAccountDisplay[] {
  if (!privyUser?.linkedAccounts) return [];

  return privyUser.linkedAccounts.map((account: any, index: number) => {
    const baseId = `${account.type}-${index}`;
    
    switch (account.type) {
      case "google_oauth":
        return {
          id: baseId,
          type: "google",
          label: "Google",
          handle: account.email || "Connected",
          verified: account.verified || false,
        };
      case "twitter_oauth":
        return {
          id: baseId,
          type: "x",
          label: "X (Twitter)",
          handle: account.username ? `@${account.username}` : "Connected",
          verified: account.verified || false,
        };
      case "email":
        return {
          id: baseId,
          type: "email",
          label: "Email",
          handle: account.address,
          verified: account.verified || false,
        };
      case "wallet":
        return {
          id: baseId,
          type: "wallet",
          label: "Wallet",
          address: account.address,
          verified: true,
        };
      default:
        return {
          id: baseId,
          type: account.type,
          label: account.type,
          handle: "Connected",
          verified: account.verified || false,
        };
    }
  });
}

export default function LinkedAccountsPage() {
  const { user, linkGoogle, linkTwitter, linkEmail, linkWallet, unlinkGoogle, unlinkTwitter, unlinkEmail, unlinkWallet, ready } = usePrivy();
  const [accounts, setAccounts] = useState<LinkedAccountDisplay[]>([]);
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<LinkedAccountDisplay | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) {
      setAccounts(mapPrivyAccounts(user));
    }
  }, [ready, user]);

  const socialAccounts = accounts.filter((acc) => acc.type !== "wallet" && acc.type !== "email");
  const walletAccounts = accounts.filter((acc) => acc.type === "wallet");
  const loginMethods = accounts.filter((acc) => acc.type === "email" || acc.type === "google" || acc.type === "x");

  const handleLinkGoogle = async () => {
    setPendingLink("google");
    setError(null);
    try {
      await linkGoogle();
      toast.success("Google linked successfully");
    } catch (err: any) {
      setError(err.message || "Failed to link Google account");
      toast.error("Failed to link Google account");
    } finally {
      setPendingLink(null);
    }
  };

  const handleLinkTwitter = async () => {
    setPendingLink("twitter");
    setError(null);
    try {
      await linkTwitter();
      toast.success("X (Twitter) linked successfully");
    } catch (err: any) {
      setError(err.message || "Failed to link X account");
      toast.error("Failed to link X account");
    } finally {
      setPendingLink(null);
    }
  };

  const handleLinkWallet = async () => {
    setPendingLink("wallet");
    setError(null);
    try {
      await linkWallet();
      toast.success("Wallet linked successfully");
    } catch (err: any) {
      setError(err.message || "Failed to link wallet");
      toast.error("Failed to link wallet");
    } finally {
      setPendingLink(null);
    }
  };

  const handleUnlink = async () => {
    if (!pendingUnlink) return;

    // Prevent unlinking the last login method
    if (loginMethods.length <= 1 && (pendingUnlink.type === "email" || pendingUnlink.type === "google" || pendingUnlink.type === "x")) {
      toast.error("You must keep at least one login method");
      setPendingUnlink(null);
      return;
    }

    try {
      switch (pendingUnlink.type) {
        case "google":
          await unlinkGoogle(pendingUnlink.handle || "");
          break;
        case "x":
          await unlinkTwitter(pendingUnlink.handle || "");
          break;
        case "email":
          await unlinkEmail(pendingUnlink.handle || "");
          break;
        case "wallet":
          await unlinkWallet(pendingUnlink.address || "");
          break;
      }
      toast.success("Account unlinked successfully");
      setPendingUnlink(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink account");
      setPendingUnlink(null);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">Linked accounts</h2>
        <p className="text-sm text-text-muted">
          Connect social profiles and wallets through verified OAuth. Your linked accounts are synced across all your devices.
        </p>
      </div>

      <section
        aria-labelledby="linked-social-heading"
        className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-6"
      >
        <h3 id="linked-social-heading" className="text-sm font-semibold uppercase tracking-wide">
          Social profiles
        </h3>

        {socialAccounts.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No socials linked"
            description="Link verified social profiles so fans can follow you."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {socialAccounts.map((account) => (
              <li key={account.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text flex items-center gap-2">
                    {account.label}
                    {account.verified && (
                      <Check size={14} className="text-primary" aria-label="Verified" />
                    )}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {account.handle}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setPendingUnlink(account)}
                  disabled={loginMethods.length <= 1 && (account.type === "email" || account.type === "google" || account.type === "x")}
                  aria-label={`Unlink ${account.label}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 border-t border-border-subtle pt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleLinkGoogle}
              disabled={pendingLink === "google"}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-sunken border border-border px-5 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {pendingLink === "google" ? <Loader2 size={16} className="animate-spin" /> : null}
              Link Google
            </button>
            <button
              type="button"
              onClick={handleLinkTwitter}
              disabled={pendingLink === "twitter"}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-sunken border border-border px-5 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {pendingLink === "twitter" ? <Loader2 size={16} className="animate-spin" /> : null}
              Link X (Twitter)
            </button>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="linked-wallet-heading"
        className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-6"
      >
        <h3 id="linked-wallet-heading" className="text-sm font-semibold uppercase tracking-wide">
          Wallets
        </h3>

        {walletAccounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No wallets linked"
            description="Link a wallet to receive royalties and payouts on-chain."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {walletAccounts.map((account) => (
              <li key={account.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text">{account.label}</span>
                  <span className="block truncate font-mono text-xs text-text-muted">
                    {account.address}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setPendingUnlink(account)}
                  aria-label={`Unlink ${account.label}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 border-t border-border-subtle pt-4">
          <button
            type="button"
            onClick={handleLinkWallet}
            disabled={pendingLink === "wallet"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {pendingLink === "wallet" ? <Loader2 size={16} className="animate-spin" /> : null}
            Link wallet
          </button>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-error"
        >
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}

      <p className="flex items-center gap-2 text-xs text-text-subtle">
        <Check size={14} aria-hidden="true" />
        All accounts are verified through OAuth. You cannot unlink your last login method.
      </p>

      <ConfirmationDialog
        isOpen={Boolean(pendingUnlink)}
        onClose={() => setPendingUnlink(null)}
        onConfirm={handleUnlink}
        title="Unlink this account?"
        message={
          pendingUnlink
            ? `${pendingUnlink.label} (${pendingUnlink.handle || pendingUnlink.address}) will be removed from your linked accounts.`
            : ""
        }
        confirmText="Unlink"
      />
    </div>
  );
}
