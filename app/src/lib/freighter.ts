import freighterApi from "@stellar/freighter-api";
import { assertBackendStellarNetworkMatchesConfigured } from "@/lib/stellarNetwork";

export type FreighterRecoveryState = "missing" | "locked" | "wrong-network" | "rejected" | "other";

export class FreighterRecoveryError extends Error {
  constructor(
    readonly recoveryState: FreighterRecoveryState,
    message: string
  ) {
    super(message);
    this.name = "FreighterRecoveryError";
  }
}

export class FreighterNotInstalledError extends FreighterRecoveryError {
  constructor() {
    super("missing", "Freighter wallet extension not detected.");
    this.name = "FreighterNotInstalledError";
  }
}

function freighterErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return "";
}

/** Maps wallet-provider errors to the recovery surface appropriate for artists. */
export function classifyFreighterError(error: unknown): FreighterRecoveryState {
  if (error instanceof FreighterRecoveryError) return error.recoveryState;
  if (error instanceof FreighterNotInstalledError) return "missing";

  const normalized = freighterErrorMessage(error).toLowerCase();

  if (/locked|unlock/.test(normalized)) return "locked";
  if (/network mismatch|wrong network|network passphrase/.test(normalized)) {
    return "wrong-network";
  }
  if (/rejected|declined|cancelled|canceled|denied/.test(normalized)) return "rejected";
  if (/not installed|not detected|extension unavailable|freighter unavailable/.test(normalized)) {
    return "missing";
  }
  return "other";
}

export function toFreighterRecoveryError(error: unknown): FreighterRecoveryError {
  if (error instanceof FreighterRecoveryError) return error;
  const state = classifyFreighterError(error);
  return new FreighterRecoveryError(
    state,
    freighterErrorMessage(error) || "Freighter couldn't complete the wallet request."
  );
}

export async function isFreighterAvailable(): Promise<boolean> {
  const { isConnected, error } = await freighterApi.isConnected();
  return !error && isConnected;
}

/** Prompts the Freighter popup and returns the connected G... address. */
export async function connectFreighter(): Promise<string> {
  if (!(await isFreighterAvailable())) {
    throw new FreighterNotInstalledError();
  }

  const { address, error } = await freighterApi.requestAccess();
  if (error) throw toFreighterRecoveryError(error);
  return address;
}

/** Returns the currently connected address without re-prompting, if already authorized. */
export async function getFreighterAddress(): Promise<string | null> {
  if (!(await isFreighterAvailable())) return null;

  const { address, error } = await freighterApi.getAddress();
  if (error || !address) return null;
  return address;
}

export function watchFreighterWalletChanges(onAddressChange: (address: string | null) => void) {
  const watcher = new freighterApi.WatchWalletChanges();
  const { error } = watcher.watch(({ address }) => onAddressChange(address || null));

  if (error) {
    watcher.stop();
    throw new Error(error.message || "Failed to watch Freighter wallet changes.");
  }

  return () => watcher.stop();
}

export interface FreighterNetworkDetails {
  network: string;
  networkPassphrase: string;
}

/**
 * Returns the network Freighter itself is currently connected to (set inside
 * the extension, independent of this app's testnet/mainnet switcher — see
 * `src/lib/stellarNetwork.ts` and #282). Returns `null` if Freighter isn't
 * installed/authorized or the lookup fails, so callers can treat "unknown"
 * and "not connected" the same way.
 */
export async function getFreighterNetworkDetails(): Promise<FreighterNetworkDetails | null> {
  if (!(await isFreighterAvailable())) return null;

  const { network, networkPassphrase, error } = await freighterApi.getNetworkDetails();
  if (error) throw toFreighterRecoveryError(error);
  if (!networkPassphrase) return null;
  return { network, networkPassphrase };
}

/**
 * Signs a Soroban transaction XDR built by the backend (see
 * ArtistService.prepareArtistOnChainSetup / SongService.prepareSongMintTx).
 * Returns the signed XDR ready to POST back to the backend's submit-* endpoint.
 */
export async function signTransactionXdr(
  xdr: string,
  networkPassphrase: string,
  address: string
): Promise<string> {
  const details = await getFreighterNetworkDetails();
  if (!details) throw new FreighterNotInstalledError();
  if (details.networkPassphrase !== networkPassphrase) {
    throw new FreighterRecoveryError(
      "wrong-network",
      `Freighter is on ${details.network || "a different network"}; switch it to the network required by this transaction.`
    );
  }

  const { signedTxXdr, error } = await freighterApi.signTransaction(xdr, {
    networkPassphrase,
    address,
  });
  if (error) throw toFreighterRecoveryError(error);
  return signedTxXdr;
}
