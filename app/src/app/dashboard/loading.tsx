import { Skeleton } from "@/components/shared/Skeleton";

/**
 * Loading skeleton for dashboard pages (issue #427).
 *
 * Shows a lightweight placeholder for the main content area while the dashboard
 * page's JS loads, leaving the sidebar and header mounted. Reuses the shared
 * `Skeleton` primitives so the animation and colors match the rest of the app.
 */
export default function DashboardLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading dashboard page" className="space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6"
          >
            <Skeleton className="mb-2 h-5 w-24 rounded" />
            <Skeleton className="mb-1 h-8 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
        <Skeleton className="h-6 w-40 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
