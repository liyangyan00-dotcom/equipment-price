"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type RouteBackButtonProps = {
  label?: string;
  fallbackHref?: string;
  className?: string;
};

export function RouteBackButton({ label = "返回", fallbackHref, className }: RouteBackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary-soft",
        className,
      )}
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else if (fallbackHref) {
          router.push(fallbackHref);
        }
      }}
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
