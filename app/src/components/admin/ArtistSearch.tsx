"use client";

/**
 * Admin artist search / discovery (issue #420).
 *
 * Lets platform staff look up an artist by name, handle, email or wallet, then
 * open their public profile. The free-text input is debounced so typing does
 * not fire a request per keystroke, and the verification filter is part of the
 * request (not a client-side filter) so the backend can paginate correctly.
 */

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserRound, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import useArtistDirectoryService, {
  artistDirectoryStatuses,
  toArtistDirectoryEntries,
  type ArtistDirectoryEntry,
} from "@/services/artistDirectoryService";
import { isAdminSession } from "@/utils/jwt";
import Breadcrumb from "@/components/Breadcrumb";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import Pagination from "@/components/shared/Pagination";
import { SkeletonList } from "@/components/shared/Skeleton";
import { formatDate } from "@/utils/date";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_LABELS: Record<ArtistDirectoryEntry["status"], string> = {
  verified: "Verified",
  pending: "Pending",
  unverified: "Unverified",
};

const STATUS_BADGE_STYLES: Record<ArtistDirectoryEntry["status"], string> = {
  verified: "bg-green-500/15 text-green-400",
  pending: "bg-yellow-500/15 text-yellow-400",
  unverified: "bg-[#2A2A2A] text-[#A3A3A3]",
};

export default function ArtistSearch() {
  // `null` until the session token has been read on the client: the token lives
  // in cookies/localStorage, so this cannot be resolved during SSR.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const searchId = useId();
  const statusId = useId();

  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<ArtistDirectoryEntry["status"] | "all">("all");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setIsAdmin(isAdminSession());
  }, []);

  // Any change to the query or filter invalidates the current page offset.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const { useSearchArtists } = useArtistDirectoryService();
  const { data, isLoading, isError, isFetching, refetch } = useSearchArtists(
    { query: debouncedSearch, page, limit: PAGE_SIZE, status },
    isAdmin === true
  );

  const artists = useMemo(() => toArtistDirectoryEntries(data), [data]);
  const total = data?.meta?.total ?? artists.length;
  const isEmpty = isAdmin === true && !isLoading && !isError && artists.length === 0;
  const showSkeleton = isLoading || (isFetching && artists.length === 0);

  if (isAdmin === null) {
    return (
      <SkeletonList
        items={8}
        ariaLabel="Checking admin access"
        className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-2"
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Admin access required</h1>
        <p className="mt-2 text-sm text-[#A3A3A3]">
          Artist search is only available to platform administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "Overview", href: "/dashboard/overview" },
          { label: "Artist search", isActive: true },
        ]}
      />

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[#A3A3A3]">Admin</p>
        <h1 className="text-3xl font-bold text-white">Artist search</h1>
        <p className="text-sm text-[#A3A3A3]">
          Find any artist on AudioBlocks by name, handle, email or wallet address.
        </p>
      </header>

      <form
        role="search"
        aria-label="Artist directory search"
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
            size={18}
            aria-hidden="true"
          />
          <label htmlFor={searchId} className="sr-only">
            Search artists
          </label>
          <input
            id={searchId}
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, handle, email or wallet…"
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] py-3 pl-12 pr-11 text-sm text-white placeholder:text-[#6F6F6F] outline-none transition-colors focus:border-[#885FA8]"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear artist search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#A3A3A3] transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D2045B]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={statusId} className="text-sm text-[#A3A3A3]">
            Status
          </label>
          <select
            id={statusId}
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#885FA8]"
          >
            {artistDirectoryStatuses.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All" : STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </form>

      <p className="text-xs text-[#A3A3A3]" role="status" aria-live="polite">
        {showSkeleton ? "Searching artists…" : `${total} artist${total === 1 ? "" : "s"} found`}
      </p>

      {showSkeleton ? (
        <SkeletonList
          items={8}
          ariaLabel="Loading artists"
          className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-2"
        />
      ) : isError ? (
        <ErrorState
          title="Unable to load artists"
          description="We could not reach the artist directory. Please try again."
          retryLabel="Retry"
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <EmptyState
          icon={UserRound}
          title="No artists found"
          description={
            debouncedSearch
              ? `No artist matches “${debouncedSearch}”. Try a different name, handle or email.`
              : "No artist matches the selected filter."
          }
        />
      ) : (
        <ul
          className="divide-y divide-[#1F1F1F] overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#111111]"
          aria-label="Artist search results"
        >
          {artists.map((artist) => (
            <li key={artist.id}>
              <Link
                href={`/artist/${encodeURIComponent(artist.handle)}`}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D2045B] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-white">{artist.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE_STYLES[artist.status]}`}
                    >
                      {STATUS_LABELS[artist.status]}
                    </span>
                  </div>
                  <p className="truncate text-sm text-[#A3A3A3]">@{artist.handle}</p>
                  {artist.email && (
                    <p className="truncate text-sm text-[#6F6F6F]">{artist.email}</p>
                  )}
                </div>
                <dl className="flex shrink-0 gap-6 text-sm">
                  {typeof artist.songCount === "number" && (
                    <div>
                      <dt className="text-[#6F6F6F]">Songs</dt>
                      <dd className="text-white">{artist.songCount}</dd>
                    </div>
                  )}
                  {typeof artist.albumCount === "number" && (
                    <div>
                      <dt className="text-[#6F6F6F]">Albums</dt>
                      <dd className="text-white">{artist.albumCount}</dd>
                    </div>
                  )}
                  {artist.joinedAt && (
                    <div>
                      <dt className="text-[#6F6F6F]">Joined</dt>
                      <dd className="text-white">
                        {formatDate(new Date(artist.joinedAt), "short")}
                      </dd>
                    </div>
                  )}
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={total}
        onPageChange={setPage}
        ariaLabel="Artist search pages"
        itemNoun="artists"
      />
    </div>
  );
}

export { ArtistSearch };
