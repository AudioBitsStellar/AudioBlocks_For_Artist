"use client";

import {
  Filter,
  Search,
  CalendarDays,
  Clock3,
  Trash2,
  Loader2,
  CalendarPlus,
  TrendingUp,
  Users,
  Activity,
  UserPlus,
} from "lucide-react";
import { useState, useEffect } from "react";
import { featureFlags } from "@/lib/featureFlags";
import {
  MOCK_EVENTS,
  MOCK_EVENT_METRICS,
  MOCK_EVENT_ENGAGEMENT_METRICS,
  MOCK_ENGAGEMENT_TREND,
} from "@/__mocks__/mockData";
import MockDataBadge from "@/components/MockDataBadge";
import ConfirmationDialog from "./shared/ConfirmationDialog";
import EmptyState from "./shared/EmptyState";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useEventsService from "@/services/eventsService";
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
  const { useGetEvents, useDeleteEvent } = useEventsService();
  const { data, isLoading } = useGetEvents();

  const metrics = featureFlags.useMockEvents ? MOCK_EVENT_METRICS : (data?.metrics ?? []);
  const events = featureFlags.useMockEvents ? MOCK_EVENTS : (data?.items ?? []);
  const engagementMetrics = featureFlags.useMockEvents
    ? MOCK_EVENT_ENGAGEMENT_METRICS
    : (data?.engagement?.metrics ?? []);
  const engagementTrend = featureFlags.useMockEvents
    ? MOCK_ENGAGEMENT_TREND
    : (data?.engagement?.trend ?? []);

  const [eventsList, setEventsList] = useState<any[]>([]);
  const [engPeriod, setEngPeriod] = useState<"7" | "30">("30");
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    eventId: string | null;
  }>({
    isOpen: false,
    eventId: null,
  });

  useEffect(() => {
    setEventsList(events);
  }, [events]);

  const deleteMutation = useDeleteEvent(deleteConfirmation.eventId || "");

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation.eventId !== null) {
      try {
        if (!featureFlags.useMockEvents) {
          await deleteMutation.mutateAsync();
        }
        setEventsList((prev) => prev.filter((e) => e.id !== deleteConfirmation.eventId));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const trendData = engPeriod === "7" ? engagementTrend.slice(-7) : engagementTrend;

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
              placeholder="Search Events"
              maxLength={100}
              className="w-full rounded-full border border-border bg-surface-sunken py-3 pl-12 pr-5 text-sm text-text placeholder:text-text-subtle focus:border-secondary focus:outline-none"
            />
          </div>
          <button className="flex items-center justify-center gap-2 rounded-full border border-border bg-surface-sunken px-5 py-3 text-sm font-medium text-text transition-colors hover:border-secondary">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>
      </div>

      {eventsList.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="No events yet"
          description="Create your first event to start selling tickets and engaging with your fans."
          ctaLabel="Create your first event"
          onCta={onNewEvent}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {eventsList.map((event) => (
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
                    <button className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-text transition-colors hover:border-secondary">
                      Edit
                    </button>
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
