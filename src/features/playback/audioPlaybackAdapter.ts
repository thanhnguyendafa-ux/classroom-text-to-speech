export interface AudioPlaybackElement {
  volume: number;
  pause(): void;
  play(): Promise<unknown>;
}

interface AudioGraphNode {
  connect(destination: unknown): void;
  disconnect(): void;
}

interface AudioGainNode extends AudioGraphNode {
  gain: { setValueAtTime(value: number, startTime: number): void };
}

interface AudioContextLike {
  state: 'suspended' | 'running' | 'closed';
  currentTime: number;
  destination: unknown;
  createMediaElementSource(audio: AudioPlaybackElement): AudioGraphNode;
  createGain(): AudioGainNode;
  resume(): Promise<unknown>;
}

export function createAudioPlaybackAdapter(createContext: () => AudioContextLike) {
  let currentAudio: AudioPlaybackElement | null = null;
  let context: AudioContextLike | null = null;
  let source: AudioGraphNode | null = null;
  let gain: AudioGainNode | null = null;

  const clearGraph = () => {
    try { source?.disconnect(); } catch { /* graph may already be disconnected */ }
    try { gain?.disconnect(); } catch { /* graph may already be disconnected */ }
    source = null;
    gain = null;
  };

  const stop = () => {
    currentAudio?.pause();
    currentAudio = null;
    clearGraph();
  };

  return {
    attach(audio: AudioPlaybackElement, volume: number) {
      stop();
      currentAudio = audio;
      if (volume > 1) {
        try {
          context ??= createContext();
          if (context.state === 'suspended') void context.resume();
          source = context.createMediaElementSource(audio);
          gain = context.createGain();
          audio.volume = 1;
          gain.gain.setValueAtTime(volume, context.currentTime);
          source.connect(gain);
          gain.connect(context.destination);
        } catch {
          clearGraph();
          audio.volume = 1;
        }
      } else {
        audio.volume = volume;
      }
    },
    pause() { currentAudio?.pause(); },
    async resume() { if (currentAudio) await currentAudio.play(); },
    stop,
    clearGraph,
  };
}

export function createBrowserAudioPlaybackAdapter() {
  return createAudioPlaybackAdapter(() => {
    const browserWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = window.AudioContext ?? browserWindow.webkitAudioContext;
    if (!AudioContextConstructor) throw new Error('Web Audio API is unavailable');
    return new AudioContextConstructor();
  });
}
