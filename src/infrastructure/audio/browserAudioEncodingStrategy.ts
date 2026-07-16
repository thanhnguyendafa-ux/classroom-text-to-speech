export interface AudioQualityMetrics { peak: number; rms: number; clippingRatio: number; duration: number; isLikelyClipped: boolean; }
export interface EncodedCapturedAudio { blob: Blob; metrics: AudioQualityMetrics; sampleRate: number; }
export function encodeCapturedAudio(buffer: Pick<AudioBuffer, 'length' | 'numberOfChannels' | 'getChannelData' | 'sampleRate' | 'duration'>, encode: (pcm: Int16Array, sampleRate: number, bitrate: number) => Blob): EncodedCapturedAudio {
  const left = buffer.getChannelData(0); const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null; const pcm = new Int16Array(buffer.length); let peak = 0; let sumSquares = 0; let clippingCount = 0;
  for (let index = 0; index < buffer.length; index += 1) { const sample = Math.max(-1, Math.min(1, right ? (left[index] + right[index]) / 2 : left[index])); pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff; const absolute = Math.abs(sample); peak = Math.max(peak, absolute); sumSquares += sample * sample; if (absolute > 0.98) clippingCount += 1; }
  const rms = buffer.length ? Math.sqrt(sumSquares / buffer.length) : 0; const clippingRatio = buffer.length ? clippingCount / buffer.length : 0;
  return { blob: encode(pcm, buffer.sampleRate, 128), sampleRate: buffer.sampleRate, metrics: { peak, rms, clippingRatio, duration: buffer.duration, isLikelyClipped: clippingRatio > 0.05 || (rms > 0.5 && peak > 0.98) } };
}
