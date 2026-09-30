"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Disc3,
  Download,
  Eye,
  Filter,
  FolderSearch,
  GripVertical,
  Heart,
  MessageCircle,
  MoreVertical,
  Music,
  Pencil,
  Play,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ConfirmationDialog from "./shared/ConfirmationDialog";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";
import ErrorBoundary from "./ErrorBoundary";
import Pagination from "./shared/Pagination";
import EditTrackModal, { EditableTrackFields } from "./common/modals/EditTrackModal";
import useAlbumServices from "@/services/albumService";
import useTrackServices, { applyTrackEdit } from "@/services/trackService";
import {
  clearTrackVisibility,
  describeVisibility,
  filterCatalog,
  getStoredVisibility,
  getTrackVisibility,
  LEGACY_DEFAULT_VISIBILITY,
  setTrackVisibility,
  type TrackVisibility,
  TRACK_VISIBILITY_OPTIONS,
  visibilityLabel,
  visibilityPermissions,
} from "@/services/trackVisibilityService";
import { featureFlags } from "@/lib/featureFlags";

const SONG_ORDER_STORAGE_KEY = "my-music-track-order";

/** Tracks listed per page (issue #427). */
const TRACKS_PER_PAGE = 10;

const UPLOAD_MUSIC_HREF = "/dashboard/upload-music";

/** `1 track` / `8 tracks`. */
const pluralize = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/**
 * What a mode actually grants a listener, spelled out for the row's tooltip.
 * Derived from the rules table rather than written here, so the list can't
 * describe a visibility differently from how it is enforced.
 */
function permissionHint(visibility: TrackVisibility): string {
  const rules = visibilityPermissions(visibility, "visitor");
  return [
    describeVisibility(visibility),
    `${rules.discoverable ? "Shows" : "Hidden"} in search`,
    rules.playable ? "playable" : "not playable",
    rules.shareable ? "link can be shared" : "no shareable link",
  ].join(" · ");
}

interface Album {
  id: number;
  title: string;
  artist: string;
  type: string;
  image: string;
}

interface Song {
  id: number;
  title: string;
  albumName: string;
  artist: string;
  duration: string;
  value: string;
  likes: number;
  comments: number;
  downloads: number;
  thumbnail: string;
  /** Absent on fixtures and pre-feature records, which read as public. */
  visibility?: TrackVisibility;
}

/** The track list's visibility filter: everything, what a listener would find, or one mode. */
type VisibilityFilter = "all" | "discoverable" | TrackVisibility;

interface MyMusicContentProps {
  onAlbumSelect?: (album: Album | null) => void;
}

const albums: Album[] = [
  {
    id: 1,
    title: "Echoes of the Soul",
    artist: "Misty Brown",
    type: "New Album",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&auto=format&q=80",
  },
  {
    id: 2,
    title: "Midnight Vibes",
    artist: "Alex Johnson",
    type: "EP",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop&auto=format&q=80",
  },
  {
    id: 3,
    title: "Electric Dreams",
    artist: "Sarah Williams",
    type: "Single",
    image:
      "https://images.unsplash.com/photo-1516280440619-37996c4e5b4e?w=400&h=400&fit=crop&auto=format&q=80",
  },
  {
    id: 4,
    title: "Serenity Falls",
    artist: "Marcus Chen",
    type: "New Album",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafbd?w=400&h=400&fit=crop&auto=format&q=80",
  },
  {
    id: 5,
    title: "Cosmic Journey",
    artist: "Elena Martinez",
    type: "Remix",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&auto=format&q=80",
  },
];

