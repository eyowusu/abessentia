'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Returns false during SSR and the first client render, true after hydration.
 * Use this to gate UI that depends on persisted stores (zustand/localStorage)
 * so server markup and first client render always agree.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
