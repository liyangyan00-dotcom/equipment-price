"use client";

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type OverlayShellProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: "modal" | "drawer";
  panelClassName?: string;
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
};

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let bodyLockCount = 0;
let previousBodyOverflow = "";
const overlayStack: string[] = [];
const subscribeToClient = () => () => undefined;

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyLockCount += 1;
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

export function OverlayShell({
  open,
  onClose,
  children,
  variant = "modal",
  panelClassName,
  labelledBy,
  describedBy,
  ariaLabel,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: OverlayShellProps) {
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const panelRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const id = instanceId;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlayStack.push(id);
    lockBodyScroll();

    const focusFrame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      const preferred = panel?.querySelector<HTMLElement>("[data-overlay-autofocus]");
      const firstFocusable = panel?.querySelector<HTMLElement>(focusableSelector);
      (preferred ?? firstFocusable ?? panel)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (overlayStack.at(-1) !== id) {
        return;
      }

      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      const stackIndex = overlayStack.lastIndexOf(id);
      if (stackIndex >= 0) {
        overlayStack.splice(stackIndex, 1);
      }
      unlockBodyScroll();
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [closeOnEscape, instanceId, open]);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter(
      (element) => element.offsetParent !== null
    );

    if (!focusable.length) {
      event.preventDefault();
      panelRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[90] bg-slate-950/35 backdrop-blur-[2px]",
        variant === "drawer" ? "flex justify-end" : "flex items-center justify-center p-4"
      )}
      onPointerDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onCloseRef.current();
        }
      }}
      data-overlay-root
      data-no-global-interaction
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-label={!labelledBy ? ariaLabel ?? "对话框" : undefined}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className={cn(
          "outline-none",
          variant === "drawer"
            ? "h-full w-[440px] max-w-full border-l border-borderSoft bg-white shadow-panel"
            : "w-full max-w-[520px] overflow-hidden rounded-card-lg border border-borderSoft bg-white shadow-panel",
          panelClassName
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
