export interface MediaRecorderSession { recorder: MediaRecorder; start: () => void; stop: () => void; }
export function selectMediaRecorderOptions(isSupported: (mimeType: string) => boolean): MediaRecorderOptions {
  for (const mimeType of ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus']) if (isSupported(mimeType)) return { mimeType };
  return {};
}
export function createMediaRecorderSession(stream: MediaStream, onBlob: (blob: Blob) => void, onError?: (error: Event) => void): MediaRecorderSession {
  const options = selectMediaRecorderOptions(MediaRecorder.isTypeSupported.bind(MediaRecorder));
  const recorder = new MediaRecorder(stream, options);
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
  recorder.onerror = event => onError?.(event);
  recorder.onstop = () => onBlob(new Blob(chunks, { type: options.mimeType || recorder.mimeType || 'audio/webm' }));
  return { recorder, start: () => recorder.start(), stop: () => { if (recorder.state === 'recording') recorder.stop(); } };
}
