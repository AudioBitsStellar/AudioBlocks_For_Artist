/**
 * IPFS metadata viewer component (#287).
 *
 * Displays metadata stored on IPFS for minted songs/artists.
 * Fetches the JSON from an IPFS gateway and renders it in a
 * structured, user-friendly format.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Common metadata fields across songs and artists. */
interface BaseMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  animation_url?: string;
}

/** Song-specific metadata fields. */
interface SongMetadata extends BaseMetadata {
  artist?: string;
  album?: string;
  genre?: string;
  duration?: number;
  release_date?: string;
  isrc?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/** IPFS metadata viewer props. */
export interface IPFSMetadataViewerProps {
  /** The IPFS CID or full URL to the metadata JSON. */
  cid: string;
  /** Optional title to display above the metadata. */
  title?: string;
  /** Whether to show the raw JSON toggle. */
  showRawJson?: boolean;
  /** Optional callback when fetch fails. */
  onError?: (error: string) => void;
  /** CSS class for the container. */
  className?: string;
}

/** Fetch state for the metadata. */
type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: SongMetadata; rawJson: string }
  | { status: "error"; message: string };

// ── IPFS gateway resolution ───────────────────────────────────────────────────

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs",
  "https://gateway.pinata.cloud/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
];

function resolveIpfsUrl(cid: string): string {
  // Already a full URL
  if (cid.startsWith("http://") || cid.startsWith("https://")) {
    return cid;
  }
  // ipfs:// protocol
  if (cid.startsWith("ipfs://")) {
    return cid.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  // Raw CID
  return `${IPFS_GATEWAYS[0]}/${cid}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Displays IPFS-stored metadata for a minted song or artist.
 *
 * Fetches the JSON from an IPFS gateway and renders the metadata
 * in a clean, structured format with an optional raw JSON view.
 *
 * @example
 * <IPFSMetadataViewer cid="QmXxx..." title="My Song" />
 */
export function IPFSMetadataViewer({
  cid,
  title,
  showRawJson = true,
  onError,
  className = "",
}: IPFSMetadataViewerProps) {
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [showRaw, setShowRaw] = useState(false);

  const fetchMetadata = useCallback(async () => {
    if (!cid) {
      setState({ status: "error", message: "No IPFS CID provided" });
      return;
    }

    setState({ status: "loading" });

    const url = resolveIpfsUrl(cid);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
      }

      const data: SongMetadata = await response.json();
      const rawJson = JSON.stringify(data, null, 2);
      setState({ status: "success", data, rawJson });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch IPFS metadata";
      setState({ status: "error", message });
      onError?.(message);
    }
  }, [cid, onError]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className={`rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <span className="text-sm text-gray-500">Loading IPFS metadata…</span>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (state.status === "error") {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`}>
        <h3 className="text-sm font-medium text-red-800">Failed to Load Metadata</h3>
        <p className="mt-1 text-sm text-red-600">{state.message}</p>
        <button
          onClick={fetchMetadata}
          className="mt-3 text-sm font-medium text-red-700 underline hover:text-red-900"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  const { data } = state;

  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {data.name && !title && (
              <h3 className="text-lg font-semibold text-gray-900">{data.name}</h3>
            )}
            <p className="mt-1 text-xs text-gray-400" title={cid}>
              IPFS: {cid.length > 20 ? `${cid.slice(0, 10)}…${cid.slice(-8)}` : cid}
            </p>
          </div>
          {showRawJson && (
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              {showRaw ? "Formatted" : "Raw JSON"}
            </button>
          )}
        </div>
      </div>

      {/* Raw JSON view */}
      {showRaw ? (
        <div className="p-6">
          <pre className="overflow-x-auto rounded-md bg-gray-50 p-4 text-xs text-gray-700">
            {state.rawJson}
          </pre>
        </div>
      ) : (
        /* Formatted view */
        <div className="p-6 space-y-4">
          {/* Cover image */}
          {data.image && (
            <div className="overflow-hidden rounded-md">
              <img
                src={data.image}
                alt={data.name || "Cover art"}
                className="h-48 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          {/* Description */}
          {data.description && (
            <div>
              <h4 className="text-xs font-medium uppercase text-gray-400">Description</h4>
              <p className="mt-1 text-sm text-gray-700">{data.description}</p>
            </div>
          )}

          {/* Key fields */}
          <div className="grid grid-cols-2 gap-4">
            {data.artist && <MetadataField label="Artist" value={data.artist} />}
            {data.album && <MetadataField label="Album" value={data.album} />}
            {data.genre && <MetadataField label="Genre" value={data.genre} />}
            {data.duration && (
              <MetadataField
                label="Duration"
                value={`${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, "0")}`}
              />
            )}
            {data.release_date && <MetadataField label="Release Date" value={data.release_date} />}
            {data.isrc && <MetadataField label="ISRC" value={data.isrc} />}
          </div>

          {/* Attributes */}
          {data.attributes && data.attributes.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase text-gray-400">Attributes</h4>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {data.attributes.map((attr, i) => (
                  <div
                    key={`${attr.trait_type}-${i}`}
                    className="rounded-md bg-gray-50 px-3 py-2"
                  >
                    <span className="text-xs text-gray-400">{attr.trait_type}</span>
                    <p className="text-sm font-medium text-gray-700">{String(attr.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External link */}
          {data.external_url && (
            <a
              href={data.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View on IPFS ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper sub-component ──────────────────────────────────────────────────────

function MetadataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase text-gray-400">{label}</h4>
      <p className="mt-1 text-sm text-gray-700">{value}</p>
    </div>
  );
}

export default IPFSMetadataViewer;
