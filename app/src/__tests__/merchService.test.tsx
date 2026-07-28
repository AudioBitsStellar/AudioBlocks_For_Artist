import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/hooks/useToastHandler', () => ({
  useHandleSuccess: () => vi.fn(),
  useHandleError: () => vi.fn(),
}));

vi.mock('@/api/axios', () => ({
  createApiClient: vi.fn().mockResolvedValue({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  }),
}));

import useMerchService, {
  formatPrice,
  parsePrice,
  validateMerchPayload,
  updateStock,
  reserveStock,
  CreateMerchPayload,
  MerchInventoryItem,
  MerchItem,
} from '@/services/merchService';

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>;
}

const validPayload: CreateMerchPayload = {
  title: 'Limited Edition Hoodie',
  detail: 'Premium quality hoodie with exclusive design.',
  date: '2025-06-15',
  time: '10:00',
  price: '59.99',
  image: 'https://example.com/hoodie.png',
};

const mockMerchItem: MerchItem = {
  id: 1,
  ...validPayload,
  image: validPayload.image!,
};

describe('useMerchService — CRUD operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useGetMerches', () => {
    it('fetches and returns merch list on success', async () => {
      const responseData = {
        metrics: [
          { label: 'Total Items', value: '12', descriptor: 'Active listings', gradient: 'from-purple-500 to-pink-500' },
        ],
        items: [mockMerchItem],
      };
      mockGet.mockResolvedValue({ data: responseData });

      const { result } = renderHook(() => useMerchService().useGetMerches(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(responseData);
      expect(mockGet).toHaveBeenCalledWith('/artist/merches');
    });

    it('surfaces error when the API call fails', async () => {
      mockGet.mockRejectedValue({ status: 500, message: 'Server error' });

      const { result } = renderHook(() => useMerchService().useGetMerches(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });
  });

  describe('useCreateMerch', () => {
    it('creates a merch item and returns it', async () => {
      mockPost.mockResolvedValue({ data: mockMerchItem });

      const { result } = renderHook(() => useMerchService().useCreateMerch(), { wrapper: Wrapper });

      await act(async () => {
        const created = await result.current.mutateAsync(validPayload);
        expect(created).toEqual(mockMerchItem);
      });

      expect(mockPost).toHaveBeenCalledWith('/artist/merches', validPayload);
    });

    it('rejects when the API returns an error', async () => {
      mockPost.mockRejectedValue(new Error('Failed to create merch.'));

      const { result } = renderHook(() => useMerchService().useCreateMerch(), { wrapper: Wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync(validPayload)).rejects.toThrow('Failed to create merch.');
      });
    });
  });

  describe('useUpdateMerch', () => {
    it('updates a merch item with partial payload', async () => {
      const updatedItem = { ...mockMerchItem, title: 'Updated Hoodie', price: '49.99' };
      mockPut.mockResolvedValue({ data: updatedItem });

      const { result } = renderHook(() => useMerchService().useUpdateMerch(1), { wrapper: Wrapper });

      const partial: Partial<CreateMerchPayload> = { title: 'Updated Hoodie', price: '49.99' };
      await act(async () => {
        const updated = await result.current.mutateAsync(partial);
        expect(updated).toEqual(updatedItem);
      });

      expect(mockPut).toHaveBeenCalledWith('/artist/merches/1', partial);
    });

    it('rejects when update API fails', async () => {
      mockPut.mockRejectedValue(new Error('Failed to update merch.'));

      const { result } = renderHook(() => useMerchService().useUpdateMerch(99), { wrapper: Wrapper });

      await act(async () => {
        const partial: Partial<CreateMerchPayload> = { title: 'Nonexistent' };
        await expect(result.current.mutateAsync(partial)).rejects.toThrow('Failed to update merch.');
      });
    });
  });

  describe('useDeleteMerch', () => {
    it('deletes a merch item successfully', async () => {
      mockDelete.mockResolvedValue({ data: undefined });

      const { result } = renderHook(() => useMerchService().useDeleteMerch(1), { wrapper: Wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync()).resolves.toBeUndefined();
      });

      expect(mockDelete).toHaveBeenCalledWith('/artist/merches/1');
    });

    it('rejects when delete API fails', async () => {
      mockDelete.mockRejectedValue(new Error('Failed to delete merch.'));

      const { result } = renderHook(() => useMerchService().useDeleteMerch(999), { wrapper: Wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow('Failed to delete merch.');
      });
    });
  });
});

describe('formatPrice', () => {
  it('formats a number with default currency', () => {
    expect(formatPrice(59.99)).toBe('$59.99');
  });

  it('formats a string number', () => {
    expect(formatPrice('59.99')).toBe('$59.99');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats whole numbers with two decimals', () => {
    expect(formatPrice(100)).toBe('$100.00');
  });

  it('handles large values', () => {
    expect(formatPrice(999999.99)).toBe('$999999.99');
  });

  it('returns $0.00 for NaN input', () => {
    expect(formatPrice('not-a-number')).toBe('$0.00');
  });

  it('formats negative prices', () => {
    expect(formatPrice(-5).startsWith('$-')).toBe(true);
  });
});

describe('parsePrice', () => {
  it('parses a plain number string', () => {
    expect(parsePrice('59.99')).toBeCloseTo(59.99);
  });

  it('parses a price with currency symbol', () => {
    expect(parsePrice('$59.99')).toBeCloseTo(59.99);
  });

  it('parses a price with commas', () => {
    expect(parsePrice('1,234.56')).toBeCloseTo(1234.56);
  });

  it('returns NaN for empty string', () => {
    expect(parsePrice('')).toBeNaN();
  });

  it('returns NaN for non-numeric string', () => {
    expect(parsePrice('abc')).toBeNaN();
  });
});

