/**
 * Tests for the Freighter mint-song flow.
 *
 * These are unit/integration tests that mock the network and Freighter so they
 * run in CI without a live Soroban testnet. They verify that:
 *   1. MintSongButton renders a "Connect wallet" prompt when no address is set.
 *   2. The prepare → sign → submit sequence fires in the correct order.
 *   3. Analytics events (mint_started, mint_succeeded, mint_failed) are emitted.
 *   4. A backend error on prepare surfaces without calling sign or submit.
 *   5. A Freighter rejection on sign surfaces without calling submit.
 *
 * To run against the deployed testnet contracts (manual only):
 *   1. Install Freighter browser extension and fund a testnet account.
 *   2. Set NEXT_PUBLIC_STELLAR_NETWORK=testnet and start the dev server.
 *   3. Use Playwright to drive the browser: navigate to /dashboard/upload-music,
 *      fill the song form, wait for the Mint button, click it, approve in
 *      Freighter, and assert the success toast appears.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/freighter', () => ({
  isFreighterAvailable: vi.fn().mockResolvedValue(true),
  connectFreighter: vi.fn().mockResolvedValue('GTEST_ADDRESS_MOCK_1234'),
  getFreighterAddress: vi.fn().mockResolvedValue(null),
  signTransactionXdr: vi.fn().mockResolvedValue('SIGNED_XDR_MOCK'),
}));

vi.mock('@/lib/analytics', () => ({
  analytics: {
    mintStarted: vi.fn(),
    mintSucceeded: vi.fn(),
    mintFailed: vi.fn(),
    uploadStarted: vi.fn(),
    uploadCompleted: vi.fn(),
    uploadFailed: vi.fn(),
    profileSaved: vi.fn(),
  },
}));

vi.mock('@/hooks/useToastHandler', () => ({
  useHandleSuccess: () => vi.fn(),
  useHandleError: () => vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_ADDRESS = 'GTEST_ADDRESS_MOCK_1234';
const MOCK_XDR = 'AAAAAQAAA...';
const MOCK_NETWORK = 'Test SDF Network ; September 2015';
const MOCK_TX_HASH = 'abc123';
const MOCK_TOKEN_ID = '42';

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MintSongButton', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows ConnectStellarWalletButton when no wallet is connected', async () => {
    // useStellarWallet returns address=null when Freighter is not yet authorized
    vi.doMock('@/components/common/wallet/useStellarWallet', () => ({
      useStellarWallet: () => ({
        address: null,
        isConnecting: false,
        connect: vi.fn(),
        restore: vi.fn(),
        signAndSubmit: vi.fn(),
      }),
    }));

    vi.doMock('@/services/onchainService', () => ({
      default: () => ({
        useConnectWallet: () => ({ mutateAsync: vi.fn(), isPending: false }),
        usePrepareSongMint: () => ({ mutateAsync: vi.fn(), isPending: false }),
        useSubmitSongMint: () => ({ mutateAsync: vi.fn(), isPending: false }),
        usePrepareArtistSetup: () => ({ mutateAsync: vi.fn(), isPending: false }),
        useSubmitArtistSetup: () => ({ mutateAsync: vi.fn(), isPending: false }),
      }),
    }));

    const { default: MintSongButton } = await import(
      '@/components/common/wallet/MintSongButton'
    );

    render(<MintSongButton songId="song-1" />, { wrapper: Wrapper });
    // ConnectStellarWalletButton should render in place of the Mint button
    expect(screen.queryByRole('button', { name: /mint on-chain/i })).toBeNull();
  });

  it('fires prepare → sign → submit in order on happy path', async () => {
    const mockPrepare = vi.fn().mockResolvedValue({
      success: true,
      data: { xdr: MOCK_XDR, networkPassphrase: MOCK_NETWORK },
    });
    const mockSubmit = vi.fn().mockResolvedValue({
      success: true,
      data: { txHash: MOCK_TX_HASH, songId: 'song-1', tokenId: MOCK_TOKEN_ID },
    });

    const { signTransactionXdr } = await import('@/lib/freighter');

    vi.doMock('@/components/common/wallet/useStellarWallet', () => ({
      useStellarWallet: () => ({
        address: MOCK_ADDRESS,
        isConnecting: false,
        connect: vi.fn(),
        restore: vi.fn(),
        signAndSubmit: async (
          prepared: { xdr: string; networkPassphrase: string },
          submit: (vars: { signedXdr: string }) => Promise<unknown>
        ) => {
          const signedXdr = await signTransactionXdr(
            prepared.xdr,
            prepared.networkPassphrase,
            MOCK_ADDRESS
          );
          return submit({ signedXdr });
        },
      }),
    }));

    vi.doMock('@/services/onchainService', () => ({
      default: () => ({
        useConnectWallet: () => ({ mutateAsync: vi.fn(), isPending: false }),
        usePrepareSongMint: () => ({
          mutateAsync: mockPrepare,
          isPending: false,
        }),
        useSubmitSongMint: () => ({
          mutateAsync: mockSubmit,
          isPending: false,
        }),
        usePrepareArtistSetup: () => ({ mutateAsync: vi.fn(), isPending: false }),
        useSubmitArtistSetup: () => ({ mutateAsync: vi.fn(), isPending: false }),
      }),
    }));

    const { default: MintSongButton } = await import(
      '@/components/common/wallet/MintSongButton'
    );
    const { analytics } = await import('@/lib/analytics');

    render(<MintSongButton songId="song-1" albumId={0} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: /mint on-chain/i }));

    await waitFor(() => {
      expect(mockPrepare).toHaveBeenCalledWith({ albumId: 0 });
    });

    await waitFor(() => {
      expect(signTransactionXdr).toHaveBeenCalledWith(
        MOCK_XDR,
        MOCK_NETWORK,
        MOCK_ADDRESS
      );
    });

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({ signedXdr: 'SIGNED_XDR_MOCK' });
    });

    expect(analytics.mintStarted).toHaveBeenCalledWith({
      songId: 'song-1',
      walletAddress: MOCK_ADDRESS,
    });

    expect(analytics.mintSucceeded).toHaveBeenCalledWith({
      songId: 'song-1',
      txHash: MOCK_TX_HASH,
      tokenId: MOCK_TOKEN_ID,
    });
  });

  it('emits mint_failed and does not call submit when prepare throws', async () => {
    const mockPrepare = vi.fn().mockRejectedValue(new Error('Song not processed yet'));
    const mockSubmit = vi.fn();

    vi.doMock('@/components/common/wallet/useStellarWallet', () => ({
      useStellarWallet: () => ({
        address: MOCK_ADDRESS,
        isConnecting: false,
        connect: vi.fn(),
        restore: vi.fn(),
        signAndSubmit: vi.fn(),
      }),
    }));

    vi.doMock('@/services/onchainService', () => ({
      default: () => ({
        useConnectWallet: () => ({ mutateAsync: vi.fn(), isPending: false }),
        usePrepareSongMint: () => ({
          mutateAsync: mockPrepare,
          isPending: false,
        }),
        useSubmitSongMint: () => ({
          mutateAsync: mockSubmit,
          isPending: false,
        }),
        usePrepareArtistSetup: () => ({ mutateAsync: vi.fn(), isPending: false }),
        useSubmitArtistSetup: () => ({ mutateAsync: vi.fn(), isPending: false }),
      }),
    }));

    const { default: MintSongButton } = await import(
      '@/components/common/wallet/MintSongButton'
    );
    const { analytics } = await import('@/lib/analytics');

    render(<MintSongButton songId="song-2" />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('button', { name: /mint on-chain/i }));

    await waitFor(() => {
      expect(analytics.mintFailed).toHaveBeenCalledWith({
        songId: 'song-2',
        reason: 'Song not processed yet',
      });
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('emits mint_failed and does not call submit when Freighter rejects signing', async () => {
    const { signTransactionXdr } = await import('@/lib/freighter');
    (signTransactionXdr as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Freighter rejected the signing request.')
    );

    const mockPrepare = vi.fn().mockResolvedValue({
      success: true,
      data: { xdr: MOCK_XDR, networkPassphrase: MOCK_NETWORK },
    });
    const mockSubmit = vi.fn();

    vi.doMock('@/components/common/wallet/useStellarWallet', () => ({
      useStellarWallet: () => ({
        address: MOCK_ADDRESS,
        isConnecting: false,
        connect: vi.fn(),
        restore: vi.fn(),
        signAndSubmit: async (
          prepared: { xdr: string; networkPassphrase: string },
          submit: (vars: { signedXdr: string }) => Promise<unknown>
        ) => {
          const signedXdr = await signTransactionXdr(
            prepared.xdr,
            prepared.networkPassphrase,
            MOCK_ADDRESS
          );
          return submit({ signedXdr });
        },
      }),
    }));

    vi.doMock('@/services/onchainService', () => ({
      default: () => ({
        useConnectWallet: () => ({ mutateAsync: vi.fn(), isPending: false }),
        usePrepareSongMint: () => ({
          mutateAsync: mockPrepare,
          isPending: false,
        }),
        useSubmitSongMint: () => ({
          mutateAsync: mockSubmit,
          isPending: false,
        }),
        usePrepareArtistSetup: () => ({ mutateAsync: vi.fn(), isPending: false }),
        useSubmitArtistSetup: () => ({ mutateAsync: vi.fn(), isPending: false }),
      }),
    }));

    const { default: MintSongButton } = await import(
      '@/components/common/wallet/MintSongButton'
    );
    const { analytics } = await import('@/lib/analytics');

    render(<MintSongButton songId="song-3" />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('button', { name: /mint on-chain/i }));

    await waitFor(() => {
      expect(analytics.mintFailed).toHaveBeenCalledWith({
        songId: 'song-3',
        reason: 'Freighter rejected the signing request.',
      });
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
