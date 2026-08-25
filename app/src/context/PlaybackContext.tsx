'use client';

import { createContext, useContext, useReducer, type ReactNode } from 'react';

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  coverArtUrl?: string;
}

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  /** Volume in [0, 1]. */
  volume: number;
  /** Seek position in seconds. */
  seekPosition: number;
  playlist: Track[];
  error: string | null;
}

export type PlaybackAction =
  | { type: 'PLAY_TRACK'; track: Track }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_SEEK'; position: number }
  | { type: 'SET_PLAYLIST'; playlist: Track[] }
  | { type: 'NEXT_TRACK' }
  | { type: 'PREV_TRACK' }
  | { type: 'ADD_TO_QUEUE'; track: Track }
  | { type: 'SET_QUEUE'; queue: Track[] }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

export const initialPlaybackState: PlaybackState = {
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  seekPosition: 0,
  playlist: [],
  queue: [],
  error: null,
};

export function playbackReducer(
  state: PlaybackState,
  action: PlaybackAction,
): PlaybackState {
  switch (action.type) {
    case 'PLAY_TRACK':
      return {
        ...state,
        currentTrack: action.track,
        isPlaying: true,
        seekPosition: 0,
        error: null,
      };

    case 'PLAY':
      return state.currentTrack ? { ...state, isPlaying: true } : state;

    case 'PAUSE':
      return { ...state, isPlaying: false };

    case 'SET_VOLUME':
      return { ...state, volume: Math.max(0, Math.min(1, action.volume)) };

    case 'SET_SEEK':
      return { ...state, seekPosition: Math.max(0, action.position) };

    case 'SET_PLAYLIST':
      return { ...state, playlist: action.playlist };

    case 'NEXT_TRACK': {
      const idx = state.playlist.findIndex((t) => t.id === state.currentTrack?.id);
      const next = state.playlist[idx + 1];
      return next
        ? { ...state, currentTrack: next, isPlaying: true, seekPosition: 0 }
        : state;
    }

    case 'PREV_TRACK': {
      const idx = state.playlist.findIndex((t) => t.id === state.currentTrack?.id);
      const prev = state.playlist[idx - 1];
      return prev
        ? { ...state, currentTrack: prev, isPlaying: true, seekPosition: 0 }
        : state;
    }

    case 'ADD_TO_QUEUE':
      return {
        ...state,
        queue: [...state.queue, action.track],
      };

    case 'SET_QUEUE':
      return {
        ...state,
        queue: action.queue,
      };

    case 'CLEAR_QUEUE':
      return {
        ...state,
        queue: [],
      };

    case 'SET_ERROR':
      return { ...state, error: action.error, isPlaying: false };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

interface PlaybackContextValue {
  state: PlaybackState;
  dispatch: React.Dispatch<PlaybackAction>;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playbackReducer, initialPlaybackState);
  return (
    <PlaybackContext.Provider value={{ state, dispatch }}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return ctx;
}

export default PlaybackContext;
