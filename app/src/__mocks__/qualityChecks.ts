import { runQualityCheck, type QualityCheckResult } from "@/services/qualityCheckService";

const HOUR = 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/** A clean master, and an older failing report the artist already opened. */
export const MOCK_QUALITY_CHECKS: QualityCheckResult[] = [
  runQualityCheck({
    songId: "song_1",
    songTitle: "Midnight Drive",
    checkedAt: ago(40 * 60 * 1000),
    analysis: {
      metadata: { durationSec: 214, sampleRateHz: 44100, bitrateKbps: 320 },
      peakAmplitude: 0.94,
      integratedLufs: -13.4,
      channelCount: 2,
      silentRatio: 0.02,
    },
  }),
  {
    ...runQualityCheck({
      songId: "song_7",
      songTitle: "Static Bloom",
      checkedAt: ago(26 * HOUR),
      analysis: {
        metadata: { durationSec: 187, sampleRateHz: 44100, bitrateKbps: 320 },
        peakAmplitude: 1.002,
        integratedLufs: -7.8,
        channelCount: 2,
        silentRatio: 0.04,
      },
    }),
    seen: true,
  },
];
