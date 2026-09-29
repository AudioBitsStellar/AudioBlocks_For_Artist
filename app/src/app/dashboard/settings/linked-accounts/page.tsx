"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Link2, Plus, Star, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import ConfirmationDialog from "@/components/shared/ConfirmationDialog";
import EmptyState from "@/components/shared/EmptyState";
import {
  addSocialLink,
  addWalletLink,
  getSocialLinks,
  getWalletLinks,
  setPrimaryWallet,
  unlinkAccount,
  type LinkedAccount,
} from "@/services/linkedAccountsService";
import {
  isHandleTaken,
  SOCIAL_PLATFORMS,
  socialProfileUrl,
  validateHandle,
  type SocialPlatformId,
} from "@/utils/linkedAccounts";

const platformLabel = (platform?: SocialPlatformId) =>
  SOCIAL_PLATFORMS.find((entry) => entry.id === platform)?.label ?? "Social";

export default function LinkedAccountsPage() {
  const [social, setSocial] = useState<LinkedAccount[]>([]);
  const [wallets, setWallets] = useState<LinkedAccount[]>([]);
  const [platform, setPlatform] = useState<SocialPlatformId>("x");
  const [handle, setHandle] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<LinkedAccount | null>(null);

  const hydrate = () => {
    setSocial(getSocialLinks());
    setWallets(getWalletLinks());
  };

  useEffect(() => {
    hydrate();
  }, []);

  const meta = SOCIAL_PLATFORMS.find((entry) => entry.id === platform)!;

  const socialError = useMemo(() => {
    if (!handle.trim()) return null;
    const result = validateHandle(platform, handle);
    if (!result.ok) return result.message;
    if (isHandleTaken(platform, result.handle, social)) {
      return `You already link ${platformLabel(platform)} as @${result.handle}.`;
    }
    return null;
  }, [handle, platform, social]);

  const walletError = useMemo(() => {
    if (!walletAddress.trim()) return null;
    return addWalletLink("", walletAddress).ok
      ? null
      : "Enter a valid Stellar address that starts with G.";
  }, [walletAddress]);

  const handleAddSocial = () => {
    const result = validateHandle(platform, handle);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (isHandleTaken(platform, result.handle, social)) {
      setError(`You already link ${platformLabel(platform)} as @${result.handle}.`);
      return;
    }
    const added = addSocialLink(platform, meta.label, result.handle);
    if (!added.ok) {
      setError(added.message);
      return;
    }
    setHandle("");
    setError(null);
    toast.success(`${meta.label} linked.`);
    hydrate();
  };

  const handleAddWallet = () => {
    const added = addWalletLink("Payout wallet", walletAddress);
    if (!added.ok) {
      setError(added.message);
      return;
    }
    setWalletAddress("");
    setError(null);
    toast.success("Wallet linked.");
    hydrate();
  };

  const handleRemove = () => {
    if (!pendingRemoval) return;
    unlinkAccount(pendingRemoval.id);
    setPendingRemoval(null);
    toast.success("Account unlinked.");
    hydrate();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">Linked accounts</h2>
        <p className="text-sm text-text-muted">
          Connect the social profiles and payout wallets fans and collaborators should find you on.
        </p>
      </div>

      <section
        aria-labelledby="linked-social-heading"
        className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-6"
      >
        <h3 id="linked-social-heading" className="text-sm font-semibold uppercase tracking-wide">
          Social profiles
        </h3>

        {social.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No socials linked"
            description="Link a profile so fans can follow and share your music."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {social.map((account) => (
              <li key={account.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text">{account.label}</span>
                  <a
                    href={socialProfileUrl(account.platform!, account.handle)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block truncate text-xs text-primary hover:underline"
                  >
                    @{account.handle}
                  </a>
                </span>
                <button
                  type="button"
                  onClick={() => setPendingRemoval(account)}
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
          <label htmlFor="linked-platform" className="block text-sm font-medium text-text">
            Platform
          </label>
          <select
            id="linked-platform"
            value={platform}
            onChange={(event) => {
              setPlatform(event.target.value as SocialPlatformId);
              setError(null);
            }}
            className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {SOCIAL_PLATFORMS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>

          <label htmlFor="linked-handle" className="block text-sm font-medium text-text">
            Handle
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="linked-handle"
              value={handle}
              onChange={(event) => {
                setHandle(event.target.value);
                setError(null);
              }}
              placeholder={meta.placeholder}
              aria-invalid={socialError ? true : undefined}
              aria-describedby={socialError ? "linked-handle-error" : undefined}
              className="flex-1 rounded-full border border-border bg-surface-sunken px-4 py-2 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={handleAddSocial}
              disabled={Boolean(socialError)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus size={16} aria-hidden="true" />
              Link {meta.label}
            </button>
          </div>
          {socialError && (
            <p id="linked-handle-error" role="alert" className="text-xs text-error">
              {socialError}
            </p>
          )}
        </div>
      </section>

      <section
        aria-labelledby="linked-wallet-heading"
        className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-6"
      >
        <h3 id="linked-wallet-heading" className="text-sm font-semibold uppercase tracking-wide">
          Wallets
        </h3>

        {wallets.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No wallets linked"
            description="Add a Stellar address to receive royalties and payouts."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {wallets.map((account) => (
              <li key={account.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text">{account.label}</span>
                  <span className="block truncate font-mono text-xs text-text-muted">
                    {account.address}
                  </span>
                </span>
                {account.isPrimary ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Star size={12} aria-hidden="true" /> Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPrimaryWallet(account.id);
                      hydrate();
                    }}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-muted transition-colors hover:text-text"
                  >
                    Make primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPendingRemoval(account)}
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
          <label htmlFor="linked-wallet" className="block text-sm font-medium text-text">
            Stellar address
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="linked-wallet"
              value={walletAddress}
              onChange={(event) => {
                setWalletAddress(event.target.value);
                setError(null);
              }}
              placeholder="G…"
              aria-invalid={walletError ? true : undefined}
              aria-describedby={walletError ? "linked-wallet-error" : undefined}
              className="flex-1 rounded-full border border-border bg-surface-sunken px-4 py-2 font-mono text-xs text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={handleAddWallet}
              disabled={Boolean(walletError)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus size={16} aria-hidden="true" />
              Link wallet
            </button>
          </div>
          {walletError && (
            <p id="linked-wallet-error" role="alert" className="text-xs text-error">
              {walletError}
            </p>
          )}
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
        Only accounts you own are shown. Unlinking never affects your releases or payouts.
      </p>

      <ConfirmationDialog
        isOpen={Boolean(pendingRemoval)}
        onClose={() => setPendingRemoval(null)}
        onConfirm={handleRemove}
        title="Unlink this account?"
        message={
          pendingRemoval
            ? `${pendingRemoval.label} (${pendingRemoval.handle}) will be removed from your linked accounts.`
            : ""
        }
        confirmText="Unlink"
      />
    </div>
  );
}