describe('validateMerchPayload', () => {
  it('returns valid for a correct payload', () => {
    const result = validateMerchPayload(validPayload);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('rejects empty title', () => {
    const result = validateMerchPayload({ ...validPayload, title: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeDefined();
  });

  it('rejects title exceeding 200 characters', () => {
    const result = validateMerchPayload({ ...validPayload, title: 'x'.repeat(201) });
    expect(result.valid).toBe(false);
    expect(result.errors.title).toContain('200');
  });

  it('rejects empty detail', () => {
    const result = validateMerchPayload({ ...validPayload, detail: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.detail).toBeDefined();
  });

  it('rejects detail exceeding 2000 characters', () => {
    const result = validateMerchPayload({ ...validPayload, detail: 'x'.repeat(2001) });
    expect(result.valid).toBe(false);
    expect(result.errors.detail).toContain('2000');
  });

  it('rejects empty price', () => {
    const result = validateMerchPayload({ ...validPayload, price: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.price).toBeDefined();
  });

  it('rejects non-numeric price', () => {
    const result = validateMerchPayload({ ...validPayload, price: 'free' });
    expect(result.valid).toBe(false);
    expect(result.errors.price).toContain('valid number');
  });

  it('rejects negative price', () => {
    const result = validateMerchPayload({ ...validPayload, price: '-10' });
    expect(result.valid).toBe(false);
    expect(result.errors.price).toContain('negative');
  });

  it('rejects price exceeding maximum', () => {
    const result = validateMerchPayload({ ...validPayload, price: '1000000' });
    expect(result.valid).toBe(false);
    expect(result.errors.price).toContain('maximum');
  });

  it('accumulates multiple errors', () => {
    const result = validateMerchPayload({ title: '', detail: '', price: '', date: '', time: '' });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(3);
  });
});

describe('updateStock', () => {
  const baseItems: MerchInventoryItem[] = [
    { id: 1, title: 'Hoodie', stock: 50, reserved: 5 },
    { id: 2, title: 'T-Shirt', stock: 100, reserved: 10 },
  ];

  it('increases stock for a valid item', () => {
    const result = updateStock(baseItems, 1, 10);
    expect(result.find((i) => i.id === 1)?.stock).toBe(60);
    expect(result.find((i) => i.id === 2)?.stock).toBe(100);
  });

  it('decreases stock for a valid item', () => {
    const result = updateStock(baseItems, 2, -20);
    expect(result.find((i) => i.id === 2)?.stock).toBe(80);
  });

  it('does not go below zero', () => {
    const result = updateStock(baseItems, 1, -100);
    expect(result.find((i) => i.id === 1)?.stock).toBe(0);
  });

  it('does not modify items when id is not found', () => {
    const result = updateStock(baseItems, 999, 10);
    expect(result).toEqual(baseItems);
  });

  it('returns a new array without mutating the original', () => {
    const result = updateStock(baseItems, 1, 5);
    expect(result).not.toBe(baseItems);
    expect(baseItems[0].stock).toBe(50);
  });
});

describe('reserveStock', () => {
  const baseItems: MerchInventoryItem[] = [
    { id: 1, title: 'Hoodie', stock: 50, reserved: 5 },
    { id: 2, title: 'T-Shirt', stock: 0, reserved: 0 },
  ];

  it('reserves stock when sufficient is available', () => {
    const { items, success } = reserveStock(baseItems, 1, 10);
    expect(success).toBe(true);
    expect(items.find((i) => i.id === 1)?.reserved).toBe(15);
    expect(items.find((i) => i.id === 1)?.stock).toBe(50);
  });

  it('fails when insufficient stock is available', () => {
    const { items, success } = reserveStock(baseItems, 1, 100);
    expect(success).toBe(false);
    expect(items.find((i) => i.id === 1)?.reserved).toBe(5);
  });

  it('fails when item does not exist', () => {
    const { items, success } = reserveStock(baseItems, 999, 1);
    expect(success).toBe(false);
    expect(items).toEqual(baseItems);
  });

  it('fails when stock is zero', () => {
    const { success } = reserveStock(baseItems, 2, 1);
    expect(success).toBe(false);
  });

  it('does not mutate the original array on failure', () => {
    reserveStock(baseItems, 2, 1);
    expect(baseItems[1].reserved).toBe(0);
  });

  it('reserves stock exactly matching available quantity', () => {
    const { items, success } = reserveStock(baseItems, 1, 45);
    expect(success).toBe(true);
    expect(items.find((i) => i.id === 1)?.reserved).toBe(50);
  });

  it('fails when reserve quantity exceeds available stock', () => {
    const { success } = reserveStock(baseItems, 1, 46);
    expect(success).toBe(false);
  });

  it('handles zero reserve quantity', () => {
    const { items, success } = reserveStock(baseItems, 1, 0);
    expect(success).toBe(true);
    expect(items.find((i) => i.id === 1)?.reserved).toBe(5);
  });

  it('handles negative reserve quantity gracefully', () => {
    const { success } = reserveStock(baseItems, 1, -1);
    expect(success).toBe(false);
  });

  it('returns new array without mutating original on success', () => {
    const { items } = reserveStock(baseItems, 1, 5);
    expect(items).not.toBe(baseItems);
    expect(baseItems[0].reserved).toBe(5);
  });
});
