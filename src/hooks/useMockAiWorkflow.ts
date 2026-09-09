"use client";

import { useCallback, useMemo, useState } from "react";

export type AiWorkflowTaskType =
  | "quote_recognition"
  | "pending_quote_review"
  | "price_collection"
  | "price_lead_evaluation"
  | "boq_parse"
  | "inquiry_letter"
  | "ai_workbench"
  | "report_generation"
  | "general_ai";

export type AiWorkflowStatus = "idle" | "created" | "running" | "completed" | "needs_review" | "failed" | "archived";

export type AiWorkflowEvent = {
  id?: string;
  taskId?: string;
  taskType: AiWorkflowTaskType;
  label: string;
  from?: string;
  to?: string;
  status: AiWorkflowStatus;
  payload?: Record<string, unknown>;
  createdAt?: string;
};

export type AiWorkflowState = {
  latest?: AiWorkflowEvent;
  events: AiWorkflowEvent[];
};

export const MOCK_AI_WORKFLOW_STORAGE_KEY = "water-price-ai-workflow-v1";

const emptyState: AiWorkflowState = {
  events: [],
};

export function inferAiWorkflowTaskType(pathname: string, label = ""): AiWorkflowTaskType {
  if (pathname.startsWith("/ai-quote-recognition") || label.includes("报价识别") || label.includes("识别结果")) {
    return "quote_recognition";
  }
  if (pathname.startsWith("/pending-quotes") || label.includes("待审核报价") || label.includes("人工复核")) {
    return "pending_quote_review";
  }
  if (pathname.startsWith("/ai-price-collection") || label.includes("价格采集") || label.includes("采集任务")) {
    return "price_collection";
  }
  if (pathname.startsWith("/price-leads") || label.includes("价格线索") || label.includes("线索池")) {
    return "price_lead_evaluation";
  }
  if (pathname.startsWith("/project-pricing/boq-parse") || label.includes("BOQ") || label.includes("解析")) {
    return "boq_parse";
  }
  if (pathname.startsWith("/ai-inquiry-letter") || label.includes("询价函")) {
    return "inquiry_letter";
  }
  if (pathname.startsWith("/ai-workbench") || label.includes("AI任务") || label.includes("AI工作台")) {
    return "ai_workbench";
  }
  if (pathname.startsWith("/ai-report-center") || label.includes("报告")) {
    return "report_generation";
  }
  return "general_ai";
}

export function readMockAiWorkflowState(): AiWorkflowState {
  if (typeof window === "undefined") {
    return emptyState;
  }

  try {
    const raw = window.localStorage.getItem(MOCK_AI_WORKFLOW_STORAGE_KEY);
    if (!raw) {
      return emptyState;
    }

    const parsed = JSON.parse(raw) as AiWorkflowState;
    return {
      latest: parsed.latest,
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return emptyState;
  }
}

export function appendMockAiWorkflowEvent(event: AiWorkflowEvent) {
  if (typeof window === "undefined") {
    return;
  }

  const previous = readMockAiWorkflowState();
  const nextEvent: AiWorkflowEvent = {
    ...event,
    id: event.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    taskId: event.taskId ?? `AI-${Date.now().toString().slice(-8)}`,
    createdAt: event.createdAt ?? new Date().toISOString(),
  };

  const nextState: AiWorkflowState = {
    latest: nextEvent,
    events: [nextEvent, ...previous.events].slice(0, 120),
  };

  window.localStorage.setItem(MOCK_AI_WORKFLOW_STORAGE_KEY, JSON.stringify(nextState));
}

export function useMockAiWorkflow() {
  const [version, setVersion] = useState(0);
  const state = useMemo(() => {
    void version;
    return readMockAiWorkflowState();
  }, [version]);

  const appendEvent = useCallback((event: AiWorkflowEvent) => {
    appendMockAiWorkflowEvent(event);
    setVersion((value) => value + 1);
  }, []);

  const clear = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(MOCK_AI_WORKFLOW_STORAGE_KEY);
    }
    setVersion((value) => value + 1);
  }, []);

  return {
    state,
    appendEvent,
    clear,
  };
}
