import freighterApi from "@stellar/freighter-api";

export class FreighterNotInstalledError extends Error {
  constructor() {
    super("Freighter wallet extension not detected. Install it from freighter.app.");
  }
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
  if (error) throw new Error(error.message || "Freighter access request failed.");
  return address;
}

/** Returns the currently connected address without re-prompting, if already authorized. */
export async function getFreighterAddress(): Promise<string | null> {
  if (!(await isFreighterAvailable())) return null;

  const { address, error } = await freighterApi.getAddress();
  if (error || !address) return null;
  return address;
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
  if (error || !networkPassphrase) return null;
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
  const { signedTxXdr, error } = await freighterApi.signTransaction(xdr, {
    networkPassphrase,
    address,
  });
  if (error) throw new Error(error.message || "Freighter rejected the signing request.");
  return signedTxXdr;
}
