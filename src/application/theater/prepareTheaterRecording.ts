export interface PrepareTheaterRecordingInput {
  includeMicrophone: boolean;
  disableEchoCancellation: boolean;
  displayConstraints: DisplayMediaStreamOptions;
  captureDisplay: (constraints: DisplayMediaStreamOptions) => Promise<MediaStream>;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createCombinedStream: () => MediaStream;
  createAudioContext: () => AudioContext;
  onMicrophoneUnavailable?: (error: unknown) => void;
}
export interface PreparedTheaterRecording { displayStream: MediaStream; microphoneStream: MediaStream | null; combinedStream: MediaStream; videoTrack: MediaStreamTrack; }
export function selectTheaterRecorderOptions(isSupported: (mimeType: string) => boolean): MediaRecorderOptions {
  for (const mimeType of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) if (isSupported(mimeType)) return { mimeType };
  return {};
}
export async function prepareTheaterRecording(input: PrepareTheaterRecordingInput): Promise<PreparedTheaterRecording> {
  let microphoneStream: MediaStream | null = null;
  if (input.includeMicrophone) {
    try {
      microphoneStream = await input.getUserMedia({ audio: { echoCancellation: !input.disableEchoCancellation, noiseSuppression: !input.disableEchoCancellation, autoGainControl: true } });
    } catch (firstError) {
      console.warn('Advanced microphone constraints failed; using basic audio stream', firstError);
      try {
        microphoneStream = await input.getUserMedia({ audio: true });
      } catch (error) {
        input.onMicrophoneUnavailable?.(error);
      }
    }
  }
  const displayStream = await input.captureDisplay(input.displayConstraints);
  const videoTrack = displayStream.getVideoTracks()[0];
  if (!videoTrack) throw new Error('display-video-track-unavailable');
  const combinedStream = input.createCombinedStream();
  combinedStream.addTrack(videoTrack);
  const displayAudioTracks = displayStream.getAudioTracks();
  const microphoneAudioTracks = microphoneStream?.getAudioTracks() ?? [];
  if (displayAudioTracks.length && microphoneAudioTracks.length) {
    try {
      const context = input.createAudioContext();
      if (context.state === 'suspended') await context.resume();
      const destination = context.createMediaStreamDestination();
      context.createMediaStreamSource(displayStream).connect(destination);
      context.createMediaStreamSource(microphoneStream!).connect(destination);
      const mixedTrack = destination.stream.getAudioTracks()[0];
      if (mixedTrack) combinedStream.addTrack(mixedTrack);
    } catch (error) {
      console.warn('Audio mixing failed; using direct audio track', error);
      combinedStream.addTrack(displayAudioTracks[0]);
    }
  } else if (displayAudioTracks.length) combinedStream.addTrack(displayAudioTracks[0]);
  else if (microphoneAudioTracks.length) combinedStream.addTrack(microphoneAudioTracks[0]);
  return { displayStream, microphoneStream, combinedStream, videoTrack };
}


