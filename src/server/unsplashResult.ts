export interface UnsplashResult {
  id: string;
  url: string;
  thumb: string;
  author: string;
  authorUrl: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function normalizeUnsplashResults(input: unknown): UnsplashResult[] {
  const root = record(input);
  if (!root || !Array.isArray(root.results)) return [];
  return root.results.flatMap((item): UnsplashResult[] => {
    const photo = record(item);
    const urls = record(photo?.urls);
    const user = record(photo?.user);
    const links = record(user?.links);
    const id = stringValue(photo?.id);
    const url = stringValue(urls?.regular) || stringValue(urls?.small);
    if (!id || !url) return [];
    return [{
      id,
      url,
      thumb: stringValue(urls?.thumb) || url,
      author: stringValue(user?.name, 'Unsplash Photo'),
      authorUrl: stringValue(links?.html, 'https://unsplash.com'),
    }];
  });
}
