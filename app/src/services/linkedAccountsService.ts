/**
 * Persistence for linked social / wallet accounts (#414).
 *
 * Mirrors the other local-first services: a memoised array mirrored into
 * `localStorage`, plus a reset seam so specs start clean.
 */

import {
  isStellarAddress,
  MAX_LINKED_ACCOUNTS,
  normaliseHandle,
  type SocialPlatformId,
} from "@/utils/linkedAccounts";

const STORAGE_KEY = "audioblocks:linked-accounts:v1";

export type LinkKind = "social" | "wallet";

export interface LinkedAccount {
  id: string;
  kind: LinkKind;
  /** Present for `social` rows. */
  platform?: SocialPlatformId;
  /** Display handle for `social` rows, or the address for `wallet` rows. */
  handle: string;
  label: string;
  /** Wallet rows only — the address shown to the artist. */
  address?: string;
  connectedAt: string;
  isPrimary?: boolean;
}

let accounts: LinkedAccount[] | null = null;
let counter = 0;

function load(): LinkedAccount[] {
  if (accounts) return accounts;
  if (typeof window === "undefined") {
    accounts = [];
    return accounts;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    accounts = raw ? (JSON.parse(raw) as LinkedAccount[]) : [];
  } catch {
    accounts = [];
  }
  return accounts;
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts ?? []));
  } catch {
    // Storage blocked — the links still live for this session.
  }
}

export function resetLinkedAccounts(): void {
  accounts = null;
  counter = 0;
}

function nextId(): string {
  counter += 1;
  return `link_${counter}`;
}

export function listLinkedAccounts(): LinkedAccount[] {
  return load().map((account) => ({ ...account }));
}

export function getSocialLinks(): LinkedAccount[] {
  return listLinkedAccounts().filter((account) => account.kind === "social");
}

export function getWalletLinks(): LinkedAccount[] {
  return listLinkedAccounts().filter((account) => account.kind === "wallet");
}

export type AddResult = { ok: true; account: LinkedAccount } | { ok: false; message: string };

export function addSocialLink(
  platform: SocialPlatformId,
  label: string,
  handle: string
): AddResult {
  const clean = normaliseHandle(handle);
  if (!clean) return { ok: false, message: "Enter a handle to link this account." };
  if (load().length >= MAX_LINKED_ACCOUNTS) {
    return { ok: false, message: `You can link up to ${MAX_LINKED_ACCOUNTS} accounts.` };
  }
  const account: LinkedAccount = {
    id: nextId(),
    kind: "social",
    platform,
    handle: clean,
    label,
    connectedAt: new Date().toISOString(),
  };
  load().push(account);
  persist();
  return { ok: true, account };
}

export function addWalletLink(label: string, address: string): AddResult {
  const clean = address.trim();
  if (!isStellarAddress(clean)) {
    return { ok: false, message: "Enter a valid Stellar address that starts with G." };
  }
  if (load().length >= MAX_LINKED_ACCOUNTS) {
    return { ok: false, message: `You can link up to ${MAX_LINKED_ACCOUNTS} accounts.` };
  }
  const account: LinkedAccount = {
    id: nextId(),
    kind: "wallet",
    handle: clean,
    address: clean,
    label: label.trim() || "Payout wallet",
    connectedAt: new Date().toISOString(),
    isPrimary: getWalletLinks().length === 0,
  };
  load().push(account);
  persist();
  return { ok: true, account };
}

export function unlinkAccount(id: string): void {
  accounts = load().filter((account) => account.id !== id);
  if (accounts[0] && accounts[0].kind === "wallet" && !accounts[0].isPrimary) {
    accounts[0].isPrimary = true;
  }
  persist();
}

export function setPrimaryWallet(id: string): void {
  accounts = load().map((account) =>
    account.kind === "wallet" ? { ...account, isPrimary: account.id === id } : account
  );
  persist();
}
