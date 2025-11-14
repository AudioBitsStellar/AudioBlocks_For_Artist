'use client';

import { Filter, Search, CalendarDays, Clock3 } from 'lucide-react';

const metrics = [
  {
    label: 'Total Events',
    value: '12',
    descriptor: 'Live + Scheduled',
    gradient: 'from-[#D2045B]/60 via-[#885FA8]/40 to-[#4F46E5]/60',
  },
  {
    label: 'Ticket Earnings',
    value: '$3,250',
    descriptor: 'Past 30 days',
    gradient: 'from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]',
  },
  {
    label: 'Total Purchases',
    value: '$5,000.00',
    descriptor: 'All-time GMV',
    gradient: 'from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]',
  },
];

const events = [
  {
    id: 1,
    title: 'Echoes of the Soul',
    date: '24/08/2025',
    time: '8:30PM',
    tickets: '100/1000 Tickets Left',
    price: '0.005ETH',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 2,
    title: 'Echoes of the Soul',
    date: '24/08/2025',
    time: '8:30PM',
    tickets: '100/1000 Tickets Left',
    price: '0.005ETH',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 3,
    title: 'Echoes of the Soul',
    date: '24/08/2025',
    time: '8:30PM',
    tickets: '100/1000 Tickets Left',
    price: '0.005ETH',
    image: 'https://images.unsplash.com/photo-1516280440619-37996c4e5b4e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 4,
    title: 'Echoes of the Soul',
    date: '24/08/2025',
    time: '8:30PM',
    tickets: '100/1000 Tickets Left',
    price: '0.005ETH',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafbd?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 5,
    title: 'Echoes of the Soul',
    date: '24/08/2025',
    time: '8:30PM',
    tickets: '100/1000 Tickets Left',
    price: '0.005ETH',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80',
  },
];

interface EventsContentProps {
  onNewEvent: () => void;
}

export default function EventsContent({ onNewEvent }: EventsContentProps) {
  return (
    <div className="space-y-10">
      {/* Page Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#A3A3A3]">My Events</p>
          <h1 className="text-3xl font-bold text-white">All Events</h1>
        </div>
        <button
          onClick={onNewEvent}
          className="self-start rounded-full bg-[#D2045B] px-6 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(210,4,91,0.35)] transition-colors hover:bg-[#B8043F]"
        >
          New Event
        </button>
      </div>

      {/* Metrics */}
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

      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-semibold text-white">All Events</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Events"
              className="w-full rounded-full border border-[#2E2E2E] bg-[#111111] py-3 pl-12 pr-5 text-sm text-white placeholder:text-gray-500 focus:border-[#885FA8] focus:outline-none"
            />
          </div>
          <button className="flex items-center justify-center gap-2 rounded-full border border-[#2E2E2E] bg-[#111111] px-5 py-3 text-sm font-medium text-white transition-colors hover:border-[#885FA8]">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="group overflow-hidden rounded-3xl border border-[#1F1F1F] bg-[#151818] shadow-lg transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="relative h-48 overflow-hidden">
              <img src={event.image} alt={event.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div className="space-y-3 px-6 py-5">
              <h3 className="text-lg font-semibold text-white">{event.title}</h3>
              <p className="text-xs font-medium uppercase tracking-wide text-[#A3A3A3]">{event.tickets}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#C9C9C9]">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  {event.date}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-4 w-4" />
                  {event.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <button className="rounded-full border border-[#2E2E2E] px-5 py-1.5 text-xs font-medium text-white transition-colors hover:border-[#885FA8]">
                  Edit
                </button>
                <span className="text-sm font-semibold text-white/90">{event.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
