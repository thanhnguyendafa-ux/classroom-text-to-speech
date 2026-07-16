export function createSilence(sampleRate: number, durationSeconds: number): Int16Array {
  const samples = Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.round(sampleRate * durationSeconds) : 0;
  return new Int16Array(samples);
}

export function concatenatePcm(buffers: readonly Int16Array[]): Int16Array {
  const totalLength = buffers.reduce((total, buffer) => total + buffer.length, 0);
  const result = new Int16Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) { result.set(buffer, offset); offset += buffer.length; }
  return result;
}

export function createWavBlob(pcm: Int16Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + pcm.byteLength);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => { for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index)); };
  write(0, "RIFF"); view.setUint32(4, 36 + pcm.byteLength, true); write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, pcm.byteLength, true); new Int16Array(buffer, 44).set(pcm);
  return new Blob([buffer], { type: "audio/wav" });
}
