export type AudioElementFactory = (url: string) => HTMLAudioElement;
export const createBrowserAudioElement: AudioElementFactory = (url) => new Audio(url);
