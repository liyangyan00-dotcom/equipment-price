"use client";

import { useEffect, useRef } from "react";
import { ClipboardCheck, Copy, FileDown, MoreHorizontal, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  label: string;
  description?: string;
  tone?: "blue" | "purple" | "green" | "orange" | "red";
  onClick?: () => void;
};

type ActionMenuProps = {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  items: ActionMenuItem[];
};

const icons = [Sparkles, ClipboardCheck, FileDown, RefreshCw, Copy, MoreHorizontal];
const toneClass = {
  blue: "bg-primary-soft text-primary",
  purple: "bg-ai-soft text-ai",
  green: "bg-success-soft text-success",
  orange: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
};

export function ActionMenu({ open, x, y, onClose, items }: ActionMenuProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) {
    return null;
  }

  const menuHeight = Math.min(items.length * 58 + 16, 360);
  const safeX = typeof window === "undefined" ? x : Math.max(12, Math.min(x, window.innerWidth - 232));
  const safeY = typeof window === "undefined" ? y : Math.max(12, Math.min(y, window.innerHeight - menuHeight - 12));

  return (
    <>
      <button className="fixed inset-0 z-[70] cursor-default" type="button" aria-label="关闭菜单" onClick={onClose} />
      <div
        role="menu"
        aria-label="更多操作"
        className="fixed z-[105] max-h-[360px] w-[220px] overflow-y-auto rounded-card border border-borderSoft bg-white p-2 shadow-panel"
        style={{ left: safeX, top: safeY }}
      >
        {items.map((item, index) => {
          const Icon = icons[index % icons.length];
          const tone = item.tone ?? "blue";
          return (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition hover:bg-[var(--color-muted-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[8px]", toneClass[tone])}>
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-textMain">{item.label}</span>
                {item.description ? <span className="mt-0.5 block text-[11px] text-textMuted">{item.description}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
