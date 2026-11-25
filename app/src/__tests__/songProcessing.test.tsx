// Song processing after upload (#543).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

const { mockGet, mockToast } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/api/axios", () => ({ createApiClient: vi.fn().mockResolvedValue({ get: mockGet }) }));
vi.mock("sonner", () => ({ toast: mockToast }));
vi.mock("@/components/common/wallet/MintSongButton", () => ({
  default: ({ songId }: { songId: string }) => <button type="button">Mint {songId}</button>,
}));
vi.mock("@/components/common/wallet/TransferSongButton", () => ({
  default: () => <button type="button">Transfer</button>,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SongProcessingProvider, useSongProcessing } from "@/context/SongProcessingContext";
import ProcessingTracksPanel from "@/components/musicUpload/ProcessingTracksPanel";
import UploadedSongActions from "@/components/musicUpload/UploadedSongActions";
import {
  describeProcessingError,
  FIRST_POLL_DELAY_MS,
  nextPollDelay,
  POLL_WINDOW_MS,
  PROCESSING_STORAGE_KEY,
  readTrackedSongs,
} from "@/services/songProcessingService";
import { SONG_ENDPOINTS } from "@/api/api-endpoint";

const status = (value: string, errorReason: string | null = null) => ({
  data: { success: true, data: { id: "song-1", status: value, errorReason } },
});

function Tracker({
  songId = "song-1",
  title = "Lagos Nights",
}: {
  songId?: string;
  title?: string;
}) {
  const { track } = useSongProcessing();
  return (
    <button type="button" onClick={() => track(songId, title)}>
      track
    </button>
  );
}

function renderApp() {
  return render(
    <SongProcessingProvider>
      <Tracker />
      <ProcessingTracksPanel />
      <UploadedSongActions songId="song-1" />
    </SongProcessingProvider>
  );
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  mockGet.mockReset();
  mockToast.success.mockReset();
  mockToast.error.mockReset();
  mockGet.mockResolvedValue(status("processing"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("polling schedule", () => {
  it("starts at 5 s and backs off by half again each time, up to 30 s", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(nextPollDelay)).toEqual([
      5000, 7500, 11250, 16875, 25313, 30000, 30000,
    ]);
  });
});

describe("describeProcessingError", () => {
  it.each([
    ["ffmpeg exited with code 1", /couldn't convert your audio/],
    ["IPFS pin failed: 504", /couldn't store the track's details/],
    ["MALWARE_DETECTED", /flagged by our security scan/],
    ["Job timed out after 600s", /took too long/],
    [null, /Something went wrong/],
  ])("explains %s in plain language", (reason, expected) => {
    expect(describeProcessingError(reason)).toMatch(expected);
  });
});

describe("SongProcessingProvider", () => {
  it("shows a freshly uploaded track as processing, with minting locked", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "track" }));

    expect(screen.getByText(/Processing… We're converting it for streaming/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mint on-chain" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^Mint song-1/ })).not.toBeInTheDocument();
  });

  it("polls the song, then unlocks minting and toasts when it is ready", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "track" }));
    mockGet.mockResolvedValueOnce(status("processing")).mockResolvedValueOnce(status("ready"));

    await advance(FIRST_POLL_DELAY_MS);
    expect(mockGet).toHaveBeenCalledWith(SONG_ENDPOINTS.UPDATE("song-1"));
    expect(screen.queryByRole("button", { name: "Mint song-1" })).not.toBeInTheDocument();

    await advance(nextPollDelay(1));

    expect(mockToast.success).toHaveBeenCalledWith('Your track "Lagos Nights" is ready');
    expect(screen.getByRole("button", { name: "Mint song-1" })).toBeInTheDocument();
    expect(screen.getByText(/Ready — you can now mint and share it/)).toBeInTheDocument();
  });

  it("stops polling once the song settles", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "track" }));
    mockGet.mockResolvedValue(status("ready"));

    await advance(FIRST_POLL_DELAY_MS);
    await advance(5 * 60_000);

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("explains a failure and offers a re-upload", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "track" }));
    mockGet.mockResolvedValue(status("failed", "ffmpeg exited with code 1"));

    await advance(FIRST_POLL_DELAY_MS);

    expect(mockToast.error).toHaveBeenCalledWith('"Lagos Nights" couldn\'t be processed');
    expect(screen.getAllByText(/couldn't convert your audio for streaming/)).toHaveLength(2);
    expect(screen.getByText("Details for support: ffmpeg exited with code 1")).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "Re-upload" })) {
      expect(link).toHaveAttribute("href", "/dashboard/upload-music");
    }
    expect(screen.queryByRole("button", { name: /Mint/ })).not.toBeInTheDocument();
  });

  it("treats a failed status check as 'still processing' and keeps polling", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "track" }));
    mockGet
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(status("ready"));

    await advance(FIRST_POLL_DELAY_MS);
    expect(mockToast.error).not.toHaveBeenCalled();
    await advance(nextPollDelay(1));

    expect(mockToast.success).toHaveBeenCalled();
  });

  it("gives up after about ten minutes and offers to check again", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "track" }));

    await advance(POLL_WINDOW_MS + 60_000);

    expect(screen.getAllByText(/taking longer than usual/i)).toHaveLength(2);
    const calls = mockGet.mock.calls.length;
    await advance(10 * 60_000);
    expect(mockGet).toHaveBeenCalledTimes(calls);

    mockGet.mockResolvedValue(status("ready"));
    fireEvent.click(screen.getAllByRole("button", { name: "Check again" })[0]);
    await advance(FIRST_POLL_DELAY_MS);
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("keeps watching after a page reload", async () => {
    const first = renderApp();
    fireEvent.click(screen.getByRole("button", { name: "track" }));
    await advance(0);
    expect(readTrackedSongs()).toEqual([
      expect.objectContaining({ songId: "song-1", title: "Lagos Nights", status: "processing" }),
    ]);
    first.unmount();
    mockGet.mockClear();

    mockGet.mockResolvedValue(status("ready"));
    renderApp();
    expect(screen.getByText(/Processing… We're converting it/)).toBeInTheDocument();
    await advance(FIRST_POLL_DELAY_MS);

    expect(mockGet).toHaveBeenCalledWith(SONG_ENDPOINTS.UPDATE("song-1"));
    expect(screen.getByRole("button", { name: "Mint song-1" })).toBeInTheDocument();
  });

  it("drops a dismissed track from the list and from storage", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "track" }));
    mockGet.mockResolvedValue(status("ready"));
    await advance(FIRST_POLL_DELAY_MS);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Lagos Nights" }));
    await advance(0);

    expect(screen.queryByRole("region", { name: "Recent uploads" })).not.toBeInTheDocument();
    expect(localStorage.getItem(PROCESSING_STORAGE_KEY)).toBeNull();
  });

  it("ignores malformed stored entries", () => {
    localStorage.setItem(
      PROCESSING_STORAGE_KEY,
      JSON.stringify([
        { songId: 1 },
        { songId: "ok", title: "T", startedAt: 1, status: "processing" },
        "x",
      ])
    );
    expect(readTrackedSongs().map((song) => song.songId)).toEqual(["ok"]);
    localStorage.setItem(PROCESSING_STORAGE_KEY, "{not json");
    expect(readTrackedSongs()).toEqual([]);
  });
});

describe("outside the provider", () => {
  it("keeps minting locked rather than crashing", () => {
    render(<UploadedSongActions songId="song-9" />);
    expect(screen.getByRole("button", { name: "Mint on-chain" })).toBeDisabled();
  });
});
