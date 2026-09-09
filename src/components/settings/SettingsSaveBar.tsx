"use client";

import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { useMockToast } from "@/hooks/useMockToast";

type SettingsSaveBarProps = {
  label?: string;
  onReset?: () => void;
  onSave?: () => void;
};

export function SettingsSaveBar({ label = "保存设置", onReset, onSave }: SettingsSaveBarProps) {
  const [saved, setSaved] = useState(false);
  const toast = useMockToast();

  function handleReset() {
    onReset?.();
    setSaved(false);
    toast.info("设置已恢复默认", "当前页面配置已恢复为默认 mock 值。");
  }

  function handleSave() {
    onSave?.();
    setSaved(true);
    toast.success("设置已保存", "配置已写入前端 mock 状态。");
  }

  return (
    <div className="sticky bottom-3 z-10 mt-3 flex items-center justify-between rounded-card border border-borderSoft bg-white/90 px-4 py-3 shadow-float backdrop-blur">
      <p className="text-[13px] text-textSecondary">当前修改仅保存为前端 mock 状态，后续接入真实配置 API。</p>
      <div className="flex items-center gap-2">
        <button type="button" data-no-global-interaction onClick={handleReset} className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary">
          <RotateCcw className="size-4" />
          恢复默认
        </button>
        <button type="button" data-no-global-interaction onClick={handleSave} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-semibold text-white shadow-primary">
          <Save className="size-4" />
          {saved ? "已保存" : label}
        </button>
      </div>
    </div>
  );
}
