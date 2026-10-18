import { useEffect, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 500;

export function useDebounce<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Runs `search` 500 ms after `query` stops changing. Previous results stay visible
 * while the debounce is pending; `loading` is true only while a query is running.
 */
export function useDebouncedSearch<R>(query: string, search: (q: string) => Promise<R[]>, deps: unknown[] = []) {
  const debounced = useDebounce(query);
  const [results, setResults] = useState<R[]>([]);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    search(debounced)
      .then((r) => { if (!cancelled) setResults(r); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, version, ...deps]);

  return { results, loading, refresh: () => setVersion((v) => v + 1) };
}
