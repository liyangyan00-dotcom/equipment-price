"use client";

import { useEffect, useRef } from "react";
import { createCollectionPoller } from "@/lib/priceCollection/polling";

// Return false when background work ends. A new activityKey wakes idle polling.
export function useVisiblePolling(load: (signal: AbortSignal) => Promise<boolean>, intervalMs = 30_000, activityKey = "") {
  const latest = useRef(load);
  const poller = useRef<ReturnType<typeof createCollectionPoller> | null>(null);
  useEffect(() => { latest.current = load; }, [load]);
  useEffect(() => {
    const instance = createCollectionPoller({
      load: (_full, signal) => latest.current(signal),
      visible: () => document.visibilityState !== "hidden",
      intervalMs,
      onError: () => { /* Loaders own their visible error state. */ },
    });
    poller.current = instance;
    const visibilityChanged = () => instance.visibilityChanged();
    document.addEventListener("visibilitychange", visibilityChanged);
    instance.start();
    return () => {
      instance.dispose();
      poller.current = null;
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [intervalMs]);
  useEffect(() => { if (activityKey) poller.current?.wake(); }, [activityKey]);
  return poller;
}