const initialSongs: Song[] = [
  {
    id: 1,
    title: "Golden Skies",
    albumName: "Echoes of the Soul",
    artist: "Misty Brown",
    duration: "3:42",
    value: "$12.50",
    likes: 124,
    comments: 18,
    downloads: 86,
    thumbnail: albums[0].image,
  },
  {
    id: 2,
    title: "Neon Hearts",
    albumName: "Midnight Vibes",
    artist: "Alex Johnson",
    duration: "4:08",
    value: "$10.00",
    likes: 98,
    comments: 12,
    downloads: 64,
    thumbnail: albums[1].image,
  },
  {
    id: 3,
    title: "Electric Dreams",
    albumName: "Electric Dreams",
    artist: "Sarah Williams",
    duration: "3:25",
    value: "$8.75",
    likes: 156,
    comments: 24,
    downloads: 102,
    thumbnail: albums[2].image,
  },
  {
    id: 4,
    title: "Still Waters",
    albumName: "Serenity Falls",
    artist: "Marcus Chen",
    duration: "5:12",
    value: "$15.00",
    likes: 76,
    comments: 9,
    downloads: 42,
    thumbnail: albums[3].image,
  },
  {
    id: 5,
    title: "Beyond the Stars",
    albumName: "Cosmic Journey",
    artist: "Elena Martinez",
    duration: "4:36",
    value: "$11.25",
    likes: 211,
    comments: 31,
    downloads: 148,
    thumbnail: albums[4].image,
  },
  {
    id: 6,
    title: "Afterglow",
    albumName: "Echoes of the Soul",
    artist: "Misty Brown",
    duration: "3:58",
    value: "$9.50",
    likes: 87,
    comments: 11,
    downloads: 59,
    thumbnail: albums[0].image,
  },
  {
    id: 7,
    title: "City Lights",
    albumName: "Midnight Vibes",
    artist: "Alex Johnson",
    duration: "3:16",
    value: "$7.50",
    likes: 133,
    comments: 16,
    downloads: 91,
    thumbnail: albums[1].image,
  },
  {
    id: 8,
    title: "Open Skies",
    albumName: "Serenity Falls",
    artist: "Marcus Chen",
    duration: "4:44",
    value: "$13.00",
    likes: 65,
    comments: 7,
    downloads: 38,
    thumbnail: albums[3].image,
  },
  {
    id: 9,
    title: "Paper Planes",
    albumName: "Midnight Vibes",
    artist: "Alex Johnson",
    duration: "3:31",
    value: "$8.00",
    likes: 92,
    comments: 10,
    downloads: 61,
    thumbnail: albums[1].image,
  },
  {
    id: 10,
    title: "Slow Burn",
    albumName: "Serenity Falls",
    artist: "Marcus Chen",
    duration: "4:58",
    value: "$14.00",
    likes: 58,
    comments: 6,
    downloads: 31,
    thumbnail: albums[3].image,
  },
  {
    id: 11,
    title: "Velvet Sky",
    albumName: "Cosmic Journey",
    artist: "Elena Martinez",
    duration: "3:47",
    value: "$10.50",
    likes: 174,
    comments: 26,
    downloads: 121,
    thumbnail: albums[4].image,
  },
  {
    id: 12,
    title: "Last Train Home",
    albumName: "Electric Dreams",
    artist: "Sarah Williams",
    duration: "4:05",
    value: "$9.00",
    likes: 143,
    comments: 19,
    downloads: 97,
    thumbnail: albums[2].image,
  },
];

