'use client';

import { Filter, Search, CalendarDays, Clock3, Trash2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { featureFlags } from '@/lib/featureFlags';
import { MOCK_EVENTS, MOCK_EVENT_METRICS } from '@/lib/mockData';
import MockDataBadge from '@/components/MockDataBadge';
import ConfirmationDialog from './shared/ConfirmationDialog';

import useEventsService from '@/services/eventsService';
import { formatDate } from '@/utils/date';

interface EventsContentProps {
  onNewEvent: () => void;
}

export default function EventsContent({ onNewEvent }: EventsContentProps) {
  const { useGetEvents, useDeleteEvent } = useEventsService();
  const { data, isLoading } = useGetEvents();

  const metrics = featureFlags.useMockEvents ? MOCK_EVENT_METRICS : (data?.metrics ?? []);
  const events = featureFlags.useMockEvents ? MOCK_EVENTS : (data?.items ?? []);

  const [eventsList, setEventsList] = useState<any[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; eventId: string | null }>({
    isOpen: false,
    eventId: null
  });

  useEffect(() => {
    setEventsList(events);
  }, [events]);

  const deleteMutation = useDeleteEvent(deleteConfirmation.eventId || '');

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation.eventId !== null) {
      try {
        if (!featureFlags.useMockEvents) {
          await deleteMutation.mutateAsync();
        }
        setEventsList(prev => prev.filter(e => e.id !== deleteConfirmation.eventId));
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (isLoading && !featureFlags.useMockEvents) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-text-muted">My Events</p>
          <h1 className="text-3xl font-bold text-text flex items-center">
            All Events
            {featureFlags.useMockEvents && <MockDataBadge label="events" />}
          </h1>
        </div>
        <button
          onClick={onNewEvent}
          className="self-start rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-contrast shadow-[0_10px_30px_rgba(210,4,91,0.35)] transition-colors hover:bg-primary-hover"
        >
          New Event
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="relative overflow-hidden rounded-3xl p-[1px]">
            <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${metric.gradient}`} aria-hidden />
            <div className="relative flex h-full flex-col justify-between rounded-3xl bg-surface-sunken px-6 py-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{metric.label}</span>
              <p className="text-3xl font-semibold text-text">{metric.value}</p>
              <span className="text-xs text-text-muted">{metric.descriptor}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-semibold text-text">All Events</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Search Events" className="w-full rounded-full border border-border bg-surface-sunken py-3 pl-12 pr-5 text-sm text-text placeholder:text-text-subtle focus:border-secondary focus:outline-none" />
          </div>
          <button className="flex items-center justify-center gap-2 rounded-full border border-border bg-surface-sunken px-5 py-3 text-sm font-medium text-text transition-colors hover:border-secondary">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>
      </div>

      {eventsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted gap-3">
          <CalendarDays className="h-10 w-10 text-text-muted" />
          <p className="text-lg font-semibold text-text">No events yet</p>
          <p className="text-sm">Create your first event to get started.</p>
          <button
            onClick={onNewEvent}
            className="mt-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-contrast shadow-[0_10px_30px_rgba(210,4,91,0.35)] transition-colors hover:bg-primary-hover"
          >
            Create your first event
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {eventsList.map((event) => (
            <div key={event.id} className="group overflow-hidden rounded-3xl border border-border-subtle bg-surface-raised shadow-lg transition-transform duration-200 hover:-translate-y-1">
              <div className="relative h-48 overflow-hidden">
                <img src={event.image} alt={event.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="space-y-3 px-6 py-5">
                <h3 className="text-lg font-semibold text-text">{event.title}</h3>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{event.tickets}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(event.date, 'short')}</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{event.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-text transition-colors hover:border-secondary">Edit</button>
                    <button
                      onClick={() => setDeleteConfirmation({ isOpen: true, eventId: event.id })}
                      className="rounded-full border border-error bg-error/20 px-4 py-1.5 text-xs font-medium text-error hover:text-error hover:bg-error transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-text-inverted/90">{event.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, eventId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action is permanent and cannot be undone."
      />
    </div>
  );
}
