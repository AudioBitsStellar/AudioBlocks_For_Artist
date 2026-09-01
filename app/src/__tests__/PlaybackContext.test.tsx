import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  PlaybackProvider,
  usePlayback,
  playbackReducer,
  initialPlaybackState,
} from "@/context/PlaybackContext";
import type { Track } from "@/context/PlaybackContext";

const mockTrack: Track = {
  id: "track-1",
  title: "Test Song",
  artist: "Test Artist",
  src: "/audio/test.mp3",
  coverArtUrl: "https://example.com/cover.jpg",
};

const mockTrack2: Track = {
  id: "track-2",
  title: "Another Song",
  artist: "Another Artist",
  src: "/audio/test2.mp3",
};

// ── Reducer unit tests ───────────────────────────────────────────────────────

describe("playbackReducer — initial state", () => {
  it("has correct default values", () => {
    expect(initialPlaybackState.currentTrack).toBeNull();
    expect(initialPlaybackState.isPlaying).toBe(false);
    expect(initialPlaybackState.volume).toBe(1);
    expect(initialPlaybackState.seekPosition).toBe(0);
    expect(initialPlaybackState.playlist).toHaveLength(0);
    expect(initialPlaybackState.error).toBeNull();
  });
});

describe("playbackReducer — PLAY_TRACK", () => {
  it("sets the current track and starts playback", () => {
    const s = playbackReducer(initialPlaybackState, {
      type: "PLAY_TRACK",
      track: mockTrack,
    });
    expect(s.currentTrack).toEqual(mockTrack);
    expect(s.isPlaying).toBe(true);
    expect(s.seekPosition).toBe(0);
    expect(s.error).toBeNull();
  });

  it("resets seek position when the same track is re-selected", () => {
    const s = playbackReducer(
      { ...initialPlaybackState, currentTrack: mockTrack, seekPosition: 42 },
      { type: "PLAY_TRACK", track: mockTrack }
    );
    expect(s.seekPosition).toBe(0);
  });

  it("clears any existing error on play", () => {
    const s = playbackReducer(
      { ...initialPlaybackState, error: "some error" },
      { type: "PLAY_TRACK", track: mockTrack }
    );
    expect(s.error).toBeNull();
  });
});

describe("playbackReducer — PLAY / PAUSE", () => {
  it("PLAY does nothing when there is no current track", () => {
    const s = playbackReducer(initialPlaybackState, { type: "PLAY" });
    expect(s.isPlaying).toBe(false);
  });

  it("PLAY starts playback when a track is loaded", () => {
    const withTrack = { ...initialPlaybackState, currentTrack: mockTrack, isPlaying: false };
    const s = playbackReducer(withTrack, { type: "PLAY" });
    expect(s.isPlaying).toBe(true);
  });

  it("PAUSE stops playback", () => {
    const playing = { ...initialPlaybackState, currentTrack: mockTrack, isPlaying: true };
    const s = playbackReducer(playing, { type: "PAUSE" });
    expect(s.isPlaying).toBe(false);
  });
});

describe("playbackReducer — SET_VOLUME", () => {
  it("updates volume to a value within [0, 1]", () => {
    const s = playbackReducer(initialPlaybackState, { type: "SET_VOLUME", volume: 0.5 });
    expect(s.volume).toBe(0.5);
  });

  it("clamps volume above 1 down to 1", () => {
    const s = playbackReducer(initialPlaybackState, { type: "SET_VOLUME", volume: 2 });
    expect(s.volume).toBe(1);
  });

  it("clamps volume below 0 up to 0", () => {
    const s = playbackReducer(initialPlaybackState, { type: "SET_VOLUME", volume: -1 });
    expect(s.volume).toBe(0);
  });
});

describe("playbackReducer — SET_SEEK", () => {
  it("updates seek position", () => {
    const s = playbackReducer(initialPlaybackState, { type: "SET_SEEK", position: 30 });
    expect(s.seekPosition).toBe(30);
  });

  it("floors negative seek values to 0", () => {
    const s = playbackReducer(initialPlaybackState, { type: "SET_SEEK", position: -10 });
    expect(s.seekPosition).toBe(0);
  });
});

describe("playbackReducer — SET_PLAYLIST", () => {
  it("replaces the playlist", () => {
    const s = playbackReducer(initialPlaybackState, {
      type: "SET_PLAYLIST",
      playlist: [mockTrack, mockTrack2],
    });
    expect(s.playlist).toHaveLength(2);
    expect(s.playlist[0]).toEqual(mockTrack);
    expect(s.playlist[1]).toEqual(mockTrack2);
  });

  it("accepts an empty playlist", () => {
    const withTracks = { ...initialPlaybackState, playlist: [mockTrack] };
    const s = playbackReducer(withTracks, { type: "SET_PLAYLIST", playlist: [] });
    expect(s.playlist).toHaveLength(0);
  });
});

