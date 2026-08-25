'use client';

import { usePlayback } from '@/context/PlaybackContext';
import { useMultilingualMusic } from '@/hooks/useMultilingualMusic';
import { useEffect } from 'react';

type LyricsLine = { text: string; startTime: number; endTime: number };

export function LyricsDisplay({ lyrics }: { lyrics: LyricsLine[] }) {
  const { state } = usePlayback();
  const { locale, getLocalizedText } = useMultilingualMusic();

  const formattedLyrics = lyrics.map((line) => ({
    text: getLocalizedText(line.text),
    startTime: line.startTime,
    endTime: line.endTime,
  }));

  const [currentLineIndex, setCurrentLineIndex] = React.useState(0);

  useEffect(() => {
    if (!formattedLyrics.length) return;

    const handleTimeUpdate = () => {
      const duration =
        formattedLyrics[formattedLyrics.length - 1]?.endTime || 0;
      const progress = state.isPlaying ? state.seekPosition % duration : 0;

      let foundIndex = 0;
      for (let i = 0; i < formattedLyrics.length; i++) {
        const line = formattedLyrics[i];
        if (progress >= line.startTime && progress < line.endTime) {
          foundIndex = i;
          break;
        }
      }
      setCurrentLineIndex(foundIndex);
    };

    if (state.isPlaying) {
      const audio = document.querySelector('audio');
      if (audio) {
        audio.addEventListener('timeupdate', handleTimeUpdate);
      }
    }
    return () => {
      const audio = document.querySelector('audio');
      if (audio) {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [formattedLyrics, state.isPlaying, state.seekPosition]);

  const currentLine = formattedLyrics[currentLineIndex];

  return (
    <div className="text-white space-y-1">
      {formattedLyrics.map((line, index) => (
        <div
          key={index}
          className={`${
            index === currentLineIndex
              ? 'text-[#D2045B] font-medium'
              : 'text-[#6F6F6F]'
          } transition-colors`}>
          {line.text}
        </div>
      ))}
    </div>
  );
}