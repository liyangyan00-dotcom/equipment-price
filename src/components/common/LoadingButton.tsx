"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  icon?: ReactNode;
  tone?: "primary" | "ai" | "success" | "warning" | "danger" | "ghost";
};

const toneClass = {
  primary: "bg-primary text-white shadow-[0_12px_28px_rgba(47,107,255,0.22)] hover:bg-primary-hover",
  ai: "bg-ai text-white shadow-[0_12px_28px_rgba(126,58,242,0.22)] hover:bg-ai/90",
  success: "bg-success text-white shadow-[0_12px_28px_rgba(20,184,122,0.2)] hover:bg-success/90",
  warning: "bg-warning text-white shadow-[0_12px_28px_rgba(245,158,11,0.18)] hover:bg-warning/90",
  danger: "bg-danger text-white shadow-[0_12px_28px_rgba(239,68,68,0.2)] hover:bg-danger/90",
  ghost: "border border-borderSoft bg-white text-textSecondary hover:border-primary hover:text-primary",
};

export function LoadingButton({
  children,
  loading,
  icon,
  tone = "primary",
  className,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        toneClass[tone],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
}
