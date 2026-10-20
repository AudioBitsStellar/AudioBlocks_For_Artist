/**
 * Freighter wallet integration module (issue #428).
 *
 * Wraps @stellar/freighter-api for connecting to the user's Freighter browser
 * extension, reading network details, and signing Soroban transactions. All
 * on-chain flows (mint, transfer, profile setup, network mismatch detection)
 * depend on this module.
 *
 * ## Error handling contract
 *
 * - Functions that check availability (`isFreighterAvailable`, `getFreighterAddress`,
 *   `getFreighterNetworkDetails`) return `null` on failure rather than throwing,
 *   so callers can treat "unknown" and "not connected" the same way.
 * - Functions that require user action (`connectFreighter`, `signTransactionXdr`)
 *   throw on failure so the caller can show a specific error to the user.
 *
 * ## Network passphrase
 *
 * `getFreighterNetworkDetails()` returns the network Freighter itself is set to
 * (configured inside the extension), which is independent of this app's testnet/
 * mainnet switcher. The returned `networkPassphrase` must be passed verbatim to
 * `signTransactionXdr()` so the signature is valid on the network the user
 * expects.
 */

import freighterApi from "@stellar/freighter-api";

/**
 * Error thrown when the Freighter extension is not installed or not detected.
 */
export class FreighterNotInstalledError extends Error {
  constructor() {
    super("Freighter wallet extension not detected. Install it from freighter.app.");
  }
}

/**
 * Check if Freighter is installed and connected.
 *
 * @returns `true` if Freighter is available and connected, `false` otherwise.
 */

export async function isFreighterAvailable(): Promise<boolean> {
  const { isConnected, error } = await freighterApi.isConnected();
  return !error && isConnected;
}

/**
 * Prompts the Freighter popup and requests access to the user's Stellar account.
 *
 * @returns The connected Stellar address (G...).
 * @throws {FreighterNotInstalledError} If Freighter is not installed or not connected.
 * @throws {Error} If the user rejects the access request or Freighter returns an error.
 */
export async function connectFreighter(): Promise<string> {
  if (!(await isFreighterAvailable())) {
    throw new FreighterNotInstalledError();
  }

  const { address, error } = await freighterApi.requestAccess();
  if (error) throw new Error(error.message || "Freighter access request failed.");
  return address;
}

/**
 * Returns the currently connected Stellar address without re-prompting the user.
 *
 * This only works if the user has already authorized access via `connectFreighter()`.
 *
 * @returns The connected Stellar address (G...), or `null` if Freighter is not
 *          available or the user hasn't authorized access yet.
 */
export async function getFreighterAddress(): Promise<string | null> {
  if (!(await isFreighterAvailable())) return null;

  const { address, error } = await freighterApi.getAddress();
  if (error || !address) return null;
  return address;
}

/**
 * Network details returned by Freighter.
 */
export interface FreighterNetworkDetails {
  /** Network name, e.g. "TESTNET" or "PUBLIC". */
  network: string;
  /** Stellar network passphrase, e.g. "Test SDF Network ; September 2015". */
  networkPassphrase: string;
}

/**
 * Returns the network Freighter is currently connected to.
 *
 * The network is set inside the Freighter extension itself, independent of this
 * app's testnet/mainnet switcher (see `src/lib/stellarNetwork.ts` and #282).
 *
 * @returns Network details with `network` and `networkPassphrase`, or `null` if
 *          Freighter isn't installed/authorized or the lookup fails. Callers can
 *          treat "unknown" and "not connected" the same way.
 */
export async function getFreighterNetworkDetails(): Promise<FreighterNetworkDetails | null> {
  if (!(await isFreighterAvailable())) return null;

  const { network, networkPassphrase, error } = await freighterApi.getNetworkDetails();
  if (error || !networkPassphrase) return null;
  return { network, networkPassphrase };
}

/**
 * Signs a Soroban transaction XDR built by the backend.
 *
 * The backend prepares an unsigned transaction XDR via endpoints like
 * `prepare-artist-on-chain-setup` or `prepare-song-mint-tx`. This function
 * hands that XDR to Freighter, which shows the user what they're approving and
 * signs it locally — the secret key never leaves the extension. The signed XDR
 * is then POSTed back to the backend's `submit-*` endpoint.
 *
 * @param xdr - Unsigned transaction XDR (base64-encoded).
 * @param networkPassphrase - Stellar network passphrase. Must match the network
 *        Freighter is set to, obtained via `getFreighterNetworkDetails()`.
 * @param address - Stellar address (G...) to sign with.
 * @returns Signed transaction XDR (base64-encoded).
 * @throws {Error} If the user rejects the signing request or Freighter returns
 *         an error.
 */
export async function signTransactionXdr(
  xdr: string,
  networkPassphrase: string,
  address: string
): Promise<string> {
  const { signedTxXdr, error } = await freighterApi.signTransaction(xdr, {
    networkPassphrase,
    address,
  });
  if (error) throw new Error(error.message || "Freighter rejected the signing request.");
  return signedTxXdr;
}
