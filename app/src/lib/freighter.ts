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
