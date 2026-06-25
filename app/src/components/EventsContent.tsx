'use client';

import { Filter, Search, CalendarDays, Clock3 } from 'lucide-react';
import { featureFlags } from '@/lib/featureFlags';
import { MOCK_EVENTS, MOCK_EVENT_METRICS } from '@/lib/mockData';
import MockDataBadge from '@/components/MockDataBadge';

// TODO: replace with useGet hooks once /artist/events endpoint is ready
const getRealEventMetrics = () => [] as typeof MOCK_EVENT_METRICS;
const getRealEvents = () => [] as typeof MOCK_EVENTS;

interface EventsContentProps {
  onNewEvent: () => void;
}

export default function EventsContent({ onNewEvent }: EventsContentProps) {
  const metrics = featureFlags.useMockEvents ? MOCK_EVENT_METRICS : getRealEventMetrics();
  const events = featureFlags.useMockEvents ? MOCK_EVENTS : getRealEvents();

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#A3A3A3]">My Events</p>
          <h1 className="text-3xl font-bold text-white flex items-center">
            All Events
            {featureFlags.useMockEvents && <MockDataBadge label="events" />}
          </h1>
        </div>
        <button
          onClick={onNewEvent}
          className="self-start rounded-full bg-[#D2045B] px-6 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(210,4,91,0.35)] transition-colors hover:bg-[#B8043F]"
        >
          New Event
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="relative overflow-hidden rounded-3xl p-[1px]">
            <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${metric.gradient}`} aria-hidden />
            <div className="relative flex h-full flex-col justify-between rounded-3xl bg-[#121212] px-6 py-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{metric.label}</span>
              <p className="text-3xl font-semibold text-white">{metric.value}</p>
              <span className="text-xs text-[#A3A3A3]">{metric.descriptor}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-semibold text-white">All Events</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search Events" className="w-full rounded-full border border-[#2E2E2E] bg-[#111111] py-3 pl-12 pr-5 text-sm text-white placeholder:text-gray-500 focus:border-[#885FA8] focus:outline-none" />
          </div>
          <button className="flex items-center justify-center gap-2 rounded-full border border-[#2E2E2E] bg-[#111111] px-5 py-3 text-sm font-medium text-white transition-colors hover:border-[#885FA8]">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-2">
          <p className="text-lg font-semibold">No events yet</p>
          <p className="text-sm">Create your first event to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {events.map((event) => (
            <div key={event.id} className="group overflow-hidden rounded-3xl border border-[#1F1F1F] bg-[#151818] shadow-lg transition-transform duration-200 hover:-translate-y-1">
              <div className="relative h-48 overflow-hidden">
                <img src={event.image} alt={event.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="space-y-3 px-6 py-5">
                <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                <p className="text-xs font-medium uppercase tracking-wide text-[#A3A3A3]">{event.tickets}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#C9C9C9]">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{event.date}</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{event.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <button className="rounded-full border border-[#2E2E2E] px-5 py-1.5 text-xs font-medium text-white transition-colors hover:border-[#885FA8]">Edit</button>
                  <span className="text-sm font-semibold text-white/90">{event.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
