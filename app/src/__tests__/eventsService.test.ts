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

vi.mock('@/api/axios', () => ({
  createApiClient: vi.fn().mockResolvedValue({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  }),
}));

vi.mock('@/hooks/useToastHandler', () => ({
  useHandleSuccess: () => vi.fn(),
  useHandleError: () => vi.fn(),
}));

import useEventsService, {
  EventItem,
  CreateEventPayload,
  EventListResponse,
} from '@/services/eventsService';

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: makeQueryClient() }, children);
}

const validPayload: CreateEventPayload = {
  title: 'New Event',
  tickets: '100',
  date: '2025-07-15',
  time: '19:00',
  price: '25.00',
  image: 'https://example.com/event.png',
};

const mockEventItem: EventItem = {
  id: 1,
  ...validPayload,
  image: validPayload.image!,
};

describe('useEventsService — CRUD operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useGetEvents', () => {
    it('fetches and returns event list on success', async () => {
      const responseData: EventListResponse = {
        metrics: [
          { label: 'Total Events', value: '5', descriptor: 'Active events', gradient: 'from-blue-500 to-indigo-500' },
        ],
        items: [mockEventItem],
      };
      mockGet.mockResolvedValue({ data: responseData });

      const { result } = renderHook(() => useEventsService().useGetEvents(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(responseData);
      expect(mockGet).toHaveBeenCalledWith('/artist/events');
    });

    it('surfaces error when the API call fails', async () => {
      mockGet.mockRejectedValue({ status: 500, message: 'Server error' });

      const { result } = renderHook(() => useEventsService().useGetEvents(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });
  });

  describe('useCreateEvent', () => {
    it('creates an event and returns it', async () => {
      mockPost.mockResolvedValue({ data: mockEventItem });

      const { result } = renderHook(() => useEventsService().useCreateEvent(), { wrapper: Wrapper });

      await act(async () => {
        const created = await result.current.mutateAsync(validPayload);
        expect(created).toEqual(mockEventItem);
      });

      expect(mockPost).toHaveBeenCalledWith('/artist/events', validPayload);
    });

    it('rejects when the API returns an error', async () => {
      mockPost.mockRejectedValue(new Error('Failed to create event.'));

      const { result } = renderHook(() => useEventsService().useCreateEvent(), { wrapper: Wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync(validPayload)).rejects.toThrow('Failed to create event.');
      });
    });
  });

  describe('useUpdateEvent', () => {
    it('updates an event with a partial payload', async () => {
      const updatedItem = { ...mockEventItem, date: '2025-08-20', price: '30.00' };
      mockPut.mockResolvedValue({ data: updatedItem });

      const { result } = renderHook(() => useEventsService().useUpdateEvent(1), { wrapper: Wrapper });

      const partial: Partial<CreateEventPayload> = { date: '2025-08-20', price: '30.00' };
      await act(async () => {
        const updated = await result.current.mutateAsync(partial);
        expect(updated).toEqual(updatedItem);
      });

      expect(mockPut).toHaveBeenCalledWith('/artist/events/1', partial);
    });

    it('rejects when the update API fails', async () => {
      mockPut.mockRejectedValue(new Error('Failed to update event.'));

      const { result } = renderHook(() => useEventsService().useUpdateEvent(99), { wrapper: Wrapper });

      await act(async () => {
        const partial: Partial<CreateEventPayload> = { title: 'Nonexistent Event' };
        await expect(result.current.mutateAsync(partial)).rejects.toThrow('Failed to update event.');
      });
    });
  });

  describe('useDeleteEvent', () => {
    it('deletes an event successfully', async () => {
      mockDelete.mockResolvedValue({ data: undefined });

      const { result } = renderHook(() => useEventsService().useDeleteEvent(1), { wrapper: Wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync()).resolves.toBeUndefined();
      });

      expect(mockDelete).toHaveBeenCalledWith('/artist/events/1');
    });

    it('rejects when the delete API fails', async () => {
      mockDelete.mockRejectedValue(new Error('Failed to delete event.'));

      const { result } = renderHook(() => useEventsService().useDeleteEvent(999), { wrapper: Wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow('Failed to delete event.');
      });
    });
  });
});