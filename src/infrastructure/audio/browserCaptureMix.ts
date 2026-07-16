export interface CaptureAudioMix { recorderStream: MediaStream; displaySource: MediaStreamAudioSourceNode | null; microphoneSource: MediaStreamAudioSourceNode | null; }
export function createCaptureAudioMix(audioContext: AudioContext, display: MediaStream | null, microphone: MediaStream | null, analyser: AnalyserNode): CaptureAudioMix {
  const destination = audioContext.createMediaStreamDestination();
  const connect = (stream: MediaStream | null) => { if (!stream?.getAudioTracks().length) return null; const source = audioContext.createMediaStreamSource(stream); source.connect(destination); source.connect(analyser); return source; };
  const displaySource = connect(display); const microphoneSource = connect(microphone); const recorderStream = new MediaStream(); const mixed = destination.stream.getAudioTracks()[0] ?? display?.getAudioTracks()[0] ?? microphone?.getAudioTracks()[0]; if (mixed) recorderStream.addTrack(mixed);
  return { recorderStream, displaySource, microphoneSource };
}
