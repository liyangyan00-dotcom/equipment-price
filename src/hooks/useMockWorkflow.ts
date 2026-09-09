"use client";

import { useCallback, useMemo, useState } from "react";

export type MockWorkflowEvent = {
  id?: string;
  type: "route" | "ai" | "status" | "draft" | "create" | "export" | "upload";
  label: string;
  from?: string;
  to?: string;
  status?: "idle" | "created" | "running" | "completed" | "needs_review" | "failed" | "archived";
  payload?: Record<string, unknown>;
  createdAt?: string;
};

export type MockWorkflowState = {
  latest?: MockWorkflowEvent;
  events: MockWorkflowEvent[];
};

export const MOCK_WORKFLOW_STORAGE_KEY = "water-price-mock-workflow-v1";

const emptyState: MockWorkflowState = {
  events: [],
};

export function readMockWorkflowState(): MockWorkflowState {
  if (typeof window === "undefined") {
    return emptyState;
  }

  try {
    const raw = window.localStorage.getItem(MOCK_WORKFLOW_STORAGE_KEY);
    if (!raw) {
      return emptyState;
    }

    const parsed = JSON.parse(raw) as MockWorkflowState;
    return {
      latest: parsed.latest,
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return emptyState;
  }
}

export function appendMockWorkflowEvent(event: MockWorkflowEvent) {
  if (typeof window === "undefined") {
    return;
  }

  const previous = readMockWorkflowState();
  const nextEvent: MockWorkflowEvent = {
    ...event,
    id: event.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: event.createdAt ?? new Date().toISOString(),
  };
  const nextState: MockWorkflowState = {
    latest: nextEvent,
    events: [nextEvent, ...previous.events].slice(0, 80),
  };

  window.localStorage.setItem(MOCK_WORKFLOW_STORAGE_KEY, JSON.stringify(nextState));
}

export function useMockWorkflow() {
  const [version, setVersion] = useState(0);
  const state = useMemo(() => {
    void version;
    return readMockWorkflowState();
  }, [version]);

  const appendEvent = useCallback((event: MockWorkflowEvent) => {
    appendMockWorkflowEvent(event);
    setVersion((value) => value + 1);
  }, []);

  const clear = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(MOCK_WORKFLOW_STORAGE_KEY);
    }
    setVersion((value) => value + 1);
  }, []);

  return {
    state,
    appendEvent,
    clear,
  };
}
