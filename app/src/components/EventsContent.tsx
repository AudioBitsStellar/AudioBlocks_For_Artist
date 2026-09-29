"use client";

import {
  Filter,
  Search,
  CalendarDays,
  Clock3,
  Trash2,
  CalendarPlus,
  TrendingUp,
  Users,
  Activity,
  UserPlus,
  Pencil,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { featureFlags } from "@/lib/featureFlags";
import MockDataBadge from "@/components/MockDataBadge";
import ConfirmationDialog from "./shared/ConfirmationDialog";
import EmptyState from "./shared/EmptyState";
import { Skeleton, SkeletonList } from "./shared/Skeleton";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useEventsService, { EventItem } from "@/services/eventsService";
import { formatDate } from "@/utils/date";

interface EventsContentProps {
  onNewEvent: () => void;
}

const ENGAGEMENT_ICONS: Record<string, React.ReactNode> = {
  "Total Fans Reached": <Users className="h-5 w-5" />,
  "Avg Engagement Rate": <Activity className="h-5 w-5" />,
  "Fan Growth": <TrendingUp className="h-5 w-5" />,
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: unknown[] }) => {
  if (!active || !payload || !payload[0]) return null;
  const data = payload[0] as { payload: { date: string; score: number; attendees: number } };
  return (
    <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-3 shadow-xl">
      <p className="text-text-muted text-xs mb-1">{data.payload.date}</p>
      <p className="text-text text-sm font-semibold">Score: {data.payload.score}%</p>
      <p className="text-text-muted text-xs">{data.payload.attendees} attendees</p>
    </div>
  );
};

