"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";
import {
  type Track,
  type PlaybackState,
  type PlaybackAction,
  playbackReducer,
  initialPlaybackState,
} from "./playbackReducer";

// Re-export types for backward compatibility
export type { Track, PlaybackState, PlaybackAction };
export { initialPlaybackState, playbackReducer };

interface PlaybackContextValue {
  state: PlaybackState;
  dispatch: React.Dispatch<PlaybackAction>;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playbackReducer, initialPlaybackState);
  return (
    <PlaybackContext.Provider value={{ state, dispatch }}>{children}</PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error("usePlayback must be used within a PlaybackProvider");
  }
  return ctx;
}

export default PlaybackContext;
