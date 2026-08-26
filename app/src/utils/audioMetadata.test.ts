import { calculatePeakGain } from "./audioMetadata";
function mockBuffer(samples: number[]): AudioBuffer {
  return {
    numberOfChannels: 1,
    getChannelData: () => Float32Array.from(samples),
  } as unknown as AudioBuffer;
}
describe("calculatePeakGain", () => {
  it("returns 1 for silent audio", () => {
    expect(calculatePeakGain(mockBuffer([0, 0, 0]))).toBe(1);
  });
  it("computes gain to reach target peak without clipping", () => {
    const gain = calculatePeakGain(mockBuffer([0.2, -0.4, 0.1]), 0.8);
    expect(gain).toBeCloseTo(2, 5);
  });
  it("never boosts gain above 1x for already-loud audio", () => {
    const gain = calculatePeakGain(mockBuffer([0.95, -0.5]), 0.891);
    expect(gain).toBeLessThanOrEqual(1);
  });
});