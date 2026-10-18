"use client";

import useOverviewServices, { type StatsWindow } from "@/services/overviewService";

export default function OverviewRecentActivity({ window }: { window: StatsWindow }) {
  const { data, isLoading, isError, refetch } = useOverviewServices().useGetRecentActivity(window);
  return (
    <section aria-label="Recent activity" className="rounded-lg border border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-white mb-3">Recent activity</h2>
      {isLoading ? (
        <p role="status">Loading recent activity…</p>
      ) : isError ? (
        <div className="text-gray-400">
          <p>Recent activity is unavailable.</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-pink-400">
            Retry activity
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-3">
            Your recent actions on AudioBlocks (up to 90 days).
          </p>
          {data?.data.length ? (
            <ul className="space-y-2 text-gray-300">
              {data.data.map((item) => (
                <li key={item.id}>
                  <span>{item.actionType.replace(/_/g, " ")}</span>
                  {" · "}
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No activity in this period.</p>
          )}
        </>
      )}
    </section>
  );
}
