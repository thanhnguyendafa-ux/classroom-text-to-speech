// @ts-ignore
import lamejsRaw from 'lamejs/lame.min.js?raw';

let lamejsInstance: any = null;

function getLameJS() {
  if (!lamejsInstance) {
    try {
      // lame.min.js defines 'function lamejs()' at its top-level scope,
      // and then runs 'lamejs();' at the end, which populates properties like Mp3Encoder
      // on the lamejs function object itself.
      const fn = new Function(`${lamejsRaw}; return lamejs;`);
      lamejsInstance = fn();
    } catch (e) {
      console.error("[mp3Encoder] Failed to evaluate lame.min.js raw script:", e);
      throw e;
    }
  }
  return lamejsInstance;
}

/**
 * Encodes mono 16-bit PCM samples to a standard MP3 Blob.
 * 
 * @param pcm Mono signed 16-bit PCM data (Int16Array)
 * @param sampleRate The sample rate of the raw audio (e.g., 44100 or 24000)
 * @param kbps Bitrate in kbps (default: 128)
 * @returns A Blob of type "audio/mpeg" containing the MP3 bytes
 */
export function encodeMonoMp3(pcm: Int16Array, sampleRate: number, kbps: number = 128): Blob {
  const ljs = getLameJS();
  if (!ljs || !ljs.Mp3Encoder) {
    throw new Error("[mp3Encoder] Mp3Encoder is not defined in the evaluated lamejs instance.");
  }

  const channels = 1; // Mono
  const encoder = new ljs.Mp3Encoder(channels, sampleRate, kbps);
  const numSamples = pcm.length;
  const mp3Chunks: Uint8Array[] = [];
  const bufferChunkSize = 1152;

  for (let offset = 0; offset < numSamples; offset += bufferChunkSize) {
    const block = pcm.subarray(offset, Math.min(offset + bufferChunkSize, numSamples));
    const mp3buf = encoder.encodeBuffer(block);
    if (mp3buf.length > 0) {
      mp3Chunks.push(mp3buf);
    }
  }

  const endBuf = encoder.flush();
  if (endBuf.length > 0) {
    mp3Chunks.push(endBuf);
  }

  return new Blob(mp3Chunks, { type: 'audio/mpeg' });
}

/**
 * Runs a self-test of the MP3 encoder by compressing a tiny block of silence.
 * Throws or returns false if there are any runtime errors (like MPEGMode references).
 */
export function runEncoderSelfTest(): boolean {
  try {
    const testSamples = new Int16Array(1152); // Exactly 1 chunk of silence
    const blob = encodeMonoMp3(testSamples, 44100, 128);
    const success = blob.size > 0 && blob.type === 'audio/mpeg';
    console.log(`[mp3Encoder Self-Check] Success: ${success}, Blob size: ${blob.size} bytes`);
    return success;
  } catch (e) {
    console.error("[mp3Encoder Self-Check] FAILED:", e);
    return false;
  }
}