export default function EventsContent({ onNewEvent }: EventsContentProps) {
  const { useGetEvents, useDeleteEvent, useUpdateEvent } = useEventsService();
  const { data, isLoading, isError, refetch } = useGetEvents();

  const metrics = data?.metrics ?? [];
  const events = data?.items ?? [];
  const engagementMetrics = data?.engagement?.metrics ?? [];
  const engagementTrend = data?.engagement?.trend ?? [];

  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [engPeriod, setEngPeriod] = useState<"7" | "30">("30");
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    eventId: string | null;
  }>({
    isOpen: false,
    eventId: null,
  });
  const [editEvent, setEditEvent] = useState<EventItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "past">("all");

  useEffect(() => {
    setEventsList(events);
  }, [events]);

  const deleteMutation = useDeleteEvent(deleteConfirmation.eventId || "");

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation.eventId !== null) {
      try {
        await deleteMutation.mutateAsync();
        setEventsList((prev) => prev.filter((e) => e.id !== deleteConfirmation.eventId));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const updateMutation = useUpdateEvent(editEvent?.id || "");

  const handleEditOpen = (event: EventItem) => {
    setEditEvent(event);
  };

  const handleEditClose = () => {
    setEditEvent(null);
  };

  const handleEditSave = async (updatedEvent: Partial<EventItem>) => {
    if (!editEvent) return;
    try {
      await updateMutation.mutateAsync({ ...editEvent, ...updatedEvent });
      setEventsList((prev) =>
        prev.map((e) => (e.id === editEvent.id ? { ...e, ...updatedEvent } : e))
      );
      handleEditClose();
    } catch (err) {
      console.error(err);
    }
  };

  const trendData = engPeriod === "7" ? engagementTrend.slice(-7) : engagementTrend;

  // Filter events based on search query and filter status
  const filteredEvents = useMemo(() => {
    let result = eventsList;

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.date.toLowerCase().includes(query) ||
          event.time.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      result = result.filter((event) => {
        const eventDate = new Date(event.date);
        return filterStatus === "upcoming" ? eventDate >= today : eventDate < today;
      });
    }

    return result;
  }, [eventsList, searchQuery, filterStatus]);

  if (isLoading) {
    return (
      <div className="space-y-10" aria-busy="true">
        <div role="status" aria-label="Loading events" className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-9 w-56 rounded" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-3xl" />
          ))}
        </div>
        <SkeletonList items={4} ariaLabel="Loading event list" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-10">
        <EmptyState
          icon={CalendarPlus}
          title="Unable to load events"
          description="Your events could not be loaded. Check your connection and try again."
          ctaLabel="Retry"
          onCta={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-text-muted">My Events</p>
          <h1 className="text-3xl font-bold text-text">All Events</h1>
        </div>
        <button
          onClick={onNewEvent}
          className="self-start rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-contrast shadow-[0_10px_30px_rgba(210,4,91,0.35)] transition-colors hover:bg-primary-hover"
        >
          New Event
        </button>
      </div>

      {/* Event Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="relative overflow-hidden rounded-3xl p-[1px]">
            <div
              className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${metric.gradient}`}
              aria-hidden
            />
            <div className="relative flex h-full flex-col justify-between rounded-3xl bg-surface-sunken px-6 py-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {metric.label}
              </span>
              <p className="text-3xl font-semibold text-text">{metric.value}</p>
              <span className="text-xs text-text-muted">{metric.descriptor}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Fan Engagement Metrics */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-semibold text-text">Fan Engagement</h2>
          </div>
        </div>
        {engagementMetrics.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {engagementMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="relative overflow-hidden rounded-3xl p-[1px] group"
                >
                  <div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${metric.gradient} opacity-80 group-hover:opacity-100 transition-opacity`}
                    aria-hidden
                  />
                  <div className="relative flex h-full flex-col justify-between rounded-3xl bg-surface-sunken px-6 py-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {metric.label}
                      </span>
                      <span className="text-secondary">
                        {ENGAGEMENT_ICONS[metric.label] ?? <Activity className="h-5 w-5" />}
                      </span>
                    </div>
                    <p className="text-3xl font-semibold text-text">{metric.value}</p>
                    <span className="text-xs text-text-muted">{metric.descriptor}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Engagement Trend Chart */}
            <div className="rounded-3xl border border-border-subtle bg-surface-raised p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-text font-semibold">Engagement Trend</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEngPeriod("7")}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                      engPeriod === "7"
                        ? "bg-secondary text-white shadow-md"
                        : "bg-surface-sunken text-text-muted hover:text-text border border-border"
                    }`}
                    aria-label="View last 7 days"
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setEngPeriod("30")}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                      engPeriod === "30"
                        ? "bg-secondary text-white shadow-md"
                        : "bg-surface-sunken text-text-muted hover:text-text border border-border"
                    }`}
                    aria-label="View last 30 days"
                  >
                    30 Days
                  </button>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#666"
                      style={{ fontSize: "12px" }}
                      tick={{ fill: "#999" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#666"
                      style={{ fontSize: "12px" }}
                      tick={{ fill: "#999" }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#EC4899"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: "#EC4899", stroke: "#1E1E1E", strokeWidth: 2 }}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-border-subtle bg-surface-raised p-10">
            <div className="flex flex-col items-center justify-center text-center">
              <Activity className="h-10 w-10 text-text-muted mb-3" />
              <h3 className="text-text font-semibold mb-1">No engagement data yet</h3>
              <p className="text-text-muted text-sm max-w-md">
                Fan engagement metrics will appear here once your events start attracting attendees.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-semibold text-text">All Events</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Events"
              maxLength={100}
              className="w-full rounded-full border border-border bg-surface-sunken py-3 pl-12 pr-5 text-sm text-text placeholder:text-text-subtle focus:border-secondary focus:outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "upcoming" | "past")}
            className="flex items-center justify-center gap-2 rounded-full border border-border bg-surface-sunken px-5 py-3 text-sm font-medium text-text transition-colors hover:border-secondary"
          >
            <option value="all">All Events</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        eventsList.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="No events yet"
            description="Create your first event to start selling tickets and engaging with your fans."
            ctaLabel="Create your first event"
            onCta={onNewEvent}
          />
        ) : (
          <EmptyState
            icon={Filter}
            title="No events match your filters"
            description="Try adjusting your search or filter criteria."
            ctaLabel="Clear filters"
            onCta={() => {
              setSearchQuery("");
              setFilterStatus("all");
            }}
          />
        )
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="group overflow-hidden rounded-3xl border border-border-subtle bg-surface-raised shadow-lg transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={event.image}
                  alt={event.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="space-y-3 px-6 py-5">
                <h3 className="text-lg font-semibold text-text">{event.title}</h3>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  {event.tickets}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(event.date, "short")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-4 w-4" />
                    {event.time}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditOpen(event)}
                      className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-text transition-colors hover:border-secondary"
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmation({ isOpen: true, eventId: String(event.id) })}
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
      {editEvent && (
        <EditEventModal
          event={editEvent}
          onClose={handleEditClose}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}

// Edit Event Modal
function EditEventModal({
  event,
  onClose,
  onSave,
}: {
  event: EventItem;
  onClose: () => void;
  onSave: (updatedEvent: Partial<EventItem>) => void;
}) {
  const [form, setForm] = useState({
    title: event.title,
    price: event.price.replace(/[^0-9.]/g, ""),
    description: "",
    time: event.time,
    date: event.date,
    tickets: event.tickets,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) newErrors.title = "Event name is required";
    if (!form.price.trim()) newErrors.price = "Price is required";
    else if (isNaN(Number(form.price))) newErrors.price = "Price must be a valid number";
    if (!form.date.trim()) newErrors.date = "Date is required";
    if (!form.time.trim()) newErrors.time = "Time is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      title: form.title.trim(),
      price: form.price.trim(),
      date: form.date.trim(),
      time: form.time.trim(),
      tickets: form.tickets.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-raised p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-text mb-6">Edit Event</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-title" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Event Name*
            </label>
            <input
              id="edit-title"
              type="text"
              value={form.title}
              onChange={handleFieldChange("title")}
              className={`w-full rounded-xl border bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${
                errors.title ? "border-red-500" : "border-[#2A2A2A]"
              }`}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-price" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Event Ticket Price*
            </label>
            <input
              id="edit-price"
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={handleFieldChange("price")}
              placeholder="e.g. 25 or 25.50"
              className={`w-full rounded-xl border bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${
                errors.price ? "border-red-500" : "border-[#2A2A2A]"
              }`}
            />
            {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-date" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Event Date*
            </label>
            <input
              id="edit-date"
              type="text"
              value={form.date}
              onChange={handleFieldChange("date")}
              placeholder="DD-MM-YYYY"
              className={`w-full rounded-xl border bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${
                errors.date ? "border-red-500" : "border-[#2A2A2A]"
              }`}
            />
            {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-time" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Event Time*
            </label>
            <input
              id="edit-time"
              type="text"
              value={form.time}
              onChange={handleFieldChange("time")}
              placeholder="e.g. 18:30 or 6:30 PM"
              className={`w-full rounded-xl border bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${
                errors.time ? "border-red-500" : "border-[#2A2A2A]"
              }`}
            />
            {errors.time && <p className="text-xs text-red-500">{errors.time}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-tickets" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Tickets Available
            </label>
            <input
              id="edit-tickets"
              type="text"
              value={form.tickets}
              onChange={handleFieldChange("tickets")}
              className="w-full rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-transparent px-6 py-2 text-sm font-semibold text-[#A3A3A3] transition hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-full bg-[#D2045B] px-8 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(210,4,91,0.35)] transition hover:bg-[#B8043F]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { EventsContent };
