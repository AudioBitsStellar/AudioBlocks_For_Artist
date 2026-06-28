import { EVENTS_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePost, usePut, useDelete } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";

export interface EventMetric {
  label: string;
  value: string;
  descriptor: string;
  gradient: string;
}

export interface EventItem {
  id: string | number;
  title: string;
  tickets: string;
  date: string;
  time: string;
  price: string;
  image: string;
}

export interface EventListResponse {
  metrics: EventMetric[];
  items: EventItem[];
}

export interface CreateEventPayload {
  title: string;
  tickets: string;
  date: string;
  time: string;
  price: string;
  image?: string;
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

const EVENTS_QUERY_KEY = ["events"];

const useEventsService = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  const useGetEvents = () =>
    useGet<EventListResponse>(EVENTS_QUERY_KEY, EVENTS_ENDPOINTS.LIST);

  const useCreateEvent = () =>
    usePost<EventItem, CreateEventPayload>(EVENTS_ENDPOINTS.CREATE, {
      onSuccess: () => handleSuccess("Event created!"),
      onError: (error) => handleError(error.message || "Failed to create event."),
      invalidateQueries: [EVENTS_QUERY_KEY],
    });

  const useUpdateEvent = (id: string | number) =>
    usePut<EventItem, UpdateEventPayload>(EVENTS_ENDPOINTS.UPDATE(id), {
      onSuccess: () => handleSuccess("Event updated!"),
      onError: (error) => handleError(error.message || "Failed to update event."),
      invalidateQueries: [EVENTS_QUERY_KEY],
    });

  const useDeleteEvent = (id: string | number) =>
    useDelete<void>(EVENTS_ENDPOINTS.DELETE(id), {
      onSuccess: () => handleSuccess("Event deleted."),
      onError: (error) => handleError(error.message || "Failed to delete event."),
      invalidateQueries: [EVENTS_QUERY_KEY],
    });

  return { useGetEvents, useCreateEvent, useUpdateEvent, useDeleteEvent };
};

export default useEventsService;
