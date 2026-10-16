"use client";

import { useState } from "react";

/**
 * Local editable state that resets whenever `source` changes (e.g. a URL query value).
 * Uses React's "adjust state during render" pattern instead of a syncing effect.
 */
export function useSyncedState<T>(source: T) {
  const [value, setValue] = useState(source);
  const [prev, setPrev] = useState(source);
  if (!Object.is(prev, source)) {
    setPrev(source);
    setValue(source);
  }
  return [value, setValue] as const;
}
