import { ARTIST_ONCHAIN_ENDPOINTS, SONG_ONCHAIN_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";

export interface PreparedTransaction {
  xdr: string;
  networkPassphrase: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

const useOnchainServices = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  const useConnectWallet = () =>
    usePost<ApiEnvelope<{ stellarPublicKey: string }>, { stellarPublicKey: string }>(
      ARTIST_ONCHAIN_ENDPOINTS.CONNECT_WALLET,
      {
        onError: (error) => handleError(error.message || "Failed to connect Stellar wallet."),
      }
    );

  const usePrepareArtistSetup = () =>
    usePost<ApiEnvelope<PreparedTransaction>, { cid: string }>(
      ARTIST_ONCHAIN_ENDPOINTS.PREPARE_SETUP,
      {
        onError: (error) => handleError(error.message || "Failed to prepare on-chain artist setup."),
      }
    );

  const useSubmitArtistSetup = () =>
    usePost<ApiEnvelope<{ txHash: string; artistId: string; tokenId: string }>, { signedXdr: string }>(
      ARTIST_ONCHAIN_ENDPOINTS.SUBMIT_SETUP,
      {
        onSuccess: () => handleSuccess("Artist profile set up on-chain!"),
        onError: (error) => handleError(error.message || "Failed to submit on-chain artist setup."),
      }
    );

  const usePrepareSongMint = (songId: string) =>
    usePost<ApiEnvelope<PreparedTransaction>, { albumId?: number }>(
      SONG_ONCHAIN_ENDPOINTS.prepareMint(songId),
      {
        onError: (error) => handleError(error.message || "Failed to prepare song minting."),
      }
    );

  const useSubmitSongMint = (songId: string) =>
    usePost<ApiEnvelope<{ txHash: string; songId: string; tokenId: string }>, { signedXdr: string }>(
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
