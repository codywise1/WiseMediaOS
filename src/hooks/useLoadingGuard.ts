import { useEffect } from 'react';

/**
 * Prevents loaders from sticking forever by enforcing a max duration.
 * When `loading` is true, after `timeoutMs` it will force `setLoading(false)`.
 */
export function useLoadingGuard(
  loading: boolean,
  setLoading: (value: boolean) => void,
  timeoutMs: number = 8000
) {
  useEffect(() => {
    if (!loading) return;

    const id = window.setTimeout(() => {
      setLoading(false);
    }, timeoutMs);

    return () => {
      window.clearTimeout(id);
    };
  }, [loading, setLoading, timeoutMs]);
}
