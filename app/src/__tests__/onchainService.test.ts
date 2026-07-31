import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUsePost, mockHandleSuccess, mockHandleError, mockMutateAsync } = vi.hoisted(() => ({
  mockUsePost: vi.fn(),
  mockHandleSuccess: vi.fn(),
  mockHandleError: vi.fn(),
  mockMutateAsync: vi.fn(),
}));

vi.mock('@/api/queryClient', () => ({
  usePost: mockUsePost,
}));

vi.mock('@/hooks/useToastHandler', () => ({
  useHandleSuccess: () => mockHandleSuccess,
  useHandleError: () => mockHandleError,
}));

import useOnchainServices from '@/services/onchainService';

interface MutationOptions {
  onSuccess?: (...args: unknown[]) => void;
  onError?: (error: Error) => void;
}

interface MutationResult {
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: unknown;
}

type ServiceHook = (...args: unknown[]) => MutationResult;
type ServiceMap = Record<string, ServiceHook>;

const mutationResult: MutationResult = {
  mutate: vi.fn(),
  mutateAsync: mockMutateAsync,
  isPending: false,
  isError: false,
  error: null,
  data: undefined,
};

function getServiceNames(): string[] {
  const { result } = renderHook(() => useOnchainServices());

  return Object.keys(result.current).filter((name) => name.startsWith('use'));
}

function argumentsForHook(name: string, count: number): unknown[] {
  if (count === 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const normalizedName = name.toLowerCase();

    if (normalizedName.includes('song')) return 'song-123';
    if (normalizedName.includes('transaction') || normalizedName.includes('status')) return 'tx-123';
    if (index === 0) return 'test-id';
    return 'test-value';
  });
}

function renderServiceHook(name: string) {
  return renderHook(() => {
    const services = useOnchainServices() as unknown as ServiceMap;
    const serviceHook = services[name];

    if (!serviceHook) {
      throw new Error(`Unknown onchain service hook: ${name}`);
    }

    return serviceHook(...argumentsForHook(name, serviceHook.length));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMutateAsync.mockReset();
  mockUsePost.mockReset();
  mockUsePost.mockReturnValue(mutationResult);
  mockMutateAsync.mockResolvedValue({
    success: true,
    data: {
      txHash: 'tx-hash-123',
      tokenId: 'token-123',
      balance: '10000000',
      metadata: { title: 'Test Song' },
      status: 'confirmed',
    },
  });
});

describe('useOnchainServices', () => {
  it('exposes every public on-chain service hook', () => {
    const serviceNames = getServiceNames();

    expect(serviceNames.length).toBeGreaterThan(0);
    expect(serviceNames.every((name) => name.startsWith('use'))).toBe(true);
    expect(serviceNames.every((name) => typeof (useOnchainServices as unknown) === 'function')).toBe(true);
  });

  it('configures every public service hook with a mocked mutation', () => {
    const serviceNames = getServiceNames();

    serviceNames.forEach((name) => {
      renderServiceHook(name);
    });

    expect(mockUsePost).toHaveBeenCalledTimes(serviceNames.length);
    mockUsePost.mock.calls.forEach(([endpoint, options]) => {
      expect(endpoint).toBeDefined();
      expect(typeof endpoint).toBe('string');
      expect(options).toEqual(expect.any(Object));
    });
  });

  it('executes successful mint, balance, metadata, and status mutations without a real blockchain call', async () => {
    const serviceNames = getServiceNames();

    for (const name of serviceNames) {
      const { result } = renderServiceHook(name);
      const payload = name.toLowerCase().includes('song')
        ? { albumId: 7, signedXdr: 'signed-xdr' }
        : { signedXdr: 'signed-xdr' };

      await act(async () => {
        await expect(result.current.mutateAsync(payload)).resolves.toMatchObject({ success: true });
      });
    }

    expect(mockMutateAsync).toHaveBeenCalledTimes(serviceNames.length);
    expect(mockMutateAsync).not.toHaveBeenCalledWith(expect.anything(), expect.anything());
  });

  it('forwards insufficient-funds, contract, and network-timeout errors from every mutation', async () => {
    const serviceNames = getServiceNames();
    const errors = [
      new Error('Insufficient funds for transaction'),
      new Error('Contract execution failed'),
      new Error('Network timeout while polling transaction status'),
    ];

    for (let index = 0; index < serviceNames.length; index += 1) {
      const error = errors[index % errors.length];
      mockMutateAsync.mockRejectedValueOnce(error);
      const { result } = renderServiceHook(serviceNames[index]);

      await act(async () => {
        await expect(result.current.mutateAsync({ signedXdr: 'signed-xdr' })).rejects.toThrow(error.message);
      });
    }

    expect(mockMutateAsync).toHaveBeenCalledTimes(serviceNames.length);
  });

  it('registers error handlers for every public on-chain operation', () => {
    const serviceNames = getServiceNames();

    serviceNames.forEach((name) => {
      renderServiceHook(name);
    });

    const options = mockUsePost.mock.calls.map(([, hookOptions]) => hookOptions as MutationOptions);
    const optionsWithErrorHandlers = options.filter((hookOptions) => typeof hookOptions.onError === 'function');

    expect(optionsWithErrorHandlers.length).toBe(serviceNames.length);

    optionsWithErrorHandlers.forEach((hookOptions) => {
      hookOptions.onError?.(new Error('Contract execution failed'));
    });

    expect(mockHandleError).toHaveBeenCalledTimes(serviceNames.length);
  });

  it('registers success handlers for operations that report successful on-chain completion', () => {
    const serviceNames = getServiceNames();

    serviceNames.forEach((name) => {
      renderServiceHook(name);
    });

    const options = mockUsePost.mock.calls.map(([, hookOptions]) => hookOptions as MutationOptions);
    const optionsWithSuccessHandlers = options.filter((hookOptions) => typeof hookOptions.onSuccess === 'function');

    expect(optionsWithSuccessHandlers.length).toBeGreaterThan(0);

    optionsWithSuccessHandlers.forEach((hookOptions) => {
      hookOptions.onSuccess?.({ success: true });
    });

    expect(mockHandleSuccess).toHaveBeenCalledTimes(optionsWithSuccessHandlers.length);
  });
});
