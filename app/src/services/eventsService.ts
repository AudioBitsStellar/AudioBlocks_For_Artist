import { EVENTS_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePost, usePut, useDelete } from "@/api/queryClient";
import { DASHBOARD_CACHE } from "@/api/cachePolicy";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import type { CreateEventPayload, EngagementTrendPoint, EventEngagement, EventItem, EventListResponse, EventMetric, UpdateEventPayload } from "@/types/api";

// Response types live in the central `@/types/api` module (#140); re-exported
// here so existing imports from this service keep working.
export type { CreateEventPayload, EngagementTrendPoint, EventEngagement, EventItem, EventListResponse, EventMetric, UpdateEventPayload } from "@/types/api";

const EVENTS_QUERY_KEY = ["events"];

const useEventsService = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  /**
   * Fetches the artist's events (metrics + list), cached for 2 minutes and
   * invalidated by the create/update/delete mutations below.
   *
   * @returns A React Query result: `{ data: EventListResponse | undefined, isLoading, isError, error, refetch, ... }`.
   * @throws Never throws directly — request failures surface via the returned `error`/`isError` fields.
   */
  const useGetEvents = () =>
    useGet<EventListResponse>(EVENTS_QUERY_KEY, EVENTS_ENDPOINTS.LIST, {
      staleTime: DASHBOARD_CACHE.events,
    });

  /**
   * Creates a new event. Invalidates the events cache and shows a success/error toast on completion.
   *
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with a `CreateEventPayload`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useCreateEvent = () =>
    usePost<EventItem, CreateEventPayload>(EVENTS_ENDPOINTS.CREATE, {
      onSuccess: () => handleSuccess("Event created!"),
      onError: (error) => handleError(error.message || "Failed to create event."),
      invalidateQueries: [EVENTS_QUERY_KEY],
    });

  /**
   * Updates an existing event. Invalidates the events cache and shows a success/error toast on completion.
   *
   * @param id - The event's id.
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with an `UpdateEventPayload`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useUpdateEvent = (id: string | number) =>
    usePut<EventItem, UpdateEventPayload>(EVENTS_ENDPOINTS.UPDATE(id), {
      onSuccess: () => handleSuccess("Event updated!"),
      onError: (error) => handleError(error.message || "Failed to update event."),
      invalidateQueries: [EVENTS_QUERY_KEY],
    });

  /**
   * Deletes an event. Invalidates the events cache and shows a success/error toast on completion.
   *
   * @param id - The event's id.
   * @returns A React Query mutation: call `.mutate()` or `.mutateAsync()`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useDeleteEvent = (id: string | number) =>
    useDelete<void>(EVENTS_ENDPOINTS.DELETE(id), {
      onSuccess: () => handleSuccess("Event deleted."),
      onError: (error) => handleError(error.message || "Failed to delete event."),
      invalidateQueries: [EVENTS_QUERY_KEY],
    });

  return { useGetEvents, useCreateEvent, useUpdateEvent, useDeleteEvent };
};

export default useEventsService;