describe("playbackReducer — NEXT_TRACK / PREV_TRACK", () => {
  const withPlaylist = {
    ...initialPlaybackState,
    playlist: [mockTrack, mockTrack2],
    currentTrack: mockTrack,
  };

  it("NEXT_TRACK advances to the next track", () => {
    const s = playbackReducer(withPlaylist, { type: "NEXT_TRACK" });
    expect(s.currentTrack).toEqual(mockTrack2);
    expect(s.isPlaying).toBe(true);
    expect(s.seekPosition).toBe(0);
  });

  it("NEXT_TRACK is a no-op at the end of the playlist", () => {
    const atEnd = { ...withPlaylist, currentTrack: mockTrack2 };
    const s = playbackReducer(atEnd, { type: "NEXT_TRACK" });
    expect(s.currentTrack).toEqual(mockTrack2);
  });

  it("PREV_TRACK goes to the previous track", () => {
    const atSecond = { ...withPlaylist, currentTrack: mockTrack2 };
    const s = playbackReducer(atSecond, { type: "PREV_TRACK" });
    expect(s.currentTrack).toEqual(mockTrack);
    expect(s.isPlaying).toBe(true);
  });

  it("PREV_TRACK is a no-op at the start of the playlist", () => {
    const s = playbackReducer(withPlaylist, { type: "PREV_TRACK" });
    expect(s.currentTrack).toEqual(mockTrack);
  });

  it("NEXT_TRACK and PREV_TRACK are no-ops on an empty playlist", () => {
    const s1 = playbackReducer(initialPlaybackState, { type: "NEXT_TRACK" });
    expect(s1).toEqual(initialPlaybackState);
    const s2 = playbackReducer(initialPlaybackState, { type: "PREV_TRACK" });
    expect(s2).toEqual(initialPlaybackState);
  });
});

describe("playbackReducer — error handling", () => {
  it("SET_ERROR records the error and stops playback", () => {
    const playing = { ...initialPlaybackState, isPlaying: true };
    const s = playbackReducer(playing, { type: "SET_ERROR", error: "Failed to load audio" });
    expect(s.error).toBe("Failed to load audio");
    expect(s.isPlaying).toBe(false);
  });

  it("CLEAR_ERROR removes the error", () => {
    const withError = { ...initialPlaybackState, error: "some error" };
    const s = playbackReducer(withError, { type: "CLEAR_ERROR" });
    expect(s.error).toBeNull();
  });
});

// ── Provider + consumer hook integration tests ───────────────────────────────

function TestConsumer() {
  const { state, dispatch } = usePlayback();
  return (
    <div>
      <span data-testid="is-playing">{String(state.isPlaying)}</span>
      <span data-testid="track-title">{state.currentTrack?.title ?? "none"}</span>
      <span data-testid="volume">{state.volume}</span>
      <span data-testid="error">{state.error ?? "none"}</span>
      <span data-testid="seek">{state.seekPosition}</span>
      <button onClick={() => dispatch({ type: "PLAY_TRACK", track: mockTrack })}>play</button>
      <button onClick={() => dispatch({ type: "PAUSE" })}>pause</button>
      <button onClick={() => dispatch({ type: "SET_VOLUME", volume: 0.5 })}>volume</button>
      <button onClick={() => dispatch({ type: "SET_SEEK", position: 60 })}>seek</button>
      <button onClick={() => dispatch({ type: "SET_ERROR", error: "Network error" })}>error</button>
      <button onClick={() => dispatch({ type: "CLEAR_ERROR" })}>clear-error</button>
    </div>
  );
}

describe("PlaybackProvider + usePlayback hook", () => {
  it("exposes initial state to consumers", () => {
    render(
      <PlaybackProvider>
        <TestConsumer />
      </PlaybackProvider>
    );
    expect(screen.getByTestId("is-playing").textContent).toBe("false");
    expect(screen.getByTestId("track-title").textContent).toBe("none");
    expect(screen.getByTestId("volume").textContent).toBe("1");
    expect(screen.getByTestId("error").textContent).toBe("none");
  });

  it("PLAY_TRACK updates consumer state", async () => {
    render(
      <PlaybackProvider>
        <TestConsumer />
      </PlaybackProvider>
    );
    await act(async () => {
      screen.getByText("play").click();
    });
    expect(screen.getByTestId("is-playing").textContent).toBe("true");
    expect(screen.getByTestId("track-title").textContent).toBe("Test Song");
  });

  it("PAUSE stops playback via consumer", async () => {
    render(
      <PlaybackProvider>
        <TestConsumer />
      </PlaybackProvider>
    );
    await act(async () => {
      screen.getByText("play").click();
    });
    await act(async () => {
      screen.getByText("pause").click();
    });
    expect(screen.getByTestId("is-playing").textContent).toBe("false");
    expect(screen.getByTestId("track-title").textContent).toBe("Test Song");
  });

  it("SET_VOLUME updates volume via consumer", async () => {
    render(
      <PlaybackProvider>
        <TestConsumer />
      </PlaybackProvider>
    );
    await act(async () => {
      screen.getByText("volume").click();
    });
    expect(screen.getByTestId("volume").textContent).toBe("0.5");
  });

  it("SET_SEEK updates seek position via consumer", async () => {
    render(
      <PlaybackProvider>
        <TestConsumer />
      </PlaybackProvider>
    );
    await act(async () => {
      screen.getByText("seek").click();
    });
    expect(screen.getByTestId("seek").textContent).toBe("60");
  });

  it("SET_ERROR surfaces error and stops playback", async () => {
    render(
      <PlaybackProvider>
        <TestConsumer />
      </PlaybackProvider>
    );
    await act(async () => {
      screen.getByText("play").click();
    });
    await act(async () => {
      screen.getByText("error").click();
    });
    expect(screen.getByTestId("error").textContent).toBe("Network error");
    expect(screen.getByTestId("is-playing").textContent).toBe("false");
  });

  it("CLEAR_ERROR removes the error", async () => {
    render(
      <PlaybackProvider>
        <TestConsumer />
      </PlaybackProvider>
    );
    await act(async () => {
      screen.getByText("error").click();
    });
    await act(async () => {
      screen.getByText("clear-error").click();
    });
    expect(screen.getByTestId("error").textContent).toBe("none");
  });

  it("throws when usePlayback is called outside PlaybackProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "usePlayback must be used within a PlaybackProvider"
    );
    spy.mockRestore();
  });
});