function AlbumSkeletonRow() {
  return (
    <div
      className="flex gap-6 overflow-hidden pl-12 pr-12"
      aria-hidden="true"
      data-testid="my-music-skeleton"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="w-64 shrink-0">
          <div className="mb-3 h-64 w-64 animate-pulse rounded-lg bg-gray-800" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-20 animate-pulse rounded bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyMusicContent({ onAlbumSelect }: MyMusicContentProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [page, setPage] = useState(1);
  const [draggedSongId, setDraggedSongId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [reorderMessage, setReorderMessage] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    songId: number | null;
  }>({
    isOpen: false,
    songId: null,
  });

  const [editingSongId, setEditingSongId] = useState<number | null>(null);
  const editingSong = songs.find((song) => song.id === editingSongId) ?? null;

  const { useUpdateTrack } = useTrackServices();
  const updateTrack = useUpdateTrack({
    // Show the edit immediately; if the save fails, put back just this track's
    // previous fields so unrelated edits/reorders made meanwhile are kept.
    //
    // Visibility is recorded locally here rather than at the call site,
    // because every way of changing it (the row picker and the edit dialog)
    // arrives through this one mutation: one place to persist, one place to
    // undo. Without the local record a reload would forget a choice the API
    // does not carry yet; without the undo a failed save would come back as a
    // setting the artist never kept.
    onOptimistic: (edit) => {
      const previous = songs.find((song) => song.id === edit.id);
      const previousStored = edit.visibility ? getStoredVisibility(edit.id) : undefined;
      if (edit.visibility) setTrackVisibility(edit.id, edit.visibility);
      setSongs((current) => applyTrackEdit(current, edit));
      setReorderMessage(`${edit.title} updated`);
      return () => {
        if (!previous) return;
        setSongs((current) =>
          applyTrackEdit(current, {
            id: previous.id,
            title: previous.title,
            albumName: previous.albumName,
            visibility: previous.visibility,
          })
        );
        if (edit.visibility) {
          if (previousStored) setTrackVisibility(edit.id, previousStored);
          else clearTrackVisibility(edit.id);
        }
        setReorderMessage(`Couldn't save changes to ${edit.title}. They were reverted.`);
      };
    },
  });

  const handleEditSave = (values: EditableTrackFields) => {
    if (editingSongId === null) return;
    updateTrack.mutate({ id: editingSongId, ...values });
  };

  /**
   * Changing visibility from the row is the same edit as changing it in the
   * dialog, so it takes the same optimistic save — a failed request reverts
   * the picker instead of leaving the artist believing a private track is up.
   */
  const handleVisibilityChange = (song: Song, visibility: TrackVisibility) => {
    updateTrack.mutate({
      id: song.id,
      title: song.title,
      albumName: song.albumName,
      visibility,
    });
    setReorderMessage(`${song.title} is now ${visibilityLabel(visibility).toLowerCase()}`);
  };

  const { useGetAlbums } = useAlbumServices();
  const {
    data: albumsData,
    isLoading: isAlbumsLoading,
    isError: isAlbumsError,
    refetch: refetchAlbums,
  } = useGetAlbums(!featureFlags.useMockAlbums);

  const isLoading = featureFlags.useMockAlbums ? false : isAlbumsLoading;

  /**
   * Mock albums are only a mock-mode fallback. With the real list in play an
   * empty response means the artist genuinely has no albums, and that deserves
   * the empty state (issue #425) rather than five stock covers (issue #426:
   * never show sample data as if it were the artist's own).
   */
  const displayAlbums = useMemo(() => {
    if (featureFlags.useMockAlbums) return albums;
    if (!albumsData?.data) return [];
    return albumsData.data.map((album, index) => ({
      id: typeof album.id === "number" ? album.id : index + 1,
      title: album.title,
      artist: album.artistName || album.artist || "Artist",
      type: album.type || "Album",
      image: album.coverArtUrl || albums[index % albums.length].image,
    }));
  }, [albumsData]);

  /**
   * Hydrate from local storage. Runs after mount rather than in the initial
   * state so the server render and the first client render agree — the stored
   * order and the stored visibilities only exist in the browser.
   */
  useEffect(() => {
    try {
      const savedOrder = window.localStorage.getItem(SONG_ORDER_STORAGE_KEY);
      setSongs((current) => {
        const withVisibility = current.map((song) => ({
          ...song,
          visibility: getTrackVisibility(song),
        }));
        if (!savedOrder) return withVisibility;
        const order = JSON.parse(savedOrder) as number[];
        const positions = new Map(order.map((id, index) => [id, index]));
        return [...withVisibility].sort(
          (a, b) =>
            (positions.get(a.id) ?? current.length) - (positions.get(b.id) ?? current.length)
        );
      });
    } catch {
      window.localStorage.removeItem(SONG_ORDER_STORAGE_KEY);
    }
  }, []);

  const persistSongs = (nextSongs: Song[]) => {
    setSongs(nextSongs);
    window.localStorage.setItem(
      SONG_ORDER_STORAGE_KEY,
      JSON.stringify(nextSongs.map((song) => song.id))
    );
  };

  const moveSong = (songId: number, targetId: number) => {
    if (songId === targetId) return;
    const fromIndex = songs.findIndex((song) => song.id === songId);
    const toIndex = songs.findIndex((song) => song.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const nextSongs = [...songs];
    const [movedSong] = nextSongs.splice(fromIndex, 1);
    nextSongs.splice(toIndex, 0, movedSong);
    persistSongs(nextSongs);
    setReorderMessage(`${movedSong.title} moved to position ${toIndex + 1}`);
  };

  const moveSongBy = (songId: number, offset: number) => {
    const index = songs.findIndex((song) => song.id === songId);
    const targetIndex = index + offset;
    if (index < 0 || targetIndex < 0 || targetIndex >= songs.length) return;
    moveSong(songId, songs[targetIndex].id);
  };

  /**
   * Albums offered by the track filter (issue #428): the albums the artist has
   * created plus the albums their tracks already sit in, so selecting an album
   * is always a value the list can answer for — an empty album reports "no
   * tracks in this album yet" instead of silently falling back to everything.
   */
  const albumOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...displayAlbums.map((album) => album.title),
          ...songs.map((song) => song.albumName),
        ])
      ).sort(),
    [displayAlbums, songs]
  );

  /**
   * Search across the artist's own catalog (issue #428). Every whitespace
   * separated word has to match somewhere in the track, so "midnight neon"
   * narrows instead of behaving like a single literal phrase.
   *
   * The visibility filter is applied to the full list first: "What listeners
   * can see" is the catalog rule from `trackVisibilityService`, not a per-row
   * string match, so the artist's list can't drift from what a buyer gets.
   */
  const filteredSongs = useMemo(() => {
    const words = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const inVisibilityScope =
      visibilityFilter === "all"
        ? songs
        : visibilityFilter === "discoverable"
          ? filterCatalog(songs, "visitor")
          : songs.filter((song) => getTrackVisibility(song) === visibilityFilter);
    return inVisibilityScope.filter((song) => {
      const haystack = `${song.title} ${song.albumName} ${song.artist}`.toLowerCase();
      const matchesSearch = words.every((word) => haystack.includes(word));
      const matchesFilter = filterType === "all" || song.albumName === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [songs, searchQuery, filterType, visibilityFilter]);

  const isFiltering =
    searchQuery.trim().length > 0 || filterType !== "all" || visibilityFilter !== "all";

  // One line that says what the list currently holds, so search and filter
  // results are legible at a glance instead of only by counting rows.
  const resultSummary = isFiltering
    ? `${pluralize(filteredSongs.length, "track")} of ${pluralize(songs.length, "track")}`
    : pluralize(songs.length, "track");

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setVisibilityFilter("all");
    setSelectedAlbum(null);
  };

  // A new query or filter invalidates the current page offset, so every search
  // starts from the top of the results.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterType, visibilityFilter]);

  // Deleting the last track of an album leaves the filter pointing at an option
  // that no longer exists, and a <select> with no matching option renders blank.
  useEffect(() => {
    if (filterType !== "all" && !albumOptions.includes(filterType)) setFilterType("all");
  }, [albumOptions, filterType]);

  // Deleting a track can also shrink the catalog below the current page, so the
  // page actually rendered is clamped to the pages that still exist.
  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / TRACKS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const pagedSongs = useMemo(
    () => filteredSongs.slice((currentPage - 1) * TRACKS_PER_PAGE, currentPage * TRACKS_PER_PAGE),
    [filteredSongs, currentPage]
  );

  const selectAlbum = (album: Album | null) => {
    setSelectedAlbum(album);
    onAlbumSelect?.(album);
    setFilterType(album?.title ?? "all");
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmation.songId === null) return;
    persistSongs(songs.filter((song) => song.id !== deleteConfirmation.songId));
    setDeleteConfirmation({ isOpen: false, songId: null });
  };

  return (
    <div className="w-full text-white">
      <section className="mb-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Albums</h2>
          {!isLoading && !isAlbumsError && displayAlbums.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Scroll albums left"
                onClick={() =>
                  scrollContainerRef.current?.scrollBy({ left: -300, behavior: "smooth" })
                }
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#885FA8] hover:bg-[#7A4F98]"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Scroll albums right"
                onClick={() =>
                  scrollContainerRef.current?.scrollBy({ left: 300, behavior: "smooth" })
                }
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#885FA8] hover:bg-[#7A4F98]"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
        {isLoading ? (
          <AlbumSkeletonRow />
        ) : isAlbumsError ? (
          <ErrorState
            title="Unable to load your albums"
            description="Your albums could not be loaded. Check your connection and try again."
            retryLabel="Retry"
            onRetry={() => refetchAlbums()}
          />
        ) : displayAlbums.length === 0 ? (
          <EmptyState
            icon={Disc3}
            title="No albums yet"
            description="Group your tracks into an album to give listeners more to explore."
            ctaLabel="Upload an album"
            ctaHref={UPLOAD_MUSIC_HREF}
          />
        ) : (
          <ErrorBoundary fallbackTitle="Your albums couldn't be displayed">
            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
            >
              {displayAlbums.map((album) => (
                <button
                  type="button"
                  key={album.id}
                  onClick={() => selectAlbum(selectedAlbum?.id === album.id ? null : album)}
                  className={`group w-48 shrink-0 text-center ${selectedAlbum?.id === album.id ? "text-pink-400" : "text-white"}`}
                >
                  <Image
                    src={album.image}
                    alt={album.title}
                    width={192}
                    height={192}
                    className="mb-3 h-48 w-48 rounded-lg object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                  <span className="block truncate font-medium">{album.title}</span>
                  <span className="block truncate text-sm text-gray-400">{album.artist}</span>
                </button>
              ))}
            </div>
          </ErrorBoundary>
        )}
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">My Tracks</h2>
            <p className="mt-1 text-sm text-gray-400">
              Drag tracks to customize their listing order.
            </p>
            <p className="mt-1 text-sm text-gray-400" role="status" aria-live="polite">
              {resultSummary}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="relative block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
                aria-hidden="true"
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tracks"
                aria-label="Search tracks"
                className="w-52 rounded-lg border border-gray-700 bg-[#161616] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-pink-500"
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#161616] px-3 text-sm text-gray-300">
              <Filter size={16} aria-hidden="true" />
              <select
                value={filterType}
                onChange={(event) => {
                  setFilterType(event.target.value);
                  setSelectedAlbum(null);
                }}
                aria-label="Filter tracks by album"
                className="bg-transparent py-2.5 outline-none"
              >
                <option value="all">All albums</option>
                {albumOptions.map((albumTitle) => (
                  <option key={albumTitle} value={albumTitle}>
                    {albumTitle}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#161616] px-3 text-sm text-gray-300">
              <Eye size={16} aria-hidden="true" />
              <select
                value={visibilityFilter}
                onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}
                aria-label="Filter tracks by visibility"
                className="bg-transparent py-2.5 outline-none"
              >
                <option value="all">Any visibility</option>
                <option value="discoverable">What listeners can see</option>
                {TRACK_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} only
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div aria-live="polite" className="sr-only">
          {reorderMessage}
        </div>
        {songs.length === 0 ? (
          <EmptyState
            icon={Music}
            title="No tracks yet"
            description="Upload your first track to start building your catalog on AudioBlocks."
            ctaLabel="Upload your first track"
            ctaHref={UPLOAD_MUSIC_HREF}
          />
        ) : filteredSongs.length === 0 ? (
          <EmptyState
            icon={FolderSearch}
            title="No tracks found"
            description={
              searchQuery.trim()
                ? `No track matches “${searchQuery.trim()}”. Try a different search or album.`
                : "None of your tracks are in this album yet."
            }
            ctaLabel="Clear filters"
            onCta={clearFilters}
          />
        ) : (
          <ErrorBoundary fallbackTitle="Your track list couldn't be displayed">
            <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#111111]">
              <div className="hidden grid-cols-[40px_1fr_150px_120px_100px_100px_100px_200px] items-center gap-4 border-b border-gray-800 px-4 py-3 text-xs uppercase tracking-wide text-gray-500 md:grid">
                <span aria-hidden="true" />
                <span>Track</span>
                <span>Visibility</span>
                <span>Duration</span>
                <span>Likes</span>
                <span>Comments</span>
                <span>Downloads</span>
                <span aria-hidden="true" />
              </div>
              {pagedSongs.map((song, index) => {
                const fullIndex = songs.findIndex((item) => item.id === song.id);
                const isDragging = draggedSongId === song.id;
                const isDropTarget = dropTargetId === song.id && draggedSongId !== song.id;
                return (
                  <div
                    key={song.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggedSongId(song.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(song.id));
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDropTargetId(song.id);
                    }}
                    onDragLeave={() => setDropTargetId(null)}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = Number(event.dataTransfer.getData("text/plain"));
                      moveSong(sourceId, song.id);
                      setDraggedSongId(null);
                      setDropTargetId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedSongId(null);
                      setDropTargetId(null);
                    }}
                    className={`grid grid-cols-[40px_1fr_auto] items-center gap-4 border-b border-gray-800 px-4 py-3 transition-all duration-200 last:border-b-0 md:grid-cols-[40px_1fr_150px_120px_100px_100px_100px_200px] ${isDragging ? "scale-[0.99] opacity-40" : ""} ${isDropTarget ? "border-t-2 border-t-pink-500 bg-pink-500/10" : "hover:bg-white/[0.03]"}`}
                  >
                    <button
                      type="button"
                      draggable={false}
                      aria-label={`Drag ${song.title} to reorder`}
                      title="Drag to reorder"
                      className="flex h-10 w-10 cursor-grab items-center justify-center rounded text-gray-500 hover:bg-white/10 hover:text-white active:cursor-grabbing"
                    >
                      <GripVertical size={20} />
                    </button>
                    <div className="flex min-w-0 items-center gap-3">
                      <Image
                        src={song.thumbnail}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{song.title}</p>
                        <p className="truncate text-sm text-gray-400">
                          {song.artist} · {song.albumName}
                        </p>
                      </div>
                    </div>
                    <select
                      value={song.visibility ?? LEGACY_DEFAULT_VISIBILITY}
                      onChange={(event) =>
                        handleVisibilityChange(song, event.target.value as TrackVisibility)
                      }
                      aria-label={`Visibility of ${song.title}`}
                      title={permissionHint(getTrackVisibility(song))}
                      className="w-full rounded-lg border border-gray-700 bg-[#161616] px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-pink-500"
                    >
                      {TRACK_VISIBILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="hidden text-sm text-gray-400 md:block">
                      <Clock size={14} className="mr-1 inline" />
                      {song.duration}
                    </span>
                    <span className="hidden text-sm text-gray-400 md:block">
                      <Heart size={14} className="mr-1 inline" />
                      {song.likes}
                    </span>
                    <span className="hidden text-sm text-gray-400 md:block">
                      <MessageCircle size={14} className="mr-1 inline" />
                      {song.comments}
                    </span>
                    <span className="hidden text-sm text-gray-400 md:block">
                      <Download size={14} className="mr-1 inline" />
                      {song.downloads}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${song.title} up`}
                        disabled={fullIndex === 0}
                        onClick={() => moveSongBy(song.id, -1)}
                        className="hidden h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white disabled:invisible md:flex"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${song.title} down`}
                        disabled={fullIndex === songs.length - 1}
                        onClick={() => moveSongBy(song.id, 1)}
                        className="hidden h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white disabled:invisible md:flex"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Edit ${song.title}`}
                        onClick={() => setEditingSongId(song.id)}
                        className="flex h-9 w-9 items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Play ${song.title}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-600 hover:bg-pink-500"
                      >
                        <Play size={15} fill="currentColor" />
                      </button>
                      <button
                        type="button"
                        aria-label={`More actions for ${song.title}`}
                        onClick={() => setDeleteConfirmation({ isOpen: true, songId: song.id })}
                        className="flex h-9 w-9 items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                    <div className="col-span-2 flex gap-2 text-xs text-gray-400 md:hidden">
                      <span>{song.duration}</span>
                      <span>·</span>
                      <span>{song.likes} likes</span>
                      <span>·</span>
                      <span>
                        {(currentPage - 1) * TRACKS_PER_PAGE + index + 1} of {filteredSongs.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              page={currentPage}
              pageSize={TRACKS_PER_PAGE}
              totalItems={filteredSongs.length}
              onPageChange={setPage}
              ariaLabel="Track list pages"
              itemNoun="tracks"
            />
          </ErrorBoundary>
        )}
      </section>

      <EditTrackModal
        open={editingSong !== null}
        onOpenChange={(open) => {
          if (!open) setEditingSongId(null);
        }}
        track={
          editingSong
            ? {
                id: editingSong.id,
                title: editingSong.title,
                albumName: editingSong.albumName,
                visibility: editingSong.visibility ?? LEGACY_DEFAULT_VISIBILITY,
              }
            : null
        }
        albumOptions={albumOptions}
        onSave={handleEditSave}
      />

      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, songId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete track"
        message="Are you sure you want to delete this track? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}

export { MyMusicContent };
