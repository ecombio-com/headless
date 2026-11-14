'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {PredictiveSearchReturn} from '~/lib/search';

/** Fetches header search suggestions; a newer call cancels the one in flight. */
export function usePredictiveSearch(prefix: string) {
  const [data, setData] = useState<PredictiveSearchReturn | undefined>(undefined);
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const inflight = useRef<AbortController | null>(null);

  const load = useCallback(
    async (params: URLSearchParams) => {
      inflight.current?.abort();
      const controller = new AbortController();
      inflight.current = controller;
      setState('loading');
      try {
        const res = await fetch(`${prefix}/api/predictive-search?${params}`, {signal: controller.signal});
        if (res.ok) setData((await res.json()) as PredictiveSearchReturn);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') console.error(error);
      } finally {
        if (inflight.current === controller) setState('idle');
      }
    },
    [prefix],
  );

  useEffect(() => () => inflight.current?.abort(), []);
  return {data, state, load};
}
