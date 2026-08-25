export interface AudioMetadata {
  durationSec: number;
  sampleRateHz: number;
  bitrateKbps: number;
}

/**
 * Decodes just enough of the file to read duration/sample rate, then
 * estimates bitrate from file size — good enough for display purposes,
 * not a substitute for server-side transcoded metadata.
 */
export async function extractAudioMetadata(file: File): Promise<AudioMetadata | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    await ctx.close();

    const durationSec = buffer.duration;
    const bitrateKbps = durationSec > 0 ? Math.round((file.size * 8) / durationSec / 1000) : 0;

    return {
      durationSec,
      sampleRateHz: buffer.sampleRate,
      bitrateKbps,
    };
  } catch {
    return null;
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
