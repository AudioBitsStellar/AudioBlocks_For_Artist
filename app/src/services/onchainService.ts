import { ARTIST_ONCHAIN_ENDPOINTS, SONG_ONCHAIN_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";

// ── Shared types ──────────────────────────────────────────────────────────────

/**
 * Returned by every prepare-* endpoint. The backend builds the Soroban
 * transaction XDR and includes the network passphrase so the client can
 * pass both directly to Freighter without any extra lookups.
 *
 * Matches the `PreparedTxResponse` shape on the backend
 * (src/modules/onchain/dto/prepared-tx.dto.ts).
 */
export interface PreparedTransaction {
  xdr: string;
  networkPassphrase: string;
}

/**
 * Generic API envelope used by all endpoints in this service.
 */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ── Artist on-chain profile types ─────────────────────────────────────────────

/**
 * POST /artist/onchain/connect-wallet
 * Persists the Stellar public key on the artist's account record.
 *
 * Contract: `artist` — method `connect_wallet(stellar_public_key: String)`
 */
interface ConnectWalletRequest {
  stellarPublicKey: string;
}

interface ConnectWalletResponse {
  stellarPublicKey: string;
}

/**
 * POST /artist/onchain/prepare-setup
 * Builds the `register_artist` Soroban invocation XDR.
 *
 * Contract: `artist` — method `register_artist(cid: String)`
 * The CID must be a valid IPFS v1 CID for the artist metadata JSON.
 */
interface PrepareArtistSetupRequest {
  cid: string;
}

/**
 * POST /artist/onchain/submit-setup
 * Relays the signed XDR to the Stellar network.
 *
 * Returns the on-chain transaction hash plus the artist NFT token ID
 * assigned by the `artist` contract.
 */
interface SubmitArtistSetupRequest {
  signedXdr: string;
}

interface SubmitArtistSetupResponse {
  txHash: string;
  artistId: string;
  tokenId: string;
}

// ── Song minting types ────────────────────────────────────────────────────────

/**
 * POST /song/:songId/onchain/prepare-mint
 * Builds the `mint_song` Soroban invocation XDR.
 *
 * Contract: `catalog` — method `mint_song(song_id: String, album_id: u32)`
 * `albumId` defaults to 0 (standalone release — no album).
 * The backend resolves `songId` to the IPFS metadata CID before building
 * the transaction; the song must have finished transcoding first.
 */
interface PrepareSongMintRequest {
  albumId?: number;
}

/**
 * POST /song/:songId/onchain/submit-mint
 * Relays the signed XDR to the Stellar network.
 *
 * Returns the on-chain transaction hash plus the song NFT token ID
 * assigned by the `catalog` contract.
 */
interface SubmitSongMintRequest {
  signedXdr: string;
}

interface SubmitSongMintResponse {
  txHash: string;
  songId: string;
  tokenId: string;
}

// ── Service hook ──────────────────────────────────────────────────────────────

const useOnchainServices = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  /**
   * Persists the artist's Stellar public key on their account record.
   *
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with a `ConnectWalletRequest`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useConnectWallet = () =>
    usePost<ApiEnvelope<ConnectWalletResponse>, ConnectWalletRequest>(
      ARTIST_ONCHAIN_ENDPOINTS.CONNECT_WALLET,
      {
        onError: (error) => handleError(error.message || "Failed to connect Stellar wallet."),
      }
    );

  /**
   * Builds the `register_artist` Soroban transaction XDR for the artist to sign with Freighter.
   *
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with a `PrepareArtistSetupRequest`; resolves to a `PreparedTransaction`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const usePrepareArtistSetup = () =>
    usePost<ApiEnvelope<PreparedTransaction>, PrepareArtistSetupRequest>(
      ARTIST_ONCHAIN_ENDPOINTS.PREPARE_SETUP,
      {
        onError: (error) => handleError(error.message || "Failed to prepare on-chain artist setup."),
      }
    );

  /**
   * Relays the Freighter-signed `register_artist` XDR to the Stellar network.
   *
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with a `SubmitArtistSetupRequest` (the signed XDR); resolves to `{ txHash, artistId, tokenId }`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useSubmitArtistSetup = () =>
    usePost<ApiEnvelope<SubmitArtistSetupResponse>, SubmitArtistSetupRequest>(
      ARTIST_ONCHAIN_ENDPOINTS.SUBMIT_SETUP,
      {
        onSuccess: () => handleSuccess("Artist profile set up on-chain!"),
        onError: (error) => handleError(error.message || "Failed to submit on-chain artist setup."),
      }
    );

  /**
   * Builds the `mint_song` Soroban transaction XDR for the artist to sign with Freighter.
   * Requires the song to have finished transcoding/IPFS pinning first.
   *
   * @param songId - The id of the song to mint.
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with a `PrepareSongMintRequest`; resolves to a `PreparedTransaction`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const usePrepareSongMint = (songId: string) =>
    usePost<ApiEnvelope<PreparedTransaction>, PrepareSongMintRequest>(
      SONG_ONCHAIN_ENDPOINTS.prepareMint(songId),
      {
        onError: (error) => handleError(error.message || "Failed to prepare song minting."),
      }
    );

  /**
   * Relays the Freighter-signed `mint_song` XDR to the Stellar network.
   *
   * @param songId - The id of the song being minted.
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with a `SubmitSongMintRequest` (the signed XDR); resolves to `{ txHash, songId, tokenId }`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useSubmitSongMint = (songId: string) =>
    usePost<ApiEnvelope<SubmitSongMintResponse>, SubmitSongMintRequest>(
      SONG_ONCHAIN_ENDPOINTS.submitMint(songId),
      {
        onSuccess: () => handleSuccess("Song minted on-chain!"),
        onError: (error) => handleError(error.message || "Failed to submit song minting."),
      }
    );

  return {
    useConnectWallet,
    usePrepareArtistSetup,
    useSubmitArtistSetup,
    usePrepareSongMint,
    useSubmitSongMint,
  };
};

export default useOnchainServices;
