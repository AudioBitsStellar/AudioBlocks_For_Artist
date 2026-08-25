'use client';

import { usePlayback } from '@/context/PlaybackContext';
import { useRef, useCallback } from 'react';

export function VolumeSlider() {
  const { state, dispatch } = usePlayback();
  const barRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const volume = Math.max(0, Math.min(1, x / rect.width));
    dispatch({ type: 'SET_VOLUME', volume });
  }, [dispatch]);

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(state.volume * 100)}
      className="w-full h-2 bg-[#333] rounded-full overflow-hidden cursor-pointer relative"
      onMouseDown={handleChange}
    >
      <div
        className="h-full bg-[#D2045B] rounded-full transition-all duration-150 absolute top-0 bottom-0 left-0"
        style={{ width: `${state.volume * 100}%` }}
      />
    </div>
  );
}
