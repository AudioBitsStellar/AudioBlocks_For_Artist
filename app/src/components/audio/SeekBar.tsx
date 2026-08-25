'use client';

import { usePlayback } from '@/context/PlaybackContext';
import { useRef, useCallback } from 'react';

export function SeekBar() {
  const { state, dispatch } = usePlayback();
  const barRef = useRef<HTMLDivElement>(null);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const position = Math.round(percent * 100);
    dispatch({ type: 'SET_SEEK', position });
  }, [dispatch]);

  return (
    <div
      ref={barRef}
      className="w-full h-2 bg-[#333] rounded-full overflow-hidden cursor-pointer"
      onMouseDown={handleSeek}
    >
      <div
        className={`h-full bg-[#D2045B] rounded-full transition-all duration-300 absolute top-0 bottom-0`}
        style={{ width: state.isPlaying ? '100%' : '0%' }}
      />
    </div>
  );
}