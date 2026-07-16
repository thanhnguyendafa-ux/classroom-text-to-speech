import { useCallback, useEffect, useRef } from 'react';
export function useOwnedObjectUrl(onChange: (url: string | null) => void) {
  const currentRef = useRef<string | null>(null);
  const replace = useCallback((next: string | null) => { const previous = currentRef.current; if (previous && previous !== next) URL.revokeObjectURL(previous); currentRef.current = next; onChange(next); }, [onChange]);
  useEffect(() => () => { if (currentRef.current) URL.revokeObjectURL(currentRef.current); currentRef.current = null; }, []);
  return replace;
}