// ── Crossfade transitions ────────────────────────────────────────────────────

describe("playbackReducer — crossfade", () => {
  it("has sane crossfade defaults in the initial state", () => {
    expect(initialPlaybackState.crossfadeEnabled).toBe(false);
    expect(initialPlaybackState.crossfadeDuration).toBe(3);
    expect(initialPlaybackState.isCrossfading).toBe(false);
    expect(initialPlaybackState.fadeOutVolume).toBe(1);
    expect(initialPlaybackState.fadeInVolume).toBe(0);
  });

  it("SET_CROSSFADE_ENABLED toggles the flag", () => {
    const on = playbackReducer(initialPlaybackState, {
      type: "SET_CROSSFADE_ENABLED",
      enabled: true,
    });
    expect(on.crossfadeEnabled).toBe(true);
    const off = playbackReducer(on, { type: "SET_CROSSFADE_ENABLED", enabled: false });
    expect(off.crossfadeEnabled).toBe(false);
  });

  it("SET_CROSSFADE_DURATION clamps to [0, 12] seconds", () => {
    expect(
      playbackReducer(initialPlaybackState, { type: "SET_CROSSFADE_DURATION", duration: 6 })
        .crossfadeDuration
    ).toBe(6);
    expect(
      playbackReducer(initialPlaybackState, { type: "SET_CROSSFADE_DURATION", duration: 99 })
        .crossfadeDuration
    ).toBe(12);
    expect(
      playbackReducer(initialPlaybackState, { type: "SET_CROSSFADE_DURATION", duration: -5 })
        .crossfadeDuration
    ).toBe(0);
  });

  it("START_CROSSFADE marks a transition in progress and resets the fade volumes", () => {
    const s = playbackReducer(
      { ...initialPlaybackState, fadeOutVolume: 0.2, fadeInVolume: 0.8 },
      { type: "START_CROSSFADE" }
    );
    expect(s.isCrossfading).toBe(true);
    expect(s.fadeOutVolume).toBe(1);
    expect(s.fadeInVolume).toBe(0);
  });

  it("UPDATE_CROSSFADE clamps both fade volumes to [0, 1]", () => {
    const s = playbackReducer(
      { ...initialPlaybackState, isCrossfading: true },
      { type: "UPDATE_CROSSFADE", fadeOutVolume: -0.5, fadeInVolume: 1.5 }
    );
    expect(s.fadeOutVolume).toBe(0);
    expect(s.fadeInVolume).toBe(1);
  });

  it("END_CROSSFADE swaps in the incoming track and clears the transition", () => {
    const s = playbackReducer(
      {
        ...initialPlaybackState,
        currentTrack: mockTrack,
        isCrossfading: true,
        fadeOutVolume: 0.1,
        fadeInVolume: 0.9,
        seekPosition: 55,
      },
      { type: "END_CROSSFADE", track: mockTrack2 }
    );
    expect(s.currentTrack).toEqual(mockTrack2);
    expect(s.isCrossfading).toBe(false);
    expect(s.fadeOutVolume).toBe(1);
    expect(s.fadeInVolume).toBe(0);
    expect(s.seekPosition).toBe(0);
  });
});

describe("playbackReducer — unknown action", () => {
  it("returns the same state reference for an unrecognised action", () => {
    const s = playbackReducer(initialPlaybackState, {
      // @ts-expect-error — exercising the default branch
      type: "NOPE",
    });
    expect(s).toBe(initialPlaybackState);
  });
});

// The app tree mounts <PlaybackProvider> in `app/src/context/provider.tsx`
// (alongside QueryClientProvider / StellarNetworkProvider), so the audio
// components that call usePlayback() — SeekBar, VolumeSlider, LyricsDisplay,
// useCrossfade — resolve a context value instead of throwing.
