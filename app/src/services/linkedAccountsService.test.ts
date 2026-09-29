import { beforeEach, describe, expect, it } from "vitest";
import {
  addSocialLink,
  addWalletLink,
  getSocialLinks,
  getWalletLinks,
  listLinkedAccounts,
  resetLinkedAccounts,
  setPrimaryWallet,
  unlinkAccount,
} from "./linkedAccountsService";

const ADDRESS = "GAB2CDEFGHIJKLMNOPQRSTUVWXYZ34567AB2CDEFGHIJKLMNOPQRSTUV";
const ADDRESS_2 = "G76543ZYXWVUTSRQPONMLKJIHGFEDC2BAAB2CDEFGHIJKLMNOPQRSTUV";

beforeEach(() => {
  resetLinkedAccounts();
  localStorage.clear();
});

describe("linkedAccountsService (#414)", () => {
  it("starts empty", () => {
    expect(listLinkedAccounts()).toEqual([]);
  });

  it("stores a social link with a normalised handle", () => {
    const result = addSocialLink("x", "X", "https://x.com/sandy");
    expect(result.ok).toBe(true);
    expect(getSocialLinks()).toEqual([
      expect.objectContaining({ kind: "social", platform: "x", handle: "sandy", label: "X" }),
    ]);
  });

  it("rejects an empty social handle", () => {
    const result = addSocialLink("x", "X", "   ");
    expect(result).toEqual({ ok: false, message: "Enter a handle to link this account." });
    expect(listLinkedAccounts()).toHaveLength(0);
  });

  it("stores a wallet link and makes the first one primary", () => {
    addWalletLink("Payout wallet", ADDRESS);
    addWalletLink("Savings", ADDRESS_2);

    const wallets = getWalletLinks();
    expect(wallets).toHaveLength(2);
    expect(wallets[0].isPrimary).toBe(true);
    expect(wallets[0].address).toBe(ADDRESS);
  });

  it("rejects a malformed wallet address", () => {
    const result = addWalletLink("Payout wallet", "GABC");
    expect(result.ok).toBe(false);
    expect(listLinkedAccounts()).toHaveLength(0);
  });

  it("moves the primary flag between wallets", () => {
    addWalletLink("Payout wallet", ADDRESS);
    addWalletLink("Savings", ADDRESS_2);
    setPrimaryWallet("link_2");

    expect(getWalletLinks().map((w) => w.isPrimary)).toEqual([false, true]);
  });

  it("promotes a new primary when the current one is removed", () => {
    addWalletLink("Payout wallet", ADDRESS);
    addWalletLink("Savings", ADDRESS_2);
    unlinkAccount("link_1");

    const wallets = getWalletLinks();
    expect(wallets).toHaveLength(1);
    expect(wallets[0].isPrimary).toBe(true);
  });

  it("persists to localStorage", () => {
    addSocialLink("instagram", "Instagram", "@sandy.drips");
    const raw = localStorage.getItem("audioblocks:linked-accounts:v1");
    expect(raw).toContain("sandy.drips");
  });
});
