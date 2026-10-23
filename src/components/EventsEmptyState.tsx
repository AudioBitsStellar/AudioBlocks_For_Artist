import { CalendarDays, Plus } from "lucide-react";

interface EventsEmptyStateProps {
  onAddEvent?: () => void;
}

export function EventsEmptyState({ onAddEvent }: EventsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 rounded-full bg-indigo-50 dark:bg-indigo-900/20 p-6">
        <CalendarDays className="h-10 w-10 text-indigo-400 dark:text-indigo-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        No events yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
        You haven&apos;t added any events. Start by creating your first event to keep track of your schedule.
      </p>
      {onAddEvent && (
        <button
          onClick={onAddEvent}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </button>
      )}
    </div>
  );
}
