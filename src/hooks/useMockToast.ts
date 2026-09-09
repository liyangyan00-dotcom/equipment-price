"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type MockToastTone = "success" | "info" | "warning" | "danger" | "ai";

export type MockToast = {
  id: string;
  title: string;
  description?: string;
  tone: MockToastTone;
  duration?: number;
};

type MockToastInput = Omit<MockToast, "id">;

const eventName = "water-price:mock-toast";

export function emitMockToast(input: MockToastInput) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<MockToastInput>(eventName, {
      detail: input,
    })
  );
}

export function useMockToast() {
  return useMemo(
    () => ({
      success: (title: string, description?: string) =>
        emitMockToast({ title, description, tone: "success" }),
      info: (title: string, description?: string) =>
        emitMockToast({ title, description, tone: "info" }),
      warning: (title: string, description?: string) =>
        emitMockToast({ title, description, tone: "warning" }),
      danger: (title: string, description?: string) =>
        emitMockToast({ title, description, tone: "danger" }),
      ai: (title: string, description?: string) =>
        emitMockToast({ title, description, tone: "ai" }),
    }),
    []
  );
}

export function useMockToastStore() {
  const [toasts, setToasts] = useState<MockToast[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const activeTimers = timers.current;
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<MockToastInput>).detail;
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast: MockToast = { id, ...detail };
      const duration = detail.duration ?? (detail.tone === "danger" || detail.tone === "warning" ? 5200 : 3600);

      setToasts((items) => [toast, ...items].slice(0, 4));
      if (duration > 0) {
        activeTimers.set(id, window.setTimeout(() => dismiss(id), duration));
      }
    };

    window.addEventListener(eventName, onToast);
    return () => {
      window.removeEventListener(eventName, onToast);
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, [dismiss]);

  return { toasts, dismiss };
}
