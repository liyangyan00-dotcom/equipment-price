"use client";

import { useCallback, useState } from "react";
import { emitMockToast } from "./useMockToast";

export type MockAiStatus = "idle" | "running" | "completed" | "needs_review";

export function useMockAiAction(defaultLabel = "AI 处理") {
  const [status, setStatus] = useState<MockAiStatus>("idle");

  const run = useCallback(
    (label = defaultLabel, result: MockAiStatus = "completed") => {
      setStatus("running");
      emitMockToast({
        tone: "ai",
        title: `${label}已启动`,
        description: "正在使用 mock 数据模拟 AI 处理流程。",
      });

      window.setTimeout(() => {
        setStatus(result);
        emitMockToast({
          tone: result === "needs_review" ? "warning" : "success",
          title: result === "needs_review" ? `${label}需要人工复核` : `${label}已完成`,
          description:
            result === "needs_review"
              ? "AI 结果已进入人工确认流程。"
              : "已更新当前页面的前端模拟状态。",
        });
      }, 900);
    },
    [defaultLabel]
  );

  const reset = useCallback(() => setStatus("idle"), []);

  return { status, run, reset };
}
