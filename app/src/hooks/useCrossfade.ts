"use client";

import { useCallback, useRef, useEffect } from "react";
import { usePlayback } from "@/context/PlaybackContext";

/**
 * Hook that manages crossfade transitions between tracks.
 * When crossfade is enabled and a track nears its end, it fades out the
 * current track while fading in the next one.
 */
export function useCrossfade() {
  const { state, dispatch } = usePlayback();
  const { crossfadeEnabled, crossfadeDuration, isCrossfading, playlist, currentTrack } = state;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);

  const getNextTrack = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return null;
    const idx = playlist.findIndex((t) => t.id === currentTrack.id);
    return playlist[idx + 1] ?? null;
  }, [currentTrack, playlist]);

  const startCrossfade = useCallback(() => {
    if (isCrossfading || !crossfadeEnabled || crossfadeDuration <= 0) return;
    const nextTrack = getNextTrack();
    if (!nextTrack) return;

    dispatch({ type: "START_CROSSFADE" });
    progressRef.current = 0;

    const stepMs = 50;
    const totalSteps = (crossfadeDuration * 1000) / stepMs;

    intervalRef.current = setInterval(() => {
      progressRef.current += 1;
      const t = Math.min(progressRef.current / totalSteps, 1);

      // Linear crossfade: fade out current, fade in next
      const fadeOut = 1 - t;
      const fadeIn = t;

      dispatch({ type: "UPDATE_CROSSFADE", fadeOutVolume: fadeOut, fadeInVolume: fadeIn });

      if (t >= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        dispatch({ type: "END_CROSSFADE", track: nextTrack });
      }
    }, stepMs);
  }, [isCrossfading, crossfadeEnabled, crossfadeDuration, getNextTrack, dispatch]);

  const cancelCrossfade = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    progressRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    crossfadeEnabled,
    crossfadeDuration,
    isCrossfading,
    fadeOutVolume: state.fadeOutVolume,
    fadeInVolume: state.fadeInVolume,
    startCrossfade,
    cancelCrossfade,
    setCrossfadeEnabled: (enabled: boolean) => dispatch({ type: "SET_CROSSFADE_ENABLED", enabled }),
    setCrossfadeDuration: (duration: number) => dispatch({ type: "SET_CROSSFADE_DURATION", duration }),
  };
}
